# Milestone 8: Universal Fees & Payments Management

## 1. Architectural Overview & Universal Design

Milestone 8 introduces a comprehensive, multi-tenant financial engine and payment processing core engineered to handle every institutional archetype:
- **K-12 Schools**: Annual tuition, admission/registration fees, transport route tiers, term-based installments, and sibling discounts.
- **Junior / Intermediate Colleges**: State board exam fees, tuition fees, and laboratory fee allocations.
- **Degree Colleges**: Semester-wise fee schedules, practical/lab charges, library subscriptions, and university affiliation levies.
- **Engineering Colleges**: Autonomous credit-based fee structures, multi-installment payment plans, training & placement charges, and caution deposits.
- **Universities**: Multi-program departmental tuition, hostel & mess subscriptions, research laboratory fees, international student fees, and merit scholarships.

The engine unifies all financial operations into an **Immutable Financial Ledger** with strict Row-Level Security (RLS), atomic PostgreSQL stored procedures, and a responsive Next.js 14 web application.

```
+-------------------------------------------------------------------------------------------------------------------------+
|                                    UNIVERSAL FEES & PAYMENTS ARCHITECTURE                                               |
+-------------------------------------------------------------------------------------------------------------------------+
|  Fee Heads (Category, Code, Refundable, Tax Exempt, Active)                                                            |
|    |                                                                                                                    |
|    +---> Master Fee Structures (Academic Year, Campus, Program, Class, Term, Total Amount, Currency)                    |
|    |       |                                                                                                            |
|    |       +---> Fee Structure Items (Head, Amount, Mandatory, Sequence Order)                                          |
|    |       +---> Fee Structure Installments (Installment Number, Name, Percentage Share, Due Date, Late Fee Policy)     |
|    |                                                                                                                    |
|    +---> Student Fee Assignments (Linked to Student & Enrollment, Gross, Discounts, Net Due, Paid, Balance, Status)     |
|    |       |                                                                                                            |
|    |       +---> Student Fee Installments (Due Date, Installment Amount, Paid Amount, Balance Amount, Late Fine)        |
|    |       +---> Concessions & Scholarships (Merit, Sibling, Staff-Ward, Need-based, Dual-Control Approval)            |
|    |                                                                                                                    |
|    +---> Payment Collection Engine (Cash, UPI, Card, Bank Transfer, Gateway, Cheque, DD, Advance Wallet)               |
|    |       |                                                                                                            |
|    |       +---> Payment Allocations (Allocates payment across Fee Heads & Installments)                                |
|    |       +---> Overpayment Retention (Excess payment credited to Student Advance Wallet; never discarded)             |
|    |       +---> Sequential Receipt Numbering (Collision-Proof `RCP-2026-000001` with Tamper-Proof Cryptographic Hash)   |
|    |                                                                                                                    |
|    +---> Immutable Financial Ledger (Append-only debit/credit journal; PostgreSQL DO INSTEAD NOTHING rules)            |
|    |                                                                                                                    |
|    +---> Refund & Reversal Lifecycle (Requested -> Under Review -> Authorized -> Disbursed; Reversal Ledger Record)    |
|    |                                                                                                                    |
|    +---> Payment Gateway Abstraction (Razorpay / Stripe Provider-Independent Layer, Webhook Idempotency & Signatures)  |
+-------------------------------------------------------------------------------------------------------------------------+
```

---

## 2. Database Schema & Migration Architecture

Canonical migration files:
- Up migration: `supabase/migrations/20261105070000_fees_payments.sql`
- Rollback migration: `supabase/migrations/rollback/20261105070000_rollback.sql`

