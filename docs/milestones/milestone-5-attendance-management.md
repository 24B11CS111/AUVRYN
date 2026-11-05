# Milestone 5: Universal Attendance Management System Documentation

## 1. Executive Summary

Milestone 5 implements the **Universal Attendance Management System** for the Multi-Institution Education Management Platform. The system provides a single, unified, configurable attendance engine serving all institutional tiers:
- **K-12 Schools**: Daily morning/afternoon class and section attendance taken by designated class teachers.
- **Junior Colleges**: Daily cohort-based attendance across streams (MPC, BiPC, MEC, CEC) and second-year groups.
- **Degree & Engineering Colleges**: Subject-wise lecture, practical, and lab session attendance recorded by assigned course faculty.
- **Universities**: Modular credit-hour and lecture-hour tracking across departments and programs.

### Key Capabilities Built:
1. **Configurable Multi-Tier Attendance Engine**: A single polymorphic schema supporting both daily section-level sessions (`subject_id IS NULL`) and subject-period level sessions (`subject_id IS NOT NULL`) without bifurcated or duplicate codebases.
2. **Standardized Status Lifecycle**: Comprehensive status tracking supporting `present`, `absent`, `late`, `half_day`, `excused`, and `on_leave`.
3. **Teacher-Friendly Mobile-First Marking Interface**: Touch-optimized web interface (`/dashboard/attendance/mark`) featuring "Mark All Present", quick status pills, auto-fill from approved leave records, real-time absence counters, and a two-step submission confirmation modal.
4. **Staff Daily Attendance Roster**: Daily check-in/check-out timestamp tracking, department reporting, and authorized manual status adjustments (`/dashboard/attendance/staff`) strictly decoupled from payroll calculation.
5. **Database-Level Integrity & Anti-Duplicate Constraints**: Partial unique indexes guarantee that no class or subject session can be duplicated on the same date/period, and exactly one attendance record exists per student per session.
6. **Immutable Audit Trail for Corrections**: Corrections are prohibited from silently updating records. Authorized users invoke audit-logging stored procedures (`correct_student_attendance_record`, `correct_staff_attendance_record`) preserving original status, new status, authorized reviewer ID, timestamp, and mandatory audit reason.
7. **Integrated Leave Management**: Request submission and approval workflow (`leave_requests`) for both students and staff (`casual`, `sick`, `medical`, `academic`, `maternity`, `paternity`, `unpaid`), automatically synchronizing with attendance marking.
8. **Guardian Notification Architecture**: Event-based notification dispatcher table (`attendance_notifications`) queuing alerts for primary guardians of absent or late students, backed by a unique constraint preventing duplicate notification spam.
9. **Analytics & Low Attendance Defaulter Tracking**: Comprehensive reporting suite (`/dashboard/attendance/reports`) calculating student attendance percentages using strictly verified eligible session denominators and flagging students below the 75% statutory threshold.
10. **PostgreSQL Row-Level Security (RLS) & RBAC**: Tenant isolation enforced across all 7 attendance tables, restricting student/parent views to their own records while granting appropriate marking, correction, and reporting rights to teachers, staff, and administrators.

---

## 2. Database Schema & Architecture Decisions

### 2.1 Schema Entity Relationship Summary

