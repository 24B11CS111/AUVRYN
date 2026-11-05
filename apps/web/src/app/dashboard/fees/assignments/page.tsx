import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getStudentFeeAssignmentsAction, getFeeStructuresAction } from '../actions';
import { FeeAssignmentsClient } from './FeeAssignmentsClient';

export default async function FeeAssignmentsPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institutionId = session.activeInstitutionId!;
  const userRole = session.activeMembership!.role;

  const [assignmentsRes, structuresRes, { data: students }, { data: academicYears }] =
    await Promise.all([
      getStudentFeeAssignmentsAction(),
      getFeeStructuresAction(),
      supabase
        .from('students')
        .select(`
          id,
          first_name,
          last_name,
          admission_number,
          student_enrollments(id, class_id, section_id, status)
        `)
        .eq('institution_id', institutionId)
        .eq('status', 'active')
        .order('first_name', { ascending: true }),
      supabase
        .from('academic_years')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('start_date', { ascending: false }),
    ]);

  const assignments = assignmentsRes.success && assignmentsRes.data ? assignmentsRes.data : [];
  const structures = structuresRes.success && structuresRes.data ? structuresRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <FeeAssignmentsClient
        initialAssignments={assignments}
        students={students || []}
        academicYears={academicYears || []}
        feeStructures={structures}
        userRole={userRole}
      />
    </div>
  );
}
