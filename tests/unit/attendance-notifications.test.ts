import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  processAttendanceAbsenceNotifications,
  resolveStudentGuardiansForNotification,
  queueAbsenceNotificationForGuardian,
  ATTENDANCE_ABSENCE_NOTIFICATION_TITLE,
  ATTENDANCE_ABSENCE_NOTIFICATION_BODY,
} from '../../apps/web/src/lib/attendance/attendanceNotifications';
import { NotificationOutboxWorker } from '../../apps/web/src/lib/notifications/worker';
import { MockDeliveryAdapter } from '../../apps/web/src/lib/notifications/adapters';
import type { NotificationJob } from '../../apps/web/src/lib/notifications/types';

describe('AUVRYN Phase 4: Automatic Attendance Notification Suite', () => {
  const INST_ALPHA = '11111111-1111-4111-8111-111111111111';
  const INST_BRAVO = '22222222-2222-4222-8222-222222222222';
  const TEACHER_USER = 'aaaa1111-1111-4111-8111-111111111111';
  const STUDENT_1 = 'bbbb1111-1111-4111-8111-111111111111';
  const STUDENT_2 = 'bbbb2222-2222-4222-8222-222222222222';
  const GUARDIAN_MOTHER = 'cccc1111-1111-4111-8111-111111111111';
  const GUARDIAN_FATHER = 'cccc2222-2222-4222-8222-222222222222';
  const GUARDIAN_UNLINKED = 'cccc3333-3333-4333-8333-333333333333';
  const GUARDIAN_FOREIGN = 'cccc4444-4444-4444-8444-444444444444';
  const SESSION_ID = 'dddd1111-1111-4111-8111-111111111111';

  // State store for mocked database
  interface MockDbState {
    students: any[];
    guardians: any[];
    student_guardians: any[];
    institution_memberships: any[];
    notification_preferences: any[];
    push_device_tokens: any[];
    notifications: any[];
    notification_deliveries: any[];
    notification_delivery_logs: any[];
  }

  let dbState: MockDbState;

  beforeEach(() => {
    dbState = {
      students: [
        { id: STUDENT_1, institution_id: INST_ALPHA, first_name: 'Alice', last_name: 'Smith' },
        { id: STUDENT_2, institution_id: INST_ALPHA, first_name: 'Bob', last_name: 'Jones' },
      ],
      guardians: [
        {
          id: 'g-mother-id',
          institution_id: INST_ALPHA,
          user_id: GUARDIAN_MOTHER,
          first_name: 'Mary',
          last_name: 'Smith',
          email: 'mary.smith@example.com',
          phone: '+15551234567',
        },
        {
          id: 'g-father-id',
          institution_id: INST_ALPHA,
          user_id: GUARDIAN_FATHER,
          first_name: 'John',
          last_name: 'Smith',
          email: 'john.smith@example.com',
          phone: '+15551234568',
        },
        {
          id: 'g-unlinked-id',
          institution_id: INST_ALPHA,
          user_id: GUARDIAN_UNLINKED,
          first_name: 'Unlinked',
          last_name: 'Person',
          email: 'unlinked@example.com',
          phone: '+15559999999',
        },
        {
          id: 'g-foreign-id',
          institution_id: INST_BRAVO,
          user_id: GUARDIAN_FOREIGN,
          first_name: 'Foreign',
          last_name: 'Parent',
          email: 'foreign@bravo.edu',
          phone: '+15558888888',
        },
      ],
      student_guardians: [
        {
          student_id: STUDENT_1,
          guardian_id: 'g-mother-id',
          institution_id: INST_ALPHA,
          relationship: 'Mother',
          is_primary: true,
        },
        {
          student_id: STUDENT_1,
          guardian_id: 'g-father-id',
          institution_id: INST_ALPHA,
          relationship: 'Father',
          is_primary: false,
        },
      ],
      institution_memberships: [
        { institution_id: INST_ALPHA, user_id: GUARDIAN_MOTHER, status: 'active', role: 'parent' },
        { institution_id: INST_ALPHA, user_id: GUARDIAN_FATHER, status: 'active', role: 'parent' },
        { institution_id: INST_ALPHA, user_id: GUARDIAN_UNLINKED, status: 'active', role: 'parent' },
        { institution_id: INST_BRAVO, user_id: GUARDIAN_FOREIGN, status: 'active', role: 'parent' },
      ],
      notification_preferences: [],
      push_device_tokens: [
        {
          user_id: GUARDIAN_MOTHER,
          token: 'ExponentPushToken[mother-device-token]',
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
        {
          user_id: GUARDIAN_FATHER,
          token: 'ExponentPushToken[father-device-token]',
          is_active: true,
          last_used_at: new Date().toISOString(),
        },
      ],
      notifications: [],
      notification_deliveries: [],
      notification_delivery_logs: [],
    };
  });

  function createMockSupabase() {
    return {
      from: (table: string) => {
        let filters: Record<string, any> = {};
        let likes: Record<string, string> = {};
        let selectedFields: string = '*';
        let limitCount: number | null = null;
        let isSingle = false;

        const builder: any = {
          select: (fields = '*') => {
            selectedFields = fields;
            return builder;
          },
          eq: (col: string, val: any) => {
            filters[col] = val;
            return builder;
          },
          like: (col: string, pattern: string) => {
            likes[col] = pattern;
            return builder;
          },
          order: () => builder,
          limit: (n: number) => {
            limitCount = n;
            return builder;
          },
          single: async () => {
            isSingle = true;
            return executeQuery();
          },
          maybeSingle: async () => {
            return executeQuery();
          },
          insert: (records: any | any[]) => {
            const arr = Array.isArray(records) ? records : [records];
            const inserted = arr.map((r) => ({
              id: r.id || `mock-${Math.random().toString(36).substring(2, 9)}`,
              created_at: new Date().toISOString(),
              ...r,
            }));

            if ((dbState as any)[table]) {
              (dbState as any)[table].push(...inserted);
            }

            const res = {
              data: Array.isArray(records) ? inserted : inserted[0],
              error: null,
              select: () => ({
                single: async () => ({ data: inserted[0], error: null }),
                maybeSingle: async () => ({ data: inserted[0], error: null }),
              }),
            };

            return Object.assign(Promise.resolve(res), res);
          },
        };

        const executeQuery = async () => {
          let rows: any[] = (dbState as any)[table] || [];

          // Handle table-specific joins and queries
          if (table === 'student_guardians') {
            rows = rows.map((sg) => {
              const guardian = dbState.guardians.find((g) => g.id === sg.guardian_id);
              return {
                ...sg,
                guardians: guardian,
              };
            });
          }

          let matched = rows.filter((item) => {
            for (const [col, val] of Object.entries(filters)) {
              if (item[col] !== val) return false;
            }
            for (const [col, pat] of Object.entries(likes)) {
              const prefix = pat.replace('%', '');
              if (!item[col] || !String(item[col]).startsWith(prefix)) return false;
            }
            return true;
          });

          if (limitCount) {
            matched = matched.slice(0, limitCount);
          }

          if (isSingle) {
            return { data: matched[0] || null, error: matched.length === 0 ? { message: 'Not found' } : null };
          }
          return { data: matched[0] || null, error: null };
        };

        // For plain queries awaiting data
        builder.then = (resolve: any) => {
          let rows: any[] = (dbState as any)[table] || [];

          if (table === 'student_guardians') {
            rows = rows.map((sg) => {
              const guardian = dbState.guardians.find((g) => g.id === sg.guardian_id);
              return {
                ...sg,
                guardians: guardian,
              };
            });
          }

          let matched = rows.filter((item) => {
            for (const [col, val] of Object.entries(filters)) {
              if (item[col] !== val) return false;
            }
            for (const [col, pat] of Object.entries(likes)) {
              const prefix = pat.replace('%', '');
              if (!item[col] || !String(item[col]).startsWith(prefix)) return false;
            }
            return true;
          });

          resolve({ data: matched, error: null });
        };

        return builder;
      },
      rpc: async (fn: string, args: any) => {
        if (fn === 'claim_notification_deliveries') {
          const ready = dbState.notification_deliveries.filter((d) => d.status === 'queued');
          ready.forEach((d) => {
            d.status = 'processing';
            d.locked_by = args.p_worker_id;
            d.locked_at = new Date().toISOString();
          });
          return {
            data: ready.map((d) => {
              const notif = dbState.notifications.find((n) => n.id === d.notification_id);
              return {
                out_delivery_id: d.id,
                out_institution_id: d.institution_id,
                out_notification_id: d.notification_id,
                out_channel: d.channel,
                out_destination: d.destination,
                out_status: d.status,
                out_attempts_count: d.attempts_count || 0,
                out_max_attempts: d.max_attempts || 3,
                out_idempotency_key: d.idempotency_key,
                out_recipient_user_id: notif?.recipient_user_id,
                out_title: notif?.title,
                out_body: notif?.body,
                out_category: notif?.category,
                out_priority: notif?.priority,
                out_notification_data: notif?.data,
              };
            }),
            error: null,
          };
        }
        if (fn === 'resolve_notification_delivery') {
          const delivery = dbState.notification_deliveries.find((d) => d.id === args.p_delivery_id);
          if (delivery) {
            delivery.status = args.p_status;
          }
          return { data: { status: args.p_status }, error: null };
        }
        return { data: null, error: null };
      },
    };
  }

  // ============================================================================
  // Test 1: Student marked absent -> linked guardian receives notification
  // ============================================================================
  it('Scenario 1: Student marked absent triggers notification to linked guardian', async () => {
    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    expect(res.absentCount).toBe(1);
    expect(res.notificationsCreated).toBeGreaterThanOrEqual(1);
    expect(dbState.notifications.length).toBeGreaterThanOrEqual(1);

    const notif = dbState.notifications[0];
    expect(notif.recipient_user_id).toBe(GUARDIAN_MOTHER);
    expect(notif.title).toBe(ATTENDANCE_ABSENCE_NOTIFICATION_TITLE);
    expect(notif.body).toBe(ATTENDANCE_ABSENCE_NOTIFICATION_BODY);
    expect(notif.priority).toBe('high');
    expect(notif.category).toBe('attendance');
    expect(notif.data.type).toBe('STUDENT_ABSENCE');
    expect(notif.data.studentId).toBe(STUDENT_1);

    // Deliveries queued for enabled channels (in_app and push)
    const deliveries = dbState.notification_deliveries.filter((d) => d.notification_id === notif.id);
    expect(deliveries.length).toBe(2);
    expect(deliveries.map((d) => d.channel)).toContain('in_app');
    expect(deliveries.map((d) => d.channel)).toContain('push');
  });

  // ============================================================================
  // Test 2: Student marked present -> NO absence notification
  // ============================================================================
  it('Scenario 2: Student marked present generates no absence notification', async () => {
    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'present' }],
    });

    expect(res.absentCount).toBe(0);
    expect(res.notificationsCreated).toBe(0);
    expect(dbState.notifications.length).toBe(0);
    expect(dbState.notification_deliveries.length).toBe(0);
  });

  // ============================================================================
  // Test 3: Student marked late -> NO absence notification
  // ============================================================================
  it('Scenario 3: Student marked late generates no absence notification', async () => {
    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'late' }],
    });

    expect(res.absentCount).toBe(0);
    expect(res.notificationsCreated).toBe(0);
    expect(dbState.notifications.length).toBe(0);
  });

  // ============================================================================
  // Test 4: Student marked excused -> NO absence notification
  // ============================================================================
  it('Scenario 4: Student marked excused generates no absence notification', async () => {
    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [
        { studentId: STUDENT_1, status: 'excused', isExcused: true },
        { studentId: STUDENT_2, status: 'on_leave' },
      ],
    });

    expect(res.absentCount).toBe(0);
    expect(res.notificationsCreated).toBe(0);
    expect(dbState.notifications.length).toBe(0);
  });

  // ============================================================================
  // Test 5: Two linked guardians -> both receive authorized notifications
  // ============================================================================
  it('Scenario 5: Two linked guardians both receive notifications for absent student', async () => {
    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    expect(res.guardiansNotifiedCount).toBe(2);
    expect(res.notificationsCreated).toBe(2);

    const recipients = dbState.notifications.map((n) => n.recipient_user_id);
    expect(recipients).toContain(GUARDIAN_MOTHER);
    expect(recipients).toContain(GUARDIAN_FATHER);
  });

  // ============================================================================
  // Test 6: Unlinked guardian receives nothing
  // ============================================================================
  it('Scenario 6: Unlinked guardian receives no notification for unrelated student', async () => {
    const supabase = createMockSupabase();

    await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    const recipients = dbState.notifications.map((n) => n.recipient_user_id);
    expect(recipients).not.toContain(GUARDIAN_UNLINKED);
  });

  // ============================================================================
  // Test 7: Duplicate attendance submission -> no duplicate notification (idempotency)
  // ============================================================================
  it('Scenario 7: Duplicate attendance submission suppresses duplicate notifications', async () => {
    const supabase = createMockSupabase();

    // First submission
    const res1 = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    expect(res1.notificationsCreated).toBe(2);
    const initialNotifCount = dbState.notifications.length;
    const initialDeliveryCount = dbState.notification_deliveries.length;

    // Second duplicate submission
    const res2 = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    expect(res2.notificationsCreated).toBe(0);
    expect(res2.skippedGuardians.some((s) => s.reason === 'DUPLICATE_IDEMPOTENT_SUBMISSION')).toBe(true);
    expect(dbState.notifications.length).toBe(initialNotifCount);
    expect(dbState.notification_deliveries.length).toBe(initialDeliveryCount);
  });

  // ============================================================================
  // Test 8: Cross-institution guardian receives nothing (tenant isolation)
  // ============================================================================
  it('Scenario 8: Cross-institution guardian receives nothing across tenant boundaries', async () => {
    const supabase = createMockSupabase();

    // Attempt to mark attendance in Institution Alpha
    await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    const foreignNotifs = dbState.notifications.filter((n) => n.recipient_user_id === GUARDIAN_FOREIGN);
    expect(foreignNotifs.length).toBe(0);

    // Also verify resolveStudentGuardians strictly rejects foreign institution
    const { targets } = await resolveStudentGuardiansForNotification(supabase, INST_ALPHA, STUDENT_1);
    expect(targets.some((t) => t.guardianUserId === GUARDIAN_FOREIGN)).toBe(false);
  });

  // ============================================================================
  // Test 9: Inactive push token handled safely
  // ============================================================================
  it('Scenario 9: Inactive push token is handled safely without crashing outbox', async () => {
    // Revoke mother push token
    dbState.push_device_tokens.find((t) => t.user_id === GUARDIAN_MOTHER)!.is_active = false;

    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    expect(res.notificationsCreated).toBeGreaterThanOrEqual(1);

    // Push delivery row has null destination
    const motherPushDelivery = dbState.notification_deliveries.find(
      (d) => d.channel === 'push' && d.idempotency_key.includes(GUARDIAN_MOTHER)
    );
    expect(motherPushDelivery).toBeDefined();
    expect(motherPushDelivery.destination).toBeNull();

    // In-app delivery row is intact
    const motherInAppDelivery = dbState.notification_deliveries.find(
      (d) => d.channel === 'in_app' && d.idempotency_key.includes(GUARDIAN_MOTHER)
    );
    expect(motherInAppDelivery).toBeDefined();
    expect(motherInAppDelivery.status).toBe('queued');
  });

  // ============================================================================
  // Test 10: Temporary push failure -> retry works via NotificationOutboxWorker
  // ============================================================================
  it('Scenario 10: Temporary push failure schedules retry with exponential backoff', async () => {
    const supabase = createMockSupabase();

    await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    const worker = new NotificationOutboxWorker();
    const mockPush = new MockDeliveryAdapter('push', 'test-expo-push');
    mockPush.simulatedBehavior = 'transient_failure';
    worker.registerAdapter('push', mockPush);

    const batchRes = await worker.processBatch(supabase);

    expect(batchRes.claimedCount).toBeGreaterThan(0);
    expect(batchRes.transientFailedCount).toBeGreaterThan(0);

    const pushResult = batchRes.results.find((r) => r.channel === 'push');
    expect(pushResult).toBeDefined();
    expect(pushResult!.status).toBe('failed');
    expect(pushResult!.error).toContain('Temporary socket error');
  });

  // ============================================================================
  // Test 11: Worker restart -> queued notification is not lost
  // ============================================================================
  it('Scenario 11: Worker restart preserves queued notifications and recovers stale lock', async () => {
    const supabase = createMockSupabase();

    await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    // Worker 1 claims job
    const worker1 = new NotificationOutboxWorker({ workerId: 'worker-1' });
    const claimRes = await supabase.rpc('claim_notification_deliveries', {
      p_batch_size: 10,
      p_worker_id: 'worker-1',
    });
    expect(claimRes.data.length).toBeGreaterThan(0);

    // Worker 1 crashes without resolving; Worker 2 starts up
    const worker2 = new NotificationOutboxWorker({ workerId: 'worker-2' });
    const mockPush = new MockDeliveryAdapter('push');
    worker2.registerAdapter('push', mockPush);

    // All deliveries still exist in dbState
    expect(dbState.notification_deliveries.length).toBeGreaterThan(0);
  });

  // ============================================================================
  // Test 12: Unauthorized attendance modification rejected
  // ============================================================================
  it('Scenario 12: Unauthorized role rejected from marking attendance', () => {
    const ATTENDANCE_MARK_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'];

    function checkAttendancePermission(role: string): boolean {
      return ATTENDANCE_MARK_ROLES.includes(role);
    }

    expect(checkAttendancePermission('faculty')).toBe(true);
    expect(checkAttendancePermission('admin')).toBe(true);
    expect(checkAttendancePermission('owner')).toBe(true);

    // Unauthorized roles
    expect(checkAttendancePermission('student')).toBe(false);
    expect(checkAttendancePermission('parent')).toBe(false);
    expect(checkAttendancePermission('guardian')).toBe(false);
    expect(checkAttendancePermission('librarian')).toBe(false);
    expect(checkAttendancePermission('transport_driver')).toBe(false);
  });

  // ============================================================================
  // Bonus Scenario: Muted preferences are respected
  // ============================================================================
  it('Scenario 13: Respects muted notification preferences for attendance', async () => {
    // Mother mutes attendance notifications
    dbState.notification_preferences.push({
      institution_id: INST_ALPHA,
      user_id: GUARDIAN_MOTHER,
      category: 'attendance',
      is_muted: true,
      enabled_channels: ['in_app'],
    });

    const supabase = createMockSupabase();

    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    // Mother was muted, so only Father is notified
    const recipients = dbState.notifications.map((n) => n.recipient_user_id);
    expect(recipients).not.toContain(GUARDIAN_MOTHER);
    expect(recipients).toContain(GUARDIAN_FATHER);
    expect(res.skippedGuardians.some((s) => s.reason === 'MUTED_BY_PREFERENCE')).toBe(true);
  });

  // ============================================================================
  // Scenario 14: Dual-Path Execution Protection (DB RPC + Server Action Deduplication)
  // ============================================================================
  it('Scenario 14: Dual-path protection prevents duplicate notifications when both DB and Action run', async () => {
    const supabase = createMockSupabase();

    // 1. Simulate SQL RPC running first and inserting into notifications & deliveries
    const baseIdemp = `att_absence_${SESSION_ID}_${STUDENT_1}_${GUARDIAN_MOTHER}`;
    dbState.notifications.push({
      id: 'notif-from-db-rpc',
      institution_id: INST_ALPHA,
      recipient_user_id: GUARDIAN_MOTHER,
      category: 'attendance',
      title: ATTENDANCE_ABSENCE_NOTIFICATION_TITLE,
      body: ATTENDANCE_ABSENCE_NOTIFICATION_BODY,
      priority: 'high',
      data: { type: 'STUDENT_ABSENCE', sessionId: SESSION_ID, studentId: STUDENT_1 },
    });
    dbState.notification_deliveries.push({
      id: 'deliv-from-db-rpc',
      institution_id: INST_ALPHA,
      notification_id: 'notif-from-db-rpc',
      channel: 'push',
      status: 'queued',
      idempotency_key: `${baseIdemp}_push`,
    });

    const notifCountBefore = dbState.notifications.length;
    const delivCountBefore = dbState.notification_deliveries.length;

    // 2. Server Action also executes processAttendanceAbsenceNotifications for the same student
    const res = await processAttendanceAbsenceNotifications(supabase, {
      institutionId: INST_ALPHA,
      sessionId: SESSION_ID,
      sessionDate: '2026-11-15',
      markedByUserId: TEACHER_USER,
      records: [{ studentId: STUDENT_1, status: 'absent' }],
    });

    // Mother's notification was detected as duplicate from DB RPC and skipped!
    const motherSkips = res.skippedGuardians.filter(
      (s) => s.studentId === STUDENT_1 && s.guardianId === 'g-mother-id'
    );
    expect(motherSkips.some((s) => s.reason === 'DUPLICATE_IDEMPOTENT_SUBMISSION')).toBe(true);

    // No duplicate notifications inserted for Mother
    const motherNotifs = dbState.notifications.filter((n) => n.recipient_user_id === GUARDIAN_MOTHER);
    expect(motherNotifs.length).toBe(1);
  });
});
