# AUVRYN — Institutional Pilot Launch & Evaluation Guide

**Audience:** School Principals, College Deans, IT Directors, Academic Coordinators  
**Platform:** AUVRYN — The Intelligent Education Ecosystem  
**Version:** 1.0.0 Release Candidate  
**Pilot Standard:** Controlled School Pilot with Synthetic Demonstration Data  

---

## 1. Welcome to the AUVRYN Pilot

AUVRYN is a unified, intelligent education management platform architected for modern K-12 schools, junior colleges, degree colleges, and multi-campus universities.

This pilot program provides your institution with full access to AUVRYN's core operational capabilities:
- **Academic Administration:** Departments, programs, classes, sections, and subject allocations.
- **Student Admissions & Profiles:** Complete enrollment, academic history, guardian linking, and document management.
- **Real-Time Attendance & Automated Absence Alerts:** Instant attendance marking by faculty, immediate push/in-app notifications to guardians upon student absence, and auditable correction workflows.
- **Timetable & Scheduling:** Interactive period scheduling, teacher workloads, and substitution tracking.
- **Examinations & Report Cards:** Grading scales, marks entry, and published report cards for parents.
- **Fee Management:** Flexible fee structures, offline counter payments with auto-sequenced receipts, and ledger tracking.
- **Dedicated Portals & Mobile App:** Web portals for parents and students, plus an Android mobile app for on-the-go access.
- **AI-Powered Learning & Productivity Companions:** Student AI Tutor, Teacher Assistant, Parent Companion, and Owner Analytics.

---

## 2. Synthetic Demonstration Institution Specification

To guarantee data safety and prevent contaminating real institutional records during the dry run, the pilot starts with a **clean synthetic demonstration institution**:

| Attribute | Synthetic Pilot Value |
| :--- | :--- |
| **Institution Name** | **Auvryn Academy of Science & Arts** |
| **Institution Type** | Senior Secondary School / Junior College |
| **Academic Year** | 2026–2027 (Active) |
| **Academic Terms** | Term 1 (June 2026 – October 2026), Term 2 (November 2026 – April 2027) |
| **Campus** | Main City Campus |
| **Demonstration Classes** | Grade 10 (Section 10-A, Section 10-B) |
| **Demonstration Course/Subjects** | Physics, Mathematics, English Literature, Computer Science |

### Synthetic User Roster & Role Credentials (EXAMPLE TEMPLATES — NOT CREATED IN PRODUCTION)

> [!IMPORTANT]
> The accounts listed below are **synthetic test templates and are NOT created in Supabase Auth or production**. 
> - **Production State:** Zero test accounts or synthetic data exist in production (`dhgdjpjgsvbknquetecl`).
> - **Local / Staging Setup:** To provision these demonstration accounts in an isolated local test environment, run `psql -f scripts/seed-staging-pilot.sql`. 
> - **Safety Rule:** Never execute seed scripts against the production database.

| Persona / Role | Full Name | Synthetic Email (Example Template) | Operational Permissions | Provisioning Status |
| :--- | :--- | :--- | :--- | :---: |
| **Owner** | Dr. Vikram Rathore | `owner@auvryn-academy.demo` | Full institutional authority, campus & fee settings, tier management | **Template (Not Created)** |
| **Administrator** | Anita Desai | `admin@auvryn-academy.demo` | Academic hierarchy, classes, sections, staff invites, timetable coordinator | **Template (Not Created)** |
| **Teacher / Faculty** | Rajesh Sharma | `teacher.sharma@auvryn-academy.demo` | Class 10-A homeroom teacher, physics faculty, daily attendance marking | **Template (Not Created)** |
| **Student** | Aarav Mehta | `student.aarav@auvryn-academy.demo` | Grade 10-A student, student portal & AI tutor access | **Template (Not Created)** |
| **Parent / Guardian** | Rajesh Mehta | `parent.rajesh@auvryn-academy.demo` | Verified father/guardian of Aarav Mehta, parent portal & push alerts | **Template (Not Created)** |
| **Accountant / Cashier** | Sunita Patel | `accounts@auvryn-academy.demo` | Fee structures, offline fee collections, counter receipts, refunds | **Template (Not Created)** |
| **Transport Driver** | Gurdeep Singh | `driver.singh@auvryn-academy.demo` | Assigned driver for Bus #12 (Route 3: North Loop), GPS telemetry broadcasting | **Template (Not Created)** |

---

## 3. Complete 10-Step Pilot Operational Test Sequence

The following step-by-step sequence verifies all critical workflows before student and parent access is expanded:

### Step 1: Owner Login & Institutional Configuration
1. Navigate to `/auth/login` on the web application.
2. Sign in as `owner@auvryn-academy.demo`.
3. Verify the active institution displays **"Auvryn Academy of Science & Arts"**.
4. Navigate to `/dashboard/academics/years` and confirm **Academic Year 2026–2027** is marked Active with Term 1 and Term 2.
5. Review Institutional Settings (`/dashboard/settings`) and verify campus information.

