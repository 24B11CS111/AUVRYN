-- ==============================================================================
-- Migration: 20261109121000_storage_security_policies.sql
-- Description: REM-HIGH-02 Storage Security & Institutional RLS Isolation
-- Configures private Supabase storage buckets, path extraction helpers,
-- and institution-scoped RLS policies for document isolation across tenants,
-- role privileges, student self-access, guardian access, and deletion protection.
-- ==============================================================================

-- 1. Ensure Storage Schema & Standard Tables (Idempotent for local/test Postgres)
CREATE SCHEMA IF NOT EXISTS storage;

CREATE TABLE IF NOT EXISTS storage.buckets (
  id text PRIMARY KEY,
  name text NOT NULL,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  public boolean DEFAULT false,
  avif_autodetection boolean DEFAULT false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

CREATE TABLE IF NOT EXISTS storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text REFERENCES storage.buckets(id),
  name text,
  owner uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_accessed_at timestamptz DEFAULT now(),
  metadata jsonb,
  version text
);

-- 2. Storage Helper Functions (if not already defined by Supabase Storage)
CREATE OR REPLACE FUNCTION storage.foldername(name text)
RETURNS text[]
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT string_to_array(name, '/');
$$;

CREATE OR REPLACE FUNCTION storage.filename(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT split_part(name, '/', array_length(string_to_array(name, '/'), 1));
$$;

CREATE OR REPLACE FUNCTION storage.extension(name text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT split_part(name, '.', array_length(string_to_array(name, '.'), 1));
$$;

-- 3. Path Extraction Helpers for Multi-Tenant Scoping
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

-- 4. Insert / Configure Private Buckets (Strictly Private)
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

-- 5. Enable RLS on Storage Tables
ALTER TABLE storage.buckets ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- 6. Bucket RLS Policies
DROP POLICY IF EXISTS "storage_buckets_authenticated_select" ON storage.buckets;
CREATE POLICY "storage_buckets_authenticated_select" ON storage.buckets
  FOR SELECT TO authenticated
  USING (true);

-- 7. Student Documents Storage RLS Policies (bucket_id = 'student-documents')
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

-- 8. Staff Documents Storage RLS Policies (bucket_id = 'staff-documents')
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

-- 9. Transport Documents Storage RLS Policies (bucket_id = 'transport-documents')
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

-- 10. Academic Documents Storage RLS Policies (bucket_id = 'academic-documents')
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

-- 11. Security Grants
GRANT USAGE ON SCHEMA storage TO authenticated, anon;
GRANT SELECT ON storage.buckets TO authenticated;
GRANT ALL ON storage.objects TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA storage TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_extract_institution_id(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.storage_extract_entity_id(text) TO authenticated;
