-- ==============================================================================
-- MULTI-INSTITUTION EDUCATION MANAGEMENT PLATFORM
-- Migration: 20261105010000_academic_hierarchy.sql
-- Milestone 2: Normalized Academic Hierarchy & Structure
-- Supports: Schools, Junior Colleges, Degree Colleges, Engineering Colleges, Universities
-- ==============================================================================

-- 1. Academic Structure Status & Level Enums
DO $$ BEGIN
  CREATE TYPE academic_record_status AS ENUM (
    'active',
    'inactive',
    'archived'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE academic_level_type AS ENUM (
    'primary',
    'middle_school',
    'secondary',
    'higher_secondary',
    'diploma',
    'undergraduate',
    'postgraduate',
    'doctoral'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE subject_category_type AS ENUM (
    'theory',
    'practical',
    'lab',
    'elective',
    'vocational',
    'project'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ==============================================================================
-- 2. Core Academic Tables
-- ==============================================================================

-- 2.1 Academic Departments / Faculties / Wings
-- Schools: Wings/Levels (e.g., Primary Wing, High School)
-- Junior Colleges: Streams (e.g., Science, Commerce, Arts)
-- Degree/Engineering Colleges: Departments (e.g., Computer Science, Mechanical)
-- Universities: Faculties & Departments (supports parent_department_id for recursive hierarchy)
CREATE TABLE IF NOT EXISTS public.academic_departments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  parent_department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  head_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_department_code UNIQUE(institution_id, code)
);

-- 2.2 Academic Programs / Degrees / Curriculum Tracks
-- Schools: Curriculum Tracks (e.g., CBSE K-12, ICSE Secondary)
-- Junior Colleges: Intermediate Streams (e.g., MPC, BiPC, MEC, CEC)
-- Degree/Engineering Colleges: Degree Programs (e.g., B.Tech CSE, B.Sc Physics, MBA)
-- Universities: Degree Programs across constituent faculties
CREATE TABLE IF NOT EXISTS public.academic_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  level academic_level_type NOT NULL DEFAULT 'undergraduate',
  duration_years INT NOT NULL DEFAULT 4,
  term_system term_system NOT NULL DEFAULT 'semester',
  total_terms INT NOT NULL DEFAULT 8,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_program_code UNIQUE(institution_id, code)
);

-- 2.3 Academic Classes / Batches / Grade Cohorts
-- Tied to an Academic Year session to preserve historical student progression
-- Schools: Grades/Classes (e.g., Grade 10 - AY 2026-27)
-- Junior Colleges: Year Batches (e.g., 1st Year MPC, 2nd Year BiPC)
-- Degree/Engineering Colleges: Batches / Academic Years (e.g., B.Tech CSE 2024-28 Batch)
-- Universities: Degree Cohorts
CREATE TABLE IF NOT EXISTS public.academic_classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  program_id UUID NOT NULL REFERENCES public.academic_programs(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE RESTRICT,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  level_number INT NOT NULL DEFAULT 1,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_class_code UNIQUE(institution_id, academic_year_id, code)
);

-- 2.4 Academic Sections / Divisions / Groups
-- Subdivisions of a Class/Batch with Class Teacher / Mentor assignment
-- Schools: Sections / Divisions (e.g., Section A, Section B)
-- Junior Colleges: Groups / Sections (e.g., Group 1, Group 2)
-- Degree/Engineering Colleges: Sections / Lab Batches (e.g., Section A, Batch B1)
CREATE TABLE IF NOT EXISTS public.academic_sections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  capacity INT DEFAULT 40,
  room_number TEXT,
  class_teacher_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_class_section_code UNIQUE(class_id, code)
);

-- 2.5 Academic Subjects / Courses / Modules
-- Master catalog of subjects taught
-- Schools: School Subjects (e.g., Mathematics, Science, English Literature)
-- Junior Colleges: Stream Subjects (e.g., Maths-1A, Physics Theory, Botany)
-- Degree/Engineering Colleges: Course Modules (e.g., Data Structures, Operating Systems)
-- Universities: Academic Courses & Credit Modules
CREATE TABLE IF NOT EXISTS public.academic_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  department_id UUID REFERENCES public.academic_departments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  subject_type subject_category_type NOT NULL DEFAULT 'theory',
  credit_hours NUMERIC(4, 2) DEFAULT 3.00,
  description TEXT,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  CONSTRAINT uq_institution_subject_code UNIQUE(institution_id, code)
);

