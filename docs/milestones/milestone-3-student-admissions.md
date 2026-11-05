# Milestone 3: Student Management & Admissions Documentation

## 1. Executive Summary

Milestone 3 implements the **Student Information System (SIS)** and **Admissions Lifecycle Management** for the Multi-Institution Education Management Platform. It delivers:
- **Decoupled Student Identity**: Personal demographics, identification, and contact information are decoupled from ephemeral academic enrollments, ensuring a permanent student record across academic years and institutional promotions.
- **Multi-Guardian Relationship Management**: Supports many-to-many relationships between students and parents/guardians, with granular flags for primary contact, emergency contact, authorized pickup authorization, and dedicated guardian authentication user accounts.
- **Historical Academic Enrollments**: Multi-session academic progression tracking linked directly to Milestone 2 hierarchy (`academic_years`, `academic_programs`, `academic_classes`, and `academic_sections`), preserving past grade history, roll numbers, and exit/promotion statuses.
- **Document Management & Compliance Verification**: Tracks institutional compliance documents (birth certificates, marksheets, transfer certificates, national IDs, medical records) with explicit verification workflows, reviewer audit trails, and review notes.
- **Multi-State Admission Pipeline**: Covers the full applicant lifecycle from application submission (`submitted`), verification (`documents_pending`, `under_verification`), decisions (`approved`, `waitlisted`, `rejected`), confirmation (`confirmed`), and enrollment (`enrolled`).
- **Atomic Admission Conversion**: A dedicated PostgreSQL stored procedure (`convert_admission_to_student`) converts confirmed applicants into enrolled students within a single ACID transaction, generating student identity, migrating guardians, establishing class enrollment, and preserving link integrity without duplicate record creation.
- **Expanded RBAC Matrix**: Introduces first-class support for `admissions_officer` and `accountant` roles, while strictly enforcing student self-access and parent-child RLS boundary checks.

---

## 2. Database Schema & Architecture Decisions

### 2.1 Schema Entity Relationship Summary

| Table Name | Primary Responsibility | Multi-Tenancy & Integrity |
| :--- | :--- | :--- |
| `students` | Central student demographic & contact identity | `institution_id NOT NULL`, composite unique `(institution_id, admission_number)` |
| `guardians` | Parent & guardian demographic profiles | `institution_id NOT NULL`, composite unique `(institution_id, phone)` |
| `student_guardians` | M:N association between students & guardians | `institution_id NOT NULL`, composite unique `(student_id, guardian_id)` |
| `student_enrollments` | Historical & active academic placements | FKs to `academic_years`, `academic_programs`, `academic_classes`, `academic_sections` |
| `admission_applications`| Prospective applicant admissions workflow | `institution_id NOT NULL`, unique `(institution_id, application_number)` |
| `admission_status_history`| Immutable status transition audit trail | References `admission_applications(id) ON DELETE CASCADE` |
| `student_documents` | Student & applicant uploaded compliance files | Scoped to either `student_id` or `application_id`, track verification status |

### 2.2 Key Architectural Characteristics

1. **Student Identity Decoupling**:
   - `students` contains only unchanging demographic, identification, and emergency contact details.
   - Grade level, section, roll number, and academic year are never hardcoded on `students`; they reside in `student_enrollments`.
   - When a student is promoted from Grade 9 to Grade 10, a new `student_enrollments` record is created for the new academic year while the historical Grade 9 record transitions to status `promoted`. The student's identity ID remains unchanged.

2. **Parent & Guardian M:N Modeling**:
   - Multiple siblings can reference the same `guardian` record within an institution.
   - Each `student_guardians` link captures relationship specifics (`relationship`, `is_primary`, `is_emergency_contact`, `can_pickup`).
   - When a parent logs in (`guardians.user_id = auth.uid()`), PostgreSQL RLS utilizes `is_guardian_of_student(student_id)` to restrict parent queries exclusively to their own children.

3. **Atomic Admission Conversion (`convert_admission_to_student`)**:
   - Executed via PostgreSQL RPC:
     1. Validates that the application exists and is not already enrolled.
     2. Validates uniqueness of the new `p_admission_number` within the institution.
     3. Inserts a new `students` row with demographics mapped from the application.
     4. Upserts the primary guardian into `guardians` and creates the `student_guardians` link.
     5. Creates an active `student_enrollments` row in the target program/class/section.
     6. Associates any existing application `student_documents` with the new student.
     7. Updates `admission_applications` status to `enrolled` and sets `converted_student_id`.
     8. Records an immutable status transition in `admission_status_history`.

---

## 3. Migration Files & Reversibility

