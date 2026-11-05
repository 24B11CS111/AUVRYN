# Milestone 4: Staff & Faculty Management Documentation

## 1. Executive Summary

Milestone 4 implements **Staff & Faculty Management** for the Multi-Institution Education Management Platform. It expands the platform beyond students and academic structures into human resource operations, academic workload allocation, and secure staff onboarding:

- **Staff Information System (SIS)**: A unified identity registry (`staff_profiles`) supporting all institutional roles: teaching, non-teaching, administrative, technical, transport, and support staff.
- **Decoupled Identity & Authentication**: Staff identities are maintained independently from user login credentials. An optional `user_id` links the staff profile to `auth.users` / `public.profiles` when an authentication account exists, allowing seamless multi-campus and cross-tenant employment without identity collision or credential leakage.
- **Historical Employment Tracking**: Full historical timeline (`staff_employments`) recording designations, campuses, departments, employment types (full-time, part-time, contract, adjunct, visiting), reporting hierarchies, start dates, and exit dates.
- **Faculty Academic Allocation Engine**: Deep integration with Milestone 2 academic hierarchy (`academic_years`, `academic_programs`, `academic_classes`, `academic_sections`, `academic_subjects`). Allocates teachers to specific cohorts with dedicated flags for Class Teachers and Academic Coordinators.
- **Database-Level Class Teacher Exclusivity**: Enforces that a section cannot have more than one active class teacher in the same academic year via a partial unique index (`uq_active_section_class_teacher`).
- **Staff Compliance & Document Verification**: Storage and verification pipeline (`staff_documents`) for qualification degrees, experience certificates, identity documents, employment contracts, and appointment letters, complete with reviewer notes, verification statuses (`pending`, `verified`, `rejected`), and immutable audit history.
- **Secure Onboarding & Invitation Lifecycle**: Cryptographically secure onboarding token workflow (`staff_invitations`) with email validation, 7-day token expiration, role assignment, and an atomic stored procedure (`accept_staff_invitation`) that connects the user account to the institutional staff profile upon acceptance.
- **Role-Based Access Control (RBAC)**: Introduces `hr_administrator` and `department_head` roles, along with granular permissions (`staff:manage`, `staff:view`, `faculty:assign`, `invitations:manage`, `invitations:view`, `documents:manage`, `documents:verify`). Strict safeguards ensure faculty members cannot modify their own employment records or escalate their privileges.

---

## 2. Database Schema & Architecture Decisions

### 2.1 Schema Entity Relationship Summary

| Table Name | Primary Responsibility | Multi-Tenancy & Integrity |
| :--- | :--- | :--- |
| `staff_profiles` | Central staff demographic & institutional identity | `institution_id NOT NULL`, composite unique `(institution_id, employee_id)` |
| `staff_employments` | Employment contracts, transfers & designation history | `institution_id NOT NULL`, foreign key to `staff_profiles(id) ON DELETE CASCADE` |
| `faculty_allocations` | Teaching assignments linked to classes, sections & subjects | Composite unique check `uq_active_section_class_teacher` |
| `staff_documents` | Verification documents (degrees, contracts, IDs) | `institution_id NOT NULL`, foreign key to `staff_profiles(id) ON DELETE CASCADE` |
| `staff_invitations` | Secure cryptographically generated onboarding tokens | Unique `(token)`, composite unique `(institution_id, email, status)` for pending |

### 2.2 Key Architectural Characteristics

1. **Decoupled Staff Identity vs. Authentication Account**:
   - `staff_profiles` represents an institutional worker.
   - An employee can exist in the system (e.g. newly recruited, bus driver, support staff) without possessing a system login account.
   - When an account is provisioned or accepted via invitation, `staff_profiles.user_id` is linked to `profiles.id`.
   - A single person working across different institutions maintains completely isolated `staff_profiles` within each tenant's boundary, preventing cross-tenant leakage.

2. **Class Teacher Integrity via Database Constraints**:
   - Rather than relying on application code validation which could suffer race conditions, the database enforces:
     ```sql
     CREATE UNIQUE INDEX uq_active_section_class_teacher
     ON public.faculty_allocations (academic_year_id, section_id)
     WHERE is_class_teacher = true AND status = 'active';
     ```
   - This guarantees that no section in any academic year can ever have multiple active class teachers concurrently.

3. **Atomic Invitation Acceptance (`accept_staff_invitation`)**:
   - Stored procedure executes in an ACID transaction:
     1. Validates that the invitation token exists and has status `pending`.
     2. Verifies `expires_at > now()`.
     3. Adds or activates an `institution_memberships` row for the accepting `user_id` with the assigned role.
     4. Updates `staff_invitations.status` to `accepted` and sets `accepted_by_user_id`.
     5. If a `staff_id` was associated with the invitation, automatically sets `staff_profiles.user_id = p_user_id`.

---

## 3. Migration Files & Reversibility

