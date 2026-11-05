'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  attendanceSessionCreateSchema,
  studentAttendanceCorrectionSchema,
  staffAttendanceBatchSchema,
  staffAttendanceCorrectionSchema,
  leaveRequestCreateSchema,
  leaveRequestReviewSchema,
  type AttendanceSessionCreateInput,
  type StudentAttendanceBatchInput,
  type StudentAttendanceCorrectionInput,
  type StaffAttendanceBatchInput,
  type StaffAttendanceCorrectionInput,
  type LeaveRequestCreateInput,
  type LeaveRequestReviewInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ATTENDANCE_MARK_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'] as const;
const ATTENDANCE_CORRECT_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'hr_administrator', 'faculty'] as const;
const STAFF_ATTENDANCE_ROLES = ['owner', 'admin', 'hr_administrator'] as const;
const LEAVE_REVIEW_ROLES = ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head'] as const;

function canMarkAttendance(role: string): boolean {
  return ATTENDANCE_MARK_ROLES.includes(role as any);
}

function canCorrectAttendance(role: string): boolean {
  return ATTENDANCE_CORRECT_ROLES.includes(role as any);
}

function canManageStaffAttendance(role: string): boolean {
  return STAFF_ATTENDANCE_ROLES.includes(role as any);
}

function canReviewLeaves(role: string): boolean {
  return LEAVE_REVIEW_ROLES.includes(role as any);
}

// ==============================================================================
// 1. Student Attendance Roster & Marking
// ==============================================================================

/**
 * Loads enrolled students for a specific class/section and checks approved leaves for the date
 */
export async function getStudentsForMarkingAction(
  classId: string,
  sectionId?: string | null,
  academicYearId?: string | null,
  sessionDate?: string
): Promise<ActionResult<{ students: any[]; existingSession: any | null }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    // 1. Fetch academic year if not provided
    let targetYearId = academicYearId;
    if (!targetYearId) {
      const { data: currentYear } = await supabase
        .from('academic_years')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('status', 'active')
        .order('start_date', { ascending: false })
        .limit(1)
        .maybeSingle();

      targetYearId = currentYear?.id;
    }

    if (!targetYearId) {
      return { success: false, error: 'No active academic year found for institution.' };
    }

    // 2. Query active enrollments for this class and optional section
    let query = supabase
      .from('student_enrollments')
      .select(`
        id,
        roll_number,
        status,
        student:students(
          id,
          admission_number,
          first_name,
          middle_name,
          last_name,
          gender,
          photo_url,
          status
        )
      `)
      .eq('institution_id', institutionId)
      .eq('academic_year_id', targetYearId)
      .eq('class_id', classId)
      .eq('status', 'enrolled');

    if (sectionId) {
      query = query.eq('section_id', sectionId);
    }

    const { data: enrollments, error: enrollError } = await query;

    if (enrollError) {
      return { success: false, error: formatSupabaseError(enrollError) };
    }

    const targetDate = sessionDate || new Date().toISOString().slice(0, 10);

    // 3. Query any approved leaves for these students on this target date
    const studentIds = (enrollments || []).map((e: any) => e.student?.id).filter(Boolean);
    let approvedLeaves: any[] = [];

    if (studentIds.length > 0) {
      const { data: leaves } = await supabase
        .from('leave_requests')
        .select('student_id, leave_type, reason')
        .eq('institution_id', institutionId)
        .eq('applicant_type', 'student')
        .eq('status', 'approved')
        .lte('start_date', targetDate)
        .gte('end_date', targetDate)
        .in('student_id', studentIds);

      approvedLeaves = leaves || [];
    }

    const leaveMap = new Map<string, any>();
    approvedLeaves.forEach((l) => leaveMap.set(l.student_id, l));

    // 4. Check if an attendance session already exists for this date and section
    let sessionQuery = supabase
      .from('attendance_sessions')
      .select('id, session_date, session_type, status, total_students, present_count, absent_count, late_count')
      .eq('institution_id', institutionId)
      .eq('academic_year_id', targetYearId)
      .eq('class_id', classId)
      .eq('session_date', targetDate);

    if (sectionId) {
      sessionQuery = sessionQuery.eq('section_id', sectionId);
    }

    const { data: existingSessions } = await sessionQuery.maybeSingle();

    // Map students with active approved leave notice
    const roster = (enrollments || []).map((e: any) => {
      const st = e.student;
      const leave = leaveMap.get(st?.id);
      return {
        studentId: st?.id,
        enrollmentId: e.id,
        admissionNumber: st?.admission_number,
        fullName: [st?.first_name, st?.middle_name, st?.last_name].filter(Boolean).join(' '),
        rollNumber: e.roll_number || '',
        gender: st?.gender,
        photoUrl: st?.photo_url,
        approvedLeave: leave ? { leaveType: leave.leave_type, reason: leave.reason } : null,
      };
    });

    // Sort by roll number or name
    roster.sort((a: any, b: any) => {
      if (a.rollNumber && b.rollNumber) return a.rollNumber.localeCompare(b.rollNumber);
      return a.fullName.localeCompare(b.fullName);
    });

    return {
      success: true,
      data: {
        students: roster,
        existingSession: existingSessions || null,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch student roster for marking.' };
  }
}

