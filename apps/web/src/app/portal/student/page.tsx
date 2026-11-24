import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { resolveEducationType } from '@edu-platform/types';
import { getStudentPortalDataAction } from './actions';
import { StudentPortalClient } from './StudentPortalClient';

interface StudentPortalPageProps {
  searchParams?: { preview?: string };
}

export default async function StudentPortalPage({ searchParams }: StudentPortalPageProps) {
  const portalContext = await requirePortalRole(['student'], {
    allowAdminPreview: true,
    searchParams,
  });

  const institution = portalContext.activeMembership?.institution;
  const educationType = resolveEducationType(institution);
  const institutionName = institution?.name || 'AUVRYN Institution';

  const res = await getStudentPortalDataAction(portalContext.isPreview);
  const data = res.success && res.data
    ? res.data
    : {
        student: null,
        attendanceSummary: { totalSessions: 0, present: 0, absent: 0, late: 0, percentage: 100 },
        recentAttendance: [],
        timetable: [],
        results: [],
        hallTickets: [],
        homework: [],
        fees: { totalAssigned: 0, totalPaid: 0, outstanding: 0, installments: [] },
        announcements: [],
      };

  return (
    <div className="container mx-auto py-6">
      <StudentPortalClient
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
