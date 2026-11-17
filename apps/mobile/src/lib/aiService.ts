/**
 * Mobile AI Service Layer
 *
 * Integrates authenticated mobile clients with the canonical AI Gateway via
 * Supabase Edge Functions or client queries. Handles quota warnings, error
 * states, and conversational turns for Students and Parents.
 */

import { supabase } from './supabase';
import type { AITaskType, AIGatewayResponse } from '@edu-platform/types';

export interface MobileAIGatewayParams {
  institutionId: string;
  taskType: AITaskType;
  prompt: string;
  conversationId?: string;
  contextType?: string;
  contextId?: string;
  systemContext?: string;
  parameters?: Record<string, unknown>;
  estimatedTokens?: number;
}

/**
 * Executes a canonical AI request from the mobile application
 */
export async function executeMobileAIGateway(
  params: MobileAIGatewayParams
): Promise<AIGatewayResponse> {
  const client = supabase;
  if (!client) {
    return {
      success: false,
      taskType: params.taskType,
      error: { code: 'INVALID_REQUEST', message: 'Supabase client is unconfigured.' },
    };
  }

  try {
    const { data, error } = await client.functions.invoke('ai-gateway', {
      body: params,
    });

    if (error) {
      return {
        success: false,
        taskType: params.taskType,
        error: { code: 'PROVIDER_ERROR', message: error.message || 'AI request failed' },
      };
    }

    if (data?.error) {
      return {
        success: false,
        taskType: params.taskType,
        error: { code: data.error.code || 'PROVIDER_ERROR', message: data.error.message },
      };
    }

    return {
      success: true,
      taskType: params.taskType,
      content: data.content || (data.choices?.[0]?.message?.content) || '',
      parsed: data.parsed,
      conversationId: data.conversationId,
      messageId: data.messageId,
      draftId: data.draftId,
      usage: data.usage,
    };
  } catch (err: any) {
    // If Edge Function is offline or local dev fallback:
    return {
      success: false,
      taskType: params.taskType,
      error: { code: 'PROVIDER_ERROR', message: err.message || 'Unable to connect to AI Gateway.' },
    };
  }
}

/**
 * Fetches enrolled subjects for student mobile interface
 */
export async function getMobileStudentSubjects(
  institutionId: string,
  userId: string
): Promise<Array<{ id: string; name: string; code: string }>> {
  const client = supabase;
  if (!client) return [];

  try {
    const { data: student } = await (client as any)
      .from('students')
      .select(`
        id,
        enrollments:student_enrollments(
          id,
          is_active,
          class_id
        )
      `)
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!student) return [];

    const activeEnrollment = (student.enrollments || []).find((e: any) => e.is_active) || student.enrollments?.[0];
    if (!activeEnrollment?.class_id) return [];

    const { data: classSubjects } = await (client as any)
      .from('academic_class_subjects')
      .select('subject:academic_subjects(id, name, code)')
      .eq('institution_id', institutionId)
      .eq('class_id', activeEnrollment.class_id);

    return (classSubjects || [])
      .map((cs: any) => cs.subject)
      .filter((s: any) => Boolean(s?.id));
  } catch {
    return [];
  }
}

/**
 * Fetches linked students for parent mobile interface
 */
export async function getMobileParentLinkedStudents(
  institutionId: string,
  userId: string
): Promise<Array<{ id: string; name: string; className: string }>> {
  const client = supabase;
  if (!client) return [];

  try {
    const { data: guardian } = await (client as any)
      .from('guardians')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('user_id', userId)
      .maybeSingle();

    if (!guardian) return [];

    const { data: links } = await (client as any)
      .from('student_guardians')
      .select(`
        student:students(
          id,
          first_name,
          last_name,
          enrollments:student_enrollments(
            is_active,
            class:academic_classes(name)
          )
        )
      `)
      .eq('institution_id', institutionId)
      .eq('guardian_id', guardian.id);

    return (links || [])
      .map((l: any) => {
        const s = l.student;
        const activeEnrollment = (s?.enrollments || []).find((e: any) => e.is_active) || s?.enrollments?.[0];
        return {
          id: s?.id || '',
          name: `${s?.first_name || ''} ${s?.last_name || ''}`.trim(),
          className: activeEnrollment?.class?.name || 'Class',
        };
      })
      .filter((s: any) => Boolean(s.id));
  } catch {
    return [];
  }
}