/**
 * Records student attendance batch for a session (Daily or Lecture/Lab)
 */
export async function recordStudentAttendanceAction(input: {
  session: AttendanceSessionCreateInput;
  records: StudentAttendanceBatchInput['records'];
}): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;
    const institutionId = session.activeInstitutionId!;
    const userId = session.user.id;

    if (!role || !canMarkAttendance(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to record attendance.' };
    }

    // Validate Session parameters
    const parsedSession = attendanceSessionCreateSchema.safeParse(input.session);
    if (!parsedSession.success) {
      return { success: false, error: parsedSession.error.errors[0]?.message || 'Invalid session details.' };
    }

    // Validate Records
    if (!input.records || input.records.length === 0) {
      return { success: false, error: 'At least one student record is required to submit attendance.' };
    }

    const supabase = createClient() as any;
    const s = parsedSession.data;

    // 1. Look up existing attendance session or create new one
    let sessionLookup = supabase
      .from('attendance_sessions')
      .select('id, status')
      .eq('institution_id', institutionId)
      .eq('academic_year_id', s.academicYearId)
      .eq('class_id', s.classId)
      .eq('session_date', s.sessionDate);

    if (s.sectionId) {
      sessionLookup = sessionLookup.eq('section_id', s.sectionId);
    }
    if (s.subjectId) {
      sessionLookup = sessionLookup.eq('subject_id', s.subjectId);
    }
    if (s.periodNumber) {
      sessionLookup = sessionLookup.eq('period_number', s.periodNumber);
    }

    const { data: existingSession, error: lookupErr } = await sessionLookup.maybeSingle();

    if (lookupErr) {
      return { success: false, error: formatSupabaseError(lookupErr) };
    }

    let sessionId = existingSession?.id;

    if (existingSession) {
      if (existingSession.status === 'locked') {
        return { success: false, error: 'This attendance session has been finalized and locked.' };
      }
    } else {
      // Create session
      const { data: newSession, error: createSessionErr } = await supabase
        .from('attendance_sessions')
        .insert({
          institution_id: institutionId,
          academic_year_id: s.academicYearId,
          campus_id: s.campusId || null,
          class_id: s.classId,
          section_id: s.sectionId || null,
          subject_id: s.subjectId || null,
          session_date: s.sessionDate,
          session_type: s.sessionType,
          period_number: s.periodNumber || null,
          start_time: s.startTime || null,
          end_time: s.endTime || null,
          topic_covered: s.topicCovered || null,
          marked_by_staff_id: s.markedByStaffId || null,
          status: 'draft',
          created_by: userId,
        })
        .select('id')
        .single();

      if (createSessionErr) {
        return { success: false, error: formatSupabaseError(createSessionErr) };
      }
      sessionId = newSession.id;
    }

    // 2. Call atomic batch stored procedure
    const payloadRecords = input.records.map((r) => ({
      student_id: r.studentId,
      enrollment_id: r.enrollmentId || null,
      status: r.status,
      remarks: r.remarks || null,
      is_excused: r.isExcused || false,
    }));

    const { data: rpcResult, error: rpcErr } = await supabase.rpc(
      'record_student_attendance_batch' as any,
      {
        p_institution_id: institutionId,
        p_session_id: sessionId,
        p_records: payloadRecords,
        p_user_id: userId,
      }
    );

    if (rpcErr) {
      return { success: false, error: formatSupabaseError(rpcErr) };
    }

    // 3. Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action: 'attendance.session_recorded',
      entity_type: 'attendance_session',
      entity_id: sessionId,
      metadata: {
        sessionDate: s.sessionDate,
        classId: s.classId,
        sectionId: s.sectionId,
        totalRecords: input.records.length,
        result: rpcResult,
      },
    });

    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/attendance/students');
    revalidatePath('/dashboard/attendance/reports');

    return {
      success: true,
      data: { sessionId },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit student attendance.' };
  }
}

/**
 * Submits an authorized manual attendance correction with reason and audit trail
 */
