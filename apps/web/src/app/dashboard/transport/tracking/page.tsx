import React from 'react';
import { getLiveFleetTrackingAction } from '../actions';
import { LiveTrackingClient } from './LiveTrackingClient';

export default async function LiveTrackingPage() {
  const result = await getLiveFleetTrackingAction();
  const liveJourneys = result.success ? result.data : [];

  return <LiveTrackingClient initialJourneys={liveJourneys} />;
}
