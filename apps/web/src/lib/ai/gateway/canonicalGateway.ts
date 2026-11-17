import type {
  AIGatewayRequest,
  AIGatewayResponse,
  AIProviderType,
  AIProviderAdapter,
} from '@edu-platform/types';
import { getAIAdapter, type AdapterFactoryOptions } from '../adapters';
import { scrubPII } from '../privacy/piiScrubber';
import {
  sanitizeAndGuardPrompt,
  wrapUntrustedInput,
  getSystemSafetyAnchor,
} from '../privacy/promptInjectionGuard';
import { validateAITaskAuthorization, type AIAuthContext } from './authorization';
import { reserveAIQuota, logAIUsage } from './quotaManager';
import { isHighStakesDraftTask, createAIDraft } from './draftManager';

export interface CanonicalGatewayExecutionOptions {
  preferredProvider?: AIProviderType;
  adapterFactoryOptions?: AdapterFactoryOptions;
  mockAdapter?: AIProviderAdapter;
  studentNamesToMask?: string[];
  systemInstruction?: string;
  responseFormat?: 'text' | 'json';
  responseSchema?: Record<string, unknown>;
  temperature?: number;
  maxTokens?: number;
}

/**
 * The Canonical AI Gateway Pipeline.
 * Single entry point for all AI capabilities across Web, Mobile, and Edge Functions.
 */
