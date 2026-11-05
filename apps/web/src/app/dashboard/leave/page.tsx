import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getLeaveRequestsAction } from './actions';
import { LeaveManagementClient } from './LeaveManagementClient';

export default async function LeavePage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;
  const currentUserId = session.activeMembership!.userId;
  const instId = session.activeMembership!.institutionId;
  const supabase = createClient() as any;

  let linkedStudents: Array<{ id: string; firstName: string; lastName: string; admissionNumber: string }> = [];

  if (userRole === 'parent') {
    const { data: guardian } = await supabase
      .from('guardians')
      .select('id')
      .eq('institution_id', instId)
      .eq('user_id', currentUserId)
      .single();

    if (guardian) {
      const { data: links } = await supabase
        .from('student_guardians')
        .select('student:students(id, first_name, last_name, admission_number)')
        .eq('guardian_id', guardian.id);

      linkedStudents = (links || [])
        .filter((l: any) => l.student)
        .map((l: any) => ({
          id: l.student.id,
          firstName: l.student.first_name,
          lastName: l.student.last_name,
          admissionNumber: l.student.admission_number,
        }));
    }
  } else if (userRole === 'owner' || userRole === 'admin') {
    const { data: sts } = await supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('institution_id', instId)
      .limit(10);

    linkedStudents = (sts || []).map((s: any) => ({
      id: s.id,
      firstName: s.first_name,
      lastName: s.last_name,
      admissionNumber: s.admission_number,
    }));
  }

  const res = await getLeaveRequestsAction();
  const requests = res.success && res.data ? res.data : [];

  return (
    <div className="container mx-auto py-6">
      <LeaveManagementClient
        initialRequests={requests}
        userRole={userRole}
        linkedStudents={linkedStudents}
      />
    </div>
  );
}
