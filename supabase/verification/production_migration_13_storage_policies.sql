-- ==============================================================================
-- Education Management Platform — Production Migration 13 (Supabase Cloud Edition)
-- File: 09_migration_13_storage_security_policies.sql
-- Description: REM-HIGH-02 Storage Security & Institutional RLS Isolation
--
-- TARGET: Supabase Cloud Managed Environment (dhgdjpjgsvbknquetecl)
--
-- SAFETY & PERMISSIONS NOTICE:
-- In Supabase Cloud, `storage` schema, `storage.buckets`, and `storage.objects`
-- are owned by `supabase_admin`. The SQL Editor role (`postgres`) cannot run:
--   - ALTER TABLE storage.buckets/objects ENABLE ROW LEVEL SECURITY (already enabled by default)
--   - CREATE POLICY on storage.buckets (managed internally by Supabase Storage)
--   - GRANT on schema storage, storage.buckets, or storage.objects (already granted by default)
--
-- THIS CORRECTED VERSION:
-- 1. Creates tenant path extraction helper functions in `public` schema.
-- 2. Inserts/configures the 4 strictly private document storage buckets.
-- 3. Creates 12 multi-tenant, role-isolated RLS policies directly on `storage.objects`.
-- 4. Grants execution on the public helper functions only.
-- Zero statements alter ownership or permissions on Supabase-managed storage tables.
-- ==============================================================================

-- 1. Path Extraction Helpers for Multi-Tenant Scoping (in public schema)
-- Storage paths follow: {institution_id}/{category}/{entity_id}/{file_name}

CREATE OR REPLACE FUNCTION public.storage_extract_institution_id(p_name text)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_name ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    THEN split_part(p_name, '/', 1)::uuid
    ELSE NULL
  END;
$$;

CREATE OR REPLACE FUNCTION public.storage_extract_entity_id(p_name text)
RETURNS UUID
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN split_part(p_name, '/', 3) ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}'
    THEN split_part(p_name, '/', 3)::uuid
    ELSE NULL
  END;
$$;

COMMENT ON FUNCTION public.storage_extract_institution_id(text) IS 'Extracts and validates institution UUID from first storage path segment.';
COMMENT ON FUNCTION public.storage_extract_entity_id(text) IS 'Extracts and validates entity UUID from third storage path segment.';

-- 2. Insert / Configure Private Buckets (Strictly Private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  (
    'student-documents',
    'student-documents',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'staff-documents',
    'staff-documents',
    false,
    10485760, -- 10MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'transport-documents',
    'transport-documents',
    false,
    15728640, -- 15MB
    ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  ),
  (
    'academic-documents',
    'academic-documents',
    false,
    26214400, -- 25MB
    ARRAY[
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/webp',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/epub+zip'
    ]
  )
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 3. Student Documents Storage RLS Policies (bucket_id = 'student-documents')
-- Path format: {institution_id}/students/{student_id}/{filename} or {institution_id}/applications/{application_id}/{filename}

DROP POLICY IF EXISTS "storage_objects_student_docs_select" ON storage.objects;
CREATE POLICY "storage_objects_student_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND (
      -- Institutional staff / administration
      public.has_institution_role(
        public.storage_extract_institution_id(name),
        ARRAY[
          'owner'::membership_role,
          'admin'::membership_role,
          'admissions_officer'::membership_role,
          'academic_admin'::membership_role,
          'faculty'::membership_role,
          'staff'::membership_role
        ]
      )
      OR
      -- Student viewing their own document
      (
        public.storage_extract_entity_id(name) IN (
          SELECT s.id FROM public.students s
          WHERE s.user_id = auth.uid()
            AND s.institution_id = public.storage_extract_institution_id(name)
        )
      )
      OR
      -- Guardian viewing their verified child's document
      (
        public.is_guardian_of_student(public.storage_extract_entity_id(name))
        AND public.storage_extract_institution_id(name) IN (SELECT public.get_user_institution_ids())
      )
    )
  );

DROP POLICY IF EXISTS "storage_objects_student_docs_insert" ON storage.objects;
CREATE POLICY "storage_objects_student_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'student-documents'
    AND public.storage_extract_institution_id(name) IS NOT NULL
    AND public.storage_extract_entity_id(name) IS NOT NULL
    AND (
      -- Institutional staff / admissions upload
      public.has_institution_role(
        public.storage_extract_institution_id(name),
        ARRAY[
          'owner'::membership_role,
          'admin'::membership_role,
          'admissions_officer'::membership_role,
          'academic_admin'::membership_role,
          'staff'::membership_role
        ]
      )
      OR
      -- Student uploading to their own entity folder
      (
        public.storage_extract_entity_id(name) IN (
          SELECT s.id FROM public.students s
          WHERE s.user_id = auth.uid()
            AND s.institution_id = public.storage_extract_institution_id(name)
        )
      )
      OR
      -- Guardian uploading for their verified child
      (
        public.is_guardian_of_student(public.storage_extract_entity_id(name))
        AND public.storage_extract_institution_id(name) IN (SELECT public.get_user_institution_ids())
      )
    )
  );

DROP POLICY IF EXISTS "storage_objects_student_docs_update" ON storage.objects;
CREATE POLICY "storage_objects_student_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'admissions_officer'::membership_role,
        'academic_admin'::membership_role
      ]
    )
  );

