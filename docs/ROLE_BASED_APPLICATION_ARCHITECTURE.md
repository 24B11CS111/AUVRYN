# AUVRYN — Complete Role-Based Application Architecture

## 1. Executive Architectural Overview

**AUVRYN — The Intelligent Education Ecosystem** is an enterprise-grade multi-tenant educational management platform designed to deliver distinct, role-tailored workflows and dynamic education-adaptive interfaces across web (`apps/web` Next.js 14 App Router) and mobile (`apps/mobile` React Native Expo SDK 52) clients.

The system is engineered around a unified principle:
> **"Every stakeholder should know what is happening, what requires their attention, and what has changed."**

---

## 2. Five User Roles & Dedicated Portals

```
+----------------------------------------------------------------------------------------------------+
|                                    AUVRYN MULTI-ROLE ROUTING ENGINE                                |
+----------------------------------------------------------------------------------------------------+
                                                  |
                         [Supabase Auth & Session Verification]
                                                  |
              +-----------------------------------+-----------------------------------+
              |                                                                       |
       [Platform Admin]                                                   [Institution Member]
              |                                                                       |
     /hrix-admin Console                                                  [Resolve Active Role]
                                                                                      |
                         +--------------------+-------------------+-------------------+
                         |                    |                   |                   |
                     [Owner/Admin]         [Faculty]          [Student]            [Parent]
                         |                    |                   |                   |
                     /dashboard         /portal/teacher    /portal/student     /portal/parent
```

### A. Institution Owner / Administrator (`/dashboard`)
- **Scope**: Institutional oversight, fiscal management, faculty allocations, student admissions, attendance dashboards, transport fleets, library, hostel, and institutional communications.
- **Access Guard**: `requireInstitution()` with membership role validation (`owner`, `admin`, `academic_admin`).
- **Web Navigation**: Dynamic sidebar navigation with live badge counts and status indicators.
- **Mobile Experience**: `OwnerMobileNavigator.tsx` featuring campus overview metrics, fee recovery summaries, active bus fleets, and instantaneous circular broadcast composer.

### B. Teacher / Faculty (`/portal/teacher`)
- **Scope**: Section allocations, daily attendance roll call, coursework creation, homework grading & individualized feedback, class timetable, and class-level circular announcements.
- **Access Guard**: `requirePortalRole(['faculty', 'teacher'])` with staff profile verification and strict allocation checks (`academic_faculty_allocations`).
- **Web Navigation**: `PortalTopNav.tsx` with education tier indicators, section allocation selector, and quick roll call widgets.
- **Mobile Experience**: `TeacherMobileNavigator.tsx` featuring 5-tab interface (Home, Roll Call, Coursework, Roster, Notifications, Profile) with batch attendance toggles (Present/Absent/Late).

### C. Student (`/portal/student`)
- **Scope**: Class timetable, course progress, assignments due, homework submission engine, examination marks & report cards, attendance records, and personal academic AI tutor.
- **Access Guard**: `requirePortalRole(['student'])` with student enrollment resolution.
- **Web Navigation**: `PortalTopNav.tsx` with adaptive tier trackers (e.g. Intermediate Stream Tracker, University Credit Registry).
- **Mobile Experience**: `StudentMobileNavigator.tsx` featuring 6-tab interface (Home, Classes, Tasks, Marks, Alerts, Profile) with quick coursework submission.

### D. Parent / Guardian (`/portal/parent`)
- **Scope**: Multi-child switcher, real-time attendance alerts, fee invoice payments, examination report cards, bus tracking, preschool daily care logs, and parenting AI companion.
- **Access Guard**: `requirePortalRole(['parent', 'guardian'])` with multi-child family link resolution (`student_guardians`).
- **Web Navigation**: `PortalTopNav.tsx` with child switcher tabs, notification tray, and preschool care digests.
- **Mobile Experience**: `ParentMobileNavigator.tsx` featuring 5-tab interface (Home, Results, Attendance, Alerts, Profile) with child selection pills and instant teacher communication channels.

### E. HRIX Platform Administrator (`/hrix-admin`)
- **Scope**: Cross-tenant directory, institution provisioning, education type configuration, subscription governance, platform-wide audit trails, and security monitoring.
- **Access Guard**: `requirePlatformAdmin()` verifying user metadata `is_platform_admin === true` or membership in platform operator institution.

---

## 3. Four Dynamic Education Tiers

AUVRYN automatically adapts dashboard terminology, metric cards, and specialized operational widgets based on the institution's configured `education_type`:

| Dimension | Preschool (`preschool`) | Primary School (`primary_school`) | Intermediate (`intermediate`) | University (`university`) |
| :--- | :--- | :--- | :--- | :--- |
| **Academic Grouping** | Care Group / Toddler / KG | Grades 1 to 5 | Years 11 & 12 (Junior College) | Semesters & Degree Programs |
| **Learner Reference** | Child / Toddler | Student / Pupil | Scholar / Student | Undergrad / Graduate Candidate |
| **Educator Reference** | Lead Caregiver / Early Educator | Class Teacher | Subject Lecturer / Faculty | Professor / Department Chair |
| **Specialized Web Widget** | `PreschoolDailyCareWidget` (Nap, Meals, Temp, Mood) | Foundational Progress & Reading Badges | `IntermediateStreamTracker` (MPC/BiPC/MEC/CEC + Mock Percentiles) | `UniversityCreditRegistry` (Credits Earned/Required, CGPA/SGPA) |
| **Specialized Mobile Card** | Daily Wellness & Meal Digest | Subject Progress & Gold Stars | Competitive Exam Prep Cards (JEE/NEET/CA) | Credit Progression & Transcript Status |

---

## 4. Multi-Tenant Navigation & Header (`PortalTopNav.tsx`)

Every stakeholder portal shares a standardized, hardened top navigation bar:
- **Brand Identity**: Institution name and official logo with education level badge.
- **Audited Preview Status**: Explicit visual banner when an administrator is securely previewing a portal role.
- **Real-Time Pulse**: Visual connection state pill (`connected`, `reconnecting`, `disconnected`) driven by Supabase Realtime WebSocket channels.
- **Notification Drawer**: Unread badge count, category filtering (`homework`, `attendance`, `examinations`, `announcements`), "Mark as Read", and "Mark All as Read".
- **Institution Switcher & Account Controls**: Multi-campus navigation and cryptographic session termination.

---

## 5. Mobile Architecture (`apps/mobile`)

The mobile application delegates to dedicated, isolated navigator components based on the authenticated user's active role:
1. `ParentMobileNavigator.tsx`: Focused on family updates, child selection, absence alerts, and fee payments.
2. `StudentMobileNavigator.tsx`: Focused on class schedules, pending coursework submission, and exam scores.
3. `TeacherMobileNavigator.tsx`: Focused on rapid roll call, section allocations, and coursework management.
4. `OwnerMobileNavigator.tsx`: Focused on campus vitals, collection statistics, and broadcasting announcements.
5. `DriverMobileNavigator` (in `DashboardScreen.tsx`): Retains native hardware GPS tracking for school bus telematics.

All mobile screens utilize Hermes bytecode compilation (`_expo/static/js/android/*.hbc`) with verified typecheck exit code 0.
