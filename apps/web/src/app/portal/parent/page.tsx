import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getParentPortalDataAction } from './actions';
import { ParentPortalClient } from './ParentPortalClient';

export default async function ParentPortalPage() {
  await requireInstitution();

  const res = await getParentPortalDataAction();
  const data = res.success && res.data
    ? res.data
    : {
        children: [],
        selectedChildId: null,
        activeChildDetails: null,
        announcements: [],
      };

  return (
    <div className="container mx-auto py-6">
      <ParentPortalClient initialData={data} />
    </div>
  );
}
