-- ==============================================================================
-- Milestone 6: Universal Timetable & Scheduling Engine
-- Rollback Migration: 20261105050000_rollback.sql
-- Description: Completely reverses 20261105050000_timetable_scheduling.sql
-- ==============================================================================

-- 1. Remove column from attendance_sessions
DO $$ BEGIN
  ALTER TABLE public.attendance_sessions
  DROP COLUMN IF EXISTS timetable_entry_id;
EXCEPTION
  WHEN undefined_column THEN null;
END $$;

-- 2. Drop functions & stored procedures
DROP FUNCTION IF EXISTS public.save_timetable_entry;
DROP FUNCTION IF EXISTS public.get_available_substitute_faculty;
DROP FUNCTION IF EXISTS public.check_timetable_entry_conflicts;

-- 3. Drop tables in reverse order of foreign keys
DROP TABLE IF EXISTS public.schedule_notifications CASCADE;
DROP TABLE IF EXISTS public.timetable_substitutions CASCADE;
DROP TABLE IF EXISTS public.timetable_entries CASCADE;
DROP TABLE IF EXISTS public.timetable_periods CASCADE;
DROP TABLE IF EXISTS public.timetable_structures CASCADE;
DROP TABLE IF EXISTS public.rooms CASCADE;

-- 4. Drop enums
DROP TYPE IF EXISTS schedule_notification_recipient CASCADE;
DROP TYPE IF EXISTS schedule_change_type CASCADE;
DROP TYPE IF EXISTS substitution_status CASCADE;
DROP TYPE IF EXISTS session_slot CASCADE;
DROP TYPE IF EXISTS timetable_break_type CASCADE;
DROP TYPE IF EXISTS day_of_week CASCADE;
DROP TYPE IF EXISTS timetable_session_type CASCADE;
DROP TYPE IF EXISTS room_type CASCADE;
