import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { NotificationOutboxWorker } from '@/lib/notifications/worker';
import { fanoutAnnouncementNotifications } from '@/lib/notifications/fanout';
import { acquireDailyLock, releaseDailyLock } from '@/lib/cron/concurrency';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Max execution time for Vercel Serverless Function

/**
 * Daily Maintenance & Operations Cron Runner.
 * Triggered daily by Vercel Cron (schedule: "0 2 * * *") or authorized external orchestrators.
 *
 * Maintenance Tasks Executed:
 * 1. Publish Scheduled Announcements: Transitions status from 'scheduled' to 'published'
 *    for announcements where scheduled_for <= NOW(), and triggers notification fan-out.
 * 2. Reclaim Stale Delivery Locks: Recovers deliveries trapped in 'sending' or 'processing'
 *    state longer than 15 minutes, returning them to 'pending' for retry.
 * 3. Outbox Queue Backlog Processing: Executes an outbox batch worker cycle.
 *
 * Security:
 * - Requires Authorization: Bearer <CRON_SECRET> header.
 * - Requires server-side SUPABASE_SERVICE_ROLE_KEY.
 * - Concurrency protection: container-level mutex + row-level database locking.
 * - Zero PII or secret leakage in responses or logs.
 */
async function processDailyCron(req: NextRequest) {
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
      { error: 'Server misconfiguration: SUPABASE_SERVICE_ROLE_KEY is required for maintenance operations' },
      { status: 500 }
    );
  }

  // 3. Container-level concurrency locking
  const lock = acquireDailyLock();
  if (!lock.acquired) {
    return NextResponse.json({
      ok: true,
      status: 'skipped_overlapping_run',
      message: 'Daily maintenance cron is already processing in another concurrent request.',
      timestamp: new Date().toISOString(),
    }, { status: 200 });
  }

  const startedAt = Date.now();

  try {
    const adminClient = createAdminClient() as any;
    const nowIso = new Date().toISOString();

    // -------------------------------------------------------------------------
    // Task 1: Publish Scheduled Announcements
    // -------------------------------------------------------------------------
    let announcementsPublished = 0;
    let announcementErrors = 0;
    let scheduledFound = 0;

    const { data: scheduledAnnouncements, error: queryErr } = await adminClient
      .from('announcements')
      .select('id, institution_id, title, content, scope, target_role, target_entity_id, priority, scheduled_for')
      .eq('status', 'scheduled')
      .lte('scheduled_for', nowIso);

    if (!queryErr && scheduledAnnouncements && Array.isArray(scheduledAnnouncements)) {
      scheduledFound = scheduledAnnouncements.length;

      for (const ann of scheduledAnnouncements) {
        try {
          // Transition announcement to published
          const { error: updateErr } = await adminClient
            .from('announcements')
            .update({
              status: 'published',
              published_at: nowIso,
              updated_at: nowIso,
            })
            .eq('id', ann.id);

          if (updateErr) {
            announcementErrors++;
            continue;
          }

          // Fan out notifications to target recipients
          await fanoutAnnouncementNotifications(adminClient, {
            announcementId: ann.id,
            institutionId: ann.institution_id,
            scope: ann.scope,
            targetRoles: ann.target_role ? [ann.target_role] : [],
            targetClassId: ann.scope === 'class' ? ann.target_entity_id : null,
            targetSectionId: ann.scope === 'section' ? ann.target_entity_id : null,
            title: ann.title,
            body: ann.content ? ann.content.substring(0, 200) : 'An announcement has been published.',
            category: 'announcements',
            priority: ann.priority || 'normal',
          });

          announcementsPublished++;
        } catch {
          announcementErrors++;
        }
      }
    }

    // -------------------------------------------------------------------------
    // Task 2: Reclaim Stale In-Flight Delivery Locks (> 15 minutes)
    // -------------------------------------------------------------------------
    let staleLocksReclaimed = 0;
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000).toISOString();

    const { data: reclaimedRows, error: reclaimErr } = await adminClient
      .from('notification_deliveries')
      .update({
        status: 'pending',
        locked_by: null,
        locked_at: null,
        updated_at: nowIso,
      })
      .in('status', ['sending', 'processing'])
      .lt('locked_at', fifteenMinutesAgo)
      .select('id');

    if (!reclaimErr && reclaimedRows) {
      staleLocksReclaimed = reclaimedRows.length;
    }

    // -------------------------------------------------------------------------
    // Task 3: Outbox Queue Backlog Processing
    // -------------------------------------------------------------------------
    const worker = new NotificationOutboxWorker({
      batchSize: 50,
      lockTimeoutInterval: '5 minutes',
      dispatchTimeoutMs: 5000,
    });

    const outboxResult = await worker.processBatch(adminClient);

    return NextResponse.json({
      ok: true,
      timestamp: nowIso,
      durationMs: Date.now() - startedAt,
      tasks: {
        scheduledAnnouncements: {
          found: scheduledFound,
          published: announcementsPublished,
          errors: announcementErrors,
        },
        staleLocksReclaimed,
        outbox: {
          workerId: worker.workerId,
          claimedCount: outboxResult.claimedCount,
          successCount: outboxResult.successCount,
          transientFailedCount: outboxResult.transientFailedCount,
          deadLetterCount: outboxResult.deadLetterCount,
        },
      },
    }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown daily cron execution failure';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  } finally {
    releaseDailyLock();
  }
}

export async function GET(req: NextRequest) {
  return processDailyCron(req);
}

export async function POST(req: NextRequest) {
  return processDailyCron(req);
}
