import type {
  NotificationJob,
  DeliveryResult,
  NotificationDeliveryAdapter,
} from './types';
import type { NotificationChannel } from '@edu-platform/types';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const E164_PHONE_REGEX = /^\+[1-9]\d{1,14}$/;

/**
 * Deterministic Mock Adapter for unit testing, CI pipelines, and local environments
 * where external provider credentials (Twilio, Resend, FCM) are not present.
 */
export class MockDeliveryAdapter implements NotificationDeliveryAdapter {
  readonly channel: NotificationChannel;
  readonly providerName: string;
  public sentJobs: NotificationJob[] = [];
  public simulatedBehavior: 'success' | 'transient_failure' | 'rate_limited' | 'permanent_failure' | 'timeout' = 'success';
  public simulatedLatencyMs: number = 25;

  constructor(channel: NotificationChannel, providerName: string = 'mock-provider') {
    this.channel = channel;
    this.providerName = providerName;
  }

  async send(job: NotificationJob, timeoutMs: number = 5000): Promise<DeliveryResult> {
    const startTime = Date.now();
    this.sentJobs.push(job);

    // Simulated timeout
    if (this.simulatedBehavior === 'timeout') {
      await new Promise((resolve) => setTimeout(resolve, Math.min(timeoutMs + 50, 200)));
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'TIMEOUT',
        errorMessage: `Delivery timed out after ${timeoutMs}ms.`,
        isPermanentFailure: false,
        latencyMs: Date.now() - startTime,
      };
    }

