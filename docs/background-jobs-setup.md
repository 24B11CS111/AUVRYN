# AUVRYN Architecture Guide: Background Jobs & Cron Automation

## 1. Executive Summary & Root Cause Analysis

### 1.1 Root Cause of Vercel Hobby Restriction
When deploying AUVRYN to Vercel on a Hobby account, deployment previously failed with the following platform validation error:
```
"Hobby accounts are limited to daily cron jobs. This cron expression (* * * * *) would run more than once per day. Upgrade to the Pro plan to unlock all Cron Jobs features on Vercel."
```
Vercel's Hobby plan strictly limits native Vercel Cron executions to **once per calendar day** (`0 X * * *` or equivalent daily cadence). Any cron expression with higher frequency (such as `* * * * *`, `*/5 * * * *`, or `*/15 * * * *`) is rejected during project deployment validation.

### 1.2 Architectural Dilemma & Solution
Downgrading every background task to run only once per day is unacceptable for a modern school management platform:
- **Urgent Parent Absence Notifications:** Guardians must receive absence alerts within minutes of attendance being taken—not 24 hours later.
- **Immediate Broadcast Announcements:** Emergency closures and schedule changes cannot wait for a midnight batch run.
- **Queue Backpressure:** Accumulating all notifications for 24 hours creates large spikes that risk serverless function timeouts and provider rate-limiting (e.g. Expo Push, SendGrid, Twilio).

Rather than forcing an unnecessary \$20/seat/month Vercel Pro upgrade, AUVRYN implements a **Hybrid Decoupled Scheduling Architecture**:
1. **Vercel Native Cron (Daily Maintenance):** Complies 100% with Vercel Hobby by scheduling `/api/cron/daily` at `0 2 * * *` (02:00 AM UTC). Performs daily maintenance, publishes scheduled announcements whose time has arrived, and cleans stale delivery locks.
2. **Free External Orchestration (Frequent Delivery):** Uses a free GitHub Actions scheduled workflow (`.github/workflows/cron-notifications.yml`) running every 10 minutes to trigger `/api/cron/notifications`. It can also be paired with free cloud webhooks (such as cron-job.org or Upstash QStash) down to 1-minute intervals at **$0/month**.
3. **Event-Driven Asynchronous Processing:** On-demand queue dispatching triggered immediately upon attendance marking or announcement creation, achieving **< 2 second** delivery latency for active users.

---

## 2. Vercel Hobby vs Pro Plan Cron Matrix

| Feature | Vercel Hobby (Free) | Vercel Pro ($20/seat/mo) | AUVRYN Hybrid Architecture |
| :--- | :--- | :--- | :--- |
| **Max Native Cron Frequency** | Once per day (`0 X * * *`) | Once per minute (`* * * * *`) | Once per day natively + 1-10 min external |
| **Max Execution Duration** | 10s - 60s (Node.js runtime) | Up to 300s (Node.js runtime) | 60s maxDuration (50 batch size) |
| **Authentication** | Automatic Bearer Header | Automatic Bearer Header | `Authorization: Bearer <CRON_SECRET>` |
| **Monthly Platform Cost** | **$0.00 / month** | **$20.00+/seat / month** | **$0.00 / month** |
| **Delivery Latency** | 24 hours (if unassisted) | 1 minute | **< 2 seconds (event-driven)** / 10m fallback |

---

## 3. Native Daily Cron Configuration

### 3.1 `vercel.json` Specification
Located in `apps/web/vercel.json`:
```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "crons": [
    {
      "path": "/api/cron/daily",
      "schedule": "0 2 * * *"
    }
  ]
}
```
*Schedule note: `0 2 * * *` runs once daily at 02:00 UTC (off-peak institutional hours worldwide).*

### 3.2 Daily Maintenance Endpoint: `/api/cron/daily`
Supported Methods: `GET`, `POST`  
Authentication: `Authorization: Bearer <CRON_SECRET>`

#### Tasks Executed on Each Daily Run:
1. **Publish Scheduled Announcements:**
   - Queries `announcements` where `status = 'scheduled'` and `scheduled_for <= NOW()`.
   - Atomically updates `status = 'published'`, `published_at = NOW()`.
   - Calls `fanoutAnnouncementNotifications()` to generate targeted recipient notifications and enqueue push deliveries.
2. **Reclaim Stale In-Flight Delivery Locks:**
   - Scans `notification_deliveries` for items in `sending` or `processing` status where `locked_at < (NOW() - 15 minutes)`.
   - Resets their status to `pending` and clears `locked_by` and `locked_at`, recovering items from crashed serverless containers.
3. **Backlog Outbox Processing:**
   - Runs a cycle of `NotificationOutboxWorker` (batch size 50) to flush any pending queue items.

#### Sample JSON Response:
```json
{
  "ok": true,
  "timestamp": "2026-11-24T02:00:04.120Z",
  "durationMs": 412,
  "tasks": {
    "scheduledAnnouncements": {
      "found": 2,
      "published": 2,
      "errors": 0
    },
    "staleLocksReclaimed": 0,
    "outbox": {
      "workerId": "worker-7x8ab2c",
      "claimedCount": 12,
      "successCount": 12,
      "transientFailedCount": 0,
      "deadLetterCount": 0
    }
  }
}
```

