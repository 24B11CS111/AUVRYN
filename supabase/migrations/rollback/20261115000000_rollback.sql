-- ==============================================================================
-- AUVRYN Rollback Migration: 20261115000000_rollback.sql
-- Restores original record_student_attendance_batch and correct_student_attendance_record
-- ==============================================================================

-- 1. Drop the atomic absence notification helper
DROP FUNCTION IF EXISTS public.dispatch_student_absence_notification_atomic(UUID, UUID, DATE, UUID, UUID);

-- 2. Restore record_student_attendance_batch from 20261105040000_attendance_management.sql
CREATE OR REPLACE FUNCTION public.record_student_attendance_batch(
  p_institution_id UUID,
  p_session_id UUID,
  p_records JSONB,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
BEGIN
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

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::UUID;
    v_enrollment_id := NULLIF(v_rec->>'enrollment_id', '')::UUID;
    v_status := (v_rec->>'status')::attendance_status;
    v_remarks := NULLIF(v_rec->>'remarks', '');
    v_is_excused := COALESCE((v_rec->>'is_excused')::BOOLEAN, false);

    IF NOT EXISTS (
      SELECT 1 FROM public.students
      WHERE id = v_student_id AND institution_id = p_institution_id
    ) THEN
      RAISE EXCEPTION 'Student % does not belong to institution %', v_student_id, p_institution_id;
    END IF;

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

    v_total := v_total + 1;
    IF v_status = 'present' THEN v_present := v_present + 1;
    ELSIF v_status = 'absent' THEN v_absent := v_absent + 1;
    ELSIF v_status = 'late' THEN v_late := v_late + 1;
    ELSIF v_status = 'half_day' THEN v_half_day := v_half_day + 1;
    ELSIF v_status = 'excused' OR v_status = 'on_leave' THEN v_excused := v_excused + 1;
    END IF;
  END LOOP;

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

REVOKE ALL ON FUNCTION public.record_student_attendance_batch(UUID, UUID, JSONB, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.record_student_attendance_batch(UUID, UUID, JSONB, UUID) TO authenticated, service_role;

-- 3. Restore correct_student_attendance_record from 20261105040000_attendance_management.sql
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
  v_rec RECORD;
  v_session RECORD;
  v_prev_status attendance_status;
BEGIN
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

  UPDATE public.student_attendance_records
  SET
    status = p_new_status,
    updated_at = timezone('utc', now())
  WHERE id = p_record_id;

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

REVOKE ALL ON FUNCTION public.correct_student_attendance_record(UUID, UUID, attendance_status, TEXT, UUID) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.correct_student_attendance_record(UUID, UUID, attendance_status, TEXT, UUID) TO authenticated, service_role;
