# AUVRYN — Pilot Testing Checklist & Verification Scenarios

**Testing Level:** Real-World Institutional Acceptance & Pilot Scenarios  
**Scope:** Web Application · Mobile Android Application · Database RLS · Notification Outbox  

---

## 1. Authentication & Multi-Tenancy Scenarios

| Test ID | Test Scenario | Steps | Expected Outcome | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **AUTH-01** | Standard Email/Password Login | Navigate to `/auth/login`, enter valid institutional credentials. | Successful redirect to role dashboard; JWT session stored. | [ ] PASS |
| **AUTH-02** | Invalid Credentials | Attempt login with incorrect password. | Error message displayed; no session issued; no data access. | [ ] PASS |
| **AUTH-03** | Multi-Institution Switcher | User with multiple memberships clicks `InstitutionSwitcher`. | Current active institution context changes immediately; RLS filters refresh. | [ ] PASS |
| **AUTH-04** | Cross-Tenant Isolation | Attempt to access URL `/dashboard/students/[id]` of another school. | Request denied (HTTP 404 / 403); zero foreign data displayed. | [ ] PASS |
| **AUTH-05** | Suspended User Access | Mark a membership `status = 'suspended'`. | User immediately blocked from accessing institutional records. | [ ] PASS |

---

## 2. Attendance & Automatic Absence Notification Scenarios

| Test ID | Test Scenario | Steps | Expected Outcome | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **ATT-01** | Daily Attendance Batch Marking | Teacher opens session, marks 25 students Present, 2 Absent, submits batch. | All 27 records saved atomically in `student_attendance_records`. | [ ] PASS |
| **ATT-02** | Automatic Absence Outbox Queue | Submit batch containing 2 absent students with linked guardians. | 2 absence notifications inserted into `notifications` and `notification_deliveries`. | [ ] PASS |
| **ATT-03** | Muted Guardian Preferences | Guardian mutes category `attendance`. Mark student absent. | No delivery job queued for muted guardian. | [ ] PASS |
| **ATT-04** | Idempotent Submission | Resubmit same session batch without changes. | Duplicate absence jobs skipped; no repeat push notifications sent. | [ ] PASS |
| **ATT-05** | Authorized Attendance Correction | Admin corrects student from `Absent` to `Present` with reason note. | Record updated; immutable entry written to `attendance_corrections`. | [ ] PASS |
| **ATT-06** | Student Impersonation Prevention | Direct authenticated RPC call passes someone else's `p_user_id`. | Throws exception `42501` (caller identity mismatch). | [ ] PASS |

---

## 3. Fees, Payments & Financial Integrity Scenarios

| Test ID | Test Scenario | Steps | Expected Outcome | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **FEE-01** | Student Fee Assignment | Assign tuition fee structure to class of 30 students. | 30 assignments created with correct component breakdown and installment due dates. | [ ] PASS |
| **FEE-02** | Offline Counter Payment | Cashier collects cash payment and submits `/dashboard/fees/collections/new`. | Payment recorded atomically, receipt number generated, balance reduced, ledger entry posted. | [ ] PASS |
| **FEE-03** | Student Balance Overpayment | Submit payment greater than remaining assignment balance. | Assignment marked `paid`; surplus credited to student advance wallet. | [ ] PASS |
| **FEE-04** | Student Payment Immutability | Student logs into portal and attempts to edit or delete payment records. | RLS policy blocks UPDATE/DELETE (HTTP 403 / 0 rows affected). | [ ] PASS |
| **FEE-05** | Verified Fee Refund | Admin processes partial fee refund with approval reason. | Refund record created, ledger entry updated, student assignment balance adjusted. | [ ] PASS |

---

## 4. Timetable & Room Scheduling Scenarios

| Test ID | Test Scenario | Steps | Expected Outcome | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **TIME-01** | Conflict Detection (Double-booking) | Assign teacher to Class 9-A Period 2 and attempt same teacher to 10-B Period 2. | Conflict detection flags teacher overlap; prevents conflicting assignment. | [ ] PASS |
| **TIME-02** | Room Collision Detection | Allocate Room 101 to two different classes for the same period. | System identifies room conflict and warns coordinator. | [ ] PASS |
| **TIME-03** | Parent / Student Schedule View | Parent opens portal timetable view. | Ward's active weekly class schedule displayed with teacher and room names. | [ ] PASS |

---

## 5. Transport & Live Tracking Scenarios

| Test ID | Test Scenario | Steps | Expected Outcome | Verification Status |
| :---: | :--- | :--- | :--- | :---: |
| **TRN-01** | Driver Journey Activation | Authorized driver clicks "Start Journey" on Android mobile app. | Journey status becomes `in_progress`; GPS broadcasting enabled. | [ ] PASS |
| **TRN-02** | Unauthorized GPS Broadcast | Non-driver or student calls `broadcastDriverLocationPoint`. | Server throws authorization error; GPS update rejected. | [ ] PASS |
| **TRN-03** | Real-Time Parent Tracking | Parent opens live tracking client during active bus journey. | Realtime map receives telemetry updates with low latency. | [ ] PASS |
| **TRN-04** | Journey Completion & Privacy | Driver clicks "End Journey". | Journey status becomes `completed`; background GPS sharing stops immediately. | [ ] PASS |

---

## 6. Mobile Application (Android) Scenarios

| Test ID | Test Scenario | Steps | Expected Outcome | Verification Status |
| :---: | :--- | :--- | :--- | :--- |
| **MOB-01** | App Cold Launch | Open Auvryn APK from app launcher. | Animated `BrandIntro` sequence displays cleanly, followed by login screen. | [ ] PASS |
| **MOB-02** | Session Persistence | Log in, close app completely, reopen app. | Automatically resumes into `DashboardScreen` without re-prompting login. | [ ] PASS |
| **MOB-03** | Push Token Registration | Grant notification permission on Android device. | Token uploaded to `push_device_tokens` with active status. | [ ] PASS |
| **MOB-04** | AI Companion Interaction | Student opens "Student AI Tutor" and asks homework question. | Guided response streamed with citations; no unauthorized record modification. | [ ] PASS |
| **MOB-05** | Network Disconnect & Reconnect | Disconnect Wi-Fi/cellular while viewing dashboard, then reconnect. | `RealtimeStatusIndicator` changes from Connected to Disconnected and auto-recovers. | [ ] PASS |
