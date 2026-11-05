-- ==============================================================================
-- Milestone 7: Universal Examination & Results Management
-- Migration: 20261105060000_examination_results.sql
-- Description: Configurable examinations, subject allocations, grading scales,
-- student marks entry, marks revision audit history, consolidated results,
-- examination scheduling with room & invigilator conflict checking, hall tickets,
-- and revaluation request workflows.
-- ==============================================================================

-- 1. ENUMS
-- ------------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE exam_type AS ENUM (
    'internal_assessment',
    'unit_test',
    'midterm',
    'semester_exam',
    'annual_exam',
    'practical_exam',
    'laboratory_exam',
    'assignment',
    'project',
    'viva',
    'final_exam'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_status AS ENUM (
    'draft',
    'scheduled',
    'in_progress',
    'completed',
    'published',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_publication_status AS ENUM (
    'unpublished',
    'under_review',
    'published',
    'withdrawn'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE assessment_type AS ENUM (
    'theory',
    'practical',
    'laboratory',
    'internal_assessment',
    'external_assessment',
    'viva',
    'project'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_subject_status AS ENUM (
    'scheduled',
    'completed',
    'cancelled'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE grading_calculation_type AS ENUM (
    'gpa_10_point',
    'gpa_4_point',
    'letter_grade_percentage',
    'marks_based',
    'pass_fail'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE marks_entry_status AS ENUM (
    'draft',
    'submitted',
    'verified',
    'locked'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE exam_result_status AS ENUM (
    'pass',
    'fail',
    'distinction',
    'promoted_with_backlog',
    'withheld'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE revaluation_status AS ENUM (
    'applied',
    'assigned',
    'under_review',
    'completed',
    'rejected'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Grading Scales & Rules (Configurable per Institution & Academic Tier)
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.grading_scales (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  calculation_type grading_calculation_type NOT NULL DEFAULT 'letter_grade_percentage',
  is_credit_based BOOLEAN NOT NULL DEFAULT false,
  version INTEGER NOT NULL DEFAULT 1,
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_grading_scales_institution ON public.grading_scales(institution_id);
CREATE INDEX IF NOT EXISTS idx_grading_scales_default ON public.grading_scales(institution_id, is_default) WHERE is_default = true;

CREATE TABLE IF NOT EXISTS public.grading_scale_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  grading_scale_id UUID NOT NULL REFERENCES public.grading_scales(id) ON DELETE CASCADE,
  grade TEXT NOT NULL,
  grade_point NUMERIC(4,2) NOT NULL DEFAULT 0.00,
  min_percentage NUMERIC(5,2) NOT NULL,
  max_percentage NUMERIC(5,2) NOT NULL,
  description TEXT,
  is_passing BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_grading_percentage CHECK (max_percentage >= min_percentage)
);

CREATE INDEX IF NOT EXISTS idx_grading_rules_scale ON public.grading_scale_rules(grading_scale_id);

-- ==============================================================================
-- 3. Examinations Configuration
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.examinations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  program_id UUID REFERENCES public.academic_programs(id) ON DELETE SET NULL,
  class_id UUID REFERENCES public.academic_classes(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  exam_type exam_type NOT NULL DEFAULT 'midterm',
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  passing_marks NUMERIC(6,2) NOT NULL DEFAULT 40.00,
  weightage_percentage NUMERIC(5,2) NOT NULL DEFAULT 100.00,
  grading_scale_id UUID REFERENCES public.grading_scales(id) ON DELETE SET NULL,
  status exam_status NOT NULL DEFAULT 'draft',
  publication_status exam_publication_status NOT NULL DEFAULT 'unpublished',
  published_at TIMESTAMPTZ,
  published_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  instructions TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT chk_exam_dates CHECK (end_date >= start_date),
  CONSTRAINT chk_exam_marks CHECK (passing_marks <= max_marks),
  CONSTRAINT chk_exam_weightage CHECK (weightage_percentage > 0 AND weightage_percentage <= 100)
);

CREATE INDEX IF NOT EXISTS idx_exams_institution ON public.examinations(institution_id);
CREATE INDEX IF NOT EXISTS idx_exams_academic_year ON public.examinations(institution_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_exams_status ON public.examinations(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_exams_publication ON public.examinations(institution_id, publication_status);

-- ==============================================================================
-- 4. Exam Subject Allocations & Schedule
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.exam_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  examination_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  assessment_type assessment_type NOT NULL DEFAULT 'theory',
  max_marks NUMERIC(6,2) NOT NULL DEFAULT 100.00,
  passing_marks NUMERIC(6,2) NOT NULL DEFAULT 40.00,
  credits NUMERIC(4,2) NOT NULL DEFAULT 3.00,
  exam_date DATE,
  start_time TIME,
  end_time TIME,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  invigilator_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  status exam_subject_status NOT NULL DEFAULT 'scheduled',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_exam_sub_marks CHECK (passing_marks <= max_marks),
  CONSTRAINT chk_exam_sub_times CHECK (end_time IS NULL OR start_time IS NULL OR end_time > start_time),
  CONSTRAINT uq_exam_subject_assessment UNIQUE (examination_id, subject_id, assessment_type)
);

CREATE INDEX IF NOT EXISTS idx_exam_subjects_exam ON public.exam_subjects(examination_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_subject ON public.exam_subjects(subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_schedule ON public.exam_subjects(exam_date, start_time, room_id);
CREATE INDEX IF NOT EXISTS idx_exam_subjects_invigilator ON public.exam_subjects(exam_date, start_time, invigilator_staff_id);

-- ==============================================================================
-- 5. Student Exam Marks & Historical Corrections
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_exam_marks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  examination_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  exam_subject_id UUID NOT NULL REFERENCES public.exam_subjects(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  enrollment_id UUID REFERENCES public.student_enrollments(id) ON DELETE SET NULL,
  marks_obtained NUMERIC(6,2),
  is_absent BOOLEAN NOT NULL DEFAULT false,
  is_exempted BOOLEAN NOT NULL DEFAULT false,
  grade TEXT,
  grade_point NUMERIC(4,2),
  status marks_entry_status NOT NULL DEFAULT 'draft',
  remarks TEXT,
  entered_by_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  submitted_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_marks_obtained_positive CHECK (marks_obtained IS NULL OR marks_obtained >= 0),
  CONSTRAINT uq_exam_subject_student UNIQUE (exam_subject_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_marks_institution ON public.student_exam_marks(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_exam ON public.student_exam_marks(examination_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_subject ON public.student_exam_marks(exam_subject_id);
CREATE INDEX IF NOT EXISTS idx_exam_marks_student ON public.student_exam_marks(student_id);

-- Immutable audit history for marks revisions (Do not silently overwrite!)
CREATE TABLE IF NOT EXISTS public.marks_entry_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_exam_mark_id UUID NOT NULL REFERENCES public.student_exam_marks(id) ON DELETE CASCADE,
  previous_marks NUMERIC(6,2),
  new_marks NUMERIC(6,2),
  previous_status marks_entry_status NOT NULL,
  new_status marks_entry_status NOT NULL,
  reason TEXT NOT NULL,
  corrected_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  corrected_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_marks_corrections_mark ON public.marks_entry_corrections(student_exam_mark_id);

-- ==============================================================================
-- 6. Consolidated Student Exam Results & Transcripts
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.student_exam_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  examination_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE RESTRICT,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE SET NULL,
  grading_scale_id UUID REFERENCES public.grading_scales(id) ON DELETE SET NULL,
  grading_scale_version INTEGER NOT NULL DEFAULT 1,
  total_max_marks NUMERIC(7,2) NOT NULL DEFAULT 0.00,
  total_obtained_marks NUMERIC(7,2) NOT NULL DEFAULT 0.00,
  percentage NUMERIC(5,2) NOT NULL DEFAULT 0.00,
  gpa NUMERIC(4,2),
  cgpa NUMERIC(4,2),
  final_grade TEXT,
  result_status exam_result_status NOT NULL DEFAULT 'pass',
  backlog_count INTEGER NOT NULL DEFAULT 0,
  is_published BOOLEAN NOT NULL DEFAULT false,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_exam_student_result UNIQUE (examination_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_exam_results_institution ON public.student_exam_results(institution_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_exam ON public.student_exam_results(examination_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_student ON public.student_exam_results(student_id);
CREATE INDEX IF NOT EXISTS idx_exam_results_published ON public.student_exam_results(institution_id, is_published) WHERE is_published = true;

-- ==============================================================================
-- 7. Hall Tickets
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.hall_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  examination_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  ticket_number TEXT NOT NULL,
  is_eligible BOOLEAN NOT NULL DEFAULT true,
  ineligibility_reason TEXT,
  qr_code_hash TEXT NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  generated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_hall_ticket_exam_student UNIQUE (examination_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_hall_tickets_exam ON public.hall_tickets(examination_id);
CREATE INDEX IF NOT EXISTS idx_hall_tickets_student ON public.hall_tickets(student_id);

-- ==============================================================================
-- 8. Revaluation & Supplementary Tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.exam_revaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_exam_mark_id UUID NOT NULL REFERENCES public.student_exam_marks(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  examination_id UUID NOT NULL REFERENCES public.examinations(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  original_marks NUMERIC(6,2) NOT NULL,
  revised_marks NUMERIC(6,2),
  status revaluation_status NOT NULL DEFAULT 'applied',
  reason TEXT NOT NULL,
  reviewer_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  review_notes TEXT,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  completed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_revaluations_exam ON public.exam_revaluations(examination_id);
CREATE INDEX IF NOT EXISTS idx_revaluations_student ON public.exam_revaluations(student_id);
CREATE INDEX IF NOT EXISTS idx_revaluations_status ON public.exam_revaluations(institution_id, status);

-- ==============================================================================
-- 9. Stored Procedures & Business Logic
-- ==============================================================================

-- 9.1 Check Examination Room & Invigilator Schedule Conflicts
CREATE OR REPLACE FUNCTION public.check_exam_schedule_conflicts(
  p_institution_id UUID,
  p_exam_date DATE,
  p_start_time TIME,
  p_end_time TIME,
  p_room_id UUID DEFAULT NULL,
  p_invigilator_staff_id UUID DEFAULT NULL,
  p_exclude_exam_subject_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflict_type TEXT,
  conflicting_id UUID,
  message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Room conflict check
  IF p_room_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'room_conflict'::TEXT,
      es.id,
      ('Room is already booked for examination subject ' || asub.name || ' at this time')::TEXT
    FROM public.exam_subjects es
    JOIN public.academic_subjects asub ON asub.id = es.subject_id
    WHERE es.institution_id = p_institution_id
      AND es.exam_date = p_exam_date
      AND es.room_id = p_room_id
      AND es.status != 'cancelled'
      AND (p_exclude_exam_subject_id IS NULL OR es.id != p_exclude_exam_subject_id)
      AND (es.start_time, es.end_time) OVERLAPS (p_start_time, p_end_time)
    LIMIT 1;
  END IF;

  -- Invigilator conflict check
  IF p_invigilator_staff_id IS NOT NULL THEN
    RETURN QUERY
    SELECT
      'invigilator_conflict'::TEXT,
      es.id,
      ('Faculty member is already allocated as invigilator for subject ' || asub.name || ' at this time')::TEXT
    FROM public.exam_subjects es
    JOIN public.academic_subjects asub ON asub.id = es.subject_id
    WHERE es.institution_id = p_institution_id
      AND es.exam_date = p_exam_date
      AND es.invigilator_staff_id = p_invigilator_staff_id
      AND es.status != 'cancelled'
      AND (p_exclude_exam_subject_id IS NULL OR es.id != p_exclude_exam_subject_id)
      AND (es.start_time, es.end_time) OVERLAPS (p_start_time, p_end_time)
    LIMIT 1;
  END IF;
END;
$$;

-- 9.2 Atomic Batch Marks Entry with Calculation & Max-Marks Enforcement
CREATE OR REPLACE FUNCTION public.record_student_marks_batch(
  p_institution_id UUID,
  p_examination_id UUID,
  p_exam_subject_id UUID,
  p_marks JSONB, -- Array of { student_id, marks_obtained, is_absent, remarks }
  p_user_id UUID,
  p_staff_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam_sub RECORD;
  v_scale_id UUID;
  v_item JSONB;
  v_student_id UUID;
  v_marks_val NUMERIC;
  v_is_absent BOOLEAN;
  v_remarks TEXT;
  v_percentage NUMERIC;
  v_grade TEXT;
  v_grade_point NUMERIC;
  v_processed_count INTEGER := 0;
BEGIN
  -- Fetch exam subject details and maximum marks
  SELECT es.max_marks, es.passing_marks, e.grading_scale_id
  INTO v_exam_sub
  FROM public.exam_subjects es
  JOIN public.examinations e ON e.id = es.examination_id
  WHERE es.id = p_exam_subject_id AND es.institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examination subject not found or invalid tenant';
  END IF;

  v_scale_id := v_exam_sub.grading_scale_id;

  -- Loop through each item in the batch
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_marks)
  LOOP
    v_student_id := (v_item->>'student_id')::UUID;
    v_is_absent := COALESCE((v_item->>'is_absent')::BOOLEAN, false);
    v_remarks := v_item->>'remarks';

    IF v_is_absent THEN
      v_marks_val := 0.00;
      v_grade := 'Ab';
      v_grade_point := 0.00;
    ELSE
      v_marks_val := (v_item->>'marks_obtained')::NUMERIC;
      IF v_marks_val > v_exam_sub.max_marks THEN
        RAISE EXCEPTION 'Marks obtained (%) exceeds maximum allowed marks (%) for student %',
          v_marks_val, v_exam_sub.max_marks, v_student_id;
      END IF;

      -- Calculate percentage
      v_percentage := (v_marks_val / v_exam_sub.max_marks) * 100.00;

      -- Determine Grade & Grade Point from grading scale if present
      IF v_scale_id IS NOT NULL THEN
        SELECT r.grade, r.grade_point
        INTO v_grade, v_grade_point
        FROM public.grading_scale_rules r
        WHERE r.grading_scale_id = v_scale_id
          AND v_percentage >= r.min_percentage
          AND v_percentage <= r.max_percentage
        ORDER BY r.min_percentage DESC
        LIMIT 1;
      END IF;

      IF v_grade IS NULL THEN
        IF v_marks_val >= v_exam_sub.passing_marks THEN
          v_grade := 'P';
          v_grade_point := 4.00;
        ELSE
          v_grade := 'F';
          v_grade_point := 0.00;
        END IF;
      END IF;
    END IF;

    -- Upsert student exam marks
    INSERT INTO public.student_exam_marks (
      institution_id,
      examination_id,
      exam_subject_id,
      student_id,
      marks_obtained,
      is_absent,
      grade,
      grade_point,
      remarks,
      entered_by_staff_id,
      status,
      updated_at
    ) VALUES (
      p_institution_id,
      p_examination_id,
      p_exam_subject_id,
      v_student_id,
      v_marks_val,
      v_is_absent,
      v_grade,
      v_grade_point,
      v_remarks,
      p_staff_id,
      'submitted',
      timezone('utc', now())
    )
    ON CONFLICT (exam_subject_id, student_id)
    DO UPDATE SET
      marks_obtained = EXCLUDED.marks_obtained,
      is_absent = EXCLUDED.is_absent,
      grade = EXCLUDED.grade,
      grade_point = EXCLUDED.grade_point,
      remarks = EXCLUDED.remarks,
      entered_by_staff_id = COALESCE(EXCLUDED.entered_by_staff_id, student_exam_marks.entered_by_staff_id),
      status = 'submitted',
      updated_at = timezone('utc', now());

    v_processed_count := v_processed_count + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'success', true,
    'processed_count', v_processed_count
  );
END;
$$;

-- 9.3 Correct Student Exam Mark (With Immutable Audit Trail)
CREATE OR REPLACE FUNCTION public.correct_student_exam_mark(
  p_institution_id UUID,
  p_mark_id UUID,
  p_new_marks NUMERIC,
  p_reason TEXT,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old RECORD;
  v_exam_sub RECORD;
  v_scale_id UUID;
  v_percentage NUMERIC;
  v_grade TEXT;
  v_grade_point NUMERIC;
BEGIN
  SELECT * INTO v_old
  FROM public.student_exam_marks
  WHERE id = p_mark_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Mark record not found or invalid tenant';
  END IF;

  SELECT es.max_marks, es.passing_marks, e.grading_scale_id
  INTO v_exam_sub
  FROM public.exam_subjects es
  JOIN public.examinations e ON e.id = es.examination_id
  WHERE es.id = v_old.exam_subject_id;

  IF p_new_marks > v_exam_sub.max_marks THEN
    RAISE EXCEPTION 'Revised mark (%) exceeds maximum marks (%)', p_new_marks, v_exam_sub.max_marks;
  END IF;

  v_scale_id := v_exam_sub.grading_scale_id;
  v_percentage := (p_new_marks / v_exam_sub.max_marks) * 100.00;

  IF v_scale_id IS NOT NULL THEN
    SELECT r.grade, r.grade_point
    INTO v_grade, v_grade_point
    FROM public.grading_scale_rules r
    WHERE r.grading_scale_id = v_scale_id
      AND v_percentage >= r.min_percentage
      AND v_percentage <= r.max_percentage
    ORDER BY r.min_percentage DESC
    LIMIT 1;
  END IF;

  -- 1. Insert immutable history row
  INSERT INTO public.marks_entry_corrections (
    institution_id,
    student_exam_mark_id,
    previous_marks,
    new_marks,
    previous_status,
    new_status,
    reason,
    corrected_by
  ) VALUES (
    p_institution_id,
    p_mark_id,
    v_old.marks_obtained,
    p_new_marks,
    v_old.status,
    'verified',
    p_reason,
    p_user_id
  );

  -- 2. Update mark record
  UPDATE public.student_exam_marks
  SET
    marks_obtained = p_new_marks,
    grade = v_grade,
    grade_point = v_grade_point,
    status = 'verified',
    verified_by = p_user_id,
    verified_at = timezone('utc', now()),
    updated_at = timezone('utc', now())
  WHERE id = p_mark_id;

  RETURN jsonb_build_object(
    'success', true,
    'mark_id', p_mark_id,
    'new_marks', p_new_marks
  );
END;
$$;

-- 9.4 Consolidate & Publish Examination Results
CREATE OR REPLACE FUNCTION public.publish_examination_results(
  p_institution_id UUID,
  p_examination_id UUID,
  p_user_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_exam RECORD;
  v_student RECORD;
  v_scale_id UUID;
  v_scale_ver INTEGER := 1;
  v_tot_max NUMERIC;
  v_tot_obtained NUMERIC;
  v_percentage NUMERIC;
  v_gpa NUMERIC;
  v_backlogs INTEGER;
  v_final_grade TEXT;
  v_result_status exam_result_status;
  v_published_count INTEGER := 0;
BEGIN
  SELECT * INTO v_exam
  FROM public.examinations
  WHERE id = p_examination_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Examination not found or invalid tenant';
  END IF;

  v_scale_id := v_exam.grading_scale_id;
  IF v_scale_id IS NOT NULL THEN
    SELECT version INTO v_scale_ver FROM public.grading_scales WHERE id = v_scale_id;
  END IF;

  -- Consolidate results for every student with marks in this exam
  FOR v_student IN
    SELECT DISTINCT sem.student_id, se.academic_class_id AS class_id, se.academic_section_id AS section_id
    FROM public.student_exam_marks sem
    LEFT JOIN public.student_enrollments se ON se.student_id = sem.student_id AND se.academic_year_id = v_exam.academic_year_id
    WHERE sem.examination_id = p_examination_id
  LOOP
    -- Calculate aggregates
    SELECT
      COALESCE(SUM(es.max_marks), 0),
      COALESCE(SUM(sem.marks_obtained), 0),
      COALESCE(AVG(sem.grade_point), 0),
      COUNT(CASE WHEN sem.marks_obtained < es.passing_marks OR sem.is_absent = true THEN 1 END)
    INTO v_tot_max, v_tot_obtained, v_gpa, v_backlogs
    FROM public.student_exam_marks sem
    JOIN public.exam_subjects es ON es.id = sem.exam_subject_id
    WHERE sem.examination_id = p_examination_id
      AND sem.student_id = v_student.student_id;

    IF v_tot_max > 0 THEN
      v_percentage := (v_tot_obtained / v_tot_max) * 100.00;
    ELSE
      v_percentage := 0.00;
    END IF;

    -- Determine Pass/Fail / Distinction status
    IF v_backlogs = 0 THEN
      IF v_percentage >= 75.00 THEN
        v_result_status := 'distinction';
      ELSE
        v_result_status := 'pass';
      END IF;
    ELSIF v_backlogs <= 2 THEN
      v_result_status := 'promoted_with_backlog';
    ELSE
      v_result_status := 'fail';
    END IF;

    -- Determine overall final grade
    IF v_scale_id IS NOT NULL THEN
      SELECT r.grade INTO v_final_grade
      FROM public.grading_scale_rules r
      WHERE r.grading_scale_id = v_scale_id
        AND v_percentage >= r.min_percentage
        AND v_percentage <= r.max_percentage
      ORDER BY r.min_percentage DESC
      LIMIT 1;
    END IF;

    IF v_final_grade IS NULL THEN
      v_final_grade := CASE WHEN v_result_status IN ('pass', 'distinction') THEN 'PASS' ELSE 'FAIL' END;
    END IF;

    -- Upsert consolidated result
    INSERT INTO public.student_exam_results (
      institution_id,
      examination_id,
      student_id,
      academic_year_id,
      class_id,
      section_id,
      grading_scale_id,
      grading_scale_version,
      total_max_marks,
      total_obtained_marks,
      percentage,
      gpa,
      final_grade,
      result_status,
      backlog_count,
      is_published,
      published_at,
      updated_at
    ) VALUES (
      p_institution_id,
      p_examination_id,
      v_student.student_id,
      v_exam.academic_year_id,
      COALESCE(v_student.class_id, v_exam.class_id, '00000000-0000-0000-0000-000000000000'::uuid),
      v_student.section_id,
      v_scale_id,
      COALESCE(v_scale_ver, 1),
      v_tot_max,
      v_tot_obtained,
      v_percentage,
      v_gpa,
      v_final_grade,
      v_result_status,
      v_backlogs,
      true,
      timezone('utc', now()),
      timezone('utc', now())
    )
    ON CONFLICT (examination_id, student_id)
    DO UPDATE SET
      total_max_marks = EXCLUDED.total_max_marks,
      total_obtained_marks = EXCLUDED.total_obtained_marks,
      percentage = EXCLUDED.percentage,
      gpa = EXCLUDED.gpa,
      final_grade = EXCLUDED.final_grade,
      result_status = EXCLUDED.result_status,
      backlog_count = EXCLUDED.backlog_count,
      is_published = true,
      published_at = timezone('utc', now()),
      updated_at = timezone('utc', now());

    v_published_count := v_published_count + 1;
  END LOOP;

  -- Update examination publication status
  UPDATE public.examinations
  SET
    publication_status = 'published',
    status = 'published',
    published_at = timezone('utc', now()),
    published_by = p_user_id,
    updated_at = timezone('utc', now())
  WHERE id = p_examination_id;

  RETURN jsonb_build_object(
    'success', true,
    'published_students', v_published_count
  );
END;
$$;

-- ==============================================================================
-- 10. Row-Level Security (RLS) Policies
-- Strict multi-tenancy and protection of unpublished results
-- ==============================================================================

ALTER TABLE public.grading_scales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grading_scale_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.examinations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marks_entry_corrections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_exam_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hall_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.exam_revaluations ENABLE ROW LEVEL SECURITY;

-- 10.1 Grading Scales Policies
CREATE POLICY "scales_select"
ON public.grading_scales FOR SELECT
USING (institution_id = (SELECT auth_institution_id()));

CREATE POLICY "scales_insert"
ON public.grading_scales FOR INSERT
WITH CHECK (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "scales_update"
ON public.grading_scales FOR UPDATE
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 10.2 Grading Rules Policies
CREATE POLICY "rules_select"
ON public.grading_scale_rules FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.grading_scales gs
    WHERE gs.id = grading_scale_rules.grading_scale_id
      AND gs.institution_id = (SELECT auth_institution_id())
  )
);

CREATE POLICY "rules_insert"
ON public.grading_scale_rules FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.grading_scales gs
    WHERE gs.id = grading_scale_rules.grading_scale_id
      AND gs.institution_id = (SELECT auth_institution_id())
      AND EXISTS (
        SELECT 1 FROM public.institution_memberships
        WHERE institution_id = (SELECT auth_institution_id())
          AND user_id = auth.uid()
          AND status = 'active'
          AND role IN ('owner', 'admin', 'academic_admin')
      )
  )
);

-- 10.3 Examinations Policies
CREATE POLICY "exams_select"
ON public.examinations FOR SELECT
USING (
  institution_id = (SELECT auth_institution_id()) AND
  (
    -- Admins and Faculty can see all exams
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = (SELECT auth_institution_id())
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty', 'staff')
    )
    OR
    -- Students and parents can see only scheduled/in-progress or published exams
    status IN ('scheduled', 'in_progress', 'completed', 'published')
  )
);

CREATE POLICY "exams_insert"
ON public.examinations FOR INSERT
WITH CHECK (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

CREATE POLICY "exams_update"
ON public.examinations FOR UPDATE
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

CREATE POLICY "exams_delete"
ON public.examinations FOR DELETE
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 10.4 Exam Subjects Policies
CREATE POLICY "exam_subjects_select"
ON public.exam_subjects FOR SELECT
USING (institution_id = (SELECT auth_institution_id()));

CREATE POLICY "exam_subjects_manage"
ON public.exam_subjects FOR ALL
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

-- 10.5 Student Exam Marks Policies
-- Crucial: Students and Guardians cannot view marks unless examination is published!
CREATE POLICY "marks_select"
ON public.student_exam_marks FOR SELECT
USING (
  institution_id = (SELECT auth_institution_id()) AND
  (
    -- Faculty & Admins can view marks
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = (SELECT auth_institution_id())
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty')
    )
    OR
    -- Students and Guardians: ONLY WHEN PUBLISHED
    (
      EXISTS (
        SELECT 1 FROM public.examinations e
        WHERE e.id = student_exam_marks.examination_id
          AND e.publication_status = 'published'
      )
      AND
      (
        student_id IN (
          SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
        )
        OR
        student_id IN (
          SELECT sg.student_id FROM public.student_guardians sg
          JOIN public.guardians g ON g.id = sg.guardian_id
          WHERE g.user_id = auth.uid()
        )
      )
    )
  )
);

CREATE POLICY "marks_insert_update"
ON public.student_exam_marks FOR ALL
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty')
  )
);

-- 10.6 Marks Corrections Audit Policies (Read-only for admins/faculty)
CREATE POLICY "corrections_select"
ON public.marks_entry_corrections FOR SELECT
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);

-- 10.7 Student Exam Results Policies
-- Protect unpublished results from leaking to students/guardians
CREATE POLICY "results_select"
ON public.student_exam_results FOR SELECT
USING (
  institution_id = (SELECT auth_institution_id()) AND
  (
    -- Administrators & Faculty can inspect draft & published results
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = (SELECT auth_institution_id())
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty')
    )
    OR
    -- Students: Own result ONLY WHEN PUBLISHED
    (
      is_published = true AND
      student_id IN (
        SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
      )
    )
    OR
    -- Guardians: Linked Ward result ONLY WHEN PUBLISHED
    (
      is_published = true AND
      student_id IN (
        SELECT sg.student_id FROM public.student_guardians sg
        JOIN public.guardians g ON g.id = sg.guardian_id
        WHERE g.user_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "results_manage"
ON public.student_exam_results FOR ALL
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 10.8 Hall Tickets Policies
CREATE POLICY "hall_tickets_select"
ON public.hall_tickets FOR SELECT
USING (
  institution_id = (SELECT auth_institution_id()) AND
  (
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = (SELECT auth_institution_id())
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin', 'faculty', 'staff')
    )
    OR
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
    OR
    student_id IN (
      SELECT sg.student_id FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
    )
  )
);

CREATE POLICY "hall_tickets_manage"
ON public.hall_tickets FOR ALL
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin')
  )
);

-- 10.9 Revaluation Policies
CREATE POLICY "revaluations_select"
ON public.exam_revaluations FOR SELECT
USING (
  institution_id = (SELECT auth_institution_id()) AND
  (
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = (SELECT auth_institution_id())
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin', 'department_head', 'faculty')
    )
    OR
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
  )
);

CREATE POLICY "revaluations_insert"
ON public.exam_revaluations FOR INSERT
WITH CHECK (
  institution_id = (SELECT auth_institution_id()) AND
  (
    -- Students can apply for revaluation
    student_id IN (
      SELECT s.id FROM public.students s WHERE s.user_id = auth.uid()
    )
    OR
    -- Admins can file on behalf of student
    EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = (SELECT auth_institution_id())
        AND user_id = auth.uid()
        AND status = 'active'
        AND role IN ('owner', 'admin', 'academic_admin')
    )
  )
);

CREATE POLICY "revaluations_update"
ON public.exam_revaluations FOR UPDATE
USING (
  institution_id = (SELECT auth_institution_id()) AND
  EXISTS (
    SELECT 1 FROM public.institution_memberships
    WHERE institution_id = (SELECT auth_institution_id())
      AND user_id = auth.uid()
      AND status = 'active'
      AND role IN ('owner', 'admin', 'academic_admin', 'department_head')
  )
);
