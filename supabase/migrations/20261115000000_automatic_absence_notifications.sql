-- ==============================================================================
-- AUVRYN Migration: 20261115000000_automatic_absence_notifications.sql
-- Production Automatic Absence Notification Workflow (Hardened & Audited)
--
-- Security Hardening:
-- 1. Enforces strict auth.uid() validation and prevents caller impersonation.
-- 2. Restricts database RPC execution using has_institution_role permissions.
-- 3. Restricts dispatch_student_absence_notification_atomic strictly to service_role.
-- 4. Secures search_path to public, pg_temp against search-path injection.
-- 5. Enforces cross-tenant boundary isolation across students, guardians, and sessions.
-- 6. Enforces deterministic idempotency keys and respects notification preferences.
-- ==============================================================================

-- 1. Stored Procedure: Dispatch Student Absence Notification (Atomic Helper)
-- Internal helper: execution revoked from PUBLIC, anon, authenticated; granted strictly to service_role.
CREATE OR REPLACE FUNCTION public.dispatch_student_absence_notification_atomic(
  p_institution_id UUID,
  p_session_id UUID,
  p_session_date DATE,
  p_student_id UUID,
  p_marked_by UUID
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_guardian RECORD;
  v_guardian_user_id UUID;
  v_pref RECORD;
  v_channels notification_channel[];
  v_notif_id UUID;
  v_channel notification_channel;
  v_base_idemp TEXT;
  v_count INT := 0;
  v_is_active_member BOOLEAN;
  v_push_token TEXT;
  v_dest TEXT;
BEGIN
  -- Strict tenant validation: verify student belongs to target institution
  IF NOT EXISTS (
    SELECT 1 FROM public.students
    WHERE id = p_student_id AND institution_id = p_institution_id
  ) THEN
    RETURN 0;
  END IF;

  -- Iterate through all explicitly linked guardians for this student in this institution
  FOR v_guardian IN
    SELECT
      g.id AS guardian_id,
      g.user_id AS user_id,
      g.email AS email,
      g.phone AS phone,
      sg.relationship,
      sg.is_primary
    FROM public.student_guardians sg
    JOIN public.guardians g ON g.id = sg.guardian_id
    WHERE sg.student_id = p_student_id
      AND sg.institution_id = p_institution_id
      AND g.institution_id = p_institution_id
      AND g.user_id IS NOT NULL
  LOOP
    v_guardian_user_id := v_guardian.user_id;

    -- Verify active institutional membership in target institution
    SELECT EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = p_institution_id
        AND user_id = v_guardian_user_id
        AND status = 'active'
    ) INTO v_is_active_member;

    IF NOT v_is_active_member THEN
      CONTINUE;
    END IF;

    -- Check guardian notification preferences for category 'attendance'
    SELECT is_muted, enabled_channels INTO v_pref
    FROM public.notification_preferences
    WHERE institution_id = p_institution_id
      AND user_id = v_guardian_user_id
      AND category = 'attendance';

    IF FOUND AND v_pref.is_muted THEN
      -- Guardian has opted out / muted attendance notifications
      CONTINUE;
    END IF;

    IF FOUND AND v_pref.enabled_channels IS NOT NULL AND array_length(v_pref.enabled_channels, 1) > 0 THEN
      v_channels := v_pref.enabled_channels;
    ELSE
      -- Default channels: in_app and push
      v_channels := ARRAY['in_app', 'push']::notification_channel[];
    END IF;

    -- Idempotency check: base deterministic key per session + student + guardian user
    v_base_idemp := 'att_absence_' || p_session_id::text || '_' || p_student_id::text || '_' || v_guardian_user_id::text;

    IF EXISTS (
      SELECT 1 FROM public.notification_deliveries
      WHERE institution_id = p_institution_id
        AND idempotency_key LIKE (v_base_idemp || '%')
    ) THEN
      -- Already queued; skip duplicate
      CONTINUE;
    END IF;

    -- Insert central notification record
    INSERT INTO public.notifications (
      institution_id,
      recipient_user_id,
      category,
      title,
      body,
      priority,
      data,
      created_by
    ) VALUES (
      p_institution_id,
      v_guardian_user_id,
      'attendance',
      'Attendance Alert — AUVRYN',
      'Your ward was marked absent today. Please contact the institution if you need clarification.',
      'high',
      jsonb_build_object(
        'type', 'STUDENT_ABSENCE',
        'sessionId', p_session_id,
        'studentId', p_student_id,
        'date', to_char(p_session_date, 'YYYY-MM-DD')
      ),
      p_marked_by
    )
    RETURNING id INTO v_notif_id;

    -- Resolve active push token if 'push' is in enabled channels
    v_push_token := NULL;
    IF 'push' = ANY(v_channels) THEN
      SELECT token INTO v_push_token
      FROM public.push_device_tokens
      WHERE user_id = v_guardian_user_id
        AND is_active = true
      ORDER BY last_used_at DESC
      LIMIT 1;
    END IF;

    -- Insert delivery queue records
    FOREACH v_channel IN ARRAY v_channels
    LOOP
      v_dest := NULL;
      IF v_channel = 'push' THEN
        v_dest := v_push_token;
      ELSIF v_channel = 'email' THEN
        v_dest := v_guardian.email;
      ELSIF v_channel IN ('sms', 'whatsapp') THEN
        v_dest := v_guardian.phone;
      END IF;

      INSERT INTO public.notification_deliveries (
        institution_id,
        notification_id,
        channel,
        destination,
        status,
        idempotency_key,
        max_attempts
      ) VALUES (
        p_institution_id,
        v_notif_id,
        v_channel,
        v_dest,
        'queued',
        v_base_idemp || '_' || v_channel::text,
        3
      )
      ON CONFLICT (institution_id, idempotency_key) DO NOTHING;

      v_count := v_count + 1;
    END LOOP;
  END LOOP;

  RETURN v_count;
