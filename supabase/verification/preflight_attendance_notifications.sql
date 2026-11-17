-- ==============================================================================
-- AUVRYN — Production Pre-Migration Preflight Verification Script
-- Target Database: Supabase Production (dhgdjpjgsvbknquetecl)
--
-- STRICT READ-ONLY GUARANTEE:
-- Contains exclusively SELECT statements querying information_schema, pg_catalog,
-- and public tables. Zero DDL, zero DML, zero permission mutations.
-- Safe to execute against production.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- CHECK 1: Prerequisite Tables & Row Level Security (RLS) Status
-- Verifies presence of all 11 prerequisite tables and confirms RLS is enabled.
-- Reports missing tables separately from disabled RLS.
-- ------------------------------------------------------------------------------
WITH required_tables AS (
  SELECT unnest(ARRAY[
    'attendance_sessions',
    'student_attendance_records',
    'attendance_corrections',
    'notifications',
    'notification_deliveries',
    'push_device_tokens',
    'notification_preferences',
    'students',
    'guardians',
    'student_guardians',
    'institution_memberships'
  ]) AS table_name
)
SELECT 
  'CHECK_1_TABLES_AND_RLS' AS check_id,
  r.table_name,
  CASE 
    WHEN t.table_name IS NOT NULL THEN 'PASS: Exists in public schema' 
    ELSE 'FAIL: TABLE MISSING' 
  END AS table_presence,
  CASE 
    WHEN t.table_name IS NULL THEN 'N/A: Table missing'
    WHEN pgt.rowsecurity IS TRUE THEN 'PASS: RLS Enabled' 
    ELSE 'FAIL: RLS DISABLED' 
  END AS rls_status,
  CASE 
    WHEN t.table_name IS NULL THEN 'FAIL: Missing table'
    WHEN pgt.rowsecurity IS NOT TRUE THEN 'FAIL: RLS disabled'
    ELSE 'PASS'
  END AS overall_status
FROM required_tables r
LEFT JOIN information_schema.tables t 
  ON t.table_schema = 'public' 
 AND t.table_type = 'BASE TABLE'
 AND t.table_name = r.table_name
LEFT JOIN pg_tables pgt 
  ON pgt.schemaname = 'public' 
 AND pgt.tablename = r.table_name
ORDER BY r.table_name;

-- ------------------------------------------------------------------------------
-- CHECK 2: Prerequisite Custom Enum Types (Public Schema Specific)
-- Confirms existence of all 6 domain enums strictly in the public schema,
-- preventing false positives from identically named types in other schemas.
-- ------------------------------------------------------------------------------
WITH required_types AS (
  SELECT unnest(ARRAY[
    'attendance_status',
    'membership_role',
    'notification_channel',
    'notification_delivery_status',
    'notification_priority',
    'notification_category'
  ]) AS type_name
)
SELECT 
  'CHECK_2_ENUM_TYPES' AS check_id,
  r.type_name,
  CASE 
    WHEN typ.typname IS NOT NULL THEN 'PASS: Valid enum in public schema' 
    ELSE 'FAIL: MISSING ENUM IN PUBLIC SCHEMA' 
  END AS status,
  COALESCE(
    (SELECT string_agg(enumlabel, ', ' ORDER BY enumsortorder)
     FROM pg_enum 
     WHERE enumtypid = typ.oid),
    'N/A'
  ) AS enum_labels
FROM required_types r
LEFT JOIN pg_type typ 
  ON typ.typname = r.type_name
 AND typ.typnamespace = 'public'::regnamespace
 AND typ.typtype = 'e'
ORDER BY r.type_name;

