-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Rollback Migration: 20261105030000_rollback.sql
-- Reverses Milestone 4: Staff & Faculty Management System
-- ==============================================================================

-- 1. Drop Stored Procedures
DROP FUNCTION IF EXISTS public.accept_staff_invitation(TEXT, UUID);

-- 2. Drop Milestone 4 Tables (in reverse dependency order)
DROP TABLE IF EXISTS public.staff_invitations CASCADE;
DROP TABLE IF EXISTS public.staff_documents CASCADE;
DROP TABLE IF EXISTS public.faculty_allocations CASCADE;
DROP TABLE IF EXISTS public.staff_employments CASCADE;
DROP TABLE IF EXISTS public.staff_profiles CASCADE;

-- 3. Drop Milestone 4 Enums
DROP TYPE IF EXISTS public.invitation_status CASCADE;
DROP TYPE IF EXISTS public.staff_document_type CASCADE;
DROP TYPE IF EXISTS public.employment_status CASCADE;
DROP TYPE IF EXISTS public.employment_type CASCADE;
DROP TYPE IF EXISTS public.staff_category CASCADE;
