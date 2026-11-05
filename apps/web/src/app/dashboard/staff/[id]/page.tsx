import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StaffProfileView } from './StaffProfileView';
import type {
  StaffProfileRow,
  StaffEmploymentRow,
  FacultyAllocationRow,
  StaffDocumentRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StaffDetailPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  const canManage = ['owner', 'admin', 'hr_administrator'].includes(userRole);
  const canAllocate = ['owner', 'admin', 'academic_admin', 'department_head'].includes(userRole);

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
    { data: employmentsData },
    { data: allocationsData },
    { data: documentsData },
    { data: departmentsData },
    { data: campusesData },
  ] = await Promise.all([
    supabase
      .from('staff_employments')
      .select(`
        *,
        department:department_id (*),
        campus:campus_id (*)
      `)
      .eq('staff_id', staff.id)
      .eq('institution_id', institution.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('faculty_allocations')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('staff_documents')
      .select('*')
      .eq('staff_id', staff.id)
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
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
    <StaffProfileView
      staff={staff}
      employments={(employmentsData || []) as (StaffEmploymentRow & {
        department?: AcademicDepartmentRow | null;
        campus?: CampusRow | null;
      })[]}
      allocations={(allocationsData || []) as FacultyAllocationRow[]}
      documents={(documentsData || []) as StaffDocumentRow[]}
      departments={(departmentsData || []) as AcademicDepartmentRow[]}
      campuses={(campusesData || []) as CampusRow[]}
      canManage={canManage}
      canAllocate={canAllocate}
    />
  );
}
