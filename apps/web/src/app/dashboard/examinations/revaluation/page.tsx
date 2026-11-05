import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { RevaluationClient } from './RevaluationClient';

export default async function RevaluationsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch revaluation requests
  const { data: revaluations } = await supabase
    .from('exam_revaluations')
    .select(`
      id,
      student_exam_mark_id,
      student_id,
      examination_id,
      subject_id,
      original_marks,
      revised_marks,
      status,
      reason,
      review_notes,
      applied_at,
      completed_at,
      student:students(id, first_name, last_name, admission_number),
      examination:examinations(id, name, exam_type),
      subject:academic_subjects(id, name, code),
      reviewer:staff_profiles(id, first_name, last_name, employee_id)
    `)
    .eq('institution_id', institution.id)
    .order('applied_at', { ascending: false });

  // 2. Fetch staff for reviewer assignments
  const { data: staff } = await supabase
    .from('staff_profiles')
    .select('id, first_name, last_name, employee_id, designation')
    .eq('institution_id', institution.id)
    .eq('staff_category', 'teaching');

  return (
    <RevaluationClient
      initialRevaluations={revaluations || []}
      staff={staff || []}
      userRole={userRole}
    />
  );
}
