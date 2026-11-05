import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getHomeworkAssignmentsAction } from './actions';
import { AssignmentsClient } from './AssignmentsClient';

export default async function AssignmentsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const res = await getHomeworkAssignmentsAction();
  const assignments = res.success && res.data ? res.data : [];

  return (
    <div className="container mx-auto py-6">
      <AssignmentsClient
        initialAssignments={assignments}
        userRole={userRole}
      />
    </div>
  );
}
