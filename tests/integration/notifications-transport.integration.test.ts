import { describe, it, expect, beforeEach } from 'vitest';
import {
  FIXTURES,
  resetTestFixtures,
  executeAsServiceRole,
  queryAsServiceRole,
  mutateAsUser,
  queryAsUser,
} from './db';

describe('Integration Scenario E & F: Notifications & Transport Telemetry', () => {
  beforeEach(() => {
    resetTestFixtures();
  });

  describe('Scenario E: Notification Outbox Worker & Device Tokens', () => {
    it('service_role can claim queued notification deliveries atomically', () => {
      const notifId = 'a1000000-0000-0000-0000-000000000001';
      const deliveryId = 'b1000000-0000-0000-0000-000000000001';

      // Insert notification and delivery outbox row
      const insertNotif = executeAsServiceRole(`
        INSERT INTO public.notifications (
          id, institution_id, recipient_user_id, category, title, body
        ) VALUES (
          '${notifId}', '${FIXTURES.instAlpha}', '${FIXTURES.userCharlieStudent}',
          'general', 'Exam Schedule Released', 'Your exam schedule is now available.'
        );

        INSERT INTO public.notification_deliveries (
          id, institution_id, notification_id, channel, destination, status, idempotency_key
        ) VALUES (
          '${deliveryId}', '${FIXTURES.instAlpha}', '${notifId}',
          'email', 'charlie.student@alpha.edu', 'queued', 'idemp-notif-001'
        );
      `);
      expect(insertNotif.success).toBe(true);

      // Claim deliveries via worker RPC under service_role
      const claimRes = queryAsServiceRole<{ out_delivery_id: string; out_status: string }>(`
        SELECT out_delivery_id, out_status FROM public.claim_notification_deliveries(10, 'worker-inst-alpha-01', '5 minutes'::interval);
      `);

      expect(claimRes.error).toBeUndefined();
      expect(claimRes.rowCount).toBe(1);
      expect(claimRes.rows[0].out_delivery_id).toBe(deliveryId);
      expect(claimRes.rows[0].out_status).toBe('processing');

      // Verify delivery status changed to 'processing' and locked_by is set
      const checkRes = queryAsServiceRole<{ status: string; locked_by: string }>(`
        SELECT status, locked_by FROM public.notification_deliveries WHERE id = '${deliveryId}';
      `);
      expect(checkRes.rowCount).toBe(1);
      expect(checkRes.rows[0].status).toBe('processing');
      expect(checkRes.rows[0].locked_by).toBe('worker-inst-alpha-01');
    });

    it('service_role resolves notification deliveries with successful and retry/dead-letter transitions', () => {
      const notifId = 'a1000000-0000-0000-0000-000000000002';
      const delivSuccess = 'b1000000-0000-0000-0000-000000000002';
      const delivRetry = 'b1000000-0000-0000-0000-000000000003';
      const delivDeadLetter = 'b1000000-0000-0000-0000-000000000004';

      const prepRes = executeAsServiceRole(`
        INSERT INTO public.notifications (id, institution_id, recipient_user_id, category, title, body)
        VALUES ('${notifId}', '${FIXTURES.instAlpha}', '${FIXTURES.userCharlieStudent}', 'general', 'Notice', 'Test body');

        -- 1. Success target
        INSERT INTO public.notification_deliveries (
          id, institution_id, notification_id, channel, destination, status, idempotency_key, attempts_count
        ) VALUES ('${delivSuccess}', '${FIXTURES.instAlpha}', '${notifId}', 'email', 'c@alpha.edu', 'processing', 'idemp-002', 1);

        -- 2. Retry target (attempts 1 of 3)
        INSERT INTO public.notification_deliveries (
          id, institution_id, notification_id, channel, destination, status, idempotency_key, attempts_count, max_attempts
        ) VALUES ('${delivRetry}', '${FIXTURES.instAlpha}', '${notifId}', 'email', 'c@alpha.edu', 'processing', 'idemp-003', 1, 3);

        -- 3. Dead-letter target (permanent failure)
        INSERT INTO public.notification_deliveries (
          id, institution_id, notification_id, channel, destination, status, idempotency_key, attempts_count, max_attempts
        ) VALUES ('${delivDeadLetter}', '${FIXTURES.instAlpha}', '${notifId}', 'email', 'c@alpha.edu', 'processing', 'idemp-004', 2, 3);
      `);
      expect(prepRes.success).toBe(true);

      // 1. Resolve success
      const resSuccess = executeAsServiceRole(`
        SELECT public.resolve_notification_delivery(
          '${delivSuccess}'::uuid,
          'delivered',
          'mock_provider',
          'msg-ext-001',
          '{"status": 200}'::jsonb,
          NULL,
          NULL,
          false,
          120
        );
      `);
      expect(resSuccess.success).toBe(true);

      const checkSuccess = queryAsServiceRole<{ status: string; delivered_at: string }>(`
        SELECT status, delivered_at FROM public.notification_deliveries WHERE id = '${delivSuccess}';
      `);
      expect(checkSuccess.rowCount).toBe(1);
      expect(checkSuccess.rows[0].status).toBe('delivered');
      expect(checkSuccess.rows[0].delivered_at).toBeTruthy();

      // 2. Resolve transient retry
      const resRetry = executeAsServiceRole(`
        SELECT public.resolve_notification_delivery(
          '${delivRetry}'::uuid,
          'failed',
          'mock_provider',
          NULL,
          '{"status": 503}'::jsonb,
          'PROVIDER_UNAVAILABLE',
          'Upstream 503 Service Unavailable',
          false,
          50
        );
      `);
      expect(resRetry.success).toBe(true);

      const checkRetry = queryAsServiceRole<{ status: string; attempts_count: number; error_message: string }>(`
        SELECT status, attempts_count, error_message FROM public.notification_deliveries WHERE id = '${delivRetry}';
      `);
      expect(checkRetry.rowCount).toBe(1);
      expect(checkRetry.rows[0].status).toBe('failed');
      expect(checkRetry.rows[0].error_message).toContain('Upstream 503');

      // 3. Resolve permanent failure -> dead_letter
      const resDeadLetter = executeAsServiceRole(`
        SELECT public.resolve_notification_delivery(
          '${delivDeadLetter}'::uuid,
          'failed',
          'mock_provider',
          NULL,
          '{"status": 400}'::jsonb,
          'INVALID_RECIPIENT',
          'Recipient mailbox does not exist',
          true,
          35
        );
      `);
      expect(resDeadLetter.success).toBe(true);

      const checkDeadLetter = queryAsServiceRole<{ status: string; error_message: string }>(`
        SELECT status, error_message FROM public.notification_deliveries WHERE id = '${delivDeadLetter}';
      `);
      expect(checkDeadLetter.rowCount).toBe(1);
      expect(checkDeadLetter.rows[0].status).toBe('dead_letter');
      expect(checkDeadLetter.rows[0].error_message).toContain('Recipient mailbox does not exist');
    });

    it('ordinary authenticated users and anonymous users are blocked from executing worker RPCs', () => {
      // Bob is a teacher, cannot call claim_notification_deliveries
      const bobClaim = mutateAsUser({
        userId: FIXTURES.userBobTeacher,
        sql: `SELECT * FROM public.claim_notification_deliveries(10, 'rogue-worker', '5 minutes'::interval);`,
      });

      expect(bobClaim.success).toBe(false);
      expect(bobClaim.error).toMatch(/permission denied for function claim_notification_deliveries/i);

      // Bob cannot call resolve_notification_delivery
      const bobResolve = mutateAsUser({
        userId: FIXTURES.userBobTeacher,
        sql: `
          SELECT public.resolve_notification_delivery(
            'b1000000-0000-0000-0000-000000000002'::uuid, 'sent', 'rogue'
          );
        `,
      });

      expect(bobResolve.success).toBe(false);
      expect(bobResolve.error).toMatch(/permission denied for function resolve_notification_delivery/i);
    });

    it('push device tokens support atomic registration and safe account switching', () => {
      const sharedToken = 'ExponentPushToken[device-shared-xyz-123]';

      // Charlie registers shared device token
      const charlieReg = mutateAsUser({
        userId: FIXTURES.userCharlieStudent,
        sql: `
          SELECT public.register_push_device_token_atomic(
            '${sharedToken}', 'android', '2.5.0'
          );
        `,
      });

      expect(charlieReg.success).toBe(true);

      const checkCharlie = queryAsUser<{ user_id: string; token: string }>({
        userId: FIXTURES.userCharlieStudent,
        sql: `SELECT user_id, token FROM public.push_device_tokens WHERE token = '${sharedToken}';`,
      });
      expect(checkCharlie.rowCount).toBe(1);
      expect(checkCharlie.rows[0].user_id).toBe(FIXTURES.userCharlieStudent);

      // Guardian Grace logs into same device and re-registers token
      const graceReg = mutateAsUser({
        userId: FIXTURES.userGraceGuardian,
        sql: `
          SELECT public.register_push_device_token_atomic(
            '${sharedToken}', 'android', '2.5.0'
          );
        `,
      });

      expect(graceReg.success).toBe(true);

      // Verify token ownership safely transferred to Grace with exactly 1 row
      const checkGrace = queryAsServiceRole<{ user_id: string; token: string; is_active: boolean }>(`
        SELECT user_id, token, is_active FROM public.push_device_tokens WHERE token = '${sharedToken}';
      `);
      expect(checkGrace.rowCount).toBe(1);
      expect(checkGrace.rows[0].user_id).toBe(FIXTURES.userGraceGuardian);
      expect(checkGrace.rows[0].is_active).toBe(true);
    });
  });

  describe('Scenario F: Vehicle GPS Telemetry and Journey Authorization', () => {
    it('assigned driver (Henry) can submit valid GPS coordinates for an active journey', () => {
      const gpsRes = mutateAsUser({
        userId: FIXTURES.userHenryDriver,
        sql: `
          SELECT public.record_vehicle_gps_location_atomic(
            '${FIXTURES.instAlpha}'::uuid,
            '${FIXTURES.vehicleAlphaBus1}'::uuid,
            '${FIXTURES.journeyAlphaMorning}'::uuid,
            28.613939,
            77.209021,
            42.50,
            180.00,
            4.20,
            88.00,
            'driver_mobile_app'
          );
        `,
      });

      expect(gpsRes.success).toBe(true);
      expect(gpsRes.output).toContain('"success": true');

      // Verify vehicle_live_locations has been updated
      const liveRes = queryAsServiceRole<{ latitude: number; longitude: number; speed_kmh: number }>(`
        SELECT latitude, longitude, speed_kmh FROM public.vehicle_live_locations
        WHERE vehicle_id = '${FIXTURES.vehicleAlphaBus1}';
      `);
      expect(liveRes.rowCount).toBe(1);
      expect(Number(liveRes.rows[0].latitude)).toBeCloseTo(28.613939, 4);
      expect(Number(liveRes.rows[0].longitude)).toBeCloseTo(77.209021, 4);

      // Verify vehicle_location_history recorded the coordinate
      const histRes = queryAsServiceRole<{ latitude: number; longitude: number }>(`
        SELECT latitude, longitude FROM public.vehicle_location_history
        WHERE journey_id = '${FIXTURES.journeyAlphaMorning}';
      `);
      expect(histRes.rowCount).toBeGreaterThanOrEqual(1);
      expect(Number(histRes.rows[0].latitude)).toBeCloseTo(28.613939, 4);
    });

    it('cross-institution GPS submissions are strictly rejected', () => {
      // Driver Henry belongs to Alpha, attempts to submit GPS for Institution Beta's journey
      const res = mutateAsUser({
        userId: FIXTURES.userHenryDriver,
        sql: `
          SELECT public.record_vehicle_gps_location_atomic(
            '${FIXTURES.instBeta}'::uuid,
            '${FIXTURES.vehicleBetaBus1}'::uuid,
            '${FIXTURES.journeyBetaMorning}'::uuid,
            19.0760,
            72.8777
          );
        `,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Unauthorized: Caller .* is not an active member of institution/i);
    });

    it('unauthorized users (students and unrelated teachers) cannot submit GPS updates', () => {
      // Student Charlie attempts to spoof GPS
      const charlieRes = mutateAsUser({
        userId: FIXTURES.userCharlieStudent,
        sql: `
          SELECT public.record_vehicle_gps_location_atomic(
            '${FIXTURES.instAlpha}'::uuid,
            '${FIXTURES.vehicleAlphaBus1}'::uuid,
            '${FIXTURES.journeyAlphaMorning}'::uuid,
            28.6139,
            77.2090
          );
        `,
      });

      expect(charlieRes.success).toBe(false);
      expect(charlieRes.error).toMatch(/Unauthorized: Caller .* is not the assigned driver or attendant/i);

      // Teacher Bob attempts to submit GPS for the bus
      const bobRes = mutateAsUser({
        userId: FIXTURES.userBobTeacher,
        sql: `
          SELECT public.record_vehicle_gps_location_atomic(
            '${FIXTURES.instAlpha}'::uuid,
            '${FIXTURES.vehicleAlphaBus1}'::uuid,
            '${FIXTURES.journeyAlphaMorning}'::uuid,
            28.6139,
            77.2090
          );
        `,
      });

      expect(bobRes.success).toBe(false);
      expect(bobRes.error).toMatch(/Unauthorized: Caller .* is not the assigned driver or attendant/i);
    });

    it('GPS submissions for completed or inactive journeys are rejected', () => {
      // Driver Henry attempts to submit GPS for a journey that has completed
      const res = mutateAsUser({
        userId: FIXTURES.userHenryDriver,
        sql: `
          SELECT public.record_vehicle_gps_location_atomic(
            '${FIXTURES.instAlpha}'::uuid,
            '${FIXTURES.vehicleAlphaBus1}'::uuid,
            '${FIXTURES.journeyAlphaCompleted}'::uuid,
            28.6139,
            77.2090
          );
        `,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Location updates rejected: Journey .* is not in progress/i);
    });

    it('GPS submissions with vehicle mismatch are rejected', () => {
      // JourneyAlphaMorning is assigned vehicleAlphaBus1, attempt to submit with vehicleAlphaBus2
      const res = mutateAsUser({
        userId: FIXTURES.userHenryDriver,
        sql: `
          SELECT public.record_vehicle_gps_location_atomic(
            '${FIXTURES.instAlpha}'::uuid,
            '${FIXTURES.vehicleAlphaBus2}'::uuid,
            '${FIXTURES.journeyAlphaMorning}'::uuid,
            28.6139,
            77.2090
          );
        `,
      });

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/Vehicle .* is not assigned to journey/i);
    });
  });
});
