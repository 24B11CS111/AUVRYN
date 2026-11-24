import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

const mockProcessBatch = vi.fn().mockResolvedValue({
  claimedCount: 5,
  successCount: 4,
  transientFailedCount: 1,
  deadLetterCount: 0,
  results: [],
});

vi.mock('@/lib/notifications/worker', () => ({
  NotificationOutboxWorker: vi.fn().mockImplementation((options) => ({
    workerId: 'mock-worker-test',
    batchSize: options?.batchSize || 50,
    processBatch: mockProcessBatch,
  })),
}));

import { GET, POST } from '../../apps/web/src/app/api/cron/notifications/route';
import { resetNotificationLockForTesting } from '../../apps/web/src/lib/cron/concurrency';

describe('Vercel Cron Notifications Route', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret-12345';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key-12345';
    resetNotificationLockForTesting();
    mockProcessBatch.mockClear();
  });

  afterEach(() => {
    resetNotificationLockForTesting();
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

  it('rejects request with 500 when CRON_SECRET is not configured on the server', async () => {
    delete process.env.CRON_SECRET;
    const req = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer some-token' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('CRON_SECRET is not configured');
  });

  it('rejects request with 401 when authorization header is missing or incorrect', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer wrong-secret' },
    });

    const res = await GET(req);
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body.error).toContain('Unauthorized');
  });

  it('rejects request with 500 when SUPABASE_SERVICE_ROLE_KEY is missing', async () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    const req = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });

    const res = await GET(req);
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toContain('SUPABASE_SERVICE_ROLE_KEY is required');
  });

  it('executes worker via GET and returns batch metrics when authenticated with correct Bearer token', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.claimedCount).toBe(5);
    expect(body.successCount).toBe(4);
    expect(body.transientFailedCount).toBe(1);
    expect(body.deadLetterCount).toBe(0);
    expect(body.batchSize).toBe(50);
  });

  it('executes worker via POST with custom batch size in JSON body', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/notifications', {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-cron-secret-12345',
        'content-type': 'application/json',
      },
      body: JSON.stringify({ batchSize: 25 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.batchSize).toBe(25);
    expect(mockProcessBatch).toHaveBeenCalledTimes(1);
  });

  it('supports custom batch size via query parameter', async () => {
    const req = new NextRequest('http://localhost:3000/api/cron/notifications?batchSize=15', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });

    const res = await GET(req);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.batchSize).toBe(15);
  });

  it('skips concurrent execution when a run is already in progress', async () => {
    // Simulate a slow-running batch
    let resolveFirstBatch: (value: any) => void;
    mockProcessBatch.mockImplementationOnce(() => new Promise((resolve) => {
      resolveFirstBatch = resolve;
    }));

    const req1 = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });
    const req2 = new NextRequest('http://localhost:3000/api/cron/notifications', {
      headers: { authorization: 'Bearer test-cron-secret-12345' },
    });

    // Fire first request (leaves lock active)
    const promise1 = GET(req1);

    // Fire second request immediately while first is in-flight
    const res2 = await GET(req2);
    expect(res2.status).toBe(200);
    const body2 = await res2.json();
    expect(body2.status).toBe('skipped_overlapping_run');

    // Resolve first batch
    resolveFirstBatch!({
      claimedCount: 2,
      successCount: 2,
      transientFailedCount: 0,
      deadLetterCount: 0,
    });
    const res1 = await promise1;
    expect(res1.status).toBe(200);
  });
});
