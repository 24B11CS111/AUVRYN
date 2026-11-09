-- ==============================================================================
-- Migration: 20261109122000_notification_outbox_worker.sql
-- Description: REM-HIGH-03 Notification Outbox Dispatch & Worker Infrastructure
-- Implements atomic job claiming (FOR UPDATE SKIP LOCKED), worker lock recovery,
-- exponential backoff retry scheduling, dead-letter state tracking, delivery
-- audit logging (without PII leakage), and operational visibility views.
-- ==============================================================================

-- 1. Ensure Enums
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_channel') THEN
    CREATE TYPE notification_channel AS ENUM ('in_app', 'push', 'email', 'sms', 'whatsapp');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_category') THEN
    CREATE TYPE notification_category AS ENUM (
      'academic', 'attendance', 'fees', 'examinations', 'transport', 'announcements', 'emergency', 'general'
    );
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_priority') THEN
    CREATE TYPE notification_priority AS ENUM ('low', 'normal', 'high', 'urgent');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_delivery_status') THEN
    CREATE TYPE notification_delivery_status AS ENUM (
      'pending', 'queued', 'sending', 'processing', 'sent', 'delivered', 'failed', 'dead_letter', 'cancelled'
    );
  ELSE
    ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'processing';
    ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'sent';
    ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'dead_letter';
  END IF;
END $$;

-- 2. Ensure Core Notification Tables Exist (Idempotent for local/test Postgres)
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  category notification_category NOT NULL DEFAULT 'general',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  priority notification_priority NOT NULL DEFAULT 'normal',
  data JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS public.notification_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  notification_id UUID NOT NULL REFERENCES public.notifications(id) ON DELETE CASCADE,
  channel notification_channel NOT NULL DEFAULT 'in_app',
  destination TEXT,
  status notification_delivery_status NOT NULL DEFAULT 'pending',
  attempts_count INT NOT NULL DEFAULT 0,
  max_attempts INT NOT NULL DEFAULT 3,
  last_attempt_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  error_message TEXT,
  idempotency_key TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_notification_delivery_idempotency UNIQUE (institution_id, idempotency_key)
);

-- 3. Add Worker State & Backoff Columns to notification_deliveries
ALTER TABLE public.notification_deliveries
  ADD COLUMN IF NOT EXISTS next_retry_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by TEXT,
  ADD COLUMN IF NOT EXISTS provider_message_id TEXT,
  ADD COLUMN IF NOT EXISTS provider_response JSONB DEFAULT '{}'::jsonb;

-- 4. Create Delivery Audit Logs Table (Strictly audited without exposing message bodies)
CREATE TABLE IF NOT EXISTS public.notification_delivery_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  delivery_id UUID NOT NULL REFERENCES public.notification_deliveries(id) ON DELETE CASCADE,
  attempt_number INT NOT NULL,
  channel notification_channel NOT NULL,
  provider TEXT NOT NULL,
  status TEXT NOT NULL,
  error_code TEXT,
  error_message TEXT,
  latency_ms INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 5. Performance Indexes for Outbox Worker Claiming and Metrics
CREATE INDEX IF NOT EXISTS idx_notif_deliveries_claim
  ON public.notification_deliveries(status, next_retry_at, locked_at)
  WHERE status IN ('queued', 'pending', 'processing', 'failed');

CREATE INDEX IF NOT EXISTS idx_notif_deliveries_inst_status
  ON public.notification_deliveries(institution_id, status);

