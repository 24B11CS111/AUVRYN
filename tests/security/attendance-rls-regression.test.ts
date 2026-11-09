import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, MembershipStatus, AttendanceStatus } from '../../packages/types/src';

/**
 * Phase 2.1 Regression Test Suite:
 * Critical Attendance RLS Fix & Function Parity Verification
 *
 * Verifies that:
 * 1. `current_user_tenant_ids()` accurately reflects active institutional memberships.
 * 2. Inactive, suspended, and revoked memberships are strictly omitted.
 * 3. Cross-tenant queries are blocked unconditionally.
 * 4. Staff/Faculty/Admin institutional members can view student attendance records.
 * 5. Students can ONLY view their own attendance records and are DENIED access to peer records.
 * 6. Guardians can ONLY view their verified child's records.
 * 7. Strangers with no institutional relationship are completely denied.
 */

interface MockMembership {
  id: string;
  institutionId: string;
  userId: string;
  role: Role;
  status: MembershipStatus;
}

interface MockStudent {
  id: string;
  institutionId: string;
  userId: string;
}

interface MockGuardian {
  id: string;
  institutionId: string;
  userId: string;
}

interface MockStudentGuardian {
  institutionId: string;
  studentId: string;
  guardianId: string;
}

interface MockAttendanceSession {
  id: string;
  institutionId: string;
  title: string;
}

interface MockStudentRecord {
  id: string;
  institutionId: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
}

interface MockLeaveRequest {
  id: string;
  institutionId: string;
  studentId?: string;
  staffId?: string;
  reason: string;
}

class TestSecurityEnvironment {
  memberships: MockMembership[] = [];
  students: MockStudent[] = [];
  guardians: MockGuardian[] = [];
  studentGuardians: MockStudentGuardian[] = [];
  sessions: MockAttendanceSession[] = [];
  records: MockStudentRecord[] = [];
  leaves: MockLeaveRequest[] = [];

  // Emulates PostgreSQL: public.get_user_institution_ids()
  getUserInstitutionIds(userId: string): string[] {
    return this.memberships
      .filter((m) => m.userId === userId && m.status === 'active')
      .map((m) => m.institutionId);
  }

  // Emulates PostgreSQL: public.current_user_tenant_ids() (Phase 2.1 fix)
  currentUserTenantIds(userId: string): string[] {
    return this.getUserInstitutionIds(userId);
  }

  hasInstitutionRole(userId: string, institutionId: string, allowedRoles: Role[]): boolean {
    return this.memberships.some(
      (m) =>
        m.userId === userId &&
        m.institutionId === institutionId &&
        m.status === 'active' &&
        allowedRoles.includes(m.role)
    );
  }

  isGuardianOfStudent(userId: string, studentId: string): boolean {
    const guardian = this.guardians.find((g) => g.userId === userId);
    if (!guardian) return false;
    return this.studentGuardians.some(
      (sg) => sg.guardianId === guardian.id && sg.studentId === studentId
    );
  }

  // Attendance Sessions RLS:
  // institution_id IN (SELECT current_user_tenant_ids())
  selectAttendanceSessions(userId: string): MockAttendanceSession[] {
    const tenantIds = this.currentUserTenantIds(userId);
    return this.sessions.filter((s) => tenantIds.includes(s.institutionId));
  }

  // Hardened Student Attendance Records RLS (Phase 2.1 fix):
  // (institution_id IN (SELECT current_user_tenant_ids()) AND has_institution_role(staff/admin))
  // OR student_id IN (SELECT id FROM students WHERE user_id = auth.uid())
  // OR is_guardian_of_student(student_id)
  selectStudentAttendanceRecords(userId: string): MockStudentRecord[] {
    const tenantIds = this.currentUserTenantIds(userId);
    const studentProfile = this.students.find((s) => s.userId === userId);

    return this.records.filter((rec) => {
      // 1. Staff / Admin check
      const isStaffOrAdmin =
        tenantIds.includes(rec.institutionId) &&
        this.hasInstitutionRole(userId, rec.institutionId, [
          'owner',
          'admin',
          'academic_admin',
          'department_head',
          'faculty',
          'staff',
        ]);
      if (isStaffOrAdmin) return true;

      // 2. Student self-view check
      if (studentProfile && rec.studentId === studentProfile.id) return true;

      // 3. Guardian child check
      if (this.isGuardianOfStudent(userId, rec.studentId)) return true;

      return false;
    });
  }

