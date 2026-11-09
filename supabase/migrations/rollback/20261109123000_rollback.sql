-- Rollback for Migration: 20261109123000_harden_notification_worker_rpc_grants.sql

-- Re-grant execute privileges to authenticated for backward compatibility
GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) TO authenticated;
