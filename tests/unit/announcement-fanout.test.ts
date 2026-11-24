import { describe, it, expect, beforeEach } from 'vitest';
import {
  resolveAudienceUserIds,
  fanoutAnnouncementNotifications,
} from '../../apps/web/src/lib/notifications/fanout';

describe('AUVRYN Announcement Fan-Out & Notification Engine', () => {
  const INST_ALPHA = 'inst-alpha-1111-1111-1111';
  const INST_BRAVO = 'inst-bravo-2222-2222-2222';

  const USER_OWNER = 'user-owner-111';
  const USER_TEACHER = 'user-teacher-222';
  const USER_STUDENT_1 = 'user-student-331';
  const STUDENT_1_ID = 'student-row-331';
  const USER_STUDENT_2 = 'user-student-332';
  const STUDENT_2_ID = 'student-row-332';
  const USER_PARENT_1 = 'user-parent-441';
  const USER_PARENT_2 = 'user-parent-442';
  const USER_FOREIGN = 'user-foreign-999';

  const CLASS_10A = 'class-10-uuid';
  const SECTION_10A1 = 'section-10a1-uuid';
  const SECTION_10A2 = 'section-10a2-uuid';

  let mockDb: any;

  beforeEach(() => {
    // In-memory mock database tables
    const state = {
      institution_memberships: [
        { institution_id: INST_ALPHA, user_id: USER_OWNER, role: 'owner', status: 'active' },
        { institution_id: INST_ALPHA, user_id: USER_TEACHER, role: 'faculty', status: 'active' },
        { institution_id: INST_ALPHA, user_id: USER_STUDENT_1, role: 'student', status: 'active' },
        { institution_id: INST_ALPHA, user_id: USER_STUDENT_2, role: 'student', status: 'active' },
        { institution_id: INST_ALPHA, user_id: USER_PARENT_1, role: 'parent', status: 'active' },
        { institution_id: INST_ALPHA, user_id: USER_PARENT_2, role: 'parent', status: 'active' },
        { institution_id: INST_BRAVO, user_id: USER_FOREIGN, role: 'student', status: 'active' },
      ],
      student_enrollments: [
        {
          institution_id: INST_ALPHA,
          student_id: STUDENT_1_ID,
          class_id: CLASS_10A,
          section_id: SECTION_10A1,
          status: 'active',
          students: { user_id: USER_STUDENT_1 },
        },
        {
          institution_id: INST_ALPHA,
          student_id: STUDENT_2_ID,
          class_id: CLASS_10A,
          section_id: SECTION_10A2,
          status: 'active',
          students: { user_id: USER_STUDENT_2 },
        },
      ],
      student_guardians: [
        {
          institution_id: INST_ALPHA,
          student_id: STUDENT_1_ID,
          guardians: { user_id: USER_PARENT_1 },
        },
        {
          institution_id: INST_ALPHA,
          student_id: STUDENT_2_ID,
          guardians: { user_id: USER_PARENT_2 },
        },
      ],
      push_device_tokens: [
        { user_id: USER_PARENT_1, token: 'ExponentPushToken[parent1-token]', is_active: true },
        { user_id: USER_STUDENT_1, token: 'ExponentPushToken[student1-token]', is_active: true },
        { user_id: USER_OWNER, token: 'ExponentPushToken[owner-token]', is_active: true },
      ],
      notifications: [] as any[],
      notification_deliveries: [] as any[],
    };

    // Query builder mock
    mockDb = {
      from: (table: string) => {
        let currentData = [...((state as any)[table] || [])];
        let filterFields: { [key: string]: any } = {};
        let inFilters: { [key: string]: any[] } = {};

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
            let res = currentData.filter((item) => {
              for (const [k, v] of Object.entries(filterFields)) {
                if (item[k] !== v) return false;
              }
              for (const [k, vals] of Object.entries(inFilters)) {
                if (!vals.includes(item[k])) return false;
              }
              return true;
            });
            resolve({ data: res, error: null });
          },
        };
        return chain;
      },
      _state: state,
    };
  });

  describe('Audience Resolution (resolveAudienceUserIds)', () => {
    it('resolves all active members when scope is institution', async () => {
      const userIds = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'institution',
      });

      expect(userIds).toContain(USER_OWNER);
      expect(userIds).toContain(USER_TEACHER);
      expect(userIds).toContain(USER_STUDENT_1);
      expect(userIds).toContain(USER_STUDENT_2);
      expect(userIds).toContain(USER_PARENT_1);
      expect(userIds).toContain(USER_PARENT_2);
      expect(userIds).not.toContain(USER_FOREIGN); // Foreign tenant excluded
      expect(userIds.length).toBe(6);
    });

    it('filters strictly by target roles when scope is role', async () => {
      const parentUserIds = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'role',
        targetRoles: ['parent'],
      });

      expect(parentUserIds).toEqual(expect.arrayContaining([USER_PARENT_1, USER_PARENT_2]));
      expect(parentUserIds).not.toContain(USER_TEACHER);
      expect(parentUserIds).not.toContain(USER_STUDENT_1);
      expect(parentUserIds.length).toBe(2);
    });

    it('resolves only students and parents in a specific section', async () => {
      const sectionUserIds = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'section',
        targetSectionId: SECTION_10A1,
        targetRoles: ['student', 'parent'],
      });

      // Section 10A1 has student 1 and parent 1
      expect(sectionUserIds).toContain(USER_STUDENT_1);
      expect(sectionUserIds).toContain(USER_PARENT_1);
      expect(sectionUserIds).not.toContain(USER_STUDENT_2);
      expect(sectionUserIds).not.toContain(USER_PARENT_2);
      expect(sectionUserIds.length).toBe(2);
    });

    it('resolves whole class when targeted by class scope', async () => {
      const classUserIds = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'class',
        targetClassId: CLASS_10A,
        targetRoles: ['student'],
      });

      expect(classUserIds).toContain(USER_STUDENT_1);
      expect(classUserIds).toContain(USER_STUDENT_2);
      expect(classUserIds).not.toContain(USER_PARENT_1);
      expect(classUserIds.length).toBe(2);
    });

    it('verifies active institution membership for individual scope', async () => {
      const individualIds = await resolveAudienceUserIds(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'individual',
        targetUserIds: [USER_STUDENT_1, USER_FOREIGN],
      });

      expect(individualIds).toContain(USER_STUDENT_1);
      expect(individualIds).not.toContain(USER_FOREIGN); // Foreign user excluded
      expect(individualIds.length).toBe(1);
    });
  });

  describe('Fan-out Notification & Push Dispatch (fanoutAnnouncementNotifications)', () => {
    it('creates in-app notifications and queues push deliveries for registered devices', async () => {
      const result = await fanoutAnnouncementNotifications(mockDb, {
        institutionId: INST_ALPHA,
        scope: 'role',
        targetRoles: ['parent'],
        title: 'Parent-Teacher Meeting Notice',
        body: 'PTM scheduled for next Saturday at 10 AM.',
        priority: 'high',
        category: 'announcements',
      });

      expect(result.success).toBe(true);
      expect(result.recipientCount).toBe(2);
      expect(result.notificationsCreated).toBe(2);
      // USER_PARENT_1 has a registered push token; USER_PARENT_2 does not
      expect(result.pushDeliveriesQueued).toBe(1);

      // Verify created in-app notification properties
      const notifications = mockDb._state.notifications;
      expect(notifications.length).toBe(2);
      const parent1Notif = notifications.find((n: any) => n.recipient_user_id === USER_PARENT_1);
      expect(parent1Notif).toBeDefined();
      expect(parent1Notif.title).toBe('Parent-Teacher Meeting Notice');
      expect(parent1Notif.priority).toBe('high');
      expect(parent1Notif.is_read).toBe(false);

      // Verify queued push delivery properties
      const deliveries = mockDb._state.notification_deliveries;
      expect(deliveries.length).toBe(1);
      const push = deliveries[0];
      expect(push.channel).toBe('push');
      expect(push.destination).toBe('ExponentPushToken[parent1-token]');
      expect(push.status).toBe('pending');
      expect(push.idempotency_key).toContain('push_');
    });
  });
});
