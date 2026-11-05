-- ==============================================================================
-- Milestone 7: Universal Examination & Results Management
-- Rollback Migration: 20261105060000_rollback.sql
-- Description: Completely reverses 20261105060000_examination_results.sql
-- ==============================================================================

-- 1. Drop Stored Procedures & Functions
DROP FUNCTION IF EXISTS public.publish_examination_results;
DROP FUNCTION IF EXISTS public.correct_student_exam_mark;
DROP FUNCTION IF EXISTS public.record_student_marks_batch;
DROP FUNCTION IF EXISTS public.check_exam_schedule_conflicts;

-- 2. Drop Tables in Reverse Dependency Order
DROP TABLE IF EXISTS public.exam_revaluations CASCADE;
DROP TABLE IF EXISTS public.hall_tickets CASCADE;
DROP TABLE IF EXISTS public.student_exam_results CASCADE;
DROP TABLE IF EXISTS public.marks_entry_corrections CASCADE;
DROP TABLE IF EXISTS public.student_exam_marks CASCADE;
DROP TABLE IF EXISTS public.exam_subjects CASCADE;
DROP TABLE IF EXISTS public.examinations CASCADE;
DROP TABLE IF EXISTS public.grading_scale_rules CASCADE;
DROP TABLE IF EXISTS public.grading_scales CASCADE;

-- 3. Drop Enums
DROP TYPE IF EXISTS revaluation_status CASCADE;
DROP TYPE IF EXISTS exam_result_status CASCADE;
DROP TYPE IF EXISTS marks_entry_status CASCADE;
DROP TYPE IF EXISTS grading_calculation_type CASCADE;
DROP TYPE IF EXISTS exam_subject_status CASCADE;
DROP TYPE IF EXISTS assessment_type CASCADE;
DROP TYPE IF EXISTS exam_publication_status CASCADE;
DROP TYPE IF EXISTS exam_status CASCADE;
DROP TYPE IF EXISTS exam_type CASCADE;