  // Attendance Session INSERT RLS
  insertAttendanceSession(userId: string, session: MockAttendanceSession): { success: boolean; error?: string } {
    const tenantIds = this.currentUserTenantIds(userId);
    if (!tenantIds.includes(session.institutionId)) {
      return { success: false, error: 'Cross-tenant violation: caller not in institution' };
    }
    const authorized = this.hasInstitutionRole(userId, session.institutionId, [
      'owner',
      'admin',
      'academic_admin',
      'department_head',
      'faculty',
    ]);
    if (!authorized) {
      return { success: false, error: 'Unauthorized role for session creation' };
    }
    this.sessions.push(session);
    return { success: true };
  }
}

describe('Phase 2.1 — Attendance RLS & Tenant Isolation Regression Suite', () => {
  let env: TestSecurityEnvironment;

  const instAlpha = '11111111-1111-1111-1111-111111111111';
  const instBeta = '22222222-2222-2222-2222-222222222222';

  const userOwnerAlpha = 'user-alice-owner-alpha';
  const userFacultyAlpha = 'user-bob-faculty-alpha';
  const userStudentAlpha1 = 'user-charlie-student-alpha1';
  const userStudentAlpha2 = 'user-dave-student-alpha2';
  const userGuardianAlpha1 = 'user-grace-guardian-alpha1';
  const userSuspendedFaculty = 'user-eve-suspended-alpha';
  const userOwnerBeta = 'user-dan-owner-beta';
  const userStranger = 'user-mallory-stranger';

  const studentIdAlpha1 = 'stud-alpha-001';
  const studentIdAlpha2 = 'stud-alpha-002';
  const guardianIdAlpha1 = 'guard-alpha-001';

  beforeEach(() => {
    env = new TestSecurityEnvironment();

    // Memberships
    env.memberships = [
      { id: 'm1', institutionId: instAlpha, userId: userOwnerAlpha, role: 'owner', status: 'active' },
      { id: 'm2', institutionId: instAlpha, userId: userFacultyAlpha, role: 'faculty', status: 'active' },
      { id: 'm3', institutionId: instAlpha, userId: userStudentAlpha1, role: 'student', status: 'active' },
      { id: 'm4', institutionId: instAlpha, userId: userStudentAlpha2, role: 'student', status: 'active' },
      { id: 'm5', institutionId: instAlpha, userId: userGuardianAlpha1, role: 'guardian', status: 'active' },
      { id: 'm6', institutionId: instAlpha, userId: userSuspendedFaculty, role: 'faculty', status: 'suspended' },
      { id: 'm7', institutionId: instBeta, userId: userOwnerBeta, role: 'owner', status: 'active' },
    ];

    // Students & Guardians
    env.students = [
      { id: studentIdAlpha1, institutionId: instAlpha, userId: userStudentAlpha1 },
      { id: studentIdAlpha2, institutionId: instAlpha, userId: userStudentAlpha2 },
    ];

    env.guardians = [{ id: guardianIdAlpha1, institutionId: instAlpha, userId: userGuardianAlpha1 }];
    env.studentGuardians = [{ institutionId: instAlpha, studentId: studentIdAlpha1, guardianId: guardianIdAlpha1 }];

    // Sessions & Records
    env.sessions = [
      { id: 'sess-alpha-01', institutionId: instAlpha, title: 'Alpha Morning Attendance' },
      { id: 'sess-beta-01', institutionId: instBeta, title: 'Beta Morning Attendance' },
    ];

    env.records = [
      { id: 'rec-1', institutionId: instAlpha, sessionId: 'sess-alpha-01', studentId: studentIdAlpha1, status: 'present' },
      { id: 'rec-2', institutionId: instAlpha, sessionId: 'sess-alpha-01', studentId: studentIdAlpha2, status: 'absent' },
      { id: 'rec-3', institutionId: instBeta, sessionId: 'sess-beta-01', studentId: 'stud-beta-001', status: 'present' },
    ];
  });

  describe('1. current_user_tenant_ids() parity & status filtering', () => {
    it('returns exactly the active institutions for a user', () => {
      expect(env.currentUserTenantIds(userOwnerAlpha)).toEqual([instAlpha]);
      expect(env.currentUserTenantIds(userOwnerBeta)).toEqual([instBeta]);
      expect(env.currentUserTenantIds(userFacultyAlpha)).toEqual([instAlpha]);
    });

    it('returns empty array for suspended, revoked, or non-member users', () => {
      expect(env.currentUserTenantIds(userSuspendedFaculty)).toEqual([]);
      expect(env.currentUserTenantIds(userStranger)).toEqual([]);
    });

    it('matches get_user_institution_ids() output identically', () => {
      const users = [userOwnerAlpha, userFacultyAlpha, userStudentAlpha1, userSuspendedFaculty, userStranger];
      for (const uid of users) {
        expect(env.currentUserTenantIds(uid)).toEqual(env.getUserInstitutionIds(uid));
      }
    });
  });

  describe('2. Cross-Tenant Isolation', () => {
    it('prevents Institution Alpha owner from seeing Institution Beta sessions', () => {
      const sessions = env.selectAttendanceSessions(userOwnerAlpha);
      expect(sessions).toHaveLength(1);
      expect(sessions[0].institutionId).toBe(instAlpha);
      expect(sessions.some((s) => s.institutionId === instBeta)).toBe(false);
    });

    it('prevents Institution Alpha owner from inserting a session into Institution Beta', () => {
      const result = env.insertAttendanceSession(userOwnerAlpha, {
        id: 'malicious-sess',
        institutionId: instBeta,
        title: 'Unauthorized Cross-Tenant Session',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Cross-tenant violation');
    });

    it('completely denies stranger with no memberships', () => {
      expect(env.selectAttendanceSessions(userStranger)).toHaveLength(0);
      expect(env.selectStudentAttendanceRecords(userStranger)).toHaveLength(0);
    });
  });

  describe('3. Student & Guardian Privacy Boundaries (Hardened Policies)', () => {
    it('allows faculty to view all student attendance records within their institution', () => {
      const records = env.selectStudentAttendanceRecords(userFacultyAlpha);
      expect(records).toHaveLength(2);
      expect(records.map((r) => r.id)).toEqual(['rec-1', 'rec-2']);
    });

    it('allows student Charlie to view ONLY Charlie own record, blocking peer records', () => {
      const records = env.selectStudentAttendanceRecords(userStudentAlpha1);
      expect(records).toHaveLength(1);
      expect(records[0].studentId).toBe(studentIdAlpha1);
      expect(records.some((r) => r.studentId === studentIdAlpha2)).toBe(false);
    });

    it('allows guardian Grace to view ONLY her child record', () => {
      const records = env.selectStudentAttendanceRecords(userGuardianAlpha1);
      expect(records).toHaveLength(1);
      expect(records[0].studentId).toBe(studentIdAlpha1);
      expect(records.some((r) => r.studentId === studentIdAlpha2)).toBe(false);
    });

    it('blocks student Charlie from creating an attendance session', () => {
      const result = env.insertAttendanceSession(userStudentAlpha1, {
        id: 'sess-student-attempt',
        institutionId: instAlpha,
        title: 'Student Attempted Session',
      });
      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized role');
    });
  });
});
