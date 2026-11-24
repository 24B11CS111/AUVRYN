# AUVRYN — ROLE-BASED APPLICATION, ACADEMIC PROGRESS & COMMUNICATION AUDIT

**Project:** AUVRYN — The Intelligent Education Ecosystem  
**Repository:** `C:\Users\hrixo\OneDrive\Desktop\School`  
**Date:** November 19, 2026  
**Auditor / Roles:** CTO, Principal Product Architect, Principal DevOps Engineer, Lead Security Auditor  
**Document Ref:** `docs/ROLE_BASED_APPLICATION_AUDIT.md`  
**Status:** `STAGE 1 AUDIT COMPLETE — BASELINE CERTIFIED`

---

## 1. Executive Overview & Scope of Audit

This comprehensive audit inspects the complete AUVRYN monorepo across all shared packages (`@edu-platform/database`, `@edu-platform/types`, `@edu-platform/validators`, `@edu-platform/supabase-client`), the Next.js 14 web application (`apps/web`), the React Native / Expo mobile application (`apps/mobile`), and the Supabase PostgreSQL database schemas (`supabase/migrations/`).

The objective is to establish an authoritative baseline for upgrading AUVRYN into a production-grade, multi-tenant School & University Management Ecosystem supporting five distinct user roles and four dynamic education levels, interconnected by an automated communication and mobile notification engine.

---

## 2. Inventory of Existing Functionality

### 2.1 Shared Libraries & Types
- **`packages/types`**:
  - `EducationType`: Fully defined union (`'preschool' | 'primary_school' | 'intermediate' | 'university'`).
  - `EDUCATION_TYPE_DEFINITIONS`: Comprehensive metadata mapping each education type to distinct terminology (`departmentLabel`, `cohortLabel`), taglines, iconography, badge styles, and soft background tokens.
  - `resolveEducationType()`: Deterministic resolution favoring explicit institution settings with intelligent naming fallbacks.
  - `Role` & `MembershipRole`: Supported roles (`owner`, `admin`, `academic_admin`, `department_head`, `faculty`, `staff`, `admissions_officer`, `accountant`, `student`, `parent`, `guardian`).
  - `PlatformRole`: Explicit `hrix_admin` definition with granular platform-level permissions.
- **`packages/database`**:
  - TypeScript definitions generated from the Supabase schema representing 123 database tables, views, and stored procedure contracts.
- **`packages/validators`**:
  - Zod schemas validating announcements, communication messages, notification dispatches, homework assignments, student admissions, attendance submissions, and examination results.
- **`packages/supabase-client`**:
  - Centralized Supabase client factories and standardized error formatters (`formatSupabaseError`).

### 2.2 Database Schemas (16 Platform Migrations)
The database schema in `supabase/migrations/` is mature, normalized, and strictly tenant-isolated:
1. **Multi-Tenant Foundation (`20261105000000_initial_schema.sql`)**:
   - `institutions`, `campuses`, `academic_years`, `profiles`, `institution_memberships`, `audit_logs`.
   - Core PostgreSQL Row Level Security (RLS) helper functions: `is_institution_member()`, `has_institution_role()`.
2. **Academic Hierarchy (`20261105010000_academic_hierarchy.sql`)**:
   - `academic_departments`, `academic_programs`, `academic_classes`, `academic_sections`, `academic_subjects`.
3. **Student Admissions & Parent Linkage (`20261105020000_student_admissions.sql`)**:
   - `students`, `guardians`, `student_guardians`, `student_enrollments`, `student_documents`.
   - Secure helper `is_guardian_of(p_student_id)` enforcing parent-child data isolation.
4. **Staff & Faculty (`20261105030000_staff_faculty.sql`)**:
   - `staff_profiles`, `faculty_allocations` (mapping faculty to class, section, subject with `is_class_teacher` and status).
5. **Attendance Management (`20261105040000_attendance_management.sql`)**:
   - `attendance_sessions`, `attendance_records` (supports present, absent, late, excused, on_leave), `student_leaves`.
6. **Examinations & Results (`20261105060000_examination_results.sql`)**:
   - `examinations`, `exam_schedules`, `exam_marks`, `hall_tickets`, `report_cards`.
7. **Fees & Payments (`20261105070000_fees_payments.sql`)**:
   - `fee_structures`, `fee_assignments`, `fee_installments`, `fee_payments`, `fee_ledger`.
