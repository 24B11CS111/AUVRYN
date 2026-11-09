-- ==============================================================================
-- Rollback Migration: 20261109121000_rollback.sql
-- Description: Revert storage security policies and helper functions (REM-HIGH-02)
-- ==============================================================================

-- 1. Drop storage.objects policies
DROP POLICY IF EXISTS "storage_objects_academic_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_academic_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_academic_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_academic_docs_select" ON storage.objects;

DROP POLICY IF EXISTS "storage_objects_transport_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_transport_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_transport_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_transport_docs_select" ON storage.objects;

DROP POLICY IF EXISTS "storage_objects_staff_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_staff_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_staff_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_staff_docs_select" ON storage.objects;

DROP POLICY IF EXISTS "storage_objects_student_docs_delete" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_student_docs_update" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_student_docs_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_objects_student_docs_select" ON storage.objects;

-- 2. Drop storage.buckets policies
DROP POLICY IF EXISTS "storage_buckets_authenticated_select" ON storage.buckets;

-- 3. Delete objects and configured private buckets
DELETE FROM storage.objects WHERE bucket_id IN (
  'student-documents',
  'staff-documents',
  'transport-documents',
  'academic-documents'
);

DELETE FROM storage.buckets WHERE id IN (
  'student-documents',
  'staff-documents',
  'transport-documents',
  'academic-documents'
);

-- 4. Drop path extraction helper functions
DROP FUNCTION IF EXISTS public.storage_extract_entity_id(text);
DROP FUNCTION IF EXISTS public.storage_extract_institution_id(text);
