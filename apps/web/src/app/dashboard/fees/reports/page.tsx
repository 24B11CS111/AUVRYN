import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getFeePaymentsAction, getStudentFeeAssignmentsAction, getFinancialLedgerAction } from '../actions';
import { FeeReportsClient } from './FeeReportsClient';

export default async function FeeReportsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const [paymentsRes, assignmentsRes, ledgerRes] = await Promise.all([
    getFeePaymentsAction(),
    getStudentFeeAssignmentsAction(),
    getFinancialLedgerAction({ limit: 200 }),
  ]);

  const payments = paymentsRes.success && paymentsRes.data ? paymentsRes.data : [];
  const assignments = assignmentsRes.success && assignmentsRes.data ? assignmentsRes.data : [];
  const ledgerEntries = ledgerRes.success && ledgerRes.data ? ledgerRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <FeeReportsClient
        payments={payments}
        assignments={assignments}
        ledgerEntries={ledgerEntries}
        userRole={userRole}
      />
    </div>
  );
}
