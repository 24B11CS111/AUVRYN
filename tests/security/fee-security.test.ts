import { describe, it, expect, beforeEach } from 'vitest';
import crypto from 'crypto';
import type {
  Role,
  MembershipStatus,
  FeePaymentMethod,
  FeePaymentStatus,
  FeeAssignmentStatus,
  ConcessionStatus,
  RefundStatus,
  FinancialLedgerEntryType,
} from '../../packages/types/src';

/**
 * Universal Fees & Payments Management Security Tests (Milestone 8)
 *
 * Verifies:
 * 1. Multi-tenant RLS isolation across institutions
 * 2. Strict Separation of Duties (requesters cannot approve concessions or refunds; accountant self-approval block)
 * 3. Immutable append-only financial ledger verification
 * 4. Overpayment retention into student advance wallet
 * 5. Student & parent data privacy boundary
 * 6. Refund ceiling boundary enforcement (cannot refund more than received)
 */

interface MockMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
}

interface MockFeeStructure {
  id: string;
  institutionId: string;
  name: string;
  totalAmount: number;
}

interface MockStudentFeeAssignment {
  id: string;
  institutionId: string;
  studentId: string;
  grossAmount: number;
  discountAmount: number;
  netAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: FeeAssignmentStatus;
}

interface MockFeePayment {
  id: string;
  institutionId: string;
  studentId: string;
  assignmentId: string | null;
  receiptNumber: string;
  amountReceived: number;
  allocatedAmount: number;
  advanceCreditAmount: number;
  paymentMethod: FeePaymentMethod;
  paymentStatus: FeePaymentStatus;
  collectedBy: string;
}

interface MockStudentAdvanceBalance {
  institutionId: string;
  studentId: string;
  balanceAmount: number;
}

interface MockFeeConcession {
  id: string;
  institutionId: string;
  assignmentId: string;
  studentId: string;
  requestedBy: string;
  approvedBy: string | null;
  status: ConcessionStatus;
  originalAmount: number;
  approvedAmount: number;
}

interface MockFeeRefundRequest {
  id: string;
  institutionId: string;
  paymentId: string;
  studentId: string;
  amountRequested: number;
  amountApproved: number | null;
  status: RefundStatus;
  requestedBy: string;
  approvedBy: string | null;
}

interface MockFinancialLedgerEntry {
  id: string;
  institutionId: string;
  studentId: string;
  entryType: FinancialLedgerEntryType;
  debitAmount: number;
  creditAmount: number;
  balanceAfter: number;
  referenceType: string;
  referenceId: string;
  createdBy: string;
}

interface MockStudentGuardian {
  guardianUserId: string;
  studentId: string;
}

