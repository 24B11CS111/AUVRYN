import React from 'react';
import { notFound } from 'next/navigation';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StudentProfileView } from './StudentProfileView';
import type {
  StudentRow,
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

export default async function StudentDetailPage({ params }: PageProps) {
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

  // Fetch linked guardians, enrollments, documents, and academic options
  const [
    { data: guardianLinksData },
    { data: enrollmentsData },
    { data: documentsData },
    { data: yearsData },
    { data: progsData },
    { data: classesData },
    { data: sectionsData },
  ] = await Promise.all([
    supabase
      .from('student_guardians')
      .select(`
        *,
        guardian:guardian_id (*)
      `)
      .eq('student_id', student.id),
    supabase
      .from('student_enrollments')
      .select(`
        *,
        academicYear:academic_year_id (*),
        program:program_id (*),
        class:class_id (*),
        section:section_id (*)
      `)
      .eq('student_id', student.id)
      .order('enrollment_date', { ascending: false }),
    supabase
      .from('student_documents')
      .select('*')
      .eq('student_id', student.id)
      .order('created_at', { ascending: false }),
    supabase
      .from('academic_years')
      .select('*')
      .eq('institution_id', institution.id)
      .order('start_date', { ascending: false }),
    supabase
      .from('academic_programs')
      .select('*')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
    supabase
      .from('academic_classes')
      .select('*')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('level_number', { ascending: true }),
    supabase
      .from('academic_sections')
      .select('*')
      .eq('institution_id', institution.id)
      .eq('status', 'active')
      .order('name', { ascending: true }),
  ]);

  const guardians = (guardianLinksData || []).map((link: any) => ({
    ...link.guardian,
    link,
  }));

  const enrollments = (enrollmentsData || []) as any[];
  const documents = (documentsData || []) as StudentDocumentRow[];
  const academicYears = (yearsData || []) as AcademicYearRow[];
  const programs = (progsData || []) as AcademicProgramRow[];
  const classes = (classesData || []) as AcademicClassRow[];
  const sections = (sectionsData || []) as AcademicSectionRow[];

  return (
    <StudentProfileView
      student={student}
      guardians={guardians}
      enrollments={enrollments}
      documents={documents}
      academicYears={academicYears}
      programs={programs}
      classes={classes}
      sections={sections}
      canManage={canManage}
    />
  );
}
