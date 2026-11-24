# AUVRYN — Staging Infrastructure Completion & Operational Handover Runbook

**Date**: November 19, 2026  
**Project**: AUVRYN — The Intelligent Education Ecosystem  
**Repository**: `C:\Users\hrixo\OneDrive\Desktop\School`  
**Target Environment**: Isolated Staging Release (`https://auvryn-staging.vercel.app`)  
**Production Guard**: **STRICT PRODUCTION ISOLATION ENFORCED** (Targeting production ref `dhgdjpjgsvbknquetecl` is hard-blocked)  

---

## 1. Executive Summary & Purpose

This handover runbook details the exact operational steps to provision, migrate, configure, seed, and test an isolated, remote **AUVRYN Staging Environment**.

Following this runbook will close the two remaining blockers identified in the staging release audit:
1. Provisioning a dedicated remote Supabase staging database.
2. Generating the Android preview APK for physical-device push notification verification.

> [!IMPORTANT]
> **Zero Production Impact**: Do not apply migrations, run seeds, or deploy builds against the production Supabase project (`dhgdjpjgsvbknquetecl`). Production credentials must never be used in staging environments.
> 
> **Zero Credential Exposure**: Never paste passwords, service-role keys, or secrets into chat or source control. All secrets are stored exclusively in Vercel and EAS secret managers.

---

## 2. Actions Requiring User Manual Input

The following actions require manual execution outside of this AI session due to account ownership and secret management:

