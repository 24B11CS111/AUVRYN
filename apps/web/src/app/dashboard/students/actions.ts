'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  studentCreateSchema,
  studentUpdateSchema,
  guardianCreateSchema,
  guardianUpdateSchema,
  linkGuardianSchema,
  studentEnrollmentCreateSchema,
  studentDocumentUploadSchema,
  studentDocumentVerifySchema,
  type StudentCreateInput,
  type StudentUpdateInput,
  type GuardianCreateInput,
  type GuardianUpdateInput,
  type LinkGuardianInput,
  type StudentEnrollmentCreateInput,
  type StudentDocumentUploadInput,
  type StudentDocumentVerifyInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const STUDENT_WRITE_ROLES = ['owner', 'admin', 'academic_admin', 'admissions_officer'] as const;

function isAuthorized(role: string): boolean {
  return STUDENT_WRITE_ROLES.includes(role as any);
}

// ==============================================================================
// 1. Student Identity Actions
// ==============================================================================

export async function createStudentAction(data: StudentCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to register students.' };
    }

    const parsed = studentCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid student data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check admission number uniqueness
    const { data: existing } = await supabase
      .from('students')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('admission_number', parsed.data.admissionNumber)
      .maybeSingle();

    if (existing) {
      return { success: false, error: `Student with admission number "${parsed.data.admissionNumber}" already exists.` };
    }

    const { data: newStudent, error: insertError } = await supabase
      .from('students')
      .insert({
        institution_id: institutionId,
        admission_number: parsed.data.admissionNumber,
        first_name: parsed.data.firstName,
        middle_name: parsed.data.middleName || null,
        last_name: parsed.data.lastName,
        date_of_birth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        blood_group: parsed.data.bloodGroup || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone || null,
        photo_url: parsed.data.photoUrl || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        postal_code: parsed.data.postalCode || null,
        nationality: parsed.data.nationality || 'Domestic',
        emergency_contact_name: parsed.data.emergencyContactName,
        emergency_contact_phone: parsed.data.emergencyContactPhone,
        emergency_contact_relationship: parsed.data.emergencyContactRelationship,
        status: parsed.data.status || 'active',
        date_of_joining: parsed.data.dateOfJoining || new Date().toISOString().split('T')[0],
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'student.created',
      entity_type: 'students',
      entity_id: newStudent.id,
      metadata: { admission_number: parsed.data.admissionNumber, name: `${parsed.data.firstName} ${parsed.data.lastName}` },
    });

    revalidatePath('/dashboard/students');
    return { success: true, data: newStudent };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create student.' };
  }
}

export async function updateStudentAction(id: string, data: StudentUpdateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to update student profile.' };
    }

    const parsed = studentUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid update data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const payload: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.firstName !== undefined) payload.first_name = parsed.data.firstName;
    if (parsed.data.middleName !== undefined) payload.middle_name = parsed.data.middleName || null;
    if (parsed.data.lastName !== undefined) payload.last_name = parsed.data.lastName;
    if (parsed.data.dateOfBirth !== undefined) payload.date_of_birth = parsed.data.dateOfBirth;
    if (parsed.data.gender !== undefined) payload.gender = parsed.data.gender;
    if (parsed.data.bloodGroup !== undefined) payload.blood_group = parsed.data.bloodGroup || null;
    if (parsed.data.email !== undefined) payload.email = parsed.data.email || null;
    if (parsed.data.phone !== undefined) payload.phone = parsed.data.phone || null;
    if (parsed.data.photoUrl !== undefined) payload.photo_url = parsed.data.photoUrl || null;
    if (parsed.data.address !== undefined) payload.address = parsed.data.address || null;
    if (parsed.data.city !== undefined) payload.city = parsed.data.city || null;
    if (parsed.data.state !== undefined) payload.state = parsed.data.state || null;
    if (parsed.data.country !== undefined) payload.country = parsed.data.country || null;
    if (parsed.data.postalCode !== undefined) payload.postal_code = parsed.data.postalCode || null;
    if (parsed.data.nationality !== undefined) payload.nationality = parsed.data.nationality;
    if (parsed.data.emergencyContactName !== undefined) payload.emergency_contact_name = parsed.data.emergencyContactName;
    if (parsed.data.emergencyContactPhone !== undefined) payload.emergency_contact_phone = parsed.data.emergencyContactPhone;
    if (parsed.data.emergencyContactRelationship !== undefined) {
      payload.emergency_contact_relationship = parsed.data.emergencyContactRelationship;
    }
    if (parsed.data.status !== undefined) payload.status = parsed.data.status;

    const { data: updated, error } = await supabase
      .from('students')
      .update(payload)
      .eq('id', id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'student.updated',
      entity_type: 'students',
      entity_id: id,
      metadata: payload,
    });

    revalidatePath('/dashboard/students');
    revalidatePath(`/dashboard/students/${id}`);
    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update student.' };
  }
}

// ==============================================================================
// 2. Guardian Management Actions
// ==============================================================================

