# AUVRYN — Institutional Administrator User Guide

**Target Role:** Institution Owner, School Principal, Vice Principal, Academic Administrator  
**Platform:** AUVRYN Web Application  

---

## 1. Getting Started & Dashboard Overview

Upon logging in with an administrator account (`/auth/login`), you are presented with the **Executive Dashboard**:
- **Campus Metrics:** Total active students, faculty count, today's attendance percentage, and pending admissions.
- **Top Navigation:** Institutional Switcher (for multi-campus administrators), Profile Settings, and Realtime Notification Tray.
- **Sidebar Navigation:** Access to all core modules: Academics, Admissions, Staff, Attendance, Timetable, Examinations, Fees, Transport, Library, Hostel, Events, and AI Intelligence.

---

## 2. Academic Calendar & Term Configuration

1. Navigate to **Academics → Academic Years** (`/dashboard/academics/years`).
2. Click **Create Academic Year**. Set the start date, end date, and mark it as **Active**.
3. Create associated **Terms** (e.g. `Term 1`, `Term 2`).

---

## 3. Academic Structure Setup

1. **Departments:** Navigate to **Academics → Departments** (`/dashboard/academics/departments`). Add departments such as Science, Mathematics, Humanities, etc.
2. **Programs:** Add programs (e.g. `Primary School`, `Secondary School`, `Senior Secondary`).
3. **Classes & Sections:** Create grade levels (e.g. `Grade 10`) and assign sections (`Section A`, `Section B`).
4. **Subjects:** Define subjects with course codes and credit weights (`/dashboard/academics/subjects`).

---

## 4. Student Admissions & Enrollment

1. **New Admission:** Navigate to **Admissions → New Application** (`/dashboard/admissions/new`).
2. Fill student demographic details, previous school history, and medical flags.
3. Link guardians (Mother, Father, Guardian) with valid email and mobile numbers.
4. **Conversion to Active Student:** Once documents are verified, click **Approve & Convert to Student**. The student receives an admission number and enrollment record.

---

## 5. Staff & Faculty Management

1. Navigate to **Staff → Invite Staff** (`/dashboard/staff/invitations`).
2. Enter staff email, full name, assigned department, and role (`faculty`, `department_head`, `staff`).
3. The staff member receives an invitation link to create their credentials.
4. Allocate classes and subjects under **Staff Profile → Assignments**.

---

## 6. Fee Structures & Collections

1. **Define Fee Heads:** (`/dashboard/fees/heads`) e.g. `Tuition Fee`, `Lab Fee`, `Annual Development Fee`.
2. **Create Fee Structures:** (`/dashboard/fees/structures/new`) Combine heads into a class-level fee schedule with due dates.
3. **Assign Fees:** Assign fee structures to entire sections or individual students.
4. **Record Counter Payments:** When a parent pays at the fee counter (`/dashboard/fees/collections/new`), select student, enter payment method (`cash`, `cheque`, `bank_transfer`), and amount. An official receipt number is automatically issued.

---

## 7. Attendance Oversight & Corrections

1. **Daily Overview:** View live attendance statistics across all classes (`/dashboard/attendance/reports`).
2. **Attendance Corrections:** If an error occurs, an administrator can review the record, change status (`Absent` to `Present`), and enter a mandatory reason. An unalterable audit log is preserved in `attendance_corrections`.

---

## 8. AI Institutional Intelligence

1. Access **AI Intelligence** (`/dashboard/ai-intelligence`).
2. View predictive retention metrics, attendance trends, and automated academic summaries.
3. Review and approve AI-generated draft announcements before public broadcast (`/dashboard/ai-drafts`).
