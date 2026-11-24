-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Migration: 20261120000000_student_identity_and_registration.sql
-- Milestone: Student Identity, Aadhaar & Parent/Guardian Registration Module
-- ==============================================================================

-- 1. Enums for Identity, Consent, and Guardian Lifecycle
DO $$ BEGIN
  CREATE TYPE identity_document_type AS ENUM (
    'masked_aadhaar',
    'birth_certificate',
    'passport',
    'ration_card',
    'school_leaving_certificate',
    'transfer_certificate',
    'national_id',
    'pan_card',
    'voter_id',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE identity_verification_status AS ENUM (
    'not_submitted',
    'submitted',
    'pending_verification',
    'verified',
    'rejected',
    'expired'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE consent_type AS ENUM (
    'registration_terms',
    'privacy_notice',
    'photo_media_publication',
    'non_essential_communications',
    'emergency_medical_treatment'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE admission_category AS ENUM (
    'general',
    'merit',
    'management',
    'sports',
    'sibling',
    'staff_ward',
    'ews_rte',
    'international',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE guardian_relationship_type AS ENUM (
    'father',
    'mother',
    'legal_guardian',
    'foster_parent',
    'grandparent',
    'sibling',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE emergency_contact_priority AS ENUM (
    'primary',
    'secondary'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Expand admission_status to include draft if not present
DO $$ BEGIN
  ALTER TYPE admission_status ADD VALUE IF NOT EXISTS 'draft';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Extend admission_applications and students with Personal & Academic Fields
-- ==============================================================================

ALTER TABLE public.admission_applications
  ADD COLUMN IF NOT EXISTS education_type TEXT,
  ADD COLUMN IF NOT EXISTS admission_category admission_category DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_tongue TEXT,
  ADD COLUMN IF NOT EXISTS second_language TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS caste_category TEXT,
  ADD COLUMN IF NOT EXISTS birthplace_city TEXT,
  ADD COLUMN IF NOT EXISTS birthplace_state TEXT,
  ADD COLUMN IF NOT EXISTS birthplace_country TEXT,
  ADD COLUMN IF NOT EXISTS identification_mark_1 TEXT,
  ADD COLUMN IF NOT EXISTS identification_mark_2 TEXT,
  ADD COLUMN IF NOT EXISTS medical_alerts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS special_needs JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS transport_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS transport_pickup_stop TEXT,
  ADD COLUMN IF NOT EXISTS transport_drop_stop TEXT,
  ADD COLUMN IF NOT EXISTS hostel_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hostel_room_preference TEXT,
  ADD COLUMN IF NOT EXISTS sibling_info JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS is_draft BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS draft_access_token TEXT;

ALTER TABLE public.students
  ADD COLUMN IF NOT EXISTS education_type TEXT,
  ADD COLUMN IF NOT EXISTS admission_category admission_category DEFAULT 'general',
  ADD COLUMN IF NOT EXISTS preferred_name TEXT,
  ADD COLUMN IF NOT EXISTS mother_tongue TEXT,
  ADD COLUMN IF NOT EXISTS second_language TEXT,
  ADD COLUMN IF NOT EXISTS religion TEXT,
  ADD COLUMN IF NOT EXISTS caste_category TEXT,
  ADD COLUMN IF NOT EXISTS birthplace_city TEXT,
  ADD COLUMN IF NOT EXISTS birthplace_state TEXT,
  ADD COLUMN IF NOT EXISTS birthplace_country TEXT,
  ADD COLUMN IF NOT EXISTS identification_mark_1 TEXT,
  ADD COLUMN IF NOT EXISTS identification_mark_2 TEXT,
  ADD COLUMN IF NOT EXISTS medical_alerts JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS special_needs JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS transport_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS hostel_required BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS sibling_info JSONB DEFAULT '[]'::jsonb;

-- Extend guardians table
ALTER TABLE public.guardians
  ADD COLUMN IF NOT EXISTS relationship_type guardian_relationship_type DEFAULT 'other',
  ADD COLUMN IF NOT EXISTS phone_secondary TEXT,
  ADD COLUMN IF NOT EXISTS employer TEXT,
  ADD COLUMN IF NOT EXISTS annual_income_range TEXT,
  ADD COLUMN IF NOT EXISTS education_qualification TEXT,
  ADD COLUMN IF NOT EXISTS workplace_address TEXT,
  ADD COLUMN IF NOT EXISTS preferred_communication_channel TEXT DEFAULT 'whatsapp',
  ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en',
  ADD COLUMN IF NOT EXISTS portal_access_required BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS phone_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS verification_status TEXT DEFAULT 'pending';

-- ==============================================================================
-- 3. Student Identity Documents Table
-- Strict Aadhaar & DPDP Compliance:
-- NEVER store unmasked 12-digit Aadhaar. Last 4 digits only!
-- Stored in private bucket with signed URLs.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_identity_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  guardian_id UUID REFERENCES public.guardians(id) ON DELETE CASCADE,
  document_type identity_document_type NOT NULL,
  masked_reference TEXT NOT NULL,
  document_file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  mime_type TEXT NOT NULL,
  issuing_authority TEXT,
  issue_date DATE,
  expiry_date DATE,
  verification_status identity_verification_status NOT NULL DEFAULT 'submitted',
  verification_notes TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_identity_doc_target CHECK (
    student_id IS NOT NULL OR application_id IS NOT NULL OR guardian_id IS NOT NULL
  ),
  -- STRICT COMPLIANCE: Raw 12-digit Aadhaar pattern prohibited!
  CONSTRAINT chk_no_unmasked_aadhaar CHECK (
    masked_reference !~ '^[0-9]{12}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_identity_docs_inst ON public.student_identity_documents(institution_id, verification_status);
CREATE INDEX IF NOT EXISTS idx_identity_docs_student ON public.student_identity_documents(student_id);
CREATE INDEX IF NOT EXISTS idx_identity_docs_app ON public.student_identity_documents(application_id);
CREATE INDEX IF NOT EXISTS idx_identity_docs_guardian ON public.student_identity_documents(guardian_id);

-- ==============================================================================
-- 4. Emergency Contacts & Authorized Pickups Table
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_emergency_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  priority emergency_contact_priority NOT NULL DEFAULT 'primary',
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone_primary TEXT NOT NULL,
  phone_secondary TEXT,
  email TEXT,
  is_authorized_pickup BOOLEAN NOT NULL DEFAULT false,
  pickup_id_type TEXT,
  pickup_id_masked_ref TEXT,
  pickup_photo_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_emergency_contact_target CHECK (
    student_id IS NOT NULL OR application_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_emergency_contacts_student ON public.student_emergency_contacts(student_id);
CREATE INDEX IF NOT EXISTS idx_emergency_contacts_app ON public.student_emergency_contacts(application_id);

-- ==============================================================================
-- 5. Student Consent Records Table (DPDP Act Compliant)
-- Mandatory Registration Terms, Privacy Notice, and Optional Consents with Withdrawal Log
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_consent_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.admission_applications(id) ON DELETE CASCADE,
  consent_type consent_type NOT NULL,
  granted BOOLEAN NOT NULL DEFAULT false,
  granted_by_name TEXT NOT NULL,
  granted_by_relationship TEXT NOT NULL,
  granted_by_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  granted_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  consent_version TEXT NOT NULL DEFAULT 'v1.0',
  ip_address TEXT,
  user_agent TEXT,
  withdrawn BOOLEAN NOT NULL DEFAULT false,
  withdrawn_at TIMESTAMPTZ,
  withdrawn_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  withdrawal_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_consent_target CHECK (
    student_id IS NOT NULL OR application_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_consent_records_student ON public.student_consent_records(student_id, consent_type);
CREATE INDEX IF NOT EXISTS idx_consent_records_app ON public.student_consent_records(application_id, consent_type);

-- ==============================================================================
-- 6. Identity Document Audit Logs Table
-- Full audit trail on every identity document view, download, verification, or rejection
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.identity_document_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  document_id UUID NOT NULL REFERENCES public.student_identity_documents(id) ON DELETE CASCADE,
  actor_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action TEXT NOT NULL, -- 'view', 'download', 'verify', 'reject', 'delete'
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_identity_audit_doc ON public.identity_document_audit_logs(document_id);
CREATE INDEX IF NOT EXISTS idx_identity_audit_actor ON public.identity_document_audit_logs(actor_user_id);

-- ==============================================================================
-- 7. Row Level Security Policies
-- ==============================================================================

ALTER TABLE public.student_identity_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_consent_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_document_audit_logs ENABLE ROW LEVEL SECURITY;

-- 7.1 Student Identity Documents RLS:
-- Institution Admins and Admissions Officers have access
CREATE POLICY "Admins and admissions officers have full access to identity docs"
  ON public.student_identity_documents
  FOR ALL
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'admissions_officer'])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'admissions_officer'])
  );

-- Guardians can view documents of their own student or application
CREATE POLICY "Guardians can view identity docs of their children"
  ON public.student_identity_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
        AND sg.student_id = student_identity_documents.student_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admission_applications app
      WHERE app.id = student_identity_documents.application_id
        AND app.created_by = auth.uid()
    )
  );

-- Guardians can insert identity docs for applications they created
CREATE POLICY "Guardians can upload identity docs for their applications"
  ON public.student_identity_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admission_applications app
      WHERE app.id = student_identity_documents.application_id
        AND app.created_by = auth.uid()
    )
  );