END;
$$;

-- Restrict execution strictly to service_role (internal helper only)
REVOKE ALL ON FUNCTION public.dispatch_student_absence_notification_atomic(UUID, UUID, DATE, UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dispatch_student_absence_notification_atomic(UUID, UUID, DATE, UUID, UUID) TO service_role;


-- 2. Hardened record_student_attendance_batch
CREATE OR REPLACE FUNCTION public.record_student_attendance_batch(
  p_institution_id UUID,
  p_session_id UUID,
  p_records JSONB, -- Array of { student_id, enrollment_id, status, remarks, is_excused }
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_caller_role TEXT := auth.role();
  v_effective_user_id UUID;
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
  v_notif_count INT := 0;
BEGIN
  -- A. Authentication & Impersonation Prevention
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required to submit attendance records'
        USING ERRCODE = '42501';
    END IF;

    -- Prevent arbitrary user impersonation
    IF p_user_id IS NOT NULL AND p_user_id != v_caller_uid THEN
      RAISE EXCEPTION 'Forbidden: Supplied user_id % does not match authenticated identity %', p_user_id, v_caller_uid
        USING ERRCODE = '42501';
    END IF;

    v_effective_user_id := v_caller_uid;

    -- B. Database-level Role Permission Enforcement
    IF NOT public.has_institution_role(
      p_institution_id,
      ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'faculty'::membership_role]
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Caller % does not possess attendance marking privileges in institution %', v_caller_uid, p_institution_id
        USING ERRCODE = '42501';
    END IF;
  ELSE
    v_effective_user_id := COALESCE(p_user_id, v_caller_uid);
  END IF;

  -- 1. Verify session exists and belongs to institution (with row lock)
  SELECT * INTO v_session
  FROM public.attendance_sessions
  WHERE id = p_session_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance session % not found in institution %', p_session_id, p_institution_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_session.status = 'locked' THEN
    RAISE EXCEPTION 'Attendance session % is locked and cannot be modified', p_session_id
      USING ERRCODE = '22023';
  END IF;

  -- 2. Process records atomically
  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::UUID;
    v_enrollment_id := NULLIF(v_rec->>'enrollment_id', '')::UUID;
    v_status := (v_rec->>'status')::attendance_status;
    v_remarks := NULLIF(v_rec->>'remarks', '');
    v_is_excused := COALESCE((v_rec->>'is_excused')::BOOLEAN, false);

    -- Strict tenant isolation: Ensure student belongs to this institution
    IF NOT EXISTS (
      SELECT 1 FROM public.students
      WHERE id = v_student_id AND institution_id = p_institution_id
    ) THEN
      RAISE EXCEPTION 'Student % does not belong to institution %', v_student_id, p_institution_id
        USING ERRCODE = '42501';
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
      v_effective_user_id
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
    ELSIF v_status = 'absent' THEN
      v_absent := v_absent + 1;
      -- Trigger absence notification strictly for committed absences
      v_notif_count := v_notif_count + public.dispatch_student_absence_notification_atomic(
        p_institution_id,
        p_session_id,
        v_session.session_date,
        v_student_id,
        v_effective_user_id
      );
    ELSIF v_status = 'late' THEN v_late := v_late + 1;
    ELSIF v_status = 'half_day' THEN v_half_day := v_half_day + 1;
    ELSIF v_status = 'excused' OR v_status = 'on_leave' THEN v_excused := v_excused + 1;
    END IF;
  END LOOP;

  -- 3. Update attendance session counts & status
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
    'excused_count', v_excused,
    'notifications_queued', v_notif_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.record_student_attendance_batch(UUID, UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_student_attendance_batch(UUID, UUID, JSONB, UUID) TO authenticated, service_role;


-- 3. Hardened correct_student_attendance_record
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
SET search_path = public, pg_temp
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
  v_caller_role TEXT := auth.role();
  v_effective_user_id UUID;
  v_rec RECORD;
  v_session RECORD;
  v_prev_status attendance_status;
  v_notif_count INT := 0;
BEGIN
  -- A. Authentication & Impersonation Prevention
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required to correct attendance records'
        USING ERRCODE = '42501';
    END IF;

    -- Prevent arbitrary user impersonation
    IF p_user_id IS NOT NULL AND p_user_id != v_caller_uid THEN
      RAISE EXCEPTION 'Forbidden: Supplied user_id % does not match authenticated identity %', p_user_id, v_caller_uid
        USING ERRCODE = '42501';
    END IF;

    v_effective_user_id := v_caller_uid;

    -- B. Database-level Role Permission Enforcement
    IF NOT public.has_institution_role(
      p_institution_id,
      ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role, 'department_head'::membership_role, 'hr_administrator'::membership_role, 'faculty'::membership_role]
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Caller % does not possess attendance correction privileges in institution %', v_caller_uid, p_institution_id
        USING ERRCODE = '42501';
    END IF;
  ELSE
    v_effective_user_id := COALESCE(p_user_id, v_caller_uid);
  END IF;

  -- 1. Fetch current record (with row lock)
  SELECT * INTO v_rec
  FROM public.student_attendance_records
  WHERE id = p_record_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record % not found in institution %', p_record_id, p_institution_id
      USING ERRCODE = 'P0002';
  END IF;

  v_prev_status := v_rec.status;

  IF v_prev_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'record_id', p_record_id, 'status', p_new_status, 'notifications_queued', 0);
  END IF;

  -- 2. Fetch session details for session_date
  SELECT * INTO v_session
  FROM public.attendance_sessions
  WHERE id = v_rec.session_id AND institution_id = p_institution_id;

  -- 3. Insert correction audit trail
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
    v_effective_user_id
  );

  -- 4. Update record status
  UPDATE public.student_attendance_records
  SET
    status = p_new_status,
    updated_at = timezone('utc', now())
  WHERE id = p_record_id;

  -- 5. Trigger absence notification strictly if corrected to 'absent'
  IF p_new_status = 'absent' AND v_prev_status != 'absent' THEN
    v_notif_count := public.dispatch_student_absence_notification_atomic(
      p_institution_id,
      v_rec.session_id,
      v_session.session_date,
      v_rec.student_id,
      v_effective_user_id
    );
  END IF;

  -- 6. Recalculate session aggregates
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
    'new_status', p_new_status,
    'notifications_queued', v_notif_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.correct_student_attendance_record(UUID, UUID, attendance_status, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_student_attendance_record(UUID, UUID, attendance_status, TEXT, UUID) TO authenticated, service_role;
