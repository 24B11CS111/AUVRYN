-- ==============================================================================
-- AUVRYN — Read-Only Production Diagnosis Script
-- Target Database: Supabase Production (dhgdjpjgsvbknquetecl)
--
-- STRICT READ-ONLY GUARANTEE:
-- Contains exclusively SELECT queries against pg_catalog and information_schema.
-- Zero DDL, zero DML, zero mutations.
-- Safe to execute against production.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- PART 1: Comprehensive Overload Inventory
-- Inspects exact OID, argument types, argument names, return type, and security mode
-- ------------------------------------------------------------------------------
SELECT 
  p.oid AS function_oid,
  n.nspname AS schema_name,
  p.proname AS routine_name,
  oidvectortypes(p.proargtypes) AS positional_arg_types,
  p.proargnames AS argument_names,
  pg_get_function_arguments(p.oid) AS full_argument_signature,
  pg_get_function_identity_arguments(p.oid) AS identity_arguments,
  pg_get_function_result(p.oid) AS return_type,
  CASE WHEN p.prosecdef THEN 'SECURITY DEFINER' ELSE 'SECURITY INVOKER' END AS security_mode,
  count(*) OVER (PARTITION BY n.nspname, p.proname) AS total_overloads_for_name
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'claim_notification_deliveries',
    'resolve_notification_delivery',
    'has_institution_role',
    'record_student_attendance_batch',
    'correct_student_attendance_record'
  )
ORDER BY p.proname, positional_arg_types;

-- ------------------------------------------------------------------------------
-- PART 2: Direct ACL Inspection (pg_proc.proacl & aclexplode)
-- Identifies explicit grants vs default ACL, showing grantee OID 0 as PUBLIC
-- ------------------------------------------------------------------------------
SELECT 
  p.oid AS function_oid,
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS identity_signature,
  p.proacl AS raw_proacl,
  CASE 
    WHEN p.proacl IS NULL THEN 'DEFAULT ACL (NULL: Unrestricted PUBLIC execute)'
    ELSE 'CUSTOM ACL'
  END AS acl_classification,
  COALESCE(r.rolname, CASE WHEN a.grantee = 0 THEN 'PUBLIC (grantee 0)' ELSE 'OID ' || a.grantee::text END) AS grantee,
  a.privilege_type,
  a.is_grantable,
  g.rolname AS grantor
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
LEFT JOIN LATERAL aclexplode(COALESCE(p.proacl, acldefault('f', p.proowner))) a ON true
LEFT JOIN pg_roles r ON r.oid = a.grantee
LEFT JOIN pg_roles g ON g.oid = a.grantor
WHERE n.nspname = 'public'
  AND p.proname IN (
    'claim_notification_deliveries',
    'resolve_notification_delivery',
    'has_institution_role',
    'record_student_attendance_batch',
    'correct_student_attendance_record'
  )
ORDER BY p.proname, p.oid, grantee;

-- ------------------------------------------------------------------------------
-- PART 3: Effective Privilege Evaluation Matrix
-- Tests has_function_privilege for key Supabase roles and checks for PUBLIC grants
-- ------------------------------------------------------------------------------
SELECT 
  p.oid AS function_oid,
  p.proname AS routine_name,
  pg_get_function_identity_arguments(p.oid) AS identity_signature,
  -- PUBLIC Privilege
  CASE 
    WHEN p.proacl IS NULL THEN 'INSECURE: Default ACL grants EXECUTE to PUBLIC'
    WHEN EXISTS (SELECT 1 FROM aclexplode(p.proacl) a WHERE a.grantee = 0 AND a.privilege_type = 'EXECUTE')
      THEN 'INSECURE: Explicit EXECUTE grant to PUBLIC (grantee=0)'
    ELSE 'SECURE: PUBLIC execute revoked'
  END AS public_privilege_status,
  -- Anon Privilege
  CASE 
    WHEN has_function_privilege('anon', p.oid, 'EXECUTE') THEN 
      CASE 
        WHEN EXISTS (SELECT 1 FROM aclexplode(p.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'anon' AND a.privilege_type = 'EXECUTE')
          THEN 'INSECURE: Direct anon EXECUTE grant'
        ELSE 'INSECURE: Inherited anon EXECUTE via PUBLIC'
      END
    ELSE 'SECURE: anon execution disabled'
  END AS anon_privilege_status,
  -- Authenticated Privilege
  CASE 
    WHEN has_function_privilege('authenticated', p.oid, 'EXECUTE') THEN 
      CASE 
        WHEN EXISTS (SELECT 1 FROM aclexplode(p.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'authenticated' AND a.privilege_type = 'EXECUTE')
          THEN 'Direct authenticated EXECUTE grant'
        ELSE 'Inherited authenticated EXECUTE via PUBLIC'
      END
    ELSE 'authenticated execution disabled'
  END AS authenticated_privilege_status,
  -- Service Role Privilege
  CASE 
    WHEN has_function_privilege('service_role', p.oid, 'EXECUTE') THEN 
      CASE 
        WHEN EXISTS (SELECT 1 FROM aclexplode(p.proacl) a JOIN pg_roles r ON a.grantee = r.oid WHERE r.rolname = 'service_role' AND a.privilege_type = 'EXECUTE')
          THEN 'Direct service_role EXECUTE grant'
        ELSE 'Inherited service_role EXECUTE via PUBLIC'
      END
    ELSE 'service_role execution disabled'
  END AS service_role_privilege_status
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'claim_notification_deliveries',
    'resolve_notification_delivery',
    'has_institution_role',
    'record_student_attendance_batch',
    'correct_student_attendance_record'
  )
ORDER BY p.proname, p.oid;
