import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ExamOverviewClient } from './ExamOverviewClient';

export default async function ExaminationsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  // 1. Fetch current active academic year
  const { data: activeYear } = await supabase
    .from('academic_years')
    .select('id, name')
    .eq('institution_id', institution.id)
    .eq('is_current', true)
    .maybeSingle();

  // 2. Fetch all academic years
  const { data: academicYears } = await supabase
    .from('academic_years')
    .select('id, name, is_current')
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  // 3. Fetch academic classes
  const { data: classes } = await supabase
    .from('academic_classes')
    .select('id, name, code')
    .eq('institution_id', institution.id)
    .order('sequence_order', { ascending: true });

  // 4. Fetch examinations with relations
  const { data: examinations } = await supabase
    .from('examinations')
    .select(`
      id,
      institution_id,
      campus_id,
      academic_year_id,
      term_id,
      program_id,
      class_id,
      name,
      exam_type,
      start_date,
      end_date,
      max_marks,
      passing_marks,
      weightage_percentage,
      grading_scale_id,
      status,
      publication_status,
      published_at,
      instructions,
      created_at,
      academic_year:academic_years(id, name, code),
      campus:campuses(id, name, code),
      academic_class:academic_classes(id, name, code),
      grading_scale:grading_scales(id, name, calculation_type),
      exam_subjects(id, subject_id, assessment_type, max_marks, passing_marks, exam_date, status)
    `)
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  // 5. Fetch count of pending revaluations
  const { count: pendingRevaluationsCount } = await supabase
    .from('exam_revaluations')
    .select('id', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .in('status', ['applied', 'under_review']);

  const exams = examinations || [];
  const stats = {
    totalExams: exams.length,
    scheduledExams: exams.filter((e: any) => e.status === 'scheduled').length,
    ongoingExams: exams.filter((e: any) => e.status === 'in_progress').length,
    completedExams: exams.filter((e: any) => e.status === 'completed').length,
    publishedResults: exams.filter((e: any) => e.publication_status === 'published').length,
    pendingRevaluations: pendingRevaluationsCount || 0,
  };

  return (
    <ExamOverviewClient
      initialExaminations={exams}
      academicYears={academicYears || []}
      activeYearId={activeYear?.id || (academicYears && academicYears[0]?.id) || ''}
      classes={classes || []}
      stats={stats}
      userRole={userRole}
    />
  );
}
