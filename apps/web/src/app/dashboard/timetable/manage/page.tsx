import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TimetableManageClient } from './TimetableManageClient';

export default async function TimetableManagePage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch active academic years
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name, is_current')
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  const activeYear = (academicYears || []).find((y: any) => y.is_current) || (academicYears || [])[0];

  // 2. Fetch campuses
  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name, code')
    .eq('institution_id', institution.id)
    .eq('status', 'active');

  // 3. Fetch academic classes
  const { data: classes } = await supabase
    .from('academic_classes')
    .select('id, name, program_id')
    .eq('institution_id', institution.id)
    .eq('status', 'active')
    .order('numeric_order', { ascending: true });

  // 4. Fetch academic sections
  const { data: sections } = await supabase
    .from('academic_sections')
    .select('id, class_id, name')
    .eq('institution_id', institution.id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  // 5. Fetch subjects
  const { data: subjects } = await supabase
    .from('academic_subjects')
    .select('id, name, code, subject_type, program_id')
    .eq('institution_id', institution.id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  // 6. Fetch faculty (teaching staff)
  const { data: faculty } = await supabase
    .from('staff_profiles')
    .select('id, employee_id, first_name, last_name, designation')
    .eq('institution_id', institution.id)
    .eq('category', 'teaching')
    .eq('status', 'active')
    .order('first_name', { ascending: true });

  // 7. Fetch active rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select('id, room_number, name, building, floor, room_type, capacity')
    .eq('institution_id', institution.id)
    .eq('is_active', true)
    .order('building', { ascending: true })
    .order('room_number', { ascending: true });

  // 8. Fetch timetable structures with periods
  const { data: structures } = await supabase
    .from('timetable_structures')
    .select(`
      id,
      name,
      description,
      working_days,
      start_time,
      end_time,
      periods_per_day,
      is_default,
      is_active,
      academic_year_id,
      campus_id,
      program_id,
      periods:timetable_periods(
        id,
        period_number,
        name,
        start_time,
        end_time,
        is_break,
        break_type,
        session_slot
      )
    `)
    .eq('institution_id', institution.id)
    .order('is_default', { ascending: false });

  // Sort periods in each structure
  (structures || []).forEach((st: any) => {
    if (st.periods) {
      st.periods.sort((a: any, b: any) => a.period_number - b.period_number);
    }
  });

  // 9. Fetch all active timetable entries for the active year
  const { data: entries } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      academic_year_id,
      campus_id,
      structure_id,
      class_id,
      section_id,
      subject_id,
      faculty_id,
      room_id,
      day_of_week,
      start_time,
      end_time,
      period_number,
      session_type,
      effective_start_date,
      effective_end_date,
      color_code,
      notes,
      academic_class:academic_classes(id, name),
      academic_section:academic_sections(id, name),
      subject:academic_subjects(id, name, code, subject_type),
      faculty:staff_profiles(id, employee_id, first_name, last_name, designation),
      room:rooms(id, room_number, name, building)
    `)
    .eq('institution_id', institution.id)
    .eq('is_active', true)
    .order('period_number', { ascending: true });

  return (
    <TimetableManageClient
      institution={institution}
      academicYears={academicYears || []}
      activeYearId={activeYear?.id || ''}
      campuses={campuses || []}
      classes={classes || []}
      sections={sections || []}
      subjects={subjects || []}
      faculty={faculty || []}
      rooms={rooms || []}
      structures={structures || []}
      initialEntries={entries || []}
      userRole={userRole}
    />
  );
}
