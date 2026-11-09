import type { NotificationDeliveryStatus, NotificationChannel, NotificationPriority } from '@edu-platform/types';

export interface NotificationJob {
  deliveryId: string;
  institutionId: string;
  notificationId: string;
  channel: NotificationChannel;
  destination: string | null;
  status: NotificationDeliveryStatus;
  attemptsCount: number;
  maxAttempts: number;
  idempotencyKey?: string | null;
  recipientUserId?: string | null;
  recipientEmail?: string | null;
  recipientPhone?: string | null;
  title: string;
  body: string;
  category: string;
  priority: NotificationPriority;
  notificationData?: Record<string, unknown>;
}

export interface DeliveryResult {
  success: boolean;
  provider: string;
  providerMessageId?: string;
  providerResponse?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  isPermanentFailure?: boolean;
  latencyMs: number;
}

export interface NotificationDeliveryAdapter {
  channel: NotificationChannel;
  providerName: string;
  send(job: NotificationJob, timeoutMs?: number): Promise<DeliveryResult>;
}

export interface WorkerBatchResult {
  claimedCount: number;
  successCount: number;
  transientFailedCount: number;
  deadLetterCount: number;
  results: Array<{
    deliveryId: string;
    channel: NotificationChannel;
    status: NotificationDeliveryStatus;
    provider: string;
    error?: string;
  }>;
}

export interface OutboxMetrics {
  institutionId: string;
  countQueued: number;
  countPending: number;
  countProcessing: number;
  countDelivered: number;
  countFailed: number;
  countDeadLetter: number;
  oldestPendingJobAt?: string | null;
  totalDeliveries: number;
}
