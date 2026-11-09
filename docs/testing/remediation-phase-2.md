# Platform Remediation Phase 2 — Execution & Verification Log

**Date:** 2026-11-09  
**Platform Version:** Post-Milestone 11 Testing & Remediation  
**Status:** In Progress (Phase 2.1, 2.2, 2.3, and 2.4 Completed & Verified)

---

## Remediation Tracking Table

| Finding ID | Milestone / Module | Original Severity | Root Cause | Implemented Fix | Changed / Added Files | Regression Test Suite | Live Verification Status | Remaining Limitations |
| :--- | :--- | :---: | :--- | :--- | :--- | :--- | :---: | :--- |
| **REM-CRIT-01** | Milestone 4 & 5 / Attendance RLS | **CRITICAL** | `supabase/migrations/20261105040000_attendance_management.sql` referenced `current_user_tenant_ids()`, but `20261105000000_initial_schema.sql` defined `get_user_institution_ids()`. Also, `student_att_select_policy` checked `is_institution_member()` instead of staff/admin roles, allowing students to view peer records. | 1. Created forward migration `20261109120000_fix_attendance_rls_functions.sql` defining `public.current_user_tenant_ids()` as a `SECURITY DEFINER` function with `search_path = public`.<br>2. Explicitly revoked default public execution and granted to `authenticated`, `anon`, `service_role`.<br>3. Hardened `student_att_select_policy`, `att_corr_select_policy`, and `att_notif_select_policy` to require staff/admin roles or student/guardian self-ownership.<br>4. Created rollback migration `20261109120000_rollback.sql`. | • `supabase/migrations/20261109120000_fix_attendance_rls_functions.sql`<br>• `supabase/migrations/rollback/20261109120000_rollback.sql`<br>• `tests/security/attendance-rls-regression.test.ts` | `tests/security/attendance-rls-regression.test.ts` (10 tests passing) | **VERIFIED LIVE** on PostgreSQL 17 engine with 2 institutions & 6 user roles (`test_app_user` with RLS). | Forward migration must be executed on target Supabase instance upon deployment. |
| **REM-HIGH-01** | Milestone 9 / Portal Routing | **HIGH** | `apps/web/src/lib/supabase/middleware.ts` omitted `/portal/*` from `isProtectedRoute`. Portal pages relied solely on `requireInstitution()` without enforcing role boundaries or sanitizing login redirects. | 1. Expanded `isProtectedRoute` in `middleware.ts` to include `/portal/*`.<br>2. Added safe internal `redirectTo` validation to prevent open-redirect exploits.<br>3. Created server-side guard `requirePortalRole()` in `apps/web/src/lib/auth.ts`.<br>4. Hardened `/portal/parent/page.tsx` and `/portal/student/page.tsx` with role guards.<br>5. Hardened server actions to reject unauthorized roles and strictly scope all queries by active `membership.institutionId`. | • `apps/web/src/lib/supabase/middleware.ts`<br>• `apps/web/src/lib/auth.ts`<br>• `apps/web/src/app/portal/parent/page.tsx`<br>• `apps/web/src/app/portal/student/page.tsx`<br>• `apps/web/src/app/portal/parent/actions.ts`<br>• `apps/web/src/app/portal/student/actions.ts`<br>• `tests/security/portal-middleware-security.test.ts` | `tests/security/portal-middleware-security.test.ts` (14 tests passing) | **VERIFIED LIVE** via Next.js Edge Middleware route simulation & server action boundary tests. | Real-browser session cookie verification requires live browser automation or staging deployment. |
| **REM-HIGH-02** | Milestone 2, 4, 10 / Storage | **HIGH** | File paths stored in DB without explicit bucket creation & `storage.objects` RLS in migrations. | 1. Created forward migration `20261109121000_storage_security_policies.sql` creating 4 private buckets (`student-documents`, `staff-documents`, `transport-documents`, `academic-documents`) with `public = false`.<br>2. Implemented `public.storage_extract_institution_id()` and `storage_extract_entity_id()` helpers with regex UUID validation.<br>3. Created granular RLS policies on `storage.objects` for SELECT, INSERT, UPDATE, DELETE enforcing institution isolation, staff rights, student self-ownership, and guardian verified child access.<br>4. Strictly restricted DELETE policies on `storage.objects` to `owner` and `admin` roles, preventing student/guardian deletion of compliance records.<br>5. Built centralized storage library `apps/web/src/lib/storage.ts` with file name sanitization, path traversal blocking, double extension prevention, file size/MIME verification, and clamped signed download URLs (30s-3600s).<br>6. Implemented signed URL generation server actions and UI View File buttons across web students, staff, and portal (parent/student).<br>7. Created rollback migration `20261109121000_rollback.sql`. | • `supabase/migrations/20261109121000_storage_security_policies.sql`<br>• `supabase/migrations/rollback/20261109121000_rollback.sql`<br>• `packages/database/src/index.ts`<br>• `apps/web/src/lib/storage.ts`<br>• `apps/web/src/app/dashboard/students/actions.ts`<br>• `apps/web/src/app/dashboard/students/[id]/documents/StudentDocumentsClient.tsx`<br>• `apps/web/src/app/dashboard/staff/actions.ts`<br>• `apps/web/src/app/dashboard/staff/[id]/documents/StaffDocumentsClient.tsx`<br>• `apps/web/src/app/portal/parent/actions.ts`<br>• `apps/web/src/app/portal/student/actions.ts`<br>• `tests/security/storage-security.test.ts` | `tests/security/storage-security.test.ts` (37 tests passing) | **VERIFIED LIVE** on PostgreSQL 17 engine testing all 7 RLS scenarios on `storage.objects` with non-superuser role `test_app_user`. | Supabase S3 storage backend upload simulation requires live bucket service or MinIO for binary byte verification. |
| **REM-HIGH-03** | Milestone 5, 8, 9 / Notifications | **HIGH** | Notification deliveries remained in `queued` status indefinitely without background consumer, concurrency locking, backoff delays, or dead-letter handling. | 1. Created forward migration `20261109122000_notification_outbox_worker.sql` expanding statuses (`processing`, `sent`, `dead_letter`) and worker columns (`locked_at`, `locked_by`, `next_retry_at`, `provider_message_id`, `provider_response`).<br>2. Implemented `public.claim_notification_deliveries()` with atomic `FOR UPDATE SKIP LOCKED` and stale lock recovery.<br>3. Implemented `public.resolve_notification_delivery()` with exponential backoff delay calculation (`LEAST(3600s, 2^(attempts-1)*30s)`) and non-PII audit logging in `notification_delivery_logs`.<br>4. Implemented admin dead-letter requeue function `public.requeue_dead_letter_delivery()` and metrics aggregation view `public.notification_outbox_metrics`.<br>5. Implemented server-side worker `NotificationOutboxWorker` with active membership verification and multi-channel adapters (`email`, `sms`, `push`, `mock`).<br>6. Implemented Supabase Edge Function `dispatch-notifications` and enhanced UI delivery queue with manual cycle trigger, status filters, and dead-letter requeueing.<br>7. Created rollback migration `20261109122000_rollback.sql`. | • `supabase/migrations/20261109122000_notification_outbox_worker.sql`<br>• `supabase/migrations/rollback/20261109122000_rollback.sql`<br>• `packages/types/src/index.ts`<br>• `apps/web/src/lib/notifications/types.ts`<br>• `apps/web/src/lib/notifications/adapters.ts`<br>• `apps/web/src/lib/notifications/worker.ts`<br>• `apps/web/src/lib/notifications/index.ts`<br>• `supabase/functions/dispatch-notifications/index.ts`<br>• `apps/web/src/app/dashboard/communications/actions.ts`<br>• `apps/web/src/app/dashboard/communications/delivery/DeliveryQueueClient.tsx`<br>• `tests/security/notification-outbox-worker.test.ts` | `tests/security/notification-outbox-worker.test.ts` (15 tests passing) | **VERIFIED LIVE** on PostgreSQL 17 engine with concurrent workers, stale lock recovery, exponential backoff, dead letter requeueing, and non-PII audit logging. | Production delivery requires live provider secrets (Resend, Twilio, FCM) configured in Supabase Vault / Edge Function secrets. |
| **REM-MED-01** | Milestone 10 / Mobile Hardware | **MEDIUM** | Mobile lacks `expo-location` and `expo-notifications` native packages. | *Pending Phase 2.5* | — | — | Pending Phase 2.5 | — |
| **REM-MED-02** | Testing Infrastructure | **MEDIUM** | Missing `tests/integration/` directory causing `npm run test:integration` exit code 1. | *Pending Phase 2.6* | — | — | Pending Phase 2.6 | — |

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

