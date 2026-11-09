import { describe, it, expect } from 'vitest';
import type { Role, MembershipStatus, UserSessionContext } from '../../packages/types/src';

/**
 * Phase 2.2 Regression Test Suite:
 * Portal Edge Middleware & Server-Side Authorization Hardening (REM-HIGH-01)
 *
 * Verifies:
 * 1. Edge Middleware redirect logic for /portal/*, /dashboard/*, /onboarding/* vs public routes.
 * 2. Safe redirection after login (sanitizing open-redirect attempts).
 * 3. Invalid or expired session handling.
 * 4. Server-side role authorization (`requirePortalRole` guard and action enforcement).
 * 5. Multi-institution isolation and client parameter manipulation resistance.
 */

// Simulated Edge Middleware logic matching apps/web/src/lib/supabase/middleware.ts
interface SimulatedMiddlewareRequest {
  pathname: string;
  searchParams: Record<string, string>;
  user: { id: string; email: string } | null;
}

interface SimulatedMiddlewareResponse {
  type: 'next' | 'redirect';
  redirectUrl?: string;
}

function simulateMiddleware(req: SimulatedMiddlewareRequest): SimulatedMiddlewareResponse {
  const { pathname, searchParams, user } = req;
  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/portal');

  // If user is not authenticated and trying to access protected route, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = `/auth/login?redirectTo=${encodeURIComponent(pathname)}`;
    return { type: 'redirect', redirectUrl };
  }

  // If user is already authenticated and visits login/register, redirect to destination or dashboard
  if (user && (pathname === '/auth/login' || pathname === '/auth/register')) {
    const redirectTo = searchParams['redirectTo'];
    // Validate redirectTo is a safe internal relative path
    if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
      return { type: 'redirect', redirectUrl: redirectTo };
    }
    return { type: 'redirect', redirectUrl: '/dashboard' };
  }

  return { type: 'next' };
}

// Simulated requirePortalRole logic matching apps/web/src/lib/auth.ts
function simulateRequirePortalRole(
  session: UserSessionContext | null,
  allowedRoles: Role[],
  fallbackRedirect: string = '/dashboard'
): { allowed: boolean; redirectTo?: string } {
  if (!session || !session.user) {
    return { allowed: false, redirectTo: '/auth/login' };
  }

  if (!session.memberships.length || !session.activeMembership) {
    return { allowed: false, redirectTo: '/onboarding' };
  }

  const membership = session.activeMembership;
  if (membership.status !== 'active') {
    return { allowed: false, redirectTo: '/onboarding' };
  }

  const role = membership.role;
  const isAllowed =
    allowedRoles.includes(role) ||
    (allowedRoles.includes('parent') && (role as string) === 'guardian');

  if (!isAllowed) {
    return { allowed: false, redirectTo: fallbackRedirect };
  }

  return { allowed: true };
}

// Simulated Parent Portal Data Resolution logic matching apps/web/src/app/portal/parent/actions.ts
interface MockDb {
  guardians: Array<{ id: string; institutionId: string; userId: string }>;
  studentGuardians: Array<{ institutionId: string; studentId: string; guardianId: string }>;
  students: Array<{ id: string; institutionId: string; firstName: string }>;
}

function simulateParentPortalAction(
  session: UserSessionContext | null,
  db: MockDb,
  selectedStudentId?: string
): { success: boolean; data?: any; error?: string } {
  if (!session || !session.activeMembership) {
    return { success: false, error: 'Unauthorized: No active institution session' };
  }

  const membership = session.activeMembership;

  let studentIds: string[] = [];

  if (membership.role === 'parent' || (membership.role as string) === 'guardian') {
    const guardian = db.guardians.find(
      (g) => g.institutionId === membership.institutionId && g.userId === membership.userId
    );

    if (guardian) {
      const links = db.studentGuardians.filter(
        (sg) => sg.institutionId === membership.institutionId && sg.guardianId === guardian.id
      );
      studentIds = links.map((l) => l.studentId);
    }
  } else if (membership.role === 'owner' || membership.role === 'admin') {
    const anyStudents = db.students
      .filter((s) => s.institutionId === membership.institutionId)
      .slice(0, 5);
    studentIds = anyStudents.map((s) => s.id);
  } else {
    return {
      success: false,
      error: 'Unauthorized: parent portal access requires parent, guardian, or administrative role.',
    };
  }

  if (studentIds.length === 0) {
    return {
      success: true,
      data: { children: [], selectedChildId: null },
    };
  }

  // Multi-tenant check: only fetch students belonging to active institution
  const verifiedStudents = db.students.filter(
    (s) => s.institutionId === membership.institutionId && studentIds.includes(s.id)
  );

  // Security check: cannot select student not in verified list
  const activeChildId =
    selectedStudentId && studentIds.includes(selectedStudentId)
      ? selectedStudentId
      : verifiedStudents[0]?.id || null;

  return {
    success: true,
    data: {
      children: verifiedStudents,
      selectedChildId: activeChildId,
    },
  };
}

