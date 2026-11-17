import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { NotificationOutboxWorker } from '@/lib/notifications/worker';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Serverless Function

/**
 * Scheduled notification outbox runner.
 * Invoked by Vercel Cron (or external orchestrator) with Bearer token authentication.
 *
 * Security:
 * - Requires Authorization: Bearer <CRON_SECRET> header.
 * - Requires server-side SUPABASE_SERVICE_ROLE_KEY.
 * - Zero secret leakage in responses or logs.
 */
export async function GET(req: NextRequest) {
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

  try {
    const adminClient = createAdminClient();
    const worker = new NotificationOutboxWorker({
      batchSize: 50,
      lockTimeoutInterval: '5 minutes',
      dispatchTimeoutMs: 5000,
    });

    const result = await worker.processBatch(adminClient);

    return NextResponse.json({
      ok: true,
      timestamp: new Date().toISOString(),
      workerId: worker.workerId,
      claimedCount: result.claimedCount,
      successCount: result.successCount,
      transientFailedCount: result.transientFailedCount,
      deadLetterCount: result.deadLetterCount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown worker execution failure';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
