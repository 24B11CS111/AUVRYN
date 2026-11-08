import React from 'react';
import { getTransportJourneysAction } from '../actions';
import { JourneysClient } from './JourneysClient';

export default async function JourneysPage() {
  const result = await getTransportJourneysAction();
  const journeys = result.success ? result.data : [];

  return <JourneysClient initialJourneys={journeys} />;
}