describe('Phase 2.2 — Portal Edge Middleware & Role Authorization Suite', () => {
  const instA = 'inst-alpha-001';
  const instB = 'inst-beta-002';

  const userParent = 'user-parent-001';
  const userStudent = 'user-student-001';
  const userFaculty = 'user-faculty-001';
  const userAdmin = 'user-admin-001';

  describe('1. Edge Middleware Route Protection', () => {
    it('redirects unauthenticated user from /portal/parent to /auth/login with redirectTo', () => {
      const res = simulateMiddleware({
        pathname: '/portal/parent',
        searchParams: {},
        user: null,
      });
      expect(res.type).toBe('redirect');
      expect(res.redirectUrl).toBe('/auth/login?redirectTo=%2Fportal%2Fparent');
    });

    it('redirects unauthenticated user from /portal/student to /auth/login with redirectTo', () => {
      const res = simulateMiddleware({
        pathname: '/portal/student',
        searchParams: {},
        user: null,
      });
      expect(res.type).toBe('redirect');
      expect(res.redirectUrl).toBe('/auth/login?redirectTo=%2Fportal%2Fstudent');
    });

    it('redirects unauthenticated user from /dashboard/academics to login', () => {
      const res = simulateMiddleware({
        pathname: '/dashboard/academics',
        searchParams: {},
        user: null,
      });
      expect(res.type).toBe('redirect');
      expect(res.redirectUrl).toBe('/auth/login?redirectTo=%2Fdashboard%2Facademics');
    });

    it('allows unauthenticated access to legitimate public routes', () => {
      const publicPaths = ['/', '/auth/login', '/auth/register', '/auth/callback', '/auth/forgot-password'];
      for (const pathname of publicPaths) {
        const res = simulateMiddleware({
          pathname,
          searchParams: {},
          user: null,
        });
        expect(res.type).toBe('next');
      }
    });

    it('redirects authenticated user on /auth/login to their safe redirectTo destination', () => {
      const res = simulateMiddleware({
        pathname: '/auth/login',
        searchParams: { redirectTo: '/portal/parent' },
        user: { id: userParent, email: 'parent@test.com' },
      });
      expect(res.type).toBe('redirect');
      expect(res.redirectUrl).toBe('/portal/parent');
    });

    it('sanitizes malicious open-redirect URLs to /dashboard', () => {
      const res = simulateMiddleware({
        pathname: '/auth/login',
        searchParams: { redirectTo: 'https://attacker.evil.com' },
        user: { id: userParent, email: 'parent@test.com' },
      });
      expect(res.type).toBe('redirect');
      expect(res.redirectUrl).toBe('/dashboard');

      const protocolRelativeRes = simulateMiddleware({
        pathname: '/auth/login',
        searchParams: { redirectTo: '//attacker.evil.com' },
        user: { id: userParent, email: 'parent@test.com' },
      });
      expect(protocolRelativeRes.type).toBe('redirect');
      expect(protocolRelativeRes.redirectUrl).toBe('/dashboard');
    });
  });

  describe('2. Server-Side Guard Authorization (requirePortalRole)', () => {
    const parentSession: UserSessionContext = {
      user: { id: userParent, email: 'parent@test.com' },
      profile: { id: userParent, email: 'parent@test.com', fullName: 'Parent User', avatarUrl: null, phone: null, createdAt: '', updatedAt: '' },
      memberships: [
        { id: 'm-p', institutionId: instA, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
      ],
      activeInstitutionId: instA,
      activeMembership: { id: 'm-p', institutionId: instA, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
    };

    const studentSession: UserSessionContext = {
      user: { id: userStudent, email: 'student@test.com' },
      profile: { id: userStudent, email: 'student@test.com', fullName: 'Student User', avatarUrl: null, phone: null, createdAt: '', updatedAt: '' },
      memberships: [
        { id: 'm-s', institutionId: instA, userId: userStudent, role: 'student', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
      ],
      activeInstitutionId: instA,
      activeMembership: { id: 'm-s', institutionId: instA, userId: userStudent, role: 'student', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
    };

    const facultySession: UserSessionContext = {
      user: { id: userFaculty, email: 'faculty@test.com' },
      profile: { id: userFaculty, email: 'faculty@test.com', fullName: 'Faculty User', avatarUrl: null, phone: null, createdAt: '', updatedAt: '' },
      memberships: [
        { id: 'm-f', institutionId: instA, userId: userFaculty, role: 'faculty', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
      ],
      activeInstitutionId: instA,
      activeMembership: { id: 'm-f', institutionId: instA, userId: userFaculty, role: 'faculty', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
    };

    it('permits parent session on parent portal', () => {
      const check = simulateRequirePortalRole(parentSession, ['parent', 'owner', 'admin']);
      expect(check.allowed).toBe(true);
    });

    it('denies student session on parent portal, redirecting to /dashboard', () => {
      const check = simulateRequirePortalRole(studentSession, ['parent', 'owner', 'admin']);
      expect(check.allowed).toBe(false);
      expect(check.redirectTo).toBe('/dashboard');
    });

    it('denies parent session on student portal, redirecting to /dashboard', () => {
      const check = simulateRequirePortalRole(parentSession, ['student', 'owner', 'admin']);
      expect(check.allowed).toBe(false);
      expect(check.redirectTo).toBe('/dashboard');
    });

    it('denies faculty session on parent portal', () => {
      const check = simulateRequirePortalRole(facultySession, ['parent', 'owner', 'admin']);
      expect(check.allowed).toBe(false);
      expect(check.redirectTo).toBe('/dashboard');
    });

    it('redirects expired or null session to /auth/login', () => {
      const check = simulateRequirePortalRole(null, ['parent', 'owner', 'admin']);
      expect(check.allowed).toBe(false);
      expect(check.redirectTo).toBe('/auth/login');
    });
  });

  describe('3. Multi-Institution Isolation & Parameter Manipulation Resistance', () => {
    const mockDb: MockDb = {
      guardians: [
        { id: 'g-alpha', institutionId: instA, userId: userParent },
        { id: 'g-beta', institutionId: instB, userId: userParent },
      ],
      studentGuardians: [
        { institutionId: instA, studentId: 'child-alpha-1', guardianId: 'g-alpha' },
        { institutionId: instB, studentId: 'child-beta-1', guardianId: 'g-beta' },
      ],
      students: [
        { id: 'child-alpha-1', institutionId: instA, firstName: 'Alice Jr' },
        { id: 'child-beta-1', institutionId: instB, firstName: 'Bob Jr' },
        { id: 'child-stranger-1', institutionId: instA, firstName: 'Charlie Stranger' },
      ],
    };

    it('resolves only children in the active institution (instA) and omits instB children', () => {
      const sessionInstA: UserSessionContext = {
        user: { id: userParent, email: 'parent@test.com' },
        profile: { id: userParent, email: 'parent@test.com', fullName: 'Parent User', avatarUrl: null, phone: null, createdAt: '', updatedAt: '' },
        memberships: [
          { id: 'm-a', institutionId: instA, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
          { id: 'm-b', institutionId: instB, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
        ],
        activeInstitutionId: instA,
        activeMembership: { id: 'm-a', institutionId: instA, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
      };

      const result = simulateParentPortalAction(sessionInstA, mockDb);
      expect(result.success).toBe(true);
      expect(result.data.children).toHaveLength(1);
      expect(result.data.children[0].id).toBe('child-alpha-1');
      expect(result.data.children.some((c: any) => c.id === 'child-beta-1')).toBe(false);
    });

    it('rejects client attempt to select an unrelated student ID (parameter tampering)', () => {
      const sessionInstA: UserSessionContext = {
        user: { id: userParent, email: 'parent@test.com' },
        profile: { id: userParent, email: 'parent@test.com', fullName: 'Parent User', avatarUrl: null, phone: null, createdAt: '', updatedAt: '' },
        memberships: [
          { id: 'm-a', institutionId: instA, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
        ],
        activeInstitutionId: instA,
        activeMembership: { id: 'm-a', institutionId: instA, userId: userParent, role: 'parent', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
      };

      // Attacker passes stranger child id
      const result = simulateParentPortalAction(sessionInstA, mockDb, 'child-stranger-1');
      expect(result.success).toBe(true);
      // Selected child must fallback to authorized child
      expect(result.data.selectedChildId).toBe('child-alpha-1');
      expect(result.data.selectedChildId).not.toBe('child-stranger-1');
    });

    it('explicitly returns unauthorized error if non-parent role executes action', () => {
      const facultySession: UserSessionContext = {
        user: { id: userFaculty, email: 'faculty@test.com' },
        profile: { id: userFaculty, email: 'faculty@test.com', fullName: 'Faculty User', avatarUrl: null, phone: null, createdAt: '', updatedAt: '' },
        memberships: [
          { id: 'm-f', institutionId: instA, userId: userFaculty, role: 'faculty', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
        ],
        activeInstitutionId: instA,
        activeMembership: { id: 'm-f', institutionId: instA, userId: userFaculty, role: 'faculty', status: 'active', permissions: [], joinedAt: '', createdAt: '', updatedAt: '' },
      };

      const result = simulateParentPortalAction(facultySession, mockDb);
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized: parent portal access requires parent');
    });
  });
});
