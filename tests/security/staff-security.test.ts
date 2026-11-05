import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, MembershipStatus } from '../../packages/types/src';

/**
 * Staff & Faculty RLS & Security Boundary Tests
 *
 * Simulates PostgreSQL Row-Level Security policies defined in:
 * `supabase/migrations/20261105030000_staff_faculty.sql`
 */

interface MockUser {
  id: string;
  email: string;
}

interface MockMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
}

interface MockStaffProfile {
  id: string;
  institutionId: string;
  employeeId: string;
  firstName: string;
  lastName: string;
  email: string;
  userId: string | null;
  employmentStatus: string;
  designation: string;
  staffCategory: string;
}

interface MockStaffEmployment {
  id: string;
  institutionId: string;
  staffId: string;
  designation: string;
  employmentType: string;
  employmentStatus: string;
  startDate: string;
}

interface MockFacultyAllocation {
  id: string;
  institutionId: string;
  staffId: string;
  academicYearId: string;
  programId: string;
  classId: string | null;
  sectionId: string | null;
  subjectId: string | null;
  isClassTeacher: boolean;
  isCoordinator: boolean;
  status: string;
}

interface MockStaffDocument {
  id: string;
  institutionId: string;
  staffId: string;
  documentType: string;
  title: string;
  verificationStatus: string;
  storagePath: string;
}

interface MockStaffInvitation {
  id: string;
  institutionId: string;
  email: string;
  token: string;
  role: Role;
  status: 'pending' | 'accepted' | 'expired' | 'revoked';
  expiresAt: string;
}

class MockStaffSecurityDatabase {
  users: MockUser[] = [];
  memberships: MockMembership[] = [];
  staff: MockStaffProfile[] = [];
  employments: MockStaffEmployment[] = [];
  allocations: MockFacultyAllocation[] = [];
  documents: MockStaffDocument[] = [];
  invitations: MockStaffInvitation[] = [];

  // Emulates PostgreSQL has_institution_role(inst_id, roles)
  hasRole(userId: string, institutionId: string, allowedRoles: Role[]): boolean {
    const membership = this.memberships.find(
      (m) => m.userId === userId && m.institutionId === institutionId && m.status === 'active'
    );
    if (!membership) return false;
    return allowedRoles.includes(membership.role);
  }

  // Emulates PostgreSQL is_institution_member(inst_id)
  isMember(userId: string, institutionId: string): boolean {
    return this.memberships.some(
      (m) => m.userId === userId && m.institutionId === institutionId && m.status === 'active'
    );
  }

  // Simulates RLS on SELECT staff_profiles
  selectStaffProfiles(userId: string): MockStaffProfile[] {
    return this.staff.filter((sp) => {
      // 1. User is member of institution
      if (this.isMember(userId, sp.institutionId)) return true;
      // 2. Or this staff profile is linked to the user
      return sp.userId === userId;
    });
  }

  // Simulates RLS on INSERT/UPDATE staff_profiles
  canMutateStaffProfile(userId: string, targetStaff: MockStaffProfile): boolean {
    // Only owner, admin, or hr_administrator of that institution
    return this.hasRole(userId, targetStaff.institutionId, ['owner', 'admin', 'hr_administrator']);
  }

  // Simulates RLS on INSERT/UPDATE faculty_allocations
  canMutateFacultyAllocation(userId: string, allocation: MockFacultyAllocation): boolean {
    // Owner, admin, academic_admin, department_head of that institution
    return this.hasRole(userId, allocation.institutionId, [
      'owner',
      'admin',
      'academic_admin',
      'department_head',
    ]);
  }

  // Simulates Class Teacher Uniqueness constraint:
  // uq_active_section_class_teacher ON (academic_year_id, section_id) WHERE is_class_teacher = true AND status = 'active'
  insertFacultyAllocation(allocation: MockFacultyAllocation): { success: boolean; error?: string } {
    if (allocation.isClassTeacher && allocation.status === 'active' && allocation.sectionId) {
      const existing = this.allocations.find(
        (a) =>
          a.academicYearId === allocation.academicYearId &&
          a.sectionId === allocation.sectionId &&
          a.isClassTeacher &&
          a.status === 'active'
      );
      if (existing) {
        return {
          success: false,
          error: 'Unique constraint violation: Section already has an active class teacher for this academic year.',
        };
      }
    }
    this.allocations.push(allocation);
    return { success: true };
  }

