import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest } from 'next/server';

vi.mock('@/lib/supabase/server', () => ({
  createAdminClient: vi.fn().mockReturnValue({}),
}));

vi.mock('@/lib/notifications/worker', () => ({
  NotificationOutboxWorker: vi.fn().mockImplementation(() => ({
    workerId: 'mock-worker-test',
    processBatch: vi.fn().mockResolvedValue({
      claimedCount: 5,
      successCount: 4,
      transientFailedCount: 1,
      deadLetterCount: 0,
      results: [],
    }),
  })),
}));

import { GET } from '../../apps/web/src/app/api/cron/notifications/route';

describe('Vercel Cron Notifications Route', () => {
  const originalCronSecret = process.env.CRON_SECRET;
  const originalServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  beforeEach(() => {
    process.env.CRON_SECRET = 'test-cron-secret-12345';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-key-12345';
  });

  afterEach(() => {
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

  it('executes worker and returns batch metrics when authenticated with correct Bearer token', async () => {
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
  });
});
