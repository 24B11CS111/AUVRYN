import type {
  AIProviderType,
  AITaskType,
} from '@edu-platform/types';

export interface QuotaReservationResult {
  allowed: boolean;
  reason?: 'AI_DISABLED' | 'TASK_TYPE_DISALLOWED' | 'TOKEN_BUDGET_EXCEEDED' | 'REQUEST_BUDGET_EXCEEDED' | 'DATABASE_ERROR';
  message?: string;
  monthlyTokensRemaining?: number;
  monthlyRequestsRemaining?: number;
  resetAt?: string;
}

export interface UsageRecordParams {
  institutionId: string;
  userId?: string | null;
  role: string;
  taskType: AITaskType;
  provider: AIProviderType;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  latencyMs: number;
  status: 'success' | 'rate_limited' | 'quota_exceeded' | 'error';
  errorMessage?: string | null;
  metadata?: Record<string, unknown>;
  estimatedTokensReserved?: number;
}

/**
 * Calculates estimated model cost in USD based on current pricing tables
 */
export function estimateCostUSD(
  model: string,
  promptTokens: number,
  completionTokens: number
): number {
  let promptRatePerMillion = 0.10; // Default $0.10 per 1M prompt tokens (Gemini Flash class)
  let completionRatePerMillion = 0.40; // Default $0.40 per 1M completion tokens

  if (model.includes('argon') || model.includes('pro') || model.includes('4o') && !model.includes('mini')) {
    promptRatePerMillion = 2.50;
    completionRatePerMillion = 10.00;
  } else if (model.includes('lite') || model.includes('haiku')) {
    promptRatePerMillion = 0.075;
    completionRatePerMillion = 0.30;
  }

  const cost =
    (promptTokens / 1_000_000) * promptRatePerMillion +
    (completionTokens / 1_000_000) * completionRatePerMillion;

  return Number(cost.toFixed(6));
}

/**
 * Invokes the atomic check_and_reserve_ai_quota PostgreSQL stored procedure
 */
export async function reserveAIQuota(
  supabaseClient: any,
  institutionId: string,
  estimatedTokens: number,
  taskType: AITaskType
): Promise<QuotaReservationResult> {
  try {
    const { data, error } = await supabaseClient.rpc('check_and_reserve_ai_quota', {
      p_institution_id: institutionId,
      p_estimated_tokens: estimatedTokens,
      p_task_type: taskType,
    });

    if (error) {
      return {
        allowed: false,
        reason: 'DATABASE_ERROR',
        message: `Database error during quota reservation: ${error.message}`,
      };
    }

    return {
      allowed: data.allowed,
      reason: data.reason,
      message: data.message,
      monthlyTokensRemaining: data.monthly_tokens_remaining,
      monthlyRequestsRemaining: data.monthly_requests_remaining,
      resetAt: data.reset_at,
    };
  } catch (err) {
    return {
      allowed: false,
      reason: 'DATABASE_ERROR',
      message: `Failed to invoke quota reservation RPC: ${(err as Error).message}`,
    };
  }
}

/**
 * Invokes the record_ai_usage PostgreSQL stored procedure
 */
export async function logAIUsage(
  supabaseClient: any,
  params: UsageRecordParams
): Promise<string | null> {
  try {
    const { data: logId, error } = await supabaseClient.rpc('record_ai_usage', {
      p_institution_id: params.institutionId,
      p_user_id: params.userId || null,
      p_role: params.role,
      p_task_type: params.taskType,
      p_provider: params.provider,
      p_model_name: params.modelName,
      p_prompt_tokens: params.promptTokens,
      p_completion_tokens: params.completionTokens,
      p_latency_ms: params.latencyMs,
      p_status: params.status,
      p_error_message: params.errorMessage || null,
      p_metadata: params.metadata || {},
      p_estimated_tokens_reserved: params.estimatedTokensReserved || 0,
    });

    if (error) {
      console.error('Failed to record AI usage log:', error.message);
      return null;
    }

    return logId;
  } catch (err) {
    console.error('Exception recording AI usage log:', err);
    return null;
  }
}
