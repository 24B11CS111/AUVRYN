# AUVRYN — Go-Live & Pilot Launch Checklist

**Target Date:** ________________________  
**Institution Name:** ________________________  
**Sign-off Authorities:** Institutional Lead & AUVRYN CTO  
**Evaluation Standard:** Independent Release Acceptance Verification  

---

## 1. Technical & Database Readiness

- [ ] Supabase production database (`dhgdjpjgsvbknquetecl`) online and reachable.
- [ ] Read-only preflight verification script executed in Supabase Dashboard SQL Editor:
  ```bash
  supabase/verification/preflight_attendance_notifications.sql
  ```
  Expected Output: `DATABASE PREFLIGHT PASS` (All 10 checks verified, both `has_institution_role` overloads recognized).
- [ ] Database migration `20261115000000_automatic_absence_notifications.sql` applied in Supabase SQL Editor.
- [ ] Migration recorded in `supabase_migrations.schema_migrations`:
  ```sql
  INSERT INTO supabase_migrations.schema_migrations (version) VALUES ('20261115000000');
  ```
- [ ] Automated verification suites executed with zero failures:
  - `npm run typecheck` (Monorepo TypeScript: 6 workspaces clean)
  - `npm run test:unit` (361/361 tests passing)
  - `npm run test:security` (190/190 tests passing)
  - `npm run test:integration` (30/30 tests passing against live 123-table PostgreSQL cluster)
- [ ] Web production build compiled (`npm run build` completed with 109 routes compiled).
- [ ] Android preview APK built via EAS (`com.school0730.eduplatformmobile`).

---

## 2. Environment Variables & Security Credentials

- [ ] `NEXT_PUBLIC_SUPABASE_URL` configured in Vercel.
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` configured in Vercel.
- [ ] `SUPABASE_SERVICE_ROLE_KEY` configured in Vercel (server only; verified absent from client bundles).
- [ ] `CRON_SECRET` configured in Vercel project settings for `/api/cron/notifications`.
- [ ] `EXPO_ACCESS_TOKEN` configured in Vercel for Expo Push service delivery.
- [ ] `GEMINI_API_KEY` configured in Supabase Edge Function secrets for `ai-gateway`.
- [ ] Firebase FCM V1 key verified in Expo EAS Dashboard for project `bbf92a69-9c4f-4395-9d10-69c0893ecb69`.

---

## 3. Institutional Configuration

- [ ] Active Academic Year and Academic Terms established and set to active.
- [ ] Classes and Sections configured to match real institutional classrooms.
- [ ] Faculty roster invited and assigned to respective departments and subjects.
- [ ] Student records imported with verified guardian telephone numbers and emails.
- [ ] Timetable published with room assignments and zero faculty/room scheduling collisions.
- [ ] Fee Heads and Fee Structures configured for the active academic term.
- [ ] Receipt numbering prefix verified (e.g. `REC-2026-`).

---

## 4. End-to-End Operational Dry-Run (Mandatory Before Pilot Activation)

- [ ] **Administrator Access:** Log into web dashboard, verify multi-institution switcher, and check institutional profile.
- [ ] **Faculty Attendance Marking:** Teacher logs into web or mobile app, opens active session for a test class, marks 1 student absent, and submits batch.
- [ ] **Physical Android Push Verification:**
  - Install preview `.apk` on a physical Android test device.
  - Log in with the test student's guardian account.
  - Confirm notification permission granted.
  - Trigger outbox worker (`/api/cron/notifications`).
  - **Confirm visual push alert appears in the Android system notification tray.**
- [ ] **Fee Payment & Ledger Audit:** Cashier records test offline payment (cash/bank transfer); confirm automatic receipt generation and verify that unauthorized student/parent roles cannot modify or verify payments.
- [ ] **Parent Portal Check:** Guardian logs into `/portal/parent` and confirms student attendance status, fee receipts, and announcements.
- [ ] **Student Portal Check:** Student logs into `/portal/student` and confirms view of class timetable and academic records.

---

## 5. Final Pilot Authorization

| Role | Name | Signature | Date |
| :--- | :--- | :--- | :--- |
| **Institution Principal / Director** | ____________________ | ____________________ | ________ |
| **AUVRYN Chief Technology Officer** | ____________________ | ____________________ | ________ |
