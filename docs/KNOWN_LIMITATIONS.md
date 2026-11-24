# AUVRYN — Known Limitations & Operational Boundaries

**Version:** 1.0.0-staging  
**Target Release Phase:** Controlled Staging & Educational Pilot  
**Audit Date:** November 21, 2026  
**Auditor:** QA Lead & Deployment Architect  

---

## 1. External Service & Credential Dependencies

1. **Push Notifications & Physical Handset Delivery:**
   - **Status**: The notification pipeline—outbox table, worker batch claiming (`FOR UPDATE SKIP LOCKED`), retry backoff, Android channels, and `PushDeliveryAdapter`—is 100% verified in code and integration tests.
   - **Hardware Reality**: **Physical visual display of push notifications on real Android smartphone hardware has not been physically verified in automated test runs**. A physical Android device and live `EXPO_ACCESS_TOKEN` are required to complete this verification during pilot onboarding.
   - **Fallback**: In-app notifications deliver reliably via Supabase Realtime and database queries regardless of push token status.

2. **Dedicated Remote Staging Supabase Project:**
   - **Status**: Local integration testing is 100% complete across 19 migrations and 127 tables on PostgreSQL 17.
   - **Limitation**: A dedicated remote Supabase project for staging has **not yet been provisioned** by the project administrator. All staging instructions and migrations are cataloged and ready for execution.

3. **Staging Hosting Service:**
   - **Status**: The Next.js 14 production web build compiles cleanly across 113 routes, and local server startup with `/api/health` probe passes with HTTP 200.
   - **Limitation**: A remote staging web hosting service (Render / Vercel preview) has not yet been connected to the repository. The exact configuration parameters are documented in `docs/STAGING_DEPLOYMENT_GUIDE.md`.

4. **Vehicle GPS Live Tracking Hardware:**
   - **Status**: Driver GPS telemetry API and backend RPC authorization are verified via integration tests.
   - **Limitation**: Real-time continuous bus tracking requires an active physical Android handset running the mobile app in the vehicle during transit.

5. **Self-Service Online Payment Checkout:**
   - **Status**: Offline counter fee collections (Cash, Cheque, Demand Draft, Bank Transfer / UPI Ref) are 100% operational with atomic transactions, auto-sequencing receipts, and immutable ledger entries.
   - **Limitation**: Online credit card / payment gateway checkouts require the institution to configure live merchant keys (Razorpay/Stripe) in Fee Settings.

---

## 2. Platform Boundaries & Pilot Safeguards

1. **AI Safeguard Guardrails:**
   - The AI ecosystem is strictly advisory. The AI cannot directly alter authoritative financial records, attendance records, student grades, or examination marks.
   - All AI-generated circulars or report summaries require human review and administrator approval before publishing (`ai_draft_proposals`).
2. **Identity & Aadhaar Compliance:**
   - Raw Aadhaar numbers are never stored in the database. Verhoeff checksum validation is enforced client-side, followed by 12-digit masking (`•••• •••• 1234`) and SHA-256 duplicate hashing.
3. **Continuous Location Privacy:**
   - Transport tracking is strictly restricted to authorized drivers during active journeys. Continuous tracking of students or parents outside designated trips is not supported.

---

## 3. Workflows Scheduled for Commercial Phase Expansion

1. **Physical Biometric Turnstiles**:
   - Hardware integration with physical RFID turnstiles and biometric fingerprint readers. (The database schema and webhook endpoints are prepared).
2. **Direct SMS / WhatsApp Gateway**:
   - Direct integration with telecom SMS aggregators (Twilio, Gupshup) for SMS circular fallbacks.
3. **Automated Offline Sync**:
   - Local SQLite caching on mobile devices for offline roll call in areas with zero cellular connectivity.
