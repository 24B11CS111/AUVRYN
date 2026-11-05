import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StaffAttendanceClient } from './StaffAttendanceClient';
import { getStaffAttendanceRosterAction } from '../actions';

export default async function StaffAttendancePage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'hr_administrator'].includes(userRole);
  const todayDate = new Date().toISOString().slice(0, 10);

  // Fetch departments and initial roster
  const [{ data: departmentsData }, rosterRes] = await Promise.all([
    supabase
      .from('academic_departments')
      .select('id, name')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
    getStaffAttendanceRosterAction(todayDate),
  ]);

  const departments = departmentsData || [];
  const initialRoster = rosterRes.data?.staff || [];

  return (
    <StaffAttendanceClient
      departments={departments}
      initialRoster={initialRoster}
      initialDate={todayDate}
      canManage={canManage}
    />
  );
}
