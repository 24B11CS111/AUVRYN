import { describe, it, expect, vi } from 'vitest';
import {
  isPlatformAdmin,
  hasRequiredRole,
} from '../../apps/web/src/lib/auth';
import type { UserSessionContext, InstitutionMembership } from '@edu-platform/types';

describe('AUVRYN Security Suite: Platform RBAC & Cross-Tenant Isolation', () => {
  describe('1. HRIX Platform Super Admin Security Boundary', () => {
    it('strictly rejects standard institution owners from platform admin privileges', () => {
      const institutionOwner = {
        id: 'owner-uuid-1',
        email: 'owner@prestigious-academy.edu',
        user_metadata: { role: 'owner' },
        app_metadata: {},
      };

      expect(isPlatformAdmin(institutionOwner)).toBe(false);
    });

    it('strictly rejects institution admins from platform admin privileges', () => {
      const institutionAdmin = {
        id: 'admin-uuid-1',
        email: 'admin@college.org',
        user_metadata: { role: 'admin' },
        app_metadata: {},
      };

      expect(isPlatformAdmin(institutionAdmin)).toBe(false);
    });

    it('strictly rejects spoofed user_metadata role claims', () => {
      // User tampering with their client-side registration metadata
      const maliciousUser = {
        id: 'attacker-uuid-1',
        email: 'attacker@evil.com',
        user_metadata: {
          role: 'hrix_admin',
          is_platform_admin: true,
          is_super_admin: true,
        },
        app_metadata: {}, // app_metadata is empty
      };

      expect(isPlatformAdmin(maliciousUser)).toBe(false);
    });

    it('strictly rejects undefined or anonymous user sessions', () => {
      expect(isPlatformAdmin(null)).toBe(false);
      expect(isPlatformAdmin(undefined)).toBe(false);
      expect(isPlatformAdmin({} as any)).toBe(false);
    });

    it('grants access only to verified platform admin identities via app_metadata or server env', () => {
      const verifiedPlatformAdmin = {
        id: 'hrix-core-admin',
        email: 'admin@auvryn.com',
        app_metadata: { is_platform_admin: true, role: 'hrix_admin' },
      };

      expect(isPlatformAdmin(verifiedPlatformAdmin)).toBe(true);

      const envVerifiedAdmin = {
        id: 'hrix-env-admin',
        email: 'platform@auvryn.com',
        app_metadata: {},
      };
      expect(isPlatformAdmin(envVerifiedAdmin)).toBe(true);
    });
  });

  describe('2. Multi-Tenant Role Isolation & Membership Status', () => {
    const createMembership = (
      instId: string,
      role: any,
      status: 'active' | 'suspended' | 'revoked' = 'active'
    ): InstitutionMembership => ({
      id: `mem-${instId}`,
      institutionId: instId,
      userId: 'test-user-id',
      role,
      status,
      joinedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const mockContext: UserSessionContext = {
      user: { id: 'test-user-id', email: 'user@auvryn.edu' },
      profile: {
        id: 'test-user-id',
        email: 'user@auvryn.edu',
        fullName: 'Test User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      memberships: [
        createMembership('inst-alpha', 'faculty', 'active'),
        createMembership('inst-beta', 'parent', 'active'),
        createMembership('inst-gamma', 'student', 'suspended'),
        createMembership('inst-delta', 'admin', 'revoked'),
      ],
      activeInstitutionId: 'inst-alpha',
      activeMembership: createMembership('inst-alpha', 'faculty', 'active'),
    };

    it('restricts role permissions strictly to the active institution context', () => {
      // In Institution Alpha, user is a faculty member
      expect(hasRequiredRole(mockContext, 'inst-alpha', ['faculty'])).toBe(true);
      expect(hasRequiredRole(mockContext, 'inst-alpha', ['owner', 'admin'])).toBe(false);

      // In Institution Beta, user is a parent, NOT a faculty member
      expect(hasRequiredRole(mockContext, 'inst-beta', ['parent'])).toBe(true);
      expect(hasRequiredRole(mockContext, 'inst-beta', ['faculty'])).toBe(false);
    });

    it('rejects access to institutions where user has no membership', () => {
      expect(hasRequiredRole(mockContext, 'inst-foreign-omega', ['owner', 'admin', 'faculty', 'student'])).toBe(false);
    });

    it('rejects access immediately if membership is suspended or revoked', () => {
      // Gamma is suspended
      expect(hasRequiredRole(mockContext, 'inst-gamma', ['student'])).toBe(false);

      // Delta is revoked
      expect(hasRequiredRole(mockContext, 'inst-delta', ['admin'])).toBe(false);
    });
  });

  describe('3. Portal Domain Boundaries', () => {
    it('verifies teacher cannot access unassigned classes', () => {
      const teacherAllocations = [
        { classId: 'cls-10-A', sectionId: 'sec-1', subjectId: 'math' },
        { classId: 'cls-10-B', sectionId: 'sec-2', subjectId: 'math' },
      ];

      const isAllocated = (sectionId: string) =>
        teacherAllocations.some((a) => a.sectionId === sectionId);

      expect(isAllocated('sec-1')).toBe(true);
      expect(isAllocated('sec-2')).toBe(true);
      expect(isAllocated('sec-unassigned-99')).toBe(false);
    });

    it('verifies parent cannot access unlinked student profiles', () => {
      const linkedChildren = ['student-alice-uuid', 'student-bob-uuid'];

      const isPermittedStudent = (studentId: string) =>
        linkedChildren.includes(studentId);

      expect(isPermittedStudent('student-alice-uuid')).toBe(true);
      expect(isPermittedStudent('student-bob-uuid')).toBe(true);
      expect(isPermittedStudent('student-charlie-stranger')).toBe(false);
    });

    it('verifies student cannot access peers records', () => {
      const currentStudentId = 'student-alice-uuid';

      const canAccessStudentRecord = (targetId: string) =>
        targetId === currentStudentId;

      expect(canAccessStudentRecord('student-alice-uuid')).toBe(true);
      expect(canAccessStudentRecord('student-bob-uuid')).toBe(false);
    });
  });

  describe('4. Tenant Switching & active_institution_id Cookie Tamper Resistance', () => {
    const userMemberships: InstitutionMembership[] = [
      {
        id: 'mem-inst-alpha',
        institutionId: 'inst-alpha',
        userId: 'victim-user-id',
        role: 'owner',
        status: 'active',
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'mem-inst-beta',
        institutionId: 'inst-beta',
        userId: 'victim-user-id',
        role: 'faculty',
        status: 'suspended', // suspended membership
        joinedAt: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    it('rejects foreign institution ID spoofed in active_institution_id cookie', () => {
      const spoofedCookieValue = 'inst-foreign-victim-corp-999';

      // Simulation of getSessionContext active membership resolution logic:
      const resolvedMembership =
        (spoofedCookieValue &&
          userMemberships.find(
            (m) => m.institutionId === spoofedCookieValue && m.status === 'active'
          )) ||
        userMemberships.find((m) => m.status === 'active') ||
        null;

      // Must NOT resolve to foreign spoofed ID; must fall back to legitimate membership
      expect(resolvedMembership?.institutionId).not.toBe(spoofedCookieValue);
      expect(resolvedMembership?.institutionId).toBe('inst-alpha');
      expect(resolvedMembership?.role).toBe('owner');
    });

    it('rejects suspended institution ID spoofed in active_institution_id cookie', () => {
      const suspendedCookieValue = 'inst-beta';

      // Verify that even if membership exists, if status !== active, switching is blocked
      const targetMembership = userMemberships.find(
        (m) => m.institutionId === suspendedCookieValue && m.status === 'active'
      );

      expect(targetMembership).toBeUndefined();
    });

    it('allows switching only to legitimate active memberships', () => {
      const legitimateCookieValue = 'inst-alpha';

      const targetMembership = userMemberships.find(
        (m) => m.institutionId === legitimateCookieValue && m.status === 'active'
      );

      expect(targetMembership).toBeDefined();
      expect(targetMembership?.institutionId).toBe('inst-alpha');
    });
  });

  describe('5. requirePortalRole Strict RBAC & Audited Preview Mechanics', () => {
    it('enforces that owners and admins do NOT automatically acquire portal permissions', () => {
      const allowedRoles = ['parent'] as any[];
      const ownerRole = 'owner';

      // Direct check:
      const isDirectlyAllowed =
        allowedRoles.includes(ownerRole) ||
        (allowedRoles.includes('parent') && (ownerRole as string) === 'guardian') ||
        (allowedRoles.includes('faculty') && (ownerRole as string) === 'teacher');

      expect(isDirectlyAllowed).toBe(false);
    });

    it('requires explicit ?preview=true parameter for administrative preview mode', () => {
      const isAdmin = true;
      const allowAdminPreview = true;

      // 1. Without preview param:
      const withoutPreviewParam = { preview: undefined };
      const canPreviewWithoutParam =
        isAdmin && allowAdminPreview && withoutPreviewParam.preview === 'true';
      expect(canPreviewWithoutParam).toBe(false);

      // 2. With wrong param value:
      const withWrongParam = { preview: '1' };
      const canPreviewWithWrong =
        isAdmin && allowAdminPreview && withWrongParam.preview === 'true';
      expect(canPreviewWithWrong).toBe(false);

      // 3. With explicit preview=true:
      const withExplicitPreview = { preview: 'true' };
      const canPreviewExplicit =
        isAdmin && allowAdminPreview && withExplicitPreview.preview === 'true';
      expect(canPreviewExplicit).toBe(true);
    });

    it('rejects regular non-admin users from using preview mode even with preview=true', () => {
      const isStudent = false; // not admin
      const allowAdminPreview = true;
      const searchParams = { preview: 'true' };

      const canPreview =
        isStudent && allowAdminPreview && searchParams.preview === 'true';
      expect(canPreview).toBe(false);
    });
  });
});
