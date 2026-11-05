import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { EditStudentForm } from './EditStudentForm';
import type { StudentRow } from '@edu-platform/database';

interface PageProps {
  params: {
    id: string;
  };
}

export default async function EditStudentPage({ params }: PageProps) {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;

  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .eq('institution_id', institution.id)
    .single();

  if (!student) {
    notFound();
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit Student Profile
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Update demographics, emergency contact, or status for {student.first_name} {student.last_name}
        </p>
      </div>

      <EditStudentForm student={student as StudentRow} />
    </div>
  );
}
