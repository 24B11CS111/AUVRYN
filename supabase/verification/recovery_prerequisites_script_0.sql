-- ==============================================================================
-- Education Management Platform — Production Migration Recovery Step 0
-- File: recovery_prerequisites_script_0.sql
-- Target Database: Supabase Production (dhgdjpjgsvbknquetecl)
--
-- PURPOSE:
-- Executes and commits enum prerequisites in an independent transaction.
-- Resolves PostgreSQL Error 55P04 ("unsafe use of new enum value in transaction")
-- by ensuring all enum values exist in the pg_catalog before subsequent
-- migration DDL statements reference them.
--
-- IDEMPOTENT: Safe to run repeatedly or if values already exist.
-- ==============================================================================

-- 1. Safely add missing roles to membership_role
ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'hr_administrator';
ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'department_head';

-- 2. Safely create or extend notification_delivery_status with all required states
DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM (
    'pending',
    'queued',
    'sending',
    'processing',
    'sent',
    'delivered',
    'failed',
    'cancelled',
    'dead_letter'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'pending';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'queued';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'sending';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'processing';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'sent';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'delivered';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'failed';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'cancelled';
ALTER TYPE notification_delivery_status ADD VALUE IF NOT EXISTS 'dead_letter';

-- Verification query
SELECT
  t.typname AS enum_name,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('membership_role', 'notification_delivery_status')
ORDER BY t.typname, e.enumsortorder;
