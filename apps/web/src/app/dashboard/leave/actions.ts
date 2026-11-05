'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  parentChildLeaveRequestSchema,
  type ParentChildLeaveRequestInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';
import type { LeaveRequest } from '@edu-platform/types';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const LEAVE_APPROVE_ROLES = ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head'] as const;

function canApproveLeave(role: string): boolean {
  return (LEAVE_APPROVE_ROLES as readonly string[]).includes(role);
}

/**
 * Fetch leave requests with filters
 */
export async function getLeaveRequestsAction(filters?: {
  applicantType?: string;
  status?: string;
  studentId?: string;
}): Promise<ActionResult<LeaveRequest[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    let query = supabase
      .from('leave_requests')
      .select(`
        *,
        student:students!leave_requests_student_id_fkey(
          id, admission_number, first_name, last_name, roll_number
        ),
        reviewer:profiles!leave_requests_reviewed_by_fkey(
          id, full_name, email
        )
      `)
      .eq('institution_id', membership.institutionId)
      .order('created_at', { ascending: false });

    if (filters?.applicantType && filters.applicantType !== 'all') {
      query = query.eq('applicant_type', filters.applicantType);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.studentId) {
      query = query.eq('student_id', filters.studentId);
    }

    // Role-based scoping for student / parent
    if (membership.role === 'student') {
      const { data: student } = await supabase
        .from('students')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .eq('user_id', membership.userId)
        .single();

      if (student) {
        query = query.eq('student_id', student.id);
      }
    } else if (membership.role === 'parent') {
      const { data: guardian } = await supabase
        .from('guardians')
        .select('id')
        .eq('institution_id', membership.institutionId)
        .eq('user_id', membership.userId)
        .single();

      if (guardian) {
        const { data: links } = await supabase
          .from('student_guardians')
          .select('student_id')
          .eq('guardian_id', guardian.id);

        const studentIds = (links || []).map((l: any) => l.student_id);
        if (studentIds.length > 0) {
          query = query.in('student_id', studentIds);
        } else {
          return { success: true, data: [] };
        }
      }
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const requests: LeaveRequest[] = (data || []).map((r: any) => ({
      id: r.id,
      institutionId: r.institution_id,
      applicantType: r.applicant_type,
      studentId: r.student_id,
      staffId: r.staff_id,
      leaveType: r.leave_type,
      startDate: r.start_date,
      endDate: r.end_date,
      reason: r.reason,
      status: r.status,
      reviewedBy: r.reviewed_by,
      reviewedAt: r.reviewed_at,
      reviewNotes: r.review_notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      student: r.student ? {
        id: r.student.id,
        admissionNumber: r.student.admission_number,
        firstName: r.student.first_name,
        lastName: r.student.last_name,
        rollNumber: r.student.roll_number,
      } as any : undefined,
      reviewer: r.reviewer ? {
        id: r.reviewer.id,
        fullName: r.reviewer.full_name,
        email: r.reviewer.email,
      } as any : undefined,
    }));

    return { success: true, data: requests };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Submit leave request for a child by a parent
 */
export async function submitParentChildLeaveAction(input: ParentChildLeaveRequestInput): Promise<ActionResult<{ leaveRequestId: string }>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const validated = parentChildLeaveRequestSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase.rpc('submit_parent_child_leave_atomic', {
      p_institution_id: membership.institutionId,
      p_student_id: validated.studentId,
      p_start_date: validated.startDate,
      p_end_date: validated.endDate,
      p_reason: validated.reason,
      p_user_id: membership.userId,
    });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/leave');
    revalidatePath('/portal/parent');
    return {
      success: true,
      data: {
        leaveRequestId: data.leave_request_id,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Review (approve or reject) a leave request
 */
export async function reviewLeaveRequestAction(
  requestId: string,
  status: 'approved' | 'rejected',
  reviewNotes?: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canApproveLeave(membership.role)) {
      return { success: false, error: 'Unauthorized to approve/reject leave requests' };
    }

    const supabase = createClient() as any;

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status,
        reviewed_by: membership.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: reviewNotes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('institution_id', membership.institutionId);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/leave');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
