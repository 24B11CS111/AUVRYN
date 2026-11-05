import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewFeePaymentClient } from './NewFeePaymentClient';

export default async function NewFeePaymentPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institutionId = session.activeInstitutionId!;
  const userRole = session.activeMembership!.role;

  const { data: students } = await supabase
    .from('students')
    .select(`
      id,
      first_name,
      last_name,
      admission_number,
      academic_class:academic_classes(id, name),
      student_fee_assignments(
        id,
        gross_amount,
        net_amount,
        paid_amount,
        balance_amount,
        status,
        fee_structures:fee_structure_id(id, name)
      )
    `)
    .eq('institution_id', institutionId)
    .eq('status', 'active')
    .order('first_name', { ascending: true });

  return (
    <div className="container mx-auto py-6">
      <NewFeePaymentClient
        students={students || []}
        userRole={userRole}
      />
    </div>
  );
}
