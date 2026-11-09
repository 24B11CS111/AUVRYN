-- ==============================================================================
-- Migration: 20261109120000_fix_attendance_rls_functions.sql
-- Description: Phase 2.1 Critical Remediation — Attendance RLS Helper & Hardening
--
-- Fixes:
-- 1. Defines `public.current_user_tenant_ids()` security-definer helper matching
--    `get_user_institution_ids()` to resolve runtime missing function errors.
-- 2. Hardens execution permissions and search_path on tenant resolution functions.
-- 3. Hardens attendance policies to prevent non-staff institutional members (e.g., students)
--    from viewing peer student attendance records.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Helper Function: current_user_tenant_ids()
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_tenant_ids()
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

COMMENT ON FUNCTION public.current_user_tenant_ids() IS 
  'Returns table of active tenant/institution IDs for the current authenticated user (auth.uid()).';

-- Security hardening: explicitly revoke default public permissions and grant to authenticated and service_role
REVOKE ALL ON FUNCTION public.current_user_tenant_ids() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_user_tenant_ids() TO authenticated, anon, service_role;

-- ------------------------------------------------------------------------------
-- 2. Policy Hardening: Student Attendance Records SELECT
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS student_att_select_policy ON public.student_attendance_records;
CREATE POLICY student_att_select_policy ON public.student_attendance_records
  FOR SELECT TO authenticated
  USING (
    -- Staff and administrators in institution
    (
      institution_id IN (SELECT public.current_user_tenant_ids()) 
      AND public.has_institution_role(institution_id, ARRAY[
        'owner'::membership_role, 
        'admin'::membership_role, 
        'academic_admin'::membership_role, 
        'department_head'::membership_role, 
        'faculty'::membership_role, 
        'staff'::membership_role
      ])
    )
    OR
    -- Student viewing own records
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    OR
    -- Guardian viewing their child's records
    public.is_guardian_of_student(student_id)
  );

-- ------------------------------------------------------------------------------
-- 3. Policy Hardening: Attendance Corrections SELECT
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS att_corr_select_policy ON public.attendance_corrections;
CREATE POLICY att_corr_select_policy ON public.attendance_corrections
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT public.current_user_tenant_ids())
    AND public.has_institution_role(institution_id, ARRAY[
      'owner'::membership_role, 
      'admin'::membership_role, 
      'academic_admin'::membership_role, 
      'department_head'::membership_role, 
      'faculty'::membership_role, 
      'staff'::membership_role
    ])
  );

-- ------------------------------------------------------------------------------
-- 4. Policy Hardening: Attendance Notifications SELECT
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS att_notif_select_policy ON public.attendance_notifications;
CREATE POLICY att_notif_select_policy ON public.attendance_notifications
  FOR SELECT TO authenticated
  USING (
    -- Guardian viewing own notifications
    guardian_id IN (SELECT id FROM public.guardians WHERE user_id = auth.uid())
    OR
    -- Institution Staff/Admin
    (
      institution_id IN (SELECT public.current_user_tenant_ids()) 
      AND public.has_institution_role(institution_id, ARRAY[
        'owner'::membership_role, 
        'admin'::membership_role, 
        'academic_admin'::membership_role, 
        'department_head'::membership_role, 
        'faculty'::membership_role, 
        'staff'::membership_role
      ])
    )
  );
