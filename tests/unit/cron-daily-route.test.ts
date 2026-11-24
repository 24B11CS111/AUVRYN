import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

const mockFanout = vi.fn().mockResolvedValue({
  success: true,
  recipientCount: 10,
  notificationsCreated: 10,
  pushDeliveriesQueued: 5,
});

vi.mock('@/lib/notifications/fanout', () => ({
  fanoutAnnouncementNotifications: (...args: any[]) => mockFanout(...args),
}));

const mockProcessBatch = vi.fn().mockResolvedValue({
  claimedCount: 8,
  successCount: 8,
  transientFailedCount: 0,
  deadLetterCount: 0,
});

vi.mock('@/lib/notifications/worker', () => ({
  NotificationOutboxWorker: vi.fn().mockImplementation(() => ({
    workerId: 'mock-daily-worker',
    processBatch: mockProcessBatch,
  })),
}));

// Mock Supabase admin client
const mockSelect = vi.fn();
const mockUpdate = vi.fn();

const mockFrom = vi.fn((table: string) => {
  if (table === 'announcements') {
    return {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          lte: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'ann-1',
                institution_id: 'inst-1',
                title: 'Morning Assembly Update',
                content: 'Assembly will be in the main hall.',
                scope: 'institution',
                target_role: null,
                target_entity_id: null,
                priority: 'normal',
                scheduled_for: '2026-11-24T00:00:00Z',
              },
            ],
            error: null,
          }),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    };
  }

  if (table === 'notification_deliveries') {
    return {
      update: vi.fn().mockReturnValue({
        in: vi.fn().mockReturnValue({
          lt: vi.fn().mockReturnValue({
            select: vi.fn().mockResolvedValue({
              data: [{ id: 'del-stale-1' }, { id: 'del-stale-2' }],
              error: null,
            }),
          }),
        }),
      }),
    };
  }

  return {
    select: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
    update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) }),
  };
});

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn(() => ({
    from: mockFrom,
  })),
}));

import { GET, POST } from '../../apps/web/src/app/api/cron/daily/route';
import { resetDailyLockForTesting } from '../../apps/web/src/lib/cron/concurrency';

describe('Vercel Cron Daily Route', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-daily-secret-67890';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key-67890';
    resetDailyLockForTesting();
    mockFanout.mockClear();
    mockProcessBatch.mockClear();
    mockFrom.mockClear();
  });

  afterEach(() => {
    resetDailyLockForTesting();
    if (originalCronSecret !== undefined) {
      process.env.CRON_SECRET = originalCronSecret;
    } else {
      delete process.env.CRON_SECRET;
    }

    if (originalServiceKey !== undefined) {
      process.env.SUPABASE_SERVICE_ROLE_KEY = originalServiceKey;
    } else {
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    }
  });

  it('rejects request with 500 when CRON_SECRET is not configured', async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest('http://localhost:3000/api/cron/daily', {
      headers: { authorization: 'Bearer some-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('CRON_SECRET is not configured');
  });

  it('rejects request with 401 when authorization header is invalid', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('rejects request with 500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const req = new NextRequest('http://localhost:3000/api/cron/daily', {
      headers: { authorization: 'Bearer test-daily-secret-67890' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('SUPABASE_SERVICE_ROLE_KEY is required');
  });

  it('executes all daily maintenance tasks via GET and returns task metrics', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily', {
      headers: { authorization: 'Bearer test-daily-secret-67890' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();

    expect(body.ok).toBe(true);
    expect(body.tasks).toBeDefined();

    // Check scheduled announcements publishing
    expect(body.tasks.scheduledAnnouncements.found).toBe(1);
    expect(body.tasks.scheduledAnnouncements.published).toBe(1);
    expect(body.tasks.scheduledAnnouncements.errors).toBe(0);
    expect(mockFanout).toHaveBeenCalledTimes(1);

    // Check stale lock recovery
    expect(body.tasks.staleLocksReclaimed).toBe(2);

    // Check outbox worker processing
    expect(body.tasks.outbox.claimedCount).toBe(8);
    expect(body.tasks.outbox.successCount).toBe(8);
    expect(mockProcessBatch).toHaveBeenCalledTimes(1);
  });

  it('supports invocation via POST method', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/daily', {
      method: 'POST',
      headers: { authorization: 'Bearer test-daily-secret-67890' },
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(mockProcessBatch).toHaveBeenCalledTimes(1);
  });

  it('skips concurrent execution when a daily maintenance run is in progress', async () => {
    let resolveBatch: (value: any) => void;
    mockProcessBatch.mockImplementationOnce(() => new Promise((resolve) => {
      resolveBatch = resolve;
    }));

    const req1 = new NextRequest('http://localhost:3000/api/cron/daily', {
      headers: { authorization: 'Bearer test-daily-secret-67890' },
    });
    const req2 = new NextRequest('http://localhost:3000/api/cron/daily', {
      headers: { authorization: 'Bearer test-daily-secret-67890' },
    });

    const p1 = GET(req1);
    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.status).toBe('skipped_overlapping_run');

    resolveBatch!({ claimedCount: 0, successCount: 0, transientFailedCount: 0, deadLetterCount: 0 });
    const res1 = await p1;
    expect(res1.status).toBe(200);
  });
});
