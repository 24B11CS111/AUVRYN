'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  examinationCreateSchema,
  examSubjectCreateSchema,
  gradingScaleCreateSchema,
  studentMarksBatchSchema,
  markCorrectionSchema,
  publishResultsSchema,
  hallTicketGenerateSchema,
  revaluationRequestSchema,
  revaluationReviewSchema,
  type ExaminationCreateInput,
  type ExamSubjectCreateInput,
  type GradingScaleCreateInput,
  type StudentMarksBatchInput,
  type MarkCorrectionInput,
  type PublishResultsInput,
  type HallTicketGenerateInput,
  type RevaluationRequestInput,
  type RevaluationReviewInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const EXAM_MANAGE_ROLES = ['owner', 'admin', 'academic_admin', 'department_head'] as const;
const MARKS_ENTER_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'] as const;
const RESULTS_PUBLISH_ROLES = ['owner', 'admin', 'academic_admin'] as const;
const REVALUATION_REVIEW_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'] as const;

function canManageExams(role: string): boolean {
  return EXAM_MANAGE_ROLES.includes(role as any);
}

function canEnterMarks(role: string): boolean {
  return MARKS_ENTER_ROLES.includes(role as any);
}

function canPublishResults(role: string): boolean {
  return RESULTS_PUBLISH_ROLES.includes(role as any);
}

function canReviewRevaluation(role: string): boolean {
  return REVALUATION_REVIEW_ROLES.includes(role as any);
}

// ==============================================================================
// 1. Examination Lifecycle Management
// ==============================================================================

export async function getExaminationsAction(filter?: {
  academicYearId?: string;
  campusId?: string;
  status?: string;
  classId?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
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
        exam_subjects(id, subject_id, assessment_type, max_marks, passing_marks, exam_date, start_time, end_time, room_id, invigilator_staff_id, status)
      `)
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false });

    if (filter?.academicYearId) {
      query = query.eq('academic_year_id', filter.academicYearId);
    }
    if (filter?.campusId) {
      query = query.eq('campus_id', filter.campusId);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    if (filter?.classId) {
      query = query.eq('class_id', filter.classId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getExaminationByIdAction(id: string): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('examinations')
      .select(`
        *,
        academic_year:academic_years(id, name, code),
        campus:campuses(id, name, code),
        academic_class:academic_classes(id, name, code),
        program:academic_programs(id, name, code),
        grading_scale:grading_scales(
          id,
          name,
          calculation_type,
          rules:grading_scale_rules(*)
        ),
        subjects:exam_subjects(
          id,
          examination_id,
          subject_id,
          assessment_type,
          max_marks,
          passing_marks,
          credits,
          exam_date,
          start_time,
          end_time,
          room_id,
          invigilator_staff_id,
          status,
          subject:academic_subjects(id, name, code),
          room:rooms(id, room_number, building),
          invigilator:staff_profiles(id, first_name, last_name, employee_id)
        )
      `)
      .eq('institution_id', institutionId)
      .eq('id', id)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createExaminationAction(input: ExaminationCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions to create examinations' };
    }

    const validated = examinationCreateSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('examinations')
      .insert({
        institution_id: institutionId,
        campus_id: validated.campusId || null,
        academic_year_id: validated.academicYearId,
        term_id: validated.termId || null,
        program_id: validated.programId || null,
        class_id: validated.classId || null,
        name: validated.name,
        exam_type: validated.examType,
        start_date: validated.startDate,
        end_date: validated.endDate,
        max_marks: validated.maxMarks,
        passing_marks: validated.passingMarks,
        weightage_percentage: validated.weightagePercentage,
        grading_scale_id: validated.gradingScaleId || null,
        status: validated.status,
        instructions: validated.instructions || null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/examinations');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function updateExaminationAction(
  id: string,
  input: Partial<ExaminationCreateInput> & { status?: string; instructions?: string }
): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions to update examinations' };
    }

    const supabase = createClient() as any;

    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (input.name) updatePayload.name = input.name;
    if (input.examType) updatePayload.exam_type = input.examType;
    if (input.startDate) updatePayload.start_date = input.startDate;
    if (input.endDate) updatePayload.end_date = input.endDate;
    if (input.maxMarks !== undefined) updatePayload.max_marks = input.maxMarks;
    if (input.passingMarks !== undefined) updatePayload.passing_marks = input.passingMarks;
    if (input.weightagePercentage !== undefined) updatePayload.weightage_percentage = input.weightagePercentage;
    if (input.gradingScaleId !== undefined) updatePayload.grading_scale_id = input.gradingScaleId;
    if (input.status) updatePayload.status = input.status;
    if (input.instructions !== undefined) updatePayload.instructions = input.instructions;

    const { data, error } = await supabase
      .from('examinations')
      .update(updatePayload)
      .eq('institution_id', institutionId)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/examinations/${id}`);
    revalidatePath('/dashboard/examinations');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function deleteExaminationAction(id: string): Promise<ActionResult<boolean>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: only exam administrators can delete examinations' };
    }

    const supabase = createClient() as any;

    const { error } = await supabase
      .from('examinations')
      .delete()
      .eq('institution_id', institutionId)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/dashboard/examinations');
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 2. Exam Subject Allocation & Conflict Checking
// ==============================================================================