export async function executeAIGateway(
  supabaseClient: any,
  request: AIGatewayRequest,
  authContext: AIAuthContext,
  options: CanonicalGatewayExecutionOptions = {}
): Promise<AIGatewayResponse> {
  const startTime = Date.now();

  // 1. Authenticate & Verify Institution Scope
  if (!authContext.userId) {
    return {
      success: false,
      taskType: request.taskType,
      error: { code: 'UNAUTHORIZED', message: 'User must be authenticated to access AI services.' },
    };
  }

  if (authContext.institutionId !== request.institutionId) {
    return {
      success: false,
      taskType: request.taskType,
      error: { code: 'FORBIDDEN', message: 'Target institution mismatch with active membership.' },
    };
  }

  // 2. Role-Based Authorization & Permission Check
  const authValidation = validateAITaskAuthorization(authContext, request.taskType);
  if (!authValidation.authorized) {
    return {
      success: false,
      taskType: request.taskType,
      error: {
        code: 'FORBIDDEN',
        message: authValidation.reason || 'Insufficient permissions for this AI task.',
      },
    };
  }

  // 3. Privacy & Input Sanitization Pipeline
  // 3.1 Prompt Injection Guard & Truncation
  const guardResult = sanitizeAndGuardPrompt(request.prompt, { maxInputLength: 10000 });

  // 3.2 PII Minimization (Masking Phone, Email, National IDs, Student Names)
  const scrubResult = scrubPII(guardResult.neutralizedText, options.studentNamesToMask || []);

  // 4. Atomic Pre-Flight Quota Reservation (Row-Locking Stored Procedure)
  const estimatedTokens = request.estimatedTokens || 1500;
  const quotaReservation = await reserveAIQuota(
    supabaseClient,
    request.institutionId,
    estimatedTokens,
    request.taskType
  );

  if (!quotaReservation.allowed) {
    const errorCode =
      quotaReservation.reason === 'AI_DISABLED'
        ? 'AI_DISABLED'
        : quotaReservation.reason === 'TOKEN_BUDGET_EXCEEDED'
        ? 'TOKEN_BUDGET_EXCEEDED'
        : quotaReservation.reason === 'REQUEST_BUDGET_EXCEEDED'
        ? 'REQUEST_BUDGET_EXCEEDED'
        : 'RATE_LIMITED';

    return {
      success: false,
      taskType: request.taskType,
      error: {
        code: errorCode,
        message: quotaReservation.message || 'AI request blocked by institution quota.',
      },
    };
  }

  // 5. System Prompt Construction & Safety Anchoring
  const safetyAnchor = getSystemSafetyAnchor();
  const taskSpecificSystem = options.systemInstruction || request.systemContext || 'You are an educational assistant.';
  const fullSystemPrompt = `${safetyAnchor}\n\nTASK SPECIFICATIONS:\n${taskSpecificSystem}`;

  // Encapsulate user prompt in untrusted tags
  const wrappedUserPrompt = wrapUntrustedInput(
    scrubResult.scrubbedText,
    authContext.role,
    request.taskType
  );

  // 6. Invoke Provider-Independent Adapter
  const adapter =
    options.mockAdapter ||
    getAIAdapter(options.preferredProvider, options.adapterFactoryOptions);

  let completionResult;
  try {
    completionResult = await adapter.generateCompletion({
      systemPrompt: fullSystemPrompt,
      userPrompt: wrappedUserPrompt,
      temperature: options.temperature ?? 0.2,
      maxTokens: options.maxTokens ?? 2048,
      responseFormat: options.responseFormat || 'text',
      schema: options.responseSchema,
    });
  } catch (providerErr) {
    const errorMsg = (providerErr as Error).message || 'Provider communication failed';
    const latencyMs = Math.max(1, Date.now() - startTime);

    // Record error in usage logs
    await logAIUsage(supabaseClient, {
      institutionId: request.institutionId,
      userId: authContext.userId,
      role: authContext.role,
      taskType: request.taskType,
      provider: adapter.providerName,
      modelName: 'unknown',
      promptTokens: 0,
      completionTokens: 0,
      latencyMs,
      status: 'error',
      errorMessage: errorMsg,
      estimatedTokensReserved: estimatedTokens,
    });

    return {
      success: false,
      taskType: request.taskType,
      error: {
        code: 'PROVIDER_ERROR',
        message: `AI provider error: ${errorMsg}`,
      },
    };
  }

  // 7. Post-Execution Usage Logging & Token Reconciliation
  await logAIUsage(supabaseClient, {
    institutionId: request.institutionId,
    userId: authContext.userId,
    role: authContext.role,
    taskType: request.taskType,
    provider: completionResult.provider,
    modelName: completionResult.model,
    promptTokens: completionResult.promptTokens,
    completionTokens: completionResult.completionTokens,
    latencyMs: completionResult.latencyMs,
    status: 'success',
    metadata: {
      hasPiiMasked: scrubResult.detectedCount > 0,
      wasSuspiciousPrompt: guardResult.isSuspicious,
    },
    estimatedTokensReserved: estimatedTokens,
  });

  // 8. High-Stakes Task Output Interception -> Mandatory Draft Persistence
  let draftId: string | undefined = undefined;
  if (isHighStakesDraftTask(request.taskType)) {
    try {
      const draft = await createAIDraft(supabaseClient, {
        institutionId: request.institutionId,
        authorId: authContext.userId,
        taskType: request.taskType,
        title: (request.parameters?.title as string) || `AI Draft: ${request.taskType} (${new Date().toLocaleDateString()})`,
        contentJson: (completionResult.parsed as Record<string, unknown>) || {
          rawContent: completionResult.content,
        },
        metadata: {
          model: completionResult.model,
          provider: completionResult.provider,
        },
      });
      draftId = draft.id;
    } catch (draftErr) {
      console.error('Failed to auto-persist high-stakes draft:', draftErr);
    }
  }

  // 9. Interactive Conversation Message Logging
  let messageId: string | undefined = undefined;
  if (request.conversationId) {
    try {
      // 9.1 Insert user message
      await supabaseClient.from('ai_messages').insert({
        conversation_id: request.conversationId,
        institution_id: request.institutionId,
        sender_role: 'user',
        content: request.prompt,
        tokens_used: completionResult.promptTokens,
      });

      // 9.2 Insert assistant message
      const { data: assistantMsg } = await supabaseClient
        .from('ai_messages')
        .insert({
          conversation_id: request.conversationId,
          institution_id: request.institutionId,
          sender_role: 'assistant',
          content: completionResult.content,
          tokens_used: completionResult.completionTokens,
        })
        .select('id')
        .single();

      messageId = assistantMsg?.id;
    } catch (msgErr) {
      console.error('Failed to log conversation messages:', msgErr);
    }
  }

  return {
    success: true,
    taskType: request.taskType,
    content: completionResult.content,
    parsed: completionResult.parsed,
    conversationId: request.conversationId,
    messageId,
    draftId,
    usage: {
      promptTokens: completionResult.promptTokens,
      completionTokens: completionResult.completionTokens,
      totalTokens: completionResult.totalTokens,
      latencyMs: completionResult.latencyMs,
      provider: completionResult.provider,
      model: completionResult.model,
    },
  };
}
