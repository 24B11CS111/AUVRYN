# AUVRYN — Institutional Administrator & School Operations Guide

**Platform:** AUVRYN — The Intelligent Education Ecosystem  
**Target Roles:** School Owners, Principals, Head of Admissions, Finance Directors, Academic Deans  
**Access Surface:** Web Administrative Dashboard (`/dashboard`)

---

## 1. System Administration & Institutional Setup

AUVRYN provides unified multi-campus administration while enforcing strict Row-Level Security isolation across educational institutions.

### 1.1 Managing Institutional Profile (`/dashboard/settings`)
- Configure legal entity name, institutional code, accreditation details, and official contact information.
- Configure institutional branding: upload school crest/logo, header banner, and primary/accent color palettes.

### 1.2 Multi-Campus Management (`/dashboard/campuses`)
- Configure physical campuses (e.g., Main Campus, Junior Wing, Sports Complex).
- Assign campus codes, physical addresses, and administrative contact personnel.
- All subsequent academic classes, fee structures, and rooms can be scoped to specific campuses.

---

## 2. Academic Hierarchy & Enrollment Architecture

Before admitting students or scheduling classes, configure the academic tree in order:

### 2.1 Academic Years & Terms (`/dashboard/academic-years`)
1. Create the active Academic Year (e.g., `2026-2027`).
2. Define Academic Terms (e.g., *Term 1 / Fall Semester*, *Term 2 / Spring Semester*).
3. Set start dates, end dates, and instructional day counts.

### 2.2 Academic Programs, Classes & Sections (`/dashboard/classes`)
1. Define **Academic Programs** (e.g., *CBSE Secondary School*, *Senior Secondary Science*, *Undergraduate Arts*).
2. Create **Classes / Grades** (e.g., *Grade 9*, *Grade 10*, *Grade 11*).
3. Create **Sections** (e.g., *Section A*, *Section B*) with maximum student seating capacities.

---

## 3. Staff & Faculty Onboarding (`/dashboard/staff`)

### 3.1 Inviting Faculty & Administrative Staff
1. Navigate to **Staff & Faculty** → Click **Invite Staff Member**.
2. Enter official email address, full name, employee ID, and designated department.
3. Select appropriate institutional roles:
   - `owner`: Full organizational control and institutional configuration.
   - `admin`: School operations, user management, and schedule approval.
   - `faculty`: Academic instruction, attendance submission, marks entry.
   - `accountant`: Master fee configuration, offline counter collections, refunds.
   - `admissions_officer`: Student applications and registration.
   - `driver`: Transport route operations and GPS broadcasting.

### 3.2 Department & Course Assignments
- Assign faculty members to academic departments (e.g., *Department of Physics*, *Department of Humanities*).
- Allocate courses to specific faculty members to enable timetable scheduling and attendance rosters.

---

## 4. Student Admissions & Guardian Linking (`/dashboard/students`)

### 4.1 Enrolling a Student
1. Navigate to **Students** → Click **New Student Registration**.
2. Enter demographic information, admission number, roll number, and assigned class/section.
3. Upload student identity and academic documents into secure storage buckets (`student-documents`).

### 4.2 Linking Guardians (`/dashboard/students/[id]/guardians`)
1. Open the student's profile and navigate to the **Guardians** tab.
2. Link the primary guardian (father, mother, legal guardian) by email or phone.
3. Verified guardians receive immediate portal and mobile app access to view only their ward's records.

---

## 5. Universal Fee Management & Financial Operations

AUVRYN includes an audit-grade financial management system with append-only ledger immutability:

### 5.1 Defining Fee Heads & Master Structures (`/dashboard/fees/structures`)
1. **Fee Heads:** Define revenue heads (e.g., *Tuition Fee*, *Science Lab Fee*, *Transport Fee*, *Annual Sports Fee*).
2. **Master Fee Structures:** Group heads into structured templates scoped by academic year, campus, and class.
3. **Installment Plans:** Configure installment schedules (e.g., Quarterly, Semi-Annual) with clear due dates and late payment grace days.

### 5.2 Offline Counter Fee Collection (`/dashboard/fees/collections`)
Cashier and finance staff collect payments at the school accounts counter:
1. Navigate to **Fee Collections** → Search for student by name or admission number.
2. The system loads active fee assignments, outstanding installment balances, and existing advance wallet credits.
3. Enter received amount and select payment method:
   - `cash`: Verified counter currency.
   - `cheque`: Enter Cheque number, issuing bank, and branch.
   - `dd`: Demand Draft reference number.
   - `bank_transfer`: NEFT / RTGS / IMPS transaction UTR.
4. Click **Record Payment**:
   - The atomic transaction updates outstanding fee balances.
   - Any overpayment surplus is deposited into the student's advance credit balance.
   - An immutable audit row is written to `financial_ledger_entries`.
   - Generates an official monotonically increasing receipt: `REC-2026-XXXXX`.

### 5.3 Fee Concessions & Refund Protocols (`/dashboard/fees/refunds`)
- **Immutability Principle:** Financial records cannot be edited or deleted. Erroneous transactions are resolved strictly via formal refund workflows.
- **Separation of Duties:** Requester cannot approve their own refund request. Approver verifies that refund amount does not exceed net received payments.
- Approved refunds write a compensating negative entry to the financial ledger with full audit metadata.

---

## 6. Timetable Engine & Collision Avoidance (`/dashboard/timetable`)

1. **Rooms & Capacity:** Configure classrooms, laboratories, and lecture halls with seat capacities.
2. **Period Matrices:** Define bell schedules (start time, end time, recess breaks).
3. **Collision Detection Engine:**
   - The scheduling validator automatically prevents double-booking faculty across concurrent periods.
   - Prevents classroom room collisions across conflicting classes.
   - Rejects overlapping periods for the same class and section.

---

## 7. Examination Results & Grading Schemes (`/dashboard/examinations`)

1. **Grading Schemes:** Configure grading rules (e.g., CBSE 9-point scale: A1 [91-100], A2 [81-90], etc.).
2. **Exam Creation:** Schedule internal assessments, mid-terms, and annual final exams.
3. **Marks Entry:** Teachers enter marks with boundary validation (0 <= marks <= maximum marks).
4. **Publishing Results:** Once finalized, publishing makes results visible on parent and student portals.

---

## 8. Fleet & Transport Management (`/dashboard/transport`)

1. **Vehicles & Drivers:** Register buses/vans, license plates, safety certifications, and assign dedicated drivers.
2. **Routes & Stops:** Define morning pickup and afternoon dropoff stops with expected arrival timestamps.
3. **Student Route Allocation:** Allocate students to specific bus routes and stops.
4. **Live Telemetry:** Monitor active journeys in real-time on the administrative transport map.

---

## 9. Notification Worker & Outbox Monitoring (`/dashboard/communications`)

- View queued, processing, and delivered notification jobs.
- Inspect delivery logs across channels (`in_app`, `push`, `email`, `sms`).
- Monitor dead-letter queue for notifications that exceeded retry attempts.
