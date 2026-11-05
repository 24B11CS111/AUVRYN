'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  admissionApplicationCreateSchema,
  admissionStatusUpdateSchema,
  admissionConversionSchema,
  type AdmissionApplicationCreateInput,
  type AdmissionStatusUpdateInput,
  type AdmissionConversionInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ADMISSION_WRITE_ROLES = ['owner', 'admin', 'academic_admin', 'admissions_officer'] as const;

function isAuthorized(role: string): boolean {
  return ADMISSION_WRITE_ROLES.includes(role as any);
}

export async function createAdmissionApplicationAction(
  data: AdmissionApplicationCreateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to create applications.' };
    }

    const parsed = admissionApplicationCreateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid application data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Generate unique application number
    const timestampSuffix = Date.now().toString().slice(-6);
    const randomPrefix = Math.floor(100 + Math.random() * 900);
    const applicationNumber = `APP-${new Date().getFullYear()}-${randomPrefix}${timestampSuffix}`;

    const { data: newApp, error: insertError } = await supabase
      .from('admission_applications')
      .insert({
        institution_id: institutionId,
        application_number: applicationNumber,
        campus_id: parsed.data.campusId || null,
        academic_year_id: parsed.data.academicYearId,
        program_id: parsed.data.programId,
        class_id: parsed.data.classId || null,
        first_name: parsed.data.firstName,
        middle_name: parsed.data.middleName || null,
        last_name: parsed.data.lastName,
        date_of_birth: parsed.data.dateOfBirth,
        gender: parsed.data.gender,
        blood_group: parsed.data.bloodGroup || null,
        email: parsed.data.email || null,
        phone: parsed.data.phone,
        address: parsed.data.address || null,
        city: parsed.data.city || null,
        state: parsed.data.state || null,
        country: parsed.data.country || null,
        postal_code: parsed.data.postalCode || null,
        nationality: parsed.data.nationality || 'Domestic',
        previous_school_name: parsed.data.previousSchoolName || null,
        previous_grade_or_score: parsed.data.previousGradeOrScore || null,
        primary_guardian_name: parsed.data.primaryGuardianName,
        primary_guardian_relationship: parsed.data.primaryGuardianRelationship,
        primary_guardian_phone: parsed.data.primaryGuardianPhone,
        primary_guardian_email: parsed.data.primaryGuardianEmail || null,
        primary_guardian_occupation: parsed.data.primaryGuardianOccupation || null,
        secondary_guardian_name: parsed.data.secondaryGuardianName || null,
        secondary_guardian_relationship: parsed.data.secondaryGuardianRelationship || null,
        secondary_guardian_phone: parsed.data.secondaryGuardianPhone || null,
        secondary_guardian_email: parsed.data.secondaryGuardianEmail || null,
        status: 'submitted',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    // Record status history
    await supabase.from('admission_status_history').insert({
      application_id: newApp.id,
      from_status: null,
      to_status: 'submitted',
      remarks: 'Application submitted',
      changed_by: session.user.id,
    });

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'admission.submitted',
      entity_type: 'admission_applications',
      entity_id: newApp.id,
      metadata: { application_number: applicationNumber, applicant_name: `${parsed.data.firstName} ${parsed.data.lastName}` },
    });

    revalidatePath('/dashboard/admissions');
    return { success: true, data: newApp };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit admission application.' };
  }
}

export async function updateAdmissionStatusAction(
  applicationId: string,
  data: AdmissionStatusUpdateInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to update application status.' };
    }

    const parsed = admissionStatusUpdateSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid status data.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    // Fetch existing status
    const { data: currentApp } = await supabase
      .from('admission_applications')
      .select('status')
      .eq('id', applicationId)
      .eq('institution_id', institutionId)
      .single();

    if (!currentApp) {
      return { success: false, error: 'Application not found.' };
    }

    const { data: updatedApp, error: updateError } = await supabase
      .from('admission_applications')
      .update({
        status: parsed.data.status,
        internal_remarks: parsed.data.remarks || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: formatSupabaseError(updateError) };
    }

    // Record transition history
    await supabase.from('admission_status_history').insert({
      application_id: applicationId,
      from_status: currentApp.status,
      to_status: parsed.data.status,
      remarks: parsed.data.remarks || null,
      changed_by: session.user.id,
    });

    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_user_id: session.user.id,
      action: 'admission.status_updated',
      entity_type: 'admission_applications',
      entity_id: applicationId,
      metadata: { from_status: currentApp.status, to_status: parsed.data.status },
    });

    revalidatePath('/dashboard/admissions');
    revalidatePath(`/dashboard/admissions/${applicationId}`);
    return { success: true, data: updatedApp };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update application status.' };
  }
}

export async function convertAdmissionToStudentAction(
  data: AdmissionConversionInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to convert admissions.' };
    }

    const parsed = admissionConversionSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid conversion input.' };
    }

    const supabase = createClient() as any;

    // Execute atomic stored procedure
    const { data: result, error: rpcError } = await supabase.rpc(
      'convert_admission_to_student',
      {
        p_application_id: parsed.data.applicationId,
        p_admission_number: parsed.data.admissionNumber,
        p_section_id: parsed.data.sectionId || null,
        p_roll_number: parsed.data.rollNumber || null,
      }
    );

    if (rpcError) {
      return { success: false, error: formatSupabaseError(rpcError) };
    }

    revalidatePath('/dashboard/admissions');
    revalidatePath(`/dashboard/admissions/${parsed.data.applicationId}`);
    revalidatePath('/dashboard/students');
    return { success: true, data: result };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to convert admission application.' };
  }
}