### 2.1 Enums Defined
1. `fee_category`: `'tuition'`, `'admission'`, `'registration'`, `'examination'`, `'laboratory'`, `'library'`, `'transport'`, `'hostel'`, `'fine'`, `'deposit'`, `'other'`.
2. `fee_payment_method`: `'cash'`, `'upi'`, `'bank_transfer'`, `'card'`, `'payment_gateway'`, `'cheque'`, `'demand_draft'`, `'advance_wallet'`.
3. `fee_payment_status`: `'pending'`, `'completed'`, `'failed'`, `'cancelled'`, `'refunded'`, `'partially_refunded'`.
4. `fee_assignment_status`: `'draft'`, `'assigned'`, `'partially_paid'`, `'paid'`, `'overdue'`, `'waived'`, `'cancelled'`.
5. `fee_installment_status`: `'pending'`, `'partially_paid'`, `'paid'`, `'overdue'`, `'waived'`.
6. `concession_type`: `'merit_scholarship'`, `'need_based'`, `'sibling_discount'`, `'staff_child'`, `'sports_quota'`, `'institutional_waiver'`, `'custom'`.
7. `concession_calculation_type`: `'percentage'`, `'fixed_amount'`.
8. `concession_status`: `'requested'`, `'under_review'`, `'approved'`, `'rejected'`, `'revoked'`.
9. `refund_status`: `'requested'`, `'under_review'`, `'approved'`, `'rejected'`, `'processed'`, `'cancelled'`.
10. `financial_ledger_entry_type`: `'fee_charged'`, `'fee_reversal'`, `'payment_received'`, `'payment_bounce'`, `'concession_applied'`, `'concession_revoked'`, `'refund_issued'`, `'advance_credit'`, `'advance_debit'`, `'fine_assessed'`, `'fine_waived'`.
11. `gateway_order_status`: `'created'`, `'attempted'`, `'paid'`, `'failed'`, `'expired'`.

### 2.2 16 Database Tables Created
1. `institution_fee_settings`: Configurable receipt/invoice prefixes, sequential counters, late fee rules, grace periods, currency, and gateway keys.
2. `fee_heads`: Master catalog of fee types (Tuition, Lab, Transport, Library, etc.).
3. `fee_structures`: Master multi-head fee configurations scoped by academic year, campus, program, and class.
4. `fee_structure_items`: Itemized fee heads and amounts for a fee structure.
5. `fee_structure_installments`: Installment percentages and due dates for a fee structure.
6. `student_fee_assignments`: Student-specific fee assignment bound to their active academic enrollment.
7. `student_fee_assignment_items`: Individual fee head breakdowns per student.
8. `student_fee_installments`: Installment schedule with paid balances and late fee tracking per student.
9. `fee_concessions`: Scholarships, sibling discounts, and fee reductions with mandatory justification and dual approval.
10. `fee_payments`: Payment transaction records, receipt numbers, and payment details.
11. `payment_allocations`: Sub-allocations linking payments to specific fee heads or installments.
12. `student_advance_balances`: Advance wallet balances holding excess payments for future terms.
13. `financial_ledger_entries`: Append-only, immutable debit/credit journal of all financial movements.
14. `fee_refund_requests`: Controlled refund requests and disbursement authorizations.
15. `gateway_orders`: Provider-independent payment gateway order records.
16. `gateway_webhook_events`: Idempotent payment webhook event journal with SHA-256 signature verification.

### 2.3 Stored Procedures & Atomic Procedures
1. `generate_receipt_number(p_institution_id, p_prefix)`: Collision-proof sequential numbering using `SELECT ... FOR UPDATE` row locks.
2. `record_fee_payment_atomic(...)`: Atomic payment recording, multi-head allocation, installment status progression, advance wallet credit, and financial ledger entry creation.
3. `approve_fee_concession_atomic(...)`: Enforces dual-control separation of duty (requester cannot approve their own concession), recalculates balances, and records `concession_applied` in the ledger.
4. `process_fee_refund_atomic(...)`: Validates refund ceiling, disburses via requested payment method or advance wallet, and records `refund_issued` in the ledger.
5. `process_gateway_webhook_idempotent(...)`: Deduplicates webhook deliveries via unique event IDs.

---

## 3. Strict Separation of Duties & RBAC Matrix

