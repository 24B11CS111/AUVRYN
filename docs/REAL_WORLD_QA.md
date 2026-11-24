# AUVRYN — Real-World Quality Assurance & Pilot Scenario Matrix

**Date**: November 21, 2026  
**Auditor**: QA Lead & System Architect  
**Objective**: End-to-end multi-role, multi-tier QA test plan for staging execution.  

---

## 1. Test Institutions & User Profiles

For real-world staging validation, four distinct educational institutions with dedicated test users are configured:

```
+-----------------------------------------------------------------------------------------+
|                               AUVRYN STAGING INSTITUTIONS                               |
+----------------------+--------------------+---------------------------------------------+
| Institution Name     | Education Type     | Active Modules Tested                       |
+----------------------+--------------------+---------------------------------------------+
| Little Angels Bloom  | Preschool          | Daily care logs, naps, meals, temp checks   |
| St. Jude High School | Primary School     | CCE milestones, reading logs, stars         |
| Apex Junior College  | Intermediate       | Stream selector (MPC/BiPC), JEE/NEET percent|
| Horizon Global Univ. | University         | Degree credits, semester SGPA, CGPA         |
+----------------------+--------------------+---------------------------------------------+
```

### Staging User Persona Directory:
- **Institution Owner**: `owner.alpha@auvryn-staging.internal` (Role: `owner`)
- **Primary Faculty**: `teacher.bob@auvryn-staging.internal` (Role: `faculty`)
- **Student Charlie**: `student.charlie@auvryn-staging.internal` (Role: `student`)
- **Student Charlie2 (Peer)**: `student.peer@auvryn-staging.internal` (Role: `student`)
- **Verified Guardian Grace**: `parent.grace@auvryn-staging.internal` (Role: `guardian`, linked to Charlie)
- **Unrelated Guardian John**: `parent.unrelated@auvryn-staging.internal` (Role: `guardian`)
- **Platform Administrator**: `admin.hrix@auvryn-staging.internal` (Role: `platform_admin`)

---

## 2. Real-World Execution Scenarios

### Scenario 1: New Student Admission & Guardian Linking
- **Action**: Owner navigates to `/dashboard/admissions/new` and enters a new student application for Little Angels Bloom.
- **Data Input**: Legal name, DOB, voluntary Aadhaar with Verhoeff validation, primary guardian details, emergency contacts, medical consent.
- **Verification**:
  - Application saved with status `submitted`.
  - Raw Aadhaar number is never written; only masked `•••• •••• 1234` and SHA-256 hash are persisted.
  - Admissions officer clicks **Convert to Enrolled Student**.
  - `convert_application_to_student_v2` executes atomically, creates `students`, `guardians`, and links them via `student_guardians`.
  - Roll number and enrollment date assigned.

### Scenario 2: Roll Call & Real-Time Absence Alert
- **Action**: Teacher Bob logs into `/portal/teacher`, selects Class 5-A, and toggles Roll Call:
  - Student Charlie: **Absent**
  - Peer Student: **Present**
- **Trigger**: Bob submits attendance.
- **Verification**:
  - `student_attendance_records` records status `absent` for Charlie.
  - `processAttendanceAbsenceNotifications` executes automatically.
  - Guardian Grace receives push alert and in-app notification: *"Attendance Alert — AUVRYN: Charlie was marked Absent"*.
  - Unrelated Guardian John receives **zero** notifications.
  - Student Charlie can view his own absence; cannot view peer attendance.

### Scenario 3: Homework Lifecycle & Grading
- **Action**: Teacher Bob posts an assignment titled *"Mathematics — Linear Equations"*, due in 3 days.
- **Verification**:
  - Charlie receives in-app homework notification.
  - Grace receives guardian notification that homework was assigned.
  - Charlie navigates to `/portal/student`, uploads solution PDF, and clicks **Submit Coursework**.
  - Bob's dashboard shows 1 pending submission.
  - Bob reviews the PDF, assigns **18/20**, and provides feedback: *"Excellent reasoning, check problem 3 sign."*
  - Charlie and Grace receive instant notifications of published grade. Peer students cannot view Charlie's grade.

### Scenario 4: Examination Marks & Report Card Generation
- **Action**: Admin enters Semester 1 marks for Charlie (Math: 92, Science: 88, English: 95) and publishes the exam session.
- **Verification**:
  - GPA calculation triggers automatically.
  - Report card generated and linked in `student_documents`.
  - Guardian Grace navigates to `/portal/parent`, sees Charlie's updated academic card, and downloads the official PDF.
  - Unrelated Parent John attempting to access Charlie's report card via URL or direct storage ID is blocked by RLS (`403 Forbidden`).

### Scenario 5: Institutional Circular Broadcast
- **Action**: Owner drafts a circular titled *"Annual Sports Meet Schedule"* targeting `role = 'student'` and `role = 'guardian'`.
- **Verification**:
  - `fanoutAnnouncementNotifications` resolves all enrolled students and linked guardians in the institution.
  - Batch insert populates `notifications` table.
  - Notification drawer unread badge increments by 1 for Charlie and Grace.
  - Users from St. Jude High School receive **zero** notifications from Little Angels Bloom.

### Scenario 6: Real-Time Timetable Change
- **Action**: Admin changes Period 3 from Science to Library in Apex Junior College.
- **Verification**:
  - Realtime Supabase channel broadcasts update.
  - Teacher daily schedule in `/portal/teacher` updates without full page refresh.
  - Student timetable in `/portal/student` re-renders with the new room and subject.

---

## 3. QA Sign-Off Criteria

- [x] Zero cross-tenant data leakage across all 6 scenarios.
- [x] Zero unauthorized parent or peer access.
- [x] Zero raw Aadhaar exposure across UI, network payloads, and database tables.
- [x] All 5 role-based dashboards reflect live data without UI crashes or layout overflows.
