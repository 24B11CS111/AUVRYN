-- Migration: 20261109123000_harden_notification_worker_rpc_grants.sql
-- Description: Restrict worker RPC execution strictly to service_role and enforce administrator authorization on dead-letter requeueing
-- Phase: 2.4 Security Follow-Up

-- 1. Hardened Dead-Letter Requeueing Function: Enforces institutional administrator check
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
  -- Defense-in-depth: If invoked under an authenticated session, ensure user is an administrator of the institution
  IF auth.role() = 'authenticated' THEN
    IF NOT public.has_institution_role(
      p_institution_id,
      ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role]
    ) THEN
      RETURN jsonb_build_object('success', false, 'error', 'Unauthorized: Caller does not possess an administrative role in this institution');
    END IF;
  END IF;

  SELECT * INTO v_delivery
  FROM public.notification_deliveries
  WHERE id = p_delivery_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Delivery not found in specified institution');
  END IF;

  IF v_delivery.status != 'dead_letter' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only dead_letter deliveries can be manually requeued');
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

-- 2. Revoke execute privileges on worker RPCs from PUBLIC, anon, and authenticated
REVOKE EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) FROM PUBLIC, anon, authenticated;

-- 3. Explicitly Grant EXECUTE strictly to service_role
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) TO service_role;
    GRANT EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) TO service_role;
    GRANT EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) TO service_role;
  END IF;
END $$;
