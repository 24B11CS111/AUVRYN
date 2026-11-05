import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewExamClient } from './NewExamClient';

export default async function NewExaminationPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  // 1. Fetch academic years
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name, is_current')
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  // 2. Fetch campuses
  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name, code')
    .eq('institution_id', institution.id);

  // 3. Fetch academic programs
  const { data: programs } = await supabase
    .from('academic_programs')
    .select('id, name, code')
    .eq('institution_id', institution.id);

  // 4. Fetch classes
  const { data: classes } = await supabase
    .from('academic_classes')
    .select('id, name, code, program_id')
    .eq('institution_id', institution.id)
    .order('sequence_order', { ascending: true });

  // 5. Fetch grading scales
  const { data: gradingScales } = await supabase
    .from('grading_scales')
    .select('id, name, calculation_type, is_default')
    .eq('institution_id', institution.id)
    .eq('is_active', true);

  return (
    <NewExamClient
      academicYears={academicYears || []}
      campuses={campuses || []}
      programs={programs || []}
      classes={classes || []}
      gradingScales={gradingScales || []}
    />
  );
}