| Table Name | Primary Responsibility | Multi-Tenancy & Integrity Constraints |
| :--- | :--- | :--- |
| `attendance_sessions` | Attendance session instances (daily class or subject-period) | `institution_id NOT NULL`, `uq_daily_attendance_session`, `uq_subject_attendance_session`, `chk_session_date_not_future` |
| `student_attendance_records` | Individual student status per session | `institution_id NOT NULL`, `uq_session_student`, foreign keys to `sessions` and `students` ON DELETE CASCADE |
| `attendance_corrections` | Immutable historical log of student attendance adjustments | Foreign key to `student_attendance_records`, `corrected_by` references `profiles.id`, mandatory `reason` |
| `staff_attendance_records` | Daily staff roster entries with check-in/out timestamps | `institution_id NOT NULL`, `uq_staff_date_attendance`, `chk_staff_date_not_future`, `chk_check_out_after_check_in` |
| `staff_attendance_corrections` | Immutable historical log of staff attendance adjustments | Foreign key to `staff_attendance_records`, `corrected_by` references `profiles.id`, mandatory `reason` |
| `leave_requests` | Formal leave applications and approval lifecycle | `institution_id NOT NULL`, `chk_leave_dates_valid` (`end_date >= start_date`), reviewer reference |
| `attendance_notifications` | Guardian alert queue for absent/late events | `institution_id NOT NULL`, `uq_session_student_guardian_notification` |

### 2.2 Key Architectural Characteristics

1. **Universal Attendance Session Model**:
   - Schools record attendance once (or twice for half-days) per section:
     ```sql
     CREATE UNIQUE INDEX uq_daily_attendance_session
     ON public.attendance_sessions (institution_id, academic_year_id, class_id, COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid), session_date, session_type)
     WHERE subject_id IS NULL AND period_number IS NULL;
     ```
   - Colleges and universities record attendance per subject lecture:
     ```sql
     CREATE UNIQUE INDEX uq_subject_attendance_session
     ON public.attendance_sessions (institution_id, academic_year_id, class_id, COALESCE(section_id, '00000000-0000-0000-0000-000000000000'::uuid), session_date, subject_id, COALESCE(period_number, 0))
     WHERE subject_id IS NOT NULL;
     ```
   - Both modes share identical validation pipelines, reporting engines, and correction histories.

2. **Atomic Attendance Batch Recording (`record_student_attendance_batch`)**:
   - Accepts session metadata and JSON array of student statuses.
   - Verifies the user has rights to mark attendance.
   - Atomically creates or reopens the `attendance_sessions` row, upserts all student records in a single transaction, and automatically enqueues guardian notifications for absent or late students whose guardians have `notifications_enabled = true`.

3. **Immutable History Over In-Place Mutation**:
   - When attendance records require correction after submission, the original entry cannot be silently edited.
   - The stored procedures `correct_student_attendance_record` and `correct_staff_attendance_record` update the record while inserting a row into `attendance_corrections` or `staff_attendance_corrections`, preserving who made the change, when it occurred, what the status was, and the administrative rationale.

4. **Eligible Session Denominators for Accurate Percentages**:
   - Attendance percentage is strictly computed as:
     $$\text{Attendance \%} = \frac{\text{Present} + \text{Late} + (\text{Half Day} \times 0.5)}{\text{Total Scheduled Eligible Sessions}} \times 100$$
   - Excused absences and approved leaves are tracked distinctly, and unscheduled days or future sessions are excluded from the denominator.

---

## 3. Migration Files & Reversibility

### 3.1 Forward Migration
- **File**: `supabase/migrations/20261105040000_attendance_management.sql`
- **Actions**:
  - Enums created: `attendance_status`, `attendance_session_type`, `attendance_session_status`, `staff_attendance_status`, `leave_applicant_type`, `leave_type`, `leave_status`, `notification_delivery_status`.
  - Tables created: `attendance_sessions`, `student_attendance_records`, `attendance_corrections`, `staff_attendance_records`, `staff_attendance_corrections`, `leave_requests`, `attendance_notifications`.
  - Stored procedures: `record_student_attendance_batch`, `correct_student_attendance_record`, `correct_staff_attendance_record`.
  - Check constraints: Prevent future dates on sessions, enforce valid leave ranges (`end_date >= start_date`), and validate check-out timestamps.
  - Partial unique indexes: Enforce uniqueness across daily sessions, subject sessions, student session records, daily staff attendance, and guardian notifications.
  - RLS Policies: Complete coverage on all 7 tables for `SELECT`, `INSERT`, `UPDATE`, `DELETE`.

