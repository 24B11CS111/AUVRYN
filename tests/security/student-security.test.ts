import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, MembershipStatus } from '../../packages/types/src';

/**
 * Student & Admissions RLS & Security Boundary Tests
 *
 * Simulates PostgreSQL Row-Level Security policies defined in:
 * `supabase/migrations/20261105020000_student_admissions.sql`
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

interface MockStudent {
  id: string;
  institutionId: string;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  userId: string | null;
  status: string;
}

interface MockGuardian {
  id: string;
  institutionId: string;
  firstName: string;
  lastName: string;
  phone: string;
  userId: string | null;
}

interface MockStudentGuardian {
  id: string;
  institutionId: string;
  studentId: string;
  guardianId: string;
  relationship: string;
}

interface MockAdmissionApplication {
  id: string;
  institutionId: string;
  applicationNumber: string;
  firstName: string;
  lastName: string;
  status: string;
  convertedStudentId: string | null;
}

class MockStudentSecurityDatabase {
  users: MockUser[] = [];
  memberships: MockMembership[] = [];
  students: MockStudent[] = [];
  guardians: MockGuardian[] = [];
  studentGuardians: MockStudentGuardian[] = [];
  admissions: MockAdmissionApplication[] = [];

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

  // Emulates PostgreSQL is_guardian_of_student(student_id)
  isGuardianOfStudent(userId: string, studentId: string): boolean {
    // 1. Find guardian record linked to user
    const guardian = this.guardians.find((g) => g.userId === userId);
    if (!guardian) return false;

    // 2. Check if student_guardians links this guardian to the student
    return this.studentGuardians.some(
      (sg) => sg.guardianId === guardian.id && sg.studentId === studentId
    );
  }

  // Simulates RLS on SELECT students
  selectStudents(userId: string): MockStudent[] {
    return this.students.filter((student) => {
      // Rule 1: Staff / Faculty / Admissions Officers in same institution
      const isStaffOrFaculty =
        this.isMember(userId, student.institutionId) &&
        this.hasRole(userId, student.institutionId, [
          'owner',
          'admin',
          'academic_admin',
          'faculty',
          'admissions_officer',
          'accountant',
        ]);

      if (isStaffOrFaculty) return true;

      // Rule 2: Student themselves (user_id matches)
      if (student.userId === userId) return true;

      // Rule 3: Parent / Guardian of this specific student
      if (this.isGuardianOfStudent(userId, student.id)) return true;

      return false;
    });
  }

  // Simulates RLS on INSERT / UPDATE students
  canMutateStudent(userId: string, studentInstitutionId: string): boolean {
    return this.hasRole(userId, studentInstitutionId, [
      'owner',
      'admin',
      'academic_admin',
      'admissions_officer',
    ]);
  }

  // Simulates RLS on SELECT admission_applications
  selectAdmissions(userId: string): MockAdmissionApplication[] {
    return this.admissions.filter((app) => {
      // Must have active staff role in the institution
      return this.hasRole(userId, app.institutionId, [
        'owner',
        'admin',
        'academic_admin',
        'faculty',
        'admissions_officer',
      ]);
    });
  }

  // Simulates RLS on INSERT / UPDATE admission_applications
  canMutateAdmission(userId: string, appInstitutionId: string): boolean {
    return this.hasRole(userId, appInstitutionId, [
      'owner',
      'admin',
      'academic_admin',
      'admissions_officer',
    ]);
  }
}

describe('Security: Student & Admissions Multi-Tenant RLS Barriers', () => {
  let db: MockStudentSecurityDatabase;

  const instA = 'inst-alpha-111';
  const instB = 'inst-beta-222';

  const userOwnerA: MockUser = { id: 'usr-owner-a', email: 'owner@alpha.edu' };
  const userOfficerA: MockUser = { id: 'usr-officer-a', email: 'admissions@alpha.edu' };
  const userFacultyA: MockUser = { id: 'usr-faculty-a', email: 'faculty@alpha.edu' };
  const userStudentA: MockUser = { id: 'usr-student-a', email: 'student1@alpha.edu' };
  const userParentA: MockUser = { id: 'usr-parent-a', email: 'parent1@alpha.edu' };

  const userOfficerB: MockUser = { id: 'usr-officer-b', email: 'officer@beta.edu' };
  const userParentB: MockUser = { id: 'usr-parent-b', email: 'parent1@beta.edu' };

  beforeEach(() => {
    db = new MockStudentSecurityDatabase();

    db.users.push(
      userOwnerA,
      userOfficerA,
      userFacultyA,
      userStudentA,
      userParentA,
      userOfficerB,
      userParentB
    );

    // Institution A Memberships
    db.memberships.push(
      { id: 'm1', institutionId: instA, userId: userOwnerA.id, role: 'owner', status: 'active' },
      { id: 'm2', institutionId: instA, userId: userOfficerA.id, role: 'admissions_officer', status: 'active' },
      { id: 'm3', institutionId: instA, userId: userFacultyA.id, role: 'faculty', status: 'active' },
      { id: 'm4', institutionId: instA, userId: userStudentA.id, role: 'student', status: 'active' },
      { id: 'm5', institutionId: instA, userId: userParentA.id, role: 'parent', status: 'active' }
    );

    // Institution B Memberships
    db.memberships.push(
      { id: 'm6', institutionId: instB, userId: userOfficerB.id, role: 'admissions_officer', status: 'active' },
      { id: 'm7', institutionId: instB, userId: userParentB.id, role: 'parent', status: 'active' }
    );

    // Institution A Students & Guardians
    const student1: MockStudent = {
      id: 'stud-a1',
      institutionId: instA,
      admissionNumber: 'ADM-A-01',
      firstName: 'Aarav',
      lastName: 'Sharma',
      userId: userStudentA.id,
      status: 'active',
    };
    const student2: MockStudent = {
      id: 'stud-a2',
      institutionId: instA,
      admissionNumber: 'ADM-A-02',
      firstName: 'Ishaan',
      lastName: 'Verma',
      userId: null,
      status: 'active',
    };
    db.students.push(student1, student2);

    const guardian1: MockGuardian = {
      id: 'guard-a1',
      institutionId: instA,
      firstName: 'Ramesh',
      lastName: 'Sharma',
      phone: '9876543210',
      userId: userParentA.id,
    };
    db.guardians.push(guardian1);

    db.studentGuardians.push({
      id: 'sg1',
      institutionId: instA,
      studentId: student1.id,
      guardianId: guardian1.id,
      relationship: 'Father',
    });

    // Institution B Students & Guardians
    const studentB: MockStudent = {
      id: 'stud-b1',
      institutionId: instB,
      admissionNumber: 'ADM-B-01',
      firstName: 'Zara',
      lastName: 'Khan',
      userId: null,
      status: 'active',
    };
    db.students.push(studentB);

    const guardianB: MockGuardian = {
      id: 'guard-b1',
      institutionId: instB,
      firstName: 'Tariq',
      lastName: 'Khan',
      phone: '9849000000',
      userId: userParentB.id,
    };
    db.guardians.push(guardianB);

    db.studentGuardians.push({
      id: 'sg2',
      institutionId: instB,
      studentId: studentB.id,
      guardianId: guardianB.id,
      relationship: 'Father',
    });

    // Admission Applications
    db.admissions.push(
      {
        id: 'app-a1',
        institutionId: instA,
        applicationNumber: 'APP-A-101',
        firstName: 'Candidate',
        lastName: 'Alpha',
        status: 'submitted',
        convertedStudentId: null,
      },
      {
        id: 'app-b1',
        institutionId: instB,
        applicationNumber: 'APP-B-201',
        firstName: 'Candidate',
        lastName: 'Beta',
        status: 'submitted',
        convertedStudentId: null,
      }
    );
  });

  // Test 1: Cross-Tenant Isolation
  it('enforces complete cross-tenant isolation for Admissions Officers', () => {
    // Officer in Institution A can only see Inst A students
    const visibleA = db.selectStudents(userOfficerA.id);
    expect(visibleA.length).toBe(2);
    expect(visibleA.map((s) => s.id)).toEqual(expect.arrayContaining(['stud-a1', 'stud-a2']));
    expect(visibleA.map((s) => s.id)).not.toContain('stud-b1');

    // Officer in Institution B can only see Inst B students
    const visibleB = db.selectStudents(userOfficerB.id);
    expect(visibleB.length).toBe(1);
    expect(visibleB[0].id).toBe('stud-b1');

    // Officer A cannot mutate Inst B students or admissions
    expect(db.canMutateStudent(userOfficerA.id, instB)).toBe(false);
    expect(db.canMutateAdmission(userOfficerA.id, instB)).toBe(false);
  });

  // Test 2: Role Privileges for Admissions Officer
  it('allows Admissions Officer to mutate admissions and students within own institution', () => {
    expect(db.canMutateStudent(userOfficerA.id, instA)).toBe(true);
    expect(db.canMutateAdmission(userOfficerA.id, instA)).toBe(true);
  });

  // Test 3: Faculty Permissions
  it('allows Faculty to view students, but blocks mutating students or admissions', () => {
    const visibleStudents = db.selectStudents(userFacultyA.id);
    expect(visibleStudents.length).toBe(2);
    expect(db.canMutateStudent(userFacultyA.id, instA)).toBe(false);
    expect(db.canMutateAdmission(userFacultyA.id, instA)).toBe(false);
  });

  // Test 4: Student Self-Access Only
  it('restricts Student users to ONLY viewing their own student record', () => {
    const visible = db.selectStudents(userStudentA.id);
    expect(visible.length).toBe(1);
    expect(visible[0].id).toBe('stud-a1');
    expect(visible[0].admissionNumber).toBe('ADM-A-01');
    expect(visible.map((s) => s.id)).not.toContain('stud-a2'); // Cannot view peers
    expect(visible.map((s) => s.id)).not.toContain('stud-b1'); // Cannot view other tenants
  });

  // Test 5: Parent / Guardian Scoped Access
  it('restricts Parents to ONLY viewing their linked children across the institution', () => {
    // Parent A is linked to Student A1, but NOT Student A2 or Student B1
    const visibleParentA = db.selectStudents(userParentA.id);
    expect(visibleParentA.length).toBe(1);
    expect(visibleParentA[0].id).toBe('stud-a1');
    expect(visibleParentA[0].firstName).toBe('Aarav');

    // Parent B is linked to Student B1
    const visibleParentB = db.selectStudents(userParentB.id);
    expect(visibleParentB.length).toBe(1);
    expect(visibleParentB[0].id).toBe('stud-b1');

    // Parents cannot view admissions applications
    expect(db.selectAdmissions(userParentA.id).length).toBe(0);
    expect(db.selectAdmissions(userParentB.id).length).toBe(0);
  });
});
