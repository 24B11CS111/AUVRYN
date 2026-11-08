import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { NewVehicleClient } from './NewVehicleClient';

export default async function NewVehiclePage() {
  const session = await requireInstitution();
  const supabase = (await createClient()) as any;

  const { data: campuses } = await supabase
    .from('campuses')
    .select('id, name')
    .eq('institution_id', session.activeInstitutionId!)
    .order('name');

  return <NewVehicleClient campuses={campuses || []} />;
}
