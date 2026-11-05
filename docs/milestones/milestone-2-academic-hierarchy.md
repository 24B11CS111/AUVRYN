# Milestone 2: Academic Hierarchy & Structure Documentation

## 1. Executive Summary

Milestone 2 establishes the core academic foundation for the Multi-Institution Education Management Platform. It delivers a normalized, flexible PostgreSQL database schema, comprehensive Row Level Security (RLS) policies, shared TypeScript definitions and Zod validation schemas, and dynamic Next.js App Router administrative interfaces that adapt dynamically across:
- **K-12 Schools**: Academic years, grade wings, curriculum tracks (e.g. CBSE/ICSE), grade classes (Grade 1-12), sections (A, B) with Class Teachers, and school subjects.
- **Junior Colleges / Pre-University**: Streams (Science, Commerce, Arts), stream groups (MPC, BiPC, MEC, CEC), 1st & 2nd year batches, sections/groups, and stream subjects with mentor assignments.
- **Degree & Engineering Colleges**: Academic departments (CSE, ECE, Mech), degree programs (B.Tech, B.Sc), academic year cohorts/batches (2024-28 Batch, Semester 1-8), sections/lab batches, course modules/labs, and faculty assignments.
- **Universities**: Constituent faculties/schools, academic departments, graduate/undergraduate programs, matriculation cohorts, instructional sections, and credit-based courses.

---

## 2. Database Schema & Architecture Decisions

### 2.1 Unified Normalization (Avoiding Rigid Hardcoding)
Rather than fragmenting the database with separate tables for schools (`grades`), colleges (`departments`), or universities (`faculties`), we engineered a unified, flexible model with polymorphic semantics:

| Table Name | School Semantic | Junior College Semantic | College Semantic | University Semantic |
| :--- | :--- | :--- | :--- | :--- |
| `academic_departments` | Grade Wings (Primary, Senior) | Academic Streams (Science, Arts) | Departments (CSE, Physics) | Schools & Faculties (recursive) |
| `academic_programs` | Curriculum Tracks (CBSE, ICSE) | Stream Groups (MPC, BiPC) | Degree Programs (B.Tech, B.Sc) | Academic Degree Programs |
| `academic_classes` | Grade Classes (Grade 10) | Year Batches (1st Year) | Cohorts / Batches (2024-28 Batch) | Degree Cohorts |
| `academic_sections` | Classroom Sections (A, B) | Groups / Batches (Group 1) | Lecture / Lab Batches (Sec A, B1)| Cohort Sections |
| `academic_subjects` | School Subjects | Stream Subjects | Course Modules & Labs | Credit Courses |
| `academic_class_subjects`| Teacher Offering Mapping | Faculty Subject Assignment| Course & Faculty Allocation | Faculty Course Delivery |

### 2.2 Key Architectural Characteristics
- **Universal Multi-Tenancy**: Every academic record strictly enforces `institution_id NOT NULL REFERENCES institutions(id) ON DELETE CASCADE`.
- **Multi-Campus Support**: Optional `campus_id REFERENCES campuses(id) ON DELETE SET NULL` allows multi-campus institutions to scope departments, programs, and classes per campus or universally across all campuses.
- **Historical Session Preservation**: `academic_classes` links to `academic_years(id) ON DELETE RESTRICT`. Transitions between academic years do not mutate or overwrite historical classes, preserving student transcripts, rosters, and attendance records.
- **Record Lifecycle States**: All tables implement the `academic_record_status` enum (`'active'`, `'inactive'`, `'archived'`). Records can be archived without breaking foreign key referential integrity.
- **Audit Logging**: Every academic creation, update, and archival logs a structured entry to `audit_logs` capturing the actor's user ID, entity type, entity ID, and change metadata.

---

## 3. Migration Files & Reversibility

### 3.1 Forward Migration
- **File**: `supabase/migrations/20261105010000_academic_hierarchy.sql`
- **Actions**:
  - Creates enums: `academic_record_status`, `academic_level_type`, `subject_category_type`.
  - Creates tables: `academic_departments`, `academic_programs`, `academic_classes`, `academic_sections`, `academic_subjects`, `academic_class_subjects`.
  - Establishes composite unique constraints (`(institution_id, code)`, `(class_id, code)`).
  - Establishes B-tree indexes for multi-tenant query performance.
  - Enables RLS on all 6 tables and applies SELECT, INSERT, UPDATE, and DELETE policies.

