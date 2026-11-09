-- ==============================================================================
-- Rollback Migration: 20261109122000_rollback.sql
-- Description: Revert notification outbox worker procedures, views, and logs
-- ==============================================================================

-- 1. Drop Stored Procedures and Views
DROP VIEW IF EXISTS public.notification_outbox_metrics;
DROP FUNCTION IF EXISTS public.requeue_dead_letter_delivery(UUID, UUID);
DROP FUNCTION IF EXISTS public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT);
DROP FUNCTION IF EXISTS public.claim_notification_deliveries(INT, TEXT, INTERVAL);

-- 2. Drop Audit Logs Table
DROP TABLE IF EXISTS public.notification_delivery_logs;

-- 3. Drop Indexes
DROP INDEX IF EXISTS idx_notif_deliveries_claim;
DROP INDEX IF EXISTS idx_notif_deliveries_inst_status;

-- 4. Drop Worker Columns from notification_deliveries
ALTER TABLE public.notification_deliveries
  DROP COLUMN IF EXISTS next_retry_at,
  DROP COLUMN IF EXISTS locked_at,
  DROP COLUMN IF EXISTS locked_by,
  DROP COLUMN IF EXISTS provider_message_id,
  DROP COLUMN IF EXISTS provider_response;