### 3.1 Forward Migration
- **File**: `supabase/migrations/20261105020000_student_admissions.sql`
- **Actions**:
  - Enums created: `student_status`, `student_gender`, `enrollment_status`, `document_type`, `document_verification_status`, `admission_status`.
  - Tables created: `students`, `guardians`, `student_guardians`, `student_enrollments`, `admission_applications`, `admission_status_history`, `student_documents`.
  - Stored procedures: `is_guardian_of_student(p_student_id)`, `convert_admission_to_student(...)`.
  - RLS policies applied to all 7 tables for SELECT, INSERT, UPDATE, DELETE.
  - Multi-tenant indexes created on all foreign keys, status fields, and search attributes.

### 3.2 Rollback Script
- **File**: `supabase/migrations/rollback/20261105020000_rollback.sql`
- **Actions**:
  - Drops RPC procedures and helper functions.
  - Drops tables in reverse dependency order.
  - Drops newly introduced enums cleanly.

---

## 4. Web Application Pages Implemented

| Route | View Component | Core Functionality |
| :--- | :--- | :--- |
| `/dashboard/students` | `StudentListClient` | Multi-criteria search (name, admission #, phone), class and status filters, key enrollment metrics, student cards. |
| `/dashboard/students/new` | `NewStudentForm` | Complete student registration form capturing demographics, contact, emergency contacts, and optional initial enrollment. |
| `/dashboard/students/[id]` | `StudentProfileView` | Comprehensive profile overview, demographics, emergency contacts, linked guardians, academic progression timeline, document badges, and promotion modal. |
| `/dashboard/students/[id]/edit`| `EditStudentForm` | Allows administrators and admissions officers to update contact details, nationality, emergency contacts, and student status. |
| `/dashboard/students/[id]/guardians` | `GuardianManagerClient`| Manage parent/guardian links, toggle primary/emergency/pickup flags, add new guardians or link existing guardians. |
| `/dashboard/students/[id]/documents` | `StudentDocumentsClient`| Upload student compliance documents, review file metadata, and record verification decisions (Approve/Reject with notes). |
| `/dashboard/admissions` | `AdmissionListClient` | Admissions overview with workflow metrics (Total, In-Review, Confirmed, Enrolled), status filters, and academic program filtering. |
| `/dashboard/admissions/new` | `NewAdmissionForm` | Prospective student application intake form capturing academic preferences, applicant details, prior schooling, and guardian contacts. |
| `/dashboard/admissions/[id]` | `AdmissionDetailClient`| Full application inspection, document verification, stage-by-stage status updating, and one-click atomic conversion to enrolled student. |

---

## 5. Security & RBAC Enforcement

### 5.1 Role Matrix Expansion
- **`admissions_officer`**:
  - Granted `students:manage`, `students:view`, `admissions:manage`, `admissions:view`, `documents:manage`, `documents:verify`.
  - Barred from modifying system billing (`billing:manage`), institutional tenant settings (`institution:manage`), or staff memberships (`members:manage`).
- **`accountant`**:
  - Granted `billing:manage`, `billing:view`, `students:view`.
  - Barred from creating students, modifying admissions, or managing staff.
- **`faculty`**:
  - View-only access to enrolled students and applications within their active institution.
- **`student`**:
  - Strictly limited by RLS to their own student record (`students.user_id = auth.uid()`).
- **`parent`**:
  - Strictly limited by RLS to students where `is_guardian_of_student(student.id)` evaluates to true.

---

## 6. Quality Gates & Test Verification

All quality gates passed cleanly with zero errors:

```bash
# 1. Monorepo TypeScript Typecheck
npm run typecheck
✓ @edu-platform/database: clean
✓ @edu-platform/supabase-client: clean
✓ @edu-platform/types: clean
✓ @edu-platform/validators: clean
✓ @edu-platform/mobile: clean
✓ @edu-platform/web: clean

# 2. Automated Test Suite (Vitest)
npm test
✓ tests/security/student-security.test.ts (5 tests)
✓ tests/security/academic-rls.test.ts (11 tests)
✓ tests/security/rls-simulation.test.ts (5 tests)
✓ tests/unit/student-validators.test.ts (14 tests)
✓ tests/unit/academic-validators.test.ts (15 tests)
✓ tests/unit/validators.test.ts (8 tests)
✓ tests/unit/rbac.test.ts (7 tests)
Test Files: 7 passed (7)
Tests:      65 passed (65)

# 3. Next.js 14 Production Web Build
next build
✓ Compiled successfully
✓ Generating static pages (26/26)
✓ All student and admission routes compiled
```
