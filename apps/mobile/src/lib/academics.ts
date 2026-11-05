/**
 * Academic Hierarchy & Data Contracts for Mobile Application
 *
 * Prepares data contracts and retrieval helpers for student and faculty
 * views (e.g. Schedule, My Classes, Enrolled Subjects, Section Mentors).
 */

import { supabase } from './supabase';
import type {
  AcademicDepartment,
  AcademicProgram,
  AcademicClass,
  AcademicSection,
  AcademicSubject,
  AcademicYear,
  InstitutionType,
} from '@edu-platform/types';
import { getAcademicTerminology } from '@edu-platform/types';

export type {
  AcademicDepartment,
  AcademicProgram,
  AcademicClass,
  AcademicSection,
  AcademicSubject,
  AcademicYear,
  InstitutionType,
};
export { getAcademicTerminology };

export interface StudentAcademicEnrollment {
  academicYear: AcademicYear;
  program: AcademicProgram;
  academicClass: AcademicClass;
  section: AcademicSection;
  subjects: AcademicSubject[];
}

/**
 * Fetches the active academic year for an institution.
 */
export async function getActiveAcademicYear(institutionId: string): Promise<AcademicYear | null> {
  const { data, error } = await supabase
    .from('academic_years')
    .select('*')
    .eq('institution_id', institutionId)
    .eq('is_current', true)
    .maybeSingle();

  if (error || !data) return null;
  return data as unknown as AcademicYear;
}

/**
 * Fetches active subjects offered to a class or section.
 */
export async function getClassSubjects(
  institutionId: string,
  classId: string
): Promise<AcademicSubject[]> {
  const { data, error } = await supabase
    .from('academic_class_subjects')
    .select(`
      subject_id,
      academic_subjects:subject_id (*)
    `)
    .eq('institution_id', institutionId)
    .eq('class_id', classId)
    .eq('status', 'active');

  if (error || !data) return [];
  return (data as any[]).map((d) => d.academic_subjects).filter(Boolean);
}
