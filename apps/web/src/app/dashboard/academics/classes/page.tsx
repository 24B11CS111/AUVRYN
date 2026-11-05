import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { ClassClient } from './ClassClient';
import { getAcademicTerminology } from '@edu-platform/types';
import type {
  AcademicClassRow,
  AcademicProgramRow,
  AcademicYearRow,
  CampusRow,
} from '@edu-platform/database';

export default async function AcademicClassesPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const terminology = getAcademicTerminology(institution.type);
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const [{ data: classesData }, { data: progsData }, { data: yearsData }, { data: campusesData }] =
    await Promise.all([
      supabase
        .from('academic_classes')
        .select('*')
        .eq('institution_id', institution.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('academic_programs')
        .select('*')
        .eq('institution_id', institution.id)
        .eq('status', 'active')
        .order('name', { ascending: true }),
      supabase
        .from('academic_years')
        .select('*')
        .eq('institution_id', institution.id)
        .order('start_date', { ascending: false }),
      supabase
        .from('campuses')
        .select('*')
        .eq('institution_id', institution.id)
        .order('name', { ascending: true }),
    ]);

  const classes = (classesData || []) as unknown as AcademicClassRow[];
  const programs = (progsData || []) as unknown as AcademicProgramRow[];
  const academicYears = (yearsData || []) as unknown as AcademicYearRow[];
  const campuses = (campusesData || []) as unknown as CampusRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {terminology.classTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {terminology.classDescription} for {institution.name}
        </p>
      </div>

      <AcademicNav institutionType={institution.type} />

      <ClassClient
        initialClasses={classes}
        programs={programs}
        academicYears={academicYears}
        campuses={campuses}
        institutionType={institution.type}
        canManage={canManage}
      />
    </div>
  );
}
