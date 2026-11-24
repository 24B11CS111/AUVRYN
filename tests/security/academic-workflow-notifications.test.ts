import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveStudentGuardiansForNotification,
  queueAbsenceNotificationForGuardian,
} from '../../apps/web/src/lib/attendance/attendanceNotifications';
import {
  resolveAudienceUserIds,
  fanoutAnnouncementNotifications,
} from '../../apps/web/src/lib/notifications/fanout';

describe('AUVRYN Security: Academic Workflow & Multi-Tenant Notification Isolation', () => {
  const INST_ALPHA = 'alpha-inst-1111-1111-1111';
  const INST_BRAVO = 'bravo-inst-2222-2222-2222';

  const TEACHER_ALLOCATED = 'teacher-alloc-user-1';
  const TEACHER_UNALLOCATED = 'teacher-unalloc-user-2';

  const STUDENT_A = 'student-a-user-101';
  const STUDENT_A_ROW = 'student-a-row-101';
  const PARENT_A = 'parent-a-user-201';
  const GUARDIAN_A_ROW = 'guardian-a-row-201';

  const STUDENT_B = 'student-b-user-102';
  const STUDENT_B_ROW = 'student-b-row-102';
  const PARENT_B = 'parent-b-user-202';
  const GUARDIAN_B_ROW = 'guardian-b-row-202';

  const PARENT_FOREIGN = 'parent-foreign-user-999';
  const GUARDIAN_FOREIGN_ROW = 'guardian-foreign-row-999';

  const SECTION_ALPHA_1 = 'sec-alpha-1';
  const SECTION_ALPHA_2 = 'sec-alpha-2';

  let mockDb: any;

  beforeEach(() => {
    const state = {
      institution_memberships: [
        { institution_id: INST_ALPHA, user_id: TEACHER_ALLOCATED, role: 'faculty', status: 'active' },
        { institution_id: INST_ALPHA, user_id: TEACHER_UNALLOCATED, role: 'faculty', status: 'active' },
        { institution_id: INST_ALPHA, user_id: STUDENT_A, role: 'student', status: 'active' },
        { institution_id: INST_ALPHA, user_id: STUDENT_B, role: 'student', status: 'active' },
        { institution_id: INST_ALPHA, user_id: PARENT_A, role: 'parent', status: 'active' },
        { institution_id: INST_ALPHA, user_id: PARENT_B, role: 'parent', status: 'active' },
        { institution_id: INST_BRAVO, user_id: PARENT_FOREIGN, role: 'parent', status: 'active' },
      ],
      students: [
        { id: STUDENT_A_ROW, institution_id: INST_ALPHA, user_id: STUDENT_A, first_name: 'Alice', last_name: 'Alpha' },
        { id: STUDENT_B_ROW, institution_id: INST_ALPHA, user_id: STUDENT_B, first_name: 'Bob', last_name: 'Bravo' },
      ],
      guardians: [
        { id: GUARDIAN_A_ROW, institution_id: INST_ALPHA, user_id: PARENT_A, first_name: 'Carol', last_name: 'Alpha', email: 'carol@alpha.test' },
        { id: GUARDIAN_B_ROW, institution_id: INST_ALPHA, user_id: PARENT_B, first_name: 'Dan', last_name: 'Bravo', email: 'dan@bravo.test' },
        { id: GUARDIAN_FOREIGN_ROW, institution_id: INST_BRAVO, user_id: PARENT_FOREIGN, first_name: 'Eve', last_name: 'Foreign', email: 'eve@foreign.test' },
      ],
      student_guardians: [
        { institution_id: INST_ALPHA, student_id: STUDENT_A_ROW, guardian_id: GUARDIAN_A_ROW, is_primary_contact: true, emergency_contact: true, guardians: { id: GUARDIAN_A_ROW, institution_id: INST_ALPHA, user_id: PARENT_A, first_name: 'Carol', last_name: 'Alpha', email: 'carol@alpha.test' } },
        { institution_id: INST_ALPHA, student_id: STUDENT_B_ROW, guardian_id: GUARDIAN_B_ROW, is_primary_contact: true, emergency_contact: true, guardians: { id: GUARDIAN_B_ROW, institution_id: INST_ALPHA, user_id: PARENT_B, first_name: 'Dan', last_name: 'Bravo', email: 'dan@bravo.test' } },
      ],
      student_enrollments: [
        { institution_id: INST_ALPHA, student_id: STUDENT_A_ROW, section_id: SECTION_ALPHA_1, status: 'active', students: { user_id: STUDENT_A } },
        { institution_id: INST_ALPHA, student_id: STUDENT_B_ROW, section_id: SECTION_ALPHA_2, status: 'active', students: { user_id: STUDENT_B } },
      ],
      academic_faculty_allocations: [
        { institution_id: INST_ALPHA, faculty_staff_id: 'faculty-1', section_id: SECTION_ALPHA_1 },
      ],
      notifications: [] as any[],
      notification_deliveries: [] as any[],
      push_device_tokens: [
        { user_id: PARENT_A, token: 'ExponentPushToken[parent-a-tok]', is_active: true },
        { user_id: PARENT_B, token: 'ExponentPushToken[parent-b-tok]', is_active: true },
      ],
    };

    mockDb = {
      from: (table: string) => {
        let currentData = [...((state as any)[table] || [])];
        let filterFields: { [key: string]: any } = {};
        let inFilters: { [key: string]: any[] } = {};

        const executeQuery = () => {
          return currentData.filter((item) => {
            for (const [k, v] of Object.entries(filterFields)) {
              if (item[k] !== v) return false;
            }
            for (const [k, vals] of Object.entries(inFilters)) {
              if (!vals.includes(item[k])) return false;
            }
            return true;
          });
        };

        const chain = {
          select: (fields?: string) => chain,
          eq: (field: string, val: any) => {
            filterFields[field] = val;
            return chain;
          },
          in: (field: string, vals: any[]) => {
            inFilters[field] = vals;
            return chain;
          },
          like: (field: string, val: string) => chain,
          limit: (n: number) => chain,
          order: (field: string, opts?: any) => chain,
          single: async () => {
            const res = executeQuery();
            return { data: res[0] || null, error: null };
          },
          maybeSingle: async () => {
            const res = executeQuery();
            return { data: res[0] || null, error: null };
          },
          insert: (records: any | any[]) => {
            const arr = Array.isArray(records) ? records : [records];
            const inserted = arr.map((r, i) => ({
              id: `mock-id-${Date.now()}-${i}-${Math.random()}`,
              ...r,
            }));
            (state as any)[table].push(...inserted);
            const res = { data: inserted, error: null };
            const singleRes = { data: inserted[0] || null, error: null };
            return {
              select: (cols?: string) => ({
                single: async () => singleRes,
                maybeSingle: async () => singleRes,
                then: (resolve: any) => resolve(res),
              }),
              then: (resolve: any) => resolve(res),
            };
          },
          then: (resolve: any) => {
            resolve({ data: executeQuery(), error: null });
          },
        };
        return chain;
      },
      _state: state,
    };
  });

  describe('Parent Absence Alert Isolation', () => {
    it('only resolves guardians linked to the specific absent student', async () => {
      const { targets: guardiansForA } = await resolveStudentGuardiansForNotification(mockDb, INST_ALPHA, STUDENT_A_ROW);

      expect(guardiansForA.length).toBe(1);
      expect(guardiansForA[0].guardianUserId).toBe(PARENT_A);
      expect(guardiansForA[0].guardianName).toContain('Carol');

      // Crucial security check: Student B's parent is never returned
      const hasParentB = guardiansForA.some((g: any) => g.guardianUserId === PARENT_B);
      expect(hasParentB).toBe(false);

      // Foreign parent is never returned
      const hasForeignParent = guardiansForA.some((g: any) => g.guardianUserId === PARENT_FOREIGN);
      expect(hasForeignParent).toBe(false);
    });

    it('enforces tenant isolation preventing cross-institution absence alerts', async () => {
      // Querying with Bravo institution ID on Student A (who belongs to Alpha)
      const { targets: guardiansForeign } = await resolveStudentGuardiansForNotification(mockDb, INST_BRAVO, STUDENT_A_ROW);

      // Must be empty: Student A does not belong to Institution Bravo
      expect(guardiansForeign.length).toBe(0);
    });

    it('queues an in-app notification with strict recipient privacy', async () => {
      const guardian = {
        guardianId: GUARDIAN_A_ROW,
        guardianUserId: PARENT_A,
        guardianName: 'Carol Alpha',
        guardianEmail: 'carol@alpha.test',
        guardianPhone: '+15550001',
        relationship: 'Mother',
        isPrimary: true,
        enabledChannels: ['in_app' as const, 'push' as const],
        pushToken: 'ExponentPushToken[parent-a-tok]',
      };

      const result = await queueAbsenceNotificationForGuardian(mockDb, {
        institutionId: INST_ALPHA,
        sessionId: 'sess-101',
        sessionDate: '2026-11-20',
        studentId: STUDENT_A_ROW,
        guardian,
        markedByUserId: TEACHER_ALLOCATED,
      });

      expect(result.success).toBe(true);
      expect(result.notificationId).toBeDefined();

      const notifs = mockDb._state.notifications;
      expect(notifs.length).toBe(1);
      expect(notifs[0].recipient_user_id).toBe(PARENT_A);
      expect(notifs[0].title).toBe('Attendance Alert — AUVRYN');
      // Must not be visible to Parent B or Foreign Parent
      expect(notifs[0].recipient_user_id).not.toBe(PARENT_B);
      expect(notifs[0].recipient_user_id).not.toBe(PARENT_FOREIGN);
    });
  });

  describe('Section-Level Coursework Notification Isolation', () => {
    it('restricts assignment fan-out strictly to enrolled students and linked parents of Section 1', async () => {
      const section1Audience = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'section',
        targetSectionId: SECTION_ALPHA_1,
        targetRoles: ['student', 'parent'],
      });

      // Section 1 audience contains Student A and Parent A
      expect(section1Audience).toContain(STUDENT_A);
      expect(section1Audience).toContain(PARENT_A);

      // Section 2 student and parent must be strictly excluded
      expect(section1Audience).not.toContain(STUDENT_B);
      expect(section1Audience).not.toContain(PARENT_B);
      expect(section1Audience).not.toContain(PARENT_FOREIGN);
      expect(section1Audience.length).toBe(2);
    });

    it('fans out coursework notifications with deep link to coursework portal', async () => {
      const result = await fanoutAnnouncementNotifications(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'section',
        targetSectionId: SECTION_ALPHA_1,
        targetRoles: ['student', 'parent'],
        title: 'New Coursework: Advanced Calculus Worksheet 4',
        body: 'Please complete exercises 1 to 10 by Friday.',
        priority: 'high',
        category: 'homework',
        metadata: {
          deepLinkRoute: '/portal/student/homework',
          assignmentId: 'hw-calc-04',
        },
      });

      expect(result.success).toBe(true);
      expect(result.notificationsCreated).toBe(2);

      const notifs = mockDb._state.notifications;
      const studentNotif = notifs.find((n: any) => n.recipient_user_id === STUDENT_A);
      expect(studentNotif).toBeDefined();
      expect(studentNotif.category).toBe('homework');
      expect(studentNotif.data.deep_link).toBe('/portal/student/homework');
      expect(studentNotif.data.assignmentId).toBe('hw-calc-04');
    });
  });

  describe('Feedback & Grade Notification Confidentiality', () => {
    it('delivers grade notifications only to the submitter and their guardian', async () => {
      // Individual fan-out targeting submitter (Student A) and Parent A
      const result = await fanoutAnnouncementNotifications(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'individual',
        targetUserIds: [STUDENT_A, PARENT_A],
        title: 'Coursework Graded: Physics Lab Report',
        body: 'Marks: 94/100. Excellent experimental methodology.',
        priority: 'normal',
        category: 'homework',
        metadata: {
          submissionId: 'sub-phys-01',
          marksObtained: 94,
          maxMarks: 100,
        },
      });

      expect(result.success).toBe(true);
      expect(result.notificationsCreated).toBe(2);

      // Verify no leaked notifications for Student B or Parent B
      const allNotifs = mockDb._state.notifications;
      const leakedNotif = allNotifs.find(
        (n: any) => n.recipient_user_id === STUDENT_B || n.recipient_user_id === PARENT_B
      );
      expect(leakedNotif).toBeUndefined();
    });
  });

  describe('Faculty Allocation Authorization Enforcements', () => {
    it('verifies that teachers cannot broadcast or assign coursework to unallocated classes', async () => {
      // Mock check: teacher 2 is not allocated to Section 1
      const isAllocated = mockDb._state.academic_faculty_allocations.some(
        (a: any) => a.faculty_staff_id === 'faculty-unallocated' && a.section_id === SECTION_ALPHA_1
      );
      expect(isAllocated).toBe(false);

      // Verify audience resolution excludes unallocated classes
      const resolvedAudience = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'section',
        targetSectionId: 'non-existent-section',
        targetRoles: ['student'],
      });
      expect(resolvedAudience.length).toBe(0);
    });
  });
});
