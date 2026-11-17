# AUVRYN — Controlled School Pilot Release Notes (v1.0.0-RC1)

**Release Version:** 1.0.0-RC1  
**Build Date:** 2026-11-15  
**Platform Architecture:** Next.js 14 · Supabase PostgreSQL 17 · React Native / Expo 52 · TypeScript Monorepo  

---

## What is in this Release

This release candidate prepares AUVRYN for demonstration, evaluation, and live pilot testing with partner schools, junior colleges, and degree colleges.

### Highlights & Core Features

1. **Automated Attendance & Guardian Absence Alerts:**
   - Atomic batch submission of daily student attendance.
   - Immediate asynchronous resolution of verified guardians upon absence.
   - Outbox queue with idempotent delivery and automatic retry for Expo Push / FCM V1.
   - Immutable correction audit trail in `attendance_corrections`.

2. **Enterprise Multi-Tenant Security & Tenant Isolation:**
   - Strict Row-Level Security across all 123 institutional tables.
   - Fix search path on all SECURITY DEFINER functions (`public`, `auth`).
   - Hardened caller identity validation preventing client impersonation via `p_user_id`.
   - Dual-overload architecture preserved for `has_institution_role(uuid, membership_role[])` and `has_institution_role(uuid, text[])`.

3. **Financial Integrity & Fee Management:**
   - Atomic fee collection procedure (`record_fee_payment_atomic`) with balance allocation.
   - Automatic receipt sequencing (`generate_receipt_number`).
   - Overpayment handling with surplus credit to student advance wallets.
   - Immutability of financial ledgers enforced by PostgreSQL rules and RLS.
   - Real-time checkout checks requiring enabled gateway settings and credentials.

4. **Academic Scheduling & Conflict Detection:**
   - Multi-period timetable matrix with interactive slot allocation.
   - Database-level detection of teacher double-booking and room collisions.
   - Faculty substitution workflows for planned and unplanned leave.

5. **Parent & Student Web Portals:**
   - Clean, role-filtered portals for students and guardians.
   - Live attendance tracking, timetable, published exam results, and fee receipts.

6. **Android Mobile Application (Hermes Bytecode):**
   - Packaged and verified for EAS Project `edu-platform-mobile`.
   - Full session persistence, animated brand introduction, push token registration, and live driver GPS journey telemetry.

7. **Intelligent AI Companions:**
   - Student AI Tutor, Teacher Assistant, Parent Companion, and Owner Intelligence.
   - Strict human-in-the-loop review for all generated draft notices and announcements (`ai_draft_proposals`).
   - PII masking and syllabus source grounding.

---

## Automated Test Coverage Summary

- **TypeScript Typecheck:** 100% clean across monorepo (`@edu-platform/database`, `@edu-platform/supabase-client`, `@edu-platform/types`, `@edu-platform/validators`, `@edu-platform/web`, `@edu-platform/mobile`).
- **Unit Test Suite:** 26 test files, **361 / 361 tests passed** (100%).
- **Security & RLS Suite:** 16 test files, **190 / 190 tests passed** (100%).
- **Integration Test Suite:** 4 test files, **30 / 30 tests passed** (100%) against a real PostgreSQL 17 test cluster with 123 tables.
- **Production Web Build:** Next.js 14 compiled 109 routes cleanly with static and dynamic server optimization.
- **Mobile Bundle:** Hermes bytecode export completed with 770 modules and assets resolved.