---

## Phase 2.2 — Portal Middleware & Server-Side Authorization Details

### 1. Investigation Findings
1. **Edge Middleware Omission:**
   - In `apps/web/src/lib/supabase/middleware.ts`, `isProtectedRoute` was defined as `pathname.startsWith('/dashboard') || pathname.startsWith('/onboarding')`.
   - `/portal/*` (`/portal/parent`, `/portal/student`) was completely missing from `isProtectedRoute`.
   - Unauthenticated requests bypassed edge redirection, relying solely on downstream server component execution.
2. **Missing Post-Login Redirection Handling & Open Redirect Risk:**
   - When an authenticated user visited `/auth/login`, they were unconditionally redirected to `/dashboard`, ignoring their original requested path (e.g. `/portal/parent`).
   - If `redirectTo` were accepted without sanitization, an attacker could supply an external URI (e.g. `https://evil.com`) causing open-redirect vulnerabilities.
3. **Defense-in-Depth Authorization Gap:**
   - Portal pages (`apps/web/src/app/portal/parent/page.tsx` and `student/page.tsx`) called generic `requireInstitution()` without enforcing role boundaries. A student visiting `/portal/parent` or a parent visiting `/portal/student` was not rejected by page-level authorization guards.
   - Portal server actions (`getParentPortalDataAction` and `getStudentPortalDataAction`) did not explicitly return an unauthorized error when called by unauthorized roles (e.g. faculty calling parent portal).

