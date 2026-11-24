# AUVRYN — Single Institution Controlled Pilot Checklist

**Target Institution Type**: Primary School / Intermediate College  
**Pilot Environment**: Isolated Staging  
**Version**: v1.0.0-rc.1  
**Target Date**: Q4 2026  

---

## 1. Pre-Pilot Infrastructure Checklist (T-Minus 24 Hours)

- [ ] **Staging Database Ready**:
  - [ ] Dedicated PostgreSQL 17 / Supabase project created (`auvryn-staging`).
  - [ ] All 19 migrations applied in numerical sequence (`00000000000000` through `20261120000000`).
  - [ ] Zero unapplied migrations or schema drift.
  - [ ] Staging database seed applied (`scripts/seed-staging-pilot.sql`).
- [ ] **Web Deployment Operational**:
  - [ ] Vercel Preview deployment live with staging environment variables.
  - [ ] `/api/health` returns HTTP 200 `{"status":"healthy"}`.
  - [ ] Login screen (`/auth/login`) renders cleanly with institutional branding.
  - [ ] Multi-tenant isolation verified (institution selector operational).
- [ ] **Mobile APK Distributed**:
  - [ ] Pilot APK (`apps/mobile/builds/auvryn-preview-v1.0.0.apk`) shared with pilot faculty and parent representatives.
  - [ ] Android 10+ handsets configured with permission to install test APKs.
- [ ] **Pilot User Accounts Seeded & Verified**:
  - [ ] 1 Institution Owner account: `owner.school@auvryn.staging.internal`
  - [ ] 2 Teacher accounts: `teacher.primary@auvryn.staging.internal`, `teacher.math@auvryn.staging.internal`
  - [ ] 3 Student accounts: Grade 5, Grade 8, Grade 10 students.
  - [ ] 3 Parent/Guardian accounts: Linked via verified guardian relationships.
  - [ ] 1 HRIX Platform Administrator: Emergency support account.

---

## 2. Day 1: Institution Setup & Admission Onboarding

- [ ] **Step 1: Owner Institution Configuration**:
  - [ ] Log in as Institution Owner.
  - [ ] Confirm school name, board affiliation (e.g. CBSE/ICSE), address, and academic year (2026-2027).
  - [ ] Confirm grading scale (e.g. Letter grades, GPA, percentage).
- [ ] **Step 2: Student Registration & Admission**:
  - [ ] Navigate to `/dashboard/admissions/new`.
  - [ ] Complete Phase 1: Student Personal Information (Name, DOB, Gender, Address, Class).
  - [ ] Complete Phase 2: National Identity & Aadhaar (Verhoeff checksum validation, masked display `XXXX-XXXX-1234`).
  - [ ] Complete Phase 3: Parent & Guardian Details (Father, Mother, Legal Guardian, Emergency Contact, Consent).
  - [ ] Complete Phase 4: Identity Document Uploads (Birth Certificate, Aadhaar front/back, Transfer Certificate).
  - [ ] Submit registration.
  - [ ] Confirm new admission record appears in `/dashboard/admissions` with status `UNDER_REVIEW`.
  - [ ] As Owner, review and approve admission. Verify student record created in `students` table.

---

## 3. Day 2: Academic & Classroom Workflows

- [ ] **Step 3: Teacher Daily Attendance**:
  - [ ] Log in as Teacher.
  - [ ] Navigate to Class Attendance (`/dashboard/attendance` or mobile app).
  - [ ] Mark attendance for enrolled students (Present, Absent, Late, Excused).
  - [ ] Submit attendance record.
  - [ ] Confirm parent of absent student receives instant notification.
- [ ] **Step 4: Gradebook & Examination Entry**:
  - [ ] Navigate to Examination / Marks entry.
  - [ ] Enter Mid-Term exam marks for pilot class.
  - [ ] Validate bounds (0 to 100).
  - [ ] Publish results.
  - [ ] Verify GPA / percentage calculation is correct.

---

## 4. Day 3: Parent & Student Portal Interaction

- [ ] **Step 5: Parent Portal Access**:
  - [ ] Log in as Parent on web (`/portal/parent`) or mobile app.
  - [ ] Select linked child from ward switcher.
  - [ ] Verify child's profile shows masked Aadhaar (`XXXX-XXXX-1234`) and verified status.
  - [ ] Check real-time attendance percentage.
  - [ ] View published report card with grading breakdown.
  - [ ] View fee schedule and outstanding balance.
- [ ] **Step 6: Student Portal Access**:
  - [ ] Log in as Student (`/portal/student`).
  - [ ] Check daily timetable and upcoming assignments.
  - [ ] Access AI Study Tutor / revision suggestions.
  - [ ] Confirm student cannot edit attendance, grades, or personal identity fields.

---

## 5. Day 4: Communications & Mobile Push Notifications

- [ ] **Step 7: School-Wide Announcement**:
  - [ ] As Owner or Teacher, create an urgent announcement (e.g. "Annual Sports Day Schedule").
  - [ ] Target audience: All Parents of Grade 5.
  - [ ] Publish announcement.
- [ ] **Step 8: Push Delivery Verification**:
  - [ ] Confirm parent handset displays push notification banner within 5 seconds.
  - [ ] Tap notification on mobile device; confirm deep-link navigates directly to announcement detail screen.
  - [ ] Check notification inbox on web portal.

---

## 6. Pilot Sign-Off & Acceptance Criteria

| Criteria | Acceptance Threshold | Result |
| :--- | :--- | :--- |
| **System Uptime** | $\ge 99.5\%$ during 5-day pilot period | [ ] PASS |
| **Admission Workflow** | 100% of registrations completed without validation errors | [ ] PASS |
| **Data Isolation** | 0 cross-institution or unauthorized role access attempts | [ ] PASS |
| **Push Notification Latency** | $< 10$ seconds delivery to registered handsets | [ ] PASS |
| **User Feedback** | Owner, Teacher, and Parent satisfaction score $\ge 4.0 / 5.0$ | [ ] PASS |
