import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EditStaffForm } from './EditStaffForm';
import type {
  StaffProfileRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditStaffPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  const { data: staffData } = await supabase
    .from('staff_profiles')
    .select('*')
    .eq('id', params.id)
    .eq('institution_id', institution.id)
    .single();

  if (!staffData) {
    notFound();
  }

  const staff = staffData as StaffProfileRow;

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

  return (
    <EditStaffForm
      staff={staff}
      departments={(departmentsData || []) as AcademicDepartmentRow[]}
      campuses={(campusesData || []) as CampusRow[]}
    />
  );
}