---

## 4. Frequent Notification Queue & Outbox Runner

### 4.1 Endpoint: `/api/cron/notifications`
Supported Methods: `GET`, `POST`  
Authentication: `Authorization: Bearer <CRON_SECRET>`

### 4.2 Query and Body Parameters:
- `batchSize`: (Optional, number between 1 and 100, default: 50). Can be passed via URL query parameter (`?batchSize=25`) or JSON POST body (`{"batchSize": 25}`).

### 4.3 Worker Lifecycle:
1. **Atomic Batch Claiming:** Calls PostgreSQL stored procedure `claim_notification_deliveries(batchSize, workerId, '5 minutes')`.
2. **Row-Level Concurrency:** Uses PostgreSQL `FOR UPDATE SKIP LOCKED`. If multiple worker instances run concurrently, they skip locked rows without waiting or deadlock.
3. **Institutional Boundary Check:** Verifies recipient has an active membership in the target institution before delivery.
4. **Channel Dispatch:** Resolves destination and delegates to registered adapter (`PushDeliveryAdapter`, `EmailDeliveryAdapter`, `SmsDeliveryAdapter`).
5. **Atomic Resolution:** Calls stored procedure `resolve_notification_delivery` with status, provider message ID, and latency metrics. Failed jobs increment `attempts_count` and compute exponential backoff (`next_retry_at = now() + min(3600s, 2^(attempts-1)*30s)`). If `attempts_count >= max_attempts`, the job transitions to `dead_letter`.

---

## 5. Free External Webhook Schedulers Guide

To trigger `/api/cron/notifications` every 1 to 10 minutes without paying for Vercel Pro, choose any of the following battle-tested options:

### 5.1 Option A: GitHub Actions Scheduled Workflow (Pre-Configured)
The repository includes a ready-to-use GitHub Actions workflow at `.github/workflows/cron-notifications.yml`.

#### Setup Steps:
1. Navigate to your GitHub repository: **Settings** -> **Secrets and variables** -> **Actions**.
2. Click **New repository secret** and add:
   - `VERCEL_APP_URL`: Your deployed Vercel domain (e.g. `https://web-lpo1tyz08-anurags-projects-157b861e.vercel.app`).
   - `CRON_SECRET`: Your 32-character secret matching the Vercel environment variable `CRON_SECRET`.
3. The workflow runs every 10 minutes (`*/10 * * * *`) automatically and includes manual execution via **Run workflow** (`workflow_dispatch`).