-- 2.6 Academic Class Subjects & Faculty Assignments
-- Maps subject offerings to a class or section, linked to academic terms and assigning teachers
CREATE TABLE IF NOT EXISTS public.academic_class_subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES public.academic_classes(id) ON DELETE CASCADE,
  section_id UUID REFERENCES public.academic_sections(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.academic_subjects(id) ON DELETE CASCADE,
  term_id UUID REFERENCES public.academic_terms(id) ON DELETE SET NULL,
  faculty_profile_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  status academic_record_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- ==============================================================================
-- 3. Indices for Multi-Tenant Query Scoping & Performance
-- ==============================================================================
CREATE INDEX IF NOT EXISTS idx_academic_dept_inst ON public.academic_departments(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_dept_parent ON public.academic_departments(parent_department_id);
CREATE INDEX IF NOT EXISTS idx_academic_prog_inst ON public.academic_programs(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_prog_dept ON public.academic_programs(department_id);
CREATE INDEX IF NOT EXISTS idx_academic_class_inst ON public.academic_classes(institution_id, academic_year_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_class_prog ON public.academic_classes(program_id);
CREATE INDEX IF NOT EXISTS idx_academic_sec_inst ON public.academic_sections(institution_id, class_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_sec_teacher ON public.academic_sections(class_teacher_profile_id);
CREATE INDEX IF NOT EXISTS idx_academic_subj_inst ON public.academic_subjects(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_academic_subj_dept ON public.academic_subjects(department_id);
CREATE INDEX IF NOT EXISTS idx_academic_class_subj_inst ON public.academic_class_subjects(institution_id, class_id, subject_id);
CREATE INDEX IF NOT EXISTS idx_academic_class_subj_faculty ON public.academic_class_subjects(faculty_profile_id);

-- ==============================================================================
-- 4. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.academic_departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.academic_class_subjects ENABLE ROW LEVEL SECURITY;

-- 4.1 Academic Departments Policies
-- Active members of the institution can view departments
CREATE POLICY "academic_departments_select_policy" ON public.academic_departments
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

-- Only owners, admins, and academic_admins can create departments
CREATE POLICY "academic_departments_insert_policy" ON public.academic_departments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

-- Only owners, admins, and academic_admins can update departments (cannot alter archived records without unarchiving)
CREATE POLICY "academic_departments_update_policy" ON public.academic_departments
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

-- Only owners and admins can delete departments
CREATE POLICY "academic_departments_delete_policy" ON public.academic_departments
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- 4.2 Academic Programs Policies
CREATE POLICY "academic_programs_select_policy" ON public.academic_programs
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_programs_insert_policy" ON public.academic_programs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_programs_update_policy" ON public.academic_programs
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_programs_delete_policy" ON public.academic_programs
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- 4.3 Academic Classes Policies
CREATE POLICY "academic_classes_select_policy" ON public.academic_classes
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_classes_insert_policy" ON public.academic_classes
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_classes_update_policy" ON public.academic_classes
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_classes_delete_policy" ON public.academic_classes
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- 4.4 Academic Sections Policies
CREATE POLICY "academic_sections_select_policy" ON public.academic_sections
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_sections_insert_policy" ON public.academic_sections
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_sections_update_policy" ON public.academic_sections
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_sections_delete_policy" ON public.academic_sections
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- 4.5 Academic Subjects Policies
CREATE POLICY "academic_subjects_select_policy" ON public.academic_subjects
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_subjects_insert_policy" ON public.academic_subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_subjects_update_policy" ON public.academic_subjects
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_subjects_delete_policy" ON public.academic_subjects
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );

-- 4.6 Academic Class Subjects Policies
CREATE POLICY "academic_class_subjects_select_policy" ON public.academic_class_subjects
  FOR SELECT TO authenticated
  USING (
    institution_id IN (SELECT institution_id FROM public.get_user_institution_ids())
  );

CREATE POLICY "academic_class_subjects_insert_policy" ON public.academic_class_subjects
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_class_subjects_update_policy" ON public.academic_class_subjects
  FOR UPDATE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  )
  WITH CHECK (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role, 'academic_admin'::membership_role])
  );

CREATE POLICY "academic_class_subjects_delete_policy" ON public.academic_class_subjects
  FOR DELETE TO authenticated
  USING (
    public.has_institution_role(institution_id, ARRAY['owner'::membership_role, 'admin'::membership_role])
  );
