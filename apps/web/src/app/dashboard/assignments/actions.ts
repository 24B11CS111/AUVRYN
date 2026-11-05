'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  homeworkAssignmentCreateSchema,
  homeworkSubmissionSchema,
  homeworkGradingSchema,
  type HomeworkAssignmentCreateInput,
  type HomeworkSubmissionInput,
  type HomeworkGradingInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';
import type {
  HomeworkAssignment,
  HomeworkSubmission,
} from '@edu-platform/types';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const HOMEWORK_MANAGE_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'] as const;

function canManageHomework(role: string): boolean {
  return (HOMEWORK_MANAGE_ROLES as readonly string[]).includes(role);
}

/**
 * Fetch homework assignments with optional filters
 */
export async function getHomeworkAssignmentsAction(filters?: {
  classId?: string;
  subjectId?: string;
  status?: string;
  search?: string;
}): Promise<ActionResult<HomeworkAssignment[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    let query = supabase
      .from('homework_assignments')
      .select(`
        *,
        academicYear:academic_years!homework_assignments_academic_year_id_fkey(id, name),
        academicClass:academic_classes!homework_assignments_class_id_fkey(id, name),
        academicSection:academic_sections!homework_assignments_section_id_fkey(id, name),
        academicSubject:academic_subjects!homework_assignments_subject_id_fkey(id, name, code),
        teacher:profiles!homework_assignments_teacher_id_fkey(id, full_name, email)
      `)
      .eq('institution_id', membership.institutionId)
      .order('due_date', { ascending: false });

    if (filters?.classId && filters.classId !== 'all') {
      query = query.eq('class_id', filters.classId);
    }
    if (filters?.subjectId && filters.subjectId !== 'all') {
      query = query.eq('subject_id', filters.subjectId);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.search?.trim()) {
      query = query.ilike('title', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    // Get submission counts for each assignment
    const assignmentIds = (data || []).map((a: any) => a.id);
    const submissionCounts: Record<string, number> = {};
    let studentSubmissions: Record<string, any> = {};

    if (assignmentIds.length > 0) {
      const { data: subs } = await supabase
        .from('homework_submissions')
        .select('assignment_id, student_id, id, status, marks_obtained, submitted_at, is_late')
        .eq('institution_id', membership.institutionId)
        .in('assignment_id', assignmentIds);

      if (subs) {
        subs.forEach((s: any) => {
          submissionCounts[s.assignment_id] = (submissionCounts[s.assignment_id] || 0) + 1;
        });

        // If the user is a student, attach their own submission
        if (membership.role === 'student') {
          const { data: student } = await supabase
            .from('students')
            .select('id')
            .eq('institution_id', membership.institutionId)
            .eq('user_id', membership.userId)
            .single();

          if (student) {
            subs.filter((s: any) => s.student_id === student.id).forEach((s: any) => {
              studentSubmissions[s.assignment_id] = s;
            });
          }
        }
      }
    }

    const assignments: HomeworkAssignment[] = (data || []).map((a: any) => ({
      id: a.id,
      institutionId: a.institution_id,
      academicYearId: a.academic_year_id,
      campusId: a.campus_id,
      classId: a.class_id,
      sectionId: a.section_id,
      subjectId: a.subject_id,
      teacherId: a.teacher_id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      attachments: a.attachments || [],
      maxMarks: a.max_marks,
      dueDate: a.due_date,
      dueTime: a.due_time,
      allowLateSubmissions: a.allow_late_submissions,
      latePenaltyPercent: a.late_penalty_percent,
      status: a.status,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      academicYear: a.academicYear ? { id: a.academicYear.id, name: a.academicYear.name } as any : undefined,
      academicClass: a.academicClass ? { id: a.academicClass.id, name: a.academicClass.name } as any : undefined,
      academicSection: a.academicSection ? { id: a.academicSection.id, name: a.academicSection.name } as any : undefined,
      academicSubject: a.academicSubject ? { id: a.academicSubject.id, name: a.academicSubject.name, code: a.academicSubject.code } as any : undefined,
      class: a.academicClass ? { id: a.academicClass.id, name: a.academicClass.name } as any : undefined,
      section: a.academicSection ? { id: a.academicSection.id, name: a.academicSection.name } as any : undefined,
      subject: a.academicSubject ? { id: a.academicSubject.id, name: a.academicSubject.name, code: a.academicSubject.code } as any : undefined,
      teacher: a.teacher ? { id: a.teacher.id, fullName: a.teacher.full_name, email: a.teacher.email } as any : undefined,
      submissionCount: submissionCounts[a.id] || 0,
      userSubmission: studentSubmissions[a.id] ? {
        id: studentSubmissions[a.id].id,
        assignmentId: a.id,
        studentId: studentSubmissions[a.id].student_id,
        institutionId: a.institution_id,
        status: studentSubmissions[a.id].status,
        marksObtained: studentSubmissions[a.id].marks_obtained,
        submittedAt: studentSubmissions[a.id].submitted_at,
        isLate: studentSubmissions[a.id].is_late,
        attachments: [],
        createdAt: studentSubmissions[a.id].submitted_at,
        updatedAt: studentSubmissions[a.id].submitted_at,
      } : undefined,
    }));

    return { success: true, data: assignments };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch a single homework assignment with its submissions
 */
export async function getHomeworkAssignmentByIdAction(id: string): Promise<ActionResult<{
  assignment: HomeworkAssignment;
  submissions: HomeworkSubmission[];
}>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { data: a, error: aErr } = await supabase
      .from('homework_assignments')
      .select(`
        *,
        academicYear:academic_years!homework_assignments_academic_year_id_fkey(id, name),
        academicClass:academic_classes!homework_assignments_class_id_fkey(id, name),
        academicSection:academic_sections!homework_assignments_section_id_fkey(id, name),
        academicSubject:academic_subjects!homework_assignments_subject_id_fkey(id, name, code),
        teacher:profiles!homework_assignments_teacher_id_fkey(id, full_name, email)
      `)
      .eq('id', id)
      .eq('institution_id', membership.institutionId)
      .single();

    if (aErr || !a) {
      return { success: false, error: 'Assignment not found' };
    }

    // Fetch submissions
    const { data: subs, error: sErr } = await supabase
      .from('homework_submissions')
      .select(`
        *,
        student:students!homework_submissions_student_id_fkey(
          id, admission_number, first_name, last_name, roll_number
        ),
        grader:profiles!homework_submissions_graded_by_fkey(id, full_name, email)
      `)
      .eq('assignment_id', id)
      .eq('institution_id', membership.institutionId)
      .order('submitted_at', { ascending: false });

    if (sErr) {
      return { success: false, error: formatSupabaseError(sErr) };
    }

    const assignment: HomeworkAssignment = {
      id: a.id,
      institutionId: a.institution_id,
      academicYearId: a.academic_year_id,
      campusId: a.campus_id,
      classId: a.class_id,
      sectionId: a.section_id,
      subjectId: a.subject_id,
      teacherId: a.teacher_id,
      title: a.title,
      description: a.description,
      instructions: a.instructions,
      attachments: a.attachments || [],
      maxMarks: a.max_marks,
      dueDate: a.due_date,
      dueTime: a.due_time,
      allowLateSubmissions: a.allow_late_submissions,
      latePenaltyPercent: a.late_penalty_percent,
      status: a.status,
      createdAt: a.created_at,
      updatedAt: a.updated_at,
      academicYear: a.academicYear ? { id: a.academicYear.id, name: a.academicYear.name } as any : undefined,
      academicClass: a.academicClass ? { id: a.academicClass.id, name: a.academicClass.name } as any : undefined,
      academicSection: a.academicSection ? { id: a.academicSection.id, name: a.academicSection.name } as any : undefined,
      academicSubject: a.academicSubject ? { id: a.academicSubject.id, name: a.academicSubject.name, code: a.academicSubject.code } as any : undefined,
      class: a.academicClass ? { id: a.academicClass.id, name: a.academicClass.name } as any : undefined,
      section: a.academicSection ? { id: a.academicSection.id, name: a.academicSection.name } as any : undefined,
      subject: a.academicSubject ? { id: a.academicSubject.id, name: a.academicSubject.name, code: a.academicSubject.code } as any : undefined,
      teacher: a.teacher ? { id: a.teacher.id, fullName: a.teacher.full_name, email: a.teacher.email } as any : undefined,
      submissionCount: (subs || []).length,
    };

    const submissions: HomeworkSubmission[] = (subs || []).map((s: any) => ({
      id: s.id,
      assignmentId: s.assignment_id,
      studentId: s.student_id,
      institutionId: s.institution_id,
      submissionText: s.submission_text,
      attachments: s.attachments || [],
      submittedAt: s.submitted_at,
      isLate: s.is_late,
      status: s.status,
      marksObtained: s.marks_obtained,
      feedback: s.feedback,
      gradedBy: s.graded_by,
      gradedAt: s.graded_at,
      createdAt: s.created_at,
      updatedAt: s.updated_at,
      student: s.student ? {
        id: s.student.id,
        admissionNumber: s.student.admission_number,
        firstName: s.student.first_name,
        lastName: s.student.last_name,
        rollNumber: s.student.roll_number,
      } as any : undefined,
      grader: s.grader ? {
        id: s.grader.id,
        fullName: s.grader.full_name,
        email: s.grader.email,
      } as any : undefined,
    }));

    return {
      success: true,
      data: {
        assignment,
        submissions,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Create a new homework assignment
 */
export async function createHomeworkAssignmentAction(input: HomeworkAssignmentCreateInput): Promise<ActionResult<HomeworkAssignment>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageHomework(membership.role)) {
      return { success: false, error: 'Unauthorized to create assignments' };
    }

    const validated = homeworkAssignmentCreateSchema.parse(input);
    const supabase = createClient() as any;

    const insertPayload = {
      institution_id: membership.institutionId,
      academic_year_id: validated.academicYearId,
      campus_id: validated.campusId || null,
      class_id: validated.classId,
      section_id: validated.sectionId || null,
      subject_id: validated.subjectId,
      teacher_id: membership.userId,
      title: validated.title,
      description: validated.description || null,
      instructions: validated.instructions || null,
      attachments: validated.attachments || [],
      max_marks: validated.maxMarks,
      due_date: validated.dueDate,
      due_time: validated.dueTime || null,
      allow_late_submissions: validated.allowLateSubmissions,
      late_penalty_percent: validated.latePenaltyPercent,
      status: validated.status,
    };

    const { data, error } = await supabase
      .from('homework_assignments')
      .insert(insertPayload)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/assignments');

    return {
      success: true,
      data: {
        id: data.id,
        institutionId: data.institution_id,
        academicYearId: data.academic_year_id,
        campusId: data.campus_id,
        classId: data.class_id,
        sectionId: data.section_id,
        subjectId: data.subject_id,
        teacherId: data.teacher_id,
        title: data.title,
        description: data.description,
        instructions: data.instructions,
        attachments: data.attachments || [],
        maxMarks: data.max_marks,
        dueDate: data.due_date,
        dueTime: data.due_time,
        allowLateSubmissions: data.allow_late_submissions,
        latePenaltyPercent: data.late_penalty_percent,
        status: data.status,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Submit homework assignment atomically
 */
export async function submitHomeworkAction(input: HomeworkSubmissionInput): Promise<ActionResult<{ submissionId: string; isLate: boolean }>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const validated = homeworkSubmissionSchema.parse(input);
    const supabase = createClient() as any;

    // Verify student ownership if caller is student
    if (membership.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .eq('user_id', membership.userId)
        .single();

      if (!student || student.id !== validated.studentId) {
        return { success: false, error: 'Unauthorized: cannot submit on behalf of other students' };
      }
    }

    const { data, error } = await supabase.rpc('submit_homework_atomic', {
      p_assignment_id: validated.assignmentId,
      p_student_id: validated.studentId,
      p_submission_text: validated.submissionText || null,
      p_attachments: validated.attachments || [],
    });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/assignments');
    revalidatePath(`/dashboard/assignments/${validated.assignmentId}`);
    revalidatePath('/portal/student');

    return {
      success: true,
      data: {
        submissionId: data.submission_id,
        isLate: data.is_late,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Grade a student's homework submission
 */
export async function gradeHomeworkSubmissionAction(input: HomeworkGradingInput): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageHomework(membership.role)) {
      return { success: false, error: 'Unauthorized to grade submissions' };
    }

    const validated = homeworkGradingSchema.parse(input);
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('homework_submissions')
      .update({
        marks_obtained: validated.marksObtained,
        feedback: validated.feedback || null,
        status: validated.status,
        graded_by: membership.userId,
        graded_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', validated.submissionId)
      .eq('institution_id', membership.institutionId);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/assignments');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
