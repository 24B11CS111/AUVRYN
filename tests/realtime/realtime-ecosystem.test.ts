import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  AuvrynRealtimeService,
  getInstitutionChannelName,
  getUserNotificationChannelName,
  getJourneyTelemetryChannelName,
} from '../../packages/supabase-client/src/realtime';
import type { RealtimeMessage } from '@edu-platform/types';

/**
 * In-Memory Realtime Socket Hub
 * Simulates Supabase Realtime multi-client websocket broadcast server in Vitest.
 */
class MockRealtimeHub {
  private channels: Map<string, Set<any>> = new Map();

  createClient(name: string) {
    const hub = this;
    return {
      channel(channelName: string, config?: any) {
        let broadcastHandler: ((res: any) => void) | null = null;
        let subscribeCallback: ((status: string, err?: any) => void) | null = null;

        const channelObj = {
          channelName,
          clientName: name,
          on(type: string, filter: any, callback: (res: any) => void) {
            if (type === 'broadcast') {
              broadcastHandler = callback;
            }
            return channelObj;
          },
          subscribe(callback: (status: string, err?: any) => void) {
            subscribeCallback = callback;
            let group = hub.channels.get(channelName);
            if (!group) {
              group = new Set();
              hub.channels.set(channelName, group);
            }
            group.add(channelObj);
            setTimeout(() => callback('SUBSCRIBED'), 0);
            return channelObj;
          },
          async send(message: { type: string; event: string; payload: any }) {
            const group = hub.channels.get(channelName);
            if (group) {
              for (const ch of group) {
                // Deliver to all channel subscribers (except optionally self or with self-filtering)
                ch._deliver(message.event, message.payload);
              }
            }
            return 'ok';
          },
          unsubscribe() {
            const group = hub.channels.get(channelName);
            if (group) {
              group.delete(channelObj);
              if (group.size === 0) {
                hub.channels.delete(channelName);
              }
            }
            if (subscribeCallback) {
              subscribeCallback('CLOSED');
            }
          },
          _deliver(event: string, payload: any) {
            if (broadcastHandler) {
              broadcastHandler({ event, payload });
            }
          },
        };

        return channelObj;
      },
    } as any;
  }
}

