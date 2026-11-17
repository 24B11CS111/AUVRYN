-- ==============================================================================
-- Migration History Synchronization Script for Supabase CLI Compatibility
-- Target Database: Supabase Production (dhgdjpjgsvbknquetecl)
-- 
-- IMPORTANT:
-- Run this script in the Supabase SQL Editor ONLY AFTER all 16 migrations
-- have been successfully applied and verified via post_migration_verification.sql.
--
-- SAFEGUARD: This script performs an automated preflight count assertion.
-- If fewer than 114 base tables exist in the public schema, it immediately
-- raises an exception and aborts without inserting any history records.
-- ==============================================================================

DO $$
DECLARE
  v_table_count INT;
BEGIN
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

  IF v_table_count < 114 THEN
    RAISE EXCEPTION 'SAFETY ABORT: Cannot synchronize migration history. Only % of 114 expected base tables exist in public schema. Apply remaining migrations first.', v_table_count;
  END IF;

  RAISE NOTICE 'Preflight assertion verified: % base tables present in public schema. Proceeding with history synchronization...', v_table_count;
END $$;

CREATE SCHEMA IF NOT EXISTS supabase_migrations;

CREATE TABLE IF NOT EXISTS supabase_migrations.schema_migrations (
    version text PRIMARY KEY,
    statements text[],
    name text
);

INSERT INTO supabase_migrations.schema_migrations (version, name)
VALUES
  ('20261105000000', 'initial_schema'),
  ('20261105010000', 'academic_hierarchy'),
  ('20261105020000', 'student_admissions'),
  ('20261105030000', 'staff_faculty'),
  ('20261105040000', 'attendance_management'),
  ('20261105050000', 'timetable_scheduling'),
  ('20261105060000', 'examination_results'),
  ('20261105070000', 'fees_payments'),
  ('20261105080000', 'parent_student_communications'),
  ('20261106090000', 'transport_management'),
  ('20261108090000', 'library_hostel_events'),
  ('20261109120000', 'fix_attendance_rls_functions'),
  ('20261109121000', 'storage_security_policies'),
  ('20261109122000', 'notification_outbox_worker'),
  ('20261109123000', 'harden_notification_worker_rpc_grants'),
  ('20261110090000', 'harden_transport_gps_authorization')
ON CONFLICT (version) DO UPDATE SET name = EXCLUDED.name;

-- Verify migration history records
SELECT version, name FROM supabase_migrations.schema_migrations ORDER BY version;
