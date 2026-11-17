# AUVRYN — Known Limitations & Pilot Operational Boundaries

**Version:** 1.0.0 Release Candidate  
**Target Release Phase:** Controlled School Pilot  
**Audit Evaluation:** Independent CTO & Database Security Audit  
**Date:** 2026-11-15  

---

## 1. External Service & Credential Dependencies

The following integrations require institution-specific or production API credentials:

1. **Push Notifications & Physical Device Receipt:**
   - **Configuration:** Mobile push notifications require Expo Application Services (EAS) push certificates and the Firebase service account. FCM V1 credentials have been configured in EAS for Android package `com.school0730.eduplatformmobile` (Project ID `bbf92a69-9c4f-4395-9d10-69c0893ecb69`, Firebase project `auvryn-63772`).
   - **Automated Verification vs. Hardware Reality:** The outbox queue, worker claiming with `FOR UPDATE SKIP LOCKED`, resolution logic, retry backoff, and adapter formatting are 100% verified against live PostgreSQL 17 test clusters and mock adapters. However, **physical visual display of push notifications on real Android smartphone hardware has not been physically demonstrated in automated CI test runs**. Pilot onboarding requires the school administrator to complete an in-person physical dry-run with a real Android device.
   - **Worker Credentials:** The server-side outbox worker requires `EXPO_ACCESS_TOKEN` set in Vercel environment variables to authenticate with `https://exp.host/--/api/v2/push/send`.
   - **In-App Fallback:** If an end user denies push notification permissions or is running on an unconfigured device, notifications still deliver cleanly to the in-app notification tray via Supabase Realtime and database queries.

2. **Online Payment Gateways (Razorpay / Stripe):**
   - **Offline Operations (100% Operational):** Offline counter fee collection (Cash, Cheque, Demand Draft, Bank Transfer / UPI Ref) is fully operational with atomic transactions, auto-sequenced receipts, and immutable ledger entries. Only authorized finance staff can record or verify fee payments.
   - **Online Checkout:** Self-service online student gateway checkout requires the institution to enter verified merchant credentials (`gateway_key_id`, webhook secret) in Fee Settings.
   - **Webhook Receiver:** A production webhook endpoint (`/api/webhooks/payments`) with HMAC signature verification is scheduled for the commercial phase. For the school pilot, all fee collections should proceed through the verified offline counter collection workflow.

3. **Google Gemini Generative AI:**
   - AI Tutor, Teacher Assistant, Parent Companion, and Executive Intelligence require `GEMINI_API_KEY` configured in Supabase Edge Function secrets for the `ai-gateway` function.
   - In offline test environments without an active key, the system automatically uses the deterministic `MockAIAdapter`.

4. **Background Cron Execution:**
   - Outbox processing (`/api/cron/notifications`) requires `CRON_SECRET` configured in Vercel to authenticate HTTP triggers initiated by Vercel Cron.

---

## 2. Platform Boundaries & Pilot Safeguards

1. **AI Safeguard Guardrails:**
   - The AI ecosystem is strictly advisory. The AI cannot directly alter authoritative financial records, attendance records, student grades, or examination marks.
   - All AI-generated announcements or report draft summaries require human review and administrator approval before publishing (`ai_draft_proposals`).
2. **Continuous Location Privacy:**
   - Transport tracking is intentionally limited to authorized drivers during active journeys (`isGpsSharingActive`). AUVRYN does not support continuous background tracking of students or parents outside of designated school transport trips.
3. **Database Migration Preconditions:**
   - Pending migration `20261115000000_automatic_absence_notifications.sql` must be applied in the Supabase Dashboard SQL Editor prior to enabling the automatic absence cron job.

---

## 3. Workflows Scheduled for Commercial Phase Expansion

1. **Biometric Hardware Integration:**
   - Direct IoT synchronization with physical fingerprint scanners and RFID turnstiles (a REST/database webhook ingestion schema is already available).
2. **Direct SMS Gateway Integration:**
   - SMS delivery via Twilio / MSG91 alongside Push and In-App channels.
3. **Native iOS App Store Packaging:**
   - The React Native / Expo codebase is shared and iOS-compatible, awaiting school institutional Apple Developer Enterprise account enrollment.
