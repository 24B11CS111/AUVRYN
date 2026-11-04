'use server';

import { createClient } from '@/lib/supabase/server';
import { onboardingFlowSchema, type OnboardingFlowInput } from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface OnboardingResult {
  success: boolean;
  institutionId?: string;
  error?: string;
}

export async function submitOnboarding(data: OnboardingFlowInput): Promise<OnboardingResult> {
  try {
    // 1. Validate payload with Zod
    const parsed = onboardingFlowSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        error: parsed.error.errors[0]?.message || 'Invalid onboarding configuration',
      };
    }

    const { institution, campus, academicYear } = parsed.data;
    const supabase = createClient();

    // 2. Verify authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return {
        success: false,
        error: 'You must be signed in to create an institution.',
      };
    }

    // 3. Invoke atomic PostgreSQL stored procedure: create_institution_with_owner
    // This executes inside a single database transaction, creating:
    // - Institution
    // - Owner Membership (assigned to current caller)
    // - Default Primary Campus
    // - Initial Academic Year
    // - Audit Log entry
    const { data: rpcResult, error: rpcError } = await (supabase.rpc as any)(
      'create_institution_with_owner',
      {
        p_name: institution.name,
        p_slug: institution.slug,
        p_code: institution.code,
        p_type: institution.type,
        p_city: institution.city,
        p_state: institution.state,
        p_country: institution.country,
        p_email: institution.email || null,
        p_phone: institution.phone || null,
        p_website: institution.website || null,
        p_address: institution.address || null,
        p_postal_code: institution.postalCode || null,
        p_campus_name: campus.name || 'Main Campus',
        p_campus_code: campus.code || 'MAIN',
        p_ay_name: academicYear.name,
        p_ay_code: academicYear.code,
        p_ay_start: academicYear.startDate,
        p_ay_end: academicYear.endDate,
        p_term_system: academicYear.termSystem,
      }
    );

    if (rpcError) {
      return {
        success: false,
        error: formatSupabaseError(rpcError),
      };
    }

    const payload = rpcResult as {
      success: boolean;
      institution_id: string;
    };

    return {
      success: true,
      institutionId: payload.institution_id,
    };
  } catch (error) {
    return {
      success: false,
      error: formatSupabaseError(error),
    };
  }
}
