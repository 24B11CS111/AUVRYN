import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { GuardianManagerClient } from './GuardianManagerClient';
import type { StudentRow, GuardianRow, StudentGuardianRow } from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentGuardiansPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin', 'admissions_officer'].includes(userRole);

  const { data: studentData } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .eq('institution_id', institution.id)
    .single();

  if (!studentData) {
    notFound();
  }

  const student = studentData as StudentRow;

  const [
    { data: guardianLinksData },
    { data: allGuardiansData },
  ] = await Promise.all([
    supabase
      .from('student_guardians')
      .select(`
        *,
        guardian:guardian_id (*)
      `)
      .eq('student_id', student.id),
    supabase
      .from('guardians')
      .select('*')
      .eq('institution_id', institution.id)
      .order('last_name', { ascending: true }),
  ]);

  const guardians = (guardianLinksData || []).map((item: any) => ({
    ...item.guardian,
    link: item as StudentGuardianRow,
  }));

  const allInstitutionGuardians = (allGuardiansData || []) as GuardianRow[];

  return (
    <GuardianManagerClient
      student={student}
      guardians={guardians}
      allInstitutionGuardians={allInstitutionGuardians}
      canManage={canManage}
    />
  );
}
