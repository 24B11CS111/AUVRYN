import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { AcademicYearClient } from './AcademicYearClient';
import type { AcademicYearRow } from '@edu-platform/database';

export default async function AcademicYearsPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const { data } = await supabase
    .from('academic_years')
    .select('*')
    .eq('institution_id', institution.id)
    .order('start_date', { ascending: false });

  const years = (data || []) as unknown as AcademicYearRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Academic Years & Sessions
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Configure academic calendar periods, dates, and term structures for {institution.name}
        </p>
      </div>

      <AcademicNav institutionType={institution.type} />

      <AcademicYearClient initialYears={years} canManage={canManage} />
    </div>
  );
}
