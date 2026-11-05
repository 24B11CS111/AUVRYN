import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExamDetailsClient } from './ExamDetailsClient';

interface Props {
  params: { id: string };
}

export default async function ExamDetailsPage({ params }: Props) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch examination
  const { data: examination, error } = await supabase
    .from('examinations')
    .select(`
      *,
      academic_year:academic_years(id, name, code),
      campus:campuses(id, name, code),
      academic_class:academic_classes(id, name, code),
      program:academic_programs(id, name, code),
      grading_scale:grading_scales(
        id,
        name,
        calculation_type,
        rules:grading_scale_rules(*)
      ),
      subjects:exam_subjects(
        id,
        examination_id,
        subject_id,
        assessment_type,
        max_marks,
        passing_marks,
        credits,
        exam_date,
        start_time,
        end_time,
        room_id,
        invigilator_staff_id,
        status,
        subject:academic_subjects(id, name, code),
        room:rooms(id, room_number, building),
        invigilator:staff_profiles(id, first_name, last_name, employee_id)
      )
    `)
    .eq('institution_id', institution.id)
    .eq('id', params.id)
    .single();

  if (error || !examination) {
    notFound();
  }

  // 2. Fetch available academic subjects for allocation
  const { data: availableSubjects } = await supabase
    .from('academic_subjects')
    .select('id, name, code, category')
    .eq('institution_id', institution.id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  // 3. Fetch rooms
  const { data: availableRooms } = await supabase
    .from('rooms')
    .select('id, room_number, name, building, capacity')
    .eq('institution_id', institution.id)
    .eq('is_active', true)
    .order('room_number', { ascending: true });

  // 4. Fetch teaching staff for invigilation
  const { data: availableStaff } = await supabase
    .from('staff_profiles')
    .select('id, first_name, last_name, employee_id, designation')
    .eq('institution_id', institution.id)
    .eq('staff_category', 'teaching')
    .order('first_name', { ascending: true });

  // 5. Fetch count of published results
  const { count: resultsCount } = await supabase
    .from('student_exam_results')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .eq('examination_id', params.id);

  // 6. Fetch count of hall tickets generated
  const { count: hallTicketsCount } = await supabase
    .from('hall_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .eq('examination_id', params.id);

  return (
    <ExamDetailsClient
      examination={examination}
      availableSubjects={availableSubjects || []}
      availableRooms={availableRooms || []}
      availableStaff={availableStaff || []}
      resultsCount={resultsCount || 0}
      hallTicketsCount={hallTicketsCount || 0}
      userRole={userRole}
    />
  );
}
