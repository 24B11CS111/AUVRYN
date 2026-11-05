import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AcademicNav } from '@/components/dashboard/AcademicNav';
import { SectionClient } from './SectionClient';
import { getAcademicTerminology } from '@edu-platform/types';
import type {
  AcademicSectionRow,
  AcademicClassRow,
  ProfileRow,
} from '@edu-platform/database';

export default async function AcademicSectionsPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const institution = session.activeMembership!.institution!;
  const terminology = getAcademicTerminology(institution.type);
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const [{ data: sectionsData }, { data: classesData }, { data: membershipsData }] =
    await Promise.all([
      supabase
        .from('academic_sections')
        .select('*')
        .eq('institution_id', institution.id)
        .order('created_at', { ascending: false }),
      supabase
        .from('academic_classes')
        .select('*')
        .eq('institution_id', institution.id)
        .eq('status', 'active')
        .order('name', { ascending: true }),
      supabase
        .from('institution_memberships')
        .select(`
          user_id,
          role,
          profiles:user_id (
            id,
            email,
            full_name,
            avatar_url,
            phone,
            created_at,
            updated_at
          )
        `)
        .eq('institution_id', institution.id)
        .in('role', ['owner', 'admin', 'academic_admin', 'faculty'])
        .eq('status', 'active'),
    ]);

  const sections = (sectionsData || []) as unknown as AcademicSectionRow[];
  const classes = (classesData || []) as unknown as AcademicClassRow[];

  const teachers: ProfileRow[] = (membershipsData || [])
    .map((m: any) => m.profiles)
    .filter(Boolean) as unknown as ProfileRow[];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {terminology.sectionTitle}
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          {terminology.sectionDescription} for {institution.name}
        </p>
      </div>

      <AcademicNav institutionType={institution.type} />

      <SectionClient
        initialSections={sections}
        classes={classes}
        teachers={teachers}
        institutionType={institution.type}
        canManage={canManage}
      />
    </div>
  );
}
