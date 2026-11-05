import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StaffInvitationsClient } from './StaffInvitationsClient';
import type {
  StaffProfileRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

export default async function StaffInvitationsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'hr_administrator'].includes(userRole);

  const [
    { data: invitationsData },
    { data: staffData },
    { data: departmentsData },
    { data: campusesData },
  ] = await Promise.all([
    supabase
      .from('staff_invitations')
      .select(`
        *,
        department:department_id (*),
        campus:campus_id (*),
        staff:staff_id (*)
      `)
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_profiles')
      .select('*')
      .eq('institution_id', institution.id)
      .order('employee_id', { ascending: true }),
    supabase
      .from('academic_departments')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
    supabase
      .from('campuses')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
  ]);

  return (
    <StaffInvitationsClient
      invitations={(invitationsData || []) as any[]}
      staffList={(staffData || []) as StaffProfileRow[]}
      departments={(departmentsData || []) as AcademicDepartmentRow[]}
      campuses={(campusesData || []) as CampusRow[]}
      canManage={canManage}
    />
  );
}
