import React from 'react';
import { getTransportOverviewStatsAction } from './actions';
import { TransportOverviewClient } from './TransportOverviewClient';

export default async function TransportOverviewPage() {
  const result = await getTransportOverviewStatsAction();
  const initialData = result.success ? result.data : null;

  return <TransportOverviewClient initialData={initialData} />;
}