### 3.1 Forward Migration
- **File**: `supabase/migrations/20261105030000_staff_faculty.sql`
- **Actions**:
  - Enums created: `staff_category`, `employment_type`, `employment_status`, `staff_document_type`, `invitation_status`.
  - Roles expanded: `hr_administrator`, `department_head` added to `membership_role`.
  - Tables created: `staff_profiles`, `staff_employments`, `faculty_allocations`, `staff_documents`, `staff_invitations`.
  - Stored procedures: `accept_staff_invitation(p_token, p_user_id)`.
  - RLS policies applied to all 5 tables for SELECT, INSERT, UPDATE, DELETE.
  - Multi-tenant indexes created on all foreign keys, status fields, and search attributes.

### 3.2 Rollback Script
- **File**: `supabase/migrations/rollback/20261105030000_rollback.sql`
- **Actions**:
  - Drops RPC procedures and helper functions.
  - Drops tables in reverse dependency order (`staff_invitations`, `staff_documents`, `faculty_allocations`, `staff_employments`, `staff_profiles`).
  - Drops newly introduced enums cleanly.

---

## 4. Web Application Pages Implemented

| Route | View Component | Core Functionality |
| :--- | :--- | :--- |
| `/dashboard/staff` | `StaffListClient` | Comprehensive staff directory with search by name/employee ID/email, category tabs (All, Teaching, Non-Teaching, Admin, Tech, Support), campus and status filters, and key staff metrics. |
| `/dashboard/staff/new` | `NewStaffForm` | Staff registration form capturing personal details, contact information, emergency contacts, qualification, experience, and initial employment placement. |
| `/dashboard/staff/[id]` | `StaffProfileView` | Full staff profile view displaying personal details, emergency contacts, employment history timeline, active teaching assignments, and uploaded compliance credentials. Includes modal to record employment transfers/promotions. |
| `/dashboard/staff/[id]/edit` | `EditStaffForm` | Profile editing form allowing HR administrators to update contact information, qualification, years of experience, and employment status. |
| `/dashboard/staff/[id]/documents` | `StaffDocumentsClient` | Document repository allowing upload of degrees, ID proofs, and contracts, with verification status badges and approval/rejection workflows with reviewer notes. |
| `/dashboard/staff/[id]/assignments` | `FacultyAssignmentsClient` | Academic assignment hub allowing department heads and academic admins to assign faculty to academic years, programs, classes, sections, and subjects with class teacher and coordinator flags. |
| `/dashboard/staff/invitations` | `StaffInvitationsClient` | Staff onboarding management showing pending, accepted, expired, and revoked invitation tokens with invitation modal and one-click token revocation. |

---

## 5. Security & RBAC Enforcement

### 5.1 Role Matrix Expansion
- **`hr_administrator`**:
  - Granted `staff:manage`, `staff:view`, `invitations:manage`, `invitations:view`, `documents:manage`, `documents:verify`, `members:manage`, `members:view`.
  - Barred from modifying system billing (`billing:manage`) or institution curricula (`academics:manage`).
- **`department_head`**:
  - Granted `staff:view`, `faculty:assign`, `academics:view`, `students:view`.
  - Barred from altering HR employment contracts (`staff:manage`) or issuing onboarding invitations (`invitations:manage`).
- **`faculty`**:
  - Granted `staff:view`, `academics:view`, `students:view`, `documents:manage` (own documents).
  - Strictly barred from changing their own employment status, self-promoting, or elevating permissions.

### 5.2 Row-Level Security (RLS)
All 5 tables feature mandatory PostgreSQL RLS:
- Cross-tenant access is unconditionally blocked via `institution_id` matching against `current_user_tenant_ids()`.
- Unauthenticated users and members of outside institutions receive empty result sets on SELECT and `insufficient_privilege` errors on INSERT/UPDATE/DELETE.

---

## 6. Verification & Test Suite Summary

- **Total Automated Vitest Tests**: 91 passing tests across 9 test suites.
  - `tests/unit/staff-validators.test.ts`: 18 tests covering staff profiles, employments, faculty allocations, document uploads, and invitations.
  - `tests/security/staff-security.test.ts`: 5 tests verifying cross-tenant isolation, faculty self-mutation prevention, class teacher exclusivity, and HR privilege boundaries.
  - `tests/unit/rbac.test.ts`: 10 tests verifying permissions for `hr_administrator`, `department_head`, `admin`, `owner`, and `faculty`.
- **Database Verification Script**:
  - `supabase/tests/rls_security_verification.sql` updated with tests 15, 16, and 17 validating staff profile creation, cross-tenant insertion block, and stranger read blocks.
- **TypeScript Static Verification**:
  - `npm run typecheck` passes with zero errors across all 6 monorepo workspaces (`@edu-platform/database`, `@edu-platform/supabase-client`, `@edu-platform/types`, `@edu-platform/validators`, `@edu-platform/mobile`, `@edu-platform/web`).