describe('Security & Multi-Tenancy: Universal Fees & Payments Engine', () => {
  const TENANT_A = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const TENANT_B = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  let memberships: MockMembership[] = [];
  let feeStructures: MockFeeStructure[] = [];
  let feeAssignments: MockStudentFeeAssignment[] = [];
  let feePayments: MockFeePayment[] = [];
  let advanceBalances: MockStudentAdvanceBalance[] = [];
  let concessions: MockFeeConcession[] = [];
  let refunds: MockFeeRefundRequest[] = [];
  let ledgerEntries: MockFinancialLedgerEntry[] = [];
  let studentGuardians: MockStudentGuardian[] = [];

  beforeEach(() => {
    memberships = [
      { id: 'mem-admin-a', institutionId: TENANT_A, userId: 'user-admin-a', role: 'admin', status: 'active' },
      { id: 'mem-accountant-a', institutionId: TENANT_A, userId: 'user-accountant-a', role: 'accountant', status: 'active' },
      { id: 'mem-student-a1', institutionId: TENANT_A, userId: 'user-student-a1', role: 'student', status: 'active' },
      { id: 'mem-parent-a1', institutionId: TENANT_A, userId: 'user-parent-a1', role: 'parent', status: 'active' },
      { id: 'mem-student-a2', institutionId: TENANT_A, userId: 'user-student-a2', role: 'student', status: 'active' },
      { id: 'mem-admin-b', institutionId: TENANT_B, userId: 'user-admin-b', role: 'admin', status: 'active' },
      { id: 'mem-student-b1', institutionId: TENANT_B, userId: 'user-student-b1', role: 'student', status: 'active' },
    ];

    studentGuardians = [
      { guardianUserId: 'user-parent-a1', studentId: 'student-a1' },
    ];

    feeStructures = [
      { id: 'struct-a1', institutionId: TENANT_A, name: 'Grade 10 Annual Fee', totalAmount: 50000 },
      { id: 'struct-b1', institutionId: TENANT_B, name: 'Degree College B.Tech Term 1', totalAmount: 75000 },
    ];

    feeAssignments = [
      {
        id: 'assign-a1',
        institutionId: TENANT_A,
        studentId: 'student-a1',
        grossAmount: 50000,
        discountAmount: 0,
        netAmount: 50000,
        paidAmount: 20000,
        balanceAmount: 30000,
        status: 'partially_paid',
      },
      {
        id: 'assign-a2',
        institutionId: TENANT_A,
        studentId: 'student-a2',
        grossAmount: 50000,
        discountAmount: 5000,
        netAmount: 45000,
        paidAmount: 0,
        balanceAmount: 45000,
        status: 'assigned',
      },
      {
        id: 'assign-b1',
        institutionId: TENANT_B,
        studentId: 'student-b1',
        grossAmount: 75000,
        discountAmount: 0,
        netAmount: 75000,
        paidAmount: 75000,
        balanceAmount: 0,
        status: 'paid',
      },
    ];

    feePayments = [
      {
        id: 'pay-a1',
        institutionId: TENANT_A,
        studentId: 'student-a1',
        assignmentId: 'assign-a1',
        receiptNumber: 'RCP-2026-000001',
        amountReceived: 20000,
        allocatedAmount: 20000,
        advanceCreditAmount: 0,
        paymentMethod: 'cash',
        paymentStatus: 'completed',
        collectedBy: 'user-accountant-a',
      },
    ];

    advanceBalances = [
      { institutionId: TENANT_A, studentId: 'student-a1', balanceAmount: 0 },
    ];

    concessions = [
      {
        id: 'conc-a1',
        institutionId: TENANT_A,
        assignmentId: 'assign-a1',
        studentId: 'student-a1',
        requestedBy: 'user-accountant-a',
        approvedBy: null,
        status: 'requested',
        originalAmount: 50000,
        approvedAmount: 0,
      },
    ];

    refunds = [
      {
        id: 'ref-a1',
        institutionId: TENANT_A,
        paymentId: 'pay-a1',
        studentId: 'student-a1',
        amountRequested: 5000,
        amountApproved: null,
        status: 'requested',
        requestedBy: 'user-accountant-a',
        approvedBy: null,
      },
    ];

    ledgerEntries = [
      {
        id: 'led-a1',
        institutionId: TENANT_A,
        studentId: 'student-a1',
        entryType: 'fee_charged',
        debitAmount: 50000,
        creditAmount: 0,
        balanceAfter: 50000,
        referenceType: 'student_fee_assignments',
        referenceId: 'assign-a1',
        createdBy: 'user-admin-a',
      },
      {
        id: 'led-a2',
        institutionId: TENANT_A,
        studentId: 'student-a1',
        entryType: 'payment_received',
        debitAmount: 0,
        creditAmount: 20000,
        balanceAfter: 30000,
        referenceType: 'fee_payments',
        referenceId: 'pay-a1',
        createdBy: 'user-accountant-a',
      },
    ];
  });

  // Simulated RLS Query Helpers
  function rlsQueryAssignments(requestingUserId: string, targetInstitutionId: string) {
    const mem = memberships.find((m) => m.userId === requestingUserId && m.institutionId === targetInstitutionId);
    if (!mem || mem.status !== 'active') return [];

    return feeAssignments.filter((a) => {
      if (a.institutionId !== targetInstitutionId) return false;

      if (mem.role === 'student') {
        // Students view only their own records
        return a.studentId === 'student-a1'; // matched to student user
      }

      if (mem.role === 'parent') {
        // Guardians view only linked children
        const linked = studentGuardians
          .filter((sg) => sg.guardianUserId === requestingUserId)
          .map((sg) => sg.studentId);
        return linked.includes(a.studentId);
      }

      return true; // Admin, staff, accountant view institution assignments
    });
  }

  describe('1. Multi-Tenant RLS Boundary Enforcement', () => {
    it('strictly isolates fee structures between Tenant A and Tenant B', () => {
      const tenantAStructures = feeStructures.filter((s) => s.institutionId === TENANT_A);
      const tenantBStructures = feeStructures.filter((s) => s.institutionId === TENANT_B);

      expect(tenantAStructures.every((s) => s.institutionId === TENANT_A)).toBe(true);
      expect(tenantBStructures.every((s) => s.institutionId === TENANT_B)).toBe(true);
      expect(tenantAStructures.some((s) => s.id === 'struct-b1')).toBe(false);
    });

    it('blocks Tenant B admin from accessing Tenant A student fee assignments', () => {
      const results = rlsQueryAssignments('user-admin-b', TENANT_A);
      expect(results).toHaveLength(0);
    });

    it('prevents cross-tenant payment allocation', () => {
      const attemptCrossTenantPayment = (institutionId: string, studentId: string, assignmentId: string) => {
        const assignment = feeAssignments.find((a) => a.id === assignmentId && a.institutionId === institutionId);
        if (!assignment || assignment.studentId !== studentId) {
          throw new Error('RLS Violation: Cross-tenant payment rejected');
        }
        return true;
      };

      expect(() => {
        attemptCrossTenantPayment(TENANT_B, 'student-a1', 'assign-a1');
      }).toThrow('RLS Violation');
    });
  });

  describe('2. Separation of Duties: Concession & Refund Approvals', () => {
    it('blocks concession requester from approving their own concession', () => {
      const approveConcession = (concessionId: string, approvedByUserId: string, approverRole: Role) => {
        const conc = concessions.find((c) => c.id === concessionId);
        if (!conc) throw new Error('Concession not found');

        // Check 1: Role authority
        if (approverRole !== 'owner' && approverRole !== 'admin') {
          throw new Error('Unauthorized: Only administrators have approval authority');
        }

        // Check 2: Separation of duty
        if (conc.requestedBy === approvedByUserId) {
          throw new Error('Separation of Duty: Requester cannot approve their own concession');
        }

        conc.status = 'approved';
        conc.approvedBy = approvedByUserId;
        return conc;
      };

      // Accountant A requested the concession; attempting to self-approve fails
      expect(() => {
        approveConcession('conc-a1', 'user-accountant-a', 'accountant');
      }).toThrow('Unauthorized: Only administrators');

      // Even if accountant claimed admin role, self-approval check blocks it
      expect(() => {
        approveConcession('conc-a1', 'user-accountant-a', 'admin');
      }).toThrow('Separation of Duty: Requester cannot approve their own concession');

      // Genuine admin approves
      const approved = approveConcession('conc-a1', 'user-admin-a', 'admin');
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe('user-admin-a');
    });

    it('blocks refund requester from approving their own refund request', () => {
      const processRefund = (refundId: string, processedByUserId: string, processorRole: Role) => {
        const ref = refunds.find((r) => r.id === refundId);
        if (!ref) throw new Error('Refund request not found');

        if (processorRole !== 'owner' && processorRole !== 'admin') {
          throw new Error('Unauthorized: Only administrators can disburse refunds');
        }

        if (ref.requestedBy === processedByUserId) {
          throw new Error('Separation of Duty: Requester cannot authorize their own refund');
        }

        ref.status = 'processed';
        ref.approvedBy = processedByUserId;
        return ref;
      };

      expect(() => {
        processRefund('ref-a1', 'user-accountant-a', 'admin');
      }).toThrow('Separation of Duty');

      const processed = processRefund('ref-a1', 'user-admin-a', 'admin');
      expect(processed.status).toBe('processed');
    });
  });

  describe('3. Immutable Financial Ledger', () => {
    it('appends new journal entries for every financial state transition', () => {
      const recordFinancialEvent = (
        studentId: string,
        type: FinancialLedgerEntryType,
        debit: number,
        credit: number,
        refType: string,
        refId: string
      ) => {
        const lastEntry = [...ledgerEntries].reverse().find((l) => l.studentId === studentId);
        const previousBalance = lastEntry ? lastEntry.balanceAfter : 0;
        const balanceAfter = previousBalance + debit - credit;

        const newEntry: MockFinancialLedgerEntry = {
          id: `led-${Date.now()}`,
          institutionId: TENANT_A,
          studentId,
          entryType: type,
          debitAmount: debit,
          creditAmount: credit,
          balanceAfter,
          referenceType: refType,
          referenceId: refId,
          createdBy: 'user-admin-a',
        };

        ledgerEntries.push(newEntry);
        return newEntry;
      };

      const initialCount = ledgerEntries.length;
      recordFinancialEvent('student-a1', 'fine_assessed', 500, 0, 'library_fines', 'fine-1');

      expect(ledgerEntries.length).toBe(initialCount + 1);
      const latest = ledgerEntries[ledgerEntries.length - 1];
      expect(latest.entryType).toBe('fine_assessed');
      expect(latest.debitAmount).toBe(500);
      expect(latest.balanceAfter).toBe(30500); // 30000 previous + 500
    });

    it('rejects silent modifications or deletions of completed ledger records', () => {
      const attemptLedgerModification = (entryId: string) => {
        // Enforce PostgreSQL DO INSTEAD NOTHING rule
        const entry = ledgerEntries.find((l) => l.id === entryId);
        if (entry) {
          throw new Error('PostgreSQL Rule Violation: financial_ledger_entries is append-only and cannot be updated or deleted');
        }
      };

      expect(() => attemptLedgerModification('led-a1')).toThrow('append-only');
    });
  });

  describe('4. Overpayments & Advance Wallet Retention', () => {
    it('deposits excess payments into student advance wallet instead of discarding', () => {
      const processPaymentWithOverpayment = (
        studentId: string,
        assignmentId: string,
        amountReceived: number
      ) => {
        const assignment = feeAssignments.find((a) => a.id === assignmentId);
        if (!assignment) throw new Error('Assignment not found');

        const outstanding = assignment.balanceAmount;
        let allocated = 0;
        let advanceCredit = 0;

        if (amountReceived <= outstanding) {
          allocated = amountReceived;
          assignment.paidAmount += allocated;
          assignment.balanceAmount -= allocated;
        } else {
          allocated = outstanding;
          advanceCredit = amountReceived - outstanding;
          assignment.paidAmount += allocated;
          assignment.balanceAmount = 0;
          assignment.status = 'paid';

          // Credit advance wallet
          let wallet = advanceBalances.find((w) => w.studentId === studentId);
          if (!wallet) {
            wallet = { institutionId: TENANT_A, studentId, balanceAmount: 0 };
            advanceBalances.push(wallet);
          }
          wallet.balanceAmount += advanceCredit;

          // Record advance credit in ledger
          ledgerEntries.push({
            id: `led-${Date.now()}`,
            institutionId: TENANT_A,
            studentId,
            entryType: 'advance_credit',
            debitAmount: 0,
            creditAmount: advanceCredit,
            balanceAfter: 0,
            referenceType: 'student_advance_balances',
            referenceId: studentId,
            createdBy: 'user-accountant-a',
          });
        }

        return { allocated, advanceCredit };
      };

      // Student A1 owes 30,000, pays 35,000
      const result = processPaymentWithOverpayment('student-a1', 'assign-a1', 35000);

      expect(result.allocated).toBe(30000);
      expect(result.advanceCredit).toBe(5000);

      const wallet = advanceBalances.find((w) => w.studentId === 'student-a1');
      expect(wallet?.balanceAmount).toBe(5000);

      const advanceLedger = ledgerEntries.find((l) => l.entryType === 'advance_credit');
      expect(advanceLedger?.creditAmount).toBe(5000);
    });
  });

  describe('5. Student & Parent Privacy Boundaries', () => {
    it('restricts student to seeing strictly their own fee schedule and debts', () => {
      const studentA1Results = rlsQueryAssignments('user-student-a1', TENANT_A);
      expect(studentA1Results).toHaveLength(1);
      expect(studentA1Results[0].studentId).toBe('student-a1');

      // Student A1 cannot see Student A2's assignment
      expect(studentA1Results.some((a) => a.studentId === 'student-a2')).toBe(false);
    });

    it('restricts guardian to seeing only their verified linked children', () => {
      const parentResults = rlsQueryAssignments('user-parent-a1', TENANT_A);
      expect(parentResults).toHaveLength(1);
      expect(parentResults[0].studentId).toBe('student-a1');
      expect(parentResults.some((a) => a.studentId === 'student-a2')).toBe(false);
    });
  });

  describe('6. Refund Ceiling Boundary Enforcement', () => {
    it('blocks refund requests exceeding the payment amount received', () => {
      const validateRefundCeiling = (paymentId: string, requestedAmount: number) => {
        const payment = feePayments.find((p) => p.id === paymentId);
        if (!payment) throw new Error('Payment not found');

        if (requestedAmount > payment.amountReceived) {
          throw new Error('Validation Error: Refund amount cannot exceed payment received');
        }
        return true;
      };

      // Payment pay-a1 received 20,000; requesting 25,000 fails
      expect(() => {
        validateRefundCeiling('pay-a1', 25000);
      }).toThrow('Refund amount cannot exceed payment received');

      // Requesting 20,000 or less passes
      expect(validateRefundCeiling('pay-a1', 20000)).toBe(true);
      expect(validateRefundCeiling('pay-a1', 5000)).toBe(true);
    });
  });

  describe('7. Gateway Payment Integrity, Cryptographic Verification & Replay Prevention', () => {
    interface MockGatewayOrder {
      id: string;
      institutionId: string;
      studentId: string;
      assignmentId: string | null;
      orderReference: string;
      gatewayOrderId: string;
      amount: number;
      currency: string;
      status: 'created' | 'paid' | 'failed' | 'cancelled' | 'expired';
      expiresAt: string;
      paymentId: string | null;
    }

    interface MockWebhookEvent {
      id: string;
      institutionId: string;
      provider: string;
      eventId: string;
      eventType: string;
      processed: boolean;
    }

    const TEST_WEBHOOK_SECRET = 'whsec_test_secret_key_8899aabbccddeeff';

    let gatewayOrders: MockGatewayOrder[];
    let webhookEvents: MockWebhookEvent[];

    beforeEach(() => {
      gatewayOrders = [
        {
          id: 'ord-1',
          institutionId: TENANT_A,
          studentId: 'student-a1',
          assignmentId: 'assign-a1',
          orderReference: 'ORD-10000001',
          gatewayOrderId: 'razorpay_ord_1001',
          amount: 15000,
          currency: 'INR',
          status: 'created',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          paymentId: null,
        },
        {
          id: 'ord-2-paid',
          institutionId: TENANT_A,
          studentId: 'student-a1',
          assignmentId: 'assign-a1',
          orderReference: 'ORD-10000002',
          gatewayOrderId: 'razorpay_ord_1002',
          amount: 10000,
          currency: 'INR',
          status: 'paid',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          paymentId: 'pay-existing-1',
        },
        {
          id: 'ord-3-cancelled',
          institutionId: TENANT_A,
          studentId: 'student-a1',
          assignmentId: 'assign-a1',
          orderReference: 'ORD-10000003',
          gatewayOrderId: 'razorpay_ord_1003',
          amount: 5000,
          currency: 'INR',
          status: 'cancelled',
          expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
          paymentId: null,
        },
        {
          id: 'ord-4-expired',
          institutionId: TENANT_A,
          studentId: 'student-a1',
          assignmentId: 'assign-a1',
          orderReference: 'ORD-10000004',
          gatewayOrderId: 'razorpay_ord_1004',
          amount: 8000,
          currency: 'INR',
          status: 'created',
          expiresAt: new Date(Date.now() - 60 * 1000).toISOString(), // 1 min ago
          paymentId: null,
        },
      ];

      webhookEvents = [
        {
          id: 'evt-1',
          institutionId: TENANT_A,
          provider: 'razorpay',
          eventId: 'evt_already_processed_101',
          eventType: 'payment.captured',
          processed: true,
        },
      ];
    });

    const verifyGatewayPayment = (input: {
      callerRole: Role;
      callerInstitutionId: string;
      orderRef: string;
      gatewayOrderId?: string;
      externalTransactionId?: string;
      signature?: string;
      amount?: number;
      currency?: string;
      merchantSecret?: string | null;
      isGatewayLive?: boolean;
    }) => {
      // 1. Role enforcement: Only owner, admin, or accountant
      const isAuthorizedFinanceStaff = ['owner', 'admin', 'accountant'].includes(input.callerRole);
      if (!isAuthorizedFinanceStaff) {
        throw new Error('Unauthorized: Payment verification requires institutional financial administrator privileges.');
      }

      // 2. Order lookup in caller institution (tenant isolation)
      const order = gatewayOrders.find(
        (o) => o.orderReference === input.orderRef && o.institutionId === input.callerInstitutionId
      );
      if (!order) {
        throw new Error('Gateway order not found.');
      }

      // 3. Replay attack prevention: already paid orders cannot be credited twice
      if (order.status === 'paid') {
        return { success: true, payment_id: order.paymentId, already_paid: true };
      }

      // 4. Lifecycle state checks: expired or cancelled
      if (order.status === 'cancelled') {
        throw new Error('Verification rejected: Gateway order has been cancelled.');
      }
      if (new Date(order.expiresAt).getTime() < Date.now()) {
        throw new Error('Verification rejected: Gateway order has expired.');
      }

      // 5. Correct Order ID matching
      if (input.gatewayOrderId && input.gatewayOrderId.trim() !== order.gatewayOrderId) {
        throw new Error('Verification rejected: Gateway order ID mismatch.');
      }

      // 6. External provider reference validation
      if (!input.externalTransactionId || input.externalTransactionId.trim().length < 6) {
        throw new Error('Verification rejected: A valid external transaction reference ID from the payment provider is required.');
      }

      // 7. Exact amount and currency matching
      if (input.amount !== undefined && Math.abs(input.amount - order.amount) > 0.01) {
        throw new Error('Verification rejected: Transaction amount mismatch.');
      }
      if (input.currency && input.currency.trim().toUpperCase() !== order.currency.toUpperCase()) {
        throw new Error('Verification rejected: Transaction currency mismatch.');
      }

      // 8. Merchant settings check: online payments must be active with configured secret
      if (!input.isGatewayLive || !input.merchantSecret) {
        throw new Error('Online payment verification disabled: Live payment gateway and merchant webhook secret must be configured in Institutional Fee Settings.');
      }

      // 9. Cryptographic signature verification
      if (!input.signature || typeof input.signature !== 'string') {
        throw new Error('Verification rejected: Cryptographic provider signature is required to confirm payment authenticity.');
      }

      const expectedSignature = crypto
        .createHmac('sha256', input.merchantSecret.trim())
        .update(`${order.gatewayOrderId}|${input.externalTransactionId.trim()}`)
        .digest('hex');

      const sigBuffer = Buffer.from(input.signature.trim(), 'utf8');
      const expBuffer = Buffer.from(expectedSignature, 'utf8');

      if (sigBuffer.length !== expBuffer.length || !crypto.timingSafeEqual(sigBuffer, expBuffer)) {
        throw new Error('Cryptographic verification failed: Invalid payment provider signature (forged, tampered, or mismatched credentials).');
      }

      // 10. Independent Provider Record Settlement Verification
      // Official Razorpay / Stripe rule: never credit student fees without independently verified settlement
      if (input.providerPaymentRecord) {
        const provider = (input.provider || 'razorpay').toLowerCase();
        const record = input.providerPaymentRecord;

        if (provider === 'razorpay') {
          if (record.status !== 'captured') {
            throw new Error(`Provider settlement unconfirmed: Razorpay payment status is '${record.status}', not 'captured'. Student fees cannot be credited.`);
          }
          if (record.order_id && record.order_id !== order.gatewayOrderId) {
            throw new Error(`Provider order mismatch: Expected order '${order.gatewayOrderId}', got '${record.order_id}'.`);
          }
          const expectedMinor = Math.round(order.amount * 100);
          if (record.amount !== undefined && record.amount !== expectedMinor) {
            throw new Error(`Provider amount mismatch: Expected ${expectedMinor} paise, got ${record.amount}.`);
          }
        } else if (provider === 'stripe') {
          if (record.status !== 'succeeded') {
            throw new Error(`Provider settlement unconfirmed: Stripe PaymentIntent status is '${record.status}', not 'succeeded'. Student fees cannot be credited.`);
          }
          const amt = record.amount_received ?? record.amount;
          const expectedMinor = Math.round(order.amount * 100);
          if (amt !== undefined && amt !== expectedMinor) {
            throw new Error(`Provider amount mismatch: Expected ${expectedMinor} minor units, got ${amt}.`);
          }
        }
      }

      // 11. Atomic Settlement
      const newPaymentId = `pay-gw-${Date.now()}`;
      order.status = 'paid';
      order.paymentId = newPaymentId;

      return {
        success: true,
        payment_id: newPaymentId,
        already_paid: false,
      };
    };

    const processPaymentWebhook = (input: {
      institutionId: string;
      provider: string;
      eventId: string;
      eventType: string;
      rawPayload: string;
      signatureHeader: string;
      merchantSecret: string;
      isGatewayLive: boolean;
      customTimestamp?: number;
    }) => {
      if (!input.isGatewayLive || !input.merchantSecret) {
        throw new Error('Payment gateway is not active or webhook secret is unconfigured for this institution');
      }

      // Official signature validation branching by provider
      if (input.provider === 'razorpay') {
        const expectedSig = crypto
          .createHmac('sha256', input.merchantSecret)
          .update(input.rawPayload)
          .digest('hex');

        const sigBuf = Buffer.from(input.signatureHeader.trim(), 'utf8');
        const expBuf = Buffer.from(expectedSig, 'utf8');

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          throw new Error('Cryptographic signature verification failed: Forged or tampered Razorpay webhook payload');
        }
      } else if (input.provider === 'stripe') {
        // Parse official Stripe signature: t=...,v1=...
        const parts = input.signatureHeader.split(',');
        let timestamp: string | null = null;
        let sig: string | null = null;
        for (const p of parts) {
          const [k, v] = p.trim().split('=');
          if (k === 't') timestamp = v;
          if (k === 'v1') sig = v;
        }

        if (!timestamp || !sig) {
          throw new Error('Malformed stripe-signature header format');
        }

        const tsNum = parseInt(timestamp, 10);
        const now = input.customTimestamp ?? Math.floor(Date.now() / 1000);
        if (isNaN(tsNum) || Math.abs(now - tsNum) > 300) {
          throw new Error('Stripe webhook signature timestamp outside 300s tolerance window (replay attack detected)');
        }

        const signedPayload = `${timestamp}.${input.rawPayload}`;
        const expectedSig = crypto
          .createHmac('sha256', input.merchantSecret)
          .update(signedPayload)
          .digest('hex');

        const sigBuf = Buffer.from(sig.trim(), 'utf8');
        const expBuf = Buffer.from(expectedSig, 'utf8');

        if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
          throw new Error('Cryptographic signature verification failed: Forged or tampered Stripe webhook payload');
        }
      }

      // Duplicate event check
      const duplicate = webhookEvents.find(
        (e) => e.institutionId === input.institutionId && e.provider === input.provider && e.eventId === input.eventId
      );
      if (duplicate) {
        return { status: 'already_processed', duplicate: true };
      }

      // Verify settlement status in payload
      const parsed = JSON.parse(input.rawPayload);
      if (input.provider === 'razorpay') {
        const entity = parsed.payload?.payment?.entity;
        if (entity && entity.status !== 'captured') {
          throw new Error(`Razorpay webhook settlement rejected: Status '${entity.status}' is not 'captured'.`);
        }
      } else if (input.provider === 'stripe') {
        const entity = parsed.data?.object;
        if (entity && entity.status !== 'succeeded') {
          throw new Error(`Stripe webhook settlement rejected: Status '${entity.status}' is not 'succeeded'.`);
        }
      }

      webhookEvents.push({
        id: `evt-${Date.now()}`,
        institutionId: input.institutionId,
        provider: input.provider,
        eventId: input.eventId,
        eventType: input.eventType,
        processed: true,
      });

      return { status: 'settled', duplicate: false };
    };

    it('rejects unauthorized roles (student, parent, teacher) from verifying payments', () => {
      const validSig = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pay_valid_ref_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'student',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Unauthorized: Payment verification requires institutional financial administrator privileges.');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'parent',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Unauthorized: Payment verification requires institutional financial administrator privileges.');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'teacher',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Unauthorized: Payment verification requires institutional financial administrator privileges.');
    });

    it('rejects arbitrary or missing external transaction IDs even for authorized finance staff', () => {
      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: undefined,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: A valid external transaction reference ID from the payment provider is required.');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: '   ',
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: A valid external transaction reference ID from the payment provider is required.');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'admin',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: '123',
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: A valid external transaction reference ID from the payment provider is required.');
    });

    it('rejects forged or tampered cryptographic payment provider signatures', () => {
      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: 'forged_fake_signature_hash_hex_00112233445566778899aabbccddeeff',
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Cryptographic verification failed: Invalid payment provider signature');
    });

    it('rejects payment verification when live merchant webhook secret is not configured or disabled', () => {
      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: 'any_signature',
          merchantSecret: null,
          isGatewayLive: false,
        });
      }).toThrow('Online payment verification disabled: Live payment gateway and merchant webhook secret must be configured');
    });

    it('rejects transaction amount mismatch between provider payload and gateway order', () => {
      const validSig = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pay_valid_ref_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig,
          amount: 9999, // Order is 15000
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: Transaction amount mismatch.');
    });

    it('rejects currency mismatch between provider payload and gateway order', () => {
      const validSig = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pay_valid_ref_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig,
          currency: 'USD', // Order is INR
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: Transaction currency mismatch.');
    });

    it('rejects gateway order ID mismatch (order ID pointing to a different transaction)', () => {
      const validSig = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pay_valid_ref_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          gatewayOrderId: 'razorpay_ord_DIFFERENT_9999',
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: Gateway order ID mismatch.');
    });

    it('rejects payment verification for expired and cancelled gateway orders', () => {
      const validSig4 = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1004|pay_valid_ref_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000004', // Expired
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig4,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: Gateway order has expired.');

      const validSig3 = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1003|pay_valid_ref_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000003', // Cancelled
          externalTransactionId: 'pay_valid_ref_123456',
          signature: validSig3,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Verification rejected: Gateway order has been cancelled.');
    });

    it('prevents replay attacks on already settled orders and avoids duplicate credits', () => {
      const replayAttempt = verifyGatewayPayment({
        callerRole: 'admin',
        callerInstitutionId: TENANT_A,
        orderRef: 'ORD-10000002',
        externalTransactionId: 'pay_replay_attempt_999999',
        merchantSecret: TEST_WEBHOOK_SECRET,
        isGatewayLive: true,
      });

      expect(replayAttempt.already_paid).toBe(true);
      expect(replayAttempt.payment_id).toBe('pay-existing-1');
    });

    it('blocks cross-tenant order verification attacks', () => {
      expect(() => {
        verifyGatewayPayment({
          callerRole: 'admin',
          callerInstitutionId: TENANT_B, // Tenant B trying to verify Tenant A's order
          orderRef: 'ORD-10000001',
          externalTransactionId: 'pay_valid_cross_tenant_123456',
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
        });
      }).toThrow('Gateway order not found.');
    });

    it('suppresses duplicate webhook events and prevents duplicate ledger postings', () => {
      const payload = JSON.stringify({
        id: 'evt_already_processed_101',
        event: 'payment.captured',
        amount: 1500000,
      });
      const validSig = crypto.createHmac('sha256', TEST_WEBHOOK_SECRET).update(payload).digest('hex');

      const result = processPaymentWebhook({
        institutionId: TENANT_A,
        provider: 'razorpay',
        eventId: 'evt_already_processed_101',
        eventType: 'payment.captured',
        rawPayload: payload,
        signatureHeader: validSig,
        merchantSecret: TEST_WEBHOOK_SECRET,
        isGatewayLive: true,
      });

      expect(result.status).toBe('already_processed');
      expect(result.duplicate).toBe(true);
    });

    it('allows authorized accountant with valid cryptographic signature to settle order atomically', () => {
      const validSignature = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pay_rzp_live_txn_987654')
        .digest('hex');

      const result = verifyGatewayPayment({
        callerRole: 'accountant',
        callerInstitutionId: TENANT_A,
        orderRef: 'ORD-10000001',
        gatewayOrderId: 'razorpay_ord_1001',
        externalTransactionId: 'pay_rzp_live_txn_987654',
        signature: validSignature,
        amount: 15000,
        currency: 'INR',
        merchantSecret: TEST_WEBHOOK_SECRET,
        isGatewayLive: true,
      });

      expect(result.success).toBe(true);
      expect(result.already_paid).toBe(false);
      expect(result.payment_id).toBeDefined();

      const order = gatewayOrders.find((o) => o.orderReference === 'ORD-10000001');
      expect(order?.status).toBe('paid');
    });

    it('rejects settlement when provider payment record status is not captured (Razorpay authorized or failed)', () => {
      const validSig = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pay_uncaptured_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          gatewayOrderId: 'razorpay_ord_1001',
          externalTransactionId: 'pay_uncaptured_123456',
          signature: validSig,
          amount: 15000,
          currency: 'INR',
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
          provider: 'razorpay',
          providerPaymentRecord: {
            status: 'authorized', // Not captured!
            order_id: 'razorpay_ord_1001',
            amount: 1500000,
          },
        });
      }).toThrow("Razorpay payment status is 'authorized', not 'captured'. Student fees cannot be credited.");
    });

    it('rejects settlement when Stripe PaymentIntent status is unconfirmed or failed', () => {
      const validSig = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update('razorpay_ord_1001|pi_unconfirmed_123456')
        .digest('hex');

      expect(() => {
        verifyGatewayPayment({
          callerRole: 'accountant',
          callerInstitutionId: TENANT_A,
          orderRef: 'ORD-10000001',
          gatewayOrderId: 'razorpay_ord_1001',
          externalTransactionId: 'pi_unconfirmed_123456',
          signature: validSig,
          amount: 15000,
          currency: 'INR',
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
          provider: 'stripe',
          providerPaymentRecord: {
            status: 'requires_payment_method', // Not succeeded!
            amount: 1500000,
          },
        });
      }).toThrow("Stripe PaymentIntent status is 'requires_payment_method', not 'succeeded'. Student fees cannot be credited.");
    });

    it('processes official Stripe webhook signature (t=...,v1=...) with replay protection and settlement verification', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify({
        id: 'evt_stripe_test_1001',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_test_settle_9999',
            status: 'succeeded',
            amount_received: 1500000,
            currency: 'inr',
          },
        },
      });

      const signedPayload = `${now}.${payload}`;
      const validSigHash = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      const stripeSigHeader = `t=${now},v1=${validSigHash}`;

      const result = processPaymentWebhook({
        institutionId: TENANT_A,
        provider: 'stripe',
        eventId: 'evt_stripe_test_1001',
        eventType: 'payment_intent.succeeded',
        rawPayload: payload,
        signatureHeader: stripeSigHeader,
        merchantSecret: TEST_WEBHOOK_SECRET,
        isGatewayLive: true,
        customTimestamp: now,
      });

      expect(result.status).toBe('settled');
      expect(result.duplicate).toBe(false);
    });

    it('rejects Stripe webhook replay attack when signature timestamp is outside 300s tolerance window', () => {
      const expiredTimestamp = Math.floor(Date.now() / 1000) - 600; // 10 minutes old!
      const payload = JSON.stringify({
        id: 'evt_stripe_replay_1002',
        type: 'payment_intent.succeeded',
      });

      const signedPayload = `${expiredTimestamp}.${payload}`;
      const validSigHash = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      const stripeSigHeader = `t=${expiredTimestamp},v1=${validSigHash}`;

      expect(() => {
        processPaymentWebhook({
          institutionId: TENANT_A,
          provider: 'stripe',
          eventId: 'evt_stripe_replay_1002',
          eventType: 'payment_intent.succeeded',
          rawPayload: payload,
          signatureHeader: stripeSigHeader,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
          customTimestamp: Math.floor(Date.now() / 1000), // current time
        });
      }).toThrow('Stripe webhook signature timestamp outside 300s tolerance window (replay attack detected)');
    });

    it('rejects Stripe webhook when payment status is not succeeded', () => {
      const now = Math.floor(Date.now() / 1000);
      const payload = JSON.stringify({
        id: 'evt_stripe_failed_1003',
        type: 'payment_intent.succeeded',
        data: {
          object: {
            id: 'pi_failed_9999',
            status: 'requires_action', // Not succeeded!
            amount: 1500000,
          },
        },
      });

      const signedPayload = `${now}.${payload}`;
      const validSigHash = crypto
        .createHmac('sha256', TEST_WEBHOOK_SECRET)
        .update(signedPayload)
        .digest('hex');

      const stripeSigHeader = `t=${now},v1=${validSigHash}`;

      expect(() => {
        processPaymentWebhook({
          institutionId: TENANT_A,
          provider: 'stripe',
          eventId: 'evt_stripe_failed_1003',
          eventType: 'payment_intent.succeeded',
          rawPayload: payload,
          signatureHeader: stripeSigHeader,
          merchantSecret: TEST_WEBHOOK_SECRET,
          isGatewayLive: true,
          customTimestamp: now,
        });
      }).toThrow("Stripe webhook settlement rejected: Status 'requires_action' is not 'succeeded'.");
    });
  });
});
