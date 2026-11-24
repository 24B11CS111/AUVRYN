'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { processAttendanceAbsenceNotifications } from '@/lib/attendance/attendanceNotifications';
import { fanoutAnnouncementNotifications } from '@/lib/notifications';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface TeacherAllocationSummary {
  id: string;
  classId: string;
  className: string;
  sectionId: string;
  sectionName: string;
  subjectId: string;
  subjectName: string;
  subjectCode: string;
  isClassTeacher: boolean;
  isCoordinator: boolean;
  studentCount: number;
}

export interface TeacherTimetableSlot {
  id: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  className: string;
  sectionName: string;
  subjectName: string;
  roomName: string | null;
}

export interface TeacherStudentItem {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  gender: string | null;
  className: string;
  sectionName: string;
  attendanceToday?: string | null;
}

export interface TeacherHomeworkItem {
  id: string;
  title: string;
  description: string;
  className: string;
  sectionName: string;
  subjectName: string;
  dueDate: string;
  maxMarks: number;
  submissionCount: number;
}

export interface TeacherPortalData {
  staffProfile: {
    id: string;
    employeeId: string;
    fullName: string;
    designation: string;
    departmentName: string | null;
    email: string;
  } | null;
  allocations: TeacherAllocationSummary[];
  selectedAllocationId: string | null;
  activeStudents: TeacherStudentItem[];
  timetable: TeacherTimetableSlot[];
  homework: TeacherHomeworkItem[];
  recentAnnouncements: Array<{
    id: string;
    title: string;
    body: string;
    publishedAt: string;
  }>;
}

