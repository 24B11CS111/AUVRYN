'use server';

import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { STORAGE_BUCKETS, createSignedDownloadUrl } from '@/lib/storage';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface StudentPortalData {
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
    totalSessions: number;
    present: number;
    absent: number;
    late: number;
    percentage: number;
  };
  recentAttendance: Array<{
    date: string;
    status: string;
    sessionType: string;
  }>;
  timetable: Array<{
    id: string;
    dayOfWeek: string;
    startTime: string;
    endTime: string;
    subjectName: string;
    periodNumber: number;
    facultyName?: string;
    roomNumber?: string;
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
  hallTickets: Array<{
    id: string;
    ticketNumber: string;
    examName: string;
    isEligible: boolean;
    ineligibilityReason?: string | null;
  }>;
  homework: Array<{
    id: string;
    title: string;
    subjectName: string;
    dueDate: string;
    dueTime?: string | null;
    maxMarks: number;
    submissionStatus: string;
    marksObtained?: number | null;
    feedback?: string | null;
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

export async function getStudentPortalDataAction(): Promise<ActionResult<StudentPortalData>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    // 1. Resolve student ID
    let studentId: string | null = null;
    if (membership.role === 'student') {
      const { data: st } = await supabase
        .from('students')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .eq('user_id', membership.userId)
        .single();

      if (st) {
        studentId = st.id;
      }
    } else if (membership.role === 'owner' || membership.role === 'admin') {
      // Admin/Owner previewing student portal: fetch first student
      const { data: anyStudent } = await supabase
        .from('students')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .limit(1)
        .single();

      if (anyStudent) {
        studentId = anyStudent.id;
      }
    } else {
      return {
        success: false,
        error: 'Unauthorized: Access to the student portal requires a student or administrative role.',
      };
    }

    if (!studentId) {
      return {
        success: true,
        data: {
          student: null,
          attendanceSummary: { totalSessions: 0, present: 0, absent: 0, late: 0, percentage: 100 },
          recentAttendance: [],
          timetable: [],
          results: [],
          hallTickets: [],
          homework: [],
          fees: { totalAssigned: 0, totalPaid: 0, outstanding: 0, installments: [] },
          announcements: [],
        },
      };
    }

    // 2. Fetch student profile & active enrollment
    const { data: st, error: stErr } = await supabase
      .from('students')
      .select(`
        id, admission_number, first_name, last_name, roll_number, gender, date_of_birth,
        enrollments:student_enrollments(
          id, is_active,
          class:academic_classes(id, name),
          section:academic_sections(id, name)
        )
      `)
      .eq('id', studentId)
      .eq('institution_id', membership.institutionId)
      .single();

    if (stErr || !st) {
      return { success: false, error: 'Student record not found' };
    }

    const activeEnrollment = (st.enrollments || []).find((e: any) => e.is_active);

    // 3. Attendance records & statistics
    const { data: attRecords } = await supabase
      .from('student_attendance_records')
      .select('status, session:attendance_sessions(session_date, session_type)')
      .eq('institution_id', membership.institutionId)
      .eq('student_id', studentId)
      .order('created_at', { ascending: false })
      .limit(30);

    const totalSessions = attRecords?.length || 0;
    const present = (attRecords || []).filter((a: any) => a.status === 'present').length;
    const absent = (attRecords || []).filter((a: any) => a.status === 'absent').length;
    const late = (attRecords || []).filter((a: any) => a.status === 'late').length;
    const attPct = totalSessions > 0 ? Math.round((present / totalSessions) * 100) : 100;

    const recentAttendance = (attRecords || []).map((r: any) => ({
      date: r.session?.session_date || 'N/A',
      status: r.status,
      sessionType: r.session?.session_type || 'daily',
    }));

    // 4. Timetable for class & section
    let timetable: any[] = [];
    if (activeEnrollment?.class?.id) {
      let ttQuery = supabase
        .from('timetable_entries')
        .select(`
          *,
          subject:academic_subjects(name),
          room:rooms(room_number),
          faculty:profiles!timetable_entries_faculty_id_fkey(full_name)
        `)
        .eq('institution_id', membership.institutionId)
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
        subjectName: tt.subject?.name || 'Subject',
        periodNumber: tt.period_number,
        facultyName: tt.faculty?.full_name,
        roomNumber: tt.room?.room_number,
      }));
    }

    // 5. Published Results
    const { data: resultsData } = await supabase
      .from('student_exam_results')
      .select('*, exam:examinations(name)')
      .eq('institution_id', membership.institutionId)
      .eq('student_id', studentId)
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

    // 6. Hall Tickets
    const { data: ticketsData } = await supabase
      .from('hall_tickets')
      .select('*, exam:examinations(name)')
      .eq('institution_id', membership.institutionId)
      .eq('student_id', studentId)
      .order('generated_at', { ascending: false });

    const hallTickets = (ticketsData || []).map((ht: any) => ({
      id: ht.id,
      ticketNumber: ht.ticket_number,
      examName: ht.exam?.name || 'Exam',
      isEligible: ht.is_eligible,
      ineligibilityReason: ht.ineligibility_reason,
    }));

    // 7. Homework & submissions
    const { data: hwData } = await supabase
      .from('homework_assignments')
      .select(`
        id, title, max_marks, due_date, due_time,
        subject:academic_subjects(name)
      `)
      .eq('institution_id', membership.institutionId)
      .eq('status', 'published')
      .order('due_date', { ascending: false })
      .limit(15);

    const hwIds = (hwData || []).map((h: any) => h.id);
    const { data: submissions } = await supabase
      .from('homework_submissions')
      .select('assignment_id, status, marks_obtained, feedback')
      .eq('student_id', studentId)
      .in('assignment_id', hwIds);

    const subMap = new Map((submissions || []).map((s: any) => [s.assignment_id, s]));

    const homework = (hwData || []).map((h: any) => {
      const sub = subMap.get(h.id) as any;
      return {
        id: h.id,
        title: h.title,
        subjectName: h.subject?.name || 'Subject',
        dueDate: h.due_date,
        dueTime: h.due_time,
        maxMarks: h.max_marks,
        submissionStatus: sub ? sub.status : 'pending',
        marksObtained: sub?.marks_obtained,
        feedback: sub?.feedback,
      };
    });

    // 8. Fees
    const { data: feeInstData } = await supabase
      .from('student_fee_installments')
      .select('*')
      .eq('institution_id', membership.institutionId)
      .eq('student_id', studentId)
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

    // 9. Announcements
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
        student: {
          id: st.id,
          admissionNumber: st.admission_number,
          firstName: st.first_name,
          lastName: st.last_name,
          rollNumber: st.roll_number,
          gender: st.gender,
          dob: st.date_of_birth,
          className: activeEnrollment?.class?.name || null,
          sectionName: activeEnrollment?.section?.name || null,
        },
        attendanceSummary: {
          totalSessions,
          present,
          absent,
          late,
          percentage: attPct,
        },
        recentAttendance,
        timetable,
        results,
        hallTickets,
        homework,
        fees: {
          totalAssigned,
          totalPaid,
          outstanding: Math.max(0, totalAssigned - totalPaid),
          installments,
        },
        announcements,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getStudentOwnDocumentSignedUrlAction(
  documentId: string
): Promise<ActionResult<{ signedUrl: string }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeMembership!.institutionId;
    const role = session.activeMembership?.role;

    if (role !== 'student') {
      return { success: false, error: 'Unauthorized: access restricted to student accounts.' };
    }

    const supabase = createClient() as any;

    // Resolve student record for authenticated user
    const { data: studentRecord, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('user_id', session.user.id)
      .eq('institution_id', institutionId)
      .maybeSingle();

    if (studentError || !studentRecord) {
      return { success: false, error: 'Student record not found for active institution.' };
    }

    // Fetch document ensuring it belongs strictly to this student
    const { data: doc, error: docError } = await supabase
      .from('student_documents')
      .select('id, storage_path')
      .eq('id', documentId)
      .eq('student_id', studentRecord.id)
      .eq('institution_id', institutionId)
      .single();

    if (docError || !doc) {
      return { success: false, error: 'Document not found or access denied.' };
    }

    const { signedUrl, error: signError } = await createSignedDownloadUrl(
      supabase,
      STORAGE_BUCKETS.STUDENT_DOCUMENTS,
      doc.storage_path,
      300
    );

    if (signError || !signedUrl) {
      return { success: false, error: signError || 'Failed to generate download link.' };
    }

    return { success: true, data: { signedUrl } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error generating document URL.' };
  }
}
