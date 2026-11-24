import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { NotificationOutboxWorker } from '@/lib/notifications/worker';
import { acquireNotificationLock, releaseNotificationLock } from '@/lib/cron/concurrency';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Serverless Function

/**
 * Scheduled and external webhook notification outbox runner.
 * Invoked by external schedulers (GitHub Actions, cron-job.org, Upstash) or internal triggers.
 *
 * Security:
 * - Requires Authorization: Bearer <CRON_SECRET> header.
 * - Requires server-side SUPABASE_SERVICE_ROLE_KEY.
 * - Concurrency protection: in-process mutex + database row-level FOR UPDATE SKIP LOCKED.
 * - Zero secret or PII leakage in responses or logs.
 */
async function processNotificationCron(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;

  // 1. Authenticate the cron trigger
  if (!cronSecret) {
    return NextResponse.json(
      { error: 'Server misconfiguration: CRON_SECRET is not configured' },
      { status: 500 }
    );
  }

  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json(
      { error: 'Unauthorized: Invalid or missing authorization token' },
      { status: 401 }
    );
  }

  // 2. Validate Service Role Key presence
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for worker operations' },
      { status: 500 }
    );
  }

  // 3. Container-level concurrency locking
  const lock = acquireNotificationLock();
  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      status: 'skipped_overlapping_run',
      message: 'Notification outbox worker is already processing in another concurrent request.',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }

  const startedAt = Date.now();

  try {
    // 4. Resolve batch size from query params or body
    let batchSize = 50;
    const url = new URL(req.url);
    const queryBatchSize = url.searchParams.get('batchSize');
    if (queryBatchSize) {
      const parsed = parseInt(queryBatchSize, 10);
      if (!isNaN(parsed) && parsed > 0) {
        batchSize = Math.min(Math.max(parsed, 1), 100);
      }
    } else if (req.method === 'POST') {
      try {
        const body = await req.json().catch(() => null);
        if (body && typeof body.batchSize === 'number' && body.batchSize > 0) {
          batchSize = Math.min(Math.max(Math.floor(body.batchSize), 1), 100);
        }
      } catch {
        // Fall back to default batch size on JSON parse failure
      }
    }

    const adminClient = createAdminClient() as any;
    const worker = new NotificationOutboxWorker({
      batchSize,
      lockTimeoutInterval: '5 minutes',
      dispatchTimeoutMs: 5000,
    });

    const result = await worker.processBatch(adminClient);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      workerId: worker.workerId,
      batchSize,
      durationMs: Date.now() - startedAt,
      claimedCount: result.claimedCount,
      successCount: result.successCount,
      transientFailedCount: result.transientFailedCount,
      deadLetterCount: result.deadLetterCount,
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown worker execution failure';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  } finally {
    releaseNotificationLock();
  }
}

export async function GET(req: NextRequest) {
  return processNotificationCron(req);
}

export async function POST(req: NextRequest) {
  return processNotificationCron(req);
}