export async function checkExamConflictAction(input: {
  examSubjectId?: string;
  examDate: string;
  startTime: string;
  endTime: string;
  roomId?: string | null;
  invigilatorStaffId?: string | null;
}): Promise<ActionResult<{ has_conflict: boolean; conflicts: any[] }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data, error } = await supabase.rpc('check_exam_schedule_conflicts', {
      p_institution_id: institutionId,
      p_exam_subject_id: input.examSubjectId || null,
      p_exam_date: input.examDate,
      p_start_time: input.startTime,
      p_end_time: input.endTime,
      p_room_id: input.roomId || null,
      p_invigilator_id: input.invigilatorStaffId || null,
    });

    if (error) throw error;
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function addExamSubjectAction(input: ExamSubjectCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions to allocate exam subjects' };
    }

    const validated = examSubjectCreateSchema.parse(input);
    const supabase = createClient() as any;

    // Check for scheduling conflicts if date, times and room or invigilator are specified
    if (validated.examDate && validated.startTime && validated.endTime && (validated.roomId || validated.invigilatorStaffId)) {
      const { data: conflictData, error: conflictErr } = await supabase.rpc('check_exam_schedule_conflicts', {
        p_institution_id: institutionId,
        p_exam_subject_id: null,
        p_exam_date: validated.examDate,
        p_start_time: validated.startTime,
        p_end_time: validated.endTime,
        p_room_id: validated.roomId || null,
        p_invigilator_id: validated.invigilatorStaffId || null,
      });

      if (!conflictErr && conflictData?.has_conflict) {
        const msg = conflictData.conflicts.map((c: any) => c.message).join('; ');
        return { success: false, error: `Scheduling Conflict: ${msg}` };
      }
    }

    const { data, error } = await supabase
      .from('exam_subjects')
      .insert({
        institution_id: institutionId,
        examination_id: validated.examinationId,
        subject_id: validated.subjectId,
        assessment_type: validated.assessmentType,
        max_marks: validated.maxMarks,
        passing_marks: validated.passingMarks,
        credits: validated.credits,
        exam_date: validated.examDate || null,
        start_time: validated.startTime || null,
        end_time: validated.endTime || null,
        room_id: validated.roomId || null,
        invigilator_staff_id: validated.invigilatorStaffId || null,
        status: validated.status || 'scheduled',
      })
      .select(`
        *,
        subject:academic_subjects(id, name, code),
        room:rooms(id, room_number, building),
        invigilator:staff_profiles(id, first_name, last_name, employee_id)
      `)
      .single();

    if (error) throw error;

    revalidatePath(`/dashboard/examinations/${validated.examinationId}`);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function deleteExamSubjectAction(id: string, examinationId: string): Promise<ActionResult<boolean>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const supabase = createClient() as any;

    const { error } = await supabase
      .from('exam_subjects')
      .delete()
      .eq('institution_id', institutionId)
      .eq('id', id);

    if (error) throw error;

    revalidatePath(`/dashboard/examinations/${examinationId}`);
    return { success: true, data: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 3. Faculty Marks Entry Roster & Audited Corrections
// ==============================================================================

export async function getExamRosterForMarksAction(examSubjectId: string): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    // 1. Fetch exam subject details
    const { data: examSubject, error: subErr } = await supabase
      .from('exam_subjects')
      .select(`
        *,
        examination:examinations(id, name, exam_type, academic_year_id, class_id),
        subject:academic_subjects(id, name, code)
      `)
      .eq('institution_id', institutionId)
      .eq('id', examSubjectId)
      .single();

    if (subErr || !examSubject) {
      throw subErr || new Error('Exam subject allocation not found');
    }

    const classId = examSubject.examination?.class_id;

    // 2. Fetch enrolled students for this class and academic year
    let studentsQuery = supabase
      .from('student_enrollments')
      .select(`
        id,
        student_id,
        class_id,
        section_id,
        roll_number,
        academic_year_id,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          gender,
          photo_url
        ),
        section:academic_sections(id, name)
      `)
      .eq('institution_id', institutionId)
      .eq('academic_year_id', examSubject.examination.academic_year_id)
      .eq('status', 'enrolled');

    if (classId) {
      studentsQuery = studentsQuery.eq('class_id', classId);
    }

    const { data: enrollments, error: enrollErr } = await studentsQuery;
    if (enrollErr) throw enrollErr;

    // 3. Fetch existing entered marks
    const { data: existingMarks, error: marksErr } = await supabase
      .from('student_exam_marks')
      .select(`
        id,
        student_id,
        marks_obtained,
        is_absent,
        is_exempted,
        grade,
        grade_point,
        status,
        remarks,
        submitted_at,
        verified_at
      `)
      .eq('institution_id', institutionId)
      .eq('exam_subject_id', examSubjectId);

    if (marksErr) throw marksErr;

    const marksMap = new Map<string, any>();
    (existingMarks || []).forEach((m: any) => {
      marksMap.set(m.student_id, m);
    });

    const roster = (enrollments || []).map((enrollment: any) => {
      const mark = marksMap.get(enrollment.student_id);
      return {
        studentId: enrollment.student_id,
        enrollmentId: enrollment.id,
        admissionNumber: enrollment.student?.admission_number || '',
        studentName: `${enrollment.student?.first_name || ''} ${enrollment.student?.last_name || ''}`.trim(),
        rollNumber: enrollment.roll_number || '',
        sectionName: enrollment.section?.name || 'Unassigned',
        markId: mark?.id || null,
        marksObtained: mark?.marks_obtained ?? null,
        isAbsent: mark?.is_absent ?? false,
        isExempted: mark?.is_exempted ?? false,
        grade: mark?.grade ?? null,
        gradePoint: mark?.grade_point ?? null,
        status: mark?.status ?? 'draft',
        remarks: mark?.remarks ?? '',
      };
    });

    return {
      success: true,
      data: {
        examSubject,
        roster,
      },
    };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function recordMarksBatchAction(input: StudentMarksBatchInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canEnterMarks(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions to enter exam marks' };
    }

    const validated = studentMarksBatchSchema.parse(input);
    const supabase = createClient() as any;

    const recordsPayload = validated.records.map((r) => ({
      student_id: r.studentId,
      enrollment_id: r.enrollmentId || null,
      marks_obtained: r.marksObtained !== undefined ? r.marksObtained : null,
      is_absent: r.isAbsent || false,
      is_exempted: r.isExempted || false,
      remarks: r.remarks || null,
    }));

    const { data, error } = await supabase.rpc('record_student_marks_batch', {
      p_institution_id: institutionId,
      p_exam_subject_id: validated.examSubjectId,
      p_records: recordsPayload,
      p_status: validated.status || 'submitted',
      p_user_id: session.user.id,
    });

    if (error) throw error;

    revalidatePath(`/dashboard/examinations`);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function correctStudentMarkAction(input: MarkCorrectionInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canEnterMarks(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions to correct marks' };
    }

    const validated = markCorrectionSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase.rpc('correct_student_exam_mark', {
      p_institution_id: institutionId,
      p_mark_id: (validated.studentExamMarkId || validated.markId)!,
      p_new_marks: validated.newMarks,
      p_is_absent: validated.isAbsent || false,
      p_reason: validated.reason,
      p_user_id: session.user.id,
    });

    if (error) throw error;

    revalidatePath('/dashboard/examinations');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getMarksHistoryAction(studentExamMarkId: string): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('marks_entry_corrections')
      .select(`
        id,
        previous_marks,
        new_marks,
        previous_status,
        new_status,
        reason,
        corrected_at,
        corrector:profiles(id, full_name, email)
      `)
      .eq('institution_id', institutionId)
      .eq('student_exam_mark_id', studentExamMarkId)
      .order('corrected_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 4. Consolidated Results & Publication Control
// ==============================================================================

export async function publishExaminationResultsAction(input: PublishResultsInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canPublishResults(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: only institutional administrators can publish exam results' };
    }

    const validated = publishResultsSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase.rpc('publish_examination_results', {
      p_institution_id: institutionId,
      p_examination_id: validated.examinationId,
      p_user_id: session.user.id,
    });

    if (error) throw error;

    revalidatePath('/dashboard/examinations');
    revalidatePath(`/dashboard/examinations/${validated.examinationId}`);
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getExaminationResultsAction(
  examinationId: string,
  filter?: { classId?: string; sectionId?: string; studentId?: string }
): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const userRole = session.activeMembership?.role || '';
    const supabase = createClient() as any;

    let query = supabase
      .from('student_exam_results')
      .select(`
        id,
        institution_id,
        examination_id,
        student_id,
        academic_year_id,
        class_id,
        section_id,
        grading_scale_id,
        grading_scale_version,
        total_max_marks,
        total_obtained_marks,
        percentage,
        gpa,
        cgpa,
        final_grade,
        result_status,
        backlog_count,
        is_published,
        published_at,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          photo_url
        ),
        academic_class:academic_classes(id, name, code),
        academic_section:academic_sections(id, name),
        grading_scale:grading_scales(id, name, calculation_type)
      `)
      .eq('institution_id', institutionId)
      .eq('examination_id', examinationId)
      .order('percentage', { ascending: false });

    // Strict boundary: Students and parents cannot see unpublished results
    if (['student', 'parent'].includes(userRole)) {
      query = query.eq('is_published', true);
    }

    if (filter?.classId) {
      query = query.eq('class_id', filter.classId);
    }
    if (filter?.sectionId) {
      query = query.eq('section_id', filter.sectionId);
    }
    if (filter?.studentId) {
      query = query.eq('student_id', filter.studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 5. Grading Scales Management
// ==============================================================================

export async function getGradingScalesAction(): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('grading_scales')
      .select(`
        id,
        name,
        description,
        calculation_type,
        is_credit_based,
        version,
        is_default,
        is_active,
        created_at,
        rules:grading_scale_rules(*)
      `)
      .eq('institution_id', institutionId)
      .order('name', { ascending: true });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createGradingScaleAction(input: GradingScaleCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = gradingScaleCreateSchema.parse(input);
    const supabase = createClient() as any;

    // Insert grading scale
    const { data: scale, error: scaleErr } = await supabase
      .from('grading_scales')
      .insert({
        institution_id: institutionId,
        name: validated.name,
        description: validated.description || null,
        calculation_type: validated.calculationType,
        is_credit_based: validated.isCreditBased || false,
        version: 1,
        is_default: validated.isDefault || false,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (scaleErr) throw scaleErr;

    // Insert rules
    if (validated.rules && validated.rules.length > 0) {
      const rulesData = validated.rules.map((r) => ({
        grading_scale_id: scale.id,
        grade: r.grade,
        grade_point: r.gradePoint,
        min_percentage: r.minPercentage,
        max_percentage: r.maxPercentage,
        description: r.description || null,
        is_passing: r.isPassing,
      }));

      const { error: rulesErr } = await supabase
        .from('grading_scale_rules')
        .insert(rulesData);

      if (rulesErr) throw rulesErr;
    }

    revalidatePath('/dashboard/examinations/grading');
    return { success: true, data: scale };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 6. Hall Tickets Generation
// ==============================================================================

export async function generateHallTicketsAction(input: HallTicketGenerateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageExams(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = hallTicketGenerateSchema.parse(input);
    const supabase = createClient() as any;

    // 1. Fetch exam
    const { data: exam, error: examErr } = await supabase
      .from('examinations')
      .select('id, name, academic_year_id, class_id')
      .eq('institution_id', institutionId)
      .eq('id', validated.examinationId)
      .single();

    if (examErr || !exam) throw examErr || new Error('Examination not found');

    // 2. Fetch enrolled students
    let studentsQuery = supabase
      .from('student_enrollments')
      .select(`
        student_id,
        student:students(id, admission_number)
      `)
      .eq('institution_id', institutionId)
      .eq('academic_year_id', exam.academic_year_id)
      .eq('status', 'enrolled');

    const targetClassId = validated.classId || exam.class_id;
    if (targetClassId) {
      studentsQuery = studentsQuery.eq('class_id', targetClassId);
    }

    const { data: enrollments, error: enrollErr } = await studentsQuery;
    if (enrollErr) throw enrollErr;

    if (!enrollments || enrollments.length === 0) {
      return { success: false, error: 'No enrolled students found for hall ticket generation' };
    }

    const tickets = enrollments.map((e: any, index: number) => {
      const studentId = e.student_id;
      const admNo = e.student?.admission_number || `S${index + 1}`;
      const examToken = `${exam.id.slice(0, 8)}-${studentId.slice(0, 8)}-${Date.now()}`;
      return {
        institution_id: institutionId,
        examination_id: exam.id,
        student_id: studentId,
        ticket_number: `HT-${admNo.replace(/[^a-zA-Z0-9]/g, '')}`,
        is_eligible: true,
        qr_code_hash: `verify:${institutionId}:${exam.id}:${studentId}:${Buffer.from(examToken).toString('base64')}`,
        generated_by: session.user.id,
      };
    });

    const { data, error } = await supabase
      .from('hall_tickets')
      .upsert(tickets, { onConflict: 'examination_id,student_id' })
      .select();

    if (error) throw error;

    revalidatePath(`/dashboard/examinations/${exam.id}`);
    return { success: true, data: { count: data?.length || 0 } };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getHallTicketsAction(examinationId: string, studentId?: string): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('hall_tickets')
      .select(`
        id,
        ticket_number,
        is_eligible,
        ineligibility_reason,
        qr_code_hash,
        generated_at,
        student:students(
          id,
          first_name,
          last_name,
          admission_number,
          gender,
          photo_url
        ),
        examination:examinations(
          id,
          name,
          exam_type,
          start_date,
          end_date,
          instructions,
          subjects:exam_subjects(
            id,
            subject:academic_subjects(id, name, code),
            assessment_type,
            exam_date,
            start_time,
            end_time,
            room:rooms(id, room_number, building)
          )
        )
      `)
      .eq('institution_id', institutionId)
      .eq('examination_id', examinationId);

    if (studentId) {
      query = query.eq('student_id', studentId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 7. Revaluation & Supplementary Workflows
// ==============================================================================

export async function applyRevaluationAction(input: RevaluationRequestInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    const validated = revaluationRequestSchema.parse(input);
    const supabase = createClient() as any;

    // Fetch mark record to capture original marks and student_id
    const { data: mark, error: markErr } = await supabase
      .from('student_exam_marks')
      .select('id, examination_id, exam_subject_id, student_id, marks_obtained, exam_subject:exam_subjects(subject_id)')
      .eq('institution_id', institutionId)
      .eq('id', validated.studentExamMarkId)
      .single();

    if (markErr || !mark) throw markErr || new Error('Exam mark record not found');

    const subjectId = mark.exam_subject?.subject_id;

    const { data, error } = await supabase
      .from('exam_revaluations')
      .insert({
        institution_id: institutionId,
        student_exam_mark_id: mark.id,
        student_id: mark.student_id,
        examination_id: mark.examination_id,
        subject_id: subjectId,
        original_marks: mark.marks_obtained || 0,
        reason: validated.reason,
        status: 'applied',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/examinations/revaluation');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getRevaluationsAction(filter?: {
  examinationId?: string;
  status?: string;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('exam_revaluations')
      .select(`
        id,
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
      .eq('institution_id', institutionId)
      .order('applied_at', { ascending: false });

    if (filter?.examinationId) {
      query = query.eq('examination_id', filter.examinationId);
    }
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function reviewRevaluationAction(input: RevaluationReviewInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canReviewRevaluation(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: insufficient permissions to review revaluation applications' };
    }

    const validated = revaluationReviewSchema.parse(input);
    const supabase = createClient() as any;

    // 1. Fetch current revaluation record
    const { data: reval, error: revalErr } = await supabase
      .from('exam_revaluations')
      .select('id, student_exam_mark_id, original_marks')
      .eq('institution_id', institutionId)
      .eq('id', validated.revaluationId)
      .single();

    if (revalErr || !reval) throw revalErr || new Error('Revaluation record not found');

    // 2. If marks are revised, trigger immutable correction on student_exam_marks
    if (validated.status === 'completed' && validated.revisedMarks !== undefined) {
      await supabase.rpc('correct_student_exam_mark', {
        p_institution_id: institutionId,
        p_mark_id: reval.student_exam_mark_id,
        p_new_marks: validated.revisedMarks,
        p_is_absent: false,
        p_reason: `Revaluation Review: ${validated.reviewNotes || 'Marks revised upon re-evaluation'}`,
        p_user_id: session.user.id,
      });
    }

    // 3. Update revaluation status
    const { data, error } = await supabase
      .from('exam_revaluations')
      .update({
        status: validated.status,
        revised_marks: validated.revisedMarks !== undefined ? validated.revisedMarks : null,
        review_notes: validated.reviewNotes || null,
        completed_at: ['completed', 'rejected'].includes(validated.status) ? new Date().toISOString() : null,
        reviewed_by: session.user.id,
      })
      .eq('institution_id', institutionId)
      .eq('id', validated.revaluationId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/examinations/revaluation');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 8. Exam Overview Statistics
// ==============================================================================

export async function getExamOverviewStatsAction(): Promise<ActionResult<{
  totalExams: number;
  scheduledExams: number;
  ongoingExams: number;
  completedExams: number;
  publishedResults: number;
  pendingRevaluations: number;
}>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const [examsRes, revalRes] = await Promise.all([
      supabase
        .from('examinations')
        .select('id, status, publication_status')
        .eq('institution_id', institutionId),
      supabase
        .from('exam_revaluations')
        .select('id, status')
        .eq('institution_id', institutionId)
        .in('status', ['applied', 'assigned', 'under_review']),
    ]);

    const exams = examsRes.data || [];
    const revaluations = revalRes.data || [];

    const stats = {
      totalExams: exams.length,
      scheduledExams: exams.filter((e: any) => e.status === 'scheduled').length,
      ongoingExams: exams.filter((e: any) => e.status === 'in_progress').length,
      completedExams: exams.filter((e: any) => e.status === 'completed').length,
      publishedResults: exams.filter((e: any) => e.publication_status === 'published').length,
      pendingRevaluations: revaluations.length,
    };

    return { success: true, data: stats };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}
