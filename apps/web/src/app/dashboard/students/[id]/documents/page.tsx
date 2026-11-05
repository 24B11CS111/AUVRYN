import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StudentDocumentsClient } from './StudentDocumentsClient';
import type { StudentRow, StudentDocumentRow } from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function StudentDocumentsPage({ params }: PageProps) {
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

  const { data: documentsData } = await supabase
    .from('student_documents')
    .select('*')
    .eq('student_id', student.id)
    .order('created_at', { ascending: false });

  const documents = (documentsData || []) as StudentDocumentRow[];

  return (
    <StudentDocumentsClient
      student={student}
      documents={documents}
      canManage={canManage}
    />
  );
}