-- Students can view their own identity docs
CREATE POLICY "Students can view their own identity docs"
  ON public.student_identity_documents
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.id = student_identity_documents.student_id
        AND s.user_id = auth.uid()
    )
  );

-- 7.2 Emergency Contacts RLS:
CREATE POLICY "Admins have full access to emergency contacts"
  ON public.student_emergency_contacts
  FOR ALL
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'admissions_officer'])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'admissions_officer'])
  );

CREATE POLICY "Guardians can view emergency contacts for their students"
  ON public.student_emergency_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
        AND sg.student_id = student_emergency_contacts.student_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admission_applications app
      WHERE app.id = student_emergency_contacts.application_id
        AND app.created_by = auth.uid()
    )
  );

CREATE POLICY "Guardians can manage emergency contacts for their applications"
  ON public.student_emergency_contacts
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admission_applications app
      WHERE app.id = student_emergency_contacts.application_id
        AND app.created_by = auth.uid()
    )
  );

-- Teachers can view emergency contacts of their students
CREATE POLICY "Teachers can view emergency contacts of their enrolled students"
  ON public.student_emergency_contacts
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_enrollments se
      JOIN public.timetable_entries te ON te.class_id = se.class_id
      JOIN public.staff_profiles sp ON sp.id = te.faculty_id
      WHERE sp.user_id = auth.uid()
        AND se.student_id = student_emergency_contacts.student_id
        AND se.status = 'enrolled'
    )
  );

