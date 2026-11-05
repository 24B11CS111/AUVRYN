import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getFeeRefundsAction, getFeePaymentsAction } from '../actions';
import { FeeRefundsClient } from './FeeRefundsClient';

export default async function FeeRefundsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const [refundsRes, paymentsRes] = await Promise.all([
    getFeeRefundsAction(),
    getFeePaymentsAction(),
  ]);

  const refunds = refundsRes.success && refundsRes.data ? refundsRes.data : [];
  const payments = paymentsRes.success && paymentsRes.data
    ? paymentsRes.data.filter((p: any) => p.payment_status === 'completed' || p.payment_status === 'partially_refunded')
    : [];

  return (
    <div className="container mx-auto py-6">
      <FeeRefundsClient
        initialRefunds={refunds}
        completedPayments={payments}
        userRole={userRole}
      />
    </div>
  );
}
