import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { getStudentTransportAssignmentsAction } from '../actions';
import { AssignmentsClient } from './AssignmentsClient';

export default async function TransportAssignmentsPage() {
  const session = await requireInstitution();
  const supabase = (await createClient()) as any;
  const institutionId = session.activeInstitutionId!;

  const [
    assignmentsRes,
    { data: students },
    { data: routes },
    { data: stops },
    { data: ays },
    { data: feeStructures },
  ] = await Promise.all([
    getStudentTransportAssignmentsAction(),
    supabase
      .from('students')
      .select('id, first_name, last_name, admission_number')
      .eq('institution_id', institutionId)
      .eq('status', 'active')
      .order('first_name'),
    supabase
      .from('transport_routes')
      .select('id, route_name, route_code, assigned_vehicle:transport_vehicles(seating_capacity)')
      .eq('institution_id', institutionId)
      .eq('status', 'active')
      .order('route_code'),
    supabase
      .from('transport_stops')
      .select('id, name')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('academic_years')
      .select('id, name')
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false }),
    supabase
      .from('fee_structures')
      .select('id, name, total_amount')
      .eq('institution_id', institutionId)
      .order('name'),
  ]);

  return (
    <AssignmentsClient
      initialAssignments={assignmentsRes.success ? assignmentsRes.data : []}
      students={students || []}
      routes={routes || []}
      stops={stops || []}
      academicYears={ays || []}
      feeStructures={feeStructures || []}
    />
  );
}
