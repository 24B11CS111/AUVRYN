import React from 'react';
import { getTransportSettingsAction } from '../actions';
import { TransportSettingsClient } from './TransportSettingsClient';

export const dynamic = 'force-dynamic';

export default async function TransportSettingsPage() {
  const result = await getTransportSettingsAction();
  const settings = result.success ? result.data : null;

  return <TransportSettingsClient initialSettings={settings} />;
}
