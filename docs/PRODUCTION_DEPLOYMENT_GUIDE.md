# AUVRYN — Production Deployment Guide

**Target System:** AUVRYN — The Intelligent Education Ecosystem  
**Target Environment:** Vercel (Web / Next.js) + Supabase Cloud (`dhgdjpjgsvbknquetecl`) + Expo Application Services (Android Mobile)  
**Security Level:** Production Confidential  

---

## 1. Architecture & Component Topology

AUVRYN operates across three interconnected runtime environments:

```
┌────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                  │
│                                                                        │
│   Web Application (Next.js 14)       Mobile Application (React Native) │
│   Deployed on Vercel Edge/Serverless Built via Expo EAS (Android APK)  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   ▼                                 ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      SUPABASE CLOUD PLATFORM                           │
│                                                                        │
│   ┌─────────────────────┐   ┌─────────────────┐   ┌────────────────┐   │
│   │ Supabase Auth (JWT) │   │ Storage Buckets │   │  Edge Gateway  │   │
│   └─────────────────────┘   └─────────────────┘   └────────────────┘   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │ PostgreSQL 17 Engine (Multi-Tenant Row-Level Security)         │   │
│   │ Tables (123) · RLS Policies (281+) · Stored Routines (94+)     │   │
│   └────────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
                                   ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   NOTIFICATION & CRON DISPATCH WORKER                   │
│                                                                        │
│   Vercel Cron (/api/cron/notifications) ──> claim_notification_deliveries │
│                                           ──> Expo Push API (FCM V1)   │
│                                           ──> resolve_notification_delivery │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Pre-Deployment Readiness Checklist

Before triggering production deployments or applying pending migrations, confirm:

- [ ] All automated tests pass:
  - Unit tests: 26 suites, 361 passed.
  - Security tests: 16 suites, 190 passed.
  - Integration tests: 4 suites, 30 passed.
- [ ] TypeScript check clean across monorepo (`npm run typecheck`).
- [ ] Next.js production build succeeds (`npm run build`).
- [ ] Mobile Hermes bundle exports cleanly (`cd apps/mobile; npx expo export --platform android`).
- [ ] Preflight verification script executed in read-only mode against Supabase:
  - `supabase/verification/preflight_attendance_notifications.sql` returns `DATABASE PREFLIGHT PASS`.
- [ ] All required environment variables staged in Vercel and Expo.

---

## 3. Database Migration Deployment Order

All database migrations must be executed sequentially via the Supabase Dashboard SQL Editor or Supabase CLI.

### Baseline Migrations (Already Applied in Production):
1. `20261105000000_initial_schema.sql`
2. `20261105010000_academic_hierarchy.sql`
3. `20261105020000_student_admissions.sql`
4. `20261105030000_staff_faculty.sql`
5. `20261105040000_attendance_management.sql`
6. `20261105050000_timetable_scheduling.sql`
7. `20261105060000_examination_results.sql`
8. `20261105070000_fees_payments.sql`
9. `20261105080000_parent_student_communications.sql`
10. `20261106090000_transport_management.sql`
11. `20261108090000_library_hostel_events.sql`
12. `20261109120000_fix_attendance_rls_functions.sql`
13. `20261109121000_storage_security_policies.sql`
14. `20261109122000_notification_outbox_worker.sql`
15. `20261109123000_harden_notification_worker_rpc_grants.sql`
16. `20261110090000_harden_transport_gps_authorization.sql`

### Pending Migration for Pilot Launch:
17. `20261115000000_automatic_absence_notifications.sql`
    - Creates `dispatch_student_absence_notification_atomic`.
    - Updates `record_student_attendance_batch` with caller identity enforcement and automatic notification dispatch.
    - Updates `correct_student_attendance_record` with caller identity enforcement and audit tracking.
    - Revokes execute from `PUBLIC` and `anon` on both attendance RPCs.
    - Grants execute only to `authenticated` and `service_role`.

### Migration Execution Procedure:
1. Open the Supabase Dashboard for project `dhgdjpjgsvbknquetecl`.
2. Navigate to **SQL Editor**.
3. Paste the contents of `supabase/migrations/20261115000000_automatic_absence_notifications.sql`.
4. Click **Run**.
5. Record migration version in history:
   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version) 
   VALUES ('20261115000000') 
   ON CONFLICT DO NOTHING;
   ```

---

## 4. Vercel Web Deployment

### 4.1 Root Directory & Build Configuration:
- **Framework Preset:** Next.js
- **Root Directory:** `apps/web`
- **Build Command:** `npm run build`
- **Output Directory:** `.next`
- **Install Command:** `npm install`

### 4.2 Required Vercel Environment Variables:
Configure under **Project Settings → Environment Variables**:

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production, Preview | Supabase Project URL (`https://dhgdjpjgsvbknquetecl.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production, Preview | Supabase public anonymous API key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Server-only Supabase service-role secret |
| `CRON_SECRET` | Production | High-entropy Bearer token for securing `/api/cron/notifications` |
| `EXPO_ACCESS_TOKEN` | Production | Expo Push API bearer token |
| `GEMINI_API_KEY` | Production | Google Gemini API key for AI assistant features |
| `NEXT_PUBLIC_APP_URL` | Production | Canonical web URL (`https://auvryn.com` or custom domain) |

### 4.3 Vercel Cron Setup:
The notification queue worker schedule is declared in `apps/web/vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/cron/notifications",
      "schedule": "* * * * *"
    }
  ]
}
```
*Note: Hobby plans support once-daily crons. Pro plans support per-minute crons. On Hobby, trigger via external cron service or scheduled worker.*

---

## 5. Android Mobile Deployment (Expo EAS)

### 5.1 Project Identity:
- **Package Name:** `com.school0730.eduplatformmobile`
- **EAS Project ID:** `bbf92a69-9c4f-4395-9d10-69c0893ecb69`
- **Firebase Project:** `auvryn-63772`
- **Credentials Staged:** Google Services JSON (`google-services.json`), FCM V1 Service Account Key in EAS Dashboard.

### 5.2 Build Execution Command:
```bash
cd apps/mobile
eas build --platform android --profile preview
```
This produces a downloadable `.apk` file for side-loading onto school test tablets and administrator smartphones.

---

## 6. Post-Deployment Verification Steps

1. **Health Probes:**
   - Verify web homepage loads: `GET /`
   - Verify login page renders: `GET /auth/login`
   - Verify Supabase Auth roundtrip.
2. **Notification Cron Authorization Test:**
   - `GET /api/cron/notifications` without header -> Expected `401 Unauthorized`.
   - `GET /api/cron/notifications` with `Authorization: Bearer <CRON_SECRET>` -> Expected `200 OK` with JSON batch summary.
3. **Database Audit Verification:**
   - Execute `supabase/verification/post_migration_verification.sql` in Supabase SQL Editor.
