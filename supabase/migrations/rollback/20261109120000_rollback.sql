-- ==============================================================================
-- Rollback Migration: 20261109120000_rollback.sql
-- Description: Rollback Phase 2.1 Critical Attendance RLS Fix
-- ==============================================================================

-- 1. Revert Attendance Notifications Policy
DROP POLICY IF EXISTS att_notif_select_policy ON public.attendance_notifications;
CREATE POLICY att_notif_select_policy ON public.attendance_notifications
  FOR SELECT USING (
    guardian_id IN (SELECT id FROM public.guardians WHERE user_id = auth.uid())
    OR
    (institution_id IN (SELECT current_user_tenant_ids()) AND is_institution_member(institution_id))
  );

-- 2. Revert Attendance Corrections Policy
DROP POLICY IF EXISTS att_corr_select_policy ON public.attendance_corrections;
CREATE POLICY att_corr_select_policy ON public.attendance_corrections
  FOR SELECT USING (
    institution_id IN (SELECT current_user_tenant_ids())
    AND is_institution_member(institution_id)
  );

-- 3. Revert Student Attendance Records Policy
DROP POLICY IF EXISTS student_att_select_policy ON public.student_attendance_records;
CREATE POLICY student_att_select_policy ON public.student_attendance_records
  FOR SELECT USING (
    (institution_id IN (SELECT current_user_tenant_ids()) AND is_institution_member(institution_id))
    OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR
    is_guardian_of_student(student_id)
  );

-- 4. Drop Function
DROP FUNCTION IF EXISTS public.current_user_tenant_ids();
