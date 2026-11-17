-- ============================================================================
-- Migration 17: AI Gateway, Quotas, Usage Logs, Conversations & Drafts
-- Milestone 12 - AI Intelligence & Automation
-- ============================================================================

-- 1. Create Enums
DO $$ BEGIN
  CREATE TYPE public.ai_provider_type AS ENUM (
    'gemini',
    'openai',
    'anthropic',
    'mock',
    'custom'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_task_type AS ENUM (
    'tutor_qa',
    'concept_explanation',
    'quiz_generation',
    'revision_plan',
    'lesson_plan',
    'mcq_generation',
    'exam_paper_draft',
    'assignment_draft',
    'rubric_generation',
    'owner_analytics',
    'report_generation',
    'parent_summary'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_draft_status AS ENUM (
    'draft',
    'reviewed',
    'approved',
    'rejected',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE public.ai_message_role AS ENUM (
    'user',
    'assistant',
    'system'
  );
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- 2. Table: ai_institution_quotas
-- Tracks token and request quotas per institution with atomic monthly resets
CREATE TABLE IF NOT EXISTS public.ai_institution_quotas (
  institution_id UUID PRIMARY KEY REFERENCES public.institutions(id) ON DELETE CASCADE,
  monthly_token_budget BIGINT NOT NULL DEFAULT 1000000,
  monthly_tokens_consumed BIGINT NOT NULL DEFAULT 0,
  monthly_request_budget INT NOT NULL DEFAULT 5000,
  monthly_requests_consumed INT NOT NULL DEFAULT 0,
  is_ai_enabled BOOLEAN NOT NULL DEFAULT true,
  allowed_task_types public.ai_task_type[] NOT NULL DEFAULT '{tutor_qa,concept_explanation,quiz_generation,revision_plan,lesson_plan,mcq_generation,exam_paper_draft,assignment_draft,rubric_generation,owner_analytics,report_generation,parent_summary}',
  reset_at TIMESTAMPTZ NOT NULL DEFAULT (date_trunc('month', now()) + interval '1 month'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT chk_ai_quota_tokens_consumed CHECK (monthly_tokens_consumed >= 0),
  CONSTRAINT chk_ai_quota_requests_consumed CHECK (monthly_requests_consumed >= 0)
);

-- 3. Table: ai_usage_logs
-- Granular audit logging of all AI executions, tokens consumed, and latencies
CREATE TABLE IF NOT EXISTS public.ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  role TEXT NOT NULL,
  task_type public.ai_task_type NOT NULL,
  provider public.ai_provider_type NOT NULL,
  model_name TEXT NOT NULL,
  prompt_tokens INT NOT NULL DEFAULT 0,
  completion_tokens INT NOT NULL DEFAULT 0,
  total_tokens INT NOT NULL DEFAULT 0,
  estimated_cost_usd NUMERIC(10, 6) DEFAULT 0.000000,
  latency_ms INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'success', -- 'success', 'rate_limited', 'quota_exceeded', 'error'
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_inst_date ON public.ai_usage_logs(institution_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_date ON public.ai_usage_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_inst_task ON public.ai_usage_logs(institution_id, task_type);

-- 4. Table: ai_conversations
-- Conversation threads for interactive sessions (Student Tutor, Owner Analytics, Parent Companion)
CREATE TABLE IF NOT EXISTS public.ai_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  task_type public.ai_task_type NOT NULL,
  title TEXT NOT NULL DEFAULT 'New Conversation',
  context_type TEXT, -- 'subject', 'class', 'student', 'general'
  context_id UUID,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_conv_inst_user ON public.ai_conversations(institution_id, user_id, updated_at DESC);

-- 5. Table: ai_messages
-- Messages within an AI conversation
CREATE TABLE IF NOT EXISTS public.ai_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.ai_conversations(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  sender_role public.ai_message_role NOT NULL,
  content TEXT NOT NULL,
  tokens_used INT DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_messages_conv_date ON public.ai_messages(conversation_id, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_ai_messages_inst ON public.ai_messages(institution_id);

-- 6. Table: ai_generated_drafts
-- High-stakes AI outputs requiring human review and authorization (Exams, Lesson Plans, Rubrics, Reports)
CREATE TABLE IF NOT EXISTS public.ai_generated_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_type public.ai_task_type NOT NULL,
  title TEXT NOT NULL,
  content_json JSONB NOT NULL,
  status public.ai_draft_status NOT NULL DEFAULT 'draft',
  reviewed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  rejection_reason TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_drafts_inst_task ON public.ai_generated_drafts(institution_id, task_type, status);
CREATE INDEX IF NOT EXISTS idx_ai_drafts_author ON public.ai_generated_drafts(institution_id, author_id, updated_at DESC);

-- 7. Functions & Stored Procedures

-- 7.1 Atomic Quota Check & Reservation with Row Locking
CREATE OR REPLACE FUNCTION public.check_and_reserve_ai_quota(
  p_institution_id UUID,
  p_estimated_tokens INT,
  p_task_type public.ai_task_type
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_quota RECORD;
  v_now TIMESTAMPTZ := now();
  v_new_tokens BIGINT;
  v_new_requests INT;
BEGIN
  -- Lock the institution quota record for concurrency safety
  SELECT * INTO v_quota
  FROM public.ai_institution_quotas
  WHERE institution_id = p_institution_id
  FOR UPDATE;

  -- If no quota record exists yet, auto-provision default quota
  IF NOT FOUND THEN
    INSERT INTO public.ai_institution_quotas (
      institution_id,
      monthly_token_budget,
      monthly_tokens_consumed,
      monthly_request_budget,
      monthly_requests_consumed,
      is_ai_enabled,
      reset_at
    ) VALUES (
      p_institution_id,
      1000000,
      0,
      5000,
      0,
      true,
      date_trunc('month', v_now) + interval '1 month'
    )
    RETURNING * INTO v_quota;
  END IF;

  -- 1. Check if AI is enabled for this institution
  IF NOT v_quota.is_ai_enabled THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'AI_DISABLED',
      'message', 'AI automation services are disabled for this institution.'
    );
  END IF;

  -- 2. Check if the requested task type is allowed
  IF NOT (p_task_type = ANY(v_quota.allowed_task_types)) THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'TASK_TYPE_DISALLOWED',
      'message', 'The requested AI task type is not permitted for this institution.'
    );
  END IF;

  -- 3. Automatic Monthly Reset Handling
  IF v_now >= v_quota.reset_at THEN
    v_quota.monthly_tokens_consumed := 0;
    v_quota.monthly_requests_consumed := 0;
    v_quota.reset_at := date_trunc('month', v_now) + interval '1 month';
  END IF;

  -- 4. Check Token Budget
  v_new_tokens := v_quota.monthly_tokens_consumed + GREATEST(p_estimated_tokens, 0);
  IF v_new_tokens > v_quota.monthly_token_budget THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'TOKEN_BUDGET_EXCEEDED',
      'message', 'Monthly AI token budget has been exhausted for this institution.',
      'monthly_token_budget', v_quota.monthly_token_budget,
      'monthly_tokens_consumed', v_quota.monthly_tokens_consumed
    );
  END IF;

  -- 5. Check Request Budget
  v_new_requests := v_quota.monthly_requests_consumed + 1;
  IF v_new_requests > v_quota.monthly_request_budget THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'REQUEST_BUDGET_EXCEEDED',
      'message', 'Monthly AI request limit has been reached for this institution.',
      'monthly_request_budget', v_quota.monthly_request_budget,
      'monthly_requests_consumed', v_quota.monthly_requests_consumed
    );
  END IF;

  -- 6. Atomically reserve estimated tokens & request
  UPDATE public.ai_institution_quotas
  SET
    monthly_tokens_consumed = v_new_tokens,
    monthly_requests_consumed = v_new_requests,
    reset_at = v_quota.reset_at,
    updated_at = v_now
  WHERE institution_id = p_institution_id;

  RETURN jsonb_build_object(
    'allowed', true,
    'monthly_tokens_remaining', (v_quota.monthly_token_budget - v_new_tokens),
    'monthly_requests_remaining', (v_quota.monthly_request_budget - v_new_requests),
    'reset_at', v_quota.reset_at
  );
END;
$$;

-- 7.2 Usage Logging and Token Reconciliation
CREATE OR REPLACE FUNCTION public.record_ai_usage(
  p_institution_id UUID,
  p_user_id UUID,
  p_role TEXT,
  p_task_type public.ai_task_type,
  p_provider public.ai_provider_type,
  p_model_name TEXT,
  p_prompt_tokens INT,
  p_completion_tokens INT,
  p_latency_ms INT,
  p_status TEXT DEFAULT 'success',
  p_error_message TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_estimated_tokens_reserved INT DEFAULT 0
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_total_tokens INT := GREATEST(p_prompt_tokens, 0) + GREATEST(p_completion_tokens, 0);
  v_log_id UUID;
  v_token_delta INT;
BEGIN
  -- 1. Insert detailed usage log entry
  INSERT INTO public.ai_usage_logs (
    institution_id,
    user_id,
    role,
    task_type,
    provider,
    model_name,
    prompt_tokens,
    completion_tokens,
    total_tokens,
    latency_ms,
    status,
    error_message,
    metadata
  ) VALUES (
    p_institution_id,
    p_user_id,
    p_role,
    p_task_type,
    p_provider,
    p_model_name,
    p_prompt_tokens,
    p_completion_tokens,
    v_total_tokens,
    p_latency_ms,
    p_status,
    p_error_message,
    p_metadata
  ) RETURNING id INTO v_log_id;

  -- 2. Reconcile quota consumed vs estimated reservation
  IF p_estimated_tokens_reserved > 0 THEN
    v_token_delta := v_total_tokens - p_estimated_tokens_reserved;
    IF v_token_delta != 0 THEN
      UPDATE public.ai_institution_quotas
      SET monthly_tokens_consumed = GREATEST(0, monthly_tokens_consumed + v_token_delta),
          updated_at = now()
      WHERE institution_id = p_institution_id;
    END IF;
  END IF;

  RETURN v_log_id;
END;
$$;

-- 8. Auto-provision quotas for all existing institutions
INSERT INTO public.ai_institution_quotas (institution_id)
SELECT id FROM public.institutions
ON CONFLICT (institution_id) DO NOTHING;

-- 9. Trigger to auto-provision AI quota when new institution is inserted
CREATE OR REPLACE FUNCTION public.handle_new_institution_ai_quota()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.ai_institution_quotas (institution_id)
  VALUES (NEW.id)
  ON CONFLICT (institution_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_new_institution_ai_quota ON public.institutions;
CREATE TRIGGER trg_new_institution_ai_quota
  AFTER INSERT ON public.institutions
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_institution_ai_quota();

-- 10. Enable Row Level Security on all 5 tables
ALTER TABLE public.ai_institution_quotas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_generated_drafts ENABLE ROW LEVEL SECURITY;

-- 11. Define RLS Policies

-- 11.1 ai_institution_quotas
CREATE POLICY "AI quotas viewable by institution owners and admins"
  ON public.ai_institution_quotas
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_institution_quotas.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

-- 11.2 ai_usage_logs
CREATE POLICY "AI usage logs viewable by owners and admins"
  ON public.ai_usage_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_usage_logs.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin')
    )
  );

CREATE POLICY "Users can view their own AI usage logs"
  ON public.ai_usage_logs
  FOR SELECT
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_usage_logs.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- 11.3 ai_conversations
CREATE POLICY "Users can view and manage their own AI conversations"
  ON public.ai_conversations
  FOR ALL
  USING (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_conversations.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_conversations.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
    )
  );

-- 11.4 ai_messages
CREATE POLICY "Users can view and create messages in their conversations"
  ON public.ai_messages
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.ai_conversations c
      WHERE c.id = ai_messages.conversation_id
        AND c.user_id = auth.uid()
    )
  );

-- 11.5 ai_generated_drafts
-- Staff/Faculty/Admin/Owner can view drafts in their institution
CREATE POLICY "Staff and admins can view institution drafts"
  ON public.ai_generated_drafts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_generated_drafts.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff')
    )
  );

