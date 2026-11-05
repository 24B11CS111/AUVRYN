import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getNotificationTemplatesAction } from '../actions';
import { TemplatesClient } from './TemplatesClient';

export default async function TemplatesPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const res = await getNotificationTemplatesAction();
  const templates = res.success && res.data ? res.data : [];

  return (
    <div className="container mx-auto py-6">
      <TemplatesClient
        initialTemplates={templates}
        userRole={userRole}
      />
    </div>
  );
}
