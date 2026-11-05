import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewAssignmentClient } from './NewAssignmentClient';

export default async function NewAssignmentPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const instId = session.activeMembership!.institutionId;

  const [ayRes, classRes, secRes, subRes] = await Promise.all([
    supabase
      .from('academic_years')
      .select('id, name')
      .eq('institution_id', instId)
      .order('start_date', { ascending: false }),
    supabase
      .from('academic_classes')
      .select('id, name')
      .eq('institution_id', instId)
      .order('name', { ascending: true }),
    supabase
      .from('academic_sections')
      .select('id, name, class_id')
      .eq('institution_id', instId),
    supabase
      .from('academic_subjects')
      .select('id, name, code')
      .eq('institution_id', instId)
      .order('name', { ascending: true }),
  ]);

  const academicYears = ayRes.data || [];
  const classes = classRes.data || [];
  const sections = (secRes.data || []).map((s: any) => ({
    id: s.id,
    name: s.name,
    classId: s.class_id,
  }));
  const subjects = subRes.data || [];

  return (
    <div className="container mx-auto py-6">
      <NewAssignmentClient
        academicYears={academicYears}
        classes={classes}
        sections={sections}
        subjects={subjects}
      />
    </div>
  );
}