### Step 2: Administrator Onboarding & Roster Setup
1. Sign in as `admin@auvryn-academy.demo`.
2. Navigate to `/dashboard/academics/classes` and verify Grade 10 (Sections 10-A and 10-B).
3. Check `/dashboard/academics/subjects` to confirm Physics, Mathematics, and English are allocated to Grade 10-A.
4. Verify staff allocations under `/dashboard/staff` showing Teacher Sharma assigned to Grade 10-A.
5. Verify student registry under `/dashboard/students` confirming Aarav Mehta is active in Grade 10-A with guardian Rajesh Mehta linked.

### Step 3: Teacher Login & Morning Attendance Marking
1. Teacher signs in as `teacher.sharma@auvryn-academy.demo` via web (`/dashboard/attendance`) or mobile app.
2. Open the active session for **Grade 10-A (Morning Session)**.
3. Mark peer students as `Present`.
4. Mark **Aarav Mehta** as `Absent` with remarks: *"Unexcused morning absence"*.
5. Click **Submit Attendance Batch**. Confirm the modal indicates records saved atomically.

### Step 4: Absence Notification Dispatch & Outbox Verification
*(Note: Physical notification tray display on real Android devices is strictly NOT VERIFIED until physically received on test hardware during this step)*
1. The database atomic trigger detects Aarav's absence and resolves guardian Rajesh Mehta.
2. An absence notification row is created in `notifications` and queued into `notification_deliveries` with a unique idempotency key.
3. The background worker (`/api/cron/notifications`) claims the delivery job using `FOR UPDATE SKIP LOCKED`.
4. The worker dispatches the alert to the Expo Push Gateway.
5. In-app notification immediately populates in the guardian's notification tray.

### Step 5: Parent Login & Child Record Review
1. Parent signs in as `parent.rajesh@auvryn-academy.demo` on web (`/portal/parent`) or on the physical Android test device.
2. The dashboard displays an immediate alert: *"Attendance Alert — Aarav was marked absent today"*.
3. Parent inspects Aarav's monthly attendance percentage and daily calendar breakdown.
4. Parent verifies that peer student records from other families are completely hidden (strict RLS isolation).

### Step 6: Student Login & Timetable Verification
1. Student signs in as `student.aarav@auvryn-academy.demo` on web (`/portal/student`) or mobile app.
2. Navigate to **My Timetable**.
3. Verify weekly slot matrix showing Monday Period 1 (Physics, Room 204), Period 2 (Mathematics, Room 204), etc.
4. Verify that student cannot view or edit financial ledger entries, faculty notes, or peer records.

### Step 7: Fee Creation & Verified Counter Payment
1. Accountant signs in as `accounts@auvryn-academy.demo`.
2. Navigate to `/dashboard/fees/structures` and verify **Grade 10 Term 1 Tuition Fee** (₹25,000).
3. Open Aarav Mehta's fee assignment (`/dashboard/fees/assignments`).
4. Record offline fee collection (`/dashboard/fees/collections/new`):
   - Amount received: ₹15,000
   - Method: `bank_transfer`
   - Transaction Reference: `NEFT-SBI-20261115-001`
5. Click **Record Payment**. Confirm receipt number generated (e.g. `REC-2026-0001`).
6. Confirm immutable entry appended to `financial_ledger_entries`. Outstanding balance correctly shows ₹10,000.
7. Verify negative security check: attempting to verify payment as a student or with an invalid transaction ID is rejected.

### Step 8: Examination & Results Publishing
1. Administrator navigates to `/dashboard/examinations`.
2. View **Term 1 Mid-Term Examination**.
3. Enter marks for Aarav Mehta in Physics (88/100) and Mathematics (92/100).
4. Publish results.
5. Both Aarav (in student portal) and Rajesh (in parent portal) can now view and download the verified report card with grading band `A1`.

### Step 9: Transport & GPS Live Tracking
1. Driver Gurdeep Singh signs in as `driver.singh@auvryn-academy.demo` on the mobile app.
2. Navigate to **Driver Transport Hub**. Select **Route 3: North Loop (Morning)**.
3. Click **Start Journey**. The vehicle status switches to active, and GPS broadcasting begins.
4. Parent Rajesh Mehta opens `/dashboard/transport/tracking` or the mobile app tracking screen and views Bus #12 moving along Route 3 in real time.
5. Driver clicks **End Journey**. GPS broadcasting terminates immediately to safeguard driver privacy.

### Step 10: Android Logout & Account Switching
1. On the Android mobile device, open user profile settings.
2. Click **Sign Out**. The session is securely flushed from AsyncStorage and device memory.
3. Verify redirect to the `LoginScreen`.
4. Sign in as Dr. Vikram Rathore (`owner@auvryn-academy.demo`).
5. Confirm owner dashboard loads cleanly with executive stats and institutional switcher.
6. Confirm push device token is re-registered cleanly under the new active user.

---

## 4. Support & Feedback Escalation

During the pilot, the AUVRYN engineering lead is available for direct coordination:
- **Priority Pilot Support Desk:** support@auvryn.com
- **Emergency Escalation:** In-app Help & Support
- **Issue Tracking:** Submit feedback and bug reports using [PILOT_TESTING_CHECKLIST.md](file:///c:/Users/hrixo/OneDrive/Desktop/School/docs/PILOT_TESTING_CHECKLIST.md).
