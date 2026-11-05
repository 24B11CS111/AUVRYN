import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { NewAnnouncementClient } from './NewAnnouncementClient';

export default async function NewAnnouncementPage() {
  await requireInstitution();

  return (
    <div className="container mx-auto py-6">
      <NewAnnouncementClient />
    </div>
  );
}