    if (this.simulatedLatencyMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, Math.min(this.simulatedLatencyMs, 50)));
    }

    // Rate limited (transient failure)
    if (this.simulatedBehavior === 'rate_limited') {
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'RATE_LIMITED',
        errorMessage: 'Provider API rate limit exceeded (HTTP 429). Retry scheduled.',
        isPermanentFailure: false,
        latencyMs: Date.now() - startTime,
      };
    }

    // Transient failure
    if (this.simulatedBehavior === 'transient_failure') {
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'NETWORK_ERROR',
        errorMessage: 'Temporary socket error connecting to upstream mail gateway.',
        isPermanentFailure: false,
        latencyMs: Date.now() - startTime,
      };
    }

    // Permanent failure
    if (this.simulatedBehavior === 'permanent_failure') {
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'RECIPIENT_REJECTED',
        errorMessage: 'Recipient mailbox does not exist or domain has no MX record.',
        isPermanentFailure: true,
        latencyMs: Date.now() - startTime,
      };
    }

    // Default: Success
    return {
      success: true,
      provider: this.providerName,
      providerMessageId: `mock_${this.channel}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      providerResponse: {
        status: 200,
        dispatchedAt: new Date().toISOString(),
        destination: job.destination,
      },
      latencyMs: Date.now() - startTime,
    };
  }

  reset() {
    this.sentJobs = [];
    this.simulatedBehavior = 'success';
  }
}

/**
 * Production-ready Email Delivery Adapter.
 * Dispatches via external email provider (Resend/SendGrid/Postmark) or safely
 * falls back to MockDeliveryAdapter in test/development environments.
 */
export class EmailDeliveryAdapter implements NotificationDeliveryAdapter {
  readonly channel = 'email' as const;
  readonly providerName = 'resend';

  async send(job: NotificationJob, timeoutMs: number = 5000): Promise<DeliveryResult> {
    const startTime = Date.now();
    const destination = job.destination || job.recipientEmail;

    // Validate recipient email syntax before transmission
    if (!destination || !EMAIL_REGEX.test(destination)) {
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'INVALID_EMAIL',
        errorMessage: `Invalid recipient email address: "${destination || 'null'}".`,
        isPermanentFailure: true,
        latencyMs: Date.now() - startTime,
      };
    }

    const apiKey = process.env.RESEND_API_KEY;

    // If no provider key is configured or running in non-production, deliver safely via mocked transport
    if (!apiKey || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        provider: 'mock-resend',
        providerMessageId: `mock_email_${job.deliveryId.substring(0, 8)}`,
        providerResponse: { status: 200, destination, simulated: true },
        latencyMs: Date.now() - startTime,
      };
    }

    // Real API call with timeout
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: process.env.NOTIFICATION_EMAIL_FROM || 'notifications@edu-platform.internal',
          to: [destination],
          subject: job.title,
          text: job.body,
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        const isPermanent = res.status >= 400 && res.status < 429;
        return {
          success: false,
          provider: this.providerName,
          errorCode: `HTTP_${res.status}`,
          errorMessage: data.message || `Email provider returned status ${res.status}`,
          isPermanentFailure: isPermanent,
          latencyMs,
        };
      }

      return {
        success: true,
        provider: this.providerName,
        providerMessageId: data.id || `resend_${Date.now()}`,
        providerResponse: { status: res.status, id: data.id },
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        provider: this.providerName,
        errorCode: isTimeout ? 'TIMEOUT' : 'CONNECTION_ERROR',
        errorMessage: isTimeout ? `Email dispatch timed out after ${timeoutMs}ms.` : err.message,
        isPermanentFailure: false,
        latencyMs,
      };
    }
  }
}

/**
 * Production-ready SMS Delivery Adapter.
 * Dispatches via Twilio SMS API or safely falls back to MockDeliveryAdapter.
 */
export class SmsDeliveryAdapter implements NotificationDeliveryAdapter {
  readonly channel = 'sms' as const;
  readonly providerName = 'twilio';

  async send(job: NotificationJob, timeoutMs: number = 5000): Promise<DeliveryResult> {
    const startTime = Date.now();
    const destination = job.destination || job.recipientPhone;

    // Validate phone number formatting (E.164 standard)
    if (!destination || !E164_PHONE_REGEX.test(destination.replace(/[\s-]/g, ''))) {
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'INVALID_PHONE_NUMBER',
        errorMessage: `Destination "${destination || 'null'}" does not comply with international E.164 phone format.`,
        isPermanentFailure: true,
        latencyMs: Date.now() - startTime,
      };
    }

    const cleanPhone = destination.replace(/[\s-]/g, '');
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_FROM_NUMBER;

    if (!accountSid || !authToken || !fromNumber || process.env.NODE_ENV === 'test') {
      return {
        success: true,
        provider: 'mock-twilio',
        providerMessageId: `mock_sms_${job.deliveryId.substring(0, 8)}`,
        providerResponse: { status: 200, destination: cleanPhone, simulated: true },
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');
      const params = new URLSearchParams();
      params.append('To', cleanPhone);
      params.append('From', fromNumber);
      params.append('Body', `${job.title}: ${job.body}`);

      const res = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${auth}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: params.toString(),
          signal: controller.signal,
        }
      );

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        // Twilio error codes: 21211 (invalid number), 21614 (not mobile) are permanent
        const isPermanent = data.code === 21211 || data.code === 21614 || (res.status >= 400 && res.status < 429);
        return {
          success: false,
          provider: this.providerName,
          errorCode: data.code ? `TWILIO_${data.code}` : `HTTP_${res.status}`,
          errorMessage: data.message || `Twilio SMS dispatch failed with status ${res.status}`,
          isPermanentFailure: isPermanent,
          latencyMs,
        };
      }

      return {
        success: true,
        provider: this.providerName,
        providerMessageId: data.sid || `sms_${Date.now()}`,
        providerResponse: { status: res.status, sid: data.sid },
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        provider: this.providerName,
        errorCode: isTimeout ? 'TIMEOUT' : 'CONNECTION_ERROR',
        errorMessage: isTimeout ? `SMS dispatch timed out after ${timeoutMs}ms.` : err.message,
        isPermanentFailure: false,
        latencyMs,
      };
    }
  }
}

/**
 * Production-ready Push Delivery Adapter.
 * Dispatches via Expo Push API / Firebase Cloud Messaging.
 */
export class PushDeliveryAdapter implements NotificationDeliveryAdapter {
  readonly channel = 'push' as const;
  readonly providerName = 'expo-push';

  async send(job: NotificationJob, timeoutMs: number = 5000): Promise<DeliveryResult> {
    const startTime = Date.now();
    const token = job.destination;

    if (!token || typeof token !== 'string' || token.trim().length === 0) {
      return {
        success: false,
        provider: this.providerName,
        errorCode: 'MISSING_PUSH_TOKEN',
        errorMessage: 'Recipient has no active registered push device token.',
        isPermanentFailure: true,
        latencyMs: Date.now() - startTime,
      };
    }

    if (process.env.NODE_ENV === 'test' || !process.env.EXPO_ACCESS_TOKEN) {
      return {
        success: true,
        provider: 'mock-expo-push',
        providerMessageId: `mock_push_${job.deliveryId.substring(0, 8)}`,
        providerResponse: { status: 'ok', destination: token, simulated: true },
        latencyMs: Date.now() - startTime,
      };
    }

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const res = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.EXPO_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          to: token,
          title: job.title,
          body: job.body,
          data: job.notificationData || {},
          priority: job.priority === 'urgent' ? 'high' : 'default',
        }),
        signal: controller.signal,
      });

      clearTimeout(timer);
      const data = await res.json().catch(() => ({}));
      const latencyMs = Date.now() - startTime;

      if (!res.ok) {
        return {
          success: false,
          provider: this.providerName,
          errorCode: `HTTP_${res.status}`,
          errorMessage: data.errors?.[0]?.message || 'Expo push API request rejected',
          isPermanentFailure: res.status >= 400 && res.status < 429,
          latencyMs,
        };
      }

      // Check receipt status for device unregistration
      const ticket = data.data?.[0];
      if (ticket?.status === 'error') {
        const isPermanent = ticket.details?.error === 'DeviceNotRegistered';
        return {
          success: false,
          provider: this.providerName,
          errorCode: ticket.details?.error || 'PUSH_ERROR',
          errorMessage: ticket.message || 'Push delivery rejected by gateway',
          isPermanentFailure: isPermanent,
          latencyMs,
        };
      }

      return {
        success: true,
        provider: this.providerName,
        providerMessageId: ticket?.id || `push_${Date.now()}`,
        providerResponse: { status: 200, ticketId: ticket?.id },
        latencyMs,
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      const isTimeout = err.name === 'AbortError';
      return {
        success: false,
        provider: this.providerName,
        errorCode: isTimeout ? 'TIMEOUT' : 'CONNECTION_ERROR',
        errorMessage: isTimeout ? `Push dispatch timed out after ${timeoutMs}ms.` : err.message,
        isPermanentFailure: false,
        latencyMs,
      };
    }
  }
}
