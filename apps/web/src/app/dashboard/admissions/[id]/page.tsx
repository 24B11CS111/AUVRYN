import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { AdmissionDetailClient } from './AdmissionDetailClient';
import type {
  AdmissionApplicationRow,
  AdmissionStatusHistoryRow,
  StudentDocumentRow,
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
} from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function AdmissionDetailPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin', 'admissions_officer'].includes(userRole);

  const { data: applicationData } = await supabase
    .from('admission_applications')
    .select('*')
    .eq('id', params.id)
    .eq('institution_id', institution.id)
    .single();

  if (!applicationData) {
    notFound();
  }

  const application = applicationData as AdmissionApplicationRow;

  const [
    { data: historyData },
    { data: documentsData },
    { data: yearData },
    { data: progData },
    { data: classData },
    { data: sectionsData },
  ] = await Promise.all([
    supabase
      .from('admission_status_history')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: true }),
    supabase
      .from('student_documents')
      .select('*')
      .eq('application_id', application.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('academic_years')
      .select('*')
      .eq('id', application.academic_year_id)
      .single(),
    supabase
      .from('academic_programs')
      .select('*')
      .eq('id', application.program_id)
      .single(),
    application.class_id
      ? supabase
          .from('academic_classes')
          .select('*')
          .eq('id', application.class_id)
          .single()
      : Promise.resolve({ data: null }),
    application.class_id
      ? supabase
          .from('academic_sections')
          .select('*')
          .eq('class_id', application.class_id)
          .order('name', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  return (
    <AdmissionDetailClient
      application={application}
      history={(historyData || []) as AdmissionStatusHistoryRow[]}
      documents={(documentsData || []) as StudentDocumentRow[]}
      academicYear={yearData as AcademicYearRow | undefined}
      program={progData as AcademicProgramRow | undefined}
      targetClass={classData as AcademicClassRow | undefined}
      availableSections={(sectionsData || []) as AcademicSectionRow[]}
      canManage={canManage}
    />
  );
}
