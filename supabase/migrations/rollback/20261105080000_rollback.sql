-- ==============================================================================
-- Milestone 9: Universal Parent & Student Communication Ecosystem
-- Rollback Migration: 20261105080000_rollback.sql
-- Description: Completely reverses 20261105080000_parent_student_communications.sql
-- ==============================================================================

-- 1. Drop Stored Procedures & Functions
DROP FUNCTION IF EXISTS public.submit_parent_child_leave_atomic CASCADE;
DROP FUNCTION IF EXISTS public.submit_homework_atomic CASCADE;
DROP FUNCTION IF EXISTS public.dispatch_notification_atomic CASCADE;

-- 2. Drop Tables in Reverse Dependency Order
DROP TABLE IF EXISTS public.communication_messages CASCADE;
DROP TABLE IF EXISTS public.communication_participants CASCADE;
DROP TABLE IF EXISTS public.communication_threads CASCADE;
DROP TABLE IF EXISTS public.homework_submissions CASCADE;
DROP TABLE IF EXISTS public.homework_assignments CASCADE;
DROP TABLE IF EXISTS public.announcement_acknowledgements CASCADE;
DROP TABLE IF EXISTS public.announcements CASCADE;
DROP TABLE IF EXISTS public.push_device_tokens CASCADE;
DROP TABLE IF EXISTS public.notification_templates CASCADE;
DROP TABLE IF EXISTS public.notification_preferences CASCADE;
DROP TABLE IF EXISTS public.notification_deliveries CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;

-- 3. Drop Enums
DROP TYPE IF EXISTS conversation_type CASCADE;
DROP TYPE IF EXISTS assignment_submission_status CASCADE;
DROP TYPE IF EXISTS announcement_status CASCADE;
DROP TYPE IF EXISTS announcement_priority CASCADE;
DROP TYPE IF EXISTS announcement_scope CASCADE;
DROP TYPE IF EXISTS notification_priority CASCADE;
DROP TYPE IF EXISTS notification_channel CASCADE;
DROP TYPE IF EXISTS notification_category CASCADE;
