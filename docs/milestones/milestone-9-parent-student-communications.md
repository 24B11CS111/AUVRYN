# Milestone 9: Universal Parent & Student Communication Ecosystem

## 1. Architectural Overview & Universal Design

Milestone 9 establishes an enterprise-grade communication infrastructure and personalized portal ecosystem across all educational archetypes (K-12 schools, junior colleges, degree colleges, engineering colleges, and universities):
- **Universal Notification Engine**: Central event-driven transactional outbox pattern supporting In-App alerts, Push notifications (FCM/APNs), Email, SMS, and WhatsApp integrations with exponential backoff retries, dead letter status tracking, idempotency keys, and user preference controls.
- **Institution Announcements & Circulars**: Broadcast and audience-targeted circulars (institution, campus, department, class, section, role) with priority levels, scheduled publication, expiration windows, document attachments, and mandatory read receipt tracking.
- **Secure Threaded Messaging**: Controlled bidirectional conversations between parents and teachers, and students and faculty. Strict moderation controls and administrator lock functionality with intentional prevention of unrestricted student-to-student messaging.
- **Homework & Coursework Lifecycle**: Faculty coursework authoring, multi-format attachments, student online submissions, automated late submission detection with penalty calculation, and teacher grading/feedback.
- **Parent-Child Leave Integration**: Secure parent-submitted student leave requests with administrative review workflows. Designed to preserve attendance audit invariants without silently modifying historical attendance records.
- **Dedicated Parent Portal (`/portal/parent`)**: Multi-child family dashboard with one-click child switching, attendance summaries, published report cards, weekly class schedules, fee dues & payment history, assigned coursework, and leave tracking.
- **Dedicated Student Portal (`/portal/student`)**: Single-pane personal academic cockpit featuring attendance metrics, weekly timetables, examination hall tickets, published grades, coursework submission status, fee invoice tracking, and institutional notices.
- **Mobile Experience (`apps/mobile`)**: Native Expo/React Native integration providing role-aware dashboards for students and parents, push device token registration, notification inboxes, and circular feeds.

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                  UNIVERSAL COMMUNICATION & PORTAL ECOSYSTEM                                            |
+-------------------------------------------------------------------------------------------------------------------------+
|  Transactional Outbox & Notification Engine (`notifications`, `notification_deliveries`)                                |
|    |                                                                                                                    |
|    +---> Channels: In-App, Push Notifications, Transactional Email, SMS Gateway, WhatsApp Business API                  |
|    +---> Reliability: Idempotency Keys, Bounded Exponential Backoff Retries, Dead-Letter Status History, User Preferences  |
|    +---> Templates (`notification_templates`): Reusable Dynamic Placeholders (e.g. `{{student_name}}`, `{{amount}}`)    |
|                                                                                                                         |
|  Institution Announcements & Circulars (`announcements`, `announcement_acknowledgements`)                               |
|    |                                                                                                                    |
|    +---> Scopes: Institution, Campus, Department, Program, Class, Section, Role                                         |
|    +---> Priorities: Urgent, Important, Standard, Low                                                                   |
|    +---> Compliance: Read Receipts & Digital Acknowledgements                                                           |
|                                                                                                                         |
|  Moderated Threaded Messaging (`communication_threads`, `communication_participants`, `communication_messages`)         |
|    |                                                                                                                    |
|    +---> Role-Guarded: Parent <-> Teacher, Student <-> Faculty, Staff Internal (No Unmoderated Student-to-Student Chats)   |
|    +---> Safety: Admin Thread Locking, Message Auditing, Attachment Validation                                          |
|                                                                                                                         |
|  Homework & Assignments (`homework_assignments`, `homework_submissions`)                                                |
|    |                                                                                                                    |
|    +---> Faculty Assignment Authoring, Class/Section Scoping, Due Dates & Late Submission Penalty Calculation           |
|    +---> Digital Turn-in, Multi-File Attachments, Teacher Evaluation, Marks & Qualitative Feedback                       |
|                                                                                                                         |
|  Parent & Student Portals (`/portal/parent`, `/portal/student`)                                                         |
|    |                                                                                                                    |
|    +---> Multi-Child Switcher with Verified Guardian-Child Access Control (`student_guardians`, `is_guardian_of_student`) |
|    +---> 360-Degree Child & Student Views: Attendance %, Timetable, Hall Tickets, Results, Fees, Homework, Leave        |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Migration Architecture

Canonical migration files:
- Up migration: `supabase/migrations/20261105080000_parent_student_communications.sql`
- Rollback migration: `supabase/migrations/rollback/20261105080000_rollback.sql`

