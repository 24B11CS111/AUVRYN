import type {
  NotificationJob,
  DeliveryResult,
  NotificationDeliveryAdapter,
  WorkerBatchResult,
} from './types';
import {
  EmailDeliveryAdapter,
  SmsDeliveryAdapter,
  PushDeliveryAdapter,
} from './adapters';
import type { NotificationChannel, NotificationDeliveryStatus } from '@edu-platform/types';

export interface WorkerOptions {
  workerId?: string;
  batchSize?: number;
  lockTimeoutInterval?: string;
  dispatchTimeoutMs?: number;
}

export class NotificationOutboxWorker {
  readonly workerId: string;
  readonly batchSize: number;
  readonly lockTimeoutInterval: string;
  readonly dispatchTimeoutMs: number;
  private adapters: Map<NotificationChannel, NotificationDeliveryAdapter> = new Map();

  constructor(options: WorkerOptions = {}) {
    this.workerId = options.workerId || `worker-${Math.random().toString(36).substring(2, 9)}`;
    this.batchSize = options.batchSize || 25;
    this.lockTimeoutInterval = options.lockTimeoutInterval || '5 minutes';
    this.dispatchTimeoutMs = options.dispatchTimeoutMs || 5000;

    // Register default production-ready adapters
    this.registerAdapter('email', new EmailDeliveryAdapter());
    this.registerAdapter('sms', new SmsDeliveryAdapter());
    this.registerAdapter('push', new PushDeliveryAdapter());
  }

  /**
   * Registers or overrides a channel's delivery adapter (useful for mocking in tests)
   */
  registerAdapter(channel: NotificationChannel, adapter: NotificationDeliveryAdapter) {
    this.adapters.set(channel, adapter);
  }

