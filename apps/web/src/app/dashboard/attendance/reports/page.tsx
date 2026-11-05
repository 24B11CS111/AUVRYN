import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AttendanceReportsClient } from './AttendanceReportsClient';

export default async function AttendanceReportsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  // 1. Fetch all attendance sessions with joins
  const { data: sessionsData } = await supabase
    .from('attendance_sessions')
    .select(`
      id,
      session_date,
      session_type,
      class_id,
      section_id,
      subject_id,
      total_students,
      present_count,
      absent_count,
      late_count,
      half_day_count,
      class:class_id (id, name),
      section:section_id (id, name),
      subject:subject_id (id, name, code)
    `)
    .eq('institution_id', institution.id)
    .order('session_date', { ascending: false });

  // 2. Fetch student attendance records (last 500)
  const { data: recordsData } = await supabase
    .from('student_attendance_records')
    .select(`
      id,
      status,
      student_id,
      session_id,
      student:student_id (
        id,
        admission_number,
        first_name,
        last_name
      ),
      session:session_id (
        class_id,
        section_id,
        class:class_id (name),
        section:section_id (name)
      )
    `)
    .eq('institution_id', institution.id)
    .limit(1000);

  const sessions = sessionsData || [];
  const records = recordsData || [];

  // Compute Overall Stats
  const totalSessions = sessions.length;
  let totalStudentRecords = 0;
  let totalPresent = 0;
  let totalAbsent = 0;

  sessions.forEach((s: any) => {
    totalStudentRecords += s.total_students || 0;
    totalPresent += (s.present_count || 0) + (s.late_count || 0);
    totalAbsent += s.absent_count || 0;
  });

  const overallAttendancePercentage =
    totalStudentRecords > 0 ? Math.round((totalPresent / totalStudentRecords) * 100) : 100;

  // Compute Class Summaries
  const classMap = new Map<string, any>();
  sessions.forEach((s: any) => {
    const key = `${s.class_id}_${s.section_id || 'all'}`;
    const existing = classMap.get(key) || {
      classId: s.class_id,
      className: s.class?.name || 'Class',
      sectionName: s.section?.name || null,
      totalSessions: 0,
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
    };

    existing.totalSessions += 1;
    existing.totalStudents = Math.max(existing.totalStudents, s.total_students || 0);
    existing.presentCount += (s.present_count || 0) + (s.late_count || 0);
    existing.absentCount += s.absent_count || 0;

    classMap.set(key, existing);
  });

  const classSummaries = Array.from(classMap.values()).map((c) => {
    const tot = c.presentCount + c.absentCount;
    return {
      ...c,
      attendancePercentage: tot > 0 ? Math.round((c.presentCount / tot) * 100) : 100,
    };
  });

  // Compute Student Metrics
  const studentMap = new Map<string, any>();
  records.forEach((r: any) => {
    const stId = r.student_id;
    if (!stId || !r.student) return;

    const existing = studentMap.get(stId) || {
      studentId: stId,
      admissionNumber: r.student.admission_number || '',
      studentName: `${r.student.first_name || ''} ${r.student.last_name || ''}`.trim(),
      className: r.session?.class?.name || 'Class',
      sectionName: r.session?.section?.name || null,
      totalSessions: 0,
      attendedSessions: 0,
      absentSessions: 0,
    };

    existing.totalSessions += 1;
    if (r.status === 'present' || r.status === 'late') {
      existing.attendedSessions += 1;
    } else if (r.status === 'half_day') {
      existing.attendedSessions += 0.5;
    } else if (r.status === 'absent') {
      existing.absentSessions += 1;
    }

    studentMap.set(stId, existing);
  });

  let shortageCount = 0;
  const studentMetrics = Array.from(studentMap.values()).map((st) => {
    const pct =
      st.totalSessions > 0 ? Math.round((st.attendedSessions / st.totalSessions) * 100) : 100;
    const isShortage = pct < 75;
    if (isShortage) shortageCount += 1;

    return {
      ...st,
      attendancePercentage: pct,
      isShortage,
    };
  });

  // Compute Subject Summaries
  const subjectMap = new Map<string, any>();
  sessions.forEach((s: any) => {
    if (!s.subject_id || !s.subject) return;
    const existing = subjectMap.get(s.subject_id) || {
      subjectId: s.subject_id,
      subjectName: s.subject.name,
      subjectCode: s.subject.code,
      totalSessions: 0,
      present: 0,
      total: 0,
    };

    existing.totalSessions += 1;
    existing.present += (s.present_count || 0) + (s.late_count || 0);
    existing.total += s.total_students || 0;

    subjectMap.set(s.subject_id, existing);
  });

  const subjectSummaries = Array.from(subjectMap.values()).map((sub) => ({
    subjectId: sub.subjectId,
    subjectName: sub.subjectName,
    subjectCode: sub.subjectCode,
    totalSessions: sub.totalSessions,
    attendancePercentage:
      sub.total > 0 ? Math.round((sub.present / sub.total) * 100) : 100,
  }));

  return (
    <AttendanceReportsClient
      institution={institution}
      overallStats={{
        totalSessions,
        totalStudentRecords,
        totalPresent,
        totalAbsent,
        attendancePercentage: overallAttendancePercentage,
        shortageCount,
      }}
      classSummaries={classSummaries}
      studentMetrics={studentMetrics}
      subjectSummaries={subjectSummaries}
    />
  );
}
