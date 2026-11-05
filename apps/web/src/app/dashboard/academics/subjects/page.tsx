import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { SubjectClient } from './SubjectClient';
import { getAcademicTerminology } from '@edu-platform/types';
import type { AcademicSubjectRow, AcademicDepartmentRow } from '@edu-platform/database';

export default async function AcademicSubjectsPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const terminology = getAcademicTerminology(institution.type);
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const [{ data: subjectsData }, { data: deptsData }] = await Promise.all([
    supabase
      .from('academic_subjects')
      .select('*')
      .eq('institution_id', institution.id)
      .order('name', { ascending: true }),
    supabase
      .from('academic_departments')
      .select('*')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ]);

  const subjects = (subjectsData || []) as unknown as AcademicSubjectRow[];
  const departments = (deptsData || []) as unknown as AcademicDepartmentRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {terminology.subjectTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Master course and subject catalog for {institution.name}
        </p>
      </div>

      <AcademicNav institutionType={institution.type} />

      <SubjectClient
        initialSubjects={subjects}
        departments={departments}
        institutionType={institution.type}
        canManage={canManage}
      />
    </div>
  );
}
