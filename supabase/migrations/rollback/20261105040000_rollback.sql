-- ==============================================================================
-- MILESTONE 5: UNIVERSAL ATTENDANCE MANAGEMENT SYSTEM (ROLLBACK)
-- File: supabase/migrations/rollback/20261105040000_rollback.sql
-- ==============================================================================

-- 1. Drop Stored Procedures
DROP FUNCTION IF EXISTS public.correct_staff_attendance_record(UUID, UUID, staff_attendance_status, TEXT, UUID);
DROP FUNCTION IF EXISTS public.correct_student_attendance_record(UUID, UUID, attendance_status, TEXT, UUID);
DROP FUNCTION IF EXISTS public.record_student_attendance_batch(UUID, UUID, JSONB, UUID);

-- 2. Drop Tables (in reverse dependency order)
DROP TABLE IF EXISTS public.attendance_notifications CASCADE;
DROP TABLE IF EXISTS public.staff_attendance_corrections CASCADE;
DROP TABLE IF EXISTS public.staff_attendance_records CASCADE;
DROP TABLE IF EXISTS public.attendance_corrections CASCADE;
DROP TABLE IF EXISTS public.student_attendance_records CASCADE;
DROP TABLE IF EXISTS public.attendance_sessions CASCADE;
DROP TABLE IF EXISTS public.leave_requests CASCADE;

-- 3. Drop Custom Types / Enums
DROP TYPE IF EXISTS notification_delivery_status CASCADE;
DROP TYPE IF EXISTS leave_status CASCADE;
DROP TYPE IF EXISTS leave_type CASCADE;
DROP TYPE IF EXISTS leave_applicant_type CASCADE;
DROP TYPE IF EXISTS staff_attendance_status CASCADE;
DROP TYPE IF EXISTS attendance_session_status CASCADE;
DROP TYPE IF EXISTS attendance_session_type CASCADE;
DROP TYPE IF EXISTS attendance_status CASCADE;
