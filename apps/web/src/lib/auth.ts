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

  // Resolve active institution from cookie if present, otherwise default to first membership
  let activeInstIdFromCookie: string | null = null;
  try {
    const { cookies } = await import('next/headers');
    const cookieStore = cookies();
    activeInstIdFromCookie = cookieStore.get('active_institution_id')?.value || null;
  } catch {
    // cookies() might be called outside a request context in tests or scripts
  }

  const activeMembership =
    (activeInstIdFromCookie && memberships.find((m) => m.institutionId === activeInstIdFromCookie)) ||
    memberships[0] ||
    null;
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
 * Authoritative Server-Side Platform Admin Validator.
 * Never trusts user-supplied role, query parameters or institution membership.
 */
export function isPlatformAdmin(user: { id?: string; email?: string | null; app_metadata?: any; user_metadata?: any } | null | undefined): boolean {
  if (!user) return false;

  // 1. Check Supabase app_metadata (set only via service-role / secure auth hooks, never client editable)
  if (user.app_metadata?.is_platform_admin === true || user.app_metadata?.role === 'hrix_admin') {
    return true;
  }

  // 2. Check explicitly authorized platform admin emails from server environment
  const envAdminEmails = (process.env.HRIX_PLATFORM_ADMIN_EMAILS || 'admin@auvryn.com,platform@auvryn.com,hrix@auvryn.com')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (user.email && envAdminEmails.includes(user.email.toLowerCase())) {
    return true;
  }

  return false;
}

/**
 * Post-Authentication Smart Router.
 * Determines the authorized destination for the user without requiring manual role selection prior to login:
 * 1. Platform Admin -> /hrix-admin
 * 2. Multiple active memberships -> /auth/select-institution
 * 3. Parent / Guardian -> /portal/parent
 * 4. Student -> /portal/student
 * 5. Faculty / Teacher -> /portal/teacher
 * 6. Institution Admins & Staff -> /dashboard
 * 7. Zero memberships -> /onboarding
 */
export function getPostLoginRedirect(
  context: UserSessionContext,
  userRaw?: { id?: string; email?: string | null; app_metadata?: any }
): string {
  // 1. Platform admin takes highest precedence
  if (isPlatformAdmin(userRaw || context.user)) {
    return '/hrix-admin';
  }

  const activeMemberships = context.memberships.filter((m) => m.status === 'active');

  // 2. No memberships -> Onboarding
  if (activeMemberships.length === 0) {
    return '/onboarding';
  }

  // 3. Multiple active institution memberships -> Institution selection screen
  if (activeMemberships.length > 1) {
    return '/auth/select-institution';
  }

  // 4. Single active membership -> Role-specific portal routing
  const first = activeMemberships[0];
  const role = first ? first.role : 'owner';
  if (role === 'parent' || (role as string) === 'guardian') {
    return '/portal/parent';
  }
  if (role === 'student') {
    return '/portal/student';
  }
  if (role === 'faculty' || (role as string) === 'teacher') {
    return '/portal/teacher';
  }

  // Institutional owners, administrators, HR, accountants, etc.
  return '/dashboard';
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
 * Guard: Requires HRIX Platform Super Admin privileges.
 * Strictly verifies identity server-side; unauthorized users are redirected.
 */
export async function requirePlatformAdmin(): Promise<UserSessionContext> {
  const supabase = createClient();
  const { data: { user }, error } = await supabase.auth.getUser();

  if (error || !user) {
    redirect('/auth/login?redirectTo=/hrix-admin');
  }

  if (!isPlatformAdmin(user)) {
    // Reject non-platform users immediately
    redirect('/dashboard?error=unauthorized_platform_admin');
  }

  const context = await getSessionContext();
  if (!context) {
    redirect('/auth/login?redirectTo=/hrix-admin');
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

export interface PortalRoleOptions {
  allowAdminPreview?: boolean;
  searchParams?: { preview?: string };
  fallbackRedirect?: string;
}

/**
 * Guard: Requires specific portal roles.
 * Strict RBAC: Owners and administrators DO NOT automatically acquire parent, student or teacher permissions.
 * Only explicit role assignments or an explicit, audited preview mechanism (?preview=true) is permitted.
 */
export async function requirePortalRole(
  allowedRoles: Role[],
  options?: PortalRoleOptions
): Promise<UserSessionContext & { isPreview?: boolean }> {
  const context = await requireInstitution();
  const membership = context.activeMembership;

  if (!membership || membership.status !== 'active') {
    redirect('/onboarding');
  }

  const role = membership.role;
  const isDirectlyAllowed =
    allowedRoles.includes(role) ||
    (allowedRoles.includes('parent') && (role as string) === 'guardian') ||
    (allowedRoles.includes('faculty') && (role as string) === 'teacher');

  if (isDirectlyAllowed) {
    return context;
  }

  // Check for explicit, audited admin preview mechanism
  const isAdmin = role === 'owner' || role === 'admin';
  const hasExplicitPreviewParam = options?.searchParams?.preview === 'true';

  if (isAdmin && options?.allowAdminPreview && hasExplicitPreviewParam) {
    // Record audit event for administrative preview inspection
    try {
      const supabase = createClient();
      await (supabase.from('audit_logs') as any).insert({
        institution_id: membership.institutionId,
        actor_id: context.user.id,
        action: 'PORTAL_AUDITED_ADMIN_PREVIEW',
        entity_type: allowedRoles[0] || 'portal',
        details: { preview_target_roles: allowedRoles },
      });
    } catch {
      // Non-fatal if audit logging encounters transient network block
    }

    return { ...context, isPreview: true };
  }

  // Owners and administrators do NOT automatically acquire permissions without explicit assignment
  const fallback = options?.fallbackRedirect || '/dashboard?error=unauthorized_portal_role';
  redirect(fallback);
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
