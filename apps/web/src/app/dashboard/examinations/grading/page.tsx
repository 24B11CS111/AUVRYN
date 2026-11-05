import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GradingScalesClient } from './GradingScalesClient';

export default async function GradingSchemesPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;

  const { data: gradingScales } = await supabase
    .from('grading_scales')
    .select(`
      id,
      name,
      description,
      calculation_type,
      is_credit_based,
      version,
      is_default,
      is_active,
      created_at,
      rules:grading_scale_rules(*)
    `)
    .eq('institution_id', institution.id)
    .order('name', { ascending: true });

  return (
    <GradingScalesClient
      initialScales={gradingScales || []}
      userRole={userRole}
    />
  );
}
