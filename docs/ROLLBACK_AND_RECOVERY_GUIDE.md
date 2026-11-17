# AUVRYN — Rollback and Disaster Recovery Guide

**Target System:** AUVRYN — The Intelligent Education Ecosystem  
**Target Environment:** Supabase Cloud (`dhgdjpjgsvbknquetecl`) / PostgreSQL 17  
**Document Purpose:** Immediate rollback protocols and recovery procedures for platform administrators.  

---

## 1. Rollback Strategy & Principle

AUVRYN follows a strict **forward-fixing preferred, reversible migration guaranteed** architecture. 

For every database migration, an identical rollback script exists in `supabase/migrations/rollback/`.

### Emergency Stop Criteria:
Trigger immediate rollback if any of the following occur during or immediately following deployment:
1. **Tenant Isolation Breach:** Cross-institution data visibility in RLS queries.
2. **Authentication Lockout:** Valid institutional members unable to log in or switch institutions.
3. **Database Connection Exhaustion:** Unreclaimed locks or stuck transactions holding exclusive table locks.
4. **Data Corruption:** Unrecoverable financial ledger or attendance record inconsistencies.

---

## 2. Migration 17 Rollback Execution (`20261115000000`)

If the automatic absence notification migration must be rolled back:

### Step 1: Open Supabase Dashboard
1. Navigate to `https://supabase.com/dashboard/project/dhgdjpjgsvbknquetecl`.
2. Open **SQL Editor**.

### Step 2: Execute Rollback Script
Paste and execute the complete contents of `supabase/migrations/rollback/20261115000000_rollback.sql`:

```sql
-- ==============================================================================
-- ROLLBACK SCRIPT FOR MIGRATION: 20261115000000_automatic_absence_notifications
-- ==============================================================================

-- 1. Drop the notification dispatch helper function
DROP FUNCTION IF EXISTS public.dispatch_student_absence_notification_atomic(UUID, UUID, DATE, UUID, UUID);

-- 2. Restore record_student_attendance_batch to previous definition
CREATE OR REPLACE FUNCTION public.record_student_attendance_batch(
  p_institution_id UUID,
  p_session_id UUID,
  p_records JSONB,
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
BEGIN
  SELECT * INTO v_session
  FROM public.attendance_sessions
  WHERE id = p_session_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance session % not found in institution %', p_session_id, p_institution_id
      USING ERRCODE = 'P0002';
  END IF;

  IF v_session.status = 'locked' THEN
    RAISE EXCEPTION 'Attendance session % is locked and cannot be modified', p_session_id
      USING ERRCODE = '22023';
  END IF;

  FOR v_rec IN SELECT * FROM jsonb_array_elements(p_records)
  LOOP
    v_student_id := (v_rec->>'student_id')::UUID;
    v_enrollment_id := NULLIF(v_rec->>'enrollment_id', '')::UUID;
    v_status := (v_rec->>'status')::attendance_status;
    v_remarks := NULLIF(v_rec->>'remarks', '');
    v_is_excused := COALESCE((v_rec->>'is_excused')::BOOLEAN, false);

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
    ON CONFLICT (session_id, student_id) DO UPDATE SET
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
    ELSIF v_status = 'excused' THEN v_excused := v_excused + 1;
    END IF;
  END LOOP;

  UPDATE public.attendance_sessions
  SET status = 'submitted',
      total_students = v_total,
      present_count = v_present,
      absent_count = v_absent,
      late_count = v_late,
      half_day_count = v_half_day,
      excused_count = v_excused,
      submitted_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
  WHERE id = p_session_id;

  RETURN jsonb_build_object(
    'success', true,
    'session_id', p_session_id,
    'total_processed', v_total,
    'present', v_present,
    'absent', v_absent,
    'late', v_late,
    'half_day', v_half_day,
    'excused', v_excused
  );
END;
$$;

-- 3. Restore correct_student_attendance_record to previous definition
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
  SELECT * INTO v_rec
  FROM public.student_attendance_records
  WHERE id = p_record_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Attendance record % not found in institution %', p_record_id, p_institution_id
      USING ERRCODE = 'P0002';
  END IF;

  v_prev_status := v_rec.status;

  IF v_prev_status = p_new_status THEN
    RETURN jsonb_build_object('success', true, 'record_id', p_record_id, 'status', p_new_status);
  END IF;

  SELECT * INTO v_session
  FROM public.attendance_sessions
  WHERE id = v_rec.session_id AND institution_id = p_institution_id;

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
  SET status = p_new_status,
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

-- 4. Revert schema migration record
DELETE FROM supabase_migrations.schema_migrations 
WHERE version = '20261115000000';
```

---

## 3. Web & Vercel Rollback

If a bad web deployment occurs:
1. Open the **Vercel Project Dashboard** (`https://vercel.com`).
2. Go to **Deployments**.
3. Locate the previous stable production deployment.
4. Click the three dots (`...`) and select **Redeploy to Production** (Instant Rollback).
5. Vercel routes 100% of traffic to the previous build within seconds without rebuilding.

---

## 4. Mobile Rollback Protocol

Because mobile app binaries are installed on end-user devices:
1. **Server-Side Backward Compatibility:** The backend database must support both old and new mobile clients simultaneously.
2. **Emergency Channel Killswitch:** If a mobile release contains a critical bug:
   - Disable the specific affected feature via `institution_fee_settings` or system feature flags.
   - Deploy an updated OTA (Over-The-Air) update via EAS Update:
     ```bash
     cd apps/mobile
     eas update --branch production --message "Hotfix: Revert broken client view"
     ```

---

## 5. Point-in-Time Database Recovery (PITR)

Supabase Cloud maintains physical write-ahead logs (WAL) allowing point-in-time recovery:
1. Navigate to **Project Settings → Backups → Scheduled Backups**.
2. Select the recovery point immediately prior to the failed event.
3. Initiate clone restore to a staging database to verify data before cutting over DNS.
