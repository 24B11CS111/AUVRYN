import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdmissionListClient } from './AdmissionListClient';
import type {
  AcademicYearRow,
  AcademicProgramRow,
} from '@edu-platform/database';

export default async function AdmissionsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin', 'admissions_officer'].includes(userRole);

  const [
    { data: applicationsData },
    { data: yearsData },
    { data: progsData },
  ] = await Promise.all([
    supabase
      .from('admission_applications')
      .select(`
        *,
        academic_year:academic_year_id (*),
        program:program_id (*),
        class:class_id (*)
      `)
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
  ]);

  const applications = (applicationsData || []) as any[];
  const years = (yearsData || []) as AcademicYearRow[];
  const programs = (progsData || []) as AcademicProgramRow[];

  return (
    <AdmissionListClient
      applications={applications}
      years={years}
      programs={programs}
      canManage={canManage}
    />
  );
}