  // Simulates RLS on staff_documents verification
  canVerifyDocument(userId: string, doc: MockStaffDocument): boolean {
    return this.hasRole(userId, doc.institutionId, ['owner', 'admin', 'hr_administrator']);
  }

  // Simulates RLS on staff_invitations management
  canManageInvitations(userId: string, institutionId: string): boolean {
    return this.hasRole(userId, institutionId, ['owner', 'admin', 'hr_administrator']);
  }
}

describe('Security: Staff & Faculty Multi-Tenant & RBAC Isolation', () => {
  let db: MockStaffSecurityDatabase;

  const TENANT_A = 'inst-001';
  const TENANT_B = 'inst-002';

  const USER_A_HR = 'user-a-hr';
  const USER_A_FACULTY = 'user-a-faculty';
  const USER_A_HOD = 'user-a-hod';
  const USER_B_HR = 'user-b-hr';
  const USER_B_FACULTY = 'user-b-faculty';

  beforeEach(() => {
    db = new MockStaffSecurityDatabase();

    db.users = [
      { id: USER_A_HR, email: 'hr@school-a.edu' },
      { id: USER_A_FACULTY, email: 'faculty@school-a.edu' },
      { id: USER_A_HOD, email: 'hod@school-a.edu' },
      { id: USER_B_HR, email: 'hr@college-b.edu' },
      { id: USER_B_FACULTY, email: 'faculty@college-b.edu' },
    ];

    db.memberships = [
      { id: 'm1', institutionId: TENANT_A, userId: USER_A_HR, role: 'hr_administrator', status: 'active' },
      { id: 'm2', institutionId: TENANT_A, userId: USER_A_FACULTY, role: 'faculty', status: 'active' },
      { id: 'm3', institutionId: TENANT_A, userId: USER_A_HOD, role: 'department_head', status: 'active' },
      { id: 'm4', institutionId: TENANT_B, userId: USER_B_HR, role: 'hr_administrator', status: 'active' },
      { id: 'm5', institutionId: TENANT_B, userId: USER_B_FACULTY, role: 'faculty', status: 'active' },
    ];

    // Seed Staff Profiles
    db.staff = [
      {
        id: 'staff-a-1',
        institutionId: TENANT_A,
        employeeId: 'EMP-A-001',
        firstName: 'Amit',
        lastName: 'Verma',
        email: 'faculty@school-a.edu',
        userId: USER_A_FACULTY,
        employmentStatus: 'active',
        designation: 'Mathematics Teacher',
        staffCategory: 'teaching',
      },
      {
        id: 'staff-b-1',
        institutionId: TENANT_B,
        employeeId: 'EMP-B-001',
        firstName: 'Deepak',
        lastName: 'Nair',
        email: 'faculty@college-b.edu',
        userId: USER_B_FACULTY,
        employmentStatus: 'probation',
        designation: 'Assistant Professor',
        staffCategory: 'teaching',
      },
    ];
  });

  // Test 1: Multi-tenant boundary between institutions
  it('strictly isolates staff profiles across institutions', () => {
    const tenantAStaff = db.selectStaffProfiles(USER_A_HR);
    expect(tenantAStaff.length).toBe(1);
    expect(tenantAStaff[0].institutionId).toBe(TENANT_A);
    expect(tenantAStaff[0].employeeId).toBe('EMP-A-001');

    const tenantBStaff = db.selectStaffProfiles(USER_B_HR);
    expect(tenantBStaff.length).toBe(1);
    expect(tenantBStaff[0].institutionId).toBe(TENANT_B);
    expect(tenantBStaff[0].employeeId).toBe('EMP-B-001');

    // HR of Tenant A cannot mutate staff belonging to Tenant B
    const tenantBTarget = db.staff.find((s) => s.id === 'staff-b-1')!;
    expect(db.canMutateStaffProfile(USER_A_HR, tenantBTarget)).toBe(false);
  });

  // Test 2: Faculty cannot modify their own employment status or profile
  it('prevents faculty from mutating their own employment status or HR record', () => {
    const ownStaffRecord = db.staff.find((s) => s.id === 'staff-a-1')!;

    // Faculty attempts to mutate their own staff profile (e.g. promoting themselves or changing status)
    const canFacultyMutateOwnRecord = db.canMutateStaffProfile(USER_A_FACULTY, ownStaffRecord);
    expect(canFacultyMutateOwnRecord).toBe(false);

    // HR Administrator CAN mutate staff profile
    const canHrMutateRecord = db.canMutateStaffProfile(USER_A_HR, ownStaffRecord);
    expect(canHrMutateRecord).toBe(true);
  });

  // Test 3: Faculty allocation and Department Head authorization
  it('allows Department Head and Academic Admin to allocate faculty, but bars general faculty and outsiders', () => {
    const allocation: MockFacultyAllocation = {
      id: 'alloc-1',
      institutionId: TENANT_A,
      staffId: 'staff-a-1',
      academicYearId: 'ay-2026',
      programId: 'prog-secondary',
      classId: 'class-10',
      sectionId: 'sec-10a',
      subjectId: 'subj-math',
      isClassTeacher: false,
      isCoordinator: false,
      status: 'active',
    };

    // Department Head in Tenant A can allocate
    expect(db.canMutateFacultyAllocation(USER_A_HOD, allocation)).toBe(true);

    // Faculty cannot assign themselves or peers
    expect(db.canMutateFacultyAllocation(USER_A_FACULTY, allocation)).toBe(false);

    // Outsider (Tenant B HR) cannot allocate in Tenant A
    expect(db.canMutateFacultyAllocation(USER_B_HR, allocation)).toBe(false);
  });

  // Test 4: Active Class Teacher Exclusivity Constraint
  it('enforces maximum one active class teacher per section in an academic year', () => {
    const firstAllocation: MockFacultyAllocation = {
      id: 'alloc-ct-1',
      institutionId: TENANT_A,
      staffId: 'staff-a-1',
      academicYearId: 'ay-2026',
      programId: 'prog-secondary',
      classId: 'class-10',
      sectionId: 'sec-10a',
      subjectId: 'subj-math',
      isClassTeacher: true,
      isCoordinator: false,
      status: 'active',
    };

    const firstResult = db.insertFacultyAllocation(firstAllocation);
    expect(firstResult.success).toBe(true);

    // Attempting to assign a second teacher as class teacher for the same section & year
    const conflictingAllocation: MockFacultyAllocation = {
      id: 'alloc-ct-2',
      institutionId: TENANT_A,
      staffId: 'staff-a-2',
      academicYearId: 'ay-2026',
      programId: 'prog-secondary',
      classId: 'class-10',
      sectionId: 'sec-10a',
      subjectId: 'subj-science',
      isClassTeacher: true,
      isCoordinator: false,
      status: 'active',
    };

    const secondResult = db.insertFacultyAllocation(conflictingAllocation);
    expect(secondResult.success).toBe(false);
    expect(secondResult.error).toContain('Unique constraint violation');
  });

  // Test 5: Document verification and invitation issuance privileges
  it('restricts document verification and staff invitation management to authorized HR roles', () => {
    const doc: MockStaffDocument = {
      id: 'doc-1',
      institutionId: TENANT_A,
      staffId: 'staff-a-1',
      documentType: 'qualification',
      title: 'Master of Science Degree',
      verificationStatus: 'pending',
      storagePath: 'tenants/inst-001/staff/doc-1.pdf',
    };

    // HR Administrator can verify documents
    expect(db.canVerifyDocument(USER_A_HR, doc)).toBe(true);

    // Faculty cannot verify their own documents
    expect(db.canVerifyDocument(USER_A_FACULTY, doc)).toBe(false);

    // Department head cannot verify HR documents
    expect(db.canVerifyDocument(USER_A_HOD, doc)).toBe(false);

    // Tenant B cannot verify Tenant A documents
    expect(db.canVerifyDocument(USER_B_HR, doc)).toBe(false);

    // Staff invitation management
    expect(db.canManageInvitations(USER_A_HR, TENANT_A)).toBe(true);
    expect(db.canManageInvitations(USER_A_FACULTY, TENANT_A)).toBe(false);
    expect(db.canManageInvitations(USER_B_HR, TENANT_A)).toBe(false);
  });
});