### 3.2 Rollback Script
- **File**: `supabase/migrations/rollback/20261105040000_rollback.sql`
- **Actions**:
  - Drops stored procedures and helper functions.
  - Drops all 7 tables in reverse dependency order.
  - Drops all 8 custom enums cleanly.

---

## 4. Web Application Pages Implemented

| Route | View Component | Core Functionality |
| :--- | :--- | :--- |
| `/dashboard/attendance` | `AttendanceDashboardClient` | High-level metrics (present rate, absences, on-leave count, pending reviews), quick links, and recent sessions |
| `/dashboard/attendance/mark` | `AttendanceMarkingClient` | Teacher-first marking UI: cohort selection, "Mark All Present", status pill selectors, auto-leave detection, submit modal |
| `/dashboard/attendance/students` | `StudentAttendanceClient` | Student daily/subject attendance logs, date pickers, filter by class/section/status, and correction modal |
| `/dashboard/attendance/staff` | `StaffAttendanceClient` | Daily staff roster, check-in/out logging, status badges, department filtering, and manual correction audit modal |
| `/dashboard/attendance/leaves` | `LeaveManagementClient` | Student & staff leave applications, tabbed status review (pending, approved, rejected), and decision workflows |
| `/dashboard/attendance/reports` | `AttendanceReportsClient` | Defaulter list (< 75% threshold), class-wise percentage summaries, monthly trends, and export placeholders |

---

## 5. Security, RBAC & PostgreSQL RLS

### 5.1 RBAC Permission Matrix

| Role | `attendance:mark` | `attendance:view` | `attendance:correct` | `attendance:reports` | `leaves:apply` | `leaves:approve` | `leaves:view` |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `owner` / `super_admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `institution_admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `campus_admin` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `principal` / `academic_coordinator` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `department_head` | Yes | Yes | Yes | Yes | Yes | Yes | Yes |
| `hr_administrator` | No | Yes | Yes (staff) | Yes (staff) | Yes | Yes (staff) | Yes |
| `teacher` / `faculty` | Yes | Yes | No* | Yes (cohort) | Yes | No | Yes (own) |
| `staff` | No | No | No | No | Yes | No | Yes (own) |
| `student` | No | Yes (own) | No | No | Yes | No | Yes (own) |
| `parent` / `guardian` | No | Yes (ward) | No | No | Yes (ward) | No | Yes (ward) |

*\* Note: Teachers mark attendance; corrections to locked or historical records require administrative or coordinator approval.*

### 5.2 Row-Level Security Highlights
- **Tenant Isolation**: Every query automatically evaluates `institution_id = (SELECT auth_institution_id())`.
- **Stranger Block**: Authenticated users belonging to Tenant B receive zero rows and zero mutation access to Tenant A attendance or leave records.
- **Guardian Privacy**: Parents can only view `student_attendance_records` and `leave_requests` where their linked student IDs match `student_guardians.student_id`.

---

## 6. Test Suite & Quality Assurance

- **Vitest Unit & Security Suite**:
  - `tests/unit/attendance-validators.test.ts`: 19 tests validating Zod schemas (future dates rejected, end dates after start dates, valid enums).
  - `tests/security/attendance-security.test.ts`: 6 tests verifying cross-tenant isolation, duplicate session prevention, locked session protection, audited corrections, and guardian privacy.
  - `tests/unit/rbac.test.ts`: 11 tests confirming attendance and leave permissions across all 11 platform roles.
  - Overall Suite: **117 passed across 11 test suites** (`npm test`).
- **Static Analysis & Typecheck**:
  - `npm run typecheck`: **0 errors across all 6 workspaces** (`@edu-platform/types`, `@edu-platform/validators`, `@edu-platform/database`, `@edu-platform/auth`, `@edu-platform/web`, root).
- **Production Compilation**:
  - `next build`: **Compiled successfully** with static and server-rendered routes for all 6 attendance pages.
