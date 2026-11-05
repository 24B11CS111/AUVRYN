import React from 'react';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { StudentListClient } from './StudentListClient';
import type { StudentRow, AcademicClassRow } from '@edu-platform/database';

export default async function StudentsDirectoryPage() {
  const session = await requireInstitution();
  const supabase = createClient() as any;
  const institution = session.activeMembership!.institution!;
  const userRole = session.activeMembership!.role;
  const canManage = ['owner', 'admin', 'academic_admin', 'admissions_officer'].includes(userRole);

  // Fetch students, classes, and latest enrollments
  const [{ data: studentsData }, { data: classesData }, { data: enrollmentsData }] = await Promise.all([
    supabase
      .from('students')
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
      .from('student_enrollments')
      .select(`
        *,
        class:class_id (*)
      `)
      .eq('institution_id', institution.id)
      .order('enrollment_date', { ascending: false }),
  ]);

  const rawStudents = (studentsData || []) as StudentRow[];
  const classes = (classesData || []) as AcademicClassRow[];
  const enrollments = (enrollmentsData || []) as any[];

  // Attach latest enrollment to each student
  const students = rawStudents.map((student) => {
    const currentEnrollment = enrollments.find((e) => e.student_id === student.id);
    return {
      ...student,
      currentEnrollment: currentEnrollment || null,
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Student Information System
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Central student directory, identity records, and enrollments for {institution.name}
        </p>
      </div>

      <StudentListClient
        initialStudents={students}
        classes={classes}
        canManage={canManage}
      />
    </div>
  );
}
