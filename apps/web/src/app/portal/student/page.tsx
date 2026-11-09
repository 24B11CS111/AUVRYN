import React from 'react';
import { requirePortalRole } from '@/lib/auth';
import { getStudentPortalDataAction } from './actions';
import { StudentPortalClient } from './StudentPortalClient';

export default async function StudentPortalPage() {
  await requirePortalRole(['student', 'owner', 'admin']);

  const res = await getStudentPortalDataAction();
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
      <StudentPortalClient initialData={data} />
    </div>
  );
}