| Step | Action Required from User | Location / Tool |
| :---: | :--- | :--- |
| **1** | Create a new, isolated Supabase Staging Project. | [Supabase Dashboard](https://supabase.com/dashboard/new) |
| **2** | Save the database password securely in your private password manager. | User Password Manager |
| **3** | Note the **Staging Project Reference**, **Staging API URL**, **Staging Anon Key**, and **Staging Service Role Key**. | Supabase Dashboard $\to$ Project Settings $\to$ API |
| **4** | Configure Site URL and Auth Redirect URLs in Supabase Staging console. | Supabase Dashboard $\to$ Authentication $\to$ URL Configuration |
| **5** | Set Staging Environment Variables in Vercel scoped to the **Preview** environment. | [Vercel Dashboard](https://vercel.com) $\to$ Project Settings $\to$ Environment Variables |
| **6** | Trigger EAS Android Preview APK build and install on test phone. | Terminal (`eas build --profile preview --platform android`) |

---

## 3. Step-by-Step Staging Setup Instructions

### Step 3.1: Create Dedicated Remote Supabase Staging Project
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/new).
2. Select your Organization.
3. Configure project details:
   - **Name**: `auvryn-staging`
   - **Database Password**: Generate a secure, high-entropy password.
   - **Region**: Select your primary region (e.g. `ap-south-1` Mumbai or `us-east-1` N. Virginia).
   - **Pricing Plan**: Free or Pro (Staging tier).
4. Once provisioned, navigate to **Project Settings $\to$ General** and copy your **Reference ID** (referred to below as `[STAGING_PROJECT_REF]`).

### Step 3.2: Configure Staging Authentication & Redirect URLs
Navigate to **Authentication $\to$ URL Configuration** in the new staging project:
- **Site URL**: `https://auvryn-staging.vercel.app`
- **Redirect URLs** (Add all):
  - `https://auvryn-staging.vercel.app/**`
  - `https://auvryn-staging.vercel.app/auth/callback`
  - `auvryn://auth/callback` *(Mobile deep link scheme)*
  - `http://localhost:3000/**` *(Local developer testing fallback)*

### Step 3.3: Apply the 18 Sequential Migrations
From your terminal in `C:\Users\hrixo\OneDrive\Desktop\School`:

```powershell
# 1. Authorize Supabase CLI with your account (if not already logged in)
npx supabase login

# 2. Push all 18 platform migrations to the Staging project in sequence
npx supabase db push --db-url "postgresql://postgres:[STAGING_DB_PASSWORD]@db.[STAGING_PROJECT_REF].supabase.co:5432/postgres"
```

#### Migration Dependency Order (Verified):
1. `20261105000000_initial_schema.sql` (Extensions, enums, institutions, profiles, memberships, RLS)
2. `20261105010000_academic_hierarchy.sql` (Academic years, terms, departments, classes, sections, subjects)
3. `20261105020000_student_admissions.sql` (Admissions, students, guardians, enrollments)
4. `20261105030000_staff_faculty.sql` (Staff profiles, faculty allocations, departments)
5. `20261105040000_attendance_management.sql` (Attendance sessions, student attendance records, daily roll call)
6. `20261105050000_timetable_scheduling.sql` (Timetable periods, allocations, room assignments)
7. `20261105060000_examination_results.sql` (Exam types, sessions, subject exams, grading scales, results)
8. `20261105070000_fees_payments.sql` (Fee heads, structures, student assignments, payments, ledger)
9. `20261105080000_parent_student_communications.sql` (Announcements, notifications, preferences, devices)
10. `20261106090000_transport_management.sql` (Vehicles, drivers, routes, stops, passenger assignments)
11. `20261108090000_library_hostel_events.sql` (Library books, circulation, hostel buildings, rooms, events)
12. `20261109120000_fix_attendance_rls_functions.sql` (Hardened RLS helper functions for roll call)
13. `20261109121000_storage_security_policies.sql` (Storage buckets & multi-tenant isolation policies)
14. `20261109122000_notification_outbox_worker.sql` (Outbox worker schema, skip-locked claim RPC)
15. `20261109123000_harden_notification_worker_rpc_grants.sql` (RPC execution security grants)
16. `20261110090000_harden_transport_gps_authorization.sql` (GPS driver telemetry security)
17. `20261111000000_ai_gateway_automation.sql` (AI gateway schemas, audit trails, quota checks)
18. `20261115000000_automatic_absence_notifications.sql` (Absence alert outbox triggers & deduplication)

---

## 4. Staging Configuration & Environment Variables

### A. Next.js Web Application (`apps/web`)
Set these variables in **Vercel Project Settings $\to$ Environment Variables** scoped **EXCLUSIVELY to `Preview`**:

| Variable Name | Staging Value | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_ENV` | `staging` | Activates staging security boundary checks |
| `NEXT_PUBLIC_APP_URL` | `https://auvryn-staging.vercel.app` | Public HTTPS staging application URL |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[STAGING_PROJECT_REF].supabase.co` | Staging Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `[STAGING_ANON_KEY]` | Staging public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | `[STAGING_SERVICE_ROLE_KEY]` | Server-side trusted operational key |
| `EXPO_ACCESS_TOKEN` | `[STAGING_EXPO_ACCESS_TOKEN]` | Server-side Expo Push notification bearer token |

> [!NOTE]
> `apps/web/src/lib/supabase/client.ts` and `apps/web/src/lib/supabase/server.ts` contain an active architectural safety check: if `NEXT_PUBLIC_APP_ENV === 'staging'` and `NEXT_PUBLIC_SUPABASE_URL` points to `dhgdjpjgsvbknquetecl`, the application refuses to start and throws `CRITICAL SAFETY BLOCK`.

### B. Expo Android Mobile Application (`apps/mobile`)
Configure environment variables in EAS for the `"preview"` build profile:

```bash
# 1. Set Staging Supabase URL for EAS Preview builds
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_URL --value "https://[STAGING_PROJECT_REF].supabase.co"

# 2. Set Staging Supabase Anon Key for EAS Preview builds
npx eas env:create --environment preview --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "[STAGING_ANON_KEY]"

# 3. Set Staging Application Environment Flag
npx eas env:create --environment preview --name APP_ENV --value "staging"
```

---

## 5. Staging Test Data Seed Execution

Once migrations are applied and the staging project is active, execute the validated seed script:

```powershell
node scripts/seed-staging.cjs --target staging --project-ref [STAGING_PROJECT_REF] --db-url "postgresql://postgres:[STAGING_DB_PASSWORD]@db.[STAGING_PROJECT_REF].supabase.co:5432/postgres"
```

### Safety Features of the Seed Wrapper:
- **Rejection of Production**: Unconditionally blocks execution if the target project reference matches or begins with `dhgdjpjg`.
- **Ephemeral Session Signature**: Injects an in-database cryptographic token (`app.seed_runner_nonce` and `app.seed_runner_signature`) to prevent unauthorized ad-hoc execution in SQL editors.
- **Data Safety Guard**: Verifies that the target database contains zero non-demo users before running.

### SeedTest Accounts Created:
- **Preschool Tier**:
  - Owner: `owner.bloom@auvryn-demo.internal`
  - Lead Caregiver: `caregiver.sarah@auvryn-demo.internal`
  - Parent: `parent.toddler@auvryn-demo.internal`
- **Primary School Tier**:
  - Owner: `owner.oakridge@auvryn-demo.internal`
  - Teacher: `teacher.grade3@auvryn-demo.internal`
  - Multi-Child Parent: `parent.multi@auvryn-demo.internal` (Linked to Child A in Grade 3 and Child B in Grade 5)
  - Student A: `student.childa@auvryn-demo.internal`
  - Student B: `student.childb@auvryn-demo.internal`
- **Intermediate Tier**:
  - Principal: `principal.chaitanya@auvryn-demo.internal`
  - Senior Lecturer: `faculty.physics@auvryn-demo.internal`
  - Scholar: `student.scholar@auvryn-demo.internal` (MPC Stream)
  - Parent: `parent.scholar@auvryn-demo.internal`
- **University Tier**:
  - Dean: `dean.apex@auvryn-demo.internal`
  - Department Chair: `prof.sharma@auvryn-demo.internal`
  - Candidate: `student.undergrad@auvryn-demo.internal`
  - Parent: `parent.undergrad@auvryn-demo.internal`
- **Platform Super Admin**:
  - `hrix.admin@auvryn-demo.internal`

*(Default staging account password initialized by script: `PilotDemo2026!`)*

---

## 6. Android Physical-Device Push Verification Guide

### Step 6.1: Build Standalone Staging Android Preview APK
From `apps/mobile`:

```powershell
cd apps/mobile
npx eas build --profile preview --platform android
```

- When the build finishes on EAS Cloud, download the `.apk` file from the provided Expo build dashboard link.
- Install the `.apk` onto your physical Android test smartphone.

### Step 6.2: Execute Push Verification Test Protocol
1. **Launch App & Request Permissions**:
   - Open the installed AUVRYN staging app.
   - Tap "Allow" when the Android system notification dialog appears (`POST_NOTIFICATIONS`).
2. **Log In as Staging Parent**:
   - Log in with `parent.multi@auvryn-demo.internal` / `PilotDemo2026!`.
   - Verify that `push_device_tokens` records the device's native Expo token (`ExponentPushToken[...]`) with `is_active = true`.
3. **Trigger Real Absence Event from Teacher Portal**:
   - In a desktop browser on `https://auvryn-staging.vercel.app`, log in as `teacher.grade3@auvryn-demo.internal`.
   - Open `/portal/teacher` $\to$ Roll Call $\to$ Mark Child A (`student.childa`) as **Absent** $\to$ Click "Submit Roll Call".
4. **Observe Notification Receipt on Phone**:
   - **Foreground Test**: Verify in-app toast banner appears with system chime.
   - **Background Test**: Press home button on phone $\to$ trigger another roll call or announcement $\to$ verify notification appears in the Android system notification drawer under the `transport_alerts` or `default` channel.
   - **Terminated Test**: Force-close the app from the task switcher $\to$ send circular announcement $\to$ verify push wakes the device.
   - **Deep Link Navigation Test**: Tap the received notification $\to$ verify the app opens directly to the Attendance / Alerts tab.

---

## 7. Rollback & Emergency Recovery Plan

In the event of an issue on staging:
1. **Web Deployment Rollback**:
   - Run `vercel rollback` or revert to previous preview deployment via Vercel dashboard.
2. **Database Migration Rollback**:
   - Revert scripts are cataloged in `supabase/migrations/rollback/`:
     ```powershell
     psql "postgresql://postgres:[PASSWORD]@db.[STAGING_PROJECT_REF].supabase.co:5432/postgres" -f supabase/migrations/rollback/rollback_20261115000000_automatic_absence_notifications.sql
     ```
3. **Mobile Rollback**:
   - Publish an over-the-air rollback update to all preview devices within seconds:
     ```powershell
     npx eas update --branch preview --message "Emergency rollback to stable build"
     ```

---

## 8. Verification & Sanity Commands

Before releasing staging credentials to pilot users, run this automated test suite locally:

```powershell
# 1. Monorepo Typecheck (All 6 packages)
npm run typecheck

# 2. Web Linting
npm run lint

# 3. Unit Test Suite (379 tests)
npm run test:unit

# 4. Security Test Suite (257 tests)
npm run test:security

# 5. Local PostgreSQL 17 Integration Suite (30 tests)
npm run test:integration
```

---

## 9. Current Status & Next Action

- **Staging Infrastructure Documentation**: **COMPLETED** (`docs/STAGING_INFRASTRUCTURE_HANDOVER.md`).
- **Safety Guards**: **ACTIVE & ENFORCED** (Web, mobile, and seed scripts hard-block `dhgdjpjgsvbknquetecl`).
- **Acceptance Screenshots Archive**: **READY** (`docs/acceptance-screenshots.zip`).
- **Execution State**: **STOPPED & WAITING FOR USER INPUT**.

Please review this handover runbook and proceed with Step 3.1 when ready to provision the new Supabase staging project.
