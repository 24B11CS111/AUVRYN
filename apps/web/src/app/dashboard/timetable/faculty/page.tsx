import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FacultyTimetableClient } from './FacultyTimetableClient';

export default async function FacultyTimetablePage() {
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

  // 2. Fetch teaching staff profiles
  const { data: facultyMembers } = await supabase
    .from('staff_profiles')
    .select(`
      id,
      user_id,
      employee_id,
      first_name,
      last_name,
      designation,
      department:academic_departments(name)
    `)
    .eq('institution_id', institution.id)
    .eq('category', 'teaching')
    .eq('status', 'active')
    .order('first_name', { ascending: true });

  // 3. Fetch all active timetable entries
  const { data: entries } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      faculty_id,
      day_of_week,
      start_time,
      end_time,
      period_number,
      session_type,
      color_code,
      academic_class:academic_classes(id, name),
      academic_section:academic_sections(id, name),
      subject:academic_subjects(id, name, code),
      room:rooms(id, room_number, building)
    `)
    .eq('institution_id', institution.id)
    .eq('is_active', true)
    .order('period_number', { ascending: true });

  // 4. Fetch substitution records
  const { data: substitutions } = await supabase
    .from('timetable_substitutions')
    .select(`
      id,
      substitution_date,
      reason,
      status,
      remarks,
      approved_at,
      created_at,
      timetable_entry:timetable_entries(
        id,
        day_of_week,
        period_number,
        start_time,
        end_time,
        academic_class:academic_classes(name),
        subject:academic_subjects(name)
      ),
      original_faculty:staff_profiles!timetable_substitutions_original_faculty_id_fkey(
        id, first_name, last_name, designation
      ),
      substitute_faculty:staff_profiles!timetable_substitutions_substitute_faculty_id_fkey(
        id, first_name, last_name, designation
      ),
      approver:profiles(full_name)
    `)
    .eq('institution_id', institution.id)
    .order('substitution_date', { ascending: false });

  // Current user's staff profile if applicable
  const currentStaffProfile = (facultyMembers || []).find((f: any) => f.user_id === session.user.id);

  return (
    <FacultyTimetableClient
      institution={institution}
      academicYearName={activeYear?.name || 'Academic Year'}
      facultyMembers={facultyMembers || []}
      initialEntries={entries || []}
      initialSubstitutions={substitutions || []}
      currentStaffId={currentStaffProfile?.id || null}
      todayDate={todayDate}
      userRole={userRole}
    />
  );
}
