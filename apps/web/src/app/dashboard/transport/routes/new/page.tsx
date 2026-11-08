import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { NewRouteClient } from './NewRouteClient';

export default async function NewRoutePage() {
  const session = await requireInstitution();
  const supabase = (await createClient()) as any;
  const institutionId = session.activeInstitutionId!;

  const [{ data: ays }, { data: campuses }, { data: vehicles }, { data: staff }, { data: stops }] =
    await Promise.all([
      supabase
        .from('academic_years')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('start_date', { ascending: false }),
      supabase
        .from('campuses')
        .select('id, name')
        .eq('institution_id', institutionId)
        .order('name'),
      supabase
        .from('transport_vehicles')
        .select('id, registration_number, vehicle_model, seating_capacity, status')
        .eq('institution_id', institutionId)
        .eq('status', 'active')
        .order('registration_number'),
      supabase
        .from('staff_profiles')
        .select('id, first_name, last_name, designation')
        .eq('institution_id', institutionId)
        .eq('employment_status', 'active')
        .order('first_name'),
      supabase
        .from('transport_stops')
        .select('id, name, address, latitude, longitude')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('name'),
    ]);

  return (
    <NewRouteClient
      academicYears={ays || []}
      campuses={campuses || []}
      vehicles={vehicles || []}
      staff={staff || []}
      availableStops={stops || []}
    />
  );
}
