import { describe, it, expect, vi } from 'vitest';
import { executeAIGateway } from '../../apps/web/src/lib/ai/gateway/canonicalGateway';
import { MockAIAdapter } from '../../apps/web/src/lib/ai/adapters/mock';
import type { AIAuthContext } from '../../apps/web/src/lib/ai/gateway/authorization';
import type { AIGatewayRequest } from '@edu-platform/types';

describe('Canonical AI Gateway Pipeline', () => {
  const institutionId = '11111111-1111-1111-1111-111111111111';
  const studentAuth: AIAuthContext = {
    userId: '22222222-2222-2222-2222-222222222222',
    institutionId,
    role: 'student',
  };

  const facultyAuth: AIAuthContext = {
    userId: '33333333-3333-3333-3333-333333333333',
    institutionId,
    role: 'faculty',
  };

  function createMockSupabase(overrides: {
    quotaAllowed?: boolean;
    quotaReason?: string;
    quotaMessage?: string;
    draftId?: string;
  } = {}) {
    return {
      rpc: vi.fn().mockImplementation((fnName: string) => {
        if (fnName === 'check_and_reserve_ai_quota') {
          return Promise.resolve({
            data: {
              allowed: overrides.quotaAllowed ?? true,
              reason: overrides.quotaReason,
              message: overrides.quotaMessage,
              monthly_tokens_remaining: 500000,
              monthly_requests_remaining: 2500,
            },
            error: null,
          });
        }
        if (fnName === 'record_ai_usage') {
          return Promise.resolve({
            data: 'log-uuid-12345',
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      }),
      from: vi.fn().mockReturnValue({
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: overrides.draftId || 'draft-uuid-999',
                institution_id: institutionId,
                author_id: facultyAuth.userId,
                task_type: 'exam_paper_draft',
                title: 'AI Draft',
                content_json: {},
                status: 'draft',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
              error: null,
            }),
          }),
        }),
      }),
    };
  }

  it('rejects unauthenticated requests with UNAUTHORIZED', async () => {
    const supabase = createMockSupabase();
    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'tutor_qa',
      prompt: 'What is photosynthesis?',
    };

    const res = await executeAIGateway(
      supabase,
      request,
      { userId: '', institutionId, role: 'student' } // unauthenticated
    );

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('UNAUTHORIZED');
  });

  it('rejects cross-tenant requests where institutionId does not match user active membership', async () => {
    const supabase = createMockSupabase();
    const request: AIGatewayRequest = {
      institutionId: 'different-institution-id',
      taskType: 'tutor_qa',
      prompt: 'Explain Newton laws.',
    };

    const res = await executeAIGateway(supabase, request, studentAuth);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('FORBIDDEN');
    expect(res.error?.message).toContain('Target institution mismatch');
  });

  it('rejects unauthorized task types according to role permissions', async () => {
    const supabase = createMockSupabase();
    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'exam_paper_draft', // Student is not allowed to generate exams
      prompt: 'Draft final biology examination paper.',
    };

    const res = await executeAIGateway(supabase, request, studentAuth);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('FORBIDDEN');
    expect(res.error?.message).toContain("does not have permission 'ai:teaching_assistant'");
  });

  it('blocks execution when institution token budget is exhausted', async () => {
    const supabase = createMockSupabase({
      quotaAllowed: false,
      quotaReason: 'TOKEN_BUDGET_EXCEEDED',
      quotaMessage: 'Monthly token budget exhausted.',
    });

    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'tutor_qa',
      prompt: 'Help me study history.',
    };

    const res = await executeAIGateway(supabase, request, studentAuth);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('TOKEN_BUDGET_EXCEEDED');
    expect(res.error?.message).toContain('Monthly token budget exhausted');
  });

  it('blocks execution when AI automation is disabled for the institution', async () => {
    const supabase = createMockSupabase({
      quotaAllowed: false,
      quotaReason: 'AI_DISABLED',
      quotaMessage: 'AI services disabled.',
    });

    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'tutor_qa',
      prompt: 'Explain grammar rules.',
    };

    const res = await executeAIGateway(supabase, request, studentAuth);
    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('AI_DISABLED');
  });

  it('successfully executes student tutor request and records usage', async () => {
    const supabase = createMockSupabase();
    const mockAdapter = new MockAIAdapter({
      cannedResponse: 'Photosynthesis is the process by which green plants synthesize nutrients using sunlight.',
    });

    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'tutor_qa',
      prompt: 'Explain photosynthesis simply.',
    };

    const res = await executeAIGateway(supabase, request, studentAuth, { mockAdapter });

    expect(res.success).toBe(true);
    expect(res.content).toContain('green plants synthesize nutrients');
    expect(res.usage).toBeDefined();
    expect(res.usage?.totalTokens).toBeGreaterThan(0);
    expect(res.usage?.provider).toBe('mock');

    // Verify usage logging RPC was invoked
    expect(supabase.rpc).toHaveBeenCalledWith('record_ai_usage', expect.objectContaining({
      p_institution_id: institutionId,
      p_user_id: studentAuth.userId,
      p_task_type: 'tutor_qa',
      p_status: 'success',
    }));
  });

  it('automatically intercepts high-stakes faculty exam drafts and persists them with draft status', async () => {
    const supabase = createMockSupabase({ draftId: 'exam-draft-777' });
    const mockAdapter = new MockAIAdapter({
      cannedResponse: '{"sections": [{"title": "Section A", "questions": ["Q1"]}]}',
    });

    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'exam_paper_draft',
      prompt: 'Create Chemistry Midterm paper.',
      parameters: { title: 'Chemistry Grade 10 Midterm' },
    };

    const res = await executeAIGateway(supabase, request, facultyAuth, {
      mockAdapter,
      responseFormat: 'json',
    });

    expect(res.success).toBe(true);
    expect(res.draftId).toBe('exam-draft-777');

    // Verify table insert was made to ai_generated_drafts with status = draft
    expect(supabase.from).toHaveBeenCalledWith('ai_generated_drafts');
  });

  it('handles provider errors cleanly and logs error status in audit table', async () => {
    const supabase = createMockSupabase();
    const failingAdapter = new MockAIAdapter({
      shouldFail: true,
      failureMessage: 'Upstream connection reset by peer',
    });

    const request: AIGatewayRequest = {
      institutionId,
      taskType: 'tutor_qa',
      prompt: 'Explain gravity.',
    };

    const res = await executeAIGateway(supabase, request, studentAuth, {
      mockAdapter: failingAdapter,
    });

    expect(res.success).toBe(false);
    expect(res.error?.code).toBe('PROVIDER_ERROR');
    expect(res.error?.message).toContain('Upstream connection reset by peer');

    // Verify error was logged in usage table
    expect(supabase.rpc).toHaveBeenCalledWith('record_ai_usage', expect.objectContaining({
      p_status: 'error',
      p_error_message: 'Upstream connection reset by peer',
    }));
  });
});
