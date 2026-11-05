import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { getFeeConcessionsAction, getStudentFeeAssignmentsAction } from '../actions';
import { FeeConcessionsClient } from './FeeConcessionsClient';

export default async function FeeConcessionsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const [concessionsRes, assignmentsRes] = await Promise.all([
    getFeeConcessionsAction(),
    getStudentFeeAssignmentsAction(),
  ]);

  const concessions = concessionsRes.success && concessionsRes.data ? concessionsRes.data : [];
  const assignments = assignmentsRes.success && assignmentsRes.data ? assignmentsRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <FeeConcessionsClient
        initialConcessions={concessions}
        activeAssignments={assignments}
        userRole={userRole}
      />
    </div>
  );
}
