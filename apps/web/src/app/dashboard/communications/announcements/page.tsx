import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getAnnouncementsAction } from '../actions';
import { AnnouncementsClient } from './AnnouncementsClient';

export default async function AnnouncementsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const res = await getAnnouncementsAction();
  const announcements = res.success && res.data ? res.data : [];

  return (
    <div className="container mx-auto py-6">
      <AnnouncementsClient
        initialAnnouncements={announcements}
        userRole={userRole}
      />
    </div>
  );
}
