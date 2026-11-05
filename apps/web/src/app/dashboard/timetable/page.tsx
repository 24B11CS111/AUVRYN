import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { TimetableOverviewClient } from './TimetableOverviewClient';

export default async function TimetableOverviewPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const todayDate = new Date().toISOString().slice(0, 10);

  // Day of week in lowercase ('monday', 'tuesday', etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayOfWeek = dayNames[new Date().getDay()] || 'monday';

  // 1. Fetch current active academic year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('institution_id', institution.id)
    .eq('is_current', true)
    .maybeSingle();

  // 2. Fetch timetable structures
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
      program:program_id (name)
    `)
    .eq('institution_id', institution.id)
    .order('is_default', { ascending: false });

  // 3. Fetch count of rooms
  const { count: roomsCount } = await supabase
    .from('rooms')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .eq('is_active', true);

  // 4. Fetch count of active scheduled slots
  const { count: entriesCount } = await supabase
    .from('timetable_entries')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .eq('is_active', true);

  // 5. Fetch count of substitutions for today
  const { count: substitutionsCount } = await supabase
    .from('timetable_substitutions')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .eq('substitution_date', todayDate)
    .eq('status', 'approved');

  // 6. Fetch today's schedule entries (sample up to 10 for dashboard preview)
  const { data: todayEntries } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      day_of_week,
      period_number,
      start_time,
      end_time,
      session_type,
      academic_class:academic_classes(name),
      academic_section:academic_sections(name),
      subject:academic_subjects(name, code),
      faculty:staff_profiles(first_name, last_name),
      room:rooms(room_number, building)
    `)
    .eq('institution_id', institution.id)
    .eq('day_of_week', todayDayOfWeek)
    .eq('is_active', true)
    .order('period_number', { ascending: true })
    .limit(10);

  const stats = {
    totalStructures: (structures || []).length,
    totalEntries: entriesCount || 0,
    totalRooms: roomsCount || 0,
    todaySubstitutions: substitutionsCount || 0,
    academicYearName: activeYear?.name || 'Current Year',
  };

  return (
    <TimetableOverviewClient
      institution={institution}
      stats={stats}
      structures={structures || []}
      todayEntries={todayEntries || []}
      todayDayOfWeek={todayDayOfWeek}
      todayDate={todayDate}
      userRole={userRole}
    />
  );
}
