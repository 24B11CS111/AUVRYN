import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExamScheduleClient } from './ExamScheduleClient';

export default async function ExamSchedulePage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch all scheduled exam subjects
  const { data: scheduledSubjects } = await supabase
    .from('exam_subjects')
    .select(`
      id,
      examination_id,
      assessment_type,
      max_marks,
      passing_marks,
      credits,
      exam_date,
      start_time,
      end_time,
      status,
      room_id,
      invigilator_staff_id,
      examination:examinations(id, name, exam_type, academic_class:academic_classes(name)),
      subject:academic_subjects(id, name, code),
      room:rooms(id, room_number, building, capacity),
      invigilator:staff_profiles(id, first_name, last_name, employee_id)
    `)
    .eq('institution_id', institution.id)
    .order('exam_date', { ascending: true })
    .order('start_time', { ascending: true });

  // 2. Fetch rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, building, capacity')
    .eq('institution_id', institution.id)
    .eq('is_active', true);

  // 3. Fetch staff
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, first_name, last_name, employee_id')
    .eq('institution_id', institution.id)
    .eq('staff_category', 'teaching');

  return (
    <ExamScheduleClient
      initialSchedule={scheduledSubjects || []}
      rooms={rooms || []}
      staff={staff || []}
      userRole={userRole}
    />
  );
}