export async function getTeacherPortalDataAction(
  filterSectionId?: string,
  isPreview?: boolean
): Promise<ActionResult<TeacherPortalData>> {
  try {
    const context = await requireInstitution();
    const supabase = createClient();
    const institutionId = context.activeInstitutionId!;
    const userId = context.user.id;

    // 1. Fetch Staff Profile for current user
    const { data: staffList } = await (supabase.from('staff_profiles') as any)
      .select('id, employee_id, first_name, last_name, designation, email, department_id, academic_departments:department_id(name)')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .limit(1);

    const staff = staffList && staffList.length > 0 ? staffList[0] : null;

    if (!staff && (context.activeMembership?.role === 'owner' || context.activeMembership?.role === 'admin')) {
      if (!isPreview) {
        return {
          success: false,
          error: 'Unauthorized: Administrative accounts require an assigned teaching staff profile or an explicit audited preview request (?preview=true).',
        };
      }
    }

    let staffId = staff?.id;
    let staffName = staff ? `${staff.first_name} ${staff.last_name}` : context.profile.fullName;
    let designation = staff?.designation || (context.activeMembership?.role === 'owner' ? 'Institution Lead (Faculty Preview)' : 'Faculty Member');
    let deptName = staff?.academic_departments?.name || 'Academic Faculty';
    let employeeId = staff?.employee_id || 'FAC-001';

    // 2. Fetch Faculty Allocations
    let rawAllocations: any[] = [];
    if (staffId) {
      const { data: allocs } = await (supabase.from('faculty_allocations') as any)
        .select(`
          id,
          class_id,
          section_id,
          subject_id,
          is_class_teacher,
          is_coordinator,
          academic_classes:class_id(id, name),
          academic_sections:section_id(id, name),
          academic_subjects:subject_id(id, name, code)
        `)
        .eq('institution_id', institutionId)
        .eq('staff_id', staffId)
        .eq('status', 'active');
      rawAllocations = allocs || [];
    }

    // Audited Admin Preview Mode
    if (rawAllocations.length === 0 && isPreview && (context.activeMembership?.role === 'owner' || context.activeMembership?.role === 'admin')) {
      const { data: sampleAllocs } = await (supabase.from('faculty_allocations') as any)
        .select(`
          id,
          class_id,
          section_id,
          subject_id,
          is_class_teacher,
          is_coordinator,
          academic_classes:class_id(id, name),
          academic_sections:section_id(id, name),
          academic_subjects:subject_id(id, name, code)
        `)
        .eq('institution_id', institutionId)
        .eq('status', 'active')
        .limit(5);
      rawAllocations = sampleAllocs || [];
    }

    const allocations: TeacherAllocationSummary[] = rawAllocations.map((a) => ({
      id: a.id,
      classId: a.class_id,
      className: a.academic_classes?.name || 'Class',
      sectionId: a.section_id,
      sectionName: a.academic_sections?.name || 'Section',
      subjectId: a.subject_id,
      subjectName: a.academic_subjects?.name || 'Subject',
      subjectCode: a.academic_subjects?.code || '',
      isClassTeacher: Boolean(a.is_class_teacher),
      isCoordinator: Boolean(a.is_coordinator),
      studentCount: 0,
    }));

    const targetSectionId = filterSectionId || allocations[0]?.sectionId || null;

    // 3. Fetch Students for the target section (if any)
    let activeStudents: TeacherStudentItem[] = [];
    if (targetSectionId) {
      const { data: students } = await (supabase.from('students') as any)
        .select(`
          id,
          admission_number,
          first_name,
          last_name,
          roll_number,
          gender,
          academic_classes:class_id(name),
          academic_sections:section_id(name)
        `)
        .eq('institution_id', institutionId)
        .eq('section_id', targetSectionId)
        .eq('status', 'active')
        .order('roll_number', { ascending: true })
        .limit(60);

      activeStudents = (students || []).map((s: any) => ({
        id: s.id,
        admissionNumber: s.admission_number,
        firstName: s.first_name,
        lastName: s.last_name,
        rollNumber: s.roll_number,
        gender: s.gender,
        className: s.academic_classes?.name || '',
        sectionName: s.academic_sections?.name || '',
      }));
    }

    // 4. Fetch Timetable Entries for this faculty/staff
    let timetable: TeacherTimetableSlot[] = [];
    if (staffId) {
      const { data: entries } = await (supabase.from('timetable_entries') as any)
        .select(`
          id,
          day_of_week,
          academic_classes:class_id(name),
          academic_sections:section_id(name),
          academic_subjects:subject_id(name),
          rooms:room_id(number, name),
          timetable_periods:period_id(period_number, start_time, end_time)
        `)
        .eq('institution_id', institutionId)
        .eq('faculty_id', staffId)
        .order('day_of_week', { ascending: true })
        .limit(30);

      timetable = (entries || []).map((e: any) => ({
        id: e.id,
        dayOfWeek: String(e.day_of_week),
        periodNumber: e.timetable_periods?.period_number || 1,
        startTime: e.timetable_periods?.start_time || '09:00',
        endTime: e.timetable_periods?.end_time || '09:45',
        className: e.academic_classes?.name || '',
        sectionName: e.academic_sections?.name || '',
        subjectName: e.academic_subjects?.name || '',
        roomName: e.rooms?.name || e.rooms?.number || null,
      }));
    }

    // 5. Fetch Homework Assignments
    const { data: hwList } = await (supabase.from('homework_assignments') as any)
      .select(`
        id,
        title,
        description,
        due_date,
        max_marks,
        academic_classes:class_id(name),
        academic_sections:section_id(name),
        academic_subjects:subject_id(name)
      `)
      .eq('institution_id', institutionId)
      .order('due_date', { ascending: false })
      .limit(10);

    const homework: TeacherHomeworkItem[] = (hwList || []).map((h: any) => ({
      id: h.id,
      title: h.title,
      description: h.description || '',
      className: h.academic_classes?.name || '',
      sectionName: h.academic_sections?.name || '',
      subjectName: h.academic_subjects?.name || '',
      dueDate: h.due_date,
      maxMarks: h.max_marks || 100,
      submissionCount: 0,
    }));

    // 6. Recent Institutional Announcements
    const { data: announcements } = await (supabase.from('announcements') as any)
      .select('id, title, body, published_at')
      .eq('institution_id', institutionId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(5);

    return {
      success: true,
      data: {
        staffProfile: {
          id: staffId || 'staff-preview',
          employeeId,
          fullName: staffName,
          designation,
          departmentName: deptName,
          email: staff?.email || context.user.email,
        },
        allocations,
        selectedAllocationId: allocations[0]?.id || null,
        activeStudents,
        timetable,
        homework,
        recentAnnouncements: (announcements || []).map((a: any) => ({
          id: a.id,
          title: a.title,
          body: a.body,
          publishedAt: a.published_at || new Date().toISOString(),
        })),
      },
    };
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Failed to load teacher portal records',
    };
  }
}

