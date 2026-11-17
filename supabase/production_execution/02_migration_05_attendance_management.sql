-- ==============================================================================
-- MILESTONE 5: UNIVERSAL ATTENDANCE MANAGEMENT SYSTEM
-- Migration: 20261105040000_attendance_management.sql
-- Supports: K-12 Schools, Junior Colleges, Degree Colleges, Engineering & Universities
-- ==============================================================================

-- ==============================================================================
-- 1. Custom Types & Enums
-- ==============================================================================

DO $$ BEGIN
  CREATE TYPE attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'half_day',
    'excused',
    'on_leave'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_session_type AS ENUM (
    'daily',
    'lecture',
    'lab',
    'practical',
    'tutorial'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE attendance_session_status AS ENUM (
    'draft',
    'submitted',
    'locked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE staff_attendance_status AS ENUM (
    'present',
    'absent',
    'late',
    'half_day',
    'on_leave',
    'excused'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_applicant_type AS ENUM (
    'student',
    'staff'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM (
    'casual',
    'sick',
    'medical',
    'academic',
    'bereavement',
    'maternity',
    'emergency',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE leave_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE notification_delivery_status AS ENUM (
    'pending',
    'queued',
    'delivered',
    'failed'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Leave Management (Must precede attendance records due to foreign keys)
-- Supports both Student and Staff leave requests with approval workflow
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.leave_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  applicant_type leave_applicant_type NOT NULL,
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL DEFAULT 'casual',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason TEXT NOT NULL,
  supporting_document_url TEXT,
  status leave_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_leave_applicant CHECK (
    (applicant_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (applicant_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  ),
  CONSTRAINT chk_leave_dates CHECK (end_date >= start_date)
);

CREATE INDEX IF NOT EXISTS idx_leaves_institution ON public.leave_requests(institution_id);
CREATE INDEX IF NOT EXISTS idx_leaves_student ON public.leave_requests(institution_id, student_id) WHERE student_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_staff ON public.leave_requests(institution_id, staff_id) WHERE staff_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leaves_dates ON public.leave_requests(institution_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_leaves_status ON public.leave_requests(institution_id, status);

-- ==============================================================================
-- 3. Attendance Sessions
-- Represents an attendance event: Daily homeroom for schools / junior colleges,
-- or subject/lab lecture period for degree colleges, engineering colleges, universities.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  session_date DATE NOT NULL,
  session_type attendance_session_type NOT NULL DEFAULT 'daily',
  period_number INTEGER,
  start_time TIME,
  end_time TIME,
  topic_covered TEXT,
  marked_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  status attendance_session_status NOT NULL DEFAULT 'submitted',
  total_students INTEGER NOT NULL DEFAULT 0,
  present_count INTEGER NOT NULL DEFAULT 0,
  absent_count INTEGER NOT NULL DEFAULT 0,
  late_count INTEGER NOT NULL DEFAULT 0,
  half_day_count INTEGER NOT NULL DEFAULT 0,
  excused_count INTEGER NOT NULL DEFAULT 0,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Partial Unique Indexes preventing duplicate attendance sessions:
-- 1. Daily homeroom session: only 1 daily session per class/section on a given date
CREATE UNIQUE INDEX IF NOT EXISTS uq_daily_attendance_session
ON public.attendance_sessions (
  institution_id,
  academic_year_id,
  class_id,
  COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  session_date,
  session_type
)
WHERE subject_id IS NULL AND period_number IS NULL;

-- 2. Subject-wise period session: only 1 session per subject and period for class/section on a given date
CREATE UNIQUE INDEX IF NOT EXISTS uq_subject_attendance_session
ON public.attendance_sessions (
  institution_id,
  academic_year_id,
  class_id,
  COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  session_date,
  subject_id,
  COALESCE(period_number, 0)
)
WHERE subject_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_att_sessions_inst_date ON public.attendance_sessions(institution_id, session_date DESC);
CREATE INDEX IF NOT EXISTS idx_att_sessions_class_sec ON public.attendance_sessions(institution_id, class_id, section_id, session_date);
CREATE INDEX IF NOT EXISTS idx_att_sessions_subject ON public.attendance_sessions(institution_id, subject_id) WHERE subject_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_att_sessions_marked_by ON public.attendance_sessions(institution_id, marked_by_staff_id);

-- ==============================================================================
-- 4. Student Attendance Records
-- Exactly one attendance record per student per attendance session.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
  status attendance_status NOT NULL DEFAULT 'present',
  remarks TEXT,
  is_excused BOOLEAN NOT NULL DEFAULT false,
  leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_session_student UNIQUE (session_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_student_att_inst_student ON public.student_attendance_records(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_student_att_session ON public.student_attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_student_att_status ON public.student_attendance_records(institution_id, status);

-- ==============================================================================
-- 5. Student Attendance Corrections (Audit History)
-- "Never silently overwrite submitted attendance. Corrections must retain original value and correction history."
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES public.student_attendance_records(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  previous_status attendance_status NOT NULL,
  new_status attendance_status NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_att_corr_record ON public.attendance_corrections(record_id);
CREATE INDEX IF NOT EXISTS idx_att_corr_session ON public.attendance_corrections(session_id);
CREATE INDEX IF NOT EXISTS idx_att_corr_student ON public.attendance_corrections(institution_id, student_id);

-- ==============================================================================
-- 6. Staff Daily Attendance Records
-- Tracks staff check-in, check-out, statuses, and history.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.staff_attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  attendance_date DATE NOT NULL,
  status staff_attendance_status NOT NULL DEFAULT 'present',
  check_in_time TIME,
  check_out_time TIME,
  remarks TEXT,
  leave_request_id UUID REFERENCES public.leave_requests(id) ON DELETE SET NULL,
  marked_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_staff_date_attendance UNIQUE (institution_id, staff_id, attendance_date)
);

CREATE INDEX IF NOT EXISTS idx_staff_att_inst_date ON public.staff_attendance_records(institution_id, attendance_date DESC);
CREATE INDEX IF NOT EXISTS idx_staff_att_staff ON public.staff_attendance_records(institution_id, staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_att_status ON public.staff_attendance_records(institution_id, status);

-- Staff Attendance Correction History
CREATE TABLE IF NOT EXISTS public.staff_attendance_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES public.staff_attendance_records(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  previous_status staff_attendance_status NOT NULL,
  new_status staff_attendance_status NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_staff_att_corr_record ON public.staff_attendance_corrections(record_id);
CREATE INDEX IF NOT EXISTS idx_staff_att_corr_staff ON public.staff_attendance_corrections(institution_id, staff_id);

-- ==============================================================================
-- 7. Parent Notification Queue & Event Delivery Tracking
-- Queues notification events for primary guardians when student is marked absent or late.
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.attendance_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  record_id UUID NOT NULL REFERENCES public.student_attendance_records(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  guardian_id UUID NOT NULL REFERENCES public.guardians(id) ON DELETE CASCADE,
  channel TEXT NOT NULL DEFAULT 'in_app',
  status notification_delivery_status NOT NULL DEFAULT 'pending',
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  delivery_error TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_session_student_guardian_notification UNIQUE(session_id, student_id, guardian_id, channel)
);

CREATE INDEX IF NOT EXISTS idx_att_notif_guardian ON public.attendance_notifications(institution_id, guardian_id);
CREATE INDEX IF NOT EXISTS idx_att_notif_session ON public.attendance_notifications(session_id);
CREATE INDEX IF NOT EXISTS idx_att_notif_status ON public.attendance_notifications(institution_id, status);

-- ==============================================================================
-- 8. Stored Procedures & Business Logic
-- ==============================================================================

-- Stored Procedure: Atomic Student Attendance Batch Submission
CREATE OR REPLACE FUNCTION public.record_student_attendance_batch(
  p_institution_id UUID,
  p_session_id UUID,
  p_records JSONB, -- Array of { student_id, enrollment_id, status, remarks, is_excused }
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_session RECORD;
  v_rec JSONB;
  v_student_id UUID;
  v_enrollment_id UUID;
  v_status attendance_status;
  v_remarks TEXT;
  v_is_excused BOOLEAN;
  v_record_id UUID;
  v_total INT := 0;
  v_present INT := 0;
  v_absent INT := 0;
  v_late INT := 0;
  v_half_day INT := 0;
  v_excused INT := 0;
  v_guardian RECORD;
  v_student_name TEXT;
  v_date_str TEXT;
BEGIN
  -- 1. Verify session exists and belongs to institution
  SELECT * INTO v_session
  FROM public.attendance_sessions
  WHERE id = p_session_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance session % not found in institution %', p_session_id, p_institution_id;
  END IF;

  IF v_session.status = 'locked' THEN
    RAISE EXCEPTION 'Attendance session % is locked and cannot be modified', p_session_id;
  END IF;

  v_date_str := to_char(v_session.session_date, 'YYYY-MM-DD');

  -- 2. Process records
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::UUID;
    v_enrollment_id := NULLIF(v_rec->>'enrollment_id', '')::UUID;
    v_status := (v_rec->>'status')::attendance_status;
    v_remarks := NULLIF(v_rec->>'remarks', '');
    v_is_excused := COALESCE((v_rec->>'is_excused')::BOOLEAN, false);

    -- Ensure student belongs to this institution
    IF NOT EXISTS (
      SELECT 1 FROM public.students
      WHERE id = v_student_id AND institution_id = p_institution_id
    ) THEN
      RAISE EXCEPTION 'Student % does not belong to institution %', v_student_id, p_institution_id;
    END IF;

    -- Upsert student attendance record
    INSERT INTO public.student_attendance_records (
      institution_id,
      session_id,
      student_id,
      enrollment_id,
      status,
      remarks,
      is_excused,
      created_by
    ) VALUES (
      p_institution_id,
      p_session_id,
      v_student_id,
      v_enrollment_id,
      v_status,
      v_remarks,
      v_is_excused,
      p_user_id
    )
    ON CONFLICT (session_id, student_id)
    DO UPDATE SET
      status = EXCLUDED.status,
      remarks = EXCLUDED.remarks,
      is_excused = EXCLUDED.is_excused,
      updated_at = timezone('utc', now())
    RETURNING id INTO v_record_id;

    -- Increment tally
    v_total := v_total + 1;
    IF v_status = 'present' THEN v_present := v_present + 1;
    ELSIF v_status = 'absent' THEN v_absent := v_absent + 1;
    ELSIF v_status = 'late' THEN v_late := v_late + 1;
    ELSIF v_status = 'half_day' THEN v_half_day := v_half_day + 1;
    ELSIF v_status = 'excused' OR v_status = 'on_leave' THEN v_excused := v_excused + 1;
    END IF;

    -- 3. Queue guardian notification events for absent / late students
    IF v_status IN ('absent', 'late') THEN
      SELECT first_name || ' ' || last_name INTO v_student_name
      FROM public.students WHERE id = v_student_id;

      FOR v_guardian IN
        SELECT g.id AS guardian_id
        FROM public.student_guardians sg
        JOIN public.guardians g ON g.id = sg.guardian_id
        WHERE sg.student_id = v_student_id
          AND sg.institution_id = p_institution_id
          AND sg.is_primary = true
      LOOP
        INSERT INTO public.attendance_notifications (
          institution_id,
          session_id,
          record_id,
          student_id,
          guardian_id,
          channel,
          status,
          title,
          message
        ) VALUES (
          p_institution_id,
          p_session_id,
          v_record_id,
          v_student_id,
          v_guardian.guardian_id,
          'in_app',
          'pending',
          CASE WHEN v_status = 'absent' THEN 'Student Absence Notification' ELSE 'Student Late Arrival Notice' END,
          v_student_name || ' was marked ' || v_status::text || ' on ' || v_date_str || '.'
        )
        ON CONFLICT (session_id, student_id, guardian_id, channel) DO NOTHING;
      END LOOP;
    END IF;
  END LOOP;

  -- 4. Update attendance session counts & status
  UPDATE public.attendance_sessions
  SET
    total_students = v_total,
    present_count = v_present,
    absent_count = v_absent,
    late_count = v_late,
    half_day_count = v_half_day,
    excused_count = v_excused,
    status = 'submitted',
    updated_at = timezone('utc', now())
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'total_students', v_total,
    'present_count', v_present,
    'absent_count', v_absent,
    'late_count', v_late,
    'half_day_count', v_half_day,
    'excused_count', v_excused
  );
END;
$$;

-- Stored Procedure: Authorized Student Attendance Correction
CREATE OR REPLACE FUNCTION public.correct_student_attendance_record(
  p_institution_id UUID,
  p_record_id UUID,
  p_new_status attendance_status,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rec RECORD;
  v_session RECORD;
  v_prev_status attendance_status;
BEGIN
  -- 1. Fetch current record
  SELECT * INTO v_rec
  FROM public.student_attendance_records
  WHERE id = p_record_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record % not found in institution %', p_record_id, p_institution_id;
  END IF;

  v_prev_status := v_rec.status;

  IF v_prev_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'record_id', p_record_id, 'status', p_new_status);
  END IF;

  -- 2. Insert correction audit trail
  INSERT INTO public.attendance_corrections (
    institution_id,
    record_id,
    session_id,
    student_id,
    previous_status,
    new_status,
    reason,
    corrected_by
  ) VALUES (
    p_institution_id,
    p_record_id,
    v_rec.session_id,
    v_rec.student_id,
    v_prev_status,
    p_new_status,
    p_reason,
    p_user_id
  );

  -- 3. Update record status
  UPDATE public.student_attendance_records
  SET
    status = p_new_status,
    updated_at = timezone('utc', now())
  WHERE id = p_record_id;

  -- 4. Recalculate session aggregates
  UPDATE public.attendance_sessions s
  SET
    present_count = (SELECT count(*) FROM public.student_attendance_records WHERE session_id = s.id AND status = 'present'),
    absent_count = (SELECT count(*) FROM public.student_attendance_records WHERE session_id = s.id AND status = 'absent'),
    late_count = (SELECT count(*) FROM public.student_attendance_records WHERE session_id = s.id AND status = 'late'),
    half_day_count = (SELECT count(*) FROM public.student_attendance_records WHERE session_id = s.id AND status = 'half_day'),
    excused_count = (SELECT count(*) FROM public.student_attendance_records WHERE session_id = s.id AND status IN ('excused', 'on_leave')),
    updated_at = timezone('utc', now())
  WHERE id = v_rec.session_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', p_record_id,
    'previous_status', v_prev_status,
    'new_status', p_new_status
  );
END;
$$;

-- Stored Procedure: Authorized Staff Attendance Correction
CREATE OR REPLACE FUNCTION public.correct_staff_attendance_record(
  p_institution_id UUID,
  p_record_id UUID,
  p_new_status staff_attendance_status,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_rec RECORD;
  v_prev_status staff_attendance_status;
BEGIN
  SELECT * INTO v_rec
  FROM public.staff_attendance_records
  WHERE id = p_record_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Staff attendance record % not found in institution %', p_record_id, p_institution_id;
  END IF;

  v_prev_status := v_rec.status;

  IF v_prev_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'record_id', p_record_id, 'status', p_new_status);
  END IF;

  INSERT INTO public.staff_attendance_corrections (
    institution_id,
    record_id,
    staff_id,
    previous_status,
    new_status,
    reason,
    corrected_by
  ) VALUES (
    p_institution_id,
    p_record_id,
    v_rec.staff_id,
    v_prev_status,
    p_new_status,
    p_reason,
    p_user_id
  );

  UPDATE public.staff_attendance_records
  SET
    status = p_new_status,
    updated_at = timezone('utc', now())
  WHERE id = p_record_id;

  RETURN jsonb_build_object(
    'success', true,
    'record_id', p_record_id,
    'previous_status', v_prev_status,
    'new_status', p_new_status
  );
END;
$$;

-- ==============================================================================
-- 9. Row-Level Security (RLS) Policies
-- ==============================================================================

ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_attendance_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_notifications ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 9.1 Leave Requests RLS
-- ------------------------------------------------------------------------------
CREATE POLICY leaves_select_policy ON public.leave_requests
  FOR SELECT USING (
    -- Institution Staff / Admins
    institution_id IN (SELECT current_user_tenant_ids())
    OR
    -- Student applicant viewing own leave
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR
    -- Staff applicant viewing own leave
    staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    OR
    -- Guardian viewing child's leave
    (student_id IS NOT NULL AND is_guardian_of_student(student_id))
  );

CREATE POLICY leaves_insert_policy ON public.leave_requests
  FOR INSERT WITH CHECK (
    -- Institution staff/admins
    (institution_id IN (SELECT current_user_tenant_ids()) AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role, 'academic_admin'::membership_role, 'faculty'::membership_role, 'staff'::membership_role]))
    OR
    -- Student applying for themselves
    (student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()))
    OR
    -- Guardian applying for their child
    (student_id IS NOT NULL AND is_guardian_of_student(student_id))
    OR
    -- Staff applying for themselves
    (staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
  );

CREATE POLICY leaves_update_policy ON public.leave_requests
  FOR UPDATE USING (
    -- Only reviewers can approve/reject, or applicants can cancel while pending
    (institution_id IN (SELECT current_user_tenant_ids()) AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role]))
    OR
    (status = 'pending' AND (
      student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
      staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    ))
  );

-- ------------------------------------------------------------------------------
-- 9.2 Attendance Sessions RLS
-- ------------------------------------------------------------------------------
CREATE POLICY att_sessions_select_policy ON public.attendance_sessions
  FOR SELECT USING (
    institution_id IN (SELECT current_user_tenant_ids())
  );

CREATE POLICY att_sessions_insert_policy ON public.attendance_sessions
  FOR INSERT WITH CHECK (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'faculty'::membership_role])
  );

CREATE POLICY att_sessions_update_policy ON public.attendance_sessions
  FOR UPDATE USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'faculty'::membership_role])
  );

CREATE POLICY att_sessions_delete_policy ON public.attendance_sessions
  FOR DELETE USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- ------------------------------------------------------------------------------
-- 9.3 Student Attendance Records RLS
-- ------------------------------------------------------------------------------
CREATE POLICY student_att_select_policy ON public.student_attendance_records
  FOR SELECT USING (
    -- Staff and administrators in institution
    (institution_id IN (SELECT current_user_tenant_ids()) AND is_institution_member(institution_id))
    OR
    -- Student viewing own records
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR
    -- Guardian viewing their child's records
    is_guardian_of_student(student_id)
  );

CREATE POLICY student_att_insert_policy ON public.student_attendance_records
  FOR INSERT WITH CHECK (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'faculty'::membership_role])
  );

