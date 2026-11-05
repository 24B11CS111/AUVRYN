import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { ProgramClient } from './ProgramClient';
import { getAcademicTerminology } from '@edu-platform/types';
import type { AcademicProgramRow, AcademicDepartmentRow } from '@edu-platform/database';

export default async function AcademicProgramsPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const terminology = getAcademicTerminology(institution.type);
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const [{ data: progsData }, { data: deptsData }] = await Promise.all([
    supabase
      .from('academic_programs')
      .select('*')
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('academic_departments')
      .select('*')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ]);

  const programs = (progsData || []) as unknown as AcademicProgramRow[];
  const departments = (deptsData || []) as unknown as AcademicDepartmentRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {terminology.programTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {terminology.programDescription} for {institution.name}
        </p>
      </div>

      <AcademicNav institutionType={institution.type} />

      <ProgramClient
        initialPrograms={programs}
        departments={departments}
        institutionType={institution.type}
        canManage={canManage}
      />
    </div>
  );
}
