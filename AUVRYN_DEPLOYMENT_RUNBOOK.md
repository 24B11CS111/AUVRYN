# AUVRYN — Production Deployment & Launch Runbook

**Platform:** AUVRYN — The Intelligent Education Ecosystem  
**Target Environment:** Supabase Cloud (`dhgdjpjgsvbknquetecl`) + Vercel + Expo Application Services (EAS)  
**Security Level:** Production Confidential  
**Standard:** Zero-Downtime Reversible Deployment & Evidence-Based Verification

---

## Phase 1: Pre-Migration Backup Protocol

Before applying any migration or schema alteration, capture an independent physical backup of the production database:

### Step 1.1: Supabase Dashboard Backup Check
1. Open the [Supabase Dashboard](https://supabase.com/dashboard/project/dhgdjpjgsvbknquetecl).
2. Go to **Project Settings** → **Database** → **Backups**.
3. Confirm the date and timestamp of the latest automated scheduled backup. If a "Download" button is available, download the archive.

### Step 1.2: Capture Independent Pre-Migration Dump
Execute `pg_dump` from your local terminal:
```bash
pg_dump "postgresql://postgres.[YOUR-PASSWORD]@db.dhgdjpjgsvbknquetecl.supabase.co:5432/postgres" \
  -F c \
  -b \
  -v \
  -f "auvryn_prod_pre_migration_17_$(date +%Y%m%d_%H%M%S).dump"
```
Verify the archive Table of Contents (TOC) without restoring:
```bash
pg_restore --list auvryn_prod_pre_migration_17_*.dump
```
Confirm all 123 production tables and schemas are listed with zero corruption errors.

---

## Phase 2: Applying Database Migration 17

Apply the automatic absence notification migration to production:

1. In the Supabase Dashboard, open the **SQL Editor**.
2. Click **New Query**.
3. Open and copy the entire contents of:
   `supabase/migrations/20261115000000_automatic_absence_notifications.sql`
4. Paste into the SQL Editor and click **Run**.
5. Confirm output returns:
   `Success. No rows returned`

---

## Phase 3: Post-Migration Preflight Re-Verification

Verify that all permissions, overloads, and hardening assertions are satisfied:

1. In the SQL Editor, open and run:
   `supabase/verification/preflight_attendance_notifications.sql`
2. Inspect the output for **`CHECK_10_EXECUTIVE_SUMMARY`**.
3. Verify that all assertions now evaluate to `true`:
   - `preflight_go_no_go_verdict` = `DATABASE PREFLIGHT PASS`
   - `no_outbox_overloads` = `true`
   - `permissions_verified` = `true`
   - `signatures_and_overloads_verified` = `true`
   - `worker_service_role_authorized` = `true`
   - `authenticated_revoked_on_worker` = `true`
   - `attendance_rpc_hardening_status` = `ALREADY_HARDENED_IN_DATABASE`

---

## Phase 4: Migration History Recording Check

Check whether the migration version was recorded by the runner or requires safe manual recording:

1. Execute the following read-only query in the SQL Editor:
   ```sql
   SELECT version, name FROM supabase_migrations.schema_migrations WHERE version = '20261115000000';
   ```
2. If 0 rows are returned, record the version safely:
   ```sql
   INSERT INTO supabase_migrations.schema_migrations (version, name) 
   VALUES ('20261115000000', 'automatic_absence_notifications') 
   ON CONFLICT (version) DO NOTHING;
   ```
3. Re-run the `SELECT` query to confirm the version is now tracked.

---

## Phase 5: Vercel Production Environment Secrets Configuration

Configure production environment variables in the Vercel Project Dashboard:

1. Open [Vercel Dashboard](https://vercel.com) → Select your AUVRYN web project.
2. Go to **Settings** → **Environment Variables**.
3. Ensure the following variables are configured for the **Production** environment:

| Variable Name | Environment | Secret Type | Description |
| :--- | :---: | :---: | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Production | Public | `https://dhgdjpjgsvbknquetecl.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Production | Public | Supabase public anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production | **Server-Only Secret** | Supabase admin service role key (Never expose in browser) |
| `CRON_SECRET` | Production | **Server-Only Secret** | High-entropy 32-character secret for `/api/cron/notifications` |
| `EXPO_ACCESS_TOKEN` | Production | **Server-Only Secret** | Expo Push Gateway access token from expo.dev |
| `GEMINI_API_KEY` | Production | **Server-Only Secret** | Google AI Studio Gemini API Key |

---

## Phase 6: Vercel Web Deployment

Deploy the Next.js web application to Vercel production:

```bash
# From workspace root
npx vercel --prod
```
- Confirm build succeeds on Vercel Edge/Serverless.
- Verify that Vercel Cron is active for `/api/cron/notifications` (runs every minute to process outbox deliveries).

---

## Phase 7: EAS Android Mobile Preview APK Build

Generate the installable `.apk` for pilot test devices:

```bash
cd apps/mobile
npx eas-cli build --platform android --profile preview
```
1. Download the generated `.apk` link provided by EAS upon build completion.
2. Install the `.apk` on pilot administrator and parent Android devices.

---

## Phase 8: Emergency Rollback Protocols

If any critical issue arises during deployment:

### 1. Database Rollback (Migration 17 Reversal)
1. Open Supabase Dashboard → **SQL Editor**.
2. Execute the complete contents of `supabase/migrations/rollback/20261115000000_rollback.sql`.
3. Confirm output returns `Success. No rows returned`.
4. Re-run `supabase/verification/preflight_attendance_notifications.sql` to confirm clean reversion.

### 2. Web Application Rollback (Instant Vercel Redeploy)
1. Open Vercel Dashboard → **Deployments**.
2. Locate the prior stable production deployment.
3. Click the three dots (`...`) and select **Redeploy to Production**.
4. Traffic is rerouted to the previous build within seconds.

### 3. Mobile App Hotfix (OTA Update)
```bash
cd apps/mobile
npx eas-cli update --branch production --message "Hotfix: Revert broken client view"
```
