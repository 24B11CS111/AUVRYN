'use server';

import { requireInstitution, requirePortalRole } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  askStudentTutor,
  generateStudentPracticeQuiz,
  generateStudentRevisionPlan,
  resolveStudentContext,
} from '@/lib/ai/engines/studentTutor';
import {
  generateLessonPlan,
  draftExamPaper,
  generateRubric,
  generateAssignmentPrompt,
  generateMCQQuestionBank,
} from '@/lib/ai/engines/teacherAssistant';
import {
  askOwnerIntelligence,
  generateExecutiveReport,
  fetchAggregatedInstitutionalMetrics,
  resolveOwnerContext,
} from '@/lib/ai/engines/ownerIntelligence';
import {
  askParentCompanion,
  explainAcademicReport,
  explainTimetableAndEvents,
} from '@/lib/ai/engines/parentCompanion';
import { reviewAIDraft } from '@/lib/ai/gateway/draftManager';
import type { AIDraftStatus, AITaskType } from '@edu-platform/types';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================================================
// 1. STUDENT AI TUTOR ACTIONS
// ============================================================================

export async function askStudentTutorAction(params: {
  prompt: string;
  subjectId?: string;
  conversationId?: string;
  retrievedStudyMaterial?: string;
  sourceDocumentName?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) {
      return { success: false, error: 'No active institution found in session.' };
    }

    const response = await askStudentTutor(supabase, {
      studentUserId: session.user.id,
      institutionId,
      prompt: params.prompt,
      subjectId: params.subjectId,
      conversationId: params.conversationId,
      retrievedStudyMaterial: params.retrievedStudyMaterial,
      sourceDocumentName: params.sourceDocumentName,
    });

    return {
      success: response.success,
      data: response,
      error: response.error?.message,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateStudentPracticeQuizAction(params: {
  subjectId: string;
  topic: string;
  questionCount?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) {
      return { success: false, error: 'No active institution found.' };
    }

    const res = await generateStudentPracticeQuiz(supabase, {
      studentUserId: session.user.id,
      institutionId,
      subjectId: params.subjectId,
      topic: params.topic,
      questionCount: params.questionCount || 5,
      difficulty: params.difficulty || 'medium',
    });

    return {
      success: res.success,
      data: res.quiz,
      error: res.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateStudentRevisionPlanAction(params: {
  examName?: string;
  daysAvailable?: number;
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) {
      return { success: false, error: 'No active institution found.' };
    }

    const response = await generateStudentRevisionPlan(supabase, {
      studentUserId: session.user.id,
      institutionId,
      examName: params.examName,
      daysAvailable: params.daysAvailable || 7,
    });

    return {
      success: response.success,
      data: response,
      error: response.error?.message,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function getStudentEnrolledSubjectsAction(): Promise<
  ActionResult<Array<{ id: string; name: string; code: string }>>
> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const studentInfo = await resolveStudentContext(supabase, session.user.id, institutionId);

    if (!studentInfo.classId) {
      return { success: true, data: [] };
    }

    const { data: classSubjects, error } = await supabase
      .from('academic_class_subjects')
      .select('subject:academic_subjects(id, name, code)')
      .eq('institution_id', institutionId)
      .eq('class_id', studentInfo.classId);

    if (error) {
      return { success: false, error: error.message };
    }

    const subjects = (classSubjects || [])
      .map((cs: any) => cs.subject)
      .filter((s: any) => Boolean(s));

    return { success: true, data: subjects };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 2. TEACHER AI ASSISTANT ACTIONS
// ============================================================================

export async function generateLessonPlanAction(params: {
  topic: string;
  gradeLevel: string;
  durationMinutes?: number;
  learningObjectives?: string[];
  classId?: string;
  subjectId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const result = await generateLessonPlan(supabase, {
      teacherUserId: session.user.id,
      institutionId,
      topic: params.topic,
      gradeLevel: params.gradeLevel,
      durationMinutes: params.durationMinutes,
      learningObjectives: params.learningObjectives,
      classId: params.classId,
      subjectId: params.subjectId,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function draftExamPaperAction(params: {
  title: string;
  gradeLevel: string;
  durationMinutes?: number;
  totalMarks?: number;
  instructions?: string[];
  topicsCoverage?: string[];
  classId?: string;
  subjectId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const result = await draftExamPaper(supabase, {
      teacherUserId: session.user.id,
      institutionId,
      title: params.title,
      gradeLevel: params.gradeLevel,
      durationMinutes: params.durationMinutes,
      totalMarks: params.totalMarks,
      instructions: params.instructions,
      topicsCoverage: params.topicsCoverage,
      classId: params.classId,
      subjectId: params.subjectId,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateRubricAction(params: {
  title: string;
  assignmentDescription: string;
  totalMarks?: number;
  classId?: string;
  subjectId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const result = await generateRubric(supabase, {
      teacherUserId: session.user.id,
      institutionId,
      title: params.title,
      assignmentDescription: params.assignmentDescription,
      totalMarks: params.totalMarks,
      classId: params.classId,
      subjectId: params.subjectId,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateAssignmentPromptAction(params: {
  title: string;
  topic: string;
  gradeLevel: string;
  instructions?: string;
  dueDateDays?: number;
  classId?: string;
  subjectId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const result = await generateAssignmentPrompt(supabase, {
      teacherUserId: session.user.id,
      institutionId,
      title: params.title,
      topic: params.topic,
      gradeLevel: params.gradeLevel,
      instructions: params.instructions,
      dueDateDays: params.dueDateDays,
      classId: params.classId,
      subjectId: params.subjectId,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateMCQQuestionBankAction(params: {
  topic: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  classId?: string;
  subjectId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const result = await generateMCQQuestionBank(supabase, {
      teacherUserId: session.user.id,
      institutionId,
      topic: params.topic,
      count: params.count,
      difficulty: params.difficulty,
      classId: params.classId,
      subjectId: params.subjectId,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function listAIDraftsAction(params?: {
  taskType?: AITaskType;
  status?: AIDraftStatus;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    let query = supabase
      .from('ai_generated_drafts')
      .select(`
        id,
        institution_id,
        author_id,
        task_type,
        title,
        content_json,
        status,
        reviewed_by,
        reviewed_at,
        rejection_reason,
        metadata,
        created_at,
        updated_at
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (params?.taskType) {
      query = query.eq('task_type', params.taskType);
    }
    if (params?.status) {
      query = query.eq('status', params.status);
    }

    const { data: drafts, error } = await query;
    if (error) return { success: false, error: error.message };

    return { success: true, data: drafts || [] };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function reviewAIDraftAction(params: {
  draftId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const updatedDraft = await reviewAIDraft(supabase, {
      draftId: params.draftId,
      institutionId,
      reviewerId: session.user.id,
      status: params.status,
      rejectionReason: params.rejectionReason,
    });

    return { success: true, data: updatedDraft };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function updateDraftContentAction(params: {
  draftId: string;
  contentJson: Record<string, unknown>;
  title?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole([
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const updatePayload: Record<string, unknown> = {
      content_json: params.contentJson,
      updated_at: new Date().toISOString(),
    };
    if (params.title) {
      updatePayload.title = params.title;
    }

    const { data, error } = await (supabase as any)
      .from('ai_generated_drafts')
      .update(updatePayload)
      .eq('id', params.draftId)
      .eq('institution_id', institutionId)
      .select('*')
      .single();

    if (error) return { success: false, error: error.message };

    return { success: true, data };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 3. OWNER AI INTELLIGENCE ACTIONS
// ============================================================================

export async function getInstitutionalMetricsAction(): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole(['owner', 'admin', 'academic_admin']);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const ownerContext = await resolveOwnerContext(supabase, session.user.id, institutionId);
    const metrics = await fetchAggregatedInstitutionalMetrics(
      supabase,
      institutionId,
      ownerContext.institutionName
    );

    return { success: true, data: metrics };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function askOwnerIntelligenceAction(params: {
  prompt: string;
  conversationId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole(['owner', 'admin', 'academic_admin']);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const response = await askOwnerIntelligence(supabase, {
      userId: session.user.id,
      institutionId,
      prompt: params.prompt,
      conversationId: params.conversationId,
    });

    return {
      success: response.success,
      data: response,
      error: response.error?.message,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function generateExecutiveReportAction(params: {
  reportType: 'monthly_operations' | 'fee_collection_analysis' | 'attendance_retention_review' | 'term_performance';
  reportingPeriod?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requirePortalRole(['owner', 'admin', 'academic_admin']);
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const result = await generateExecutiveReport(supabase, {
      userId: session.user.id,
      institutionId,
      reportType: params.reportType,
      reportingPeriod: params.reportingPeriod,
    });

    return {
      success: result.success,
      data: result,
      error: result.error,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

// ============================================================================
// 4. PARENT AI COMPANION ACTIONS
// ============================================================================

export async function getParentLinkedStudentsAction(): Promise<
  ActionResult<Array<{ id: string; name: string; className: string; sectionName: string }>>
> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const { data: guardian } = await (supabase as any)
      .from('guardians')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (!guardian || !(guardian as any).id) {
      return { success: true, data: [] };
    }

    const { data: links, error } = await (supabase as any)
      .from('student_guardians')
      .select(`
        student:students(
          id,
          first_name,
          last_name,
          enrollments:student_enrollments(
            is_active,
            class:academic_classes(name),
            section:academic_sections(name)
          )
        )
      `)
      .eq('institution_id', institutionId)
      .eq('guardian_id', (guardian as any).id);

    if (error) {
      return { success: false, error: error.message };
    }

    const students = (links || []).map((l: any) => {
      const s = l.student;
      const activeEnrollment = (s?.enrollments || []).find((e: any) => e.is_active) || s?.enrollments?.[0];
      return {
        id: s?.id || '',
        name: `${s?.first_name || ''} ${s?.last_name || ''}`.trim(),
        className: activeEnrollment?.class?.name || 'Class',
        sectionName: activeEnrollment?.section?.name || 'Section',
      };
    }).filter((s: { id: string }) => Boolean(s.id));

    return { success: true, data: students };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function askParentCompanionAction(params: {
  studentId: string;
  prompt: string;
  conversationId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const response = await askParentCompanion(supabase, {
      parentUserId: session.user.id,
      studentId: params.studentId,
      institutionId,
      prompt: params.prompt,
      conversationId: params.conversationId,
    });

    return {
      success: response.success,
      data: response,
      error: response.error?.message,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function explainAcademicReportAction(params: {
  studentId: string;
  examinationId?: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const response = await explainAcademicReport(supabase, {
      parentUserId: session.user.id,
      studentId: params.studentId,
      institutionId,
      examinationId: params.examinationId,
    });

    return {
      success: response.success,
      data: response,
      error: response.error?.message,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function explainTimetableAndEventsAction(params: {
  studentId: string;
}): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const supabase = createClient();
    const institutionId = session.activeInstitutionId;

    if (!institutionId) return { success: false, error: 'No active institution.' };

    const response = await explainTimetableAndEvents(supabase, {
      parentUserId: session.user.id,
      studentId: params.studentId,
      institutionId,
    });

    return {
      success: response.success,
      data: response,
      error: response.error?.message,
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
