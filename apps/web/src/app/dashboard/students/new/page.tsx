import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { NewStudentForm } from './NewStudentForm';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
} from '@edu-platform/database';

export default async function NewStudentPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  const [{ data: yearsData }, { data: progsData }, { data: classesData }, { data: sectionsData }] =
    await Promise.all([
      supabase
        .from('academic_years')
        .select('*')
        .eq('institution_id', institution.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('academic_programs')
        .select('*')
        .eq('institution_id', institution.id)
        .eq('status', 'active')
        .order('name', { ascending: true }),
      supabase
        .from('academic_classes')
        .select('*')
        .eq('institution_id', institution.id)
        .eq('status', 'active')
        .order('level_number', { ascending: true }),
      supabase
        .from('academic_sections')
        .select('*')
        .eq('institution_id', institution.id)
        .eq('status', 'active')
        .order('name', { ascending: true }),
    ]);

  const academicYears = (yearsData || []) as AcademicYearRow[];
  const programs = (progsData || []) as AcademicProgramRow[];
  const classes = (classesData || []) as AcademicClassRow[];
  const sections = (sectionsData || []) as AcademicSectionRow[];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Register New Student
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Create a central student identity record and optional initial cohort enrollment for {institution.name}
        </p>
      </div>

      <NewStudentForm
        academicYears={academicYears}
        programs={programs}
        classes={classes}
        sections={sections}
      />
    </div>
  );
}
