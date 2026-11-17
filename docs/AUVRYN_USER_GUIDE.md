# AUVRYN — End User Operations & Portal Guide

**Platform:** AUVRYN — The Intelligent Education Ecosystem  
**Target Roles:** Students, Parents / Guardians, Teachers, Bus Drivers  
**Access:** Web Portal (`/portal/student`, `/portal/parent`, `/dashboard`) & Android Mobile App

---

## 1. Demo Credentials & Institutional Persona

For testing and demonstration, use the synthetic demo institution **Auvryn Academy of Science & Arts**:

| User Persona | Role | Email Address | Access Surface | Primary Responsibilities |
| :--- | :--- | :--- | :--- | :--- |
| **Rajesh Mehta** | Parent / Guardian | `parent.rajesh@auvryn-academy.demo` | Web Portal / Mobile App | View children, attendance alerts, fee receipts, report cards, live bus tracking |
| **Aarav Mehta** | Student | `student.aarav@auvryn-academy.demo` | Web Portal / Mobile App | View schedule, attendance record, examination grades, AI Tutor |
| **Vikram Sharma** | Teacher / Faculty | `teacher.sharma@auvryn-academy.demo` | Web Dashboard | Mark session attendance, submit absence remarks, view timetable |
| **Gurpreet Singh**| Bus Driver | `driver.singh@auvryn-academy.demo` | Mobile App | Start active journey, broadcast GPS telemetry, complete route |

---

## 2. Student Portal Guide (`/portal/student` & Mobile)

The Student Portal gives learners direct access to their academic schedules, attendance performance, and interactive learning tools:

### 2.1 My Academic Dashboard
- Displays student enrollment number, academic program, current grade, and section.
- **Attendance Gauge:** Real-time percentage calculation of present days vs total academic sessions.
- **Recent Activity:** Quick alerts for newly published examination marks, report cards, and schedule changes.

### 2.2 Weekly Timetable View
- Accessible via **My Timetable** navigation tab.
- Displays weekly class schedule grid (Monday through Friday).
- Shows period timing, subject code, room location, and assigned faculty name.
- Protected by conflict-avoidance rules: students only see periods assigned to their specific class and section.

### 2.3 Attendance Breakdown
- Daily calendar view indicating `Present` (green), `Absent` (red), `Late` (amber), or `Excused` (blue).
- Monthly attendance breakdown with percentage tracking against institutional minimum attendance thresholds (e.g. 75%).
- Read-only access: students cannot modify attendance or insert attendance corrections.

### 2.4 Examinations & Digital Report Cards
- View upcoming examination schedules and venue allocations.
- Review published exam results across subjects with marks, percentage, and assigned grading bands (e.g., `A1`, `B2`).
- Download PDF report cards stamped with institutional grading scale definitions.

### 2.5 AUVRYN AI Student Tutor
- Interactive AI study companion accessible directly from the student dashboard.
- Features: Concept explanations, practice quizzes, and homework hints.
- Guardrails: Strictly scoped to academic subjects; does not reveal administrative records or financial ledger data.

---

## 3. Parent / Guardian Portal Guide (`/portal/parent` & Mobile)

The Parent Portal provides guardians with transparency into their children's daily academic journey:

### 3.1 Ward Selector & Family Overview
- If a parent has multiple children enrolled in the institution, the header includes a **Ward Selector** dropdown to switch between children seamlessly.
- Multi-tenant Row-Level Security guarantees guardians can only view their own verified children (`student_guardians` relationship).

### 3.2 Real-Time Absence Notifications
- When a teacher marks a student absent during morning or afternoon attendance, the system queues an immediate absence alert.
- **Notification Tray:** The parent receives an alert: *"Attendance Alert — Your ward was marked absent today. Please contact the institution if you need clarification."*
- **Attendance Calendar:** Highlights the unexcused absence with remarks submitted by faculty.

### 3.3 Fee Statements & Digital Receipts
- View fee assignments categorized by fee head (Tuition, Laboratory, Transport, Library).
- View installment due dates, paid balances, and remaining dues.
- **Payment History:** Download official payment receipts (`REC-2026-XXXXX`) detailing payment method, date, transaction reference, and cashier audit stamp.
- **Student Advance Wallet:** View credit surplus balances from overpayments retained in the student's advance account.

### 3.4 Live School Bus GPS Tracking
- Accessible under **Transport Tracking** tab.
- If the student is assigned to an active transport route, the parent sees:
  - Assigned bus number and driver contact name.
  - Designated morning pickup and afternoon dropoff stops.
  - **Live Interactive Map:** Real-time vehicle location updates during active journeys.
  - Notification when the bus departs the campus or approaches the designated stop.

### 3.5 Parent AI Companion
- Context-aware AI assistant helping parents track their child's academic development.
- Answers questions regarding school events, attendance trends, and upcoming exam schedules.

---

## 4. Teacher & Faculty Portal Guide (`/dashboard`)

Faculty members manage academic classroom operations and daily attendance tracking:

### 4.1 Taking Session Attendance (`/dashboard/attendance`)
1. Navigate to **Attendance** in the main sidebar.
2. Select the **Class & Section** (e.g., Grade 10-A) and **Session** (Morning / Afternoon).
3. The student roster loads automatically with default status set to `Present`.
4. To mark a student absent:
   - Click the status toggle next to the student's name to change status to `Absent`.
   - Optionally enter remarks (e.g., *"Unexcused morning absence"* or *"Sick leave requested"*).
5. Click **Submit Attendance Batch**:
   - The stored procedure records the attendance batch atomically.
   - The database automatically queues outbox notifications for all absent students without teacher manual intervention.
   - Aggregate counts (Present, Absent, Late, Excused) update dynamically.

### 4.2 Attendance Corrections
- If a student was marked absent erroneously, navigate to **Attendance Corrections**.
- Select the student record, choose the corrected status (e.g., `Present`), and enter the mandatory justification reason.
- Submitting the correction logs an audited entry in `attendance_corrections` with the teacher's user ID and timestamp.

### 4.3 Faculty Timetable & Schedule
- View assigned teaching periods across rooms and sections.
- Highlights substitution assignments and schedule changes in real-time.

---

## 5. Bus Driver Operations Guide (Mobile App)

Bus drivers use the AUVRYN mobile app to broadcast GPS telemetry during student transit:

### 5.1 Starting an Active Journey
1. Open the AUVRYN Mobile App and sign in with assigned driver credentials.
2. Select the assigned vehicle (e.g., Bus #12) and transport route (e.g., North Campus Route #4).
3. Tap **Start Journey**:
   - The mobile client requests background location permissions.
   - The system transitions journey status to `in_progress`.

### 5.2 Live GPS Broadcasting
- While the vehicle is in motion, the app broadcasts high-frequency GPS coordinates (latitude, longitude, speed, heading) via background foreground service.
- Only assigned drivers with an active journey can broadcast coordinates (enforced by RLS and database trigger policies).

### 5.3 Completing the Journey
- Upon reaching the final destination (school campus or route terminus), tap **End Journey**.
- The app terminates background tracking and updates journey status to `completed`.
- Tracking map transitions to inactive state for parents.