export async function createGuardianAction(data: GuardianCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to register guardians.' };
    }

    const parsed = guardianCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid guardian data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Check if guardian with phone exists
    const { data: existing } = await supabase
      .from('guardians')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('phone', parsed.data.phone)
      .maybeSingle();

    if (existing) {
      return { success: true, data: existing };
    }

    const { data: newGuardian, error: insertError } = await supabase
      .from('guardians')
      .insert({
        institution_id: institutionId,
        first_name: parsed.data.firstName,
        last_name: parsed.data.lastName,
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        relationship_default: parsed.data.relationshipDefault || null,
        occupation: parsed.data.occupation || null,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    return { success: true, data: newGuardian };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to create guardian.' };
  }
}

export async function updateGuardianAction(
  id: string,
  data: GuardianUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to update guardians.' };
    }

    const parsed = guardianUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid guardian data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: updated, error: updateError } = await supabase
      .from('guardians')
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

    return { success: true, data: updated };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update guardian.' };
  }
}

export async function linkGuardianAction(data: LinkGuardianInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to link guardians.' };
    }

    const parsed = linkGuardianSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid link data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // If marked primary, unset other primaries for this student
    if (parsed.data.isPrimary) {
      await supabase
        .from('student_guardians')
        .update({ is_primary: false })
        .eq('student_id', parsed.data.studentId);
    }

    const { data: link, error: insertError } = await supabase
      .from('student_guardians')
      .upsert(
        {
          institution_id: institutionId,
          student_id: parsed.data.studentId,
          guardian_id: parsed.data.guardianId,
          relationship: parsed.data.relationship,
          is_primary: parsed.data.isPrimary,
          is_emergency_contact: parsed.data.isEmergencyContact,
          can_pickup: parsed.data.canPickup,
        },
        { onConflict: 'student_id,guardian_id' }
      )
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'student.guardian_linked',
      entity_type: 'student_guardians',
      entity_id: link.id,
      metadata: { student_id: parsed.data.studentId, guardian_id: parsed.data.guardianId },
    });

    revalidatePath(`/dashboard/students/${parsed.data.studentId}`);
    revalidatePath(`/dashboard/students/${parsed.data.studentId}/guardians`);
    return { success: true, data: link };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to link guardian.' };
  }
}

// ==============================================================================
// 3. Student Academic Enrollment Actions
// ==============================================================================

export async function enrollStudentAction(data: StudentEnrollmentCreateInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to enroll students.' };
    }

    const parsed = studentEnrollmentCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid enrollment data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: newEnrollment, error: insertError } = await supabase
      .from('student_enrollments')
      .insert({
        institution_id: institutionId,
        student_id: parsed.data.studentId,
        campus_id: parsed.data.campusId || null,
        academic_year_id: parsed.data.academicYearId,
        program_id: parsed.data.programId,
        class_id: parsed.data.classId,
        section_id: parsed.data.sectionId || null,
        roll_number: parsed.data.rollNumber || null,
        status: parsed.data.status || 'enrolled',
        enrollment_date: parsed.data.enrollmentDate || new Date().toISOString().split('T')[0],
        remarks: parsed.data.remarks || null,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'student.enrolled',
      entity_type: 'student_enrollments',
      entity_id: newEnrollment.id,
      metadata: {
        student_id: parsed.data.studentId,
        class_id: parsed.data.classId,
        academic_year_id: parsed.data.academicYearId,
      },
    });

    revalidatePath(`/dashboard/students/${parsed.data.studentId}`);
    return { success: true, data: newEnrollment };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to enroll student.' };
  }
}

// ==============================================================================
// 4. Student Documents & Verification Actions
// ==============================================================================

export async function uploadStudentDocumentAction(data: StudentDocumentUploadInput): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to upload documents.' };
    }

    const parsed = studentDocumentUploadSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid document metadata.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: newDoc, error: insertError } = await supabase
      .from('student_documents')
      .insert({
        institution_id: institutionId,
        student_id: parsed.data.studentId || null,
        application_id: parsed.data.applicationId || null,
        document_type: parsed.data.documentType,
        title: parsed.data.title,
        storage_path: parsed.data.storagePath,
        file_name: parsed.data.fileName,
        file_size: parsed.data.fileSize,
        mime_type: parsed.data.mimeType,
        verification_status: 'pending',
        uploaded_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    if (parsed.data.studentId) {
      revalidatePath(`/dashboard/students/${parsed.data.studentId}`);
      revalidatePath(`/dashboard/students/${parsed.data.studentId}/documents`);
    }

    return { success: true, data: newDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to record document.' };
  }
}

export async function verifyStudentDocumentAction(
  documentId: string,
  data: StudentDocumentVerifyInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to verify documents.' };
    }

    const parsed = studentDocumentVerifySchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid verification payload.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: updatedDoc, error } = await supabase
      .from('student_documents')
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

    if (updatedDoc.student_id) {
      revalidatePath(`/dashboard/students/${updatedDoc.student_id}`);
      revalidatePath(`/dashboard/students/${updatedDoc.student_id}/documents`);
    }

    return { success: true, data: updatedDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify document.' };
  }
}
