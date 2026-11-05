-- ==============================================================================
-- ROLLBACK SCRIPT: 20261105010000_rollback.sql
-- Reverses 20261105010000_academic_hierarchy.sql in strict reverse dependency order
-- ==============================================================================

-- 1. Drop Tables
DROP TABLE IF EXISTS public.academic_class_subjects CASCADE;
DROP TABLE IF EXISTS public.academic_subjects CASCADE;
DROP TABLE IF EXISTS public.academic_sections CASCADE;
DROP TABLE IF EXISTS public.academic_classes CASCADE;
DROP TABLE IF EXISTS public.academic_programs CASCADE;
DROP TABLE IF EXISTS public.academic_departments CASCADE;

-- 2. Drop Custom Enums
DROP TYPE IF EXISTS subject_category_type;
DROP TYPE IF EXISTS academic_level_type;
DROP TYPE IF EXISTS academic_record_status;
