import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { getVehicleMaintenanceRecordsAction } from '../actions';
import { MaintenanceClient } from './MaintenanceClient';

export default async function MaintenancePage() {
  const session = await requireInstitution();
  const supabase = (await createClient()) as any;
  const institutionId = session.activeInstitutionId!;

  const [recordsRes, { data: vehicles }] = await Promise.all([
    getVehicleMaintenanceRecordsAction(),
    supabase
      .from('transport_vehicles')
      .select('id, registration_number, vehicle_model')
      .eq('institution_id', institutionId)
      .order('registration_number'),
  ]);

  return (
    <MaintenanceClient
      initialRecords={recordsRes.success ? recordsRes.data : []}
      vehicles={vehicles || []}
    />
  );
}
