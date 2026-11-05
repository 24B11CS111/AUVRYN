import { describe, it, expect, beforeEach } from 'vitest';
import type { Role, MembershipStatus, AttendanceStatus } from '../../packages/types/src';

/**
 * Universal Attendance RLS & Security Boundary Tests
 *
 * Simulates PostgreSQL Row-Level Security policies & unique constraints defined in:
 * `supabase/migrations/20261105040000_attendance_management.sql`
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

interface MockAttendanceSession {
  id: string;
  institutionId: string;
  academicYearId: string;
  classId: string;
  sectionId: string | null;
  subjectId: string | null;
  sessionDate: string;
  sessionType: string;
  periodNumber: number | null;
  status: 'draft' | 'submitted' | 'locked';
}

interface MockStudentAttendanceRecord {
  id: string;
  institutionId: string;
  sessionId: string;
  studentId: string;
  status: AttendanceStatus;
  remarks: string | null;
  isExcused: boolean;
}

interface MockAttendanceCorrection {
  id: string;
  institutionId: string;
  recordId: string;
  sessionId: string;
  studentId: string;
  previousStatus: AttendanceStatus;
  newStatus: AttendanceStatus;
  reason: string;
  correctedBy: string;
}

interface MockGuardian {
  id: string;
  institutionId: string;
  userId: string;
  phone: string;
}

interface MockStudentGuardian {
  institutionId: string;
  studentId: string;
  guardianId: string;
  isPrimary: boolean;
}

interface MockNotification {
  id: string;
  institutionId: string;
  sessionId: string;
  studentId: string;
  guardianId: string;
  channel: string;
  status: string;
}

class MockAttendanceSecurityDatabase {
  users: MockUser[] = [];
  memberships: MockMembership[] = [];
  sessions: MockAttendanceSession[] = [];
  records: MockStudentAttendanceRecord[] = [];
  corrections: MockAttendanceCorrection[] = [];
  guardians: MockGuardian[] = [];
  studentGuardians: MockStudentGuardian[] = [];
  notifications: MockNotification[] = [];

  hasRole(userId: string, institutionId: string, allowedRoles: Role[]): boolean {
    const membership = this.memberships.find(
      (m) => m.userId === userId && m.institutionId === institutionId && m.status === 'active'
    );
    if (!membership) return false;
    return allowedRoles.includes(membership.role);
  }

  isMember(userId: string, institutionId: string): boolean {
    return this.memberships.some(
      (m) => m.userId === userId && m.institutionId === institutionId && m.status === 'active'
    );
  }

  isGuardianOfStudent(userId: string, studentId: string): boolean {
    const guardian = this.guardians.find((g) => g.userId === userId);
    if (!guardian) return false;
    return this.studentGuardians.some(
      (sg) => sg.guardianId === guardian.id && sg.studentId === studentId
    );
  }

  // RLS for SELECT attendance_sessions
  selectSessions(userId: string): MockAttendanceSession[] {
    return this.sessions.filter((s) => this.isMember(userId, s.institutionId));
  }

  // Insert session with duplicate check
  createSession(userId: string, session: MockAttendanceSession): { success: boolean; error?: string } {
    if (!this.hasRole(userId, session.institutionId, ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'])) {
      return { success: false, error: 'Unauthorized: insufficient privileges to create session' };
    }

    // Constraint check: uq_daily_attendance_session
    if (session.sessionType === 'daily' && !session.subjectId) {
      const exists = this.sessions.find(
        (s) =>
          s.institutionId === session.institutionId &&
          s.academicYearId === session.academicYearId &&
          s.classId === session.classId &&
          (s.sectionId || null) === (session.sectionId || null) &&
          s.sessionDate === session.sessionDate &&
          s.sessionType === 'daily'
      );
      if (exists) {
        return { success: false, error: 'Unique constraint violation: daily session already exists' };
      }
    }

    this.sessions.push(session);
    return { success: true };
  }

  // Insert student record with session-student uniqueness & parent notification queuing
  recordAttendance(
    userId: string,
    sessionId: string,
    studentId: string,
    status: AttendanceStatus,
    remarks?: string
  ): { success: boolean; error?: string } {
    const sess = this.sessions.find((s) => s.id === sessionId);
    if (!sess) return { success: false, error: 'Session not found' };

    if (!this.hasRole(userId, sess.institutionId, ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'])) {
      return { success: false, error: 'Unauthorized to mark attendance' };
    }

    if (sess.status === 'locked') {
      return { success: false, error: 'Cannot modify a locked attendance session' };
    }

    // Uniqueness: uq_session_student
    const existing = this.records.find((r) => r.sessionId === sessionId && r.studentId === studentId);
    if (existing) {
      // Overwrite/update existing
      existing.status = status;
      existing.remarks = remarks || null;
    } else {
      const rec: MockStudentAttendanceRecord = {
        id: `rec-${this.records.length + 1}`,
        institutionId: sess.institutionId,
        sessionId,
        studentId,
        status,
        remarks: remarks || null,
        isExcused: status === 'excused' || status === 'on_leave',
      };
      this.records.push(rec);

      // Queue parent notification if absent or late
      if (status === 'absent' || status === 'late') {
        const primaryGuardians = this.studentGuardians.filter(
          (sg) => sg.studentId === studentId && sg.isPrimary
        );
        for (const g of primaryGuardians) {
          const notifExists = this.notifications.find(
            (n) => n.sessionId === sessionId && n.studentId === studentId && n.guardianId === g.guardianId
          );
          if (!notifExists) {
            this.notifications.push({
              id: `notif-${this.notifications.length + 1}`,
              institutionId: sess.institutionId,
              sessionId,
              studentId,
              guardianId: g.guardianId,
              channel: 'in_app',
              status: 'pending',
            });
          }
        }
      }
    }

    return { success: true };
  }

  // Audited Attendance Correction
  correctAttendance(
    userId: string,
    recordId: string,
    newStatus: AttendanceStatus,
    reason: string
  ): { success: boolean; error?: string } {
    const rec = this.records.find((r) => r.id === recordId);
    if (!rec) return { success: false, error: 'Record not found' };

    if (!this.hasRole(userId, rec.institutionId, ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'])) {
      return { success: false, error: 'Unauthorized to correct attendance' };
    }

    const prevStatus = rec.status;
    rec.status = newStatus;

    this.corrections.push({
      id: `corr-${this.corrections.length + 1}`,
      institutionId: rec.institutionId,
      recordId: rec.id,
      sessionId: rec.sessionId,
      studentId: rec.studentId,
      previousStatus: prevStatus,
      newStatus,
      reason,
      correctedBy: userId,
    });

    return { success: true };
  }

  // Parent SELECT records
  selectStudentRecordsForUser(userId: string): MockStudentAttendanceRecord[] {
    return this.records.filter((r) => {
      // 1. Staff of institution
      if (this.isMember(userId, r.institutionId)) {
        const mem = this.memberships.find((m) => m.userId === userId && m.institutionId === r.institutionId);
        if (mem && mem.role !== 'parent') return true;
      }
      // 2. Parent viewing own child
      return this.isGuardianOfStudent(userId, r.studentId);
    });
  }
}

describe('Security: Attendance RLS, Uniqueness & Event Queuing', () => {
  let db: MockAttendanceSecurityDatabase;

  const INST_A = 'inst-alpha';
  const INST_B = 'inst-beta';

  const USER_TEACHER_A = 'user-teacher-a';
  const USER_TEACHER_B = 'user-teacher-b';
  const USER_PARENT_A = 'user-parent-a';
  const USER_PARENT_B = 'user-parent-b';

  const STUDENT_1 = 'student-1';
  const STUDENT_2 = 'student-2';
  const GUARDIAN_A = 'guard-a';

  beforeEach(() => {
    db = new MockAttendanceSecurityDatabase();

    db.users = [
      { id: USER_TEACHER_A, email: 'teacher@alpha.edu' },
      { id: USER_TEACHER_B, email: 'teacher@beta.edu' },
      { id: USER_PARENT_A, email: 'parent@alpha.edu' },
      { id: USER_PARENT_B, email: 'parent@beta.edu' },
    ];

    db.memberships = [
      { id: 'm1', institutionId: INST_A, userId: USER_TEACHER_A, role: 'faculty', status: 'active' },
      { id: 'm2', institutionId: INST_B, userId: USER_TEACHER_B, role: 'faculty', status: 'active' },
      { id: 'm3', institutionId: INST_A, userId: USER_PARENT_A, role: 'parent', status: 'active' },
      { id: 'm4', institutionId: INST_B, userId: USER_PARENT_B, role: 'parent', status: 'active' },
    ];

    db.guardians = [
      { id: GUARDIAN_A, institutionId: INST_A, userId: USER_PARENT_A, phone: '9999999999' },
    ];

    db.studentGuardians = [
      { institutionId: INST_A, studentId: STUDENT_1, guardianId: GUARDIAN_A, isPrimary: true },
    ];
  });

  // Test 1: Cross-tenant barrier
  it('strictly isolates attendance sessions across institutions', () => {
    // Teacher A creates session in Inst A
    const resA = db.createSession(USER_TEACHER_A, {
      id: 'sess-a1',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });
    expect(resA.success).toBe(true);

    // Teacher B tries to select sessions in Inst A -> sees 0
    const sessionsB = db.selectSessions(USER_TEACHER_B);
    expect(sessionsB.length).toBe(0);

    // Teacher B tries to create session in Inst A -> blocked
    const resB = db.createSession(USER_TEACHER_B, {
      id: 'sess-rogue',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });
    expect(resB.success).toBe(false);
  });

  // Test 2: Duplicate daily attendance prevention
  it('prevents duplicate daily attendance sessions for the same class and date', () => {
    db.createSession(USER_TEACHER_A, {
      id: 'sess-1',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });

    // Submitting duplicate daily session on the same date and class/section
    const duplicate = db.createSession(USER_TEACHER_A, {
      id: 'sess-dup',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });

    expect(duplicate.success).toBe(false);
    expect(duplicate.error).toContain('Unique constraint violation');
  });

  // Test 3: Locked session modification prevention
  it('blocks recording or modifying attendance in a locked session', () => {
    db.createSession(USER_TEACHER_A, {
      id: 'sess-locked',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'locked',
    });

    const markRes = db.recordAttendance(USER_TEACHER_A, 'sess-locked', STUDENT_1, 'present');
    expect(markRes.success).toBe(false);
    expect(markRes.error).toContain('locked');
  });

  // Test 4: Audited attendance correction retains history
  it('preserves immutable correction audit trail when updating student attendance', () => {
    db.createSession(USER_TEACHER_A, {
      id: 'sess-edit',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });

    // Student marked absent initially
    db.recordAttendance(USER_TEACHER_A, 'sess-edit', STUDENT_1, 'absent');
    const rec = db.records.find((r) => r.studentId === STUDENT_1)!;
    expect(rec.status).toBe('absent');

    // Correct to excused with reason
    const correctRes = db.correctAttendance(
      USER_TEACHER_A,
      rec.id,
      'excused',
      'Medical certificate approved by school nurse'
    );

    expect(correctRes.success).toBe(true);
    expect(rec.status).toBe('excused');

    // Audit trail verification
    expect(db.corrections.length).toBe(1);
    expect(db.corrections[0].previousStatus).toBe('absent');
    expect(db.corrections[0].newStatus).toBe('excused');
    expect(db.corrections[0].reason).toContain('Medical certificate');
  });

  // Test 5: Parent access restrictions
  it('restricts parents to exclusively viewing their own child attendance records', () => {
    db.createSession(USER_TEACHER_A, {
      id: 'sess-p',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });

    // Mark attendance for student 1 (Parent A child) and student 2 (Unrelated child)
    db.recordAttendance(USER_TEACHER_A, 'sess-p', STUDENT_1, 'present');
    db.recordAttendance(USER_TEACHER_A, 'sess-p', STUDENT_2, 'absent');

    // Parent A queries student records
    const parentRecords = db.selectStudentRecordsForUser(USER_PARENT_A);
    expect(parentRecords.length).toBe(1);
    expect(parentRecords[0].studentId).toBe(STUDENT_1);

    // Parent B (Inst B) queries -> 0 records
    const parentBRecords = db.selectStudentRecordsForUser(USER_PARENT_B);
    expect(parentBRecords.length).toBe(0);
  });

  // Test 6: Notification queuing for absent / late students
  it('automatically queues parent notification without duplicates when student is marked absent', () => {
    db.createSession(USER_TEACHER_A, {
      id: 'sess-notif',
      institutionId: INST_A,
      academicYearId: 'ay-2026',
      classId: 'class-10',
      sectionId: 'sec-a',
      subjectId: null,
      sessionDate: '2026-11-05',
      sessionType: 'daily',
      periodNumber: null,
      status: 'submitted',
    });

    // Student 1 marked absent -> queues notification for Guardian A
    db.recordAttendance(USER_TEACHER_A, 'sess-notif', STUDENT_1, 'absent');
    expect(db.notifications.length).toBe(1);
    expect(db.notifications[0].guardianId).toBe(GUARDIAN_A);
    expect(db.notifications[0].status).toBe('pending');

    // Re-marking or updating student does not duplicate notification event
    db.recordAttendance(USER_TEACHER_A, 'sess-notif', STUDENT_1, 'absent', 'Second note');
    expect(db.notifications.length).toBe(1);
  });
});
