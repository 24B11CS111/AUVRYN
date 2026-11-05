'use server';

import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface ParentChildSummary {
  id: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  rollNumber: string | null;
  className: string | null;
  sectionName: string | null;
  attendancePercentage: number;
  totalPresent: number;
  totalSessions: number;
  feeOutstanding: number;
  pendingHomeworkCount: number;
}

export interface ParentPortalData {
  children: ParentChildSummary[];
  selectedChildId: string | null;
  activeChildDetails: {
    student: {
      id: string;
      admissionNumber: string;
      firstName: string;
      lastName: string;
      rollNumber: string | null;
      gender: string | null;
      dob: string | null;
      className: string | null;
      sectionName: string | null;
    } | null;
    attendanceSummary: {
      present: number;
      absent: number;
      late: number;
      excused: number;
      onLeave: number;
      percentage: number;
    };
    recentAttendance: Array<{
      date: string;
      status: string;
      sessionType: string;
    }>;
    results: Array<{
      id: string;
      examName: string;
      totalMarks: number;
      obtainedMarks: number;
      percentage: number;
      grade: string | null;
      resultStatus: string;
    }>;
    timetable: Array<{
      id: string;
      dayOfWeek: string;
      startTime: string;
      endTime: string;
      subjectName: string;
      periodNumber: number;
    }>;
    fees: {
      totalAssigned: number;
      totalPaid: number;
      outstanding: number;
      installments: Array<{
        id: string;
        installmentName: string;
        amount: number;
        dueDate: string;
        status: string;
      }>;
    };
    homework: Array<{
      id: string;
      title: string;
      subjectName: string;
      dueDate: string;
      maxMarks: number;
      submissionStatus: string;
      marksObtained?: number | null;
    }>;
    recentLeave: Array<{
      id: string;
      startDate: string;
      endDate: string;
      reason: string;
      status: string;
    }>;
  } | null;
  announcements: Array<{
    id: string;
    title: string;
    content: string;
    priority: string;
    publishedAt: string;
    requiresAcknowledgement: boolean;
    isAcknowledged?: boolean;
  }>;
}

