import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { DepartmentClient } from './DepartmentClient';
import { getAcademicTerminology } from '@edu-platform/types';
import type { AcademicDepartmentRow, CampusRow } from '@edu-platform/database';

export default async function AcademicDepartmentsPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const terminology = getAcademicTerminology(institution.type);
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const [{ data: deptsData }, { data: campusesData }] = await Promise.all([
    supabase
      .from('academic_departments')
      .select('*')
      .eq('institution_id', institution.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('campuses')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
  ]);

  const departments = (deptsData || []) as unknown as AcademicDepartmentRow[];
  const campuses = (campusesData || []) as unknown as CampusRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {terminology.departmentTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {terminology.departmentDescription} for {institution.name}
        </p>
      </div>

      <AcademicNav institutionType={institution.type} />

      <DepartmentClient
        initialDepartments={departments}
        campuses={campuses}
        institutionType={institution.type}
        canManage={canManage}
      />
    </div>
  );
}