### 2. Remediation Architecture
1. **Edge Middleware Hardening (`apps/web/src/lib/supabase/middleware.ts`):**
   - Expanded `isProtectedRoute` to include `pathname.startsWith('/portal')`.
   - Redirects unauthenticated requests immediately to `/auth/login?redirectTo=<pathname>`.
   - Validates `redirectTo` against open-redirect exploits: ensures the target starts with `/` and not `//`.
2. **Dedicated Server Guard (`apps/web/src/lib/auth.ts`):**
   - Added `requirePortalRole(allowedRoles: Role[], fallbackRedirect?: string)` to verify authenticated session, active institution membership, and valid role before page render.
   - Applied `requirePortalRole(['parent', 'owner', 'admin'])` to `/portal/parent/page.tsx`.
   - Applied `requirePortalRole(['student', 'owner', 'admin'])` to `/portal/student/page.tsx`.
3. **Server Action Tenant & Role Hardening:**
   - Hardened `getParentPortalDataAction` and `getStudentPortalDataAction` to explicitly reject unauthorized roles with a 403-equivalent structured error.
   - Enforced `.eq('institution_id', membership.institutionId)` across all database queries, preventing cross-tenant leakage for users with memberships across multiple institutions.
   - Sanitized `selectedStudentId` in parent portal action: any client-supplied ID not in the verified list of linked children in `student_guardians` is safely discarded.

### 3. Verification & Quality Gates
- **Security & Regression Test Suite:**
  - Added `tests/security/portal-middleware-security.test.ts` (14 tests covering edge middleware route protection, public route preservation, safe redirect sanitization, server guard role boundaries, and multi-tenant isolation).
  - All 14 tests PASSED.
- **Full Unit & Security Suites:** 312 / 312 tests PASSED (26 test files).
- **Workspace Typecheck:** PASSED (`tsc --noEmit` produced 0 errors across all 7 packages).
- **Next.js Production Web Build:** PASSED (106 routes generated cleanly with 87 kB optimized edge middleware bundle).

---