export async function correctStudentAttendanceAction(
  data: StudentAttendanceCorrectionInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;
    const institutionId = session.activeInstitutionId!;
    const userId = session.user.id;

    if (!role || !canCorrectAttendance(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to correct attendance records.' };
    }

    const parsed = studentAttendanceCorrectionSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid correction payload.' };
    }

    const supabase = createClient() as any;
    const { data: result, error: rpcErr } = await supabase.rpc(
      'correct_student_attendance_record' as any,
      {
        p_institution_id: institutionId,
        p_record_id: parsed.data.recordId,
        p_new_status: parsed.data.newStatus,
        p_reason: parsed.data.reason,
        p_user_id: userId,
      }
    );

    if (rpcErr) {
      return { success: false, error: formatSupabaseError(rpcErr) };
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action: 'attendance.record_corrected',
      entity_type: 'student_attendance_records',
      entity_id: parsed.data.recordId,
      metadata: {
        correction: result,
        reason: parsed.data.reason,
      },
    });

    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/attendance/students');
    revalidatePath('/dashboard/attendance/reports');

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to correct attendance record.' };
  }
}

// ==============================================================================
// 2. Staff Daily Attendance Actions
// ==============================================================================

/**
 * Loads staff roster and their attendance for a specific date
 */
export async function getStaffAttendanceRosterAction(
  date?: string,
  departmentId?: string | null
): Promise<ActionResult<{ staff: any[]; date: string }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;
    const targetDate = date || new Date().toISOString().slice(0, 10);

    // 1. Fetch active staff profiles
    let staffQuery = supabase
      .from('staff_profiles')
      .select(`
        id,
        employee_id,
        first_name,
        middle_name,
        last_name,
        designation,
        staff_category,
        department_id,
        photo_url,
        employment_status,
        department:academic_departments(id, name)
      `)
      .eq('institution_id', institutionId)
      .eq('employment_status', 'active');

    if (departmentId) {
      staffQuery = staffQuery.eq('department_id', departmentId);
    }

    const { data: staffList, error: staffErr } = await staffQuery;
    if (staffErr) {
      return { success: false, error: formatSupabaseError(staffErr) };
    }

    // 2. Fetch existing staff attendance records for this date
    const { data: existingAttendance } = await supabase
      .from('staff_attendance_records')
      .select('id, staff_id, status, check_in_time, check_out_time, remarks')
      .eq('institution_id', institutionId)
      .eq('attendance_date', targetDate);

    const attMap = new Map<string, any>();
    (existingAttendance || []).forEach((a: any) => attMap.set(a.staff_id, a));

    // 3. Fetch approved leaves for staff on this date
    const { data: approvedLeaves } = await supabase
      .from('leave_requests')
      .select('staff_id, leave_type, reason')
      .eq('institution_id', institutionId)
      .eq('applicant_type', 'staff')
      .eq('status', 'approved')
      .lte('start_date', targetDate)
      .gte('end_date', targetDate);

    const leaveMap = new Map<string, any>();
    (approvedLeaves || []).forEach((l: any) => leaveMap.set(l.staff_id, l));

    const roster = (staffList || []).map((s: any) => {
      const att = attMap.get(s.id);
      const leave = leaveMap.get(s.id);
      return {
        staffId: s.id,
        employeeId: s.employee_id,
        fullName: [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' '),
        designation: s.designation,
        category: s.staff_category,
        departmentName: s.department?.name || 'Unassigned',
        photoUrl: s.photo_url,
        recordId: att?.id || null,
        status: att?.status || (leave ? 'on_leave' : 'present'),
        checkInTime: att?.check_in_time || '',
        checkOutTime: att?.check_out_time || '',
        remarks: att?.remarks || '',
        approvedLeave: leave ? { leaveType: leave.leave_type, reason: leave.reason } : null,
      };
    });

    return {
      success: true,
      data: {
        staff: roster,
        date: targetDate,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to load staff attendance roster.' };
  }
}

/**
 * Records staff attendance batch for a date
 */
