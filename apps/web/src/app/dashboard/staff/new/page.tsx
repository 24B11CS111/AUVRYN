import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewStaffForm } from './NewStaffForm';
import type {
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

export default async function NewStaffPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  const [
    { data: departmentsData },
    { data: campusesData },
  ] = await Promise.all([
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

  const departments = (departmentsData || []) as AcademicDepartmentRow[];
  const campuses = (campusesData || []) as CampusRow[];

  return (
    <NewStaffForm
      departments={departments}
      campuses={campuses}
    />
  );
}