### 2.1 Enums Defined
1. `notification_category`: `'attendance'`, `'examinations'`, `'results'`, `'fees_payments'`, `'admissions'`, `'homework'`, `'timetable'`, `'leave'`, `'transport'`, `'announcements'`, `'emergency'`, `'general'`.
2. `notification_channel`: `'in_app'`, `'push'`, `'email'`, `'sms'`, `'whatsapp'`.
3. `notification_priority`: `'low'`, `'normal'`, `'high'`, `'urgent'`.
4. `notification_delivery_status`: Extended with `'sending'`, `'sent'`, `'bounced'`, `'cancelled'` in addition to `'pending'`, `'queued'`, `'delivered'`, `'failed'`.
5. `announcement_scope`: `'institution'`, `'campus'`, `'department'`, `'program'`, `'class'`, `'section'`, `'role'`, `'individual'`.
6. `announcement_priority`: `'low'`, `'standard'`, `'important'`, `'urgent'`.
7. `announcement_status`: `'draft'`, `'scheduled'`, `'published'`, `'archived'`.
8. `assignment_submission_status`: `'pending'`, `'submitted'`, `'late'`, `'graded'`, `'resubmit_requested'`.
9. `conversation_type`: `'parent_teacher'`, `'student_faculty'`, `'admin_broadcast'`, `'staff_internal'`.

### 2.2 Relational Tables Created
1. `notifications`: Central recipient-directed notifications with categories, priorities, read states, and expiry.
2. `notification_deliveries`: Transactional outbox delivery attempts, adapter status, attempt counters, retry timestamps, response payloads, error diagnostics, and idempotency keys.
3. `notification_preferences`: Per-user category and channel opt-in/opt-out configuration.
4. `notification_templates`: Reusable templates parameterized with variable tags (`{{var}}`).
5. `push_device_tokens`: Multi-platform push tokens (`ios`, `android`, `web`) with device metadata and activity timestamps.
6. `announcements`: Institutional notices with audience targeting, priority, acknowledgement requirements, and file attachments.
7. `announcement_acknowledgements`: Digital read receipts tracking user acknowledgement timestamps and client metadata.
8. `homework_assignments`: Coursework definitions linked to academic years, classes, sections, subjects, teachers, max marks, deadlines, and late penalty percentages.
9. `homework_submissions`: Student coursework submissions, attachments, late flags, marks obtained, and teacher evaluation feedback.
10. `communication_threads`: Conversation headers categorized by `conversation_type`, tracking lock status, message counts, and latest activity.
11. `communication_participants`: Participants inside each thread with role indicators, mute settings, and read markers.
12. `communication_messages`: Individual threaded messages with attachments, edit histories, and moderation flags.

### 2.3 Stored Procedures & Atomic Functions
1. `dispatch_notification_atomic(...)`:
   - Writes central `notifications` record and queues channel entries in `notification_deliveries` within a single database transaction.
   - Enforces idempotency via `UNIQUE(institution_id, idempotency_key)`, cleanly replaying previously generated notification IDs on duplicate calls.
2. `submit_homework_atomic(...)`:
   - Enforces submission deadlines.
   - If past `due_date + due_time` and `allow_late_submissions = false`, rejects the turn-in with an error.
   - If permitted, automatically marks `is_late = true` and updates status to `'late'`.
3. `submit_parent_child_leave_atomic(...)`:
   - Validates that the caller is a verified guardian of the student via `is_guardian_of_student(p_student_id)`.
   - Creates a pending entry in `leave_requests` without mutating historical attendance records directly.

---

## 3. Shared Package Extensions

### 3.1 `@edu-platform/types`
- Added 9 new granular permissions:
  - `'communications:manage'`
  - `'announcements:publish'`
  - `'announcements:view'`
  - `'messages:send'`
  - `'messages:moderate'`
  - `'homework:manage'`
  - `'homework:submit'`
  - `'homework:grade'`
  - `'notifications:manage'`
- Updated `ROLE_PERMISSIONS` matrix for all 11 system roles (`owner`, `admin`, `hr_administrator`, `academic_admin`, `department_head`, `admissions_officer`, `faculty`, `staff`, `accountant`, `student`, `parent`).
- Exported TypeScript models: `Notification`, `NotificationDelivery`, `NotificationPreference`, `NotificationTemplate`, `PushDeviceToken`, `Announcement`, `AnnouncementAcknowledgement`, `HomeworkAssignment`, `HomeworkSubmission`, `CommunicationThread`, `CommunicationParticipant`, `CommunicationMessage`, `CommunicationsOverviewStats`.

### 3.2 `@edu-platform/validators`
- `announcementCreateSchema` & `announcementAcknowledgeSchema`
- `homeworkAssignmentCreateSchema` (validating YYYY-MM-DD deadlines, max marks 1–1000, penalty percent 0–100)
- `homeworkSubmissionSchema` & `homeworkGradingSchema`
- `communicationThreadCreateSchema` & `communicationMessageSendSchema`
- `notificationDispatchSchema` (enforcing valid categories, channels, and priority levels)
- `notificationPreferencesUpdateSchema`
- `pushTokenRegisterSchema`
- `parentChildLeaveRequestSchema`

### 3.3 `@edu-platform/database`
- Registered 12 new tables in `DATABASE_TABLES`.
- Extended `Database['public']['Tables']`, `Functions`, and `Enums`.
- Exported typed Row interfaces: `NotificationRow`, `NotificationDeliveryRow`, `AnnouncementRow`, `HomeworkAssignmentRow`, `HomeworkSubmissionRow`, `CommunicationThreadRow`, `CommunicationMessageRow`, etc.

---

