-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Authoritative Supabase Migration: 20261105000000_initial_schema.sql
-- Multi-Tenant Database Architecture, Role-Based Access Control, and Hardened RLS
-- ==============================================================================

-- 1. Enable Required Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Domain Enums
DO $$ BEGIN
  CREATE TYPE institution_type AS ENUM (
    'school',
    'junior_college',
    'degree_college',
    'engineering_college',
    'university'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE institution_status AS ENUM (
    'active',
    'pending_verification',
    'suspended',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_role AS ENUM (
    'owner',
    'admin',
    'academic_admin',
    'faculty',
    'staff',
    'student',
    'parent'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE membership_status AS ENUM (
    'active',
    'invited',
    'suspended',
    'revoked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE term_system AS ENUM (
    'semester',
    'trimester',
    'annual'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 3. Core Tables
-- ==============================================================================

-- 3.1 User Profiles (linked 1:1 to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.2 Institutions (The Multi-Tenant Root Entity)
CREATE TABLE IF NOT EXISTS public.institutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  code TEXT NOT NULL UNIQUE,
  type institution_type NOT NULL,
  status institution_status NOT NULL DEFAULT 'active',
  logo_url TEXT,
  website TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL,
  postal_code TEXT,
  settings JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- 3.3 Institution Memberships (Single Identity <-> Multi-Tenant Affiliations)
CREATE TABLE IF NOT EXISTS public.institution_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role membership_role NOT NULL DEFAULT 'student',
  permissions TEXT[] DEFAULT '{}',
  status membership_status NOT NULL DEFAULT 'active',
  title TEXT,
  department TEXT,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_institution_member UNIQUE(institution_id, user_id)
);

-- 3.4 Campuses (Multi-campus hierarchy per institution)
CREATE TABLE IF NOT EXISTS public.campuses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT false,
  address TEXT,
  city TEXT NOT NULL,
  state TEXT NOT NULL,
  country TEXT NOT NULL,
  postal_code TEXT,
  phone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_institution_campus_code UNIQUE(institution_id, code)
);

-- 3.5 Academic Years & Terms
CREATE TABLE IF NOT EXISTS public.academic_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  term_system term_system NOT NULL DEFAULT 'annual',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_institution_academic_year_code UNIQUE(institution_id, code),
  CONSTRAINT chk_academic_year_dates CHECK (start_date < end_date)
);

CREATE TABLE IF NOT EXISTS public.academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_academic_term_code UNIQUE(academic_year_id, code),
  CONSTRAINT chk_term_dates CHECK (start_date < end_date)
);

-- 3.6 Audit Logs (Immutable, Tamper-Resistant Security Ledger)
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ==============================================================================
-- 4. Indices for Performance & Multi-Tenant Query Scoping
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_institutions_slug ON public.institutions(slug);
CREATE INDEX IF NOT EXISTS idx_institutions_status ON public.institutions(status);

CREATE INDEX IF NOT EXISTS idx_memberships_user_id ON public.institution_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_institution_id ON public.institution_memberships(institution_id);
CREATE INDEX IF NOT EXISTS idx_memberships_status ON public.institution_memberships(status);
CREATE INDEX IF NOT EXISTS idx_memberships_role ON public.institution_memberships(role);

CREATE INDEX IF NOT EXISTS idx_campuses_institution_id ON public.campuses(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_years_institution_id ON public.academic_years(institution_id);
CREATE INDEX IF NOT EXISTS idx_academic_terms_institution_id ON public.academic_terms(institution_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_institution_id ON public.audit_logs(institution_id, created_at DESC);

-- ==============================================================================
-- 5. Helper Functions for Security and Access Control (SECURITY DEFINER)
-- ==============================================================================

-- 5.1 Helper: Get all active institution IDs for current authenticated caller
CREATE OR REPLACE FUNCTION public.get_user_institution_ids()
RETURNS TABLE (institution_id UUID)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.institution_id
  FROM public.institution_memberships m
  WHERE m.user_id = auth.uid()
    AND m.status = 'active';
$$;

-- 5.2 Helper: Check if caller holds specific active roles in target institution
CREATE OR REPLACE FUNCTION public.has_institution_role(
  p_institution_id UUID,
  p_roles membership_role[]
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships m
    WHERE m.institution_id = p_institution_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
      AND m.role = ANY(p_roles)
  );
$$;

-- 5.3 Helper: Check if caller is an active member in target institution
CREATE OR REPLACE FUNCTION public.is_institution_member(
  p_institution_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships m
    WHERE m.institution_id = p_institution_id
      AND m.user_id = auth.uid()
      AND m.status = 'active'
  );
$$;

-- 5.4 Helper: Check if caller is specifically an active OWNER of the institution
CREATE OR REPLACE FUNCTION public.is_institution_owner(
  p_institution_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships m
    WHERE m.institution_id = p_institution_id
      AND m.user_id = auth.uid()
      AND m.role = 'owner'
      AND m.status = 'active'
  );
$$;

-- 5.5 Helper: Check if target user shares at least one active institution with caller
CREATE OR REPLACE FUNCTION public.shares_active_institution_with(
  p_target_user_id UUID
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.institution_memberships m1
    JOIN public.institution_memberships m2 ON m1.institution_id = m2.institution_id
    WHERE m1.user_id = auth.uid()
      AND m1.status = 'active'
      AND m2.user_id = p_target_user_id
      AND m2.status = 'active'
  );
$$;

-- 5.6 Helper: Record tamper-resistant audit event
CREATE OR REPLACE FUNCTION public.log_institution_audit_event(
  p_institution_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    p_institution_id,
    auth.uid(),
    p_action,
    p_entity_type,
    p_entity_id,
    p_metadata
  )
  RETURNING id INTO v_log_id;

  RETURN v_log_id;
END;
$$;

-- ==============================================================================
-- 6. Atomic Onboarding Stored Procedure
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.create_institution_with_owner(
  p_name TEXT,
  p_slug TEXT,
  p_code TEXT,
  p_type institution_type,
  p_city TEXT,
  p_state TEXT,
  p_country TEXT,
  p_email TEXT DEFAULT NULL,
  p_phone TEXT DEFAULT NULL,
  p_website TEXT DEFAULT NULL,
  p_address TEXT DEFAULT NULL,
  p_postal_code TEXT DEFAULT NULL,
  p_campus_name TEXT DEFAULT 'Main Campus',
  p_campus_code TEXT DEFAULT 'MAIN',
  p_ay_name TEXT DEFAULT 'Academic Year 2026-2027',
  p_ay_code TEXT DEFAULT 'AY2026-27',
  p_ay_start DATE DEFAULT '2026-06-01',
  p_ay_end DATE DEFAULT '2027-05-31',
  p_term_system term_system DEFAULT 'annual'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_institution_id UUID;
  v_campus_id UUID;
  v_academic_year_id UUID;
  v_institution_record RECORD;
BEGIN
  -- Obtain authenticated caller ID
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required to create an institution';
  END IF;

  -- Ensure profile exists
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = v_user_id) THEN
    INSERT INTO public.profiles (id, email, full_name)
    SELECT u.id, u.email, COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1))
    FROM auth.users u
    WHERE u.id = v_user_id;
  END IF;

  -- 1. Create Institution
  INSERT INTO public.institutions (
    name, slug, code, type, status,
    email, phone, website, address,
    city, state, country, postal_code,
    settings
  ) VALUES (
    p_name, lower(trim(p_slug)), upper(trim(p_code)), p_type, 'active',
    p_email, p_phone, p_website, p_address,
    p_city, p_state, p_country, p_postal_code,
    jsonb_build_object('academicTermType', p_term_system)
  )
  RETURNING id INTO v_institution_id;

  -- 2. Assign Caller as OWNER in Institution Memberships
  INSERT INTO public.institution_memberships (
    institution_id,
    user_id,
    role,
    status,
    title,
    joined_at
  ) VALUES (
    v_institution_id,
    v_user_id,
    'owner',
    'active',
    'Institution Administrator & Founder',
    timezone('utc', now())
  );

  -- 3. Create Default Primary Campus
  INSERT INTO public.campuses (
    institution_id,
    name,
    code,
    is_primary,
    address,
    city,
    state,
    country,
    postal_code,
    phone,
    email
  ) VALUES (
    v_institution_id,
    p_campus_name,
    upper(trim(p_campus_code)),
    true,
    p_address,
    p_city,
    p_state,
    p_country,
    p_postal_code,
    p_phone,
    p_email
  )
  RETURNING id INTO v_campus_id;

  -- 4. Create Initial Academic Year
  INSERT INTO public.academic_years (
    institution_id,
    name,
    code,
    start_date,
    end_date,
    is_current,
    term_system
  ) VALUES (
    v_institution_id,
    p_ay_name,
    upper(trim(p_ay_code)),
    p_ay_start,
    p_ay_end,
    true,
    p_term_system
  )
  RETURNING id INTO v_academic_year_id;

  -- 5. Record Audit Log
  INSERT INTO public.audit_logs (
    institution_id,
    actor_user_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    v_institution_id,
    v_user_id,
    'institution.created',
    'institution',
    v_institution_id::text,
    jsonb_build_object(
      'name', p_name,
      'code', p_code,
      'type', p_type,
      'campus_id', v_campus_id,
      'academic_year_id', v_academic_year_id
    )
  );

  -- Return payload
  SELECT id, name, slug, code, type, status, created_at
  INTO v_institution_record
  FROM public.institutions
  WHERE id = v_institution_id;

  RETURN jsonb_build_object(
    'success', true,
    'institution_id', v_institution_id,
    'institution', row_to_json(v_institution_record),
    'campus_id', v_campus_id,
    'academic_year_id', v_academic_year_id
  );
END;
$$;

-- ==============================================================================
-- 7. Trigger: Auto-create Profile on User Signup
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
    updated_at = timezone('utc', now());
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT OR UPDATE OF email, raw_user_meta_data ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ==============================================================================
-- 8. HARDENED ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.institution_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campuses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_years ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 8.1 Profiles Policies
-- Non-recursive profile read: Self OR shares active institution membership
CREATE POLICY "profiles_select_policy" ON public.profiles
  FOR SELECT TO authenticated
  USING (
    id = auth.uid() OR public.shares_active_institution_with(id)
  );

-- Users can update only their own profile
CREATE POLICY "profiles_update_policy" ON public.profiles
  FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- 8.2 Institutions Policies
-- Users can view institutions where they hold active membership
CREATE POLICY "institutions_select_policy" ON public.institutions
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

-- Direct client INSERT into institutions is forbidden.
-- Institutions must be created via atomic create_institution_with_owner() or service_role.
CREATE POLICY "institutions_insert_policy" ON public.institutions
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- Only owners and admins can update an institution's details
CREATE POLICY "institutions_update_policy" ON public.institutions
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- Only owners can archive/delete an institution
CREATE POLICY "institutions_delete_policy" ON public.institutions
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(id, ARRAY['owner'::membership_role])
  );