CREATE POLICY student_att_update_policy ON public.student_attendance_records
  FOR UPDATE USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'faculty'::membership_role])
  );

-- ------------------------------------------------------------------------------
-- 9.4 Attendance Corrections RLS
-- ------------------------------------------------------------------------------
CREATE POLICY att_corr_select_policy ON public.attendance_corrections
  FOR SELECT USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND is_institution_member(institution_id)
  );

CREATE POLICY att_corr_insert_policy ON public.attendance_corrections
  FOR INSERT WITH CHECK (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'faculty'::membership_role])
  );

-- ------------------------------------------------------------------------------
-- 9.5 Staff Attendance Records RLS
-- ------------------------------------------------------------------------------
CREATE POLICY staff_att_select_policy ON public.staff_attendance_records
  FOR SELECT USING (
    -- Staff viewing own attendance
    staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    OR
    -- HR, Admins, and Owners
    (institution_id IN (SELECT current_user_tenant_ids()) AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role, 'department_head'::membership_role]))
  );

CREATE POLICY staff_att_insert_policy ON public.staff_attendance_records
  FOR INSERT WITH CHECK (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role])
  );

CREATE POLICY staff_att_update_policy ON public.staff_attendance_records
  FOR UPDATE USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role])
  );

-- ------------------------------------------------------------------------------
-- 9.6 Staff Attendance Corrections RLS
-- ------------------------------------------------------------------------------
CREATE POLICY staff_att_corr_select_policy ON public.staff_attendance_corrections
  FOR SELECT USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND (
      staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
      OR has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role])
    )
  );

CREATE POLICY staff_att_corr_insert_policy ON public.staff_attendance_corrections
  FOR INSERT WITH CHECK (
    institution_id IN (SELECT current_user_tenant_ids())
    AND has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'hr_administrator'::membership_role])
  );

-- ------------------------------------------------------------------------------
-- 9.7 Attendance Notifications RLS
-- ------------------------------------------------------------------------------
CREATE POLICY att_notif_select_policy ON public.attendance_notifications
  FOR SELECT USING (
    -- Guardian viewing own notifications
    guardian_id IN (SELECT id FROM public.guardians WHERE user_id = auth.uid())
    OR
    -- Institution Staff/Admin
    (institution_id IN (SELECT current_user_tenant_ids()) AND is_institution_member(institution_id))
  );

CREATE POLICY att_notif_insert_policy ON public.attendance_notifications
  FOR INSERT WITH CHECK (
    institution_id IN (SELECT current_user_tenant_ids())
  );