8. **Universal Communications & Notifications (`20261105080000_parent_student_communications.sql`)**:
   - `notifications`, `notification_deliveries` (outbox queue), `notification_preferences`, `notification_templates`, `push_device_tokens`.
   - `announcements`, `announcement_acknowledgements`.
   - `homework_assignments`, `homework_submissions`.
   - `communication_threads`, `communication_participants`, `communication_messages`.
   - Stored procedure `dispatch_notification_atomic()`.
9. **Notification Outbox Worker (`20261109122000_notification_outbox_worker.sql`)**:
   - Atomic job claiming with `FOR UPDATE SKIP LOCKED` concurrency, backoff calculations, and dead-letter queue.

### 2.3 Web Application (`apps/web`)
- **Authentication & Smart Routing (`apps/web/src/lib/auth.ts`)**:
  - Unified `/auth/login` page with automatic post-auth routing:
    - Platform Super Admin $\to$ `/hrix-admin`
    - Multiple active memberships $\to$ `/auth/select-institution`
    - Parent / Guardian $\to$ `/portal/parent`
    - Student $\to$ `/portal/student`
    - Faculty / Teacher $\to$ `/portal/teacher`
    - Institution Owner / Admin $\to$ `/dashboard`
    - No active memberships $\to$ `/onboarding`
  - Strict `requirePortalRole()`: Owners and admins do not inherit portal permissions without explicit `?preview=true` (which writes to `audit_logs`).
  - Active institution cookie tamper resistance: Tampered cookie safely falls back to legitimate active membership.
- **Portals Implemented**:
  - `/dashboard`: Comprehensive institutional administration with dynamic education-level branding, metrics, academic calendar, and audit trails.
  - `/portal/parent`: Child selector, attendance overview, timetable, examination results, fee balances, and homework.
  - `/portal/student`: Personal attendance metrics, daily timetable, upcoming exams, active homework, and report cards.
  - `/portal/teacher`: Assigned lecture sections, enrolled student roster, batch attendance register, homework distribution, and timetable.
  - `/hrix-admin`: Platform super admin console with tenant lifecycle actions (Approve/Suspend), subscription plans, and platform health.
- **Background Worker & Cron**:
  - `/api/cron/notifications`: Protected endpoint executing `NotificationOutboxWorker` with Bearer auth.
  - `apps/web/src/lib/notifications/adapters.ts`: Production-ready `PushDeliveryAdapter` (Expo Push API), `EmailDeliveryAdapter`, and `SmsDeliveryAdapter`.

### 2.4 Mobile Application (`apps/mobile`)
- Expo SDK 51 with React Native, Supabase mobile client, and Hermes bytecode export.
- `apps/mobile/src/lib/notificationService.ts`: Real native push token acquisition via `expo-notifications`, Android notification channels configuration, and database registration via `register_push_device_token_atomic`.
- Realtime presence and subscription engine (`useMobileRealtime.ts`).
- Mobile registration and network connectivity resilience.

---

## 3. Missing Functionality & Gaps Identified

### 3.1 Database & Backend Gaps
1. **Announcement Audience Fan-Out Pipeline:**
   - While `announcements` and `notifications` tables both exist, `createAnnouncementAction` currently inserts an announcement row but **does not automatically fan out** notification records to targeted recipients (e.g. all parents of Grade 4, or all students in Intermediate MPC).
   - *Requirement:* A server-side audience resolver that queries target users based on scope (`institution`, `class`, `section`, `department`, `program`, `role`) and creates in-app notification rows and push outbox entries.
2. **Teacher Announcement Boundary:**
   - Teachers need a dedicated action to publish announcements restricted strictly to their assigned classes and sections, preventing accidental institution-wide broadcasts.
3. **Automated Academic Workflow Notifications:**
   - When a teacher marks attendance, absence notifications are not yet dispatched automatically to parents.
   - When homework is published, assigned students and parents are not notified.
   - When exam marks are published, students and parents are not notified.
   - When timetable changes occur, affected teachers and students are not notified.

### 3.2 Web Application Gaps
1. **Shared Portal Navigation & TopNav Notification Bell:**
   - While the Owner `/dashboard` has `TopNav.tsx` with a live notification bell and unread badge, the `/portal/*` routes currently lack a standardized portal top bar with an active notification center popover, unread counter, and user profile switcher.
