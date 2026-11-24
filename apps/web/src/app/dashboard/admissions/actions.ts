'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  admissionApplicationCreateSchema,
  admissionStatusUpdateSchema,
  admissionConversionSchema,
  studentRegistrationSchema,
  registrationDraftSaveSchema,
  verifyIdentityDocumentSchema,
  type AdmissionApplicationCreateInput,
  type AdmissionStatusUpdateInput,
  type AdmissionConversionInput,
  type StudentRegistrationInput,
  type RegistrationDraftSaveInput,
  type VerifyIdentityDocumentInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';
import { createSignedDownloadUrl, STORAGE_BUCKETS } from '@/lib/storage';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const ADMISSION_WRITE_ROLES = ['owner', 'admin', 'academic_admin', 'admissions_officer'] as const;

function isAuthorized(role: string): boolean {
  return ADMISSION_WRITE_ROLES.includes(role as any);
}

/**
 * 1. Submit Full Student Registration Application (Multi-Step Form)
 * Handles Personal Info, Masked Aadhaar / Alternative ID, Guardians,
 * Emergency Contacts & Pickups, and DPDP Consents.
 */
export async function submitStudentRegistrationAction(
  data: StudentRegistrationInput
): Promise<ActionResult> {
  try {
    const parsed = studentRegistrationSchema.safeParse(data);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid registration form data.' };
    }

    const input = parsed.data;
    const supabase = createClient() as any;

    // Check optional authentication context if logged in
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData?.user?.id || null;

    // Generate unique application reference number: APP-{YEAR}-{RANDOM6}
    const timestampSuffix = Date.now().toString().slice(-6);
    const randomPrefix = Math.floor(100 + Math.random() * 900);
    const applicationNumber = `APP-${new Date().getFullYear()}-${randomPrefix}${timestampSuffix}`;

    // 1. Insert into admission_applications
    const { data: newApp, error: appError } = await supabase
      .from('admission_applications')
      .insert({
        institution_id: input.institutionId,
        application_number: applicationNumber,
        academic_year_id: input.academicYearId,
        program_id: input.programId,
        class_id: input.classId || null,
        education_type: input.educationType,
        admission_category: input.admissionCategory,
        first_name: input.firstName,
        middle_name: input.middleName || null,
        last_name: input.lastName,
        preferred_name: input.preferredName || null,
        date_of_birth: input.dateOfBirth,
        gender: input.gender,
        blood_group: input.bloodGroup || null,
        email: input.email || null,
        phone: input.phone || input.primaryGuardian.phone,
        address: input.address,
        city: input.city,
        state: input.state,
        country: input.country,
        postal_code: input.postalCode,
        nationality: input.nationality,
        mother_tongue: input.motherTongue || null,
        second_language: input.secondLanguage || null,
        religion: input.religion || null,
        caste_category: input.casteCategory || null,
        birthplace_city: input.birthplaceCity || null,
        birthplace_state: input.birthplaceState || null,
        birthplace_country: input.birthplaceCountry || null,
        identification_mark_1: input.identificationMark1 || null,
        identification_mark_2: input.identificationMark2 || null,
        previous_school_name: input.previousSchoolName || null,
        previous_grade_or_score: input.previousGradeOrScore || null,
        transport_required: input.transportRequired,
        transport_pickup_stop: input.transportPickupStop || null,
        transport_drop_stop: input.transportDropStop || null,
        hostel_required: input.hostelRequired,
        hostel_room_preference: input.hostelRoomPreference || null,
        sibling_info: input.siblingInfo || [],
        medical_alerts: input.medicalAlerts || {},
        special_needs: input.specialNeeds || {},
        primary_guardian_name: `${input.primaryGuardian.firstName} ${input.primaryGuardian.lastName}`,
        primary_guardian_relationship: input.primaryGuardian.relationship,
        primary_guardian_phone: input.primaryGuardian.phone,
        primary_guardian_email: input.primaryGuardian.email || null,
        primary_guardian_occupation: input.primaryGuardian.occupation || null,
        secondary_guardian_name: input.secondaryGuardian ? `${input.secondaryGuardian.firstName} ${input.secondaryGuardian.lastName}` : null,
        secondary_guardian_relationship: input.secondaryGuardian?.relationship || null,
        secondary_guardian_phone: input.secondaryGuardian?.phone || null,
        secondary_guardian_email: input.secondaryGuardian?.email || null,
        status: 'submitted',
        is_draft: false,
      })
      .select()
      .single();

    if (appError) {
      return { success: false, error: formatSupabaseError(appError) };
    }

    const applicationId = newApp.id;

    // 2. Insert Identity Documents
    if (input.identityDocuments && input.identityDocuments.length > 0) {
      const docPayloads = input.identityDocuments.map((doc) => ({
        institution_id: input.institutionId,
        application_id: applicationId,
        document_type: doc.documentType,
        masked_reference: doc.maskedReference, // e.g., XXXX-XXXX-1234
        document_file_path: doc.documentFilePath,
        file_name: doc.fileName,
        file_size: doc.fileSize,
        mime_type: doc.mimeType,
        issuing_authority: doc.issuingAuthority || null,
        issue_date: doc.issueDate || null,
        expiry_date: doc.expiryDate || null,
        verification_status: 'submitted',
        uploaded_by: userId,
      }));

      const { error: docError } = await supabase
        .from('student_identity_documents')
        .insert(docPayloads);

      if (docError) {
        return { success: false, error: formatSupabaseError(docError) };
      }
    }

    // 3. Insert Emergency Contacts & Authorized Pickups
    const emergencyPayloads: any[] = [];
    emergencyPayloads.push({
      institution_id: input.institutionId,
      application_id: applicationId,
      priority: 'primary',
      name: input.primaryEmergencyContact.name,
      relationship: input.primaryEmergencyContact.relationship,
      phone_primary: input.primaryEmergencyContact.phonePrimary,
      phone_secondary: input.primaryEmergencyContact.phoneSecondary || null,
      email: input.primaryEmergencyContact.email || null,
      is_authorized_pickup: input.primaryEmergencyContact.isAuthorizedPickup || false,
      pickup_id_type: input.primaryEmergencyContact.pickupIdType || null,
      pickup_id_masked_ref: input.primaryEmergencyContact.pickupIdMaskedRef || null,
    });

    if (input.secondaryEmergencyContact) {
      emergencyPayloads.push({
        institution_id: input.institutionId,
        application_id: applicationId,
        priority: 'secondary',
        name: input.secondaryEmergencyContact.name,
        relationship: input.secondaryEmergencyContact.relationship,
        phone_primary: input.secondaryEmergencyContact.phonePrimary,
        phone_secondary: input.secondaryEmergencyContact.phoneSecondary || null,
        email: input.secondaryEmergencyContact.email || null,
        is_authorized_pickup: input.secondaryEmergencyContact.isAuthorizedPickup || false,
        pickup_id_type: input.secondaryEmergencyContact.pickupIdType || null,
        pickup_id_masked_ref: input.secondaryEmergencyContact.pickupIdMaskedRef || null,
      });
    }

    if (input.authorizedPickups && input.authorizedPickups.length > 0) {
      for (const pickup of input.authorizedPickups) {
        emergencyPayloads.push({
          institution_id: input.institutionId,
          application_id: applicationId,
          priority: 'secondary',
          name: pickup.name,
          relationship: pickup.relationship,
          phone_primary: pickup.phonePrimary,
          phone_secondary: pickup.phoneSecondary || null,
          email: pickup.email || null,
          is_authorized_pickup: true,
          pickup_id_type: pickup.pickupIdType || null,
          pickup_id_masked_ref: pickup.pickupIdMaskedRef || null,
          pickup_photo_url: pickup.pickupPhotoUrl || null,
        });
      }
    }

    const { error: ecError } = await supabase
      .from('student_emergency_contacts')
      .insert(emergencyPayloads);

    if (ecError) {
      return { success: false, error: formatSupabaseError(ecError) };
    }

    // 4. Insert DPDP Consent Records
    const consentPayloads = [
      {
        institution_id: input.institutionId,
        application_id: applicationId,
        consent_type: 'registration_terms',
        granted: true,
        granted_by_name: input.consentedByName,
        granted_by_relationship: input.consentedByRelationship,
        granted_by_user_id: userId,
        consent_version: 'v1.0',
      },
      {
        institution_id: input.institutionId,
        application_id: applicationId,
        consent_type: 'privacy_notice',
        granted: true,
        granted_by_name: input.consentedByName,
        granted_by_relationship: input.consentedByRelationship,
        granted_by_user_id: userId,
        consent_version: 'v1.0',
      },
      {
        institution_id: input.institutionId,
        application_id: applicationId,
        consent_type: 'photo_media_publication',
        granted: input.photoMediaConsent,
        granted_by_name: input.consentedByName,
        granted_by_relationship: input.consentedByRelationship,
        granted_by_user_id: userId,
        consent_version: 'v1.0',
      },
      {
        institution_id: input.institutionId,
        application_id: applicationId,
        consent_type: 'non_essential_communications',
        granted: input.nonEssentialCommunicationsConsent,
        granted_by_name: input.consentedByName,
        granted_by_relationship: input.consentedByRelationship,
        granted_by_user_id: userId,
        consent_version: 'v1.0',
      },
      {
        institution_id: input.institutionId,
        application_id: applicationId,
        consent_type: 'emergency_medical_treatment',
        granted: true,
        granted_by_name: input.consentedByName,
        granted_by_relationship: input.consentedByRelationship,
        granted_by_user_id: userId,
        consent_version: 'v1.0',
      },
    ];

    const { error: consentError } = await supabase
      .from('student_consent_records')
      .insert(consentPayloads);

    if (consentError) {
      return { success: false, error: formatSupabaseError(consentError) };
    }

    // 5. Record initial status history
    await supabase.from('admission_status_history').insert({
      application_id: applicationId,
      from_status: null,
      to_status: 'submitted',
      remarks: 'Application submitted through online registration portal',
      changed_by: userId,
    });

    revalidatePath('/dashboard/admissions');
    return {
      success: true,
      data: {
        applicationId,
        applicationNumber,
        status: 'submitted',
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit registration application.' };
  }
}

/**
 * 2. Save Application Draft Action
 * Saves incomplete registration data in draft state with resume capability.
 */
export async function saveAdmissionApplicationDraftAction(
  input: RegistrationDraftSaveInput
): Promise<ActionResult> {
  try {
    const parsed = registrationDraftSaveSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid draft data.' };
    }

    const { institutionId, educationType, formData, applicationId, draftAccessToken } = parsed.data;
    const supabase = createClient() as any;

    const token = draftAccessToken || Math.random().toString(36).substring(2, 12).toUpperCase();

    if (applicationId) {
      const { data: updatedDraft, error: updateError } = await supabase
        .from('admission_applications')
        .update({
          education_type: educationType || null,
          metadata: { ...formData },
          draft_access_token: token,
          updated_at: new Date().toISOString(),
        })
        .eq('id', applicationId)
        .eq('institution_id', institutionId)
        .select()
        .single();

      if (updateError) {
        return { success: false, error: formatSupabaseError(updateError) };
      }

      return {
        success: true,
        data: {
          applicationId: updatedDraft.id,
          applicationNumber: updatedDraft.application_number,
          draftAccessToken: token,
          isDraft: true,
        },
      };
    }

    // New draft
    const timestampSuffix = Date.now().toString().slice(-6);
    const randomPrefix = Math.floor(100 + Math.random() * 900);
    const appNumber = `DFT-${new Date().getFullYear()}-${randomPrefix}${timestampSuffix}`;

    const { data: newDraft, error: insertError } = await supabase
      .from('admission_applications')
      .insert({
        institution_id: institutionId,
        application_number: appNumber,
        academic_year_id: parsed.data.academicYearId || null,
        program_id: parsed.data.programId || null,
        class_id: parsed.data.classId || null,
        education_type: educationType || null,
        first_name: (formData.firstName as string) || 'Draft',
        last_name: (formData.lastName as string) || 'Applicant',
        date_of_birth: (formData.dateOfBirth as string) || '2015-01-01',
        phone: (formData.phone as string) || '0000000000',
        primary_guardian_name: (formData.primaryGuardianName as string) || 'Parent',
        primary_guardian_relationship: 'Guardian',
        primary_guardian_phone: (formData.primaryGuardianPhone as string) || '0000000000',
        status: 'draft',
        is_draft: true,
        draft_access_token: token,
        metadata: { ...formData },
      })
      .select()
      .single();

    if (insertError) {
      return { success: false, error: formatSupabaseError(insertError) };
    }

    return {
      success: true,
      data: {
        applicationId: newDraft.id,
        applicationNumber: newDraft.application_number,
        draftAccessToken: token,
        isDraft: true,
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to save registration draft.' };
  }
}

/**
 * 3. Verify Student Identity Document
 * Institution Owner/Admin/Admissions Officer reviews and verifies identity doc.
 * Enforces audit logging and document verification rules.
 */
export async function verifyStudentIdentityDocumentAction(
  input: VerifyIdentityDocumentInput
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized: insufficient privileges to verify identity documents.' };
    }

    const parsed = verifyIdentityDocumentSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0]?.message || 'Invalid verification data.' };
    }

    const { documentId, verificationStatus, verificationNotes } = parsed.data;
    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: updatedDoc, error: updateError } = await supabase
      .from('student_identity_documents')
      .update({
        verification_status: verificationStatus,
        verification_notes: verificationNotes || null,
        verified_by: session.user.id,
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: formatSupabaseError(updateError) };
    }

    // Record in identity document audit log
    await supabase.from('identity_document_audit_logs').insert({
      institution_id: institutionId,
      document_id: documentId,
      actor_user_id: session.user.id,
      action: verificationStatus === 'verified' ? 'verify' : 'reject',
    });

    // Also update parent application status if documents are verified
    if (updatedDoc.application_id) {
      revalidatePath(`/dashboard/admissions/${updatedDoc.application_id}`);
    }
    revalidatePath('/dashboard/admissions');

    return { success: true, data: updatedDoc };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to verify identity document.' };
  }
}