export async function getParentPortalDataAction(
  selectedStudentId?: string
): Promise<ActionResult<ParentPortalData>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    // 1. Resolve guardian record for current user
    let studentIds: string[] = [];

    if (membership.role === 'parent') {
      const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .eq('user_id', membership.userId)
        .single();

      if (guardian) {
        const { data: links } = await supabase
          .from('student_guardians')
          .select('student_id')
          .eq('guardian_id', guardian.id);

        studentIds = (links || []).map((l: any) => l.student_id);
      }
    } else if (membership.role === 'owner' || membership.role === 'admin') {
      // Admin/Owner can preview parent portal with any student
      const { data: anyStudents } = await supabase
        .from('students')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .limit(5);

      studentIds = (anyStudents || []).map((s: any) => s.id);
    }

    if (studentIds.length === 0) {
      return {
        success: true,
        data: {
          children: [],
          selectedChildId: null,
          activeChildDetails: null,
          announcements: [],
        },
      };
    }

    // 2. Fetch children details
    const { data: studentsData, error: stErr } = await supabase
      .from('students')
      .select(`
        id, admission_number, first_name, last_name, roll_number, gender, date_of_birth,
        enrollments:student_enrollments(
          id, is_active,
          class:academic_classes(id, name),
          section:academic_sections(id, name)
        )
      `)
      .in('id', studentIds);

    if (stErr) {
      return { success: false, error: formatSupabaseError(stErr) };
    }

    // 3. For each child, calculate summary metrics
    const childrenSummaries: ParentChildSummary[] = [];
    for (const st of studentsData || []) {
      const activeEnrollment = (st.enrollments || []).find((e: any) => e.is_active);
      const className = activeEnrollment?.class?.name || null;
      const sectionName = activeEnrollment?.section?.name || null;

      // Attendance records
      const { data: att } = await supabase
        .from('student_attendance_records')
        .select('status')
        .eq('student_id', st.id);

      const totalSessions = att?.length || 0;
      const totalPresent = (att || []).filter((a: any) => a.status === 'present').length;
      const attPct = totalSessions > 0 ? Math.round((totalPresent / totalSessions) * 100) : 100;

      // Fees
      const { data: feeAssignments } = await supabase
        .from('student_fee_assignments')
        .select('total_amount, paid_amount')
        .eq('student_id', st.id);

      let outstanding = 0;
      (feeAssignments || []).forEach((fa: any) => {
        outstanding += Math.max(0, Number(fa.total_amount || 0) - Number(fa.paid_amount || 0));
      });

      // Pending homework
      const { count: pendingHomework } = await supabase
        .from('homework_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .eq('status', 'published');

      childrenSummaries.push({
        id: st.id,
        admissionNumber: st.admission_number,
        firstName: st.first_name,
        lastName: st.last_name,
        rollNumber: st.roll_number,
        className,
        sectionName,
        attendancePercentage: attPct,
        totalPresent,
        totalSessions,
        feeOutstanding: outstanding,
        pendingHomeworkCount: pendingHomework || 0,
      });
    }

    // Pick active child
    const activeChildId = (selectedStudentId && studentIds.includes(selectedStudentId))
      ? selectedStudentId
      : childrenSummaries[0]?.id || null;

    let activeDetails = null;

    const activeChild = activeChildId
      ? (studentsData || []).find((s: any) => s.id === activeChildId)
      : null;

    if (activeChildId && activeChild) {
      const activeEnrollment = (activeChild.enrollments || []).find((e: any) => e.is_active);

      // Attendance
      const { data: attRecords } = await supabase
        .from('student_attendance_records')
        .select('status, session:attendance_sessions(session_date, session_type)')
        .eq('student_id', activeChildId)
        .order('created_at', { ascending: false })
        .limit(20);

      const present = (attRecords || []).filter((a: any) => a.status === 'present').length;
      const absent = (attRecords || []).filter((a: any) => a.status === 'absent').length;
      const late = (attRecords || []).filter((a: any) => a.status === 'late').length;
      const excused = (attRecords || []).filter((a: any) => a.status === 'excused').length;
      const onLeave = (attRecords || []).filter((a: any) => a.status === 'on_leave').length;
      const total = attRecords?.length || 0;
      const percentage = total > 0 ? Math.round((present / total) * 100) : 100;

      const recentAttendance = (attRecords || []).map((r: any) => ({
        date: r.session?.session_date || 'N/A',
        status: r.status,
        sessionType: r.session?.session_type || 'daily',
      }));

      // Exam Results
      const { data: resultsData } = await supabase
        .from('student_exam_results')
        .select('*, exam:examinations(name)')
        .eq('student_id', activeChildId)
        .eq('is_published', true)
        .order('created_at', { ascending: false });

      const results = (resultsData || []).map((res: any) => ({
        id: res.id,
        examName: res.exam?.name || 'Examination',
        totalMarks: Number(res.total_max_marks || 0),
        obtainedMarks: Number(res.total_obtained_marks || 0),
        percentage: Number(res.percentage || 0),
        grade: res.final_grade,
        resultStatus: res.result_status,
      }));

      // Timetable
      let timetable: any[] = [];
      if (activeEnrollment?.class?.id) {
        let ttQuery = supabase
          .from('timetable_entries')
          .select('*, subject:academic_subjects(name)')
          .eq('class_id', activeEnrollment.class.id)
          .eq('is_active', true);

        if (activeEnrollment?.section?.id) {
          ttQuery = ttQuery.or(`section_id.eq.${activeEnrollment.section.id},section_id.is.null`);
        }

        const { data: ttData } = await ttQuery.order('period_number', { ascending: true });
        timetable = (ttData || []).map((tt: any) => ({
          id: tt.id,
          dayOfWeek: tt.day_of_week,
          startTime: tt.start_time,
          endTime: tt.end_time,
          subjectName: tt.subject?.name || 'Class',
          periodNumber: tt.period_number,
        }));
      }

      // Fees
      const { data: feeInstData } = await supabase
        .from('student_fee_installments')
        .select('*')
        .eq('student_id', activeChildId)
        .order('due_date', { ascending: true });

      let totalAssigned = 0;
      let totalPaid = 0;
      const installments = (feeInstData || []).map((fi: any) => {
        totalAssigned += Number(fi.amount || 0);
        totalPaid += Number(fi.paid_amount || 0);
        return {
          id: fi.id,
          installmentName: fi.name || 'Installment',
          amount: Number(fi.amount || 0),
          dueDate: fi.due_date,
          status: fi.status,
        };
      });

      // Homework
      const { data: hwData } = await supabase
        .from('homework_assignments')
        .select(`
          id, title, max_marks, due_date,
          subject:academic_subjects(name)
        `)
        .eq('institution_id', membership.institutionId)
        .eq('status', 'published')
        .order('due_date', { ascending: false })
        .limit(10);

      // Submissions for this child
      const hwIds = (hwData || []).map((h: any) => h.id);
      const { data: childSubmissions } = await supabase
        .from('homework_submissions')
        .select('assignment_id, status, marks_obtained')
        .eq('student_id', activeChildId)
        .in('assignment_id', hwIds);

      const subMap = new Map((childSubmissions || []).map((s: any) => [s.assignment_id, s]));

      const homework = (hwData || []).map((h: any) => {
        const sub = subMap.get(h.id) as any;
        return {
          id: h.id,
          title: h.title,
          subjectName: h.subject?.name || 'Subject',
          dueDate: h.due_date,
          maxMarks: h.max_marks,
          submissionStatus: sub ? sub.status : 'pending',
          marksObtained: sub?.marks_obtained,
        };
      });

      // Recent Leave Requests
      const { data: leaveData } = await supabase
        .from('leave_requests')
        .select('id, start_date, end_date, reason, status')
        .eq('student_id', activeChildId)
        .order('created_at', { ascending: false })
        .limit(10);

      const recentLeave = (leaveData || []).map((l: any) => ({
        id: l.id,
        startDate: l.start_date,
        endDate: l.end_date,
        reason: l.reason,
        status: l.status,
      }));

      activeDetails = {
        student: {
          id: activeChild.id,
          admissionNumber: activeChild.admission_number,
          firstName: activeChild.first_name,
          lastName: activeChild.last_name,
          rollNumber: activeChild.roll_number,
          gender: activeChild.gender,
          dob: activeChild.date_of_birth,
          className: activeEnrollment?.class?.name || null,
          sectionName: activeEnrollment?.section?.name || null,
        },
        attendanceSummary: {
          present,
          absent,
          late,
          excused,
          onLeave,
          percentage,
        },
        recentAttendance,
        results,
        timetable,
        fees: {
          totalAssigned,
          totalPaid,
          outstanding: Math.max(0, totalAssigned - totalPaid),
          installments,
        },
        homework,
        recentLeave,
      };
    }

    // 4. Announcements targeted to parents or institution
    const { data: annData } = await supabase
      .from('announcements')
      .select('id, title, content, priority, published_at, requires_acknowledgement')
      .eq('institution_id', membership.institutionId)
      .eq('status', 'published')
      .order('published_at', { ascending: false })
      .limit(10);

    const announcements = (annData || []).map((a: any) => ({
      id: a.id,
      title: a.title,
      content: a.content,
      priority: a.priority,
      publishedAt: a.published_at,
      requiresAcknowledgement: a.requires_acknowledgement,
    }));

    return {
      success: true,
      data: {
        children: childrenSummaries,
        selectedChildId: activeChildId,
        activeChildDetails: activeDetails,
        announcements,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
