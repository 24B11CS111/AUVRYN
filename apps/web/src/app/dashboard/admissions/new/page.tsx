import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewAdmissionForm } from './NewAdmissionForm';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
} from '@edu-platform/database';

export default async function NewAdmissionPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  const [
    { data: yearsData },
    { data: progsData },
    { data: classesData },
  ] = await Promise.all([
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
  ]);

  const years = (yearsData || []) as AcademicYearRow[];
  const programs = (progsData || []) as AcademicProgramRow[];
  const classes = (classesData || []) as AcademicClassRow[];

  return (
    <NewAdmissionForm
      years={years}
      programs={programs}
      classes={classes}
    />
  );
}