## Phase 2.3 — Storage Security & Institutional RLS Details

### 1. Investigation Findings
1. **Unprotected Storage Infrastructure:**
   - Previous migrations stored file paths (e.g. `storage_path` in `student_documents` and `staff_documents`, `file_url` in `vehicle_documents`, `library_digital_resources`, `event_certificates`, `leave_requests`), but no migrations declared the underlying Supabase Storage buckets or their security policies on `storage.objects`.
   - Without explicit RLS policies on `storage.objects`, any authenticated Supabase user could potentially download or overwrite private documents across institutions or entities by forging storage paths.
2. **Missing Granular Role and Ownership Boundaries on Storage Objects:**
   - Institutional documents contain highly sensitive Personally Identifiable Information (PII) including birth certificates, government IDs, transfer certificates, salary slips, and employment contracts.
   - Students should strictly be restricted to their own uploaded/assigned compliance files and must never see peer documents.
   - Guardians should strictly be restricted to documents belonging to their verified children.
   - Deletion of compliance documents must be prohibited for students and guardians to prevent tampering with active admissions or enrollment audits.
3. **Download URL and Traversal Risks:**
   - Storing public URLs or un-sanitized client paths allowed directory traversal (`../../etc/passwd`), double extension executables (`report.pdf.exe`), and arbitrary cross-tenant file injection.
   - Buckets must remain strictly private (`public = false`), and access must be granted only via short-lived signed URLs generated on the server after role and ownership verification.

