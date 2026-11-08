import React from 'react';
import { getTransportStopsAction } from '../actions';
import { StopsClient } from './StopsClient';

export default async function StopsPage() {
  const result = await getTransportStopsAction();
  const stops = result.success ? result.data : [];

  return <StopsClient initialStops={stops} />;
}
