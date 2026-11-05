import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { LeaveManagementClient } from './LeaveManagementClient';

export default async function AttendanceLeavesPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canReview = ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head'].includes(userRole);

  // Fetch leave requests, student list, staff list
  const [
    { data: leavesData },
    { data: studentsData },
    { data: staffData },
  ] = await Promise.all([
    supabase
      .from('leave_requests')
      .select(`
        *,
        student:student_id (id, first_name, last_name, admission_number),
        staff:staff_id (id, first_name, last_name, employee_id)
      `)
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('first_name', { ascending: true })
      .limit(200),
    supabase
      .from('staff_profiles')
      .select('id, first_name, last_name, employee_id')
      .eq('institution_id', institution.id)
      .eq('employment_status', 'active')
      .order('first_name', { ascending: true })
      .limit(200),
  ]);

  const students = (studentsData || []).map((s: any) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    admissionNumber: s.admission_number,
  }));

  const staffList = (staffData || []).map((s: any) => ({
    id: s.id,
    name: `${s.first_name} ${s.last_name}`,
    employeeId: s.employee_id,
  }));

  return (
    <LeaveManagementClient
      initialLeaves={leavesData || []}
      students={students}
      staffList={staffList}
      canReview={canReview}
    />
  );
}
