# Education Management Platform — Final Acceptance Test Runbook

**Target Backend:** `https://dhgdjpjgsvbknquetecl.supabase.co` (Ref: `dhgdjpjgsvbknquetecl`)  
**Target Mobile App:** Android Preview APK (Expo / React Native / Hermes)  
**Target Web App:** Next.js 14 Web Portal  
**Scope:** Core Platform Milestones 1–11  
**Status:** READY FOR VERIFICATION & SYNTHETIC DATA EXECUTION

---

## Acceptance Test Protocol Matrix (Milestones 1–11)

| Milestone | Subsystem | Key Entities / Operations Tested | Verification Method | Status |
| :--- | :--- | :--- | :--- | :--- |
| **M1** | **Multi-Tenant Foundation & Auth** | Institution onboarding via `create_institution_with_owner`, user profile creation, role assignment (`admin`, `staff`), login session, active tenant isolation. | API / Web / Mobile | PENDING VERIFICATION |
| **M2** | **Academic Hierarchy** | Department creation, degree/program levels, academic years, terms, classes, sections, and subject mapping. | API / Web | PENDING VERIFICATION |
| **M3** | **Admissions & Student Lifecycle** | Online application submission, status transition (`submitted` -> `under_verification` -> `approved`), student record conversion via `convert_admission_to_student`, guardian linkage. | API / Web | PENDING VERIFICATION |
| **M4** | **Staff & Faculty Management** | Staff profile creation, department assignment, designation, role verification (`faculty`, `hr_administrator`, `department_head`). | API / Web | PENDING VERIFICATION |
| **M5** | **Attendance Tracking** | Daily student attendance capture, staff attendance logging, leave request submission, and approval flow. | Mobile / Web | PENDING VERIFICATION |
| **M6** | **Timetable & Scheduling** | Classroom/room allocation, periods definition, class timetable slot creation, faculty assignment conflict detection. | API / Web | PENDING VERIFICATION |
| **M7** | **Examinations & Grading** | Exam session creation, exam schedule, marks entry, grading scale calculation, result publication. | Web / API | PENDING VERIFICATION |
| **M8** | **Fees & Financial Management** | Fee head setup, fee structure creation, student fee assignment, receipt generation via `record_fee_payment_atomic`, online gateway order creation. | Web / API | PENDING VERIFICATION |
| **M9** | **Communications & Announcements** | Institutional announcement broadcasting, notification outbox queueing, student/parent message delivery. | Mobile / Web | PENDING VERIFICATION |
| **M10** | **Transport & GPS Tracking** | Bus route creation, stop definition, student passenger assignment, driver GPS location ingestion via `record_vehicle_gps_location_atomic`. | Mobile / Web | PENDING VERIFICATION |
| **M11** | **Library, Hostel & Events** | Library book cataloging, member book issue/return, hostel room allocation, institutional event calendar scheduling. | Web / Mobile | PENDING VERIFICATION |

---

## Automated Synthetic Verification Test Script

We have an integration test suite ready to execute synthetic data transactions against the verified production backend using `tests/integration/platform-core-workflows.test.ts` or standalone synthetic runner.

### Test Execution Steps (Post-Migration Confirmation)
1. User completes Steps 00–14 in the Supabase SQL Editor.
2. User runs `13_post_migration_verification.sql` and confirms 100% verification output.
3. User runs `14_sync_migration_history.sql`.
4. We launch the Android APK build via EAS (`npx eas build --profile preview --platform android`).
5. While the cloud build processes, we execute the automated integration test suite across Milestones 1–11 using synthetic test accounts.
6. Once the APK build finishes, we provide the direct download link and QR code.
