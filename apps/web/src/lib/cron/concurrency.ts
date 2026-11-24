/**
 * Serverless container-level execution guard to avoid overlapping cron execution
 * on the same warm container instance.
 */

let isNotificationProcessing = false;
let notificationStartedAt = 0;

let isDailyProcessing = false;
let dailyStartedAt = 0;

const CONCURRENCY_LOCK_TIMEOUT_MS = 60000;

export function acquireNotificationLock(): { acquired: boolean; durationMs: number } {
  const now = Date.now();
  if (isNotificationProcessing && (now - notificationStartedAt) < CONCURRENCY_LOCK_TIMEOUT_MS) {
    return { acquired: false, durationMs: now - notificationStartedAt };
  }
  isNotificationProcessing = true;
  notificationStartedAt = now;
  return { acquired: true, durationMs: 0 };
}

export function releaseNotificationLock() {
  isNotificationProcessing = false;
}

export function resetNotificationLockForTesting() {
  isNotificationProcessing = false;
  notificationStartedAt = 0;
}

export function acquireDailyLock(): { acquired: boolean; durationMs: number } {
  const now = Date.now();
  if (isDailyProcessing && (now - dailyStartedAt) < CONCURRENCY_LOCK_TIMEOUT_MS) {
    return { acquired: false, durationMs: now - dailyStartedAt };
  }
  isDailyProcessing = true;
  dailyStartedAt = now;
  return { acquired: true, durationMs: 0 };
}

export function releaseDailyLock() {
  isDailyProcessing = false;
}

export function resetDailyLockForTesting() {
  isDailyProcessing = false;
  dailyStartedAt = 0;
}