-- Staff can create drafts
CREATE POLICY "Staff can insert drafts"
  ON public.ai_generated_drafts
  FOR INSERT
  WITH CHECK (
    author_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_generated_drafts.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND m.role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff')
    )
  );

-- Author can update their own drafts while in draft status; Admins can update status/review
CREATE POLICY "Staff can update drafts"
  ON public.ai_generated_drafts
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.institution_memberships m
      WHERE m.institution_id = ai_generated_drafts.institution_id
        AND m.user_id = auth.uid()
        AND m.status = 'active'
        AND (
          (m.role IN ('owner', 'admin', 'academic_admin', 'department_head'))
          OR (ai_generated_drafts.author_id = auth.uid() AND ai_generated_drafts.status = 'draft')
        )
    )
  );

-- 12. Security Grants & Access Boundaries
REVOKE ALL ON public.ai_institution_quotas FROM anon, authenticated;
REVOKE ALL ON public.ai_usage_logs FROM anon, authenticated;
REVOKE ALL ON public.ai_conversations FROM anon, authenticated;
REVOKE ALL ON public.ai_messages FROM anon, authenticated;
REVOKE ALL ON public.ai_generated_drafts FROM anon, authenticated;

GRANT SELECT ON public.ai_institution_quotas TO authenticated;
GRANT SELECT ON public.ai_usage_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_conversations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ai_generated_drafts TO authenticated;

GRANT EXECUTE ON FUNCTION public.check_and_reserve_ai_quota TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_ai_usage TO authenticated;