## 4. Web Application Routes & Portals

Implemented in `apps/web`:

| Route | Purpose | Key Capabilities |
|---|---|---|
| `/dashboard/communications` | Communications Command Center | System overview KPIs, channel health, quick action launchers |
| `/dashboard/communications/announcements` | Circulars & Notices | Filter by scope/priority, view attachments, digital acknowledgement receipts |
| `/dashboard/communications/announcements/new` | Announcement Authoring | Target selection (Institution, Campus, Class, Role), read receipt toggle, attachments |
| `/dashboard/communications/messages` | Threaded Messaging Console | Dual-pane conversation list and message history, new conversation modal, lock indicator |
| `/dashboard/communications/notifications` | Notification Inbox & Settings | In-app alerts feed, mark as read, category & channel preference toggles |
| `/dashboard/communications/templates` | Blueprint Management | Message templates with variable tags (e.g. `{{student_name}}`, `{{date}}`) |
| `/dashboard/communications/delivery` | Outbox Queue Monitor | Transactional delivery statuses, retry count inspection, manual failure retry action |
| `/dashboard/assignments` | Homework & Coursework Hub | Assignment cards, class/subject badges, due dates, submission counters |
| `/dashboard/assignments/new` | Assignment Creator | Academic year, class, section, subject, deadline, max marks, late submission policy |
| `/dashboard/assignments/[id]` | Assignment Detail & Grading | Coursework details, student turn-in form, faculty submission grading modal |
| `/dashboard/leave` | Leave Applications | Student absence notes, parent requests, admin approve/reject actions |
| `/portal/parent` | Dedicated Parent Experience | Multi-child switcher, 360-degree attendance, exam results, fees, timetable, coursework |
| `/portal/student` | Dedicated Student Experience | Personal academic profile, class schedule, hall tickets, report cards, fee invoices |

---

## 5. Mobile Application Integration (`apps/mobile`)

Extended `apps/mobile/src/screens/DashboardScreen.tsx`:
- **Role-Aware Student Hub**: Real-time attendance percentage badge, pending assignment count, quick access to academic timetable and fee status.
- **Push Token Registration**: Exported `registerPushDeviceToken(userId, token, platform)` function interfacing with `push_device_tokens`.
- **Institutional Circulars Feed**: Real-time stream of published notices with priority badges.
- **Personal Alerts Feed**: Displays unread in-app alerts directly in the mobile feed.

---

## 6. Security, Authorization & Privacy Protections

1. **Multi-Tenant Row-Level Security (RLS)**:
   - All 12 communications tables have RLS enabled with `institution_id = current_institution` checks.
   - Cross-tenant injection is blocked by PostgreSQL constraints and RLS policies.
2. **Guardian-Child Authorization**:
   - Access to child data is restricted to verified entries in `student_guardians` via the database function `is_guardian_of_student(student_id)`.
   - Matching email or phone number is never sufficient; access requires an explicit guardian link.
3. **Student Record Self-Scoping**:
   - Students can only view their own attendance records, examination results, fee installments, and submit coursework under their verified `student_id`.
4. **Moderated Messaging Integrity**:
   - Direct, unmoderated student-to-student conversations are strictly prohibited by system validation.
   - Threads can be locked by administrators at any time.
5. **Non-Destructive Leave Approvals**:
   - Approving student leave updates `leave_requests.status = 'approved'`. It does not silently overwrite past attendance records; retroactive changes must use the audited `correct_student_attendance_record` workflow.
6. **Provider-Independent Adapters**:
   - Safe development mocks prevent accidental SMS or WhatsApp dispatch during testing without explicit deployment configurations.

---

## 7. Verification & Quality Gates

### 7.1 Automated Unit & Security Test Suite
Ran `npm test` across all unit and security suites:
- **19 Test Files Passed (100%)**
- **231 Tests Passed (100%)**
  - `tests/unit/communication-validators.test.ts` (15 tests passed)
  - `tests/security/communication-security.test.ts` (7 tests passed)
  - `tests/unit/rbac.test.ts` (15 tests passed)
  - Pre-existing suites for Milestones 1–8 (194 tests passed)

### 7.2 Typechecking
Ran `npm run typecheck` across all workspaces:
- `@edu-platform/types`: 0 errors
- `@edu-platform/validators`: 0 errors
- `@edu-platform/database`: 0 errors
- `@edu-platform/supabase-client`: 0 errors
- `@edu-platform/mobile`: 0 errors
- `@edu-platform/web`: 0 errors

### 7.3 Next.js Production Build
Ran `npx --workspace=@edu-platform/web next build`:
- **69/69 static and dynamic routes compiled successfully**.
- Zero bundle errors, zero route mismatches.
- All 13 communications and portal routes verified.

### 7.4 PostgreSQL RLS Security Verification
Updated `supabase/tests/rls_security_verification.sql` with Tests 31–35 covering announcement isolation, guardian access scoping, student submission protection, message thread privacy, and notification recipient confinement.

---

## 8. Summary of Completion

Milestone 9 has been successfully designed, implemented, tested, and validated in accordance with all platform architectural guidelines. All deliverables are complete and production-ready.
