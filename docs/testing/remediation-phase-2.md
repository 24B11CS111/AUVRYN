# Platform Remediation Phase 2 — Execution & Verification Log

**Date:** 2026-11-09  
**Platform Version:** Post-Milestone 11 Testing & Remediation  
**Status:** In Progress (Phase 2.1 Completed & Verified)

---

## Remediation Tracking Table

| Finding ID | Milestone / Module | Original Severity | Root Cause | Implemented Fix | Changed / Added Files | Regression Test Suite | Live Verification Status | Remaining Limitations |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **REM-CRIT-01** | Milestone 4 & 5 / Attendance RLS | **CRITICAL** | `supabase/migrations/20261105040000_attendance_management.sql` referenced `current_user_tenant_ids()`, but `20261105000000_initial_schema.sql` defined `get_user_institution_ids()`. Also, `student_att_select_policy` checked `is_institution_member()` instead of staff/admin roles, allowing students to view peer records. | 1. Created forward migration `20261109120000_fix_attendance_rls_functions.sql` defining `public.current_user_tenant_ids()` as a `SECURITY DEFINER` function with `search_path = public`.<br>2. Explicitly revoked default public execution and granted to `authenticated`, `anon`, `service_role`.<br>3. Hardened `student_att_select_policy`, `att_corr_select_policy`, and `att_notif_select_policy` to require staff/admin roles or student/guardian self-ownership.<br>4. Created rollback migration `20261109120000_rollback.sql`. | • `supabase/migrations/20261109120000_fix_attendance_rls_functions.sql`<br>• `supabase/migrations/rollback/20261109120000_rollback.sql`<br>• `tests/security/attendance-rls-regression.test.ts` | `tests/security/attendance-rls-regression.test.ts` (10 tests passing) | **VERIFIED LIVE** on PostgreSQL 17 engine with 2 institutions & 6 user roles (`test_app_user` with RLS). | Forward migration must be executed on target Supabase instance upon deployment. |
| **REM-HIGH-01** | Milestone 9 / Portal Routing | **HIGH** | `apps/web/src/lib/supabase/middleware.ts` omitted `/portal/*` from `isProtectedRoute`. | *Pending Phase 2.2* | — | — | Pending Phase 2.2 | — |
| **REM-HIGH-02** | Milestone 2, 4, 10 / Storage | **HIGH** | File paths stored in DB without explicit bucket creation & `storage.objects` RLS in migrations. | *Pending Phase 2.3* | — | — | Pending Phase 2.3 | — |
| **REM-HIGH-03** | Milestone 5, 8, 9 / Notifications | **HIGH** | Notification outbox lacked background worker / consumer for SMS, email, WhatsApp, push. | *Pending Phase 2.4* | — | — | Pending Phase 2.4 | — |
| **REM-MED-01** | Milestone 10 / Mobile Hardware | **MEDIUM** | Mobile lacks `expo-location` and `expo-notifications` native packages. | *Pending Phase 2.6* | — | — | Pending Phase 2.6 | — |
| **REM-MED-02** | Testing Infrastructure | **MEDIUM** | Missing `tests/integration/` directory causing `npm run test:integration` exit code 1. | *Pending Phase 2.5* | — | — | Pending Phase 2.5 | — |

---

## Phase 2.1 — Critical Attendance RLS Fix Details

### 1. Investigation Findings
1. **Function Signature and Parity:**
   - Canonical function: `public.get_user_institution_ids() RETURNS TABLE (institution_id UUID)` in `20261105000000_initial_schema.sql`.
   - Attendance policies in `20261105040000_attendance_management.sql` called `institution_id IN (SELECT current_user_tenant_ids())`.
   - On a live PostgreSQL database, executing queries on `attendance_sessions`, `student_attendance_records`, `leave_requests`, `attendance_corrections`, or `attendance_notifications` threw runtime error: `function current_user_tenant_ids() does not exist`.
2. **Policy Over-Permissiveness Discovery:**
   - In `student_att_select_policy`, the original policy condition was:
     ```sql
     (institution_id IN (SELECT current_user_tenant_ids()) AND is_institution_member(institution_id))
     OR student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
     OR is_guardian_of_student(student_id)
     ```
   - Because students hold active `institution_memberships` (with `role = 'student'`), `is_institution_member(institution_id)` evaluated to true for enrolled students. This unintentionally enabled students to view attendance records of all students within their institution.
   - The same over-permissiveness applied to `att_corr_select_policy` and `att_notif_select_policy`.

### 2. Remediation Architecture
1. **Compatibility Helper Function (`public.current_user_tenant_ids`):**
   - Mode: `SECURITY DEFINER` (executes with owner privileges to bypass recursive RLS on `institution_memberships`).
   - Hardening: `SET search_path = public` to eliminate search path spoofing.
   - Immutability: `STABLE` for query planner caching across row scans.
   - Security: Revoked default public execution permissions; granted explicitly to `authenticated`, `anon`, and `service_role`.
   - Logic: Strictly queries `institution_memberships` where `user_id = auth.uid()` and `status = 'active'`. Suspended, pending, and revoked memberships return zero rows. Takes no arguments, preventing caller manipulation.
2. **Hardened RLS Policies:**
   - `student_att_select_policy`: Enforces that institutional viewing is strictly limited to staff, faculty, and administrative roles (`owner`, `admin`, `academic_admin`, `department_head`, `faculty`, `staff`). Students are restricted strictly to `student_id IN (SELECT id FROM students WHERE user_id = auth.uid())`, and guardians to `is_guardian_of_student(student_id)`.
   - `att_corr_select_policy`: Restricts selection of attendance corrections to staff/admin roles.
   - `att_notif_select_policy`: Restricts selection of notifications to guardians viewing their own notices or staff/admin roles.

### 3. Verification & Quality Gates
- **PostgreSQL 17 Live Engine Verification:**
  - Initialized isolated test cluster and executed schema with RLS enabled.
  - Tested 2 institutions (Alpha and Beta) and 7 user contexts (Alice: Alpha Owner, Bob: Alpha Faculty, Charlie: Alpha Student, Dan: Beta Owner, Eve: Alpha Suspended Member, Mallory: Stranger).
  - Cross-tenant insertion by Alice into Beta blocked with `SQLSTATE 42501 (row_security_policy_violated)`.
  - Student Charlie attempting session creation blocked with `SQLSTATE 42501`.
  - Student Charlie viewing attendance records returns ONLY Charlie's own record (peer student records hidden).
  - Suspended member Eve returns 0 rows.
  - Stranger Mallory returns 0 rows.
- **Unit & Security Suites:** 298 / 298 tests PASSED (including 10 new regression tests in `attendance-rls-regression.test.ts`).
- **Workspace Typecheck:** PASSED (clean across all 7 packages and applications).
- **Shared Workspace Build:** PASSED (`@edu-platform/types`, `@edu-platform/database`, `@edu-platform/validators`, `@edu-platform/supabase-client`).
- **Next.js Production Web Build:** PASSED (106 routes generated cleanly).
- **Expo Android Bundle Export:** PASSED (613 modules bundled into 2.45 MB Hermes bytecode).
