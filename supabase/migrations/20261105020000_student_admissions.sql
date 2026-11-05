-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Migration: 20261105020000_student_admissions.sql
-- Milestone 3: Student Management & Admissions System
-- ==============================================================================

-- 1. Enums for Student & Admissions Lifecycle
DO $$ BEGIN
  CREATE TYPE student_status AS ENUM (
    'active',
    'inactive',
    'suspended',
    'alumni',
    'withdrawn',
    'transferred'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE student_gender AS ENUM (
    'male',
    'female',
    'other',
    'prefer_not_to_say'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE enrollment_status AS ENUM (
    'enrolled',
    'promoted',
    'retained',
    'transferred',
    'graduated',
    'dropped'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_type AS ENUM (
    'photo',
    'birth_certificate',
    'previous_record',
    'transfer_certificate',
    'national_id',
    'medical_record',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE document_verification_status AS ENUM (
    'pending',
    'verified',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE admission_status AS ENUM (
    'submitted',
    'received',
    'documents_pending',
    'under_verification',
    'approved',
    'rejected',
    'waitlisted',
    'confirmed',
    'enrolled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Expand membership_role enum to include admissions_officer and accountant if not present
DO $$ BEGIN
  ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'admissions_officer';
  ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'accountant';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Student Core Identity
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  admission_number TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender student_gender NOT NULL DEFAULT 'prefer_not_to_say',
  blood_group TEXT,
  email TEXT,
  phone TEXT,
  photo_url TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  nationality TEXT DEFAULT 'Domestic',
  emergency_contact_name TEXT NOT NULL,
  emergency_contact_phone TEXT NOT NULL,
  emergency_contact_relationship TEXT NOT NULL,
  status student_status NOT NULL DEFAULT 'active',
  date_of_joining DATE NOT NULL DEFAULT CURRENT_DATE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_admission_number UNIQUE(institution_id, admission_number)
);

-- ==============================================================================
-- 3. Guardian & Family Management
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  relationship_default TEXT,
  occupation TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_guardian_phone UNIQUE(institution_id, phone)
);

CREATE TABLE IF NOT EXISTS public.student_guardians (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  is_emergency_contact BOOLEAN NOT NULL DEFAULT false,
  can_pickup BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_student_guardian UNIQUE(student_id, guardian_id)
);

-- ==============================================================================
-- 4. Academic Enrollments & Progression History
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_enrollments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  program_id UUID NOT NULL REFERENCES public.academic_programs(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE RESTRICT,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE SET NULL,
  roll_number TEXT,
  status enrollment_status NOT NULL DEFAULT 'enrolled',
  enrollment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  exit_date DATE,
  exit_reason TEXT,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_student_year_class UNIQUE(student_id, academic_year_id, class_id)
);

-- ==============================================================================
-- 5. Admissions Applications & Workflow
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.admission_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  application_number TEXT NOT NULL,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  program_id UUID NOT NULL REFERENCES public.academic_programs(id) ON DELETE RESTRICT,
  class_id UUID REFERENCES public.academic_classes(id) ON DELETE SET NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  date_of_birth DATE NOT NULL,
  gender student_gender NOT NULL DEFAULT 'prefer_not_to_say',
  blood_group TEXT,
  email TEXT,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  nationality TEXT DEFAULT 'Domestic',
  previous_school_name TEXT,
  previous_grade_or_score TEXT,
  primary_guardian_name TEXT NOT NULL,
  primary_guardian_relationship TEXT NOT NULL,
  primary_guardian_phone TEXT NOT NULL,
  primary_guardian_email TEXT,
  primary_guardian_occupation TEXT,
  secondary_guardian_name TEXT,
  secondary_guardian_relationship TEXT,
  secondary_guardian_phone TEXT,
  secondary_guardian_email TEXT,
  status admission_status NOT NULL DEFAULT 'submitted',
  internal_remarks TEXT,
  converted_student_id UUID REFERENCES public.students(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_application_number UNIQUE(institution_id, application_number)
);

CREATE TABLE IF NOT EXISTS public.admission_status_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  from_status admission_status,
  to_status admission_status NOT NULL,
  remarks TEXT,
  changed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 6. Student Documents & Verification
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  document_type document_type NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  verification_status document_verification_status NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ==============================================================================
-- 7. Indexes for Query Performance & Scoping
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_students_institution ON public.students(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_students_search ON public.students(institution_id, last_name, first_name);
CREATE INDEX IF NOT EXISTS idx_students_user ON public.students(user_id);
CREATE INDEX IF NOT EXISTS idx_guardians_institution ON public.guardians(institution_id);
CREATE INDEX IF NOT EXISTS idx_guardians_user ON public.guardians(user_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_student ON public.student_guardians(student_id);
CREATE INDEX IF NOT EXISTS idx_student_guardians_guardian ON public.student_guardians(guardian_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_student ON public.student_enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_student_enrollments_class ON public.student_enrollments(institution_id, academic_year_id, class_id);
CREATE INDEX IF NOT EXISTS idx_admission_applications_inst ON public.admission_applications(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_admission_applications_year ON public.admission_applications(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_student ON public.student_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_student_documents_app ON public.student_documents(application_id);

-- ==============================================================================
-- 8. Atomic Admission Conversion Stored Procedure
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.convert_admission_to_student(
  p_application_id UUID,
  p_admission_number TEXT,
  p_section_id UUID DEFAULT NULL,
  p_roll_number TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_app RECORD;
  v_student_id UUID;
  v_guardian_id UUID;
  v_sec_guardian_id UUID;
  v_caller_id UUID := auth.uid();
BEGIN
  -- 1. Fetch and lock application
  SELECT * INTO v_app
  FROM public.admission_applications
  WHERE id = p_application_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Admission application % not found.', p_application_id;
  END IF;

  IF v_app.status NOT IN ('approved', 'confirmed') THEN
    RAISE EXCEPTION 'Cannot convert application in % status. Must be approved or confirmed.', v_app.status;
  END IF;

  IF v_app.converted_student_id IS NOT NULL THEN
    RAISE EXCEPTION 'Application has already been converted to student %.', v_app.converted_student_id;
  END IF;

  -- 2. Verify caller has permission in target institution
  IF NOT public.has_institution_role(v_app.institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer']) THEN
    RAISE EXCEPTION 'Unauthorized: insufficient privileges to convert admission applications.';
  END IF;

  -- 3. Insert Student Record
  INSERT INTO public.students (
    institution_id,
    admission_number,
    first_name,
    middle_name,
    last_name,
    date_of_birth,
    gender,
    blood_group,
    email,
    phone,
    address,
    city,
    state,
    country,
    postal_code,
    nationality,
    emergency_contact_name,
    emergency_contact_phone,
    emergency_contact_relationship,
    status,
    date_of_joining,
    created_by
  ) VALUES (
    v_app.institution_id,
    p_admission_number,
    v_app.first_name,
    v_app.middle_name,
    v_app.last_name,
    v_app.date_of_birth,
    v_app.gender,
    v_app.blood_group,
    v_app.email,
    v_app.phone,
    v_app.address,
    v_app.city,
    v_app.state,
    v_app.country,
    v_app.postal_code,
    COALESCE(v_app.nationality, 'Domestic'),
    v_app.primary_guardian_name,
    v_app.primary_guardian_phone,
    v_app.primary_guardian_relationship,
    'active',
    CURRENT_DATE,
    v_caller_id
  )
  RETURNING id INTO v_student_id;

  -- 4. Insert or find Primary Guardian
  SELECT id INTO v_guardian_id
  FROM public.guardians
  WHERE institution_id = v_app.institution_id
    AND phone = v_app.primary_guardian_phone
  LIMIT 1;

  IF v_guardian_id IS NULL THEN
    INSERT INTO public.guardians (
      institution_id,
      first_name,
      last_name,
      phone,
      email,
      relationship_default,
      occupation,
      address,
      city,
      state,
      country,
      created_by
    ) VALUES (
      v_app.institution_id,
      v_app.primary_guardian_name,
      '',
      v_app.primary_guardian_phone,
      v_app.primary_guardian_email,
      v_app.primary_guardian_relationship,
      v_app.primary_guardian_occupation,
      v_app.address,
      v_app.city,
      v_app.state,
      v_app.country,
      v_caller_id
    )
    RETURNING id INTO v_guardian_id;
  END IF;

  -- Link Student and Primary Guardian
  INSERT INTO public.student_guardians (
    institution_id,
    student_id,
    guardian_id,
    relationship,
    is_primary,
    is_emergency_contact,
    can_pickup
  ) VALUES (
    v_app.institution_id,
    v_student_id,
    v_guardian_id,
    v_app.primary_guardian_relationship,
    true,
    true,
    true
  ) ON CONFLICT (student_id, guardian_id) DO NOTHING;

  -- Secondary Guardian if present
  IF v_app.secondary_guardian_name IS NOT NULL AND v_app.secondary_guardian_phone IS NOT NULL THEN
    SELECT id INTO v_sec_guardian_id
    FROM public.guardians
    WHERE institution_id = v_app.institution_id
      AND phone = v_app.secondary_guardian_phone
    LIMIT 1;

    IF v_sec_guardian_id IS NULL THEN
      INSERT INTO public.guardians (
        institution_id,
        first_name,
        last_name,
        phone,
        email,
        relationship_default,
        created_by
      ) VALUES (
        v_app.institution_id,
        v_app.secondary_guardian_name,
        '',
        v_app.secondary_guardian_phone,
        v_app.secondary_guardian_email,
        COALESCE(v_app.secondary_guardian_relationship, 'Guardian'),
        v_caller_id
      )
      RETURNING id INTO v_sec_guardian_id;
    END IF;

    INSERT INTO public.student_guardians (
      institution_id,
      student_id,
      guardian_id,
      relationship,
      is_primary,
      is_emergency_contact,
      can_pickup
    ) VALUES (
      v_app.institution_id,
      v_student_id,
      v_sec_guardian_id,
      COALESCE(v_app.secondary_guardian_relationship, 'Guardian'),
      false,
      false,
      true
    ) ON CONFLICT (student_id, guardian_id) DO NOTHING;
  END IF;

  -- 5. Create Initial Academic Enrollment
  IF v_app.class_id IS NOT NULL THEN
    INSERT INTO public.student_enrollments (
      institution_id,
      student_id,
      campus_id,
      academic_year_id,
      program_id,
      class_id,
      section_id,
      roll_number,
      status,
      enrollment_date,
      created_by
    ) VALUES (
      v_app.institution_id,
      v_student_id,
      v_app.campus_id,
      v_app.academic_year_id,
      v_app.program_id,
      v_app.class_id,
      p_section_id,
      p_roll_number,
      'enrolled',
      CURRENT_DATE,
      v_caller_id
    );
  END IF;

  -- 6. Associate pre-uploaded application documents with student
  UPDATE public.student_documents
  SET student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE application_id = p_application_id
    AND student_id IS NULL;

  -- 7. Update Application State
  UPDATE public.admission_applications
  SET status = 'enrolled',
      converted_student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE id = p_application_id;

  -- Record status history
  INSERT INTO public.admission_status_history (
    application_id,
    from_status,
    to_status,
    remarks,
    changed_by
  ) VALUES (
    p_application_id,
    v_app.status,
    'enrolled',
    'Application converted to student ' || p_admission_number,
    v_caller_id
  );

  -- Record Audit Log
  INSERT INTO public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_app.institution_id,
    v_caller_id,
    'admission.converted_to_student',
    'admission_applications',
    p_application_id,
    jsonb_build_object(
      'student_id', v_student_id,
      'admission_number', p_admission_number
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'admission_number', p_admission_number
  );
END;
$$;

-- ==============================================================================
-- 9. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_guardians ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admission_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_documents ENABLE ROW LEVEL SECURITY;

-- Helper to check if current user is an authorized guardian for student
CREATE OR REPLACE FUNCTION public.is_guardian_of_student(p_student_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, auth
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.student_guardians sg
    JOIN public.guardians g ON g.id = sg.guardian_id
    WHERE sg.student_id = p_student_id
      AND g.user_id = auth.uid()
  );
$$;

-- 9.1 Students Policies
CREATE POLICY "students_select_policy" ON public.students
  FOR SELECT
  USING (
    -- Institution Staff & Faculty
    public.is_institution_member(institution_id)
    AND (
      public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff'])
      -- Or the student themselves
      OR (user_id = auth.uid())
      -- Or authorized parent/guardian
      OR public.is_guardian_of_student(id)
    )
  );

CREATE POLICY "students_insert_policy" ON public.students
  FOR INSERT
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "students_update_policy" ON public.students
  FOR UPDATE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "students_delete_policy" ON public.students
  FOR DELETE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

-- 9.2 Guardians Policies
CREATE POLICY "guardians_select_policy" ON public.guardians
  FOR SELECT
  USING (
    public.is_institution_member(institution_id)
    AND (
      public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff'])
      OR (user_id = auth.uid())
    )
  );

CREATE POLICY "guardians_insert_policy" ON public.guardians
  FOR INSERT
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "guardians_update_policy" ON public.guardians
  FOR UPDATE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
    OR (user_id = auth.uid())
  );

-- 9.3 Student Guardians Link Policies
CREATE POLICY "student_guardians_select_policy" ON public.student_guardians
  FOR SELECT
  USING (
    public.is_institution_member(institution_id)
    AND (
      public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff'])
      OR public.is_guardian_of_student(student_id)
    )
  );

CREATE POLICY "student_guardians_insert_policy" ON public.student_guardians
  FOR INSERT
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "student_guardians_update_policy" ON public.student_guardians
  FOR UPDATE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

-- 9.4 Student Enrollments Policies
CREATE POLICY "student_enrollments_select_policy" ON public.student_enrollments
  FOR SELECT
  USING (
    public.is_institution_member(institution_id)
    AND (
      public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff'])
      OR public.is_guardian_of_student(student_id)
      OR EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid())
    )
  );

CREATE POLICY "student_enrollments_insert_policy" ON public.student_enrollments
  FOR INSERT
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin'])
  );

CREATE POLICY "student_enrollments_update_policy" ON public.student_enrollments
  FOR UPDATE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin'])
  );

-- 9.5 Admission Applications Policies
CREATE POLICY "admission_apps_select_policy" ON public.admission_applications
  FOR SELECT
  USING (
    public.is_institution_member(institution_id)
    AND public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "admission_apps_insert_policy" ON public.admission_applications
  FOR INSERT
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "admission_apps_update_policy" ON public.admission_applications
  FOR UPDATE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

-- 9.6 Admission Status History Policies
CREATE POLICY "admission_status_history_select" ON public.admission_status_history
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.admission_applications a
      WHERE a.id = application_id
        AND public.is_institution_member(a.institution_id)
        AND public.has_institution_role(a.institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
    )
  );

CREATE POLICY "admission_status_history_insert" ON public.admission_status_history
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admission_applications a
      WHERE a.id = application_id
        AND public.has_institution_role(a.institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
    )
  );

-- 9.7 Student Documents Policies
CREATE POLICY "student_documents_select_policy" ON public.student_documents
  FOR SELECT
  USING (
    public.is_institution_member(institution_id)
    AND (
      public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer', 'faculty', 'staff'])
      OR (student_id IS NOT NULL AND public.is_guardian_of_student(student_id))
      OR (student_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.students s WHERE s.id = student_id AND s.user_id = auth.uid()))
    )
  );

CREATE POLICY "student_documents_insert_policy" ON public.student_documents
  FOR INSERT
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );

CREATE POLICY "student_documents_update_policy" ON public.student_documents
  FOR UPDATE
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'admissions_officer'])
  );