To prevent fraud and maintain institutional compliance, Milestone 8 enforces separation of duties:
- **Accountants**: Can collect counter payments (`fees:collect`), apply for concessions (`fees:concession_apply`), request refunds (`fees:refund_request`), and view collection reports (`fees:reports_view`). **Accountants strictly CANNOT approve concessions (`fees:concession_approve`) or approve refunds (`fees:refund_approve`)**.
- **Institutional Administrators (Owners / Admins)**: Hold approval authority over concessions and refunds.
- **Anti-Self-Approval Check**: Even administrators cannot approve a concession or refund that they personally requested:
  ```sql
  IF v_concession.requested_by = p_approved_by THEN
    RAISE EXCEPTION 'Separation of Duty: Requester cannot approve their own concession request';
  END IF;
  ```
- **Students & Parents**: View-only access (`fees:view`, `receipts:view`) strictly limited to their own student record or verified linked children.

| Role | fees:view | fees:collect | fees:assign | fees:concession_apply | fees:concession_approve | fees:refund_request | fees:refund_approve | fees:reports_view |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| **Owner** | Yes | Yes | Yes | Yes | **Yes** | Yes | **Yes** | Yes |
| **Admin** | Yes | Yes | Yes | Yes | **Yes** | Yes | **Yes** | Yes |
| **Accountant** | Yes | **Yes** | No | **Yes** | **NO** | **Yes** | **NO** | Yes |
| **Academic Admin** | Yes | No | Yes | No | No | No | No | Yes |
| **Admissions Officer** | Yes | No | No | No | No | No | No | No |
| **Student** | **Own Only** | No | No | No | No | No | No | No |
| **Parent** | **Child Only** | No | No | No | No | No | No | No |

---

## 4. Immutable Financial Ledger & Overpayment Handling

### 4.1 Immutability Guarantee
Completed payments and ledger records can **never** be deleted or silently modified.
```sql
CREATE OR REPLACE RULE financial_ledger_no_update AS
ON UPDATE TO public.financial_ledger_entries DO INSTEAD NOTHING;

CREATE OR REPLACE RULE financial_ledger_no_delete AS
ON DELETE TO public.financial_ledger_entries DO INSTEAD NOTHING;
```
Financial corrections are made strictly by appending reversal journal entries (`fee_reversal`, `payment_bounce`, `concession_revoked`).

### 4.2 Overpayment & Advance Wallet
If a student or parent pays more than their outstanding balance:
1. Outstanding dues are settled in full (`balance_amount = 0`, `status = 'paid'`).
2. The remaining excess is credited to `student_advance_balances` (`advance_credit_amount > 0`).
3. An `advance_credit` journal entry is appended to `financial_ledger_entries`.
4. Excess funds can be drawn down as `advance_wallet` payment against subsequent term fees. Money is never silently discarded.

---

## 5. Collision-Proof Receipts & Cryptographic QR Verification

Receipt numbering format:
$$\text{Receipt Number} = \text{PREFIX} - \text{YYYY} - \text{SEQ (6 digits)}$$
Example: `RCP-2026-000001`.

Concurrent counter payments increment `last_receipt_seq` atomically in `institution_fee_settings` under row-level lock.

### Public QR Verification
Every receipt generates an authentic SHA-256 validation hash:
$$\text{Hash} = \text{SHA256}(\text{institution\_id} \parallel \text{receipt\_number} \parallel \text{amount\_received} \parallel \text{payment\_date})$$
The public QR code and hash can be verified without exposing student private PII (such as home address, phone number, or academic grades).

---

## 6. Web Dashboard Routes & UI Implementation

All 11 required web routes were implemented with real database integrations and strict tenant isolation:

