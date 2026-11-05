import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getFeeHeadsAction } from '../../actions';
import { NewFeeStructureClient } from './NewFeeStructureClient';

export default async function NewFeeStructurePage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institutionId = session.activeInstitutionId!;
  const userRole = session.activeMembership!.role;

  const [feeHeadsRes, { data: academicYears }, { data: campuses }, { data: classes }, { data: programs }] =
    await Promise.all([
      getFeeHeadsAction({ isActive: true }),
      supabase
        .from('academic_years')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('start_date', { ascending: false }),
      supabase
        .from('campuses')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('name', { ascending: true }),
      supabase
        .from('academic_classes')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('sequence_order', { ascending: true }),
      supabase
        .from('academic_programs')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('name', { ascending: true }),
    ]);

  const feeHeads = feeHeadsRes.success && feeHeadsRes.data ? feeHeadsRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <NewFeeStructureClient
        feeHeads={feeHeads}
        academicYears={academicYears || []}
        campuses={campuses || []}
        classes={classes || []}
        programs={programs || []}
        userRole={userRole}
      />
    </div>
  );
}
