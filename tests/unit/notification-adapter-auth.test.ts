import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { PushDeliveryAdapter } from '../../apps/web/src/lib/notifications/adapters';
import { NotificationOutboxWorker } from '../../apps/web/src/lib/notifications/worker';
import type { NotificationJob } from '../../apps/web/src/lib/notifications/types';

describe('Expo Push Service Authentication & Connectivity Verification', () => {
  const originalEnv = process.env.EXPO_ACCESS_TOKEN;
  let adapter: PushDeliveryAdapter;

  const sampleJob: NotificationJob = {
    deliveryId: '11111111-2222-3333-4444-555555555555',
    notificationId: 'notif-12345678-0000-0000-0000-000000000001',
    institutionId: 'inst-test-0001',
    recipientUserId: 'user-guardian-001',
    channel: 'push',
    destination: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
    title: 'Attendance Notice',
    body: 'Your student was marked absent today.',
    priority: 'urgent',
    attemptsCount: 0,
    notificationData: { studentId: 'student-001', date: '2026-11-15' },
  };

  beforeEach(() => {
    vi.restoreAllMocks();
    adapter = new PushDeliveryAdapter();
    delete process.env.EXPO_ACCESS_TOKEN;
  });

  afterEach(() => {
    if (originalEnv !== undefined) {
      process.env.EXPO_ACCESS_TOKEN = originalEnv;
    } else {
      delete process.env.EXPO_ACCESS_TOKEN;
    }
    vi.restoreAllMocks();
  });

  describe('1. Unconfigured State (Fallback Mode)', () => {
    it('safely falls back to mock-expo-push when EXPO_ACCESS_TOKEN is missing', async () => {
      delete process.env.EXPO_ACCESS_TOKEN;

      const result = await adapter.send(sampleJob);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('mock-expo-push');
      expect(result.providerMessageId).toContain('mock_push_11111111');
      expect(result.providerResponse).toMatchObject({
        status: 'ok',
        destination: sampleJob.destination,
        simulated: true,
      });
    });

    it('safely falls back to mock-expo-push when EXPO_ACCESS_TOKEN is whitespace only', async () => {
      process.env.EXPO_ACCESS_TOKEN = '   ';

      const result = await adapter.send(sampleJob);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('mock-expo-push');
    });

    it('verifyConnectivity returns unconfigured status when token is missing', async () => {
      delete process.env.EXPO_ACCESS_TOKEN;

      const status = await adapter.verifyConnectivity();

      expect(status.configured).toBe(false);
      expect(status.authenticated).toBe(false);
      expect(status.provider).toBe('mock-expo-push');
      expect(status.message).toContain('not configured');
    });
  });

  describe('2. Configured State (Live Provider Selection)', () => {
    it('selects expo-push provider instead of mock-expo-push when token is configured', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'secret_expo_token_xyz_123';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ status: 'ok', id: 'ticket_live_push_9999' }],
        }),
      } as any);

      const result = await adapter.send(sampleJob);

      expect(result.success).toBe(true);
      expect(result.provider).toBe('expo-push');
      expect(result.provider).not.toBe('mock-expo-push');
      expect(result.providerMessageId).toBe('ticket_live_push_9999');

      // Verify outbound request details
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, requestInit] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://exp.host/--/api/v2/push/send');

      const headers = requestInit?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer secret_expo_token_xyz_123');
      expect(headers['Content-Type']).toBe('application/json');
      expect(headers['Accept']).toBe('application/json');

      const body = JSON.parse(requestInit?.body as string);
      expect(body.to).toBe(sampleJob.destination);
      expect(body.title).toBe(sampleJob.title);
      expect(body.body).toBe(sampleJob.body);
      expect(body.priority).toBe('high');
      expect(body.data).toEqual(sampleJob.notificationData);
    });

    it('handles device unregistration as permanent failure under expo-push', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'secret_expo_token_xyz_123';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{
            status: 'error',
            message: 'The recipient device is no longer registered.',
            details: { error: 'DeviceNotRegistered' },
          }],
        }),
      } as any);

      const result = await adapter.send(sampleJob);

      expect(result.success).toBe(false);
      expect(result.provider).toBe('expo-push');
      expect(result.errorCode).toBe('DeviceNotRegistered');
      expect(result.isPermanentFailure).toBe(true);
    });

    it('classifies 401 Unauthorized as permanent failure and prevents indefinite retries', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'revoked_or_invalid_token';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          errors: [{ message: 'The provided authorization token is invalid' }],
        }),
      } as any);

      const result = await adapter.send(sampleJob);

      expect(result.success).toBe(false);
      expect(result.provider).toBe('expo-push');
      expect(result.errorCode).toBe('HTTP_401');
      expect(result.isPermanentFailure).toBe(true);
      expect(result.errorMessage).toContain('invalid');
    });

    it('classifies 403 Forbidden as permanent failure to halt retry loops immediately', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'forbidden_token';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 403,
        json: async () => ({
          errors: [{ message: 'Access forbidden for project scope' }],
        }),
      } as any);

      const result = await adapter.send(sampleJob);

      expect(result.success).toBe(false);
      expect(result.provider).toBe('expo-push');
      expect(result.errorCode).toBe('HTTP_403');
      expect(result.isPermanentFailure).toBe(true);
    });
  });

  describe('3. Safe Provider Connectivity Test (Zero Notifications to Real Users)', () => {
    it('verifies Expo Push credentials via receipt probe without dispatching any messages', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'valid_expo_access_token_abc';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ data: {} }),
      } as any);

      const status = await adapter.verifyConnectivity();

      expect(status.configured).toBe(true);
      expect(status.authenticated).toBe(true);
      expect(status.provider).toBe('expo-push');
      expect(status.status).toBe(200);
      expect(status.message).toContain('verified successfully');

      // Verify the probe targeted getReceipts, NOT push/send
      expect(fetchSpy).toHaveBeenCalledTimes(1);
      const [url, requestInit] = fetchSpy.mock.calls[0];
      expect(url).toBe('https://exp.host/--/api/v2/push/getReceipts');

      const headers = requestInit?.headers as Record<string, string>;
      expect(headers['Authorization']).toBe('Bearer valid_expo_access_token_abc');
      expect(headers['Content-Type']).toBe('application/json');

      const body = JSON.parse(requestInit?.body as string);
      expect(body.ids).toBeDefined();
      expect(body.ids).toHaveLength(1);
      // Ensures no recipient tokens are in the probe
      expect((body as any).to).toBeUndefined();
    });

    it('detects 401 Unauthorized when token is rejected by Expo', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'invalid_or_expired_token';

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          errors: [{ code: 'UNAUTHORIZED', message: 'Invalid or expired access token' }],
        }),
      } as any);

      const status = await adapter.verifyConnectivity();

      expect(status.configured).toBe(true);
      expect(status.authenticated).toBe(false);
      expect(status.provider).toBe('expo-push');
      expect(status.status).toBe(401);
      expect(status.message).toContain('Authentication failed');
    });

    it('detects network or timeout failures gracefully during connectivity probe', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'valid_expo_access_token_abc';

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      vi.spyOn(globalThis, 'fetch').mockRejectedValueOnce(abortError);

      const status = await adapter.verifyConnectivity(100);

      expect(status.configured).toBe(true);
      expect(status.authenticated).toBe(false);
      expect(status.status).toBe(408);
      expect(status.message).toContain('timed out');
    });
  });

  describe('4. Worker Integration Provider Selection', () => {
    it('NotificationOutboxWorker instantiates PushDeliveryAdapter that selects expo-push when token is configured', async () => {
      process.env.EXPO_ACCESS_TOKEN = 'worker_test_token_123';

      const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          data: [{ status: 'ok', id: 'ticket_worker_push_123' }],
        }),
      } as any);

      const worker = new NotificationOutboxWorker();

      // Mock database returning 1 push job
      const mockSupabase = {
        rpc: vi.fn().mockResolvedValue({
          data: [{
            out_delivery_id: 'del-001',
            out_notification_id: 'notif-001',
            out_institution_id: 'inst-001',
            out_recipient_user_id: 'user-001',
            out_channel: 'push',
            out_destination: 'ExponentPushToken[user001]',
            out_title: 'Notice',
            out_body: 'Class alert',
            out_status: 'processing',
            out_attempts_count: 0,
            out_idempotency_key: 'idemp-001',
            out_notification_data: {},
          }],
          error: null,
        }),
        from: vi.fn((table: string) => {
          if (table === 'institution_memberships') {
            return {
              select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  eq: vi.fn().mockReturnValue({
                    eq: vi.fn().mockReturnValue({
                      maybeSingle: vi.fn().mockResolvedValue({
                        data: { id: 'mem-001', status: 'active' },
                        error: null,
                      }),
                    }),
                  }),
                }),
              }),
            };
          }
          if (table === 'notification_deliveries') {
            return {
              update: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  select: vi.fn().mockResolvedValue({ data: [], error: null }),
                }),
              }),
            };
          }
          if (table === 'notification_delivery_audit') {
            return {
              insert: vi.fn().mockResolvedValue({ data: [], error: null }),
            };
          }
          return {};
        }),
      };

      const result = await worker.processBatch(mockSupabase as any);

      expect(result.claimedCount).toBe(1);
      expect(result.successCount).toBe(1);
      expect(result.results[0].provider).toBe('expo-push');
      expect(result.results[0].provider).not.toBe('mock-expo-push');
      expect(fetchSpy).toHaveBeenCalled();
    });
  });

  describe('5. Credential Leak Protection', () => {
    it('never prints, returns, or leaks the token in DeliveryResult or audit fields', async () => {
      const secretToken = 'super_secret_expo_key_99999_never_leak';
      process.env.EXPO_ACCESS_TOKEN = secretToken;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({
          errors: [{ message: 'Malformed payload' }],
        }),
      } as any);

      const result = await adapter.send(sampleJob);

      // Convert result to JSON string to ensure no nested properties contain the token
      const serialized = JSON.stringify(result);
      expect(serialized).not.toContain(secretToken);
    });

    it('never leaks token in verifyConnectivity output', async () => {
      const secretToken = 'super_secret_expo_key_99999_never_leak';
      process.env.EXPO_ACCESS_TOKEN = secretToken;

      vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
        ok: false,
        status: 401,
        json: async () => ({
          errors: [{ message: 'Unauthorized' }],
        }),
      } as any);

      const status = await adapter.verifyConnectivity();
      const serialized = JSON.stringify(status);
      expect(serialized).not.toContain(secretToken);
    });
  });
});
