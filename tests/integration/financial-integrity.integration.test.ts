import { describe, it, expect, beforeEach } from 'vitest';
import {
  FIXTURES,
  resetTestFixtures,
  executeAsServiceRole,
  queryAsServiceRole,
  mutateAsUser,
  queryAsUser,
  queryAsAnon,
} from './db';

describe('Integration Scenario G: Universal Fees, Payments & Financial Integrity', () => {
  beforeEach(() => {
    resetTestFixtures();
  });

  it('records fee payment atomically, updates fee assignment balance, and creates ledger entry', () => {
    // 1. Initial state: Charlie has pending assignment of 5000.00 with 0.00 paid
    const initialAssignment = queryAsServiceRole<{
      paid_amount: string;
      outstanding_balance: string;
      status: string;
    }>(`
      SELECT paid_amount, outstanding_balance, status
      FROM public.student_fee_assignments
      WHERE id = '${FIXTURES.feeAssignmentCharlie}';
    `);

    expect(initialAssignment.rowCount).toBe(1);
    expect(Number(initialAssignment.rows[0].paid_amount)).toBe(0);
    expect(Number(initialAssignment.rows[0].outstanding_balance)).toBe(5000);
    expect(initialAssignment.rows[0].status).toBe('pending');

    // 2. Alice (Institution Alpha Owner/Admin) records a payment of 2000.00
    const paymentRes = mutateAsUser({
      userId: FIXTURES.userAliceOwner,
      sql: `
        SELECT public.record_fee_payment_atomic(
          '${FIXTURES.instAlpha}'::uuid,
          '${FIXTURES.studentCharlieId}'::uuid,
          '${FIXTURES.enrollmentCharlieId}'::uuid,
          '${FIXTURES.feeAssignmentCharlie}'::uuid,
          2000.00,
          'bank_transfer',
          'UTR-ALPHA-123456',
          jsonb_build_array(
            jsonb_build_object(
              'fee_head_id', '${FIXTURES.feeHeadTuitionAlpha}'::uuid,
              'amount', 2000.00
            )
          ),
          'Partial tuition fee payment',
          '${FIXTURES.userAliceOwner}'::uuid
        );
      `,
    });

    expect(paymentRes.success).toBe(true);
    expect(paymentRes.output).toContain('"success": true');
    expect(paymentRes.output).toContain('"receipt_number":');

    // 3. Verify student fee assignment updated atomically: balance 3000.00, status 'partial'
    const updatedAssignment = queryAsServiceRole<{
      paid_amount: string;
      outstanding_balance: string;
      status: string;
    }>(`
      SELECT paid_amount, outstanding_balance, status
      FROM public.student_fee_assignments
      WHERE id = '${FIXTURES.feeAssignmentCharlie}';
    `);

    expect(updatedAssignment.rowCount).toBe(1);
    expect(Number(updatedAssignment.rows[0].paid_amount)).toBe(2000);
    expect(Number(updatedAssignment.rows[0].outstanding_balance)).toBe(3000);
    expect(updatedAssignment.rows[0].status).toBe('partial');

    // 4. Verify primary fee payment record exists and is marked 'completed'
    const paymentRecord = queryAsServiceRole<{
      amount_received: string;
      status: string;
      payment_method: string;
    }>(`
      SELECT amount_received, status, payment_method
      FROM public.fee_payments
      WHERE assignment_id = '${FIXTURES.feeAssignmentCharlie}';
    `);

    expect(paymentRecord.rowCount).toBe(1);
    expect(Number(paymentRecord.rows[0].amount_received)).toBe(2000);
    expect(paymentRecord.rows[0].status).toBe('completed');
    expect(paymentRecord.rows[0].payment_method).toBe('bank_transfer');

    // 5. Verify financial ledger audit entry created
    const ledgerEntry = queryAsServiceRole<{
      entry_type: string;
      credit_amount: string;
      balance_after: string;
    }>(`
      SELECT entry_type, credit_amount, balance_after
      FROM public.financial_ledger_entries
      WHERE student_id = '${FIXTURES.studentCharlieId}';
    `);

    expect(ledgerEntry.rowCount).toBe(1);
    expect(ledgerEntry.rows[0].entry_type).toBe('payment');
    expect(Number(ledgerEntry.rows[0].credit_amount)).toBe(2000);
    expect(Number(ledgerEntry.rows[0].balance_after)).toBe(3000);
  });

  it('handles overpayment by marking assignment fully paid and crediting surplus to advance wallet', () => {
    // Charlie owes 5000.00. Payment received is 5500.00 (allocated 5000 to tuition head, surplus 500)
    const overpaymentRes = mutateAsUser({
      userId: FIXTURES.userAliceOwner,
      sql: `
        SELECT public.record_fee_payment_atomic(
          '${FIXTURES.instAlpha}'::uuid,
          '${FIXTURES.studentCharlieId}'::uuid,
          '${FIXTURES.enrollmentCharlieId}'::uuid,
          '${FIXTURES.feeAssignmentCharlie}'::uuid,
          5500.00,
          'upi',
          'UPI-SURPLUS-999',
          jsonb_build_array(
            jsonb_build_object(
              'fee_head_id', '${FIXTURES.feeHeadTuitionAlpha}'::uuid,
              'amount', 5000.00
            )
          ),
          'Full payment plus advance deposit',
          '${FIXTURES.userAliceOwner}'::uuid
        );
      `,
    });

    expect(overpaymentRes.success).toBe(true);

    // Assignment must be fully paid
    const assignment = queryAsServiceRole<{
      paid_amount: string;
      outstanding_balance: string;
      status: string;
    }>(`
      SELECT paid_amount, outstanding_balance, status
      FROM public.student_fee_assignments
      WHERE id = '${FIXTURES.feeAssignmentCharlie}';
    `);

    expect(assignment.rowCount).toBe(1);
    expect(Number(assignment.rows[0].paid_amount)).toBe(5000);
    expect(Number(assignment.rows[0].outstanding_balance)).toBe(0);
    expect(assignment.rows[0].status).toBe('paid');

    // Excess 500.00 credited to student advance wallet
    const wallet = queryAsServiceRole<{ balance_amount: string }>(`
      SELECT balance_amount FROM public.student_advance_balances
      WHERE student_id = '${FIXTURES.studentCharlieId}';
    `);

    expect(wallet.rowCount).toBe(1);
    expect(Number(wallet.rows[0].balance_amount)).toBe(500);

    // Ledger records both payment and advance_credit
    const ledger = queryAsServiceRole<{ entry_type: string; credit_amount: string }>(`
      SELECT entry_type, credit_amount FROM public.financial_ledger_entries
      WHERE student_id = '${FIXTURES.studentCharlieId}'
      ORDER BY entry_number ASC;
    `);

    expect(ledger.rowCount).toBe(2);
    expect(ledger.rows[0].entry_type).toBe('advance_credit');
    expect(Number(ledger.rows[0].credit_amount)).toBe(500);
    expect(ledger.rows[1].entry_type).toBe('payment');
    expect(Number(ledger.rows[1].credit_amount)).toBe(5500);
  });

  it('students cannot alter fee assignments or delete payment records under RLS', () => {
    // Charlie tries to clear his own debt without payment
    const hackDebt = mutateAsUser({
      userId: FIXTURES.userCharlieStudent,
      sql: `
        UPDATE public.student_fee_assignments
        SET paid_amount = 5000.00, outstanding_balance = 0.00, status = 'paid'
        WHERE id = '${FIXTURES.feeAssignmentCharlie}';
      `,
    });

    expect(hackDebt.success).toBe(true);
    expect(hackDebt.output).toContain('UPDATE 0');

    // Charlie tries to delete a fee payment record
    const deletePayment = mutateAsUser({
      userId: FIXTURES.userCharlieStudent,
      sql: `DELETE FROM public.fee_payments WHERE student_id = '${FIXTURES.studentCharlieId}';`,
    });

    expect(deletePayment.success).toBe(true);
    expect(deletePayment.output).toContain('DELETE 0');

    // Anonymous caller cannot view payments
    const anonPayments = queryAsAnon(`SELECT id FROM public.fee_payments;`);
    expect(anonPayments.rowCount).toBe(0);
  });

  it('processes fee refunds atomically and guarantees financial ledger immutability via Postgres rules', () => {
    // 1. Record an initial payment of 3000.00 via record_fee_payment_atomic
    const payRes = mutateAsUser({
      userId: FIXTURES.userAliceOwner,
      sql: `
        SELECT public.record_fee_payment_atomic(
          '${FIXTURES.instAlpha}'::uuid,
          '${FIXTURES.studentCharlieId}'::uuid,
          '${FIXTURES.enrollmentCharlieId}'::uuid,
          '${FIXTURES.feeAssignmentCharlie}'::uuid,
          3000.00,
          'bank_transfer',
          'UTR-PAY-3000',
          jsonb_build_array(
            jsonb_build_object(
              'fee_head_id', '${FIXTURES.feeHeadTuitionAlpha}'::uuid,
              'amount', 3000.00
            )
          ),
          'Tuition payment for refund test',
          '${FIXTURES.userAliceOwner}'::uuid
        );
      `,
    });
    expect(payRes.success).toBe(true);

    const paymentRows = queryAsServiceRole<{ id: string }>(`
      SELECT id FROM public.fee_payments WHERE assignment_id = '${FIXTURES.feeAssignmentCharlie}';
    `);
    expect(paymentRows.rowCount).toBe(1);
    const paymentId = paymentRows.rows[0].id;

    // 2. Create approved refund request for 1000.00
    const refundId = 'f2000000-0000-0000-0000-000000000001';
    const refundInsert = executeAsServiceRole(`
      INSERT INTO public.fee_refund_requests (
        id, institution_id, refund_number, payment_id, student_id, assignment_id,
        refund_amount, reason, status, requested_by
      ) VALUES (
        '${refundId}', '${FIXTURES.instAlpha}', 'REF-ALPHA-888', '${paymentId}',
        '${FIXTURES.studentCharlieId}', '${FIXTURES.feeAssignmentCharlie}',
        1000.00, 'Student scholarship retroactive credit adjustment',
        'approved', '${FIXTURES.userAliceOwner}'
      );
    `);
    expect(refundInsert.success).toBe(true);

    // 3. Process refund atomically
    const refundRes = mutateAsUser({
      userId: FIXTURES.userAliceOwner,
      sql: `
        SELECT public.process_fee_refund_atomic(
          '${FIXTURES.instAlpha}'::uuid,
          '${refundId}'::uuid,
          '${FIXTURES.userAliceOwner}'::uuid,
          'bank_transfer',
          'DISB-REF-888'
        );
      `,
    });

    expect(refundRes.success).toBe(true);
    expect(refundRes.output).toContain('"status": "processed"');

    // 4. Verify assignment paid_amount reduced to 2000.00, balance increased to 3000.00
    const assignment = queryAsServiceRole<{
      paid_amount: string;
      outstanding_balance: string;
      status: string;
    }>(`
      SELECT paid_amount, outstanding_balance, status
      FROM public.student_fee_assignments
      WHERE id = '${FIXTURES.feeAssignmentCharlie}';
    `);

    expect(Number(assignment.rows[0].paid_amount)).toBe(2000);
    expect(Number(assignment.rows[0].outstanding_balance)).toBe(3000);
    expect(assignment.rows[0].status).toBe('partial');

    // 5. Verify refund entry in financial ledger
    const ledgerRefund = queryAsServiceRole<{
      entry_type: string;
      debit_amount: string;
      balance_after: string;
    }>(`
      SELECT entry_type, debit_amount, balance_after
      FROM public.financial_ledger_entries
      WHERE refund_id = '${refundId}';
    `);

    expect(ledgerRefund.rowCount).toBe(1);
    expect(ledgerRefund.rows[0].entry_type).toBe('refund');
    expect(Number(ledgerRefund.rows[0].debit_amount)).toBe(1000);
    expect(Number(ledgerRefund.rows[0].balance_after)).toBe(3000);

    // 6. Immutability Verification: PostgreSQL DO INSTEAD NOTHING rules prevent ledger tampering
    const tamperUpdate = executeAsServiceRole(`
      UPDATE public.financial_ledger_entries
      SET debit_amount = 0.00, description = 'Tampered'
      WHERE refund_id = '${refundId}';
    `);

    // Rule fires and prevents UPDATE
    const verifyUntampered = queryAsServiceRole<{ debit_amount: string; description: string }>(`
      SELECT debit_amount, description FROM public.financial_ledger_entries
      WHERE refund_id = '${refundId}';
    `);
    expect(Number(verifyUntampered.rows[0].debit_amount)).toBe(1000);
    expect(verifyUntampered.rows[0].description).not.toContain('Tampered');

    // Attempting DELETE also does INSTEAD NOTHING
    executeAsServiceRole(`
      DELETE FROM public.financial_ledger_entries WHERE refund_id = '${refundId}';
    `);

    const verifyNotDeleted = queryAsServiceRole<{ id: string }>(`
      SELECT id FROM public.financial_ledger_entries WHERE refund_id = '${refundId}';
    `);
    expect(verifyNotDeleted.rowCount).toBe(1);
  });
});