export async function recordStaffAttendanceBatchAction(
  data: StaffAttendanceBatchInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;
    const institutionId = session.activeInstitutionId!;
    const userId = session.user.id;

    if (!role || !canManageStaffAttendance(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to record staff attendance.' };
    }

    const parsed = staffAttendanceBatchSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid staff attendance payload.' };
    }

    const supabase = createClient() as any;
    const { attendanceDate, records } = parsed.data;

    const upsertRows = records.map((r) => ({
      institution_id: institutionId,
      staff_id: r.staffId,
      attendance_date: attendanceDate,
      status: r.status,
      check_in_time: r.checkInTime || null,
      check_out_time: r.checkOutTime || null,
      remarks: r.remarks || null,
      marked_by: userId,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await supabase
      .from('staff_attendance_records')
      .upsert(upsertRows, { onConflict: 'institution_id,staff_id,attendance_date' });

    if (upsertErr) {
      return { success: false, error: formatSupabaseError(upsertErr) };
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action: 'staff_attendance.recorded',
      entity_type: 'staff_attendance_records',
      entity_id: attendanceDate,
      metadata: {
        attendanceDate,
        staffCount: records.length,
      },
    });

    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/attendance/staff');
    revalidatePath('/dashboard/attendance/reports');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record staff attendance.' };
  }
}

/**
 * Corrects a staff attendance record with audit trail
 */
export async function correctStaffAttendanceAction(
  data: StaffAttendanceCorrectionInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;
    const institutionId = session.activeInstitutionId!;
    const userId = session.user.id;

    if (!role || !canManageStaffAttendance(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to correct staff attendance.' };
    }

    const parsed = staffAttendanceCorrectionSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid correction payload.' };
    }

    const supabase = createClient() as any;
    const { data: result, error: rpcErr } = await supabase.rpc(
      'correct_staff_attendance_record' as any,
      {
        p_institution_id: institutionId,
        p_record_id: parsed.data.recordId,
        p_new_status: parsed.data.newStatus,
        p_reason: parsed.data.reason,
        p_user_id: userId,
      }
    );

    if (rpcErr) {
      return { success: false, error: formatSupabaseError(rpcErr) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action: 'staff_attendance.record_corrected',
      entity_type: 'staff_attendance_records',
      entity_id: parsed.data.recordId,
      metadata: {
        correction: result,
        reason: parsed.data.reason,
      },
    });

    revalidatePath('/dashboard/attendance/staff');
    revalidatePath('/dashboard/attendance/reports');

    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to correct staff attendance.' };
  }
}

// ==============================================================================
// 3. Leave Management Actions
// ==============================================================================

/**
 * Submits a new leave request (student or staff)
 */
export async function submitLeaveRequestAction(
  data: LeaveRequestCreateInput
): Promise<ActionResult<{ leaveId: string }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const userId = session.user.id;

    const parsed = leaveRequestCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid leave request details.' };
    }

    const supabase = createClient() as any;
    const l = parsed.data;

    const { data: newLeave, error: leaveErr } = await supabase
      .from('leave_requests')
      .insert({
        institution_id: institutionId,
        applicant_type: l.applicantType,
        student_id: l.applicantType === 'student' ? l.studentId : null,
        staff_id: l.applicantType === 'staff' ? l.staffId : null,
        leave_type: l.leaveType,
        start_date: l.startDate,
        end_date: l.endDate,
        reason: l.reason,
        supporting_document_url: l.supportingDocumentUrl || null,
        status: 'pending',
        created_by: userId,
      })
      .select('id')
      .single();

    if (leaveErr) {
      return { success: false, error: formatSupabaseError(leaveErr) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action: 'leave.submitted',
      entity_type: 'leave_requests',
      entity_id: newLeave.id,
      metadata: {
        applicantType: l.applicantType,
        leaveType: l.leaveType,
        startDate: l.startDate,
        endDate: l.endDate,
      },
    });

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');

    return { success: true, data: { leaveId: newLeave.id } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit leave request.' };
  }
}

/**
 * Reviews a leave request (Approve or Reject)
 */
export async function reviewLeaveRequestAction(
  data: LeaveRequestReviewInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;
    const institutionId = session.activeInstitutionId!;
    const userId = session.user.id;

    if (!role || !canReviewLeaves(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to approve/reject leaves.' };
    }

    const parsed = leaveRequestReviewSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid review payload.' };
    }

    const supabase = createClient() as any;
    const { leaveRequestId, status, reviewRemarks } = parsed.data;

    const { error: updateErr } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
        review_remarks: reviewRemarks || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', leaveRequestId)
      .eq('institution_id', institutionId);

    if (updateErr) {
      return { success: false, error: formatSupabaseError(updateErr) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      user_id: userId,
      action: `leave.${status}`,
      entity_type: 'leave_requests',
      entity_id: leaveRequestId,
      metadata: {
        decision: status,
        remarks: reviewRemarks,
      },
    });

    revalidatePath('/dashboard/attendance/leaves');
    revalidatePath('/dashboard/attendance');
    revalidatePath('/dashboard/attendance/students');
    revalidatePath('/dashboard/attendance/staff');

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to review leave request.' };
  }
}