-- 8.3 Institution Memberships Policies
-- Members can view memberships of their own institution
CREATE POLICY "memberships_select_policy" ON public.institution_memberships
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

-- Insert policy with privilege boundary protections:
-- - Must be owner or admin
-- - Only an owner can grant the 'owner' role
-- - User cannot insert a membership for themselves (prevents self-invitation/assignment)
CREATE POLICY "memberships_insert_policy" ON public.institution_memberships
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
    AND
    (role != 'owner'::membership_role OR public.is_institution_owner(institution_id))
    AND
    (user_id != auth.uid())
  );

-- Update policy with privilege boundary protections:
-- - Admins cannot elevate anyone or themselves to owner
-- - Admins cannot mutate or demote an owner's record
-- - Admins cannot alter their own membership record (prevents self-escalation)
CREATE POLICY "memberships_update_policy" ON public.institution_memberships
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
    AND
    (role != 'owner'::membership_role OR public.is_institution_owner(institution_id))
    AND
    (user_id != auth.uid() OR public.is_institution_owner(institution_id))
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
    AND
    (role != 'owner'::membership_role OR public.is_institution_owner(institution_id))
    AND
    (user_id != auth.uid() OR public.is_institution_owner(institution_id))
  );

-- Delete policy: Only owner can delete memberships, and owner cannot delete themselves
CREATE POLICY "memberships_delete_policy" ON public.institution_memberships
  FOR DELETE TO authenticated
  USING (
    public.is_institution_owner(institution_id)
    AND
    user_id != auth.uid()
  );

-- 8.4 Campuses Policies
CREATE POLICY "campuses_select_policy" ON public.campuses
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "campuses_insert_policy" ON public.campuses
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

CREATE POLICY "campuses_update_policy" ON public.campuses
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

CREATE POLICY "campuses_delete_policy" ON public.campuses
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- 8.5 Academic Years & Terms Policies
CREATE POLICY "academic_years_select_policy" ON public.academic_years
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_years_insert_policy" ON public.academic_years
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_years_update_policy" ON public.academic_years
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_years_delete_policy" ON public.academic_years
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

CREATE POLICY "academic_terms_select_policy" ON public.academic_terms
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_terms_modify_policy" ON public.academic_terms
  FOR ALL TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

-- 8.6 Audit Logs Policies
-- Only owners and admins can view audit logs
CREATE POLICY "audit_logs_select_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- Direct client INSERT into audit logs is forbidden.
-- Audit logs must only be written by system functions / triggers (log_institution_audit_event).
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (false);

-- No UPDATE or DELETE policies are declared.
-- Row Level Security denies all UPDATE and DELETE requests on audit_logs by default.
