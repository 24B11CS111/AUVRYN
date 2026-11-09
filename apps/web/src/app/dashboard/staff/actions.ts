'use server';

import crypto from 'crypto';
import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  staffCreateSchema,
  staffUpdateSchema,
  staffEmploymentCreateSchema,
  facultyAllocationCreateSchema,
  staffDocumentUploadSchema,
  staffDocumentVerifySchema,
  staffInvitationCreateSchema,
  staffInvitationAcceptSchema,
  type StaffCreateInput,
  type StaffUpdateInput,
  type StaffEmploymentCreateInput,
  type FacultyAllocationCreateInput,
  type StaffDocumentUploadInput,
  type StaffDocumentVerifyInput,
  type StaffInvitationCreateInput,
  type StaffInvitationAcceptInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';
import {
  STORAGE_BUCKETS,
  validateFileUpload,
  validateStoragePath,
  generateStoragePath,
  createSignedDownloadUrl,
} from '@/lib/storage';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const STAFF_ADMIN_ROLES = ['owner', 'admin', 'hr_administrator'] as const;
const ALLOCATION_ROLES = ['owner', 'admin', 'academic_admin', 'department_head'] as const;

function isStaffAdmin(role: string): boolean {
  return STAFF_ADMIN_ROLES.includes(role as any);
}

function canAllocateFaculty(role: string): boolean {
  return ALLOCATION_ROLES.includes(role as any);
}

// ==============================================================================
// 1. Staff Profile Actions
// ==============================================================================

