import { describe, it, expect } from 'vitest';
import {
  resolveEducationType,
  EDUCATION_TYPE_DEFINITIONS,
  type EducationType,
  type UserSessionContext,
  type InstitutionMembership,
} from '@edu-platform/types';
import {
  getPostLoginRedirect,
  isPlatformAdmin,
} from '../../apps/web/src/lib/auth';

describe('AUVRYN Role-Based Authentication & Smart Routing Suite', () => {
  const baseProfile = {
    id: 'user-001',
    email: 'user@auvryn.edu',
    fullName: 'Jane Doe',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const createMockMembership = (
    instId: string,
    role: string,
    status: 'active' | 'suspended' | 'revoked' = 'active',
    instType: string = 'school',
    educationType?: EducationType
  ): InstitutionMembership => ({
    id: `mem-${instId}`,
    institutionId: instId,
    userId: baseProfile.id,
    role: role as any,
    status,
    joinedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    institution: {
      id: instId,
      name: `Institution ${instId}`,
      slug: `inst-${instId}`,
      code: `INST${instId}`,
      type: instType as any,
      education_type: educationType,
      status: 'active',
      settings: educationType ? { education_type: educationType } : {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  });

  describe('Part 1: Five User Login Categories', () => {
    it('Category A: Institution Owner routes to /dashboard', () => {
      const context: UserSessionContext = {
        user: { id: baseProfile.id, email: baseProfile.email },
        profile: baseProfile,
        memberships: [createMockMembership('inst-1', 'owner')],
        activeInstitutionId: 'inst-1',
        activeMembership: createMockMembership('inst-1', 'owner'),
      };

      const redirect = getPostLoginRedirect(context);
      expect(redirect).toBe('/dashboard');
    });

    it('Category A: Institution Administrator routes to /dashboard', () => {
      const context: UserSessionContext = {
        user: { id: baseProfile.id, email: baseProfile.email },
        profile: baseProfile,
        memberships: [createMockMembership('inst-1', 'admin')],
        activeInstitutionId: 'inst-1',
        activeMembership: createMockMembership('inst-1', 'admin'),
      };

      const redirect = getPostLoginRedirect(context);
      expect(redirect).toBe('/dashboard');
    });

    it('Category B: Parent / Guardian routes directly to /portal/parent', () => {
      const contextParent: UserSessionContext = {
        user: { id: baseProfile.id, email: 'parent@home.org' },
        profile: { ...baseProfile, email: 'parent@home.org' },
        memberships: [createMockMembership('inst-1', 'parent')],
        activeInstitutionId: 'inst-1',
        activeMembership: createMockMembership('inst-1', 'parent'),
      };

      expect(getPostLoginRedirect(contextParent)).toBe('/portal/parent');

      // Also supports guardian alias
      const contextGuardian: UserSessionContext = {
        ...contextParent,
        memberships: [createMockMembership('inst-1', 'guardian' as any)],
        activeMembership: createMockMembership('inst-1', 'guardian' as any),
      };
      expect(getPostLoginRedirect(contextGuardian)).toBe('/portal/parent');
    });

    it('Category C: Student routes directly to /portal/student', () => {
      const context: UserSessionContext = {
        user: { id: baseProfile.id, email: 'student@auvryn.edu' },
        profile: { ...baseProfile, email: 'student@auvryn.edu' },
        memberships: [createMockMembership('inst-1', 'student')],
        activeInstitutionId: 'inst-1',
        activeMembership: createMockMembership('inst-1', 'student'),
      };

      const redirect = getPostLoginRedirect(context);
      expect(redirect).toBe('/portal/student');
    });

    it('Category D: Teacher / Faculty routes directly to /portal/teacher', () => {
      const contextFaculty: UserSessionContext = {
        user: { id: baseProfile.id, email: 'faculty@auvryn.edu' },
        profile: { ...baseProfile, email: 'faculty@auvryn.edu' },
        memberships: [createMockMembership('inst-1', 'faculty')],
        activeInstitutionId: 'inst-1',
        activeMembership: createMockMembership('inst-1', 'faculty'),
      };

      expect(getPostLoginRedirect(contextFaculty)).toBe('/portal/teacher');

      // Also supports teacher alias
      const contextTeacher: UserSessionContext = {
        ...contextFaculty,
        memberships: [createMockMembership('inst-1', 'teacher' as any)],
        activeMembership: createMockMembership('inst-1', 'teacher' as any),
      };
      expect(getPostLoginRedirect(contextTeacher)).toBe('/portal/teacher');
    });

    it('Category E: HRIX Platform Super Admin routes directly to /hrix-admin', () => {
      const platformUser = {
        id: 'super-admin-01',
        email: 'admin@auvryn.com',
        app_metadata: { is_platform_admin: true, role: 'hrix_admin' },
      };

      expect(isPlatformAdmin(platformUser)).toBe(true);

      const context: UserSessionContext = {
        user: platformUser,
        profile: { ...baseProfile, id: platformUser.id, email: platformUser.email },
        memberships: [],
        activeInstitutionId: null,
        activeMembership: null,
      };

      const redirect = getPostLoginRedirect(context, platformUser);
      expect(redirect).toBe('/hrix-admin');
    });

    it('Multi-Institution Context: User with multiple active memberships routes to /auth/select-institution', () => {
      const context: UserSessionContext = {
        user: { id: baseProfile.id, email: 'multi@auvryn.edu' },
        profile: baseProfile,
        memberships: [
          createMockMembership('inst-1', 'faculty'),
          createMockMembership('inst-2', 'parent'),
        ],
        activeInstitutionId: 'inst-1',
        activeMembership: createMockMembership('inst-1', 'faculty'),
      };

      const redirect = getPostLoginRedirect(context);
      expect(redirect).toBe('/auth/select-institution');
    });

    it('Zero Memberships: User without active affiliations routes to /onboarding', () => {
      const context: UserSessionContext = {
        user: { id: baseProfile.id, email: 'new@auvryn.edu' },
        profile: baseProfile,
        memberships: [],
        activeInstitutionId: null,
        activeMembership: null,
      };

      const redirect = getPostLoginRedirect(context);
      expect(redirect).toBe('/onboarding');
    });
  });

  describe('Part 2: Four Institution Education Levels', () => {
    it('resolves preschool education type from configuration and name', () => {
      const instExplicit = {
        type: 'school',
        settings: { education_type: 'preschool' as EducationType },
      };
      expect(resolveEducationType(instExplicit)).toBe('preschool');

      const instInferred = {
        name: 'Little Stars Montessori Kindergarten',
        type: 'school',
        settings: {},
      };
      expect(resolveEducationType(instInferred)).toBe('preschool');

      const def = EDUCATION_TYPE_DEFINITIONS.preschool;
      expect(def.label).toContain('Preschool');
      expect(def.cohortLabel).toBe('Playgroups & Nursery');
      expect(def.learnerLabel).toBe('Children / Little Learners');
    });

    it('resolves primary_school education type', () => {
      const instExplicit = {
        type: 'school',
        settings: { education_type: 'primary_school' as EducationType },
      };
      expect(resolveEducationType(instExplicit)).toBe('primary_school');

      const def = EDUCATION_TYPE_DEFINITIONS.primary_school;
      expect(def.label).toContain('Primary & K-12');
      expect(def.cohortLabel).toBe('Classes & Sections');
      expect(def.learnerLabel).toBe('Students');
    });

    it('resolves intermediate education type from junior_college', () => {
      const instExplicit = {
        type: 'junior_college',
        settings: { education_type: 'intermediate' as EducationType },
      };
      expect(resolveEducationType(instExplicit)).toBe('intermediate');

      const instInferred = {
        name: 'Narayana Junior College',
        type: 'junior_college',
        settings: {},
      };
      expect(resolveEducationType(instInferred)).toBe('intermediate');

      const def = EDUCATION_TYPE_DEFINITIONS.intermediate;
      expect(def.label).toContain('Intermediate & Junior College');
      expect(def.cohortLabel).toBe('Streams & Groups');
      expect(def.tagline).toContain('MPC, BiPC, CEC');
    });

    it('resolves university education type from higher education classifications', () => {
      const instDegree = {
        type: 'degree_college',
        settings: {},
      };
      expect(resolveEducationType(instDegree)).toBe('university');

      const instEng = {
        type: 'engineering_college',
        settings: {},
      };
      expect(resolveEducationType(instEng)).toBe('university');

      const instUni = {
        type: 'university',
        settings: {},
      };
      expect(resolveEducationType(instUni)).toBe('university');

      const def = EDUCATION_TYPE_DEFINITIONS.university;
      expect(def.label).toContain('University & Higher Education');
      expect(def.cohortLabel).toBe('Programmes & Semesters');
      expect(def.departmentLabel).toBe('Faculties & Departments');
    });
  });
});