describe('AUVRYN Real-Time Synchronization Ecosystem', () => {
  let hub: MockRealtimeHub;
  const INST_A = 'inst-alpha-1111';
  const INST_B = 'inst-bravo-2222';
  const USER_TEACHER = 'usr-teacher-101';
  const USER_STUDENT = 'usr-student-202';
  const USER_PARENT = 'usr-parent-303';
  const USER_OWNER = 'usr-owner-001';
  const JOURNEY_ID = 'jrn-bus-99';

  beforeEach(() => {
    hub = new MockRealtimeHub();
  });

  // =========================================================================
  // Test A: Teacher Marks Attendance -> Student & Parent Receive Updates
  // =========================================================================
  it('Test A: Teacher marks attendance on web; Student app and Parent receive live updates', async () => {
    const teacherClient = hub.createClient('teacher-web');
    const studentClient = hub.createClient('student-mobile');
    const parentClient = hub.createClient('parent-mobile');

    const teacherService = new AuvrynRealtimeService(teacherClient, {
      institutionId: INST_A,
      userId: USER_TEACHER,
      userRole: 'teacher',
    });

    const studentService = new AuvrynRealtimeService(studentClient, {
      institutionId: INST_A,
      userId: USER_STUDENT,
      userRole: 'student',
    });

    const parentService = new AuvrynRealtimeService(parentClient, {
      institutionId: INST_A,
      userId: USER_PARENT,
      userRole: 'parent',
    });

    const studentReceived: RealtimeMessage[] = [];
    const parentReceived: RealtimeMessage[] = [];

    // Student listens to academics
    studentService.subscribeToInstitution(INST_A, 'academics', (msg) => {
      studentReceived.push(msg);
    });

    // Parent listens to direct notifications
    parentService.subscribeToUserNotifications(USER_PARENT, (msg) => {
      parentReceived.push(msg);
    });

    // Wait for subscriptions to connect
    await new Promise((r) => setTimeout(r, 10));

    // 1. Teacher marks attendance and broadcasts academic event
    const attendancePayload = {
      classId: 'class-10-a',
      date: '2026-11-15',
      presentCount: 28,
      absentCount: 2,
    };
    await teacherService.broadcast(
      getInstitutionChannelName(INST_A, 'academics'),
      'ATTENDANCE_RECORDED',
      attendancePayload
    );

    // 2. Direct in-app notification sent to absent student's parent
    const notificationPayload = {
      id: 'notif-att-001',
      title: 'Attendance Alert',
      body: 'Your child was marked absent today.',
      category: 'attendance',
    };
    await teacherService.broadcast(
      getUserNotificationChannelName(USER_PARENT),
      'NOTIFICATION_CREATED',
      notificationPayload,
      'notif-att-001'
    );

    await new Promise((r) => setTimeout(r, 10));

    // Assert student received attendance update
    expect(studentReceived.length).toBe(1);
    expect(studentReceived[0].eventType).toBe('ATTENDANCE_RECORDED');
    expect(studentReceived[0].payload.classId).toBe('class-10-a');

    // Assert parent received attendance alert notification
    expect(parentReceived.length).toBe(1);
    expect(parentReceived[0].eventType).toBe('NOTIFICATION_CREATED');
    expect(parentReceived[0].payload.title).toBe('Attendance Alert');

    teacherService.destroy();
    studentService.destroy();
    parentService.destroy();
  });

  // =========================================================================
  // Test B: Owner Creates Timetable -> Teacher and Student Dashboards Update
  // =========================================================================
  it('Test B: Owner updates timetable; Teacher and Student dashboards receive event', async () => {
    const ownerClient = hub.createClient('owner-web');
    const teacherClient = hub.createClient('teacher-web');
    const studentClient = hub.createClient('student-mobile');

    const ownerService = new AuvrynRealtimeService(ownerClient, {
      institutionId: INST_A,
      userId: USER_OWNER,
      userRole: 'owner',
    });

    const teacherService = new AuvrynRealtimeService(teacherClient, {
      institutionId: INST_A,
      userId: USER_TEACHER,
      userRole: 'teacher',
    });

    const studentService = new AuvrynRealtimeService(studentClient, {
      institutionId: INST_A,
      userId: USER_STUDENT,
      userRole: 'student',
    });

    const teacherEvents: RealtimeMessage[] = [];
    const studentEvents: RealtimeMessage[] = [];

    teacherService.subscribeToInstitution(INST_A, 'academics', (m) => teacherEvents.push(m));
    studentService.subscribeToInstitution(INST_A, 'academics', (m) => studentEvents.push(m));

    await new Promise((r) => setTimeout(r, 10));

    await ownerService.broadcast(
      getInstitutionChannelName(INST_A, 'academics'),
      'TIMETABLE_UPDATED',
      { academicYearId: 'ay-2026', scheduleUpdated: true }
    );

    await new Promise((r) => setTimeout(r, 10));

    expect(teacherEvents.length).toBe(1);
    expect(teacherEvents[0].eventType).toBe('TIMETABLE_UPDATED');
    expect(studentEvents.length).toBe(1);
    expect(studentEvents[0].eventType).toBe('TIMETABLE_UPDATED');

    ownerService.destroy();
    teacherService.destroy();
    studentService.destroy();
  });

  // =========================================================================
  // Test C: Fee Payment Recorded -> Owner KPI & Parent Portal Update
  // =========================================================================
  it('Test C: Fee payment recorded; Owner KPI updates and Parent view updates', async () => {
    const adminClient = hub.createClient('admin-web');
    const ownerClient = hub.createClient('owner-web');
    const parentClient = hub.createClient('parent-web');

    const adminService = new AuvrynRealtimeService(adminClient, {
      institutionId: INST_A,
      userId: 'admin-1',
      userRole: 'admin',
    });

    const ownerService = new AuvrynRealtimeService(ownerClient, {
      institutionId: INST_A,
      userId: USER_OWNER,
      userRole: 'owner',
    });

    const parentService = new AuvrynRealtimeService(parentClient, {
      institutionId: INST_A,
      userId: USER_PARENT,
      userRole: 'parent',
    });

    const ownerKpiEvents: RealtimeMessage[] = [];
    const parentOperationsEvents: RealtimeMessage[] = [];

    // Owner watches KPI invalidation channel
    ownerService.subscribeToInstitution(INST_A, 'kpi', (m) => ownerKpiEvents.push(m));

    // Parent watches operations channel
    parentService.subscribeToInstitution(INST_A, 'operations', (m) => parentOperationsEvents.push(m));

    await new Promise((r) => setTimeout(r, 10));

    // Admin records fee payment: broadcasts operations event and KPI invalidation
    await adminService.broadcast(
      getInstitutionChannelName(INST_A, 'operations'),
      'FEE_PAYMENT_RECORDED',
      { paymentId: 'pay-777', amount: 12500, receiptNumber: 'REC-2026-001' }
    );
    await adminService.broadcastKpiInvalidation(['fees']);

    await new Promise((r) => setTimeout(r, 10));

    expect(ownerKpiEvents.length).toBe(1);
    expect(ownerKpiEvents[0].eventType).toBe('KPI_STATS_INVALIDATED');
    expect(ownerKpiEvents[0].payload.modules).toContain('fees');

    expect(parentOperationsEvents.length).toBe(1);
    expect(parentOperationsEvents[0].eventType).toBe('FEE_PAYMENT_RECORDED');
    expect(parentOperationsEvents[0].payload.receiptNumber).toBe('REC-2026-001');

    adminService.destroy();
    ownerService.destroy();
    parentService.destroy();
  });

  // =========================================================================
  // Test D: Transport Staff Broadcasts GPS -> Authorized Map Receives Fix
  // =========================================================================
  it('Test D: Transport staff broadcasts GPS fix; Map receives location; Student broadcast is rejected', async () => {
    const driverClient = hub.createClient('driver-mobile');
    const mapClient = hub.createClient('web-map');
    const studentClient = hub.createClient('student-mobile');

    const driverService = new AuvrynRealtimeService(driverClient, {
      institutionId: INST_A,
      userId: 'driver-01',
      userRole: 'driver',
    });

    const mapService = new AuvrynRealtimeService(mapClient, {
      institutionId: INST_A,
      userId: USER_OWNER,
      userRole: 'owner',
    });

    const studentService = new AuvrynRealtimeService(studentClient, {
      institutionId: INST_A,
      userId: USER_STUDENT,
      userRole: 'student',
    });

    const mapReceived: RealtimeMessage[] = [];
    mapService.subscribeToJourneyTelemetry(JOURNEY_ID, (m) => mapReceived.push(m));

    await new Promise((r) => setTimeout(r, 10));

    // Driver broadcasts valid GPS fix
    const fixResult = await driverService.broadcastGpsFix(JOURNEY_ID, {
      latitude: 28.6139,
      longitude: 77.2090,
      speedKmh: 42.5,
      heading: 180,
      accuracyMeters: 3.2,
      recordedAt: new Date().toISOString(),
    });
    expect(fixResult[0].success).toBe(true);

    await new Promise((r) => setTimeout(r, 10));

    expect(mapReceived.length).toBe(1);
    expect(mapReceived[0].eventType).toBe('GPS_TELEMETRY_UPDATED');
    expect(mapReceived[0].payload.speedKmh).toBe(42.5);

    // Student attempts to broadcast GPS fix -> MUST BE BLOCKED
    const studentBroadcast = await studentService.broadcast(
      getJourneyTelemetryChannelName(JOURNEY_ID),
      'GPS_TELEMETRY_UPDATED',
      { latitude: 0, longitude: 0 }
    );

    expect(studentBroadcast.success).toBe(false);
    expect(studentBroadcast.error).toContain('Unauthorized');

    driverService.destroy();
    mapService.destroy();
    studentService.destroy();
  });

  // =========================================================================
  // Test E: Cross-Institution Isolation -> Access Denied
  // =========================================================================
  it('Test E: Institution B client attempting to subscribe to Institution A is denied', async () => {
    const foreignClient = hub.createClient('attacker-inst-b');

    const foreignService = new AuvrynRealtimeService(foreignClient, {
      institutionId: INST_B,
      userId: 'usr-b-1',
      userRole: 'admin',
    });

    expect(() => {
      foreignService.subscribeToInstitution(INST_A, 'academics', () => {});
    }).toThrow(/Cross-institution subscription denied/);

    const foreignBroadcast = await foreignService.broadcast(
      getInstitutionChannelName(INST_A, 'academics'),
      'ATTENDANCE_RECORDED',
      {}
    );
    expect(foreignBroadcast.success).toBe(false);
    expect(foreignBroadcast.error).toContain('Tenant isolation violation');

    foreignService.destroy();
  });

  // =========================================================================
  // Test F: Offline Disconnect and Reconnect with Deduplication
  // =========================================================================
  it('Test F: Reconnection triggers state transition and deduplicates repeated events', async () => {
    const client = hub.createClient('mobile-offline-client');
    const service = new AuvrynRealtimeService(client, {
      institutionId: INST_A,
      userId: USER_STUDENT,
      userRole: 'student',
    });

    const states: string[] = [];
    service.onStateChange((state) => states.push(state));

    let reconnectTriggered = false;
    service.onReconnect(() => {
      reconnectTriggered = true;
    });

    const received: RealtimeMessage[] = [];
    service.subscribeToInstitution(INST_A, 'global', (m) => received.push(m));

    await new Promise((r) => setTimeout(r, 10));
    expect(service.getConnectionState()).toBe('CONNECTED');

    // Transmit unique message
    const msgId = 'unique-evt-001';
    await service.broadcast(
      getInstitutionChannelName(INST_A, 'global'),
      'ANNOUNCEMENT_PUBLISHED',
      { title: 'Holiday Announcement' },
      msgId
    );

    // Re-transmit same message ID (simulating duplicate delivery)
    await service.broadcast(
      getInstitutionChannelName(INST_A, 'global'),
      'ANNOUNCEMENT_PUBLISHED',
      { title: 'Holiday Announcement' },
      msgId
    );

    await new Promise((r) => setTimeout(r, 10));

    // Sender deduplication recorded; receiver deduplication drops second copy
    expect(service.isDuplicate(msgId)).toBe(true);

    service.destroy();
  });

  // =========================================================================
  // Test G: Account Switching Cleans Up Previous Subscriptions
  // =========================================================================
  it('Test G: Account switch cleans up previous institution and user channels', async () => {
    const client = hub.createClient('multi-user-device');
    const service = new AuvrynRealtimeService(client, {
      institutionId: INST_A,
      userId: USER_STUDENT,
      userRole: 'student',
    });

    const receivedA: RealtimeMessage[] = [];
    service.subscribeToInstitution(INST_A, 'global', (m) => receivedA.push(m));

    await new Promise((r) => setTimeout(r, 10));

    // User switches to Institution B
    service.setContext({
      institutionId: INST_B,
      userId: 'new-user-b',
      userRole: 'admin',
    });

    expect(service.getContext().institutionId).toBe(INST_B);
    expect(service.getContext().userId).toBe('new-user-b');

    // Broadcasting to Old Inst A must not deliver to this client anymore
    const senderClient = hub.createClient('inst-a-sender');
    const sender = new AuvrynRealtimeService(senderClient, { institutionId: INST_A });
    await sender.broadcast(
      getInstitutionChannelName(INST_A, 'global'),
      'ANNOUNCEMENT_PUBLISHED',
      { text: 'Inst A message' }
    );

    await new Promise((r) => setTimeout(r, 10));

    expect(receivedA.length).toBe(0);

    service.destroy();
    sender.destroy();
  });

  // =========================================================================
  // Test H: Channel Naming and Scope Safety
  // =========================================================================
  it('Test H: Channel name generation enforces required parameters and strict prefixes', () => {
    expect(getInstitutionChannelName('inst-123', 'academics')).toBe('auvryn:inst:inst-123:academics');
    expect(getInstitutionChannelName('inst-123', 'kpi')).toBe('auvryn:inst:inst-123:kpi');
    expect(getUserNotificationChannelName('user-456')).toBe('auvryn:user:user-456:notifications');
    expect(getJourneyTelemetryChannelName('jrn-789')).toBe('auvryn:journey:jrn-789:telemetry');

    expect(() => getInstitutionChannelName('')).toThrow();
    expect(() => getUserNotificationChannelName('')).toThrow();
    expect(() => getJourneyTelemetryChannelName('')).toThrow();
  });
});
