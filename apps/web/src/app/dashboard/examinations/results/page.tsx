import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExamResultsClient } from './ExamResultsClient';
import { getExaminationResultsAction } from '../actions';

interface Props {
  searchParams: { examId?: string; classId?: string; sectionId?: string };
}

export default async function ExamResultsPage({ searchParams }: Props) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch examinations
  let examsQuery = supabase
    .from('examinations')
    .select('id, name, exam_type, publication_status, academic_class:academic_classes(id, name)')
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  if (['student', 'parent'].includes(userRole)) {
    examsQuery = examsQuery.eq('publication_status', 'published');
  }

  const { data: examinations } = await examsQuery;
  const exams = examinations || [];
  const activeExamId = searchParams.examId || (exams.length > 0 ? exams[0].id : null);

  // 2. Fetch classes
  const { data: classes } = await supabase
    .from('academic_classes')
    .select('id, name, code')
    .eq('institution_id', institution.id)
    .order('sequence_order', { ascending: true });

  // 3. Fetch results for active examination
  let results: any[] = [];
  if (activeExamId) {
    const res = await getExaminationResultsAction(activeExamId, {
      classId: searchParams.classId,
      sectionId: searchParams.sectionId,
    });
    if (res.success && res.data) {
      results = res.data;
    }
  }

  return (
    <ExamResultsClient
      examinations={exams}
      activeExamId={activeExamId}
      classes={classes || []}
      initialResults={results}
      userRole={userRole}
    />
  );
}