export async function createStaffAction(data: StaffCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isStaffAdmin(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to register staff.' };
    }

    const parsed = staffCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid staff payload.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check employee ID duplicate
    const { data: existingId } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('employee_id', parsed.data.employeeId)
      .maybeSingle();

    if (existingId) {
      return { success: false, error: `Employee ID "${parsed.data.employeeId}" is already assigned in this institution.` };
    }

    // Check if user already exists with this email to link user_id safely
    let linkedUserId: string | null = parsed.data.userId || null;
    if (!linkedUserId) {
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', parsed.data.email)
        .maybeSingle();
      if (userProfile) {
        linkedUserId = userProfile.id;
      }
    }

    // Insert staff profile
    const { data: newStaff, error: insertError } = await supabase
      .from('staff_profiles')
      .insert({
        institution_id: institutionId,
        employee_id: parsed.data.employeeId,
        first_name: parsed.data.firstName,
        middle_name: parsed.data.middleName || null,
        last_name: parsed.data.lastName,
        photo_url: parsed.data.photoUrl || null,
        date_of_birth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        email: parsed.data.email,
        phone: parsed.data.phone,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        postal_code: parsed.data.postalCode || null,
        emergency_contact_name: parsed.data.emergencyContactName || null,
        emergency_contact_phone: parsed.data.emergencyContactPhone || null,
        emergency_contact_relationship: parsed.data.emergencyContactRelationship || null,
        joining_date: parsed.data.joiningDate,
        staff_category: parsed.data.staffCategory,
        designation: parsed.data.designation,
        department_id: parsed.data.departmentId || null,
        campus_id: parsed.data.campusId || null,
        employment_type: parsed.data.employmentType,
        employment_status: parsed.data.employmentStatus,
        qualification: parsed.data.qualification || null,
        years_of_experience: parsed.data.yearsOfExperience || 0,
        user_id: linkedUserId,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    // Automatically record initial employment entry
    await supabase.from('staff_employments').insert({
      institution_id: institutionId,
      staff_id: newStaff.id,
      campus_id: parsed.data.campusId || null,
      department_id: parsed.data.departmentId || null,
      designation: parsed.data.designation,
      employment_type: parsed.data.employmentType,
      employment_status: parsed.data.employmentStatus,
      start_date: parsed.data.joiningDate,
      remarks: 'Initial employment record upon staff onboarding',
      created_by: session.user.id,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'staff.created',
      entity_type: 'staff_profiles',
      entity_id: newStaff.id,
      metadata: { employee_id: parsed.data.employeeId, name: `${parsed.data.firstName} ${parsed.data.lastName}` },
    });

    revalidatePath('/dashboard/staff');
    return { success: true, data: newStaff };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create staff record.' };
  }
}

export async function updateStaffAction(id: string, data: StaffUpdateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isStaffAdmin(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to modify staff details.' };
    }

    const parsed = staffUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update payload.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: updated, error: updateError } = await supabase
      .from('staff_profiles')
      .update({
        ...parsed.data,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: formatSupabaseError(updateError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'staff.updated',
      entity_type: 'staff_profiles',
      entity_id: id,
      metadata: { updated_fields: Object.keys(parsed.data) },
    });

    revalidatePath('/dashboard/staff');
    revalidatePath(`/dashboard/staff/${id}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update staff record.' };
  }
}

// ==============================================================================
// 2. Staff Employment History & Transfers Actions
// ==============================================================================

export async function recordStaffEmploymentAction(data: StaffEmploymentCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isStaffAdmin(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to record employment.' };
    }

    const parsed = staffEmploymentCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid employment record.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Record employment history
    const { data: employment, error: insertError } = await supabase
      .from('staff_employments')
      .insert({
        institution_id: institutionId,
        staff_id: parsed.data.staffId,
        campus_id: parsed.data.campusId || null,
        department_id: parsed.data.departmentId || null,
        designation: parsed.data.designation,
        employment_type: parsed.data.employmentType,
        employment_status: parsed.data.employmentStatus,
        start_date: parsed.data.startDate,
        end_date: parsed.data.endDate || null,
        reporting_manager_id: parsed.data.reportingManagerId || null,
        remarks: parsed.data.remarks || null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    // Synchronize current active placement to staff_profiles
    await supabase
      .from('staff_profiles')
      .update({
        campus_id: parsed.data.campusId || null,
        department_id: parsed.data.departmentId || null,
        designation: parsed.data.designation,
        employment_type: parsed.data.employmentType,
        employment_status: parsed.data.employmentStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.staffId)
      .eq('institution_id', institutionId);

    revalidatePath(`/dashboard/staff/${parsed.data.staffId}`);
    return { success: true, data: employment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record employment change.' };
  }
}

// ==============================================================================
// 3. Faculty Academic Allocation Actions
// ==============================================================================

export async function createFacultyAllocationAction(data: FacultyAllocationCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !canAllocateFaculty(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to assign faculty.' };
    }

    const parsed = facultyAllocationCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid allocation data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // If marked class teacher, check if this section already has another active class teacher
    if (parsed.data.isClassTeacher && parsed.data.sectionId) {
      const { data: existingTeacher } = await supabase
        .from('faculty_allocations')
        .select('id, staff:staff_id (first_name, last_name)')
        .eq('institution_id', institutionId)
        .eq('academic_year_id', parsed.data.academicYearId)
        .eq('section_id', parsed.data.sectionId)
        .eq('is_class_teacher', true)
        .eq('status', 'active')
        .neq('staff_id', parsed.data.staffId)
        .maybeSingle();

      if (existingTeacher) {
        const teacherName = existingTeacher.staff
          ? `${existingTeacher.staff.first_name} ${existingTeacher.staff.last_name}`
          : 'another faculty member';
        return {
          success: false,
          error: `Section already has an active Class Teacher assigned (${teacherName}). Please reassign or update existing assignment first.`,
        };
      }
    }

    const { data: allocation, error: insertError } = await supabase
      .from('faculty_allocations')
      .upsert(
        {
          institution_id: institutionId,
          staff_id: parsed.data.staffId,
          academic_year_id: parsed.data.academicYearId,
          program_id: parsed.data.programId,
          class_id: parsed.data.classId || null,
          section_id: parsed.data.sectionId || null,
          subject_id: parsed.data.subjectId || null,
          is_class_teacher: parsed.data.isClassTeacher,
          is_coordinator: parsed.data.isCoordinator,
          status: parsed.data.status,
          created_by: session.user.id,
        },
        { onConflict: 'institution_id,academic_year_id,class_id,section_id,subject_id,staff_id' }
      )
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'faculty.allocated',
      entity_type: 'faculty_allocations',
      entity_id: allocation.id,
      metadata: { staff_id: parsed.data.staffId, subject_id: parsed.data.subjectId, is_class_teacher: parsed.data.isClassTeacher },
    });

    revalidatePath(`/dashboard/staff/${parsed.data.staffId}`);
    revalidatePath(`/dashboard/staff/${parsed.data.staffId}/assignments`);
    return { success: true, data: allocation };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to allocate faculty.' };
  }
}

export async function deleteFacultyAllocationAction(allocationId: string, staffId: string): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !canAllocateFaculty(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to remove allocation.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('faculty_allocations')
      .delete()
      .eq('id', allocationId)
      .eq('institution_id', institutionId);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath(`/dashboard/staff/${staffId}`);
    revalidatePath(`/dashboard/staff/${staffId}/assignments`);
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to delete faculty allocation.' };
  }
}

// ==============================================================================
// 4. Staff Documents Actions
// ==============================================================================

export async function uploadStaffDocumentAction(data: StaffDocumentUploadInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role) {
      return { success: false, error: 'Unauthorized.' };
    }

    const parsed = staffDocumentUploadSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid document metadata.' };
    }

    // Validate file against bucket policy restrictions
    const validation = validateFileUpload(STORAGE_BUCKETS.STAFF_DOCUMENTS, {
      fileName: parsed.data.fileName,
      fileSize: parsed.data.fileSize,
      mimeType: parsed.data.mimeType,
    });
    if (!validation.valid) {
      return { success: false, error: validation.error || 'Invalid file format or size.' };
    }

    const institutionId = session.activeMembership!.institutionId;

    // Enforce canonical institution-isolated storage path to prevent directory traversal or cross-tenant injection
    const targetStoragePath =
      parsed.data.storagePath && validateStoragePath(parsed.data.storagePath, institutionId).valid
        ? parsed.data.storagePath
        : generateStoragePath(institutionId, 'staff', parsed.data.staffId, parsed.data.fileName);

    const supabase = createClient() as any;

    const { data: newDoc, error: insertError } = await supabase
      .from('staff_documents')
      .insert({
        institution_id: institutionId,
        staff_id: parsed.data.staffId,
        document_type: parsed.data.documentType,
        title: parsed.data.title,
        file_name: parsed.data.fileName,
        file_size: parsed.data.fileSize,
        mime_type: parsed.data.mimeType,
        storage_path: targetStoragePath,
        verification_status: 'pending',
        uploaded_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    revalidatePath(`/dashboard/staff/${parsed.data.staffId}`);
    revalidatePath(`/dashboard/staff/${parsed.data.staffId}/documents`);
    return { success: true, data: newDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to upload staff document record.' };
  }
}

export async function getStaffDocumentSignedUrlAction(
  documentId: string
): Promise<ActionResult<{ signedUrl: string }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeMembership!.institutionId;
    const role = session.activeMembership?.role;
    const supabase = createClient() as any;

    const { data: doc, error: fetchError } = await supabase
      .from('staff_documents')
      .select('id, institution_id, staff_id, storage_path')
      .eq('id', documentId)
      .eq('institution_id', institutionId)
      .single();

    if (fetchError || !doc) {
      return { success: false, error: 'Document not found or access denied.' };
    }

    const isHrOrAdmin = ['owner', 'admin', 'hr_administrator'].includes(role || '');
    if (!isHrOrAdmin) {
      const { data: staffRecord } = await supabase
        .from('staff_profiles')
        .select('id')
        .eq('user_id', session.user.id)
        .eq('institution_id', institutionId)
        .maybeSingle();

      if (!staffRecord || staffRecord.id !== doc.staff_id) {
        return { success: false, error: 'Forbidden: you do not have permission to view this document.' };
      }
    }

    const { signedUrl, error: signError } = await createSignedDownloadUrl(
      supabase,
      STORAGE_BUCKETS.STAFF_DOCUMENTS,
      doc.storage_path,
      300
    );

    if (signError || !signedUrl) {
      return { success: false, error: signError || 'Failed to generate signed download link.' };
    }

    return { success: true, data: { signedUrl } };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error generating staff document URL.' };
  }
}

export async function verifyStaffDocumentAction(
  documentId: string,
  staffId: string,
  data: StaffDocumentVerifyInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isStaffAdmin(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to verify staff documents.' };
    }

    const parsed = staffDocumentVerifySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid verification data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: updatedDoc, error } = await supabase
      .from('staff_documents')
      .update({
        verification_status: parsed.data.verificationStatus,
        verification_notes: parsed.data.verificationNotes || null,
        verified_by: session.user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath(`/dashboard/staff/${staffId}`);
    revalidatePath(`/dashboard/staff/${staffId}/documents`);
    return { success: true, data: updatedDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify staff document.' };
  }
}

// ==============================================================================
// 5. Staff Onboarding & Access Invitations
// ==============================================================================

export async function createStaffInvitationAction(data: StaffInvitationCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isStaffAdmin(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to invite staff.' };
    }

    const parsed = staffInvitationCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid invitation payload.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Generate secure cryptographic invitation token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days expiry

    const { data: invitation, error: insertError } = await supabase
      .from('staff_invitations')
      .insert({
        institution_id: institutionId,
        staff_id: parsed.data.staffId || null,
        email: parsed.data.email,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        role: parsed.data.role,
        department_id: parsed.data.departmentId || null,
        campus_id: parsed.data.campusId || null,
        invitation_token: token,
        status: 'pending',
        expires_at: expiresAt,
        invited_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'staff_invitation.created',
      entity_type: 'staff_invitations',
      entity_id: invitation.id,
      metadata: { email: parsed.data.email, role: parsed.data.role, staff_id: parsed.data.staffId },
    });

    revalidatePath('/dashboard/staff/invitations');
    return { success: true, data: invitation };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to issue staff invitation.' };
  }
}

export async function revokeStaffInvitationAction(invitationId: string): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isStaffAdmin(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to revoke invitations.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: revoked, error } = await supabase
      .from('staff_invitations')
      .update({
        status: 'revoked',
        updated_at: new Date().toISOString(),
      })
      .eq('id', invitationId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/staff/invitations');
    return { success: true, data: revoked };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to revoke invitation.' };
  }
}

export async function acceptStaffInvitationAction(data: StaffInvitationAcceptInput): Promise<ActionResult> {
  try {
    const parsed = staffInvitationAcceptSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid token.' };
    }

    const supabase = createClient() as any;
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: 'Authentication required to accept invitation. Please log in or sign up.' };
    }

    const { data: result, error: rpcError } = await supabase.rpc('accept_staff_invitation', {
      p_token: parsed.data.invitationToken,
      p_user_id: user.id,
    });

    if (rpcError) {
      return { success: false, error: formatSupabaseError(rpcError) };
    }

    revalidatePath('/dashboard');
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to accept staff invitation.' };
  }
}
