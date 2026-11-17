-- ==============================================================================
-- Education Management Platform — Post-Migration Verification Script
-- Target Database: Supabase Production (dhgdjpjgsvbknquetecl)
-- Run this script in the Supabase SQL Editor after applying migrations.
-- ==============================================================================

DO $$
DECLARE
  v_table_count INT;
  v_view_count INT;
  v_function_count INT;
  v_policy_count INT;
  v_bucket_count INT;
BEGIN
  RAISE NOTICE '==================================================';
  RAISE NOTICE 'Starting Post-Migration Schema Verification...';
  RAISE NOTICE '==================================================';

  -- 1. Verify Public Tables Count
  SELECT count(*) INTO v_table_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'BASE TABLE';
  RAISE NOTICE 'Public Base Tables: % (Expected: 114)', v_table_count;

  -- 2. Verify Public Views Count
  SELECT count(*) INTO v_view_count
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_type = 'VIEW';
  RAISE NOTICE 'Public Views: % (Expected: 1)', v_view_count;

  -- 3. Verify Public Functions Count
  SELECT count(*) INTO v_function_count
  FROM information_schema.routines
  WHERE routine_schema = 'public';
  RAISE NOTICE 'Public Functions / Routines: % (Expected: 94)', v_function_count;

  -- 4. Verify Row-Level Security Policies Count
  SELECT count(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'public';
  RAISE NOTICE 'Public RLS Policies: % (Expected: 281)', v_policy_count;

  -- 5. Verify Storage Buckets
  SELECT count(*) INTO v_bucket_count
  FROM storage.buckets
  WHERE id IN ('student-documents', 'staff-documents', 'transport-documents', 'academic-documents');
  RAISE NOTICE 'Document Storage Buckets: % (Expected: 4)', v_bucket_count;

  RAISE NOTICE '==================================================';
  IF v_table_count = 114 AND v_view_count = 1 AND v_policy_count = 281 AND v_bucket_count = 4 THEN
    RAISE NOTICE 'STATUS: 100%% VERIFICATION SUCCESS! Database schema is ready for production.';
  ELSE
    RAISE WARNING 'STATUS: Verification anomaly detected. Check table/policy counts.';
  END IF;
  RAISE NOTICE '==================================================';
END $$;

-- Summary details query
SELECT 
  'Public Base Tables' AS object_category, count(*)::text AS count, '114' AS expected
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
UNION ALL
SELECT 
  'Public Views', count(*)::text, '1'
FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'VIEW'
UNION ALL
SELECT 
  'Public Routines', count(*)::text, '94'
FROM information_schema.routines WHERE routine_schema = 'public'
UNION ALL
SELECT 
  'Public RLS Policies', count(*)::text, '281'
FROM pg_policies WHERE schemaname = 'public'
UNION ALL
SELECT 
  'Storage Buckets', count(*)::text, '4'
FROM storage.buckets WHERE id IN ('student-documents', 'staff-documents', 'transport-documents', 'academic-documents');
