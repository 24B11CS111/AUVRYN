import React from 'react';
import { createClient } from '@/lib/supabase/server';
import { StudentRegistrationWizard } from '@/components/admissions/StudentRegistrationWizard';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
} from '@edu-platform/database';

export const metadata = {
  title: 'Student Registration & Admission | AUVRYN',
  description: 'Online student registration and admissions portal with verified identity management.',
};

export default async function PublicStudentRegistrationPage({
  searchParams,
}: {
  searchParams?: { institutionId?: string; draftId?: string };
}) {
  const supabase = createClient() as any;

  // Resolve target institution from searchParams or default active institution
  let institutionId = searchParams?.institutionId;
  let institutionName = 'AUVRYN Academy';

  if (!institutionId) {
    const { data: firstInst } = await supabase
      .from('institutions')
      .select('id, name')
      .limit(1)
      .maybeSingle();

    if (firstInst) {
      institutionId = firstInst.id;
      institutionName = firstInst.name;
    }
  } else {
    const { data: inst } = await supabase
      .from('institutions')
      .select('name')
      .eq('id', institutionId)
      .maybeSingle();
    if (inst) institutionName = inst.name;
  }

  // Fetch academic years, programs, and classes
  const [
    { data: yearsData },
    { data: progsData },
    { data: classesData },
  ] = await Promise.all([
    supabase
      .from('academic_years')
      .select('*')
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false }),
    supabase
      .from('academic_programs')
      .select('*')
      .eq('institution_id', institutionId)
      .order('name', { ascending: true }),
    supabase
      .from('academic_classes')
      .select('*')
      .eq('institution_id', institutionId)
      .order('display_order', { ascending: true }),
  ]);

  const years = (yearsData || []) as AcademicYearRow[];
  const programs = (progsData || []) as AcademicProgramRow[];
  const classes = (classesData || []) as AcademicClassRow[];

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto mb-4 text-center">
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
          {institutionName}
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Official Student Admission & Identity Enrollment Portal
        </p>
      </div>

      <StudentRegistrationWizard
        institutionId={institutionId || '00000000-0000-0000-0000-000000000000'}
        institutionName={institutionName}
        years={years}
        programs={programs}
        classes={classes}
        onSuccessRedirectUrl="/portal/parent"
      />
    </div>
  );
}
