import { redirect } from 'next/navigation';
import { createClient } from './supabase/server';
import type { Database } from '@edu-platform/database';
import type { UserSessionContext, InstitutionMembership, Role, Permission, Profile } from '@edu-platform/types';
import { ROLE_PERMISSIONS } from '@edu-platform/types';

export type ProfileRow = Database['public']['Tables']['profiles']['Row'];

/**
 * Maps Supabase Auth user metadata and database `profiles` row into the canonical domain `Profile` type,
 * guaranteeing complete camelCase normalization and defensive fallbacks for missing/partial fields.
 */
export function mapToUserProfile(
  user: { id: string; email?: string | null; created_at?: string; updated_at?: string; user_metadata?: Record<string, any> },
  profileRow?: ProfileRow | null
): Profile {
  const resolvedFullName =
    (typeof profileRow?.full_name === 'string' && profileRow.full_name.trim()) ||
    (typeof (profileRow as any)?.fullName === 'string' && (profileRow as any).fullName.trim()) ||
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim()) ||
    (typeof user.user_metadata?.fullName === 'string' && user.user_metadata.fullName.trim()) ||
    (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim()) ||
    (user.email ? user.email.split('@')[0] : '') ||
    'User';

  return {
    id: user.id,
    email: profileRow?.email || user.email || '',
    fullName: resolvedFullName,
    avatarUrl: profileRow?.avatar_url || (profileRow as any)?.avatarUrl || user.user_metadata?.avatar_url || user.user_metadata?.avatarUrl || null,
    phone: profileRow?.phone || user.user_metadata?.phone || null,
    createdAt: profileRow?.created_at || (profileRow as any)?.createdAt || user.created_at || new Date().toISOString(),
    updatedAt: profileRow?.updated_at || (profileRow as any)?.updatedAt || user.updated_at || user.created_at || new Date().toISOString(),
  };
}

/**
 * Retrieves the full user session context including profiles and institution memberships.
 */
export async function getSessionContext(): Promise<UserSessionContext | null> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return null;
  }

  // Fetch profile
  const { data: profile } = (await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()) as { data: ProfileRow | null; error: any };

  const userProfile = mapToUserProfile(user, profile);

  // Fetch all active memberships for this user
  const { data: rawMemberships } = await supabase
    .from('institution_memberships')
    .select(`
      id,
      institution_id,
      user_id,
      role,
      permissions,
      status,
      title,
      department,
      joined_at,
      created_at,
      updated_at,
      institutions:institution_id (
        id,
        name,
        slug,
        code,
        type,
        status,
        logo_url,
        website,
        email,
        phone,
        address,
        city,
        state,
        country,
        postal_code,
        settings,
        created_at,
        updated_at
      )
    `)
    .eq('user_id', user.id)
    .eq('status', 'active');

  const memberships: InstitutionMembership[] = (rawMemberships || []).map((m: any) => {
    const inst = m.institutions;
    return {
      id: m.id,
      institutionId: m.institution_id,
      userId: m.user_id,
      role: m.role as Role,
      permissions: (m.permissions as Permission[]) || ROLE_PERMISSIONS[m.role as Role] || [],
      status: m.status,
      title: m.title,
      department: m.department,
      joinedAt: m.joined_at,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      institution: inst
        ? {
            id: inst.id,
            name: inst.name,
            slug: inst.slug,
            code: inst.code,
            type: inst.type,
            status: inst.status,
            logoUrl: inst.logo_url,
            website: inst.website,
            email: inst.email,
            phone: inst.phone,
            address: inst.address,
            city: inst.city,
            state: inst.state,
            country: inst.country,
            postalCode: inst.postal_code,
            settings: inst.settings || {},
            createdAt: inst.created_at,
            updatedAt: inst.updated_at,
          }
        : undefined,
    };
  });

  const activeMembership = memberships[0] || null;
  const activeInstitutionId = activeMembership?.institutionId || null;

  return {
    user: {
      id: user.id,
      email: user.email || '',
    },
    profile: userProfile,
    memberships,
    activeInstitutionId,
    activeMembership,
  };
}

/**
 * Guard: Requires authentication. Redirects to /auth/login if not logged in.
 */
export async function requireAuth(): Promise<UserSessionContext> {
  const context = await getSessionContext();
  if (!context) {
    redirect('/auth/login');
  }
  return context;
}

/**
 * Guard: Requires institution membership. If user has no institutions, redirects to /onboarding.
 */
export async function requireInstitution(): Promise<UserSessionContext> {
  const context = await requireAuth();

  if (!context.memberships.length) {
    redirect('/onboarding');
  }

  return context;
}

/**
 * Guard: Requires specific portal roles. Redirects to fallback route (e.g. /dashboard) if unauthorized.
 */
export async function requirePortalRole(
  allowedRoles: Role[],
  fallbackRedirect: string = '/dashboard'
): Promise<UserSessionContext> {
  const context = await requireInstitution();
  const membership = context.activeMembership;

  if (!membership || membership.status !== 'active') {
    redirect('/onboarding');
  }

  const role = membership.role;
  const isAllowed =
    allowedRoles.includes(role) ||
    (allowedRoles.includes('parent') && (role as string) === 'guardian');

  if (!isAllowed) {
    redirect(fallbackRedirect);
  }

  return context;
}

/**
 * Server-side authorization check against specific roles
 */
export function hasRequiredRole(
  context: UserSessionContext,
  institutionId: string,
  allowedRoles: Role[]
): boolean {
  const membership = context.memberships.find(
    (m) => m.institutionId === institutionId && m.status === 'active'
  );
  if (!membership) return false;
  return allowedRoles.includes(membership.role);
}