-- ------------------------------------------------------------------------------
-- CHECK 3: Attendance RPC Signatures, Positional Argument Order & Overload Audit
-- Inspects actual positional signatures in pg_proc, comparing baseline/staged
-- migration definitions against alphabetical schema representations.
-- Flags missing functions, signature mismatches, and duplicate overload risks.
-- ------------------------------------------------------------------------------
WITH target_attendance_routines AS (
  SELECT unnest(ARRAY[
    'record_student_attendance_batch',
    'correct_student_attendance_record'
  ]) AS func_name
),
proc_matches AS (
  SELECT 
    p.oid,
    p.proname,
    oidvectortypes(p.proargtypes) AS actual_arg_types,
    pg_get_function_arguments(p.oid) AS actual_arguments,
    pg_get_function_identity_arguments(p.oid) AS actual_identity_args,
    pg_get_function_result(p.oid) AS actual_return,
    p.prosecdef,
    count(*) OVER (PARTITION BY p.proname) AS overload_count
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN ('record_student_attendance_batch', 'correct_student_attendance_record')
)
SELECT 
  'CHECK_3_ATTENDANCE_RPCS' AS check_id,
  tar.func_name,
  COALESCE(pm.actual_identity_args, 'N/A: Function missing') AS actual_identity_arguments,
  COALESCE(pm.actual_arg_types, 'N/A: Function missing') AS actual_argument_types,
  COALESCE(pm.actual_arguments, 'N/A: Function missing') AS actual_full_arguments,
  COALESCE(pm.actual_return, 'N/A') AS actual_return_type,
  CASE 
    WHEN pm.oid IS NULL THEN 'N/A'
    WHEN pm.prosecdef THEN 'SECURITY DEFINER (PASS)'
    ELSE 'SECURITY INVOKER (FAIL)'
  END AS security_mode,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: FUNCTION MISSING IN PUBLIC SCHEMA'
    WHEN pm.overload_count > 1 THEN 'FAIL: MULTIPLE OVERLOADS DETECTED (PostgREST conflict risk)'
    -- Case A: Matches staged migration positional order (original DDL)
    WHEN tar.func_name = 'record_student_attendance_batch' 
      AND (pm.actual_arg_types = 'uuid, uuid, jsonb, uuid' OR pm.actual_identity_args = 'uuid, uuid, jsonb, uuid') THEN 
      'PASS: Positional arguments match staged migration (p_institution_id, p_session_id, p_records, p_user_id)'
    WHEN tar.func_name = 'correct_student_attendance_record' 
      AND (pm.actual_arg_types = 'uuid, uuid, attendance_status, text, uuid' OR pm.actual_identity_args = 'uuid, uuid, attendance_status, text, uuid') THEN 
      'PASS: Positional arguments match staged migration (p_institution_id, p_record_id, p_new_status, p_reason, p_user_id)'
    -- Case B: Production has alphabetical positional argument order
    WHEN tar.func_name = 'record_student_attendance_batch' 
      AND (pm.actual_arg_types = 'uuid, jsonb, uuid, uuid' OR pm.actual_identity_args = 'uuid, jsonb, uuid, uuid') THEN 
      'OVERLOAD RISK: Production has alphabetical signature (uuid, jsonb, uuid, uuid). Staged migration uses (uuid, uuid, jsonb, uuid).'
    WHEN tar.func_name = 'correct_student_attendance_record' 
      AND (pm.actual_arg_types = 'uuid, attendance_status, text, uuid, uuid' OR pm.actual_identity_args = 'uuid, attendance_status, text, uuid, uuid') THEN 
      'OVERLOAD RISK: Production has alphabetical signature (uuid, attendance_status, text, uuid, uuid). Staged migration uses (uuid, uuid, attendance_status, text, uuid).'
    ELSE 'FAIL: UNEXPECTED SIGNATURE (' || COALESCE(pm.actual_arg_types, pm.actual_identity_args) || ')'
  END AS signature_status
FROM target_attendance_routines tar
LEFT JOIN proc_matches pm ON pm.proname = tar.func_name
ORDER BY tar.func_name;