/**
 * Record batch attendance for assigned students and automatically trigger absence notifications
 */
export async function recordTeacherAttendanceAction(params: {
  sectionId: string;
  date: string;
  records: Array<{ studentId: string; status: 'present' | 'absent' | 'late' | 'excused' }>;
}): Promise<ActionResult<{ recordedCount: number; notificationsTriggered: number }>> {
  try {
    const context = await requireInstitution();
    const supabase = createClient();
    const institutionId = context.activeInstitutionId!;

    // Strict RBAC: Verify current user is actually allocated to teach or coordinate this section
    const { data: staffData } = await (supabase.from('staff_profiles') as any)
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', context.user.id)
      .maybeSingle();

    if (!staffData && context.activeMembership?.role !== 'owner' && context.activeMembership?.role !== 'admin') {
      return {
        success: false,
        error: 'Forbidden: Attendance marking requires an assigned teaching staff profile in this institution.',
      };
    }

    if (staffData) {
      const { data: alloc } = await (supabase.from('faculty_allocations') as any)
        .select('id, class_id')
        .eq('institution_id', institutionId)
        .eq('staff_id', staffData.id)
        .eq('section_id', params.sectionId)
        .eq('status', 'active')
        .maybeSingle();

      if (!alloc && context.activeMembership?.role !== 'owner' && context.activeMembership?.role !== 'admin') {
        return {
          success: false,
          error: 'Forbidden: You are not allocated to teach or manage attendance for this section.',
        };
      }
    }

    // Resolve class_id and active academic year
    const { data: section } = await (supabase.from('academic_sections') as any)
      .select('class_id')
      .eq('id', params.sectionId)
      .single();

    const classId = section?.class_id;
    if (!classId) {
      return { success: false, error: 'Target section does not have an associated class.' };
    }

    const { data: academicYear } = await (supabase.from('academic_years') as any)
      .select('id')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!academicYear) {
      return { success: false, error: 'No active academic year found for this institution.' };
    }

    // 1. Find or create daily attendance session
    let sessionId: string;
    const { data: existingSession } = await (supabase.from('attendance_sessions') as any)
      .select('id')
      .eq('institution_id', institutionId)
      .eq('class_id', classId)
      .eq('section_id', params.sectionId)
      .eq('session_date', params.date)
      .eq('session_type', 'daily')
      .maybeSingle();

    if (existingSession) {
      sessionId = existingSession.id;
    } else {
      const { data: newSession, error: sessionErr } = await (supabase.from('attendance_sessions') as any)
        .insert({
          institution_id: institutionId,
          academic_year_id: academicYear.id,
          class_id: classId,
          section_id: params.sectionId,
          session_date: params.date,
          session_type: 'daily',
          marked_by_staff_id: staffData?.id || null,
          status: 'submitted',
          created_by: context.user.id,
        })
        .select('id')
        .single();

      if (sessionErr || !newSession) {
        return { success: false, error: sessionErr?.message || 'Failed to initialize attendance session' };
      }
      sessionId = newSession.id;
    }

    // 2. Batch upsert student attendance records
    const attendancePayload = params.records.map((r) => ({
      institution_id: institutionId,
      session_id: sessionId,
      student_id: r.studentId,
      status: r.status,
      is_excused: r.status === 'excused',
      created_by: context.user.id,
      updated_at: new Date().toISOString(),
    }));

    const { error: upsertErr } = await (supabase.from('student_attendance_records') as any)
      .upsert(attendancePayload, { onConflict: 'session_id, student_id' });

    if (upsertErr) {
      return { success: false, error: upsertErr.message };
    }

    // 3. Automated Absence Notifications to parents
    let notificationsTriggered = 0;
    try {
      const notifRes = await processAttendanceAbsenceNotifications(supabase as any, {
        institutionId,
        sessionId,
        sessionDate: params.date,
        markedByUserId: context.user.id,
        records: params.records,
      });
      notificationsTriggered = notifRes.notificationsCreated;
    } catch (notifErr) {
      console.warn('[TeacherAttendanceAction] Absence notification processing warning:', notifErr);
    }

    revalidatePath('/portal/teacher');
    revalidatePath('/portal/parent');
    revalidatePath('/portal/student');

    return {
      success: true,
      data: {
        recordedCount: attendancePayload.length,
        notificationsTriggered,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to record attendance' };
  }
}

/**
 * Teacher Homework Assignment Creation with Automated Audience Fan-Out
 */
export async function createTeacherHomeworkAction(params: {
  classId: string;
  sectionId?: string | null;
  subjectId: string;
  title: string;
  description: string;
  dueDate: string;
  dueTime?: string;
  maxMarks?: number;
  allowLateSubmissions?: boolean;
  attachments?: any[];
}): Promise<ActionResult<{ homeworkId: string; fanoutCount: number }>> {
  try {
    const context = await requireInstitution();
    const supabase = createClient();
    const institutionId = context.activeInstitutionId!;

    const { data: staffData } = await (supabase.from('staff_profiles') as any)
      .select('id, first_name, last_name')
      .eq('institution_id', institutionId)
      .eq('user_id', context.user.id)
      .maybeSingle();

    if (!staffData && context.activeMembership?.role !== 'owner' && context.activeMembership?.role !== 'admin') {
      return {
        success: false,
        error: 'Forbidden: Assigning coursework requires an assigned teaching staff profile.',
      };
    }

    if (staffData && context.activeMembership?.role !== 'owner' && context.activeMembership?.role !== 'admin') {
      const { data: alloc } = await (supabase.from('faculty_allocations') as any)
        .select('id')
        .eq('institution_id', institutionId)
        .eq('staff_id', staffData.id)
        .eq('class_id', params.classId)
        .eq('status', 'active')
        .maybeSingle();

      if (!alloc) {
        return {
          success: false,
          error: 'Forbidden: You are not allocated to teach or assign coursework for this class.',
        };
      }
    }

    const { data: ay } = await (supabase.from('academic_years') as any)
      .select('id')
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (!ay) {
      return { success: false, error: 'No academic year configured for this institution.' };
    }

    const { data: subject } = await (supabase.from('academic_subjects') as any)
      .select('name')
      .eq('id', params.subjectId)
      .single();

    const subjectName = subject?.name || 'Subject';

    const { data: insertedHw, error: hwError } = await (supabase.from('homework_assignments') as any)
      .insert({
        institution_id: institutionId,
        academic_year_id: ay.id,
        class_id: params.classId,
        section_id: params.sectionId || null,
        subject_id: params.subjectId,
        faculty_staff_id: staffData?.id || null,
        title: params.title.trim(),
        description: params.description.trim(),
        max_marks: params.maxMarks || 100,
        due_date: params.dueDate,
        due_time: params.dueTime || '23:59:59',
        allow_late_submissions: params.allowLateSubmissions ?? true,
        attachments: params.attachments || [],
        status: 'published',
      })
      .select('id')
      .single();

    if (hwError || !insertedHw) {
      return { success: false, error: hwError?.message || 'Failed to create homework assignment' };
    }

    const fanout = await fanoutAnnouncementNotifications(supabase as any, {
      institutionId,
      scope: params.sectionId ? 'section' : 'class',
      targetClassId: params.classId,
      targetSectionId: params.sectionId || null,
      targetRoles: ['student', 'parent'],
      title: `New Assignment: ${params.title}`,
      body: `New ${subjectName} assignment "${params.title}" has been assigned. Due on ${params.dueDate}.`,
      category: 'homework',
      priority: 'normal',
      authorId: context.user.id,
      metadata: {
        deepLinkRoute: '/portal/student',
        entityType: 'homework_assignment',
        entityId: insertedHw.id,
        dueDate: params.dueDate,
        subjectName,
      },
    });

    revalidatePath('/portal/teacher');
    revalidatePath('/portal/student');
    revalidatePath('/portal/parent');

    return {
      success: true,
      data: {
        homeworkId: insertedHw.id,
        fanoutCount: fanout.recipientCount,
      },
    };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to create homework assignment' };
  }
}

/**
 * Teacher Homework Grading with Automated Results Notification to Student and Parents
 */
export async function gradeTeacherHomeworkAction(params: {
  submissionId: string;
  marksObtained: number;
  feedback?: string;
}): Promise<ActionResult<{ submissionId: string }>> {
  try {
    const context = await requireInstitution();
    const supabase = createClient();
    const institutionId = context.activeInstitutionId!;

    const { data: staffData } = await (supabase.from('staff_profiles') as any)
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', context.user.id)
      .maybeSingle();

    if (!staffData && context.activeMembership?.role !== 'owner' && context.activeMembership?.role !== 'admin') {
      return {
        success: false,
        error: 'Forbidden: Grading assignments requires an assigned teaching staff profile.',
      };
    }

    const { data: submission, error: subErr } = await (supabase.from('homework_submissions') as any)
      .select(`
        id,
        student_id,
        assignment_id,
        assignment:homework_assignments(id, title, max_marks, subject_id, academic_subjects(name)),
        student:students(id, user_id, first_name, last_name)
      `)
      .eq('id', params.submissionId)
      .single();

    if (subErr || !submission) {
      return { success: false, error: 'Homework submission not found.' };
    }

    const { error: updateErr } = await (supabase.from('homework_submissions') as any)
      .update({
        marks_obtained: params.marksObtained,
        feedback: params.feedback || null,
        status: 'graded',
        graded_by_staff_id: staffData?.id || null,
        graded_at: new Date().toISOString(),
      })
      .eq('id', params.submissionId);

    if (updateErr) {
      return { success: false, error: updateErr.message };
    }

    const assignmentTitle = submission.assignment?.title || 'Assignment';
    const maxMarks = submission.assignment?.max_marks || 100;
    const studentUserId = submission.student?.user_id;

    const recipientUserIds: string[] = [];
    if (studentUserId) {
      recipientUserIds.push(studentUserId);
    }

    const { data: guardians } = await (supabase.from('student_guardians') as any)
      .select('guardians:guardian_id(user_id)')
      .eq('student_id', submission.student_id)
      .eq('institution_id', institutionId);

    (guardians || []).forEach((g: any) => {
      if (g.guardians?.user_id) {
        recipientUserIds.push(g.guardians.user_id);
      }
    });

    if (recipientUserIds.length > 0) {
      await fanoutAnnouncementNotifications(supabase as any, {
        institutionId,
        scope: 'individual',
        targetUserIds: recipientUserIds,
        title: `Assignment Graded: ${assignmentTitle}`,
        body: `Marks: ${params.marksObtained} / ${maxMarks}.${params.feedback ? ` Feedback: ${params.feedback}` : ''}`,
        category: 'homework',
        priority: 'normal',
        authorId: context.user.id,
        metadata: {
          deepLinkRoute: '/portal/student',
          entityType: 'homework_submission',
          entityId: params.submissionId,
          marksObtained: params.marksObtained,
          maxMarks,
        },
      });
    }

    revalidatePath('/portal/teacher');
    revalidatePath('/portal/student');
    revalidatePath('/portal/parent');

    return { success: true, data: { submissionId: params.submissionId } };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to grade homework submission' };
  }
}

/**
 * Fetch Student Submissions for a Given Homework Assignment
 */
export async function getTeacherHomeworkSubmissionsAction(
  assignmentId: string
): Promise<ActionResult<Array<{
  id: string;
  studentId: string;
  studentName: string;
  rollNumber: string | null;
  submissionText: string | null;
  submittedAt: string;
  isLate: boolean;
  status: string;
  marksObtained: number | null;
  feedback: string | null;
}>>> {
  try {
    await requireInstitution();
    const supabase = createClient();

    const { data, error } = await (supabase.from('homework_submissions') as any)
      .select(`
        id,
        student_id,
        submission_text,
        submitted_at,
        is_late,
        status,
        marks_obtained,
        feedback,
        student:students(first_name, last_name, roll_number)
      `)
      .eq('assignment_id', assignmentId)
      .order('submitted_at', { ascending: false });

    if (error) {
      return { success: false, error: error.message };
    }

    const items = (data || []).map((s: any) => ({
      id: s.id,
      studentId: s.student_id,
      studentName: `${s.student?.first_name || ''} ${s.student?.last_name || ''}`.trim() || 'Student',
      rollNumber: s.student?.roll_number || null,
      submissionText: s.submission_text,
      submittedAt: s.submitted_at,
      isLate: Boolean(s.is_late),
      status: s.status,
      marksObtained: s.marks_obtained,
      feedback: s.feedback,
    }));

    return { success: true, data: items };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Failed to fetch homework submissions' };
  }
}
