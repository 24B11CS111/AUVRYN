import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AttendanceDashboardClient } from './AttendanceDashboardClient';

export default async function AttendanceOverviewPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const todayDate = new Date().toISOString().slice(0, 10);

  // 1. Fetch Today's Attendance Sessions
  const { data: todaySessions } = await supabase
    .from('attendance_sessions')
    .select(`
      id,
      session_date,
      session_type,
      status,
      total_students,
      present_count,
      absent_count,
      late_count,
      half_day_count,
      class:class_id (id, name),
      section:section_id (id, name),
      subject:subject_id (id, name),
      marked_by_staff:marked_by_staff_id (first_name, last_name)
    `)
    .eq('institution_id', institution.id)
    .eq('session_date', todayDate)
    .order('created_at', { ascending: false });

  // 2. Fetch Recent Sessions (up to 10)
  const { data: recentSessions } = await supabase
    .from('attendance_sessions')
    .select(`
      id,
      session_date,
      session_type,
      status,
      total_students,
      present_count,
      absent_count,
      late_count,
      class:class_id (id, name),
      section:section_id (id, name),
      subject:subject_id (id, name),
      marked_by_staff:marked_by_staff_id (first_name, last_name)
    `)
    .eq('institution_id', institution.id)
    .order('session_date', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(8);

  // 3. Fetch Staff Count and Today's Staff Attendance
  const [{ count: staffTotal }, { data: staffTodayAtt }, { count: pendingLeavesCount }] =
    await Promise.all([
      supabase
        .from('staff_profiles')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institution.id)
        .eq('employment_status', 'active'),
      supabase
        .from('staff_attendance_records')
        .select('status')
        .eq('institution_id', institution.id)
        .eq('attendance_date', todayDate),
      supabase
        .from('leave_requests')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', institution.id)
        .eq('status', 'pending'),
    ]);

  const sessions = todaySessions || [];
  const totalSessionsToday = sessions.length;
  let totalRecordedStudents = 0;
  let presentStudents = 0;
  let absentStudents = 0;
  let lateStudents = 0;

  sessions.forEach((s: any) => {
    totalRecordedStudents += s.total_students || 0;
    presentStudents += s.present_count || 0;
    absentStudents += s.absent_count || 0;
    lateStudents += s.late_count || 0;
  });

  const attendanceRate =
    totalRecordedStudents > 0
      ? Math.round(((presentStudents + lateStudents) / totalRecordedStudents) * 100)
      : 100;

  const staffPresent = (staffTodayAtt || []).filter(
    (s: any) => s.status === 'present' || s.status === 'late'
  ).length;

  const staffOnLeave = (staffTodayAtt || []).filter(
    (s: any) => s.status === 'on_leave'
  ).length;

  return (
    <AttendanceDashboardClient
      institution={institution}
      todayDate={todayDate}
      stats={{
        totalSessionsToday,
        totalRecordedStudents,
        presentStudents,
        absentStudents,
        lateStudents,
        attendanceRate,
        staffTotal: staffTotal || 0,
        staffPresent,
        staffOnLeave,
        pendingLeaves: pendingLeavesCount || 0,
      }}
      recentSessions={recentSessions || []}
      userRole={userRole}
    />
  );
}