  /**
   * Executes a single processing cycle on the outbox queue:
   * 1. Atomically claims available jobs with FOR UPDATE SKIP LOCKED
   * 2. Verifies recipient authorization and institution membership boundaries
   * 3. Resolves destinations and invokes the appropriate channel adapter
   * 4. Records atomic delivery resolution and non-PII audit trail
   */
  async processBatch(supabase: any): Promise<WorkerBatchResult> {
    const summary: WorkerBatchResult = {
      claimedCount: 0,
      successCount: 0,
      transientFailedCount: 0,
      deadLetterCount: 0,
      results: [],
    };

    // 1. Claim batch of jobs via stored procedure
    const { data: rawJobs, error: claimError } = await supabase.rpc(
      'claim_notification_deliveries',
      {
        p_batch_size: this.batchSize,
        p_worker_id: this.workerId,
        p_lock_timeout: this.lockTimeoutInterval,
      }
    );

    if (claimError || !rawJobs || !Array.isArray(rawJobs)) {
      return summary;
    }

    summary.claimedCount = rawJobs.length;

    for (const raw of rawJobs) {
      const job: NotificationJob = {
        deliveryId: raw.out_delivery_id || raw.delivery_id,
        institutionId: raw.out_institution_id || raw.institution_id,
        notificationId: raw.out_notification_id || raw.notification_id,
        channel: raw.out_channel || raw.channel,
        destination: raw.out_destination || raw.destination,
        status: raw.out_status || raw.status,
        attemptsCount: raw.out_attempts_count || raw.attempts_count,
        maxAttempts: raw.out_max_attempts || raw.max_attempts,
        idempotencyKey: raw.out_idempotency_key || raw.idempotency_key,
        recipientUserId: raw.out_recipient_user_id || raw.recipient_user_id,
        recipientEmail: raw.out_recipient_email || raw.recipient_email,
        recipientPhone: raw.out_recipient_phone || raw.recipient_phone,
        title: raw.out_title || raw.title,
        body: raw.out_body || raw.body,
        category: raw.out_category || raw.category,
        priority: raw.out_priority || raw.priority,
        notificationData: raw.out_notification_data || raw.notification_data,
      };

      let result: DeliveryResult;

      // 2. Step 1: Authorization & Institutional Boundary Verification
      // Ensure the recipient is an active member of this institution
      if (job.recipientUserId) {
        const { data: membership, error: memError } = await supabase
          .from('institution_memberships')
          .select('id, status')
          .eq('institution_id', job.institutionId)
          .eq('user_id', job.recipientUserId)
          .eq('status', 'active')
          .maybeSingle();

        if (memError || !membership) {
          result = {
            success: false,
            provider: 'security-guard',
            errorCode: 'UNAUTHORIZED_RECIPIENT',
            errorMessage: 'Recipient has no active membership in target institution.',
            isPermanentFailure: true,
            latencyMs: 5,
          };

          await this.resolveDelivery(supabase, job, result);
          summary.deadLetterCount++;
          summary.results.push({
            deliveryId: job.deliveryId,
            channel: job.channel,
            status: 'dead_letter',
            provider: result.provider,
            error: result.errorMessage,
          });
          continue;
        }
      }

      // 3. Step 2: Resolve Destination if not preset
      let destination = job.destination;
      if (!destination) {
        if (job.channel === 'email') {
          destination = job.recipientEmail || null;
        } else if (job.channel === 'sms' || job.channel === 'whatsapp') {
          destination = job.recipientPhone || null;
        } else if (job.channel === 'push' && job.recipientUserId) {
          // Resolve push token
          const { data: tokenRecord } = await supabase
            .from('push_device_tokens')
            .select('token')
            .eq('user_id', job.recipientUserId)
            .eq('is_active', true)
            .order('last_used_at', { ascending: false })
            .limit(1)
            .maybeSingle();

          destination = tokenRecord?.token || null;
        }
      }

      const resolvedJob: NotificationJob = {
        ...job,
        destination,
      };

      if (!resolvedJob.destination && job.channel !== 'in_app') {
        result = {
          success: false,
          provider: 'resolver',
          errorCode: 'MISSING_DESTINATION',
          errorMessage: `No valid recipient contact address resolved for ${job.channel}.`,
          isPermanentFailure: true,
          latencyMs: 5,
        };

        await this.resolveDelivery(supabase, resolvedJob, result);
        summary.deadLetterCount++;
        summary.results.push({
          deliveryId: job.deliveryId,
          channel: job.channel,
          status: 'dead_letter',
          provider: result.provider,
          error: result.errorMessage,
        });
        continue;
      }

      // In-app notifications do not require external network dispatch
      if (job.channel === 'in_app') {
        result = {
          success: true,
          provider: 'internal_db',
          providerMessageId: `in_app_${job.notificationId}`,
          providerResponse: { delivered: true },
          latencyMs: 2,
        };
      } else {
        // 4. Step 3: Invoke Adapter
        const adapter = this.adapters.get(job.channel);
        if (!adapter) {
          result = {
            success: false,
            provider: 'dispatcher',
            errorCode: 'NO_ADAPTER',
            errorMessage: `No delivery adapter configured for channel "${job.channel}".`,
            isPermanentFailure: true,
            latencyMs: 1,
          };
        } else {
          result = await adapter.send(resolvedJob, this.dispatchTimeoutMs);
        }
      }

      // 5. Step 4: Record Atomic Resolution
      const resolvedStatus = await this.resolveDelivery(supabase, resolvedJob, result);

      if (result.success) {
        summary.successCount++;
      } else if (resolvedStatus === 'dead_letter') {
        summary.deadLetterCount++;
      } else {
        summary.transientFailedCount++;
      }

      summary.results.push({
        deliveryId: job.deliveryId,
        channel: job.channel,
        status: resolvedStatus,
        provider: result.provider,
        error: result.errorMessage,
      });
    }

    return summary;
  }

  private async resolveDelivery(
    supabase: any,
    job: NotificationJob,
    result: DeliveryResult
  ): Promise<NotificationDeliveryStatus> {
    const { data: res } = await supabase.rpc('resolve_notification_delivery', {
      p_delivery_id: job.deliveryId,
      p_status: result.success ? 'delivered' : 'failed',
      p_provider: result.provider,
      p_provider_message_id: result.providerMessageId || null,
      p_provider_response: result.providerResponse || {},
      p_error_code: result.errorCode || null,
      p_error_message: result.errorMessage || null,
      p_is_permanent_failure: result.isPermanentFailure || false,
      p_latency_ms: result.latencyMs,
    });

    return (res?.status as NotificationDeliveryStatus) || (result.success ? 'delivered' : 'failed');
  }
}
