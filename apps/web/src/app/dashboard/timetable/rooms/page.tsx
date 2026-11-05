import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RoomManagementClient } from './RoomManagementClient';

export default async function RoomsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch campuses
  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name, code')
    .eq('institution_id', institution.id)
    .eq('status', 'active');

  // 2. Fetch all rooms
  const { data: rooms } = await supabase
    .from('rooms')
    .select(`
      id,
      room_number,
      name,
      building,
      floor,
      room_type,
      capacity,
      facilities,
      is_active,
      campus_id,
      campus:campuses(id, name, code)
    `)
    .eq('institution_id', institution.id)
    .order('building', { ascending: true })
    .order('room_number', { ascending: true });

  // 3. Fetch all active timetable entries that reference a room
  const { data: entries } = await supabase
    .from('timetable_entries')
    .select(`
      id,
      room_id,
      day_of_week,
      start_time,
      end_time,
      period_number,
      session_type,
      academic_class:academic_classes(name),
      academic_section:academic_sections(name),
      subject:academic_subjects(name, code),
      faculty:staff_profiles(first_name, last_name)
    `)
    .eq('institution_id', institution.id)
    .eq('is_active', true)
    .not('room_id', 'is', null)
    .order('period_number', { ascending: true });

  return (
    <RoomManagementClient
      institution={institution}
      campuses={campuses || []}
      initialRooms={rooms || []}
      initialEntries={entries || []}
      userRole={userRole}
    />
  );
}