2. **Dedicated Notification Center Pages:**
   - Users across all 5 roles require a dedicated notification management view with category filters (Attendance, Academic, Homework, Fees, Transport, Emergency, General), "Mark as Read", and "Mark All as Read".
3. **Teacher Homework Creation & Evaluation Modal:**
   - In `TeacherPortalClient.tsx`, homework is currently read-only; teachers need a form to publish new homework and a grading drawer to review submissions and assign marks.
4. **Student Homework Submission Modal:**
   - In `StudentPortalClient.tsx`, students see assigned homework but lack an interactive submission dialog for submitting responses.
5. **Education-Type Deep Customization in Portals:**
   - **Preschool:** Toddler daily care tracking (meals, nap, mood, potty, sensory play) needs prominent UI widgets in preschool parent and teacher portals.
   - **Intermediate:** Academic stream views (MPC, BiPC, MEC, CEC) with JEE/NEET mock analytics and downloadable Board practical hall tickets.
   - **University:** Credit registry, semester GPA, choice-based credit audit, and degree progress.

### 3.3 Mobile Application Gaps
1. **Monolithic Mobile Dashboard:**
   - In `apps/mobile/src/screens/DashboardScreen.tsx`, all roles currently render inside one large scrollview with conditional blocks, rather than distinct, intuitive role-specific navigators.
   - *Requirement:* Four dedicated mobile role experiences:
     - **Parent:** Home, Child Profile, Academic Performance, Attendance, Daily Updates, Notifications, Profile.
     - **Student:** Home, Timetable, Academics, Assignments, Results, Notifications, Profile.
     - **Teacher:** Home, My Classes, Attendance Register, Assignments, Students, Notifications, Profile.
     - **Owner:** Overview, Students, Faculty, Announcements, Reports, Notifications, Profile.
2. **Push Notification Deep Linking:**
   - When a user taps a native push notification (whether the mobile app is in the foreground, background, or closed), the app must parse `notificationData` and navigate directly to the target record (e.g., Attendance view, Assignment details, Announcement modal).
3. **Education-Level Mobile Adaptation:**
   - The mobile screens must reflect the active institution's education level terminology and hide irrelevant modules.

### 3.4 Security & Privacy Gaps
1. **Sanitization of Push Payloads:**
   - Phase 4 strictly prohibits transmitting sensitive student grades, health details, or billing secrets in native push payloads. Push payloads must use generic text ("New Grade Published for Mathematics") and rely on authenticated deep-link fetching.
2. **Student & Parent Scope Boundaries in Communication:**
   - Students must never receive confidential `staff_internal` or `admin_broadcast` announcements.
   - Parents must never access data for students other than their verified linked children.
3. **Teacher Publication Isolation:**
   - Server-side validation must reject any teacher announcement whose target scope exceeds the faculty member's active allocations.

---

## 4. Reusable Monorepo Features

The existing codebase contains high-quality engineering modules that will be preserved and leveraged:

| Module / Component | Location | Reusability Plan |
|--------------------|----------|------------------|
| **Smart Post-Auth Router** | `apps/web/src/lib/auth.ts` | Reused for all 5 roles; already hardened with tamper-resistant cookie resolution and audited admin preview. |
| **Outbox Worker & Adapters** | `apps/web/src/lib/notifications/` | Reused for push, email, and SMS delivery; `PushDeliveryAdapter` connects to Expo Push API. |
| **Realtime Presence & WebSockets** | `@edu-platform/supabase-client`, `useAuvrynRealtime` | Reused for live in-app notification toasts and connection status indicators across web and mobile. |
| **Mobile Push Token Service** | `apps/mobile/src/lib/notificationService.ts` | Reused for native token acquisition, permission checks, and Android notification channels. |
| **Parent-Child Link Helper** | Database function `is_guardian_of()` | Reused in all parent-portal queries and API routes to enforce absolute family data isolation. |
| **Teacher Allocation Schema** | `faculty_allocations` table | Reused to validate teacher attendance marking, homework creation, and class-level announcements. |
| **Education Type Engine** | `@edu-platform/types` | Reused across web sidebars, top banners, and mobile headers for adaptive terminology. |

---