### 3.2 Rollback Script
- **File**: `supabase/migrations/rollback/20261105010000_rollback.sql`
- **Actions**:
  - Drops tables in reverse foreign key order (`academic_class_subjects`, `academic_subjects`, `academic_sections`, `academic_classes`, `academic_programs`, `academic_departments`).
  - Drops enums (`subject_category_type`, `academic_level_type`, `academic_record_status`).

---

## 4. Web Application Pages Implemented

The administrative interface dynamically adapts its terminology and navigation according to `institution.type`:

1. **Academic Overview (`/dashboard/academics`)**:
   - High-level metric counters for Sessions, Departments/Streams, Programs/Curriculums, Classes/Batches, Sections, and Subjects.
   - Active Academic Session callout displaying dates, code, and term system.
   - Dynamic model information card explaining the configured tier terminology.
   - Direct navigation cards to all academic sub-modules.
2. **Sub-Navigation Bar (`components/dashboard/AcademicNav.tsx`)**:
   - Reusable tab bar that dynamically maps tab titles and descriptions (e.g. "Academic Wings" for schools, "Engineering Departments" for engineering colleges).
3. **Academic Years & Sessions (`/dashboard/academics/years`)**:
   - Calendar session management, term system selection (`annual`, `semester`, `trimester`), start and end date controls, and active session flagging.
4. **Departments / Streams / Wings (`/dashboard/academics/departments`)**:
   - Department catalog, campus filtering, status filters (`active`, `archived`), and modal for creating/editing/archiving.
5. **Programs / Degrees / Tracks (`/dashboard/academics/programs`)**:
   - Curriculum tracks and degree programs, duration in years, total terms, academic level selector, and department association.
6. **Classes & Batches (`/dashboard/academics/classes`)**:
   - Class cohort manager scoped to the active academic year session.
   - Filterable by session and curriculum program.
7. **Sections & Divisions (`/dashboard/academics/sections`)**:
   - Section manager with capacity limits, classroom/hall numbers, and Class Teacher / Stream Mentor allocation.
8. **Subject Master Catalog (`/dashboard/academics/subjects`)**:
   - Catalog of Theory, Lab, Practical, Elective, Vocational, and Project subjects.
   - Credit hour allocations, syllabus notes, and department filtering.

---

## 5. Security & Row Level Security (RLS)

All 6 academic tables are protected with PostgreSQL RLS:
- **SELECT Policy (`is_institution_member`)**:
  - Verifies the user has an active membership in the institution owning the record.
  - Revoked or suspended memberships are excluded.
- **INSERT / UPDATE / DELETE Policies (`has_institution_role`)**:
  - Strictly limited to `owner`, `admin`, and `academic_admin`.
  - Faculty members, students, and parents cannot modify academic configurations.
- **Audit Log Encasement**:
  - Direct client modifications to `audit_logs` remain prohibited (`WITH CHECK (false)`).

---

## 6. Mobile Application Preparedness

- **Shared Contracts (`apps/mobile/src/lib/academics.ts`)**:
  - Prepares TypeScript domain types (`StudentAcademicEnrollment`, `AcademicClass`, `AcademicSection`, `AcademicSubject`).
  - Implements retrieval helpers (`getActiveAcademicYear`, `getClassSubjects`) ready for student and faculty schedule/roster screens.

---

## 7. Verification & Quality Gates

| Check | Tool | Result |
| :--- | :--- | :--- |
| Shared Packages Build | `tsc` (types, validators, database) | Passed (0 errors) |
| Monorepo Typecheck | `tsc --noEmit` (across all workspaces) | Passed (0 errors) |
| Unit Tests | `vitest run tests/unit` | Passed (28 tests) |
| Security Simulation Tests | `vitest run tests/security` | Passed (16 tests) |
| Web Production Build | `next build` (Next.js App Router) | Passed (22/22 routes optimized) |
| SQL Security Verification | `supabase/tests/rls_security_verification.sql` | Prepared & Expanded (Tests 1-10) |