DROP POLICY IF EXISTS "storage_objects_student_docs_delete" ON storage.objects;
CREATE POLICY "storage_objects_student_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'student-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY['owner'::membership_role, 'admin'::membership_role]
    )
  );

-- 4. Staff Documents Storage RLS Policies (bucket_id = 'staff-documents')
-- Path format: {institution_id}/staff/{staff_id}/{filename}

DROP POLICY IF EXISTS "storage_objects_staff_docs_select" ON storage.objects;
CREATE POLICY "storage_objects_staff_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND (
      -- HR and Admins
      public.has_institution_role(
        public.storage_extract_institution_id(name),
        ARRAY[
          'owner'::membership_role,
          'admin'::membership_role,
          'hr_administrator'::membership_role
        ]
      )
      OR
      -- Staff member viewing their own document
      (
        public.storage_extract_entity_id(name) IN (
          SELECT sp.id FROM public.staff_profiles sp
          WHERE sp.user_id = auth.uid()
            AND sp.institution_id = public.storage_extract_institution_id(name)
        )
      )
    )
  );

DROP POLICY IF EXISTS "storage_objects_staff_docs_insert" ON storage.objects;
CREATE POLICY "storage_objects_staff_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'staff-documents'
    AND public.storage_extract_institution_id(name) IS NOT NULL
    AND public.storage_extract_entity_id(name) IS NOT NULL
    AND (
      -- HR and Admins
      public.has_institution_role(
        public.storage_extract_institution_id(name),
        ARRAY[
          'owner'::membership_role,
          'admin'::membership_role,
          'hr_administrator'::membership_role
        ]
      )
      OR
      -- Staff uploading to their own entity folder
      (
        public.storage_extract_entity_id(name) IN (
          SELECT sp.id FROM public.staff_profiles sp
          WHERE sp.user_id = auth.uid()
            AND sp.institution_id = public.storage_extract_institution_id(name)
        )
      )
    )
  );

DROP POLICY IF EXISTS "storage_objects_staff_docs_update" ON storage.objects;
CREATE POLICY "storage_objects_staff_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'hr_administrator'::membership_role
      ]
    )
  );

DROP POLICY IF EXISTS "storage_objects_staff_docs_delete" ON storage.objects;
CREATE POLICY "storage_objects_staff_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'staff-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY['owner'::membership_role, 'admin'::membership_role]
    )
  );

-- 5. Transport Documents Storage RLS Policies (bucket_id = 'transport-documents')
-- Path format: {institution_id}/transport/{vehicle_id}/{filename}

DROP POLICY IF EXISTS "storage_objects_transport_docs_select" ON storage.objects;
CREATE POLICY "storage_objects_transport_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'transport-documents'
    AND public.storage_extract_institution_id(name) IN (
      SELECT public.get_user_institution_ids()
    )
  );

DROP POLICY IF EXISTS "storage_objects_transport_docs_insert" ON storage.objects;
CREATE POLICY "storage_objects_transport_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'transport-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'staff'::membership_role
      ]
    )
  );

DROP POLICY IF EXISTS "storage_objects_transport_docs_update" ON storage.objects;
CREATE POLICY "storage_objects_transport_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'transport-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'staff'::membership_role
      ]
    )
  );

DROP POLICY IF EXISTS "storage_objects_transport_docs_delete" ON storage.objects;
CREATE POLICY "storage_objects_transport_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'transport-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY['owner'::membership_role, 'admin'::membership_role]
    )
  );

-- 6. Academic Documents Storage RLS Policies (bucket_id = 'academic-documents')
-- Path format: {institution_id}/academic/{category_or_id}/{filename}

DROP POLICY IF EXISTS "storage_objects_academic_docs_select" ON storage.objects;
CREATE POLICY "storage_objects_academic_docs_select" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'academic-documents'
    AND public.storage_extract_institution_id(name) IN (
      SELECT public.get_user_institution_ids()
    )
  );

DROP POLICY IF EXISTS "storage_objects_academic_docs_insert" ON storage.objects;
CREATE POLICY "storage_objects_academic_docs_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'academic-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'academic_admin'::membership_role,
        'department_head'::membership_role,
        'faculty'::membership_role,
        'staff'::membership_role
      ]
    )
  );

DROP POLICY IF EXISTS "storage_objects_academic_docs_update" ON storage.objects;
CREATE POLICY "storage_objects_academic_docs_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'academic-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY[
        'owner'::membership_role,
        'admin'::membership_role,
        'academic_admin'::membership_role,
        'department_head'::membership_role,
        'faculty'::membership_role
      ]
    )
  );

DROP POLICY IF EXISTS "storage_objects_academic_docs_delete" ON storage.objects;
CREATE POLICY "storage_objects_academic_docs_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'academic-documents'
    AND public.has_institution_role(
      public.storage_extract_institution_id(name),
      ARRAY['owner'::membership_role, 'admin'::membership_role]
    )
  );

-- 7. Security Grants on Public Helper Functions Only
GRANT EXECUTE ON FUNCTION public.storage_extract_institution_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_extract_entity_id(text) TO authenticated;