-- 7.3 Consent Records RLS:
CREATE POLICY "Admins have full access to consent records"
  ON public.student_consent_records
  FOR ALL
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'admissions_officer'])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin', 'admissions_officer'])
  );

CREATE POLICY "Guardians can view consent records for their children"
  ON public.student_consent_records
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
        AND sg.student_id = student_consent_records.student_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.admission_applications app
      WHERE app.id = student_consent_records.application_id
        AND app.created_by = auth.uid()
    )
  );

CREATE POLICY "Guardians can insert consents for their applications"
  ON public.student_consent_records
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.admission_applications app
      WHERE app.id = student_consent_records.application_id
        AND app.created_by = auth.uid()
    )
  );

CREATE POLICY "Guardians can update consents (withdraw) for their children"
  ON public.student_consent_records
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
        AND sg.student_id = student_consent_records.student_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
        AND sg.student_id = student_consent_records.student_id
    )
  );

-- 7.4 Identity Document Audit Logs RLS:
CREATE POLICY "Admins can view identity document audit logs"
  ON public.identity_document_audit_logs
  FOR SELECT
  USING (
    public.has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );

CREATE POLICY "Authenticated users can create identity document audit logs"
  ON public.identity_document_audit_logs
  FOR INSERT
  WITH CHECK (
    auth.uid() = actor_user_id
  );

