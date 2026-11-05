import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ClassTimetableClient } from './ClassTimetableClient';

export default async function ClassTimetablePage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const todayDate = new Date().toISOString().slice(0, 10);

  // 1. Fetch current active academic year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('institution_id', institution.id)
    .eq('is_current', true)
    .maybeSingle();

  // 2. Fetch academic classes
  const { data: classes } = await supabase
    .from('academic_classes')
    .select('id, name')
    .eq('institution_id', institution.id)
    .eq('status', 'active')
    .order('numeric_order', { ascending: true });

  // 3. Fetch academic sections
  const { data: sections } = await supabase
    .from('academic_sections')
    .select('id, class_id, name')
    .eq('institution_id', institution.id)
    .eq('status', 'active')
    .order('name', { ascending: true });

  // 4. Fetch all active timetable entries with joined data
  const { data: entries } = await supabase
    .from('timetable_entries')
    .select(`
      id,
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
      color_code,
      notes,
      academic_class:academic_classes(id, name),
      academic_section:academic_sections(id, name),
      subject:academic_subjects(id, name, code, subject_type),
      faculty:staff_profiles(id, first_name, last_name, designation),
      room:rooms(id, room_number, building)
    `)
    .eq('institution_id', institution.id)
    .eq('is_active', true)
    .order('period_number', { ascending: true });

  return (
    <ClassTimetableClient
      institution={institution}
      academicYearName={activeYear?.name || 'Academic Year'}
      classes={classes || []}
      sections={sections || []}
      initialEntries={entries || []}
      todayDate={todayDate}
      userRole={userRole}
    />
  );
}
