-- ==============================================================================
-- Milestone 6: Universal Timetable & Scheduling Engine
-- Migration: 20261105050000_timetable_scheduling.sql
-- Description: Creates configurable timetable structures, period definitions,
-- room/lab management, scheduled weekly entries, conflict detection indexes and
-- functions, faculty substitution workflows, schedule notifications, and
-- links with attendance sessions.
-- ==============================================================================

-- 1. ENUMS
-- ------------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE room_type AS ENUM (
    'classroom',
    'laboratory',
    'seminar_hall',
    'auditorium',
    'computer_lab',
    'library',
    'workshop',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE timetable_session_type AS ENUM (
    'theory',
    'practical',
    'laboratory',
    'tutorial',
    'seminar'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE day_of_week AS ENUM (
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
    'sunday'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE timetable_break_type AS ENUM (
    'none',
    'short_break',
    'lunch',
    'assembly',
    'recess'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE session_slot AS ENUM (
    'morning',
    'afternoon',
    'evening'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE substitution_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE schedule_change_type AS ENUM (
    'substitution',
    'rescheduled',
    'cancelled',
    'room_change',
    'general'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE schedule_notification_recipient AS ENUM (
    'student',
    'faculty',
    'guardian',
    'class',
    'institution'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Room and Lab Management
-- Supports classrooms, laboratories, seminar halls, auditoriums, computer labs
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  room_number TEXT NOT NULL,
  name TEXT,
  building TEXT NOT NULL,
  floor TEXT,
  room_type room_type NOT NULL DEFAULT 'classroom',
  capacity INTEGER NOT NULL DEFAULT 40,
  facilities JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_room_capacity CHECK (capacity > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_institution_campus_room
ON public.rooms (
  institution_id,
  COALESCE(campus_id, '00000000-0000-0000-0000-000000000000'::uuid),
  LOWER(room_number)
);

CREATE INDEX IF NOT EXISTS idx_rooms_institution ON public.rooms(institution_id);
CREATE INDEX IF NOT EXISTS idx_rooms_campus ON public.rooms(institution_id, campus_id);
CREATE INDEX IF NOT EXISTS idx_rooms_type ON public.rooms(institution_id, room_type);
CREATE INDEX IF NOT EXISTS idx_rooms_active ON public.rooms(institution_id, is_active);

-- ==============================================================================
-- 3. Timetable Configuration & Structures
-- Configurable schedules per institution, campus, academic year, and program
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.timetable_structures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.academic_programs(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  working_days TEXT[] NOT NULL DEFAULT ARRAY['monday', 'tuesday', 'wednesday', 'thursday', 'friday'],
  start_time TIME NOT NULL DEFAULT '08:30:00',
  end_time TIME NOT NULL DEFAULT '15:30:00',
  periods_per_day INTEGER NOT NULL DEFAULT 7,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_structure_working_hours CHECK (end_time > start_time),
  CONSTRAINT chk_structure_periods_positive CHECK (periods_per_day > 0)
);

CREATE INDEX IF NOT EXISTS idx_structures_institution ON public.timetable_structures(institution_id);
CREATE INDEX IF NOT EXISTS idx_structures_year ON public.timetable_structures(institution_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_structures_program ON public.timetable_structures(institution_id, program_id);
CREATE INDEX IF NOT EXISTS idx_structures_default ON public.timetable_structures(institution_id, is_default) WHERE is_default = true;

-- Timetable Periods within a Structure
CREATE TABLE IF NOT EXISTS public.timetable_periods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  structure_id UUID NOT NULL REFERENCES public.timetable_structures(id) ON DELETE CASCADE,
  period_number INTEGER NOT NULL,
  name TEXT NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_break BOOLEAN NOT NULL DEFAULT false,
  break_type timetable_break_type NOT NULL DEFAULT 'none',
  session_slot session_slot NOT NULL DEFAULT 'morning',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_period_times CHECK (end_time > start_time),
  CONSTRAINT uq_structure_period UNIQUE (structure_id, period_number)
);

CREATE INDEX IF NOT EXISTS idx_periods_institution ON public.timetable_periods(institution_id);
CREATE INDEX IF NOT EXISTS idx_periods_structure ON public.timetable_periods(structure_id, period_number);

-- ==============================================================================
-- 4. Timetable Entries (Recurring Weekly Schedule)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.timetable_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  structure_id UUID REFERENCES public.timetable_structures(id) ON DELETE SET NULL,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  faculty_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  day_of_week day_of_week NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  period_number INTEGER NOT NULL,
  session_type timetable_session_type NOT NULL DEFAULT 'theory',
  effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_end_date DATE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  color_code TEXT DEFAULT '#3b82f6',
  notes TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_timetable_times CHECK (end_time > start_time),
  CONSTRAINT chk_timetable_dates CHECK (effective_end_date IS NULL OR effective_end_date >= effective_start_date),
  CONSTRAINT chk_timetable_period_positive CHECK (period_number > 0)
);

-- ==============================================================================
-- Conflict Detection: Database Level Partial Unique Indexes
-- ==============================================================================

-- 1. Faculty Conflict: A teacher cannot be assigned to two classes simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS uq_faculty_schedule_slot
ON public.timetable_entries (
  institution_id,
  academic_year_id,
  faculty_id,
  day_of_week,
  period_number
)
WHERE is_active = true;

-- 2. Room Conflict: A room cannot be allocated to multiple classes simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS uq_room_schedule_slot
ON public.timetable_entries (
  institution_id,
  academic_year_id,
  room_id,
  day_of_week,
  period_number
)
WHERE is_active = true AND room_id IS NOT NULL;

-- 3. Class/Section Conflict: A class or section cannot have overlapping periods
CREATE UNIQUE INDEX IF NOT EXISTS uq_class_section_schedule_slot
ON public.timetable_entries (
  institution_id,
  academic_year_id,
  class_id,
  COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid),
  day_of_week,
  period_number
)
WHERE is_active = true;

-- Additional Performance Indexes
CREATE INDEX IF NOT EXISTS idx_entries_institution ON public.timetable_entries(institution_id);
CREATE INDEX IF NOT EXISTS idx_entries_year ON public.timetable_entries(institution_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_entries_class ON public.timetable_entries(institution_id, class_id, section_id);
CREATE INDEX IF NOT EXISTS idx_entries_faculty ON public.timetable_entries(institution_id, faculty_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_entries_room ON public.timetable_entries(institution_id, room_id, day_of_week);
CREATE INDEX IF NOT EXISTS idx_entries_day_period ON public.timetable_entries(institution_id, day_of_week, period_number);

-- ==============================================================================
-- 5. Faculty Substitution
-- Replaces an absent faculty member for a specific calendar date
-- Preserves the original timetable entry unchanged!
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.timetable_substitutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  timetable_entry_id UUID NOT NULL REFERENCES public.timetable_entries(id) ON DELETE CASCADE,
  substitution_date DATE NOT NULL,
  original_faculty_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  substitute_faculty_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  reason TEXT NOT NULL,
  status substitution_status NOT NULL DEFAULT 'pending',
  approved_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  approved_at TIMESTAMPTZ,
  remarks TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_substitute_not_original CHECK (original_faculty_id != substitute_faculty_id)
);

-- At most one active substitution per timetable entry per date
CREATE UNIQUE INDEX IF NOT EXISTS uq_entry_substitution_date
ON public.timetable_substitutions (timetable_entry_id, substitution_date)
WHERE status IN ('pending', 'approved');

CREATE INDEX IF NOT EXISTS idx_substitutions_institution ON public.timetable_substitutions(institution_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_date ON public.timetable_substitutions(institution_id, substitution_date);
CREATE INDEX IF NOT EXISTS idx_substitutions_original ON public.timetable_substitutions(institution_id, original_faculty_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_substitute ON public.timetable_substitutions(institution_id, substitute_faculty_id);
CREATE INDEX IF NOT EXISTS idx_substitutions_status ON public.timetable_substitutions(institution_id, status);

-- ==============================================================================
-- 6. Schedule Notifications
-- Notifies students, faculty, or guardians of timetable changes and substitutions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.schedule_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  recipient_type schedule_notification_recipient NOT NULL DEFAULT 'class',
  recipient_id UUID,
  timetable_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE SET NULL,
  substitution_id UUID REFERENCES public.timetable_substitutions(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  change_type schedule_change_type NOT NULL DEFAULT 'general',
  effective_date DATE,
  is_read BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_sched_notif_institution ON public.schedule_notifications(institution_id);
CREATE INDEX IF NOT EXISTS idx_sched_notif_recipient ON public.schedule_notifications(institution_id, recipient_type, recipient_id);
CREATE INDEX IF NOT EXISTS idx_sched_notif_read ON public.schedule_notifications(institution_id, is_read);

-- ==============================================================================
-- 7. Attendance Integration: Link Attendance Sessions to Timetable
-- ==============================================================================

DO $$ BEGIN
  ALTER TABLE public.attendance_sessions
  ADD COLUMN timetable_entry_id UUID REFERENCES public.timetable_entries(id) ON DELETE SET NULL;
EXCEPTION
  WHEN duplicate_column THEN null;
END $$;

CREATE INDEX IF NOT EXISTS idx_attendance_sessions_timetable
ON public.attendance_sessions (institution_id, timetable_entry_id)
WHERE timetable_entry_id IS NOT NULL;

-- ==============================================================================
-- 8. Stored Procedures & Helper Functions
-- ==============================================================================

-- 8.1 Comprehensive Conflict Check Function
-- Evaluates teacher, room, and cohort overlaps before saving a timetable entry
CREATE OR REPLACE FUNCTION public.check_timetable_entry_conflicts(
  p_institution_id UUID,
  p_academic_year_id UUID,
  p_day_of_week day_of_week,
  p_period_number INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_faculty_id UUID,
  p_room_id UUID,
  p_class_id UUID,
  p_section_id UUID,
  p_exclude_entry_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_type TEXT,
  conflicting_entry_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Check Faculty Conflict (same teacher, same day, period overlap or time overlap)
  RETURN QUERY
  SELECT
    'faculty_conflict'::TEXT,
    te.id,
    ('Faculty is already scheduled for class ' || ac.name || ' during period ' || te.period_number)::TEXT
  FROM public.timetable_entries te
  JOIN public.academic_classes ac ON ac.id = te.class_id
  WHERE te.institution_id = p_institution_id
    AND te.academic_year_id = p_academic_year_id
    AND te.faculty_id = p_faculty_id
    AND te.day_of_week = p_day_of_week
    AND te.is_active = true
    AND (p_exclude_entry_id IS NULL OR te.id != p_exclude_entry_id)
    AND (
      te.period_number = p_period_number OR
      (te.start_time, te.end_time) OVERLAPS (p_start_time, p_end_time)
    )
  LIMIT 1;

  -- 2. Check Room Conflict (same room, same day, period overlap or time overlap)
  IF p_room_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'room_conflict'::TEXT,
      te.id,
      ('Room is already allocated to class ' || ac.name || ' during period ' || te.period_number)::TEXT
    FROM public.timetable_entries te
    JOIN public.academic_classes ac ON ac.id = te.class_id
    WHERE te.institution_id = p_institution_id
      AND te.academic_year_id = p_academic_year_id
      AND te.room_id = p_room_id
      AND te.day_of_week = p_day_of_week
      AND te.is_active = true
      AND (p_exclude_entry_id IS NULL OR te.id != p_exclude_entry_id)
      AND (
        te.period_number = p_period_number OR
        (te.start_time, te.end_time) OVERLAPS (p_start_time, p_end_time)
      )
    LIMIT 1;
  END IF;

  -- 3. Check Class/Section Conflict (same class and section, same day, period overlap or time overlap)
  RETURN QUERY
  SELECT
    'class_conflict'::TEXT,
    te.id,
    ('Class cohort already has subject ' || asub.name || ' scheduled during period ' || te.period_number)::TEXT
  FROM public.timetable_entries te
  JOIN public.academic_subjects asub ON asub.id = te.subject_id
  WHERE te.institution_id = p_institution_id
    AND te.academic_year_id = p_academic_year_id
    AND te.class_id = p_class_id
    AND (
      (p_section_id IS NULL AND te.section_id IS NULL) OR
      (te.section_id = p_section_id)
    )
    AND te.day_of_week = p_day_of_week
    AND te.is_active = true
    AND (p_exclude_entry_id IS NULL OR te.id != p_exclude_entry_id)
    AND (
      te.period_number = p_period_number OR
      (te.start_time, te.end_time) OVERLAPS (p_start_time, p_end_time)
    )
  LIMIT 1;
END;
$$;

-- 8.2 Available Substitute Faculty Discovery
-- Finds faculty members of the institution who are available for substitution
CREATE OR REPLACE FUNCTION public.get_available_substitute_faculty(
  p_institution_id UUID,
  p_substitution_date DATE,
  p_day_of_week day_of_week,
  p_period_number INTEGER,
  p_start_time TIME,
  p_end_time TIME,
  p_exclude_faculty_id UUID DEFAULT NULL
)
RETURNS TABLE (
  staff_id UUID,
  employee_id TEXT,
  first_name TEXT,
  last_name TEXT,
  designation TEXT,
  department_name TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    sp.id AS staff_id,
    sp.employee_id,
    sp.first_name,
    sp.last_name,
    sp.designation,
    ad.name AS department_name
  FROM public.staff_profiles sp
  LEFT JOIN public.academic_departments ad ON ad.id = sp.department_id
  WHERE sp.institution_id = p_institution_id
    AND sp.category = 'teaching'
    AND sp.status = 'active'
    AND (p_exclude_faculty_id IS NULL OR sp.id != p_exclude_faculty_id)
    -- Must not have a regular timetable entry at that time
    AND NOT EXISTS (
      SELECT 1 FROM public.timetable_entries te
      WHERE te.institution_id = p_institution_id
        AND te.faculty_id = sp.id
        AND te.day_of_week = p_day_of_week
        AND te.is_active = true
        AND (
          te.period_number = p_period_number OR
          (te.start_time, te.end_time) OVERLAPS (p_start_time, p_end_time)
        )
    )
    -- Must not have an approved substitution at that time
    AND NOT EXISTS (
      SELECT 1 FROM public.timetable_substitutions ts
      JOIN public.timetable_entries te2 ON te2.id = ts.timetable_entry_id
      WHERE ts.institution_id = p_institution_id
        AND ts.substitute_faculty_id = sp.id
        AND ts.substitution_date = p_substitution_date
        AND ts.status IN ('pending', 'approved')
        AND (
          te2.period_number = p_period_number OR
          (te2.start_time, te2.end_time) OVERLAPS (p_start_time, p_end_time)
        )
    )
    -- Must not be on approved leave on that date
    AND NOT EXISTS (
      SELECT 1 FROM public.leave_requests lr
      WHERE lr.institution_id = p_institution_id
        AND lr.staff_id = sp.id
        AND lr.status = 'approved'
        AND p_substitution_date BETWEEN lr.start_date AND lr.end_date
    )
  ORDER BY sp.first_name ASC, sp.last_name ASC;
END;
$$;

-- 8.3 Atomic Save Timetable Entry with Concurrent Protection
CREATE OR REPLACE FUNCTION public.save_timetable_entry(
  p_institution_id UUID,
  p_academic_year_id UUID,
  p_campus_id UUID,
  p_structure_id UUID,
  p_class_id UUID,
  p_section_id UUID,
  p_subject_id UUID,
  p_faculty_id UUID,
  p_room_id UUID,
  p_day_of_week day_of_week,
  p_start_time TIME,
  p_end_time TIME,
  p_period_number INTEGER,
  p_session_type timetable_session_type DEFAULT 'theory',
  p_effective_start_date DATE DEFAULT CURRENT_DATE,
  p_effective_end_date DATE DEFAULT NULL,
  p_color_code TEXT DEFAULT '#3b82f6',
  p_notes TEXT DEFAULT NULL,
  p_user_id UUID DEFAULT NULL,
  p_entry_id UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_conflict RECORD;
  v_result_id UUID;
  v_lock_key BIGINT;
BEGIN
  -- Validate times
  IF p_end_time <= p_start_time THEN
    RAISE EXCEPTION 'Invalid period timings: end_time must be after start_time';
  END IF;

  -- Acquire transaction-level advisory lock per institution and day to prevent race conditions
  v_lock_key := ('x' || substr(md5(p_institution_id::text || p_day_of_week::text || p_period_number::text), 1, 15))::bit(64)::bigint;
  PERFORM pg_advisory_xact_lock(v_lock_key);

  -- Run conflict check
  SELECT * INTO v_conflict
  FROM public.check_timetable_entry_conflicts(
    p_institution_id,
    p_academic_year_id,
    p_day_of_week,
    p_period_number,
    p_start_time,
    p_end_time,
    p_faculty_id,
    p_room_id,
    p_class_id,
    p_section_id,
    p_entry_id
  );

  IF v_conflict.conflict_type IS NOT NULL THEN
    RAISE EXCEPTION 'TIMETABLE_CONFLICT [%]: %', v_conflict.conflict_type, v_conflict.message;
  END IF;

  IF p_entry_id IS NOT NULL THEN
    -- Update existing entry
    UPDATE public.timetable_entries
    SET
      campus_id = p_campus_id,
      structure_id = p_structure_id,
      class_id = p_class_id,
      section_id = p_section_id,
      subject_id = p_subject_id,
      faculty_id = p_faculty_id,
      room_id = p_room_id,
      day_of_week = p_day_of_week,
      start_time = p_start_time,
      end_time = p_end_time,
      period_number = p_period_number,
      session_type = p_session_type,
      effective_start_date = p_effective_start_date,
      effective_end_date = p_effective_end_date,
      color_code = p_color_code,
      notes = p_notes,
      updated_at = timezone('utc', now())
    WHERE id = p_entry_id AND institution_id = p_institution_id;
    v_result_id := p_entry_id;
  ELSE
    -- Insert new entry
    INSERT INTO public.timetable_entries (
      institution_id,
      academic_year_id,
      campus_id,
      structure_id,
      class_id,
      section_id,
      subject_id,
      faculty_id,
      room_id,
      day_of_week,
      start_time,
      end_time,
      period_number,
      session_type,
      effective_start_date,
      effective_end_date,
      color_code,
      notes,
      created_by
    ) VALUES (
      p_institution_id,
      p_academic_year_id,
      p_campus_id,
      p_structure_id,
      p_class_id,
      p_section_id,
      p_subject_id,
      p_faculty_id,
      p_room_id,
      p_day_of_week,
      p_start_time,
      p_end_time,
      p_period_number,
      p_session_type,
      p_effective_start_date,
      p_effective_end_date,
      p_color_code,
      p_notes,
      p_user_id
    ) RETURNING id INTO v_result_id;
  END IF;

  RETURN v_result_id;
END;
$$;

-- ==============================================================================
-- 9. Row-Level Security (RLS) Policies
-- Tenant isolation via get_user_institution_ids() and active membership checks
-- ==============================================================================

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_structures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_periods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.timetable_substitutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_notifications ENABLE ROW LEVEL SECURITY;

-- 9.1 Rooms Policies
CREATE POLICY "rooms_select"
ON public.rooms FOR SELECT
USING (institution_id IN (SELECT public.get_user_institution_ids()));

CREATE POLICY "rooms_insert"
ON public.rooms FOR INSERT
WITH CHECK (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = rooms.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "rooms_update"
ON public.rooms FOR UPDATE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = rooms.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "rooms_delete"
ON public.rooms FOR DELETE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = rooms.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 9.2 Timetable Structures Policies
CREATE POLICY "structures_select"
ON public.timetable_structures FOR SELECT
USING (institution_id IN (SELECT public.get_user_institution_ids()));

CREATE POLICY "structures_insert"
ON public.timetable_structures FOR INSERT
WITH CHECK (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_structures.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "structures_update"
ON public.timetable_structures FOR UPDATE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_structures.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "structures_delete"
ON public.timetable_structures FOR DELETE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_structures.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 9.3 Timetable Periods Policies
CREATE POLICY "periods_select"
ON public.timetable_periods FOR SELECT
USING (institution_id IN (SELECT public.get_user_institution_ids()));

CREATE POLICY "periods_insert"
ON public.timetable_periods FOR INSERT
WITH CHECK (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_periods.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "periods_update"
ON public.timetable_periods FOR UPDATE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_periods.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "periods_delete"
ON public.timetable_periods FOR DELETE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_periods.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 9.4 Timetable Entries Policies
CREATE POLICY "entries_select"
ON public.timetable_entries FOR SELECT
USING (institution_id IN (SELECT public.get_user_institution_ids()));

CREATE POLICY "entries_insert"
ON public.timetable_entries FOR INSERT
WITH CHECK (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_entries.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

CREATE POLICY "entries_update"
ON public.timetable_entries FOR UPDATE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_entries.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

CREATE POLICY "entries_delete"
ON public.timetable_entries FOR DELETE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_entries.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

-- 9.5 Timetable Substitutions Policies
CREATE POLICY "substitutions_select"
ON public.timetable_substitutions FOR SELECT
USING (institution_id IN (SELECT public.get_user_institution_ids()));

CREATE POLICY "substitutions_insert"
ON public.timetable_substitutions FOR INSERT
WITH CHECK (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_substitutions.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty')
  )
);

CREATE POLICY "substitutions_update"
ON public.timetable_substitutions FOR UPDATE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_substitutions.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

CREATE POLICY "substitutions_delete"
ON public.timetable_substitutions FOR DELETE
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = timetable_substitutions.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 9.6 Schedule Notifications Policies
CREATE POLICY "sched_notif_select"
ON public.schedule_notifications FOR SELECT
USING (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  (
    -- Administrator or Coordinator
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = schedule_notifications.institution_id
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
    )
    OR
    -- Direct Recipient
    recipient_id = auth.uid()
    OR
    -- Class/Student/Faculty notification
    EXISTS (
      SELECT 1 FROM public.staff_profiles sp
      WHERE sp.user_id = auth.uid()
        AND sp.id = recipient_id
    )
    OR
    EXISTS (
      SELECT 1 FROM public.students s
      WHERE s.user_id = auth.uid()
        AND s.id = recipient_id
    )
  )
);

CREATE POLICY "sched_notif_insert"
ON public.schedule_notifications FOR INSERT
WITH CHECK (
  institution_id IN (SELECT public.get_user_institution_ids()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = schedule_notifications.institution_id
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty')
  )
);
