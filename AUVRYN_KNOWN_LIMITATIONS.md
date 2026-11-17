# AUVRYN — Known System Boundaries & Operational Limitations

**Platform:** AUVRYN — The Intelligent Education Ecosystem  
**Evaluation Standard:** Full Disclosure & Pre-Pilot Transparency  
**Current Release Status:** **`READY FOR CONTROLLED SCHOOL PILOT`**

---

## 1. Online Payment Gateway Status: Disabled Until Live Merchant Setup

- **Current State:** Online checkout via Razorpay and Stripe is mathematically verified and tested, but intentionally **disabled** in the default platform configuration.
- **Why It Is Gated:** Under institutional financial integrity rules, online payment orders and webhooks cannot operate safely without live institutional merchant credentials (`gateway_key_id` and `webhook_secret_ciphertext`). Zero mock payment simulations are allowed in production.
- **Compensating Workflow:** Complete offline counter fee collection (cash, cheque, demand draft, bank transfer) is **100% operational and verified**. Cashier staff can issue sequential `REC-2026-` receipts, record immutable ledger entries, and manage student advance balances immediately.
- **Pilot Impact:** Pilot institutions can operate all financial accounting, fee assignments, and receipt generation via counter workflows without waiting for payment gateway merchant KYC.

---

## 2. Parent Push Notification Delivery: Hardware Not Verified

- **Current State:** The database-side outbox queue, idempotency keying, and background worker claiming (`claim_notification_deliveries`) are verified in automated test suites. However, delivery to physical Android notification trays is classified as **`NOT VERIFIED`**.
- **Why It Is Not Verified:** Physical display on end-user hardware requires an active Android test device with Google Play Services connected over-the-air to Google FCM V1 / EAS networks.
- **Pilot Verification Protocol:** Physical push receipt will be verified on-site by the founder using the dry-run procedure in [docs/AUVRYN_DEPLOYMENT_RUNBOOK.md](file:///C:/Users/hrixo/OneDrive/Desktop/School/docs/AUVRYN_DEPLOYMENT_RUNBOOK.md).
- **Compensating Safeguard:** Upon launching the parent portal or mobile app, any unread attendance alerts populate immediately in the in-app notification center via Supabase Realtime channels.

---

## 3. Database Migration 17 Staged (Not Applied in Production)

- **Current State:** Migration `20261115000000_automatic_absence_notifications.sql` is staged locally and tested against PostgreSQL 17 clusters, but has **not been applied to production Supabase (`dhgdjpjgsvbknquetecl`)**.
- **Current Observation:** The production database preflight returns `DATABASE PREFLIGHT PASS` with `attendance_rpc_hardening_status = PENDING_HARDENING_BY_MIGRATION_20261115000000`.
- **Reason:** In strict compliance with zero-production-mutation policies, AI agents are prohibited from executing DDL/DML on production. The founder must execute Migration 17 via the Supabase Dashboard SQL Editor using the deployment runbook.

---

## 4. In-Database Session Settings Are Not Authoritative Project Identity

- **Observation:** In PostgreSQL, custom session variables (such as `app.environment` and `app.allow_pilot_seed`) can be manipulated by any SQL Editor user with `SET ...`. In Supabase Cloud, `current_database()` always returns `'postgres'`, which fails to identify the project.
- **Operational Boundary:** Direct manual execution of `scripts/seed-staging-pilot.sql` via the Supabase Dashboard SQL Editor is permanently blocked. Staging seed execution is permitted **only** through the certified runner wrappers (`scripts/seed-staging.cjs` or `scripts/seed-staging.ps1`), which authoritatively validate the actual Supabase project reference and explicitly reject production.

---

## 5. Aggressive Android Battery Optimization Delays

- **Observation:** Certain aggressive Android OEM ROMs (e.g., Xiaomi MIUI/HyperOS, Oppo ColorOS, Vivo FuntouchOS) aggressively kill background services or put network connections to sleep when the device is locked.
- **Impact:** Background push notifications may experience a delivery delay on those specific OEM devices until the user wakes the screen or opens the app.
- **Compensating Control:** AUVRYN implements high-priority FCM V1 payloads (`priority: 'high'`) and updates in-app notification badges immediately upon app foregrounding via Supabase Realtime channels.

---

## 6. SMS & WhatsApp Telephony Gateways Require DLT Registration

- **Observation:** While the notification subsystem supports multi-channel dispatch (`in_app`, `push`, `email`, `sms`, `whatsapp`), SMS dispatch in India requires government DLT (Distributed Ledger Technology) template registration and commercial Twilio/Gupshup sender IDs.
- **Current Setup:** `in_app` and `push` notifications are active. SMS and WhatsApp adapters are staged in code but disabled in default institutional settings pending school-specific DLT sender ID approval.

---

## 7. AI Feature Graceful Degradation

- **Observation:** AUVRYN's Student AI Tutor and Parent AI Companion integrate with Google Gemini models.
- **Graceful Fallback:** If `GEMINI_API_KEY` is not provided in the environment, the AI gateway gracefully degrades to deterministic, rule-based academic responses without throwing application crashes or unhandled exceptions.
