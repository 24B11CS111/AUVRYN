'use server';

import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { getSessionContext, getPostLoginRedirect, isPlatformAdmin } from '@/lib/auth';

export interface PostLoginRedirectResult {
  success: boolean;
  destination: string;
  isPlatformAdmin?: boolean;
  membershipCount?: number;
  error?: string;
}

/**
 * Server action to determine the verified destination for the currently authenticated user.
 * Runs completely on the server against verified Supabase session and database records.
 */
export async function determinePostLoginRedirectAction(): Promise<PostLoginRedirectResult> {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return { success: false, destination: '/auth/login', error: 'Authentication required' };
    }

    if (isPlatformAdmin(user)) {
      return {
        success: true,
        destination: '/hrix-admin',
        isPlatformAdmin: true,
        membershipCount: 0,
      };
    }

    const context = await getSessionContext();
    if (!context) {
      return { success: false, destination: '/auth/login', error: 'Session context could not be loaded' };
    }

    const destination = getPostLoginRedirect(context, user);

    return {
      success: true,
      destination,
      isPlatformAdmin: false,
      membershipCount: context.memberships.filter((m) => m.status === 'active').length,
    };
  } catch (err: any) {
    return {
      success: false,
      destination: '/dashboard',
      error: err?.message || 'Failed to determine redirect destination',
    };
  }
}

/**
 * Server action to set the active institution cookie and return the appropriate destination.
 */
export async function setActiveInstitutionAction(
  institutionId: string
): Promise<{ success: boolean; destination: string; error?: string }> {
  try {
    const context = await getSessionContext();
    if (!context) {
      return { success: false, destination: '/auth/login', error: 'Authentication required' };
    }

    const targetMembership = context.memberships.find(
      (m) => m.institutionId === institutionId && m.status === 'active'
    );

    if (!targetMembership) {
      return {
        success: false,
        destination: '/auth/select-institution',
        error: 'Unauthorized or inactive institution membership',
      };
    }

    const cookieStore = cookies();
    cookieStore.set('active_institution_id', institutionId, {
      path: '/',
      maxAge: 60 * 60 * 24 * 365, // 1 year
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      httpOnly: false,
    });

    const role = targetMembership.role;
    let destination = '/dashboard';
    if (role === 'parent' || (role as string) === 'guardian') {
      destination = '/portal/parent';
    } else if (role === 'student') {
      destination = '/portal/student';
    } else if (role === 'faculty' || (role as string) === 'teacher') {
      destination = '/portal/teacher';
    }

    return { success: true, destination };
  } catch (err: any) {
    return {
      success: false,
      destination: '/dashboard',
      error: err?.message || 'Failed to set active institution',
    };
  }
}