-- ------------------------------------------------------------------------------
-- CHECK 4: Outbox Worker & Authorization RPC Signatures & Overload Audit
-- Strictly verifies claim_notification_deliveries, resolve_notification_delivery,
-- and both legitimate overloads of has_institution_role (enum[] and text[])
-- in the public schema without prefix matching or permissive LIKE.
-- Explicitly validates return structure of claim_notification_deliveries (17 typed columns)
-- and detects untyped SETOF record as UNKNOWN / MANUAL REVIEW REQUIRED.
-- ------------------------------------------------------------------------------
WITH target_outbox_routines AS (
  SELECT * FROM (VALUES
    ('claim_notification_deliveries', 
     'integer, text, interval', 
     'TABLE(out_delivery_id uuid, out_institution_id uuid, out_notification_id uuid, out_channel notification_channel, out_destination text, out_status notification_delivery_status, out_attempts_count integer, out_max_attempts integer, out_idempotency_key text, out_recipient_user_id uuid, out_recipient_email text, out_recipient_phone text, out_title text, out_body text, out_category notification_category, out_priority notification_priority, out_notification_data jsonb)', 
     true),
    ('resolve_notification_delivery', 
     'uuid, text, text, text, jsonb, text, text, boolean, integer', 
     'jsonb', 
     true),
    ('has_institution_role', 
     'uuid, membership_role[]', 
     'boolean', 
     true),
    ('has_institution_role', 
     'uuid, text[]', 
     'boolean', 
     true)
  ) AS t(func_name, expected_arg_types, expected_return_type, must_be_secdef)
),
proc_matches AS (
  SELECT 
    p.oid,
    p.proname,
    oidvectortypes(p.proargtypes) AS actual_arg_types,
    pg_get_function_arguments(p.oid) AS actual_arguments,
    pg_get_function_identity_arguments(p.oid) AS actual_identity_args,
    pg_get_function_result(p.oid) AS actual_return,
    p.prosecdef,
    count(*) OVER (PARTITION BY p.proname) AS overload_count
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN ('claim_notification_deliveries', 'resolve_notification_delivery', 'has_institution_role')
)
SELECT 
  'CHECK_4_OUTBOX_RPCS' AS check_id,
  tor.func_name,
  tor.expected_arg_types,
  COALESCE(pm.actual_identity_args, 'N/A: Function missing') AS actual_identity_arguments,
  COALESCE(pm.actual_arg_types, 'N/A: Function missing') AS actual_argument_types,
  COALESCE(pm.actual_return, 'N/A') AS actual_return_type,
  CASE 
    WHEN pm.oid IS NULL THEN 'N/A'
    WHEN pm.prosecdef THEN 'SECURITY DEFINER (PASS)'
    ELSE 'SECURITY INVOKER (FAIL)'
  END AS security_mode,
  COALESCE(pm.overload_count, 0) AS overload_count,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: FUNCTION MISSING IN PUBLIC SCHEMA'
    WHEN tor.func_name = 'has_institution_role' AND pm.overload_count > 2 
      THEN 'FAIL: UNEXPECTED OVERLOAD DETECTED (' || pm.overload_count || ' routines found, max 2 expected)'
    WHEN tor.func_name != 'has_institution_role' AND pm.overload_count > 1 
      THEN 'FAIL: UNEXPECTED OVERLOAD DETECTED (' || pm.overload_count || ' routines found)'
    WHEN pm.actual_arg_types != tor.expected_arg_types THEN 'FAIL: ARGUMENT TYPE MISMATCH (expected: ' || tor.expected_arg_types || ', actual: ' || pm.actual_arg_types || ')'
    WHEN tor.must_be_secdef AND NOT pm.prosecdef THEN 'FAIL: NOT SECURITY DEFINER'
    WHEN tor.func_name = 'claim_notification_deliveries' THEN
      CASE 
        WHEN pm.actual_return = tor.expected_return_type THEN 'PASS: Outbox routine signature, return table (17 columns), and security mode verified'
        WHEN pm.actual_return = 'SETOF record' THEN 'UNKNOWN: Returns untyped SETOF record (MANUAL REVIEW REQUIRED - cannot verify return columns)'
        ELSE 'FAIL: RETURN TYPE MISMATCH (expected: ' || tor.expected_return_type || ', actual: ' || pm.actual_return || ')'
      END
    WHEN pm.actual_return != tor.expected_return_type THEN 'FAIL: RETURN TYPE MISMATCH (expected: ' || tor.expected_return_type || ', actual: ' || pm.actual_return || ')'
    ELSE 'PASS: Outbox/role routine signature and security mode verified'
  END AS verification_status
FROM target_outbox_routines tor
LEFT JOIN proc_matches pm 
  ON pm.proname = tor.func_name
 AND pm.actual_arg_types = tor.expected_arg_types
ORDER BY tor.func_name, tor.expected_arg_types;

