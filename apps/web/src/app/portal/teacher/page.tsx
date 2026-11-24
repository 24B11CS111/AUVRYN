import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { resolveEducationType } from '@edu-platform/types';
import { getTeacherPortalDataAction } from './actions';
import { TeacherPortalClient } from './TeacherPortalClient';

interface TeacherPortalPageProps {
  searchParams?: { preview?: string };
}

export default async function TeacherPortalPage({ searchParams }: TeacherPortalPageProps) {
  const portalContext = await requirePortalRole(['faculty'], {
    allowAdminPreview: true,
    searchParams,
  });

  const institution = portalContext.activeMembership?.institution;
  const educationType = resolveEducationType(institution);
  const institutionName = institution?.name || 'AUVRYN Institution';

  const res = await getTeacherPortalDataAction(undefined, portalContext.isPreview);
  const data = res.success && res.data
    ? res.data
    : {
        staffProfile: null,
        allocations: [],
        selectedAllocationId: null,
        activeStudents: [],
        timetable: [],
        homework: [],
        recentAnnouncements: [],
      };

  return (
    <div className="container mx-auto py-6">
      <TeacherPortalClient
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
