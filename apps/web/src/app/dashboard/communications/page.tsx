import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getCommunicationsOverviewStatsAction } from './actions';
import { CommunicationsOverviewClient } from './CommunicationsOverviewClient';

export default async function CommunicationsDashboardPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const statsRes = await getCommunicationsOverviewStatsAction();
  const stats = statsRes.success && statsRes.data
    ? statsRes.data
    : {
        totalAnnouncements: 0,
        activeAnnouncements: 0,
        unreadNotifications: 0,
        pendingDeliveries: 0,
        failedDeliveries: 0,
        activeThreads: 0,
        pendingHomework: 0,
      };

  return (
    <div className="container mx-auto py-6">
      <CommunicationsOverviewClient
        stats={stats}
        userRole={userRole}
      />
    </div>
  );
}