-- ------------------------------------------------------------------------------
-- CHECK 5: Permissions & Grants Audit (Factoring in PUBLIC Pseudo-Role & ACLs)
-- Explicitly checks service_role, authenticated, anon, and public privileges against
-- intended policies for each routine using pg_proc.proacl and aclexplode().
-- Correctly interprets grantee OID 0 as PUBLIC and handles NULL proacl (default ACL).
-- Differentiates satisfied production conditions from hardening pending in migration 20261115000000.
-- ------------------------------------------------------------------------------
WITH function_permission_rules AS (
  SELECT * FROM (VALUES
    ('claim_notification_deliveries', 'integer, text, interval', true, false, false, false, 1),
    ('resolve_notification_delivery', 'uuid, text, text, text, jsonb, text, text, boolean, integer', true, false, false, false, 1),
    ('record_student_attendance_batch', 'uuid, uuid, jsonb, uuid', true, true, false, false, 1),
    ('correct_student_attendance_record', 'uuid, uuid, attendance_status, text, uuid', true, true, false, false, 1),
    ('has_institution_role', 'uuid, membership_role[]', true, true, false, true, 2),
    ('has_institution_role', 'uuid, text[]', true, true, false, true, 2)
  ) AS t(func_name, expected_arg_types, req_service_role, req_authenticated, req_anon, allow_public, allowed_overload_max)
),
proc_matches AS (
  SELECT 
    p.oid,
    p.proname,
    p.proacl,
    oidvectortypes(p.proargtypes) AS actual_arg_types,
    pg_get_function_arguments(p.oid) AS actual_arguments,
    pg_get_function_identity_arguments(p.oid) AS actual_identity_args,
    count(*) OVER (PARTITION BY p.proname) AS func_overload_count
  FROM pg_proc p
  WHERE p.pronamespace = 'public'::regnamespace
    AND p.proname IN (
      'claim_notification_deliveries',
      'resolve_notification_delivery',
      'record_student_attendance_batch',
      'correct_student_attendance_record',
      'has_institution_role'
    )
)
SELECT 
  'CHECK_5_PERMISSIONS' AS check_id,
  fpr.func_name,
  fpr.expected_arg_types,
  COALESCE(pm.actual_identity_args, 'FUNCTION MISSING') AS identity_signature,
  COALESCE(pm.func_overload_count, 0) AS overload_count,
  CASE 
    WHEN pm.oid IS NULL THEN 'N/A: Function missing'
    WHEN pm.proacl IS NULL THEN 'DEFAULT ACL (NULL - grants EXECUTE to PUBLIC)'
    ELSE array_to_string(pm.proacl, ', ')
  END AS proacl_summary,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: Function missing'
    WHEN (pm.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')) THEN
      CASE 
        WHEN fpr.allow_public THEN 'PASS: public permitted'
        WHEN fpr.func_name IN ('record_student_attendance_batch', 'correct_student_attendance_record') 
          THEN 'PENDING MIGRATION HARDENING: Public execute present (will be revoked by pending migration 20261115000000)'
        WHEN pm.proacl IS NULL THEN 'FAIL: INSECURE default public execute on worker routine (proacl IS NULL)'
        ELSE 'FAIL: INSECURE explicit public grant on worker routine (grantee=0)'
      END
    ELSE 'PASS: public revoked'
  END AS public_status,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: Function missing'
    WHEN fpr.req_service_role THEN
      CASE 
        WHEN NOT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') AND has_function_privilege('service_role', pm.oid, 'EXECUTE')) 
          THEN 'FAIL: Missing service_role grant'
        WHEN EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'service_role' AND a.privilege_type = 'EXECUTE')
          THEN 'PASS: Direct service_role grant verified'
        ELSE 'PASS: service_role privilege inherited from PUBLIC'
      END
    ELSE 'PASS: Not required'
  END AS service_role_status,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: Function missing'
    WHEN fpr.req_authenticated THEN
      CASE 
        WHEN NOT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AND has_function_privilege('authenticated', pm.oid, 'EXECUTE')) 
          THEN 'FAIL: Missing authenticated grant'
        WHEN EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE')
          THEN 'PASS: Direct authenticated grant verified'
        ELSE 'PASS: authenticated privilege inherited from PUBLIC'
      END
    ELSE
      CASE 
        WHEN NOT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AND has_function_privilege('authenticated', pm.oid, 'EXECUTE')) 
          THEN 'PASS: authenticated revoked'
        WHEN EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE')
          THEN 'FAIL: INSECURE direct authenticated grant on worker routine'
        ELSE 'FAIL: INSECURE inherited authenticated privilege from PUBLIC'
      END
  END AS authenticated_status,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: Function missing'
    WHEN fpr.allow_public THEN 'PASS: anon permitted via public'
    WHEN NOT fpr.req_anon THEN
      CASE 
        WHEN NOT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND has_function_privilege('anon', pm.oid, 'EXECUTE')) 
          THEN 'PASS: anon revoked'
        WHEN fpr.func_name IN ('record_student_attendance_batch', 'correct_student_attendance_record')
          THEN 'PENDING MIGRATION HARDENING: Inherited anon privilege from PUBLIC (will be revoked by pending migration 20261115000000)'
        WHEN EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'anon' AND a.privilege_type = 'EXECUTE')
          THEN 'FAIL: INSECURE direct anon grant detected'
        ELSE 'FAIL: INSECURE inherited anon privilege from PUBLIC'
      END
    ELSE 'PASS: anon permitted'
  END AS anon_status,
  CASE 
    WHEN pm.oid IS NULL THEN 'FAIL: Function missing'
    WHEN pm.func_overload_count > fpr.allowed_overload_max THEN 'FAIL: Unexpected overload detected (' || pm.func_overload_count || ' routines)'
    WHEN pm.actual_arg_types != fpr.expected_arg_types THEN 'FAIL: Identity argument types mismatch'
    WHEN fpr.req_service_role AND NOT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') AND has_function_privilege('service_role', pm.oid, 'EXECUTE')) 
      THEN 'FAIL: Broken service_role execution'
    WHEN fpr.func_name IN ('claim_notification_deliveries', 'resolve_notification_delivery') AND (pm.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))
      THEN 'FAIL: Insecure public execution on worker routine'
    WHEN fpr.func_name IN ('claim_notification_deliveries', 'resolve_notification_delivery') AND (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AND has_function_privilege('authenticated', pm.oid, 'EXECUTE'))
      THEN 'FAIL: Insecure authenticated execution on worker routine'
    WHEN fpr.func_name IN ('claim_notification_deliveries', 'resolve_notification_delivery') AND (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') AND has_function_privilege('anon', pm.oid, 'EXECUTE'))
      THEN 'FAIL: Insecure anon execution on worker routine'
    WHEN fpr.req_authenticated AND NOT (EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') AND has_function_privilege('authenticated', pm.oid, 'EXECUTE')) 
      THEN 'FAIL: Missing authenticated execution'
    WHEN fpr.func_name IN ('record_student_attendance_batch', 'correct_student_attendance_record') AND (pm.proacl IS NULL OR EXISTS (SELECT 1 FROM aclexplode(pm.proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE'))
      THEN 'PASS: Baseline privileges verified (attendance RPC public/anon hardening staged in migration 20261115000000)'
    ELSE 'PASS: All privileges strictly conformant'
  END AS overall_permission_status
FROM function_permission_rules fpr
LEFT JOIN proc_matches pm 
  ON pm.proname = fpr.func_name
 AND pm.actual_arg_types = fpr.expected_arg_types
ORDER BY fpr.func_name, fpr.expected_arg_types;

-- ------------------------------------------------------------------------------
-- CHECK 6: Independent Helper Routine Observation
-- Inspects pg_proc strictly for dispatch_student_absence_notification_atomic
-- as an independent observation. Does not assume migration application state.
-- ------------------------------------------------------------------------------
SELECT 
  'CHECK_6_INDEPENDENT_HELPER_OBSERVATION' AS check_id,
  'dispatch_student_absence_notification_atomic' AS helper_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'dispatch_student_absence_notification_atomic' 
        AND pronamespace = 'public'::regnamespace
    ) THEN 'OBSERVED: Function is present in pg_proc (Independent observation: does not confirm migration 20261115000000 execution)'
    ELSE 'OBSERVED: Function is NOT present in pg_proc (Clean state for first-time creation)'
  END AS helper_observation,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_proc 
      WHERE proname = 'dispatch_student_absence_notification_atomic' 
        AND pronamespace = 'public'::regnamespace
    ) THEN (
      SELECT pg_get_function_identity_arguments(oid) 
      FROM pg_proc 
      WHERE proname = 'dispatch_student_absence_notification_atomic' 
        AND pronamespace = 'public'::regnamespace 
      LIMIT 1
    )
    ELSE 'N/A'
  END AS observed_identity_arguments;

-- ------------------------------------------------------------------------------
-- CHECK 7: Supabase Migration Tracking & Version Recording Status
-- Reports history table availability and exact version recording separately.
-- Safely queries without plan-time relation resolution error if table is missing.
-- ------------------------------------------------------------------------------
SELECT 
  'CHECK_7_MIGRATION_HISTORY' AS check_id,
  '20261115000000' AS target_version,
  'automatic_absence_notifications' AS target_migration_name,
  CASE 
    WHEN to_regclass('supabase_migrations.schema_migrations') IS NOT NULL 
      THEN 'AVAILABLE: supabase_migrations.schema_migrations table exists'
    ELSE 'UNAVAILABLE: supabase_migrations.schema_migrations table does not exist'
  END AS history_table_availability,
  CASE 
    WHEN to_regclass('supabase_migrations.schema_migrations') IS NULL 
      THEN 'UNKNOWN: History table unavailable (cannot verify version recording)'
    WHEN query_to_xml('SELECT 1 FROM supabase_migrations.schema_migrations WHERE version = ''20261115000000''', false, false, '')::text LIKE '%<row>%' 
      THEN 'RECORDED: Exact migration version 20261115000000 is present in schema_migrations'
    ELSE 'NOT RECORDED: Migration version 20261115000000 is not present in schema_migrations (ready to apply)'
  END AS version_recording_status;

-- ------------------------------------------------------------------------------
-- CHECK 8: Active Push Device Tokens (Read-Only Health Check)
-- Confirms device token table is accessible and reports active device status.
-- ------------------------------------------------------------------------------
SELECT 
  'CHECK_8_DEVICE_TOKENS' AS check_id,
  COUNT(*) AS total_device_tokens,
  COUNT(*) FILTER (WHERE is_active = true) AS active_device_tokens,
  COUNT(*) FILTER (WHERE token LIKE 'ExponentPushToken%') AS expo_push_tokens,
  CASE 
    WHEN COUNT(*) FILTER (WHERE is_active = true AND token LIKE 'ExponentPushToken%') > 0 
      THEN 'PASS: Registered active Expo devices found'
    ELSE 'WARNING: Zero active Expo push tokens registered'
  END AS health_status
FROM public.push_device_tokens;

-- ------------------------------------------------------------------------------
-- CHECK 9: Outbox Queue Baseline Metrics
-- Confirms outbox queue is operational and reports current counts.
-- ------------------------------------------------------------------------------
SELECT 
  'CHECK_9_OUTBOX_METRICS' AS check_id,
  COUNT(*) AS total_outbox_jobs,
  COUNT(*) FILTER (WHERE status = 'queued') AS queued_jobs,
  COUNT(*) FILTER (WHERE status = 'processing') AS processing_jobs,
  COUNT(*) FILTER (WHERE status = 'failed') AS failed_jobs,
  COUNT(*) FILTER (WHERE status = 'dead_letter') AS dead_letter_jobs,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered_jobs,
  CASE 
    WHEN COUNT(*) FILTER (WHERE status = 'processing' AND locked_at < (timezone('utc', now()) - INTERVAL '5 minutes')) > 0 
      THEN 'WARNING: Stale processing locks detected (Worker will auto-reclaim)'
    ELSE 'PASS: Outbox queue clean'
  END AS queue_health
FROM public.notification_deliveries;

-- ------------------------------------------------------------------------------
-- CHECK 10: Executive Master Summary (Strict Go / No-Go Aggregation)
-- Evaluates all critical conditions required for production readiness.
-- Accurately recognizes both legitimate has_institution_role overloads (enum[] and text[])
-- and differentiates verified database prerequisites from pending migration hardening.
-- ------------------------------------------------------------------------------
WITH critical_metrics AS (
  SELECT 
    -- 1. Tables (Must be exactly 11)
    (SELECT count(*) 
     FROM information_schema.tables 
     WHERE table_schema = 'public' 
       AND table_type = 'BASE TABLE'
       AND table_name IN (
         'attendance_sessions','student_attendance_records','attendance_corrections',
         'notifications','notification_deliveries','push_device_tokens',
         'notification_preferences','students','guardians','student_guardians',
         'institution_memberships'
       )) AS tables_count,

    -- 2. RLS Enabled (Must be exactly 11)
    (SELECT count(*) 
     FROM pg_tables 
     WHERE schemaname = 'public' 
       AND rowsecurity = true
       AND tablename IN (
         'attendance_sessions','student_attendance_records','attendance_corrections',
         'notifications','notification_deliveries','push_device_tokens',
         'notification_preferences','students','guardians','student_guardians',
         'institution_memberships'
       )) AS rls_enabled_count,

    -- 3. Public Enum Types (Must be exactly 6)
    (SELECT count(*) 
     FROM pg_type 
     WHERE typnamespace = 'public'::regnamespace 
       AND typtype = 'e'
       AND typname IN (
         'attendance_status','membership_role','notification_channel',
         'notification_delivery_status','notification_priority','notification_category'
       )) AS enums_count,

    -- 4. Attendance RPCs (Must be exactly 2 with exact matching types, jsonb return, and SECURITY DEFINER)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.prosecdef = true
       AND p.prorettype = 'jsonb'::regtype
       AND (
         (p.proname = 'record_student_attendance_batch' AND oidvectortypes(p.proargtypes) = 'uuid, uuid, jsonb, uuid')
         OR
         (p.proname = 'correct_student_attendance_record' AND oidvectortypes(p.proargtypes) = 'uuid, uuid, attendance_status, text, uuid')
       )) AS attendance_rpcs_conforming,

    -- 5. Outbox & Role RPCs (Must be exactly 4 conforming routines across the 3 names)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.prosecdef = true
       AND (
         (p.proname = 'claim_notification_deliveries' 
          AND oidvectortypes(p.proargtypes) = 'integer, text, interval' 
          AND pg_get_function_result(p.oid) = 'TABLE(out_delivery_id uuid, out_institution_id uuid, out_notification_id uuid, out_channel notification_channel, out_destination text, out_status notification_delivery_status, out_attempts_count integer, out_max_attempts integer, out_idempotency_key text, out_recipient_user_id uuid, out_recipient_email text, out_recipient_phone text, out_title text, out_body text, out_category notification_category, out_priority notification_priority, out_notification_data jsonb)')
         OR
         (p.proname = 'resolve_notification_delivery' 
          AND oidvectortypes(p.proargtypes) = 'uuid, text, text, text, jsonb, text, text, boolean, integer' 
          AND pg_get_function_result(p.oid) = 'jsonb')
         OR
         (p.proname = 'has_institution_role' 
          AND oidvectortypes(p.proargtypes) = 'uuid, membership_role[]' 
          AND pg_get_function_result(p.oid) = 'boolean')
         OR
         (p.proname = 'has_institution_role' 
          AND oidvectortypes(p.proargtypes) = 'uuid, text[]' 
          AND pg_get_function_result(p.oid) = 'boolean')
       )) AS outbox_rpcs_conforming,

    -- 6. Claim Return Structure Verified (Explicitly requires 17-column TABLE definition, rejecting untyped SETOF record)
    EXISTS (
      SELECT 1 
      FROM pg_proc p 
      WHERE p.pronamespace = 'public'::regnamespace
        AND p.proname = 'claim_notification_deliveries'
        AND oidvectortypes(p.proargtypes) = 'integer, text, interval'
        AND pg_get_function_result(p.oid) = 'TABLE(out_delivery_id uuid, out_institution_id uuid, out_notification_id uuid, out_channel notification_channel, out_destination text, out_status notification_delivery_status, out_attempts_count integer, out_max_attempts integer, out_idempotency_key text, out_recipient_user_id uuid, out_recipient_email text, out_recipient_phone text, out_title text, out_body text, out_category notification_category, out_priority notification_priority, out_notification_data jsonb)'
    ) AS claim_return_verified,

    -- 7. Attendance Extra Overload Count (Must be exactly 0)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname IN ('record_student_attendance_batch', 'correct_student_attendance_record')
    ) - 2 AS attendance_extra_overloads,

    -- 8. Outbox & Role Extra Overload Count (Must be exactly 0; expects 4 total routines)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname IN ('claim_notification_deliveries', 'resolve_notification_delivery', 'has_institution_role')
    ) - 4 AS outbox_extra_overloads,

    -- 9. Service Role Execution Privilege on Worker and Role Routines (Must be at least 4)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND (
         (p.proname = 'claim_notification_deliveries' AND oidvectortypes(p.proargtypes) = 'integer, text, interval')
         OR
         (p.proname = 'resolve_notification_delivery' AND oidvectortypes(p.proargtypes) = 'uuid, text, text, text, jsonb, text, text, boolean, integer')
         OR
         (p.proname = 'has_institution_role' AND oidvectortypes(p.proargtypes) = 'uuid, membership_role[]')
         OR
         (p.proname = 'has_institution_role' AND oidvectortypes(p.proargtypes) = 'uuid, text[]')
       )
       AND (
         EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
         AND has_function_privilege('service_role', p.oid, 'EXECUTE')
       )
    ) AS worker_and_role_service_role_count,

    -- 10. Authenticated Execution Privilege on Attendance RPCs (Must be exactly 2)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND (
         (p.proname = 'record_student_attendance_batch' AND oidvectortypes(p.proargtypes) = 'uuid, uuid, jsonb, uuid')
         OR
         (p.proname = 'correct_student_attendance_record' AND oidvectortypes(p.proargtypes) = 'uuid, uuid, attendance_status, text, uuid')
       )
       AND (
         EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
         AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
       )
    ) AS auth_attendance_granted_count,

    -- 11. Insecure Worker Authenticated Execution Privilege (Must be exactly 0 across worker overloads)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname IN ('claim_notification_deliveries', 'resolve_notification_delivery')
       AND (
         EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
         AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
       )
    ) AS insecure_auth_worker_count,

    -- 12. Insecure Worker Anon Execution Privilege (Must be exactly 0 across worker overloads)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname IN ('claim_notification_deliveries', 'resolve_notification_delivery')
       AND (
         EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon')
         AND has_function_privilege('anon', p.oid, 'EXECUTE')
       )
    ) AS insecure_worker_anon_count,

    -- 13. Insecure Worker Public Execution Privilege (Must be exactly 0 across worker overloads)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname IN ('claim_notification_deliveries', 'resolve_notification_delivery')
       AND (
         p.proacl IS NULL 
         OR EXISTS (
           SELECT 1 
           FROM aclexplode(p.proacl) a 
           WHERE a.grantee = 0 
             AND a.privilege_type = 'EXECUTE'
         )
       )
    ) AS insecure_worker_public_count,

    -- 14. Attendance RPC Hardening Status
    -- Evaluates whether attendance RPCs already have public/anon revoked or if hardening is staged in migration 20261115000000
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname IN ('record_student_attendance_batch', 'correct_student_attendance_record')
       AND (
         p.proacl IS NOT NULL 
         AND NOT EXISTS (
           SELECT 1 
           FROM aclexplode(p.proacl) a 
           WHERE a.grantee = 0 
             AND a.privilege_type = 'EXECUTE'
         )
       )
    ) AS attendance_hardened_count,

    -- 15. has_institution_role Permission Policy Compliance (Both overloads must be executable by service_role and authenticated)
    (SELECT count(*) 
     FROM pg_proc p 
     WHERE p.pronamespace = 'public'::regnamespace 
       AND p.proname = 'has_institution_role' 
       AND oidvectortypes(p.proargtypes) IN ('uuid, membership_role[]', 'uuid, text[]')
       AND (
         EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role')
         AND has_function_privilege('service_role', p.oid, 'EXECUTE')
       )
       AND (
         EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated')
         AND has_function_privilege('authenticated', p.oid, 'EXECUTE')
       )
    ) AS has_institution_role_valid_count
)
SELECT 
  'CHECK_10_EXECUTIVE_SUMMARY' AS check_id,
  CASE 
    WHEN m.tables_count = 11
     AND m.rls_enabled_count = 11
     AND m.enums_count = 6
     AND m.attendance_rpcs_conforming = 2
     AND m.outbox_rpcs_conforming = 4
     AND m.claim_return_verified = true
     AND m.attendance_extra_overloads = 0
     AND m.outbox_extra_overloads = 0
     AND m.worker_and_role_service_role_count = 4
     AND m.auth_attendance_granted_count = 2
     AND m.insecure_auth_worker_count = 0
     AND m.insecure_worker_anon_count = 0
     AND m.insecure_worker_public_count = 0
     AND m.has_institution_role_valid_count = 2
    THEN 'DATABASE PREFLIGHT PASS: Required database prerequisites and verified permission rules match the expected migration baseline. This does not certify end-to-end notification delivery.'
    ELSE 'DATABASE PREFLIGHT FAIL: Critical assertions failed. Inspect earlier check results and do not apply migration.'
  END AS preflight_go_no_go_verdict,
  jsonb_build_object(
    'prerequisites_verified', m.tables_count = 11 AND m.rls_enabled_count = 11 AND m.enums_count = 6,
    'tables_verified', m.tables_count = 11,
    'rls_enforced', m.rls_enabled_count = 11,
    'enums_verified', m.enums_count = 6,
    'signatures_and_overloads_verified', m.attendance_rpcs_conforming = 2 AND m.outbox_rpcs_conforming = 4 AND m.claim_return_verified = true AND m.attendance_extra_overloads = 0 AND m.outbox_extra_overloads = 0,
    'attendance_rpcs_conforming', m.attendance_rpcs_conforming = 2,
    'outbox_rpcs_conforming', m.outbox_rpcs_conforming = 4,
    'claim_return_structure_verified', m.claim_return_verified,
    'no_attendance_overloads', m.attendance_extra_overloads = 0,
    'no_outbox_overloads', m.outbox_extra_overloads = 0,
    'permissions_verified', m.worker_and_role_service_role_count = 4 AND m.auth_attendance_granted_count = 2 AND m.insecure_auth_worker_count = 0 AND m.insecure_worker_anon_count = 0 AND m.insecure_worker_public_count = 0 AND m.has_institution_role_valid_count = 2,
    'worker_service_role_authorized', m.worker_and_role_service_role_count = 4,
    'authenticated_authorized_on_attendance', m.auth_attendance_granted_count = 2,
    'authenticated_revoked_on_worker', m.insecure_auth_worker_count = 0,
    'anon_revoked_on_worker', m.insecure_worker_anon_count = 0,
    'public_revoked_on_worker', m.insecure_worker_public_count = 0,
    'has_institution_role_compliant', m.has_institution_role_valid_count = 2,
    'attendance_rpc_hardening_status', CASE 
      WHEN m.attendance_hardened_count = 2 THEN 'ALREADY_HARDENED_IN_DATABASE'
      ELSE 'PENDING_HARDENING_BY_MIGRATION_20261115000000'
    END
  ) AS detailed_assertions
FROM critical_metrics m;