-- ==============================================================================
-- 8. Enhanced Atomic Admission Conversion Stored Procedure
-- Transfers personal, identity docs, emergency contacts, and consent records
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

  -- 3. Insert Student Record with comprehensive personal and category info
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
    education_type,
    admission_category,
    preferred_name,
    mother_tongue,
    second_language,
    religion,
    caste_category,
    birthplace_city,
    birthplace_state,
    birthplace_country,
    identification_mark_1,
    identification_mark_2,
    medical_alerts,
    special_needs,
    transport_required,
    hostel_required,
    sibling_info,
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
    v_app.education_type,
    COALESCE(v_app.admission_category, 'general'),
    v_app.preferred_name,
    v_app.mother_tongue,
    v_app.second_language,
    v_app.religion,
    v_app.caste_category,
    v_app.birthplace_city,
    v_app.birthplace_state,
    v_app.birthplace_country,
    v_app.identification_mark_1,
    v_app.identification_mark_2,
    COALESCE(v_app.medical_alerts, '{}'::jsonb),
    COALESCE(v_app.special_needs, '{}'::jsonb),
    COALESCE(v_app.transport_required, false),
    COALESCE(v_app.hostel_required, false),
    COALESCE(v_app.sibling_info, '[]'::jsonb),
    'active',
    CURRENT_DATE,
    v_caller_id
  )
  RETURNING id INTO v_student_id;

  -- 4. Check or Create Primary Guardian
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
      split_part(v_app.primary_guardian_name, ' ', 1),
      COALESCE(NULLIF(substr(v_app.primary_guardian_name, length(split_part(v_app.primary_guardian_name, ' ', 1)) + 2), ''), split_part(v_app.primary_guardian_name, ' ', 1)),
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

  -- Link Primary Guardian to Student
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
  )
  ON CONFLICT (student_id, guardian_id) DO NOTHING;

  -- 5. Link Secondary Guardian if provided
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
        address,
        city,
        state,
        country,
        created_by
      ) VALUES (
        v_app.institution_id,
        split_part(v_app.secondary_guardian_name, ' ', 1),
        COALESCE(NULLIF(substr(v_app.secondary_guardian_name, length(split_part(v_app.secondary_guardian_name, ' ', 1)) + 2), ''), split_part(v_app.secondary_guardian_name, ' ', 1)),
        v_app.secondary_guardian_phone,
        v_app.secondary_guardian_email,
        COALESCE(v_app.secondary_guardian_relationship, 'Guardian'),
        v_app.address,
        v_app.city,
        v_app.state,
        v_app.country,
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
      true,
      true
    )
    ON CONFLICT (student_id, guardian_id) DO NOTHING;
  END IF;

  -- 6. Create Academic Enrollment
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

  -- 7. Link Identity Documents from Application to Student
  UPDATE public.student_identity_documents
  SET student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE application_id = p_application_id;

  -- Also link classic student_documents if any
  UPDATE public.student_documents
  SET student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE application_id = p_application_id;

  -- 8. Link Emergency Contacts & Consents from Application to Student
  UPDATE public.student_emergency_contacts
  SET student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE application_id = p_application_id;

  UPDATE public.student_consent_records
  SET student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE application_id = p_application_id;

  -- 9. Update Application Status to 'enrolled'
  UPDATE public.admission_applications
  SET status = 'enrolled',
      converted_student_id = v_student_id,
      updated_at = timezone('utc', now())
  WHERE id = p_application_id;

  -- 10. Record Status History
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
    format('Converted to student record. Admission Number: %s', p_admission_number),
    v_caller_id
  );

  RETURN jsonb_build_object(
    'success', true,
    'student_id', v_student_id,
    'admission_number', p_admission_number,
    'primary_guardian_id', v_guardian_id
  );
END;
$$;
