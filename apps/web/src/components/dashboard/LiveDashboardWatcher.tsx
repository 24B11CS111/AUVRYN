'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuvrynRealtime } from '@/lib/realtime/useAuvrynRealtime';

export interface LiveDashboardWatcherProps {
  institutionId: string;
}

/**
 * Client watcher that subscribes to institutional KPI invalidations
 * and triggers Next.js App Router background data refresh without page reloads.
 */
export function LiveDashboardWatcher({ institutionId }: LiveDashboardWatcherProps) {
  const router = useRouter();
  const { subscribeToInstitution } = useAuvrynRealtime({
    institutionId,
  });

  useEffect(() => {
    if (!institutionId) return;

    // Listen to KPI invalidation signals
    const kpiSub = subscribeToInstitution('kpi', () => {
      router.refresh();
    });

    // Listen to global institutional announcements / updates
    const globalSub = subscribeToInstitution('global', () => {
      router.refresh();
    });

    return () => {
      kpiSub?.unsubscribe();
      globalSub?.unsubscribe();
    };
  }, [institutionId, subscribeToInstitution, router]);

  return null;
}