CREATE INDEX IF NOT EXISTS idx_notif_delivery_logs_delivery
  ON public.notification_delivery_logs(delivery_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notif_delivery_logs_inst
  ON public.notification_delivery_logs(institution_id, created_at DESC);

-- 6. Atomic Stored Procedure: Claim Notification Deliveries
-- Claims batch of ready items with FOR UPDATE SKIP LOCKED and recovers timed out locks
DROP FUNCTION IF EXISTS public.claim_notification_deliveries(INT, TEXT, INTERVAL);
CREATE OR REPLACE FUNCTION public.claim_notification_deliveries(
  p_batch_size INT DEFAULT 10,
  p_worker_id TEXT DEFAULT 'worker-default',
  p_lock_timeout INTERVAL DEFAULT '5 minutes'::interval
)
RETURNS TABLE (
  out_delivery_id UUID,
  out_institution_id UUID,
  out_notification_id UUID,
  out_channel notification_channel,
  out_destination TEXT,
  out_status notification_delivery_status,
  out_attempts_count INT,
  out_max_attempts INT,
  out_idempotency_key TEXT,
  out_recipient_user_id UUID,
  out_recipient_email TEXT,
  out_recipient_phone TEXT,
  out_title TEXT,
  out_body TEXT,
  out_category notification_category,
  out_priority notification_priority,
  out_notification_data JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
BEGIN
  -- 1. Reclaim stale locks from interrupted or crashed workers
  UPDATE public.notification_deliveries nd
  SET status = 'queued',
      locked_at = NULL,
      locked_by = NULL,
      updated_at = timezone('utc', now())
  WHERE nd.status = 'processing'
    AND nd.locked_at < (timezone('utc', now()) - p_lock_timeout);

  -- 2. Atomically claim batch of ready jobs using FOR UPDATE SKIP LOCKED
  RETURN QUERY
  WITH candidates AS (
    SELECT d.id
    FROM public.notification_deliveries d
    WHERE (
      (d.status IN ('queued', 'pending') AND (d.locked_at IS NULL OR d.locked_at < (timezone('utc', now()) - p_lock_timeout)))
      OR
      (d.status = 'failed' AND d.attempts_count < d.max_attempts AND (d.next_retry_at IS NULL OR d.next_retry_at <= timezone('utc', now())))
    )
    ORDER BY d.created_at ASC
    LIMIT p_batch_size
    FOR UPDATE SKIP LOCKED
  ),
  claimed AS (
    UPDATE public.notification_deliveries d
    SET status = 'processing',
        locked_at = timezone('utc', now()),
        locked_by = p_worker_id,
        attempts_count = d.attempts_count + 1,
        last_attempt_at = timezone('utc', now()),
        updated_at = timezone('utc', now())
    FROM candidates c
    WHERE d.id = c.id
    RETURNING d.*
  )
  SELECT
    cl.id AS out_delivery_id,
    cl.institution_id AS out_institution_id,
    cl.notification_id AS out_notification_id,
    cl.channel AS out_channel,
    cl.destination AS out_destination,
    cl.status AS out_status,
    cl.attempts_count AS out_attempts_count,
    cl.max_attempts AS out_max_attempts,
    cl.idempotency_key AS out_idempotency_key,
    n.recipient_user_id AS out_recipient_user_id,
    p.email AS out_recipient_email,
    p.phone AS out_recipient_phone,
    n.title AS out_title,
    n.body AS out_body,
    n.category AS out_category,
    n.priority AS out_priority,
    n.data AS out_notification_data
  FROM claimed cl
  JOIN public.notifications n ON n.id = cl.notification_id
  LEFT JOIN public.profiles p ON p.id = n.recipient_user_id;
END;
$$;

-- 7. Atomic Stored Procedure: Resolve Notification Delivery
-- Records delivery success, transient failure with exponential backoff, or dead-letter state
CREATE OR REPLACE FUNCTION public.resolve_notification_delivery(
  p_delivery_id UUID,
  p_status TEXT,
  p_provider TEXT,
  p_provider_message_id TEXT DEFAULT NULL,
  p_provider_response JSONB DEFAULT '{}'::jsonb,
  p_error_code TEXT DEFAULT NULL,
  p_error_message TEXT DEFAULT NULL,
  p_is_permanent_failure BOOLEAN DEFAULT false,
  p_latency_ms INT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_delivery RECORD;
  v_new_status notification_delivery_status;
  v_next_retry TIMESTAMPTZ := NULL;
BEGIN
  SELECT * INTO v_delivery
  FROM public.notification_deliveries
  WHERE id = p_delivery_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery record not found');
  END IF;

  IF p_status IN ('delivered', 'sent') THEN
    v_new_status := 'delivered';
    UPDATE public.notification_deliveries
    SET status = v_new_status,
        delivered_at = timezone('utc', now()),
        locked_at = NULL,
        locked_by = NULL,
        next_retry_at = NULL,
        provider_message_id = COALESCE(p_provider_message_id, provider_message_id),
        provider_response = COALESCE(p_provider_response, '{}'::jsonb),
        error_message = NULL,
        updated_at = timezone('utc', now())
    WHERE id = p_delivery_id;
  ELSE
    -- Check if permanent failure or attempts limit reached
    IF p_is_permanent_failure OR v_delivery.attempts_count >= v_delivery.max_attempts THEN
      v_new_status := 'dead_letter';
      v_next_retry := NULL;
    ELSE
      v_new_status := 'failed';
      -- Exponential backoff: base 30s * 2^(attempts_count - 1), capped at 3600 seconds
      v_next_retry := timezone('utc', now()) + LEAST(
        INTERVAL '3600 seconds',
        (POWER(2, GREATEST(0, v_delivery.attempts_count - 1)) * INTERVAL '30 seconds')
      );
    END IF;

    UPDATE public.notification_deliveries
    SET status = v_new_status,
        locked_at = NULL,
        locked_by = NULL,
        next_retry_at = v_next_retry,
        error_message = p_error_message,
        provider_response = COALESCE(p_provider_response, '{}'::jsonb),
        updated_at = timezone('utc', now())
    WHERE id = p_delivery_id;
  END IF;

  -- Insert non-PII audit record
  INSERT INTO public.notification_delivery_logs (
    institution_id,
    delivery_id,
    attempt_number,
    channel,
    provider,
    status,
    error_code,
    error_message,
    latency_ms
  ) VALUES (
    v_delivery.institution_id,
    p_delivery_id,
    v_delivery.attempts_count,
    v_delivery.channel,
    p_provider,
    v_new_status::text,
    p_error_code,
    p_error_message,
    p_latency_ms
  );

  RETURN jsonb_build_object(
    'success', true,
    'delivery_id', p_delivery_id,
    'status', v_new_status::text,
    'attempts_count', v_delivery.attempts_count,
    'next_retry_at', v_next_retry
  );
END;
$$;

-- 8. Stored Procedure: Requeue Dead-Letter Delivery
CREATE OR REPLACE FUNCTION public.requeue_dead_letter_delivery(
  p_delivery_id UUID,
  p_institution_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_delivery RECORD;
BEGIN
  SELECT * INTO v_delivery
  FROM public.notification_deliveries
  WHERE id = p_delivery_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found in specified institution');
  END IF;

  UPDATE public.notification_deliveries
  SET status = 'queued',
      attempts_count = 0,
      next_retry_at = timezone('utc', now()),
      error_message = NULL,
      locked_at = NULL,
      locked_by = NULL,
      updated_at = timezone('utc', now())
  WHERE id = p_delivery_id;

  INSERT INTO public.notification_delivery_logs (
    institution_id,
    delivery_id,
    attempt_number,
    channel,
    provider,
    status,
    error_code,
    error_message,
    latency_ms
  ) VALUES (
    p_institution_id,
    p_delivery_id,
    0,
    v_delivery.channel,
    'manual_admin',
    'requeued',
    NULL,
    'Manually requeued by administrator from dead-letter queue',
    0
  );

  RETURN jsonb_build_object('success', true, 'delivery_id', p_delivery_id);
END;
$$;

-- 9. Operational Outbox Metrics View
CREATE OR REPLACE VIEW public.notification_outbox_metrics AS
SELECT
  institution_id,
  COUNT(*) FILTER (WHERE status = 'queued') AS count_queued,
  COUNT(*) FILTER (WHERE status = 'pending') AS count_pending,
  COUNT(*) FILTER (WHERE status = 'processing') AS count_processing,
  COUNT(*) FILTER (WHERE status = 'delivered') AS count_delivered,
  COUNT(*) FILTER (WHERE status = 'failed') AS count_failed,
  COUNT(*) FILTER (WHERE status = 'dead_letter') AS count_dead_letter,
  MIN(created_at) FILTER (WHERE status IN ('queued', 'pending')) AS oldest_pending_job_at,
  COUNT(*) AS total_deliveries
FROM public.notification_deliveries
GROUP BY institution_id;

-- 10. Security Grants & RLS
ALTER TABLE public.notification_delivery_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notification_delivery_logs_select" ON public.notification_delivery_logs;
CREATE POLICY "notification_delivery_logs_select" ON public.notification_delivery_logs
  FOR SELECT TO authenticated
  USING (
    public.has_institution_role(
      institution_id,
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'academic_admin'::membership_role,
        'department_head'::membership_role
      ]
    )
  );

GRANT SELECT ON public.notification_delivery_logs TO authenticated;
GRANT SELECT ON public.notification_outbox_metrics TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) TO authenticated;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) TO service_role;
    GRANT EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) TO service_role;
    GRANT EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) TO service_role;
  END IF;
END $$;
