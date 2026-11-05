import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getInstitutionFeeSettingsAction } from '../actions';
import { FeeSettingsClient } from './FeeSettingsClient';

export default async function FeeSettingsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const settingsRes = await getInstitutionFeeSettingsAction();
  const settings = settingsRes.success && settingsRes.data ? settingsRes.data : null;

  return (
    <div className="container mx-auto py-6">
      <FeeSettingsClient
        initialSettings={settings}
        userRole={userRole}
      />
    </div>
  );
}