### 2. Remediation Architecture
1. **Forward Migration (`supabase/migrations/20261109121000_storage_security_policies.sql`):**
   - Configures 4 strictly private buckets in `storage.buckets` (`student-documents`, `staff-documents`, `transport-documents`, `academic-documents`) with `public = false`.
   - Sets strict file size limits (10MB for student/staff, 15MB for transport, 25MB for academic) and allowed MIME type whitelists.
   - Implements regex-validated path extractors: `public.storage_extract_institution_id(p_name text)` and `public.storage_extract_entity_id(p_name text)`, guaranteeing safe UUID extraction without SQL cast crashes.
   - Implements granular `storage.objects` RLS policies for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` on all 4 buckets.
   - Strictly restricts `DELETE` operations on `storage.objects` to institutional `owner` and `admin` roles.
2. **Rollback Migration (`supabase/migrations/rollback/20261109121000_rollback.sql`):**
   - Drops all created RLS policies on `storage.objects` and `storage.buckets`.
   - Deletes storage objects and private buckets safely without foreign key violations.
   - Drops extraction helper functions.
3. **Central Storage Security Library (`apps/web/src/lib/storage.ts`):**
   - `STORAGE_BUCKETS` and `STORAGE_BUCKET_CONFIGS`: Definitive constants matching migration schema.
   - `sanitizeFileName()`: Strips path traversal characters, directory separators, control codes, and dangerous sequences.
   - `generateStoragePath()`: Generates canonical `{institutionId}/{category}/{entityId}/{timestamp}-{sanitizedFileName}` paths with UUID validation.
   - `validateStoragePath()`: Blocks directory traversal, format mismatches, and cross-tenant storage path tampering.
   - `validateFileUpload()`: Enforces max file sizes, MIME types, whitelist extensions, and rejects dangerous script/executable extensions and double-extension payload attacks (`.pdf.exe`).
   - `createSignedDownloadUrl()`: Clamps expiration to safe bounds (30s to 3600s, defaulting to 300s / 5 minutes) and generates time-limited signed URLs.
4. **Server Actions & UI Integration:**
   - `apps/web/src/app/dashboard/students/actions.ts`: Added file validation and canonical path generation in `uploadStudentDocumentAction`; added `getStudentDocumentSignedUrlAction()`.
   - `apps/web/src/app/dashboard/students/[id]/documents/StudentDocumentsClient.tsx`: Added interactive "View File" button to fetch signed URLs and open securely in new tab.
   - `apps/web/src/app/dashboard/staff/actions.ts`: Added file validation and canonical path generation in `uploadStaffDocumentAction`; added `getStaffDocumentSignedUrlAction()`.
   - `apps/web/src/app/dashboard/staff/[id]/documents/StaffDocumentsClient.tsx`: Added interactive "View File" button.
   - `apps/web/src/app/portal/parent/actions.ts`: Added `getParentChildDocumentSignedUrlAction()` verifying guardian-to-child relationship before generating signed link.
   - `apps/web/src/app/portal/student/actions.ts`: Added `getStudentOwnDocumentSignedUrlAction()` verifying caller student profile before generating signed link.

### 3. Verification & Quality Gates
- **PostgreSQL 17 Live Engine Execution:**
  - Started local PostgreSQL 17 test server (port 54333) with full schema and RLS enabled.
  - Executed migration and verified with non-superuser role `test_app_user` across 7 test cases:
    1. **Alice (Alpha Owner):** Selected 2 Alpha student documents, 0 Beta documents (100% tenant-isolated).
    2. **Charlie (Alpha Student):** Selected exactly 1 own birth certificate; 0 peer student documents, 0 Beta documents.
    3. **Grace (Alpha Guardian):** Selected exactly 1 document for verified child Charlie; 0 peer documents.
    4. **Cross-Tenant Isolation:** Alice attempted cross-tenant insert into Beta storage path; blocked with `SQLSTATE 42501 (new row violates row-level security policy for table "objects")`.
    5. **Student Peer Upload Violation:** Charlie attempted upload into peer folder; blocked with `SQLSTATE 42501`.
    6. **Student Deletion Prohibition:** Charlie attempted to delete own document; returned `DELETE 0`, document remained intact (blocked by RLS).
    7. **Owner Authorized Deletion:** Alice (Owner) executed delete on Alpha document; returned `DELETE 1`, successfully deleted.
- **Rollback & Re-apply Verification:** Tested rollback migration followed by re-applying forward migration on PostgreSQL 17 with 0 errors.
- **Security Regression Test Suite:**
  - Added `tests/security/storage-security.test.ts` with 37 tests covering bucket configuration, upload metadata validation, path traversal prevention, double extension detection, tenant isolation, role ownership boundaries, deletion protection, and signed URL expiration.
  - All 37 tests PASSED.
- **Full Unit & Security Suites:** 349 / 349 tests PASSED across 27 test files (`npm test`).
- **Workspace Typecheck:** PASSED (`npm run typecheck` returned 0 errors across all 7 monorepo packages).
- **Shared Dependency Builds:** PASSED (`npm run build:mobile-deps` compiled types, database, validators, supabase-client).
- **Next.js Production Web Build:** PASSED (`npm run build --workspace=@edu-platform/web` generated all 106 routes).
- **Expo Android Bundle Export:** PASSED (`npx expo export --platform android` generated Hermes bytecode dist).

---

## Phase 2.4 — Notification Worker & Outbox Dispatch Details

### 1. Investigation Findings
1. **Dormant Outbox State:**
   - In Milestone 9 (`supabase/migrations/20261105080000_parent_student_communications.sql`), `notifications` and `notification_deliveries` tables were defined to queue multi-channel communication events.
   - However, no consumer worker, daemon process, or scheduled edge function pulled from `notification_deliveries`. Rows queued with `status = 'queued'` remained in that state indefinitely.
2. **Missing Concurrency Control & State Management:**
   - The original schema lacked atomic row-locking semantics. Multiple concurrent worker instances polling the outbox simultaneously would cause duplicate delivery dispatches to external gateways (Twilio, Resend, FCM).
   - The enum `notification_delivery_status` only contained `('pending', 'queued', 'sent', 'delivered', 'failed', 'bounced')`. It lacked an active `'processing'` state for claimed locks, and a `'dead_letter'` state for jobs that permanently failed or exceeded maximum retry attempts.
3. **Lack of Exponential Backoff & Transient vs. Permanent Failure Discrimination:**
   - Outbox deliveries had no `next_retry_at` calculation or backoff scheduling. Transient network drops or provider rate limits (HTTP 429) had no automated progression.
   - Permanent failures (such as invalid email syntax, invalid E.164 phone numbers, or deactivated/revoked user accounts) would repeatedly burn retry quotas without a designated dead-letter queue.
4. **Security & PII Auditing Hazards:**
   - Recipient authorization was not verified at dispatch time. If a user was revoked or belonged to another institution, delivering notifications risked leaking confidential grades or fee statements across tenants.
   - Delivery error logging risked capturing sensitive message bodies or contact details in plain text logs.

### 2. Remediation Architecture
1. **Forward Migration (`supabase/migrations/20261109122000_notification_outbox_worker.sql`):**
   - **Enum Expansion:** Added `'processing'`, `'sent'`, and `'dead_letter'` to `notification_delivery_status`.
   - **Worker Columns:** Added `locked_at TIMESTAMP WITH TIME ZONE`, `locked_by TEXT`, `next_retry_at TIMESTAMP WITH TIME ZONE`, `provider_message_id TEXT`, and `provider_response JSONB` to `notification_deliveries`.
   - **Performance Indexes:** Created `idx_notification_deliveries_worker_claim` on `(status, next_retry_at, locked_at)` for sub-millisecond worker claiming, and `idx_notification_deliveries_dead_letter` for dead-letter filtering.
   - **Non-PII Delivery Audit Log (`public.notification_delivery_logs`):** Stores `delivery_id`, `institution_id`, `channel`, `provider`, `status`, `attempt_number`, `error_code`, and `latency_ms` with institutional RLS. Explicitly excludes sensitive message body and recipient personal data.
   - **Atomic Claiming Stored Procedure (`public.claim_notification_deliveries`):**
     - Uses `FOR UPDATE SKIP LOCKED` inside a Common Table Expression.
     - Claims jobs where `(status = 'queued' OR status = 'failed') AND (locked_at IS NULL OR locked_at < now() - p_lock_timeout) AND (next_retry_at IS NULL OR next_retry_at <= now())`.
     - Automatically resets stale locks from crashed worker nodes.
     - Atomically transitions claimed jobs to `status = 'processing'` with worker ID and timestamp.
   - **Atomic Resolution Stored Procedure (`public.resolve_notification_delivery`):**
     - Increments `attempts_count`.
     - If success: transitions to `delivered`, clears worker locks, and inserts an audit log.
     - If failure: evaluates `is_permanent_failure` and `attempts_count >= max_attempts`. If true, transitions to `dead_letter`. Otherwise transitions to `failed` and schedules `next_retry_at = timezone('utc', now()) + LEAST(INTERVAL '3600 seconds', (POWER(2, GREATEST(0, attempts_count - 1)) * INTERVAL '30 seconds'))`.
   - **Administrative Dead-Letter Requeueing (`public.requeue_dead_letter_delivery`):**
     - Resets `status = 'queued'`, `attempts_count = 0`, `locked_by = NULL`, `locked_at = NULL`, `error_message = NULL`, `next_retry_at = timezone('utc', now())`.
   - **Operational Visibility View (`public.notification_outbox_metrics`):**
     - Aggregates per-institution counts for queued, pending, processing, delivered, failed, dead-letter, and oldest pending job age.
2. **Rollback Migration (`supabase/migrations/rollback/20261109122000_rollback.sql`):**
   - Drops `notification_outbox_metrics`, functions, `notification_delivery_logs`, indexes, and worker columns cleanly.
3. **Multi-Channel Adapters & Background Worker Engine (`apps/web/src/lib/notifications/`):**
   - `MockDeliveryAdapter`: Deterministic adapter for test suites and offline development with configurable behaviors (`success`, `transient_failure`, `rate_limited`, `permanent_failure`, `timeout`).
   - `EmailDeliveryAdapter`: Validates RFC 5322 email syntax and prepares SendGrid / Resend payloads.
   - `SmsDeliveryAdapter`: Validates E.164 international phone formats and prepares Twilio / SMS payloads.
   - `PushDeliveryAdapter`: Validates Expo / FCM push tokens and payload formatting.
   - `NotificationOutboxWorker`:
     - Configurable `workerId`, `batchSize`, `lockTimeoutInterval`, and `dispatchTimeoutMs`.
     - Checks `institution_memberships` where `institution_id = job.institutionId AND user_id = job.recipientUserId AND status = 'active'`. Deactivated, suspended, or foreign tenant recipients are immediately rejected with `UNAUTHORIZED_RECIPIENT` and routed to `dead_letter`.
     - Resolves missing contact addresses dynamically from profiles and active push device tokens.
     - Wraps adapter dispatch with timeout protection and AbortSignal handling.
4. **Supabase Edge Function (`supabase/functions/dispatch-notifications/index.ts`):**
   - Production edge function triggered via Supabase Cron (`pg_cron` or scheduled webhook) using the service role key.
   - Processes batches iteratively until the queue is drained or execution limits are reached.
5. **Dashboard Outbox Queue UI & Server Actions (`apps/web/src/app/dashboard/communications/`):**
   - `triggerOutboxWorkerAction(batchSize)`: Triggers a worker cycle directly from the web admin console.
   - `requeueDeadLetterDeliveryAction(deliveryId)`: Requeues dead-letter jobs back to active processing.
   - `getOutboxMetricsAction()`: Retrieves real-time queue metrics.
   - `DeliveryQueueClient.tsx`: Updated with "Process Outbox" execution button, `processing` and `dead_letter` status badges, status filter options, and inline "Requeue" buttons for dead-letter items.

### 3. Verification & Quality Gates
- **PostgreSQL 17 Live Engine Execution:**
  - Initialized isolated PostgreSQL 17 test database (port 54333) with full platform schema and communications tables.
  - Executed migration `20261109122000_notification_outbox_worker.sql` with zero errors.
  - Tested live concurrency with two distinct worker instances:
    1. Worker 1 claimed 2 jobs atomically (`FOR UPDATE SKIP LOCKED`).
    2. Concurrent Worker 2 claimed remaining jobs with zero collision or row locking contention.
    3. Stale Lock Recovery: Worker 2 successfully recovered and reclaimed a stale lock from a simulated dead worker node.
    4. Delivery 1 resolved to `delivered` with provider ID and response payload.
    5. Delivery 2 resolved to `failed` with exponential backoff scheduled for 30s in the future.
    6. Delivery 3 resolved to `dead_letter` on permanent recipient syntax failure.
    7. Requeued dead-letter delivery back to `queued` with attempt count reset to 0.
    8. Verified `notification_outbox_metrics` aggregation view.
    9. Verified `notification_delivery_logs` audit records confirmed zero PII leakage.
  - Verified clean rollback script execution followed by successful re-application of the forward migration.
- **Security Regression Test Suite:**
  - Added `tests/security/notification-outbox-worker.test.ts` with 15 automated test cases:
    - Exponential backoff delay math ($30s \to 60s \to 120s \to \dots \to 3600s$ cap).
    - Max attempts thresholding and permanent failure routing to `dead_letter`.
    - Idempotency key determinism and duplicate prevention.
    - Concurrent worker atomic claiming (`SKIP LOCKED`) and disjoint job allocation.
    - Stale lock detection and recovery.
    - Future `next_retry_at` enforcement.
    - Institutional recipient active membership enforcement and cross-tenant rejection (`UNAUTHORIZED_RECIPIENT`).
    - Mock adapter behavior simulation and timeout resilience.
    - Non-PII delivery audit log sanitization.
    - Administrative dead-letter requeueing state transitions.
  - All 15 tests PASSED.
- **Full Monorepo Test Suite:** 364 / 364 tests PASSED across 28 test files (`npm test`).
- **Security Test Suite:** 162 / 162 tests PASSED across 15 security test files (`npm run test:security`).
- **Workspace Typecheck:** PASSED (`npm run typecheck` returned 0 errors across all 7 packages and applications).
- **Shared Dependency Builds:** PASSED (`npm run build:mobile-deps` compiled types, database, validators, supabase-client).
- **Next.js Production Web Build:** PASSED (`npm run build --workspace=@edu-platform/web` compiled 106 routes).
- **Expo Android Bundle Export:** PASSED (`npx expo export --platform android` generated Hermes bytecode dist).



