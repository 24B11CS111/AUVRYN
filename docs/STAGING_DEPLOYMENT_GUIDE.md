# AUVRYN — Isolated Staging Deployment Guide

**Version**: 1.0.0-staging  
**Target Release Phase**: Isolated Educational Staging & Pilot Validation  
**Platform**: AUVRYN — The Intelligent Education Ecosystem  
**Repository**: `C:\Users\hrixo\OneDrive\Desktop\School`  

---

## 1. Absolute Staging Separation Principle

> [!CAUTION]
> **PRODUCTION DATABASE HARD GUARD**:
> The production Supabase project (`dhgdjpjgsvbknquetecl`) must **NEVER** be used for staging, demo data, test runs, or pilot preparations.
> All staging activities must use a dedicated, physically separate Supabase project.

### Separation Checklist:
- [ ] Dedicated Staging Supabase Project created (e.g. `auvryn-staging-<identifier>`)
- [ ] Staging project reference differs from `dhgdjpjgsvbknquetecl`
- [ ] Staging database URL differs from `https://dhgdjpjgsvbknquetecl.supabase.co`
- [ ] Staging Auth, Storage, and Edge Functions are fully isolated
- [ ] Web application staging deployment (Render or Vercel preview) points exclusively to staging environment variables
- [ ] Mobile preview build points to `EXPO_PUBLIC_SUPABASE_URL` of staging

---

## 2. Staging Infrastructure Provisioning Steps

### Step 1: Create Remote Supabase Staging Project
1. Log in to the [Supabase Dashboard](https://supabase.com/dashboard).
2. Click **New Project**.
3. Set Organization and Project Name: `auvryn-staging`.
4. Generate a strong Database Password and record it securely in the institutional password vault.
5. Select the primary geographic region (e.g. `ap-south-1` Mumbai for Indian institutions).
6. Note the generated **Project Reference ID** (20-character alphanumeric string).

### Step 2: Database Migration Execution Order
Apply all 19 platform migrations sequentially using `psql` or the Supabase Dashboard SQL Editor:

```bash
# Verify connection points to staging (REJECTS dhgdjpjgsvbknquetecl)
node scripts/seed-staging.cjs --target staging --project-ref <YOUR_STAGING_PROJECT_REF>
```

Execute migrations in exact alphabetical order:
1. `20261105000000_initial_schema.sql` (Core profiles, institutions, memberships, base RBAC)
2. `20261105010000_academic_hierarchy.sql` (Programs, academic years, classes, sections)
3. `20261105020000_student_admissions.sql` (Admissions, guardian profiles, enrollments)
4. `20261105030000_staff_faculty.sql` (Faculty designations, staff profiles, departments)
5. `20261105040000_attendance_management.sql` (Attendance sessions, student roll call, staff logs)
6. `20261105050000_timetable_scheduling.sql` (Timetable periods, entries, room management)
7. `20261105060000_examination_results.sql` (Grading systems, exam sessions, marks entry, GPA)
8. `20261105070000_fees_payments.sql` (Fee heads, assignments, payment receipts, ledger)
9. `20261105080000_parent_student_communications.sql` (Announcements, notifications, circulars)
10. `20261106090000_transport_management.sql` (Routes, stops, vehicles, journeys, GPS telemetry)
11. `20261108090000_library_hostel_events.sql` (Hostel buildings, rooms, library books, events)
12. `20261109120000_fix_attendance_rls_functions.sql` (Security hardening of attendance functions)
13. `20261109121000_storage_security_policies.sql` (Private storage bucket policies and RLS)
14. `20261109122000_notification_outbox_worker.sql` (Transactional outbox queue, push tokens)
15. `20261109123000_harden_notification_worker_rpc_grants.sql` (Service role worker privileges)
16. `20261110090000_harden_transport_gps_authorization.sql` (Driver GPS update authorization)
17. `20261111000000_ai_gateway_automation.sql` (AI gateway quota, draft proposals, audit trails)
18. `20261115000000_automatic_absence_notifications.sql` (Automated guardian absence alert jobs)
19. `20261120000000_student_identity_and_registration.sql` (Voluntary Aadhaar masking, consents, emergency contacts)

Expected Result: **124 public tables, 98 public functions, 303 RLS policies**.

### Step 3: Seed Controlled Staging Demo Data
Execute the safe staging seed script:
```bash
node scripts/seed-staging.cjs --target staging --project-ref <YOUR_STAGING_PROJECT_REF> --db-url "postgresql://postgres:<PASSWORD>@db.<STAGING_PROJECT_REF>.supabase.co:5432/postgres"
```
Or execute via PowerShell:
```powershell
.\scripts\seed-staging.ps1 -Target staging -ProjectRef <YOUR_STAGING_PROJECT_REF> -DbUrl "postgresql://postgres:<PASSWORD>@db.<STAGING_PROJECT_REF>.supabase.co:5432/postgres"
```

---

## 3. Web Application Staging Deployment (Render.com)

### Web Service Settings:
- **Service Type**: Web Service
- **Name**: `auvryn-web-staging`
- **Environment**: Node
- **Branch**: `main` (or `staging`)
- **Root Directory**: *(empty / repository root)*
- **Build Command**: `npm run build:web`
- **Start Command**: `npm run start:web`
- **Node Version**: `20.x` or `22.x`
- **Health Check Path**: `/api/health`

### Staging Environment Variables:
```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://auvryn-web-staging.onrender.com
NEXT_PUBLIC_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
SUPABASE_SERVICE_ROLE_KEY=<STAGING_SERVICE_ROLE_KEY>
EXPO_ACCESS_TOKEN=<STAGING_EXPO_ACCESS_TOKEN>
CRON_SECRET=<SECURE_RANDOM_UUID>
```

> [!WARNING]
> Ensure `apps/web/.env.local` is **NOT** deployed to Render or Vercel. Render reads its environment variables strictly from the Dashboard Environment Settings.

---

## 4. Mobile Android Staging Build (EAS / Local Preview)

Configure `apps/mobile/.env`:
```env
EXPO_PUBLIC_SUPABASE_URL=https://<STAGING_PROJECT_REF>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<STAGING_ANON_KEY>
```

Build APK for physical device pilot testing:
```bash
cd apps/mobile
eas build --profile preview --platform android
```
Or export static Hermes bytecode for local evaluation:
```bash
npx expo export --platform android
```

---

## 5. Verification Checklist Post-Deployment

1. Probe health endpoint:
   ```bash
   curl -i https://<STAGING_APP_URL>/api/health
   # Expected HTTP/1.1 200 OK {"status":"healthy","service":"auvryn-web"}
   ```
2. Open login page: `https://<STAGING_APP_URL>/auth/login`
3. Verify test login across all 5 roles:
   - Owner: `demo_owner@auvryn.edu`
   - Teacher: `demo_teacher@auvryn.edu`
   - Student: `demo_student@auvryn.edu`
   - Parent: `demo_parent@auvryn.edu`
   - HRIX Admin: `demo_hrix@auvryn.edu`
4. Confirm institution selector routes cleanly to `/portal/teacher`, `/portal/student`, `/portal/parent`, or `/dashboard`.
