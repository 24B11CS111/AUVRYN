import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getFeeOverviewStatsAction, getInstitutionFeeSettingsAction } from './actions';
import { FeesOverviewClient } from './FeesOverviewClient';

export default async function FeesDashboardPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const [statsRes, settingsRes] = await Promise.all([
    getFeeOverviewStatsAction(),
    getInstitutionFeeSettingsAction(),
  ]);

  const stats = statsRes.success && statsRes.data
    ? statsRes.data
    : {
        totalAssigned: 0,
        totalCollected: 0,
        totalOutstanding: 0,
        overdueAmount: 0,
        collectionRate: 0,
        activeAssignmentsCount: 0,
        recentPayments: [],
        advanceBalance: 0,
      };

  const currency = settingsRes.success && settingsRes.data?.currency
    ? settingsRes.data.currency
    : 'INR';

  return (
    <div className="container mx-auto py-6">
      <FeesOverviewClient
        stats={stats}
        userRole={userRole}
        currency={currency}
      />
    </div>
  );
}
