import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExamMarksClient } from './ExamMarksClient';
import { getExamRosterForMarksAction } from '../../actions';

interface Props {
  params: { id: string };
  searchParams: { subjectId?: string };
}

export default async function ExamMarksEntryPage({ params, searchParams }: Props) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch examination and allocated subjects
  const { data: examination, error } = await supabase
    .from('examinations')
    .select(`
      id,
      name,
      exam_type,
      max_marks,
      passing_marks,
      status,
      publication_status,
      academic_class:academic_classes(id, name, code),
      academic_year:academic_years(id, name, code),
      subjects:exam_subjects(
        id,
        assessment_type,
        max_marks,
        passing_marks,
        exam_date,
        subject:academic_subjects(id, name, code)
      )
    `)
    .eq('institution_id', institution.id)
    .eq('id', params.id)
    .single();

  if (error || !examination) {
    notFound();
  }

  const subjects = examination.subjects || [];
  const activeSubjectId = searchParams.subjectId || (subjects.length > 0 ? subjects[0].id : null);

  let initialRosterData = null;
  if (activeSubjectId) {
    const rosterRes = await getExamRosterForMarksAction(activeSubjectId);
    if (rosterRes.success) {
      initialRosterData = rosterRes.data;
    }
  }

  return (
    <ExamMarksClient
      examination={examination}
      subjects={subjects}
      activeSubjectId={activeSubjectId}
      initialRosterData={initialRosterData}
      userRole={userRole}
    />
  );
}
