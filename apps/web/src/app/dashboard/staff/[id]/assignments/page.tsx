import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { FacultyAssignmentsClient } from './FacultyAssignmentsClient';
import type {
  StaffProfileRow,
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
  AcademicSubjectRow,
} from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function FacultyAssignmentsPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin', 'department_head'].includes(userRole);

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
    { data: allocationsData },
    { data: yearsData },
    { data: progsData },
    { data: classesData },
    { data: sectionsData },
    { data: subjectsData },
  ] = await Promise.all([
    supabase
      .from('faculty_allocations')
      .select(`
        *,
        academic_year:academic_year_id (*),
        program:program_id (*),
        class:class_id (*),
        section:section_id (*),
        subject:subject_id (*)
      `)
      .eq('staff_id', staff.id)
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('academic_years')
      .select('*')
      .eq('institution_id', institution.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('academic_programs')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
    supabase
      .from('academic_classes')
      .select('*')
      .eq('institution_id', institution.id)
      .order('display_order', { ascending: true }),
    supabase
      .from('academic_sections')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
    supabase
      .from('academic_subjects')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
  ]);

  return (
    <FacultyAssignmentsClient
      staff={staff}
      allocations={(allocationsData || []) as any[]}
      years={(yearsData || []) as AcademicYearRow[]}
      programs={(progsData || []) as AcademicProgramRow[]}
      classes={(classesData || []) as AcademicClassRow[]}
      sections={(sectionsData || []) as AcademicSectionRow[]}
      subjects={(subjectsData || []) as AcademicSubjectRow[]}
      canManage={canManage}
    />
  );
}