1. `/dashboard/fees`: Executive financial dashboard displaying real metrics (Total Assigned, Total Collected, Outstanding Balance, Overdue Amount, Collection Rate %, and Student Advance Wallet).
2. `/dashboard/fees/structures`: Master fee structures directory filterable by academic year, campus, and class with itemized head breakdowns.
3. `/dashboard/fees/structures/new`: Fee structure authoring wizard with dynamic line items and installment percentage validation (must sum to 100%).
4. `/dashboard/fees/assignments`: Student fee assignments ledger, balance tracking, and installment schedule modals.
5. `/dashboard/fees/collections`: Complete payment transaction ledger with method filters and receipt links.
6. `/dashboard/fees/collections/new`: Counter payment recording form with overpayment calculation and automatic receipt generation.
7. `/dashboard/fees/receipts`: Official printable receipt viewer with print-optimized CSS and tamper-proof verification hash.
8. `/dashboard/fees/refunds`: Governed refund requests and dual-control administrative approval modal.
9. `/dashboard/fees/concessions`: Scholarships and discount requests with administrative approval modal.
10. `/dashboard/fees/reports`: Financial analytics, category breakdowns, payment mode distribution, overdue aging schedules, and CSV ledger export.
11. `/dashboard/fees/settings`: Institutional fee configuration, receipt/invoice prefixes, daily late fees, grace periods, and payment gateway keys.

---

## 7. Testing & Quality Gates Verification

### 7.1 Vitest Unit & Security Test Suite
- Total test files: **17 passed (17)**
- Total tests: **208 passed (208)**
- Duration: 5.10s

```
 ✓ tests/security/academic-rls.test.ts (11 tests)
 ✓ tests/security/attendance-security.test.ts (6 tests)
 ✓ tests/security/rls-simulation.test.ts (5 tests)
 ✓ tests/security/exam-security.test.ts (14 tests)
 ✓ tests/security/fee-security.test.ts (11 tests)
 ✓ tests/security/timetable-conflict.test.ts (6 tests)
 ✓ tests/security/staff-security.test.ts (5 tests)
 ✓ tests/security/student-security.test.ts (5 tests)
 ✓ tests/unit/rbac.test.ts (14 tests)
 ✓ tests/unit/validators.test.ts (8 tests)
 ✓ tests/unit/exam-validators.test.ts (19 tests)
 ✓ tests/unit/student-validators.test.ts (14 tests)
 ✓ tests/unit/staff-validators.test.ts (18 tests)
 ✓ tests/unit/attendance-validators.test.ts (19 tests)
 ✓ tests/unit/timetable-validators.test.ts (19 tests)
 ✓ tests/unit/fee-validators.test.ts (19 tests)
 ✓ tests/unit/academic-validators.test.ts (15 tests)
```

### 7.2 Multi-Workspace Typecheck
```
> npm run typecheck
✓ @edu-platform/database: tsc --noEmit (0 errors)
✓ @edu-platform/supabase-client: tsc --noEmit (0 errors)
✓ @edu-platform/types: tsc --noEmit (0 errors)
✓ @edu-platform/validators: tsc --noEmit (0 errors)
✓ @edu-platform/mobile: tsc --noEmit (0 errors)
✓ @edu-platform/web: tsc --noEmit (0 errors)
```

### 7.3 Next.js Production Build
```
> npx --workspace=@edu-platform/web next build
✓ Compiled successfully
✓ Linting and checking validity of types
✓ Collecting page data
✓ Generating static pages (57/57)
✓ Finalizing page optimization
```
All 57 routes compiled and bundled into production-ready static/dynamic chunks.

---

## 8. Known Limitations & Production Readiness

1. **Payment Gateway Credentials**: Production deployment requires institutional administrators to configure live API keys (`key_id`, `key_secret`, and `webhook_secret`) in `/dashboard/fees/settings` or via environment variables (`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`). The current architecture safely simulates online checkout in test mode without exposing secrets.
2. **PostgreSQL RLS Live Verification**: RLS verification test suite (`supabase/tests/rls_security_verification.sql`) has been augmented with Tests 27–30 covering fee heads, cross-tenant creation blocking, and stranger access isolation. It is ready for execution against live Supabase / PostgreSQL instances.
3. **No Mock Data in Production**: All views render real data from the database or honest empty states when no records exist.
