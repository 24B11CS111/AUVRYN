import React from 'react';
import { requirePlatformAdmin } from '@/lib/auth';
import { getHrixPlatformDataAction } from './actions';
import { HrixAdminClient } from './HrixAdminClient';

export const dynamic = 'force-dynamic';

export default async function HrixAdminPage() {
  await requirePlatformAdmin();

  const res = await getHrixPlatformDataAction();
  const data = res.success && res.data
    ? res.data
    : {
        platformStats: {
          totalTenants: 0,
          activeTenants: 0,
          pendingTenants: 0,
          suspendedTenants: 0,
          totalIdentities: 0,
          databaseUptime: '99.99%',
          monthlyRecurringRevenue: '$0',
        },
        tenants: [],
        systemHealth: [],
        recentPlatformLogs: [],
      };

  return <HrixAdminClient initialData={data} />;
}