/**
 * 4. Record Document Access Audit (View or Download)
 */
export async function recordIdentityDocumentAccessAuditAction(
  documentId: string,
  action: 'view' | 'download'
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    await supabase.from('identity_document_audit_logs').insert({
      institution_id: institutionId,
      document_id: documentId,
      actor_user_id: session.user.id,
      action: action,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * 5. Request Missing Documents Action
 */
export async function requestMissingDocumentsAction(
  applicationId: string,
  notes: string
): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const role = session.activeMembership?.role;

    if (!role || !isAuthorized(role)) {
      return { success: false, error: 'Unauthorized.' };
    }

    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: updatedApp, error: updateError } = await supabase
      .from('admission_applications')
      .update({
        status: 'documents_pending',
        internal_remarks: notes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', applicationId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (updateError) {
      return { success: false, error: formatSupabaseError(updateError) };
    }

    await supabase.from('admission_status_history').insert({
      application_id: applicationId,
      from_status: updatedApp.status,
      to_status: 'documents_pending',
      remarks: notes,
      changed_by: session.user.id,
    });

    revalidatePath(`/dashboard/admissions/${applicationId}`);
    revalidatePath('/dashboard/admissions');
    return { success: true, data: updatedApp };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to request missing documents.' };
  }
}

/**
 * 6. Approve Admission Application
 */
export async function approveAdmissionApplicationAction(
  applicationId: string,
  internalRemarks?: string
): Promise<ActionResult> {
  return updateAdmissionStatusAction(applicationId, {
    status: 'approved',
    remarks: internalRemarks || 'Application approved by admissions committee',
  });
}

/**
 * 7. Reject Admission Application
 */
export async function rejectAdmissionApplicationAction(
  applicationId: string,
  reason: string
): Promise<ActionResult> {
  return updateAdmissionStatusAction(applicationId, {
    status: 'rejected',
    remarks: reason,
  });
}

/**
 * 8. Legacy Create Application Action
 */
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

    revalidatePath('/dashboard/admissions');
    return { success: true, data: newApp };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit admission application.' };
  }
}

