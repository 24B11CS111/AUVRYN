import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { resolveEducationType } from '@edu-platform/types';
import { getParentPortalDataAction } from './actions';
import { ParentPortalClient } from './ParentPortalClient';

interface ParentPortalPageProps {
  searchParams?: { preview?: string };
}

export default async function ParentPortalPage({ searchParams }: ParentPortalPageProps) {
  const portalContext = await requirePortalRole(['parent'], {
    allowAdminPreview: true,
    searchParams,
  });

  const institution = portalContext.activeMembership?.institution;
  const educationType = resolveEducationType(institution);
  const institutionName = institution?.name || 'AUVRYN Institution';

  const res = await getParentPortalDataAction(undefined, portalContext.isPreview);
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
      <ParentPortalClient
        initialData={data}
        institutionName={institutionName}
        educationType={educationType}
        userEmail={portalContext.user.email}
        userName={portalContext.profile.fullName}
        isPreview={portalContext.isPreview}
      />
    </div>
  );
}
