import type {
  AITaskType,
  AIDraftStatus,
  AIGeneratedDraft,
} from '@edu-platform/types';

export interface CreateDraftParams {
  institutionId: string;
  authorId: string;
  taskType: AITaskType;
  title: string;
  contentJson: Record<string, unknown>;
  metadata?: Record<string, unknown>;
}

export interface ReviewDraftParams {
  draftId: string;
  institutionId: string;
  reviewerId: string;
  status: 'approved' | 'rejected';
  rejectionReason?: string;
}

/**
 * Tasks whose generated outputs MUST be persisted as drafts requiring explicit human review
 */
export const HIGH_STAKES_DRAFT_TASKS: readonly AITaskType[] = [
  'exam_paper_draft',
  'lesson_plan',
  'mcq_generation',
  'assignment_draft',
  'rubric_generation',
  'report_generation',
] as const;

export function isHighStakesDraftTask(taskType: AITaskType): boolean {
  return HIGH_STAKES_DRAFT_TASKS.includes(taskType);
}

/**
 * Persists an AI-generated output as a draft in `ai_generated_drafts`
 */
export async function createAIDraft(
  supabaseClient: any,
  params: CreateDraftParams
): Promise<AIGeneratedDraft> {
  const { data, error } = await supabaseClient
    .from('ai_generated_drafts')
    .insert({
      institution_id: params.institutionId,
      author_id: params.authorId,
      task_type: params.taskType,
      title: params.title,
      content_json: params.contentJson,
      status: 'draft' as AIDraftStatus,
      metadata: params.metadata || {},
    })
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to create AI draft: ${error.message}`);
  }

  return {
    id: data.id,
    institutionId: data.institution_id,
    authorId: data.author_id,
    taskType: data.task_type,
    title: data.title,
    contentJson: data.content_json,
    status: data.status,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    rejectionReason: data.rejection_reason,
    metadata: data.metadata,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Reviews (approves or rejects) an AI draft
 */
export async function reviewAIDraft(
  supabaseClient: any,
  params: ReviewDraftParams
): Promise<AIGeneratedDraft> {
  const { data, error } = await supabaseClient
    .from('ai_generated_drafts')
    .update({
      status: params.status,
      reviewed_by: params.reviewerId,
      reviewed_at: new Date().toISOString(),
      rejection_reason: params.status === 'rejected' ? params.rejectionReason : null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', params.draftId)
    .eq('institution_id', params.institutionId)
    .select('*')
    .single();

  if (error) {
    throw new Error(`Failed to review AI draft: ${error.message}`);
  }

  return {
    id: data.id,
    institutionId: data.institution_id,
    authorId: data.author_id,
    taskType: data.task_type,
    title: data.title,
    contentJson: data.content_json,
    status: data.status,
    reviewedBy: data.reviewed_by,
    reviewedAt: data.reviewed_at,
    rejectionReason: data.rejection_reason,
    metadata: data.metadata,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
