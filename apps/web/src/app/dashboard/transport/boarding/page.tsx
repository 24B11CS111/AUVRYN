import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { getStudentBoardingEventsAction } from '../actions';
import { BoardingClient } from './BoardingClient';

export default async function BoardingPage() {
  const session = await requireInstitution();
  const supabase = (await createClient()) as any;
  const institutionId = session.activeInstitutionId!;

  const [eventsRes, { data: journeys }, { data: students }, { data: stops }] =
    await Promise.all([
      getStudentBoardingEventsAction(),
      supabase
        .from('transport_journeys')
        .select('id, journey_date, route:transport_routes(route_name, route_code)')
        .eq('institution_id', institutionId)
        .in('status', ['in_progress', 'delayed', 'scheduled']),
      supabase
        .from('students')
        .select('id, first_name, last_name, admission_number')
        .eq('institution_id', institutionId)
        .eq('status', 'active')
        .order('first_name'),
      supabase
        .from('transport_stops')
        .select('id, name')
        .eq('institution_id', institutionId)
        .eq('is_active', true)
        .order('name'),
    ]);

  return (
    <BoardingClient
      initialEvents={eventsRes.success ? eventsRes.data : []}
      activeJourneys={journeys || []}
      students={students || []}
      stops={stops || []}
    />
  );
}
