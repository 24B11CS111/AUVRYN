import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StudentAttendanceClient } from './StudentAttendanceClient';

export default async function StudentAttendanceRegistersPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canCorrect = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'].includes(userRole);
  const todayDate = new Date().toISOString().slice(0, 10);

  // Fetch recent student attendance records (last 50) and active classes
  const [{ data: recordsData }, { data: classesData }] = await Promise.all([
    supabase
      .from('student_attendance_records')
      .select(`
        id,
        status,
        remarks,
        is_excused,
        created_at,
        student:student_id (id, admission_number, first_name, last_name),
        session:session_id (
          id,
          session_date,
          session_type,
          class_id,
          section_id,
          class:class_id (id, name),
          section:section_id (id, name),
          subject:subject_id (id, name)
        )
      `)
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false })
      .limit(60),
    supabase
      .from('academic_classes')
      .select('id, name')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('display_order', { ascending: true }),
  ]);

  const initialRecords = recordsData || [];
  const classes = classesData || [];

  return (
    <StudentAttendanceClient
      institution={institution}
      initialRecords={initialRecords}
      classes={classes}
      canCorrect={canCorrect}
      selectedDateDefault={todayDate}
    />
  );
}
