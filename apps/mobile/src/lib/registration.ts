import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@edu-platform/database';
import { formatMobileAuthError } from './authErrors';
import { SUPABASE_CONFIGURATION_ERROR } from './supabaseConfig';
import type { IdentityDocumentType } from '@edu-platform/types';

export type MobileRegistrationClient = SupabaseClient<Database> | null;

export type MobileRegistrationResult =
  | { ok: true; requiresEmailConfirmation: boolean }
  | { ok: false; error: string };

export async function registerAdminAccount(
  client: MobileRegistrationClient,
  input: { fullName: string; email: string; password: string }
): Promise<MobileRegistrationResult> {
  if (!client) {
    return { ok: false, error: SUPABASE_CONFIGURATION_ERROR };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { full_name: input.fullName.trim() },
      },
    });

    if (error) {
      return { ok: false, error: formatMobileAuthError(error, 'registration') };
    }

    return { ok: true, requiresEmailConfirmation: !data.session };
  } catch (error) {
    return { ok: false, error: formatMobileAuthError(error, 'registration') };
  }
}

/**
 * Mobile Application Status Checker
 * Allows parents/applicants to track their admission status with reference number.
 */
export async function checkMobileAdmissionStatus(
  client: MobileRegistrationClient,
  applicationNumber: string
): Promise<{
  ok: boolean;
  application?: {
    id: string;
    applicationNumber: string;
    firstName: string;
    lastName: string;
    status: string;
    internalRemarks?: string | null;
    educationType?: string | null;
    createdDate: string;
    identityDocumentsCount: number;
  };
  error?: string;
}> {
  if (!client) {
    return { ok: false, error: SUPABASE_CONFIGURATION_ERROR };
  }

  try {
    const formattedNum = applicationNumber.trim().toUpperCase();
    const { data: app, error } = await client
      .from('admission_applications')
      .select('id, application_number, first_name, last_name, status, internal_remarks, education_type, created_at')
      .eq('application_number', formattedNum)
      .maybeSingle();

    if (error || !app) {
      return { ok: false, error: 'Application reference number not found. Please verify the code.' };
    }

    // Get count of attached documents
    const { count } = await client
      .from('student_identity_documents')
      .select('*', { count: 'exact', head: true })
      .eq('application_id', app.id);

    return {
      ok: true,
      application: {
        id: app.id,
        applicationNumber: app.application_number,
        firstName: app.first_name,
        lastName: app.last_name,
        status: app.status,
        internalRemarks: app.internal_remarks,
        educationType: app.education_type,
        createdDate: app.created_at,
        identityDocumentsCount: count || 0,
      },
    };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Error tracking application status.' };
  }
}

/**
 * Upload Student Identity Document from Mobile
 * Enforces masked reference rules and 5MB size limit.
 */
export async function uploadMobileStudentIdentityDocument(
  client: MobileRegistrationClient,
  input: {
    institutionId: string;
    applicationId?: string;
    studentId?: string;
    documentType: IdentityDocumentType;
    maskedReference: string;
    filePath: string;
    fileName: string;
    fileSize: number;
    mimeType: string;
    issuingAuthority?: string;
  }
): Promise<{ ok: boolean; documentId?: string; error?: string }> {
  if (!client) {
    return { ok: false, error: SUPABASE_CONFIGURATION_ERROR };
  }

  // 1. Compliance check: Reject raw 12-digit Aadhaar
  if (/^\d{12}$/.test(input.maskedReference.replace(/\s+/g, ''))) {
    return {
      ok: false,
      error: 'Raw 12-digit Aadhaar number is prohibited. Please enter a masked reference showing only the last 4 digits.',
    };
  }

  // 2. File size limit: 5MB
  if (input.fileSize > 5 * 1024 * 1024) {
    return { ok: false, error: 'Document exceeds 5MB size limit.' };
  }

  try {
    const { data: userRes } = await client.auth.getUser();
    const userId = userRes?.user?.id || null;

    const { data: newDoc, error } = await client
      .from('student_identity_documents')
      .insert({
        institution_id: input.institutionId,
        application_id: input.applicationId || null,
        student_id: input.studentId || null,
        document_type: input.documentType as any,
        masked_reference: input.maskedReference.trim(),
        document_file_path: input.filePath,
        file_name: input.fileName,
        file_size: input.fileSize,
        mime_type: input.mimeType,
        issuing_authority: input.issuingAuthority || null,
        verification_status: 'submitted' as any,
        uploaded_by: userId,
      })
      .select('id')
      .single();

    if (error) {
      return { ok: false, error: error.message };
    }

    return { ok: true, documentId: newDoc.id };
  } catch (err: any) {
    return { ok: false, error: err.message || 'Failed to upload document.' };
  }
}
