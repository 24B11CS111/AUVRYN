-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Rollback Migration: 20261105020000_rollback.sql
-- Milestone 3: Student Management & Admissions System Rollback
-- ==============================================================================

BEGIN;

-- 1. Drop Stored Procedures
DROP FUNCTION IF EXISTS public.convert_admission_to_student(UUID, TEXT, UUID, TEXT);
DROP FUNCTION IF EXISTS public.is_guardian_of_student(UUID);

-- 2. Drop Tables in reverse dependency order
DROP TABLE IF EXISTS public.student_documents CASCADE;
DROP TABLE IF EXISTS public.admission_status_history CASCADE;
DROP TABLE IF EXISTS public.admission_applications CASCADE;
DROP TABLE IF EXISTS public.student_enrollments CASCADE;
DROP TABLE IF EXISTS public.student_guardians CASCADE;
DROP TABLE IF EXISTS public.guardians CASCADE;
DROP TABLE IF EXISTS public.students CASCADE;

-- 3. Drop Enums
DROP TYPE IF EXISTS admission_status;
DROP TYPE IF EXISTS document_verification_status;
DROP TYPE IF EXISTS document_type;
DROP TYPE IF EXISTS enrollment_status;
DROP TYPE IF EXISTS student_gender;
DROP TYPE IF EXISTS student_status;

COMMIT;
