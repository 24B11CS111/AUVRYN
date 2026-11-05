import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getFeePaymentsAction } from '../actions';
import { FeeCollectionsClient } from './FeeCollectionsClient';

export default async function FeeCollectionsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const paymentsRes = await getFeePaymentsAction();
  const payments = paymentsRes.success && paymentsRes.data ? paymentsRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <FeeCollectionsClient
        initialPayments={payments}
        userRole={userRole}
      />
    </div>
  );
}