/**
 * 9. Update Admission Status
 */
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

    await supabase.from('admission_status_history').insert({
      application_id: applicationId,
      from_status: currentApp.status,
      to_status: parsed.data.status,
      remarks: parsed.data.remarks || null,
      changed_by: session.user.id,
    });

    revalidatePath('/dashboard/admissions');
    revalidatePath(`/dashboard/admissions/${applicationId}`);
    return { success: true, data: updatedApp };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update application status.' };
  }
}

/**
 * 10. Atomic Convert Admission to Enrolled Student
 */
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

/**
 * 11. Fetch Full Admission Details with Documents, Emergency Contacts, Consents
 */
export async function getAdmissionApplicationDetailsAction(applicationId: string): Promise<ActionResult> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeMembership!.institutionId;
    const supabase = createClient() as any;

    const { data: app, error: appError } = await supabase
      .from('admission_applications')
      .select(`
        *,
        academic_year:academic_years(id, name, code),
        academic_program:academic_programs(id, name, code),
        academic_class:academic_classes(id, name, code)
      `)
      .eq('id', applicationId)
      .eq('institution_id', institutionId)
      .single();

    if (appError || !app) {
      return { success: false, error: 'Application not found.' };
    }

    // Fetch identity documents
    const { data: identityDocs } = await supabase
      .from('student_identity_documents')
      .select('*')
      .eq('application_id', applicationId);

    // Generate signed URLs for documents
    const docsWithSignedUrls = await Promise.all(
      (identityDocs || []).map(async (doc: any) => {
        let signedUrl: string | null = null;
        if (doc.document_file_path) {
          const res = await createSignedDownloadUrl(supabase, STORAGE_BUCKETS.STUDENT_DOCUMENTS, doc.document_file_path, 3600);
          if (res.signedUrl) signedUrl = res.signedUrl;
        }
        return {
          ...doc,
          signedUrl,
        };
      })
    );

    // Fetch emergency contacts
    const { data: emergencyContacts } = await supabase
      .from('student_emergency_contacts')
      .select('*')
      .eq('application_id', applicationId);

    // Fetch consents
    const { data: consents } = await supabase
      .from('student_consent_records')
      .select('*')
      .eq('application_id', applicationId);

    // Fetch status history
    const { data: history } = await supabase
      .from('admission_status_history')
      .select('*')
      .eq('application_id', applicationId)
      .order('created_at', { ascending: false });

    return {
      success: true,
      data: {
        application: app,
        identityDocuments: docsWithSignedUrls,
        emergencyContacts: emergencyContacts || [],
        consents: consents || [],
        history: history || [],
      },
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to fetch application details.' };
  }
}
