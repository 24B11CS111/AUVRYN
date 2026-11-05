import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { getFeeStructuresAction } from '../actions';
import { FeeStructuresClient } from './FeeStructuresClient';

export default async function FeeStructuresPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institutionId = session.activeInstitutionId!;
  const userRole = session.activeMembership!.role;

  const [structuresRes, { data: academicYears }, { data: campuses }, { data: classes }] = await Promise.all([
    getFeeStructuresAction(),
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
  ]);

  const structures = structuresRes.success && structuresRes.data ? structuresRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <FeeStructuresClient
        initialStructures={structures}
        academicYears={academicYears || []}
        campuses={campuses || []}
        classes={classes || []}
        userRole={userRole}
      />
    </div>
  );
}
