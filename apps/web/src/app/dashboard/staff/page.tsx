import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StaffListClient } from './StaffListClient';
import type {
  StaffProfileRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

export default async function StaffDirectoryPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'hr_administrator'].includes(userRole);

  const [
    { data: staffData },
    { data: departmentsData },
    { data: campusesData },
  ] = await Promise.all([
    supabase
      .from('staff_profiles')
      .select(`
        *,
        department:department_id (*),
        campus:campus_id (*)
      `)
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

  const staffList = (staffData || []) as (StaffProfileRow & {
    department?: AcademicDepartmentRow | null;
    campus?: CampusRow | null;
  })[];

  const departments = (departmentsData || []) as AcademicDepartmentRow[];
  const campuses = (campusesData || []) as CampusRow[];

  return (
    <StaffListClient
      staffList={staffList}
      departments={departments}
      campuses={campuses}
      canManage={canManage}
    />
  );
}