### 5.2 Option B: cron-job.org (Free Cloud Cron Service)
[cron-job.org](https://cron-job.org) provides unlimited 1-minute interval cron execution with 100% free uptime monitoring.

#### Setup Steps:
1. Register for a free account at [https://cron-job.org](https://cron-job.org).
2. Click **Create Cronjob**.
3. Configure the job:
   - **Title:** `AUVRYN Notification Outbox Worker`
   - **Address (URL):** `https://<YOUR-VERCEL-DOMAIN>/api/cron/notifications`
   - **Schedule:** Every `1` minute (or `5` minutes).
   - **Request Method:** `POST`
4. Under **Advanced** -> **Headers**, add:
   - Name: `Authorization`
   - Value: `Bearer <YOUR_CRON_SECRET>`
   - Name: `Content-Type`
   - Value: `application/json`
5. Under **Request Body**, enter:
   ```json
   {"batchSize": 50}
   ```
6. Click **Create**. The worker will now trigger every minute.

### 5.3 Option C: Upstash QStash (Serverless Messaging & Scheduling)
Upstash QStash offers 500 free scheduled messages per day.

#### Setup Steps:
1. Create a free account at [https://console.upstash.com/qstash](https://console.upstash.com/qstash).
2. In the QStash dashboard, create a new schedule:
   - **Destination:** `https://<YOUR-VERCEL-DOMAIN>/api/cron/notifications`
   - **Cron Expression:** `*/5 * * * *`
   - **Method:** `POST`
   - **Header:** `Authorization: Bearer <YOUR_CRON_SECRET>`
3. Save schedule. QStash provides built-in deduplication, retry policies, and dead-letter monitoring.

---

## 6. Event-Driven Immediate Processing

To achieve **sub-second (< 2s)** delivery latency when teachers submit attendance or admins publish urgent announcements:

1. **Staff Manual Dispatch:**
   In `apps/web/src/app/dashboard/communications/actions.ts`:
   Calling `triggerOutboxWorkerAction(batchSize)` executes `NotificationOutboxWorker` immediately within server actions, refreshing the delivery queue UI in real time.
2. **Immediate Action Hook:**
   Whenever `processAttendanceAbsenceNotifications` or `fanoutAnnouncementNotifications` commits queued deliveries to `notification_deliveries`, the application can fire an asynchronous outbox cycle without blocking the client's HTTP response.

---

## 7. Security, Authentication & Secret Management

### 7.1 `CRON_SECRET` Protocol
Both `/api/cron/notifications` and `/api/cron/daily` enforce strict Bearer authentication:
```ts
const cronSecret = process.env.CRON_SECRET;
if (!cronSecret) {
  return NextResponse.json({ error: 'Server misconfiguration: CRON_SECRET is not configured' }, { status: 500 });
}

const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${cronSecret}`) {
  return NextResponse.json({ error: 'Unauthorized: Invalid or missing authorization token' }, { status: 401 });
}
```

### 7.2 Security Guarantees:
- **Zero Token Leakage:** The secret is never reflected in response bodies, error messages, or server logs.
- **Zero PII Exposure:** Delivery logs strictly record delivery IDs, channels, provider codes, and latency. Student names, guardian phone numbers, and message bodies are never recorded in `notification_delivery_logs`.
- **Database Privilege Hardening:** Worker stored procedures (`claim_notification_deliveries`, `resolve_notification_delivery`) have had `EXECUTE` revoked from `PUBLIC`, `anon`, and `authenticated`. Only `service_role` (via `SUPABASE_SERVICE_ROLE_KEY`) is authorized to execute them.

---

## 8. Concurrency Locking & Race Condition Prevention

AUVRYN implements a dual-layer concurrency defense:

```
┌────────────────────────────────────────────────────────┐
│ Layer 1: Container-Level In-Memory Mutex               │
│ - Implemented in src/lib/cron/concurrency.ts           │
│ - Intercepts overlapping requests on warm container    │
│ - Returns HTTP 200 with skipped_overlapping_run status │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│ Layer 2: Database Row-Level Concurrency (SKIP LOCKED)  │
│ - PostgreSQL: claim_notification_deliveries()          │
│ - SELECT ... FOR UPDATE SKIP LOCKED                    │
│ - Guarantees multiple containers process disjoint rows │
│ - Zero lock contention, zero duplicate deliveries      │
└────────────────────────────────────────────────────────┘
```

---

## 9. Failure Modes, Error Handling & Recovery Runbook

| Failure Scenario | Automatic System Behavior | Operator Resolution Runbook |
| :--- | :--- | :--- |
| **Worker container crashes mid-delivery** | Rows remain locked in `sending` state. After 5 minutes, `claim_notification_deliveries` re-claims them. After 15 minutes, `/api/cron/daily` cleans stale locks. | None required; automatic self-healing. |
| **Push Provider (Expo) HTTP 429/503** | Worker records transient failure, schedules exponential retry (`next_retry_at = now() + backoff`). | Verify Expo service health status at `status.expo.dev`. |
| **Invalid push token / deleted user** | Marked permanent failure (`is_permanent_failure: true`), immediate dead-letter state. | Push token marked inactive in `push_device_tokens`. |
| **CRON_SECRET missing or mismatched** | Route returns HTTP 401 or 500 immediately. | Verify `CRON_SECRET` in Vercel project environment variables and external scheduler headers. |
| **Exceeded max retry attempts (3)** | Transitioned to `dead_letter` status with last error code recorded. | Admin reviews dead letters in `/dashboard/communications/delivery` and clicks **Requeue**. |

---

## 10. Local Development & Testing Instructions

### 10.1 Running Unit Tests
```bash
# Run unit test suite for cron routes
npx vitest run tests/unit/cron-notifications-route.test.ts tests/unit/cron-daily-route.test.ts

# Run all notification-related unit tests
npx vitest run tests/unit/attendance-notifications.test.ts tests/unit/announcement-fanout.test.ts
```

### 10.2 Testing Endpoints Locally via cURL
```bash
# Start local development server
npm run dev:web

# 1. Test unauthorized rejection (should return HTTP 401)
curl -i http://localhost:3000/api/cron/notifications

# 2. Test valid invocation with Bearer token (should return HTTP 200)
curl -i -X POST http://localhost:3000/api/cron/notifications \
  -H "Authorization: Bearer test-cron-secret-12345" \
  -H "Content-Type: application/json" \
  -d '{"batchSize": 25}'

# 3. Test daily maintenance cron (should return HTTP 200)
curl -i -X POST http://localhost:3000/api/cron/daily \
  -H "Authorization: Bearer test-cron-secret-12345"
```

---

## 11. Environment Variables Reference

Ensure the following variables are configured in Vercel (**Settings** -> **Environment Variables**):

| Variable Name | Environment | Purpose | Sensitivity |
| :--- | :--- | :--- | :--- |
| `CRON_SECRET` | Preview & Production | Bearer token authenticating Vercel Cron and external webhooks | High Secret |
| `SUPABASE_SERVICE_ROLE_KEY` | Preview & Production | Server-side key for PostgreSQL stored procedure execution | High Secret |
| `NEXT_PUBLIC_SUPABASE_URL` | Preview & Production | Supabase project endpoint URL | Public |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY`| Preview & Production | Public anon key for client sessions | Public |
| `EXPO_ACCESS_TOKEN` | Preview & Production | Expo Push Service access token | High Secret |
| `VERCEL_APP_URL` | GitHub Actions Secret| Target deployment URL for scheduled curl triggers | Secret |