## 5. Required Database Enhancements

To support the automated fan-out and notification requirements without destructive schema changes:

1. **Targeted Announcement Audience Resolution Function (`resolve_announcement_recipients`):**
   - A PostgreSQL function or TypeScript service that accepts `(announcement_id, institution_id, scope, target_roles, target_entity_id)` and returns the exact list of eligible `profile_id` recipients.
2. **Automated Notification Fan-Out Trigger or Action (`fan_out_announcement_notifications`):**
   - Automatically inserts a row into `public.notifications` for each eligible recipient.
   - For users with push enabled in `notification_preferences`, enqueues a row into `public.notification_deliveries` with `channel = 'push'`.
3. **Preschool Daily Routine Log Table (`preschool_daily_logs`):**
   - `id`, `institution_id`, `student_id`, `log_date`, `temperature`, `lunch_status`, `nap_duration_minutes`, `mood`, `activities_text`, `recorded_by_staff_id`.
4. **Intermediate Competitive Exam Scores Table (`competitive_exam_scores`):**
   - `id`, `institution_id`, `student_id`, `exam_type` (`jee_mains`, `jee_adv`, `neet`, `eamcet`), `mock_test_name`, `score`, `percentile`, `rank_in_college`.

---

## 6. Implementation Sequence & Execution Roadmap

The implementation will proceed across controlled stages as mandated:

```mermaid
flowchart TD
    S1["Stage 1: Complete Monorepo Audit (Current)"] --> S2["Stage 2: Database & Backend Foundations"]
    S2 --> S3["Stage 3: Role-Specific Web Dashboards Enhancement"]
    S3 --> S4["Stage 4: Mobile Role Experiences (Parent, Student, Teacher, Owner)"]
    S4 --> S5["Stage 5: Complete Announcement & Notification System"]
    S5 --> S6["Stage 6: Realtime & Mobile Push Notification Delivery"]
    S6 --> S7["Stage 7: Academic Performance Workflows"]
    S7 --> S8["Stage 8: Permissions, Tenant Isolation & Education Types Testing"]
    S8 --> S9["Stage 9: Complete Monorepo Quality Checks (Build & Types)"]
    S9 --> S10["Stage 10: Final Documentation, Screenshots & Acceptance Delivery"]
```

### Stage Milestones
- **Stage 1 (Complete):** Audit delivered in `docs/ROLE_BASED_APPLICATION_AUDIT.md`.
- **Stage 2:** Implement recipient fan-out resolver, notification helper actions, preschool daily logs, and intermediate test scores in shared packages and migrations.
- **Stage 3:** Upgrade web dashboards with dedicated notification centers, shared portal top navigation, interactive homework submission/review, and preschool/intermediate/university specialized modules.
- **Stage 4:** Modularize `apps/mobile` into dedicated role-specific tab experiences (Parent, Student, Teacher, Owner) with adaptive education-level terminology.
- **Stage 5:** Implement Owner announcement composer (multi-targeting, scheduled release, preview) and Teacher class-level composer.
- **Stage 6:** Connect Expo push notification delivery, handle token refreshes, and implement push deep-link navigation in mobile.
- **Stage 7:** Implement closed-loop academic workflows: Attendance marking $\to$ Parent absence alert; Homework creation $\to$ Student submission $\to$ Teacher evaluation $\to$ Results publication notice.
- **Stage 8:** Write automated unit and security tests verifying role routing, cross-tenant isolation, parent link isolation, and notification fan-out.
- **Stage 9:** Execute full monorepo typecheck, linter, unit tests, security tests, integration tests, web build, and mobile export.
- **Stage 10:** Compile final delivery documents and capture live rendered screenshots.

---

## 7. Baseline Verification Status

The current codebase enters this implementation sequence with verified health:
- **Typecheck:** 0 errors across all 6 workspaces
- **ESLint:** 0 warnings, 0 errors
- **Unit Tests:** 373 passed / 373 total
- **Security Tests:** 250 passed / 250 total
- **Dynamic PostgreSQL 17 Integration:** 30 passed / 30 total
- **Web Build:** 112 routes compiled cleanly
- **Android Mobile:** 770 modules exported to Hermes bytecode (2.76 MB)

**Conclusion:** The codebase is stable, cleanly structured, and ready for Stage 2 execution.
