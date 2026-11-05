-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Migration: 20261105030000_staff_faculty.sql
-- Milestone 4: Staff & Faculty Management System
-- ==============================================================================

-- 1. Enums for Staff, Employment, Allocation & Invitations
DO $$ BEGIN
  CREATE TYPE staff_category AS ENUM (
    'teaching',
    'non_teaching',
    'administrative',
    'technical',
    'transport',
    'support'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE employment_type AS ENUM (
    'full_time',
    'part_time',
    'contract',
    'adjunct',
    'visiting'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE employment_status AS ENUM (
    'active',
    'probation',
    'notice_period',
    'suspended',
    'terminated',
    'resigned',
    'retired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_document_type AS ENUM (
    'qualification',
    'experience',
    'identity',
    'contract',
    'appointment_letter',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE invitation_status AS ENUM (
    'pending',
    'accepted',
    'expired',
    'revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Expand membership_role enum with hr_administrator and department_head
DO $$ BEGIN
  ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'hr_administrator';
  ALTER TYPE membership_role ADD VALUE IF NOT EXISTS 'department_head';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Staff Profiles (Central Staff Identity)
-- Keeps staff demographic and employment identity distinct from user auth credentials.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  employee_id TEXT NOT NULL,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  photo_url TEXT,
  date_of_birth DATE NOT NULL,
  gender student_gender NOT NULL DEFAULT 'prefer_not_to_say',
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT,
  postal_code TEXT,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  emergency_contact_relationship TEXT,
  joining_date DATE NOT NULL,
  staff_category staff_category NOT NULL DEFAULT 'teaching',
  designation TEXT NOT NULL,
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  employment_type employment_type NOT NULL DEFAULT 'full_time',
  employment_status employment_status NOT NULL DEFAULT 'active',
  qualification TEXT,
  years_of_experience NUMERIC(4, 1) DEFAULT 0,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_employee_id UNIQUE (institution_id, employee_id),
  CONSTRAINT uq_institution_staff_email UNIQUE (institution_id, email)
);

-- ==============================================================================
-- 3. Staff Employment History & Transfers
-- Preserves complete employment timeline across designations, departments, campuses.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff_employments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  designation TEXT NOT NULL,
  employment_type employment_type NOT NULL DEFAULT 'full_time',
  employment_status employment_status NOT NULL DEFAULT 'active',
  start_date DATE NOT NULL,
  end_date DATE,
  reporting_manager_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_employment_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ==============================================================================
-- 4. Faculty Allocations (Academic Structure Assignments)
-- Connects faculty to departments, programs, classes, sections, and subjects.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.faculty_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  program_id UUID NOT NULL REFERENCES public.academic_programs(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  is_class_teacher BOOLEAN NOT NULL DEFAULT false,
  is_coordinator BOOLEAN NOT NULL DEFAULT false,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_faculty_subject_alloc UNIQUE (institution_id, academic_year_id, class_id, section_id, subject_id, staff_id)
);

-- Partial index: only one active class teacher per section in an academic year
CREATE UNIQUE INDEX IF NOT EXISTS uq_active_section_class_teacher
ON public.faculty_allocations(academic_year_id, section_id)
WHERE is_class_teacher = true AND status = 'active' AND section_id IS NOT NULL;

-- ==============================================================================
-- 5. Staff Documents & Verification
-- Private, tenant-scoped compliance and qualification documents.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  document_type staff_document_type NOT NULL,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  verification_status document_verification_status NOT NULL DEFAULT 'pending',
  verification_notes TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 6. Staff Onboarding & Access Invitations
-- Secure token-based invitation workflow with expiry.
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.staff_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  role membership_role NOT NULL DEFAULT 'staff',
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  invitation_token TEXT NOT NULL UNIQUE,
  status invitation_status NOT NULL DEFAULT 'pending',
  expires_at TIMESTAMPTZ NOT NULL,
  accepted_at TIMESTAMPTZ,
  invited_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 7. Indices for Performance & Multi-Tenant Query Scoping
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_staff_profiles_institution_id ON public.staff_profiles(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_employee_id ON public.staff_profiles(employee_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_user_id ON public.staff_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_department_id ON public.staff_profiles(department_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_campus_id ON public.staff_profiles(campus_id);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_category ON public.staff_profiles(staff_category);
CREATE INDEX IF NOT EXISTS idx_staff_profiles_status ON public.staff_profiles(employment_status);

CREATE INDEX IF NOT EXISTS idx_staff_employments_staff_id ON public.staff_employments(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_employments_institution_id ON public.staff_employments(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_employments_dates ON public.staff_employments(start_date, end_date);

CREATE INDEX IF NOT EXISTS idx_faculty_allocations_staff_id ON public.faculty_allocations(staff_id);
CREATE INDEX IF NOT EXISTS idx_faculty_allocations_academic_year ON public.faculty_allocations(academic_year_id);
CREATE INDEX IF NOT EXISTS idx_faculty_allocations_class_id ON public.faculty_allocations(class_id);
CREATE INDEX IF NOT EXISTS idx_faculty_allocations_section_id ON public.faculty_allocations(section_id);
CREATE INDEX IF NOT EXISTS idx_faculty_allocations_subject_id ON public.faculty_allocations(subject_id);

CREATE INDEX IF NOT EXISTS idx_staff_documents_staff_id ON public.staff_documents(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_institution_id ON public.staff_documents(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_documents_verification ON public.staff_documents(verification_status);

CREATE INDEX IF NOT EXISTS idx_staff_invitations_token ON public.staff_invitations(invitation_token);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_institution_id ON public.staff_invitations(institution_id);
CREATE INDEX IF NOT EXISTS idx_staff_invitations_status ON public.staff_invitations(status);

-- ==============================================================================
-- 8. Stored Procedures & Atomic Functions
-- ==============================================================================

-- 8.1 Atomic Staff Invitation Acceptance
CREATE OR REPLACE FUNCTION public.accept_staff_invitation(
  p_token TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invitation RECORD;
  v_membership_id UUID;
  v_result JSONB;
BEGIN
  -- 1. Find and validate invitation
  SELECT * INTO v_invitation
  FROM public.staff_invitations
  WHERE invitation_token = p_token
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid invitation token.' USING ERRCODE = '20001';
  END IF;

  IF v_invitation.status != 'pending' THEN
    RAISE EXCEPTION 'Invitation is no longer pending (current status: %).', v_invitation.status USING ERRCODE = '20002';
  END IF;

  IF v_invitation.expires_at < timezone('utc', now()) THEN
    UPDATE public.staff_invitations
    SET status = 'expired', updated_at = timezone('utc', now())
    WHERE id = v_invitation.id;
    RAISE EXCEPTION 'Invitation has expired.' USING ERRCODE = '20003';
  END IF;

  -- 2. Create or reactivate institution membership
  INSERT INTO public.institution_memberships (
    institution_id,
    user_id,
    role,
    status,
    department
  ) VALUES (
    v_invitation.institution_id,
    p_user_id,
    v_invitation.role,
    'active',
    (SELECT name FROM public.academic_departments WHERE id = v_invitation.department_id)
  )
  ON CONFLICT (institution_id, user_id) DO UPDATE SET
    role = EXCLUDED.role,
    status = 'active',
    updated_at = timezone('utc', now())
  RETURNING id INTO v_membership_id;

  -- 3. Link staff profile to user_id if attached
  IF v_invitation.staff_id IS NOT NULL THEN
    UPDATE public.staff_profiles
    SET user_id = p_user_id, updated_at = timezone('utc', now())
    WHERE id = v_invitation.staff_id
      AND institution_id = v_invitation.institution_id;
  END IF;

  -- 4. Mark invitation as accepted
  UPDATE public.staff_invitations
  SET
    status = 'accepted',
    accepted_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = v_invitation.id;

  -- 5. Audit log
  INSERT INTO public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_invitation.institution_id,
    p_user_id,
    'staff_invitation.accepted',
    'staff_invitations',
    v_invitation.id::text,
    jsonb_build_object(
      'membership_id', v_membership_id,
      'role', v_invitation.role,
      'staff_id', v_invitation.staff_id
    )
  );

  v_result := jsonb_build_object(
    'success', true,
    'membership_id', v_membership_id,
    'institution_id', v_invitation.institution_id,
    'role', v_invitation.role,
    'staff_id', v_invitation.staff_id
  );

  RETURN v_result;
END;
$$;

-- ==============================================================================
-- 9. Row Level Security (RLS) Policies
-- ==============================================================================

-- Enable RLS on all Milestone 4 tables
ALTER TABLE public.staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_employments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faculty_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invitations ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9.1 staff_profiles Policies
-- ------------------------------------------------------------------------------

-- SELECT: Staff, faculty, and admins can view staff within their institution; staff can view self
CREATE POLICY rls_staff_profiles_select ON public.staff_profiles
FOR SELECT USING (
  -- Rule 1: Authenticated member of the same institution with viewing privileges
  (public.is_institution_member(institution_id) AND (
    public.has_institution_role(institution_id, ARRAY[
      'owner',
      'admin',
      'academic_admin',
      'hr_administrator',
      'department_head',
      'faculty',
      'accountant',
      'staff',
      'admissions_officer'
    ]::membership_role[])
  ))
  OR
  -- Rule 2: Staff member themselves
  (user_id IS NOT NULL AND user_id = auth.uid())
);

-- INSERT: Authorized administrators / HR
CREATE POLICY rls_staff_profiles_insert ON public.staff_profiles
FOR INSERT WITH CHECK (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

-- UPDATE: Authorized administrators / HR. Faculty cannot modify their own record.
CREATE POLICY rls_staff_profiles_update ON public.staff_profiles
FOR UPDATE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

-- DELETE: Owner / Admin only
CREATE POLICY rls_staff_profiles_delete ON public.staff_profiles
FOR DELETE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin']::membership_role[])
);

-- ------------------------------------------------------------------------------
-- 9.2 staff_employments Policies
-- ------------------------------------------------------------------------------

CREATE POLICY rls_staff_employments_select ON public.staff_employments
FOR SELECT USING (
  (public.is_institution_member(institution_id) AND (
    public.has_institution_role(institution_id, ARRAY[
      'owner',
      'admin',
      'hr_administrator',
      'department_head',
      'academic_admin'
    ]::membership_role[])
  ))
  OR
  (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
);

CREATE POLICY rls_staff_employments_insert ON public.staff_employments
FOR INSERT WITH CHECK (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

CREATE POLICY rls_staff_employments_update ON public.staff_employments
FOR UPDATE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

CREATE POLICY rls_staff_employments_delete ON public.staff_employments
FOR DELETE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin']::membership_role[])
);

-- ------------------------------------------------------------------------------
-- 9.3 faculty_allocations Policies
-- ------------------------------------------------------------------------------

CREATE POLICY rls_faculty_allocations_select ON public.faculty_allocations
FOR SELECT USING (
  public.is_institution_member(institution_id)
);

CREATE POLICY rls_faculty_allocations_insert ON public.faculty_allocations
FOR INSERT WITH CHECK (
  public.has_institution_role(institution_id, ARRAY[
    'owner',
    'admin',
    'academic_admin',
    'department_head'
  ]::membership_role[])
);

CREATE POLICY rls_faculty_allocations_update ON public.faculty_allocations
FOR UPDATE USING (
  public.has_institution_role(institution_id, ARRAY[
    'owner',
    'admin',
    'academic_admin',
    'department_head'
  ]::membership_role[])
);

CREATE POLICY rls_faculty_allocations_delete ON public.faculty_allocations
FOR DELETE USING (
  public.has_institution_role(institution_id, ARRAY[
    'owner',
    'admin',
    'academic_admin',
    'department_head'
  ]::membership_role[])
);

-- ------------------------------------------------------------------------------
-- 9.4 staff_documents Policies
-- ------------------------------------------------------------------------------

CREATE POLICY rls_staff_documents_select ON public.staff_documents
FOR SELECT USING (
  (public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[]))
  OR
  (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
);

CREATE POLICY rls_staff_documents_insert ON public.staff_documents
FOR INSERT WITH CHECK (
  (public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[]))
  OR
  (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
);

CREATE POLICY rls_staff_documents_update ON public.staff_documents
FOR UPDATE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

CREATE POLICY rls_staff_documents_delete ON public.staff_documents
FOR DELETE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin']::membership_role[])
);

-- ------------------------------------------------------------------------------
-- 9.5 staff_invitations Policies
-- ------------------------------------------------------------------------------

CREATE POLICY rls_staff_invitations_select ON public.staff_invitations
FOR SELECT USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
  OR
  (email = (SELECT email FROM public.profiles WHERE id = auth.uid()))
);

CREATE POLICY rls_staff_invitations_insert ON public.staff_invitations
FOR INSERT WITH CHECK (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

CREATE POLICY rls_staff_invitations_update ON public.staff_invitations
FOR UPDATE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'hr_administrator']::membership_role[])
);

CREATE POLICY rls_staff_invitations_delete ON public.staff_invitations
FOR DELETE USING (
  public.has_institution_role(institution_id, ARRAY['owner', 'admin']::membership_role[])
);
