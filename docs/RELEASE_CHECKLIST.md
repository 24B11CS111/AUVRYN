# AUVRYN — Release Verification Checklist

**Audit Date**: November 21, 2026  
**Auditor**: Independent QA Lead & Deployment Architect  
**Target**: Staging Deployment & Pilot Readiness  

---

## 1. Automated Verification Gates

| Gate | Check | Expected Output | Actual Verified Result | Status |
| :---: | :--- | :--- | :--- | :---: |
| **G-01** | Monorepo Typecheck | `npm run typecheck` across all 6 workspaces | 0 errors across 6 workspaces | **PASS** |
| **G-02** | Unit Tests | `npm run test:unit` (29 files) | 29 files, 392 passed, 0 failed | **PASS** |
| **G-03** | Security Tests | `npm run test:security` (20 files) | 20 files, 265 passed, 0 failed | **PASS** |
| **G-04** | Integration Tests | `npm run test:integration` (PostgreSQL 17, port 54333) | 4 files, 30 passed, 0 failed | **PASS** |
| **G-05** | ESLint Code Quality | `npm run lint` | 0 warnings, 0 errors | **PASS** |
| **G-06** | Next.js Production Build | `npm run build:web` | 113 routes compiled & optimized | **PASS** |
| **G-07** | Local Server Runtime | `npm run start:web` + `/api/health` | HTTP 200 `{"status":"healthy"}` | **PASS** |
| **G-08** | Mobile Hermes Bundling | `npx expo export --platform android` | 774 modules, 2.88 MB `.hbc` | **PASS** |
| **G-09** | Production Safety Block | `node scripts/seed-staging.cjs --target staging --project-ref dhgdjpjgsvbknquetecl` | Rejected with CRITICAL SAFETY BLOCK (Exit 1) | **PASS** |
| **G-10** | Database Migration Ordering | 19 migrations on fresh PostgreSQL 17 | 124 public tables, 98 functions, 303 policies | **PASS** |

---

## 2. Environment & Infrastructure Isolation Gates

- [x] **Zero Production Touch**: Production database (`dhgdjpjgsvbknquetecl`) was not accessed, connected to, or migrated.
- [x] **Sanitized Example Files**: Root `.env.example` verified free of live API keys, JWT tokens, or production references.
- [ ] **Staging Supabase Provisioned**: Dedicated remote staging project provisioned. *(Pending DBA creation)*
- [ ] **Staging Migrations Applied**: 19 migrations applied to the dedicated remote staging project. *(Pending DBA creation)*
- [ ] **Staging Demo Seed Applied**: Safe pilot seed applied to remote staging project. *(Pending DBA creation)*
- [ ] **Staging Hosting Deployed**: Web service deployed on Render.com or Vercel preview pointing to staging Supabase. *(Pending cloud setup)*

---

## 3. Core Academic Workflow Verification

- [x] **Workflow 1: Attendance Roll Call $\to$ Absence Notification**
  - Teacher marks roll call in `/portal/teacher` $\to$ records written to `student_attendance_records` $\to$ absent students identified $\to$ linked parents receive instant alert *"Attendance Alert — AUVRYN: Student Absent for Session"*.
- [x] **Workflow 2: Coursework Lifecycle**
  - Teacher assigns homework in `homework_assignments` $\to$ students and parents alerted $\to$ student uploads work in `homework_submissions` $\to$ teacher reviews and grades $\to$ private grade notification sent.
- [x] **Workflow 3: Examination Marks $\to$ Report Cards**
  - Admin publishes exam session $\to$ GPA / SGPA / CGPA calculated $\to$ report cards generated $\to$ guardians notified with secure download links.
- [x] **Workflow 4: Circular Broadcast $\to$ Audience Fan-Out**
  - Owner creates circular $\to$ fan-out engine resolves target user UUIDs across 5 audience scopes $\to$ batched into in-app notifications and queued in push outbox.
- [x] **Workflow 5: Timetable Agendas**
  - Timetable updates in `timetable_entries` broadcast via Realtime channel $\to$ daily agendas in student and teacher portals re-render instantly.
- [x] **Workflow 6: Student Identity & Aadhaar Registration**
  - Voluntary Aadhaar consent recorded $\to$ Verhoeff checksum validated client-side $\to$ 12-digit number masked as `•••• •••• 1234` $\to$ SHA-256 hash stored for duplicate prevention $\to$ raw number discarded.

---

## 4. Final Release Recommendation

- **Staging Codebase Status**: **CERTIFIED READY FOR ISOLATED STAGING DEPLOYMENT**
- **Production Status**: **HOLD / DO NOT DEPLOY TO PRODUCTION**
- **Blockers to Live Pilot**:
  1. Remote staging Supabase project must be provisioned.
  2. Physical Android device push delivery must be verified on hardware.
  3. School administration team must complete pilot onboarding dry-run.
