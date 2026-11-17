/**
 * AUVRYN Central Real-Time Synchronization Service
 * The Intelligent Education Ecosystem
 *
 * Provides resilient, tenant-isolated, role-aware real-time synchronization
 * across Next.js Web and React Native Android Expo applications.
 */

import type { RealtimeChannel, SupabaseClient } from '@supabase/supabase-js';
import type {
  RealtimeConnectionState,
  RealtimeEventType,
  RealtimeMessage,
  RealtimeServiceOptions,
  RealtimeSubscription,
} from '@edu-platform/types';

export interface EventHandler<T = any> {
  (message: RealtimeMessage<T>): void;
}

export interface StateChangeHandler {
  (state: RealtimeConnectionState, details?: { error?: string }): void;
}

export interface ReconnectHandler {
  (): void;
}

/**
 * Channel naming utilities enforcing strict tenant isolation.
 */
export function getInstitutionChannelName(
  institutionId: string,
  category: 'global' | 'academics' | 'operations' | 'kpi' = 'global'
): string {
  if (!institutionId) {
    throw new Error('Cannot construct institution channel: institutionId is required');
  }
  return `auvryn:inst:${institutionId}:${category}`;
}

export function getUserNotificationChannelName(userId: string): string {
  if (!userId) {
    throw new Error('Cannot construct user channel: userId is required');
  }
  return `auvryn:user:${userId}:notifications`;
}

export function getJourneyTelemetryChannelName(journeyId: string): string {
  if (!journeyId) {
    throw new Error('Cannot construct journey channel: journeyId is required');
  }
  return `auvryn:journey:${journeyId}:telemetry`;
}

/**
 * Production-ready Real-Time Service Engine.
 */
export class AuvrynRealtimeService {
  private client: SupabaseClient<any>;
  private options: Required<RealtimeServiceOptions>;
  private channels: Map<string, RealtimeChannel> = new Map();
  private subscribers: Map<string, Set<EventHandler>> = new Map();
  private stateListeners: Set<StateChangeHandler> = new Set();
  private reconnectListeners: Set<ReconnectHandler> = new Set();
  private currentState: RealtimeConnectionState = 'DISCONNECTED';

  // Deduplication cache: messageId -> timestamp
  private seenMessages: Map<string, number> = new Map();
  private sweepInterval: any = null;

  // Reconnection tracking
  private reconnectAttempts = 0;
  private reconnectTimer: any = null;
  private isDestroyed = false;

  constructor(client: SupabaseClient<any>, options: RealtimeServiceOptions = {}) {
    this.client = client;
    this.options = {
      institutionId: options.institutionId || '',
      userId: options.userId || '',
      userRole: options.userRole || '',
      dedupWindowMs: options.dedupWindowMs || 300000, // 5 minutes
      maxReconnectAttempts: options.maxReconnectAttempts || 10,
      initialBackoffMs: options.initialBackoffMs || 1000,
      maxBackoffMs: options.maxBackoffMs || 30000,
    };

    this.startDeduplicationSweep();
  }

  // -------------------------------------------------------------
  // Context & Tenant Isolation Management
  // -------------------------------------------------------------

  /**
   * Updates the active tenant and user context.
   * If the institution or user changes (e.g. account switch or institution switcher),
   * all active channels are cleanly unsubscribed to prevent cross-institution leakage.
   */
  setContext(context: { institutionId?: string; userId?: string; userRole?: string }): void {
    const institutionChanged =
      context.institutionId !== undefined && context.institutionId !== this.options.institutionId;
    const userChanged =
      context.userId !== undefined && context.userId !== this.options.userId;

    if (institutionChanged || userChanged) {
      this.unsubscribeAll();
      this.seenMessages.clear();
      this.reconnectAttempts = 0;
    }

    if (context.institutionId !== undefined) this.options.institutionId = context.institutionId;
    if (context.userId !== undefined) this.options.userId = context.userId;
    if (context.userRole !== undefined) this.options.userRole = context.userRole;
  }

  getContext(): Readonly<Required<RealtimeServiceOptions>> {
    return { ...this.options };
  }

  // -------------------------------------------------------------
  // State Machine & Reconnect Handlers
  // -------------------------------------------------------------

  getConnectionState(): RealtimeConnectionState {
    return this.currentState;
  }

  onStateChange(handler: StateChangeHandler): () => void {
    this.stateListeners.add(handler);
    // Emit current state immediately
    handler(this.currentState);
    return () => this.stateListeners.delete(handler);
  }

  onReconnect(handler: ReconnectHandler): () => void {
    this.reconnectListeners.add(handler);
    return () => this.reconnectListeners.delete(handler);
  }

  private setState(newState: RealtimeConnectionState, details?: { error?: string }): void {
    if (this.currentState === newState && !details?.error) return;
    const previousState = this.currentState;
    this.currentState = newState;

    for (const listener of this.stateListeners) {
      try {
        listener(newState, details);
      } catch (err) {
        console.error('[AuvrynRealtime] Error in state listener:', err);
      }
    }

    // When transitioning back to CONNECTED from DISCONNECTED or RECONNECTING, notify catch-up listeners
    if (
      newState === 'CONNECTED' &&
      (previousState === 'RECONNECTING' || previousState === 'DISCONNECTED')
    ) {
      this.reconnectAttempts = 0;
      for (const listener of this.reconnectListeners) {
        try {
          listener();
        } catch (err) {
          console.error('[AuvrynRealtime] Error in reconnect catch-up listener:', err);
        }
      }
    }
  }

  // -------------------------------------------------------------
  // Deduplication & Protection
  // -------------------------------------------------------------

  /**
   * Checks whether a message has already been processed within the dedup window.
   */
  isDuplicate(messageId: string): boolean {
    if (!messageId) return false;
    const now = Date.now();
    const seenAt = this.seenMessages.get(messageId);
    if (seenAt && now - seenAt < this.options.dedupWindowMs) {
      return true;
    }
    this.seenMessages.set(messageId, now);
    return false;
  }

  private startDeduplicationSweep(): void {
    if (typeof setInterval !== 'undefined') {
      this.sweepInterval = setInterval(() => {
        const now = Date.now();
        const cutoff = now - this.options.dedupWindowMs;
        for (const [id, timestamp] of this.seenMessages.entries()) {
          if (timestamp < cutoff) {
            this.seenMessages.delete(id);
          }
        }
      }, 60000); // Sweep every minute
    }
  }

  // -------------------------------------------------------------
  // Channel Management & Subscription
  // -------------------------------------------------------------

  /**
   * Subscribes to an institution-scoped channel with strict tenant isolation.
   */
  subscribeToInstitution(
    institutionId: string,
    category: 'global' | 'academics' | 'operations' | 'kpi' = 'global',
    handler: EventHandler
  ): RealtimeSubscription {
    // Tenant boundary check
    if (this.options.institutionId && this.options.institutionId !== institutionId) {
      throw new Error(
        `Cross-institution subscription denied. Active institution is "${this.options.institutionId}", requested "${institutionId}".`
      );
    }

    const channelName = getInstitutionChannelName(institutionId, category);
    return this.subscribeToChannel(channelName, handler);
  }

  /**
   * Subscribes to user-scoped in-app notifications.
   */
  subscribeToUserNotifications(
    userId: string,
    handler: EventHandler
  ): RealtimeSubscription {
    // Security check: only own user or owner/admin can subscribe
    if (this.options.userId && this.options.userId !== userId) {
      const allowedRoles = ['owner', 'admin', 'super_admin'];
      if (!allowedRoles.includes(this.options.userRole)) {
        throw new Error(`Unauthorized: User ${this.options.userId} cannot subscribe to notifications for ${userId}.`);
      }
    }

    const channelName = getUserNotificationChannelName(userId);
    return this.subscribeToChannel(channelName, handler);
  }

  /**
   * Subscribes to live journey GPS telemetry.
   */
  subscribeToJourneyTelemetry(
    journeyId: string,
    handler: EventHandler
  ): RealtimeSubscription {
    const channelName = getJourneyTelemetryChannelName(journeyId);
    return this.subscribeToChannel(channelName, handler);
  }

  /**
   * Generic subscription handler with channel sharing and deduplication.
   */
  subscribeToChannel(channelName: string, handler: EventHandler): RealtimeSubscription {
    if (this.isDestroyed) {
      throw new Error('Cannot subscribe on a destroyed AuvrynRealtimeService');
    }

    // 1. Register handler in subscriber registry
    let handlers = this.subscribers.get(channelName);
    if (!handlers) {
      handlers = new Set();
      this.subscribers.set(channelName, handlers);
    }
    handlers.add(handler);

    // 2. Initialize channel if not already open
    if (!this.channels.has(channelName)) {
      this.initializeChannel(channelName);
    }

    const subscriptionId = `sub_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    return {
      id: subscriptionId,
      channelName,
      unsubscribe: () => {
        const subs = this.subscribers.get(channelName);
        if (subs) {
          subs.delete(handler);
          if (subs.size === 0) {
            this.unsubscribeChannel(channelName);
          }
        }
      },
    };
  }

  private initializeChannel(channelName: string): void {
    if (!this.client) return;

    this.setState('CONNECTING');

    const channel = this.client.channel(channelName, {
      config: {
        broadcast: { ack: true },
      },
    });

    // Listen for broadcast events
    channel.on('broadcast', { event: '*' }, (response: any) => {
      const eventType = response.event as RealtimeEventType;
      const rawPayload = response.payload;

      // Extract message
      const message: RealtimeMessage = {
        id: rawPayload?.id || `${channelName}_${Date.now()}`,
        eventType,
        institutionId: rawPayload?.institutionId || this.options.institutionId,
        timestamp: rawPayload?.timestamp || new Date().toISOString(),
        payload: rawPayload?.payload !== undefined ? rawPayload.payload : rawPayload,
      };

      // Discard duplicates
      if (this.isDuplicate(message.id)) {
        return;
      }

      // Dispatch to handlers
      const subs = this.subscribers.get(channelName);
      if (subs) {
        for (const h of subs) {
          try {
            h(message);
          } catch (err) {
            console.error(`[AuvrynRealtime] Error dispatching event to subscriber on "${channelName}":`, err);
          }
        }
      }
    });

    // Subscribe to channel socket
    channel.subscribe((status: string, err?: Error) => {
      if (status === 'SUBSCRIBED') {
        this.setState('CONNECTED');
      } else if (status === 'CLOSED') {
        this.setState('DISCONNECTED');
      } else if (status === 'CHANNEL_ERROR') {
        this.setState('ERROR', { error: err?.message || 'Channel subscription error' });
        this.scheduleReconnection();
      } else if (status === 'TIMED_OUT') {
        this.setState('RECONNECTING', { error: 'Channel connection timed out' });
        this.scheduleReconnection();
      }
    });

    this.channels.set(channelName, channel);
  }

  // -------------------------------------------------------------
  // Broadcasting Operations
  // -------------------------------------------------------------

  /**
   * Broadcasts an event over an authorized channel.
   */
  async broadcast<T = any>(
    channelName: string,
    eventType: RealtimeEventType,
    payload: T,
    customMessageId?: string
  ): Promise<{ success: boolean; messageId: string; error?: string }> {
    const messageId =
      customMessageId || `msg_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    // Tenant check: ensure channel matches active tenant context
    if (this.options.institutionId && channelName.includes(':inst:') && !channelName.includes(this.options.institutionId)) {
      return {
        success: false,
        messageId,
        error: `Tenant isolation violation: cannot broadcast to foreign channel ${channelName}`,
      };
    }

    // Role check for driver GPS broadcasting
    if (eventType === 'GPS_TELEMETRY_UPDATED') {
      const unauthorizedRoles = ['student', 'parent', 'guardian'];
      if (this.options.userRole && unauthorizedRoles.includes(this.options.userRole.toLowerCase())) {
        return {
          success: false,
          messageId,
          error: 'Unauthorized: Students and guardians cannot broadcast GPS telemetry.',
        };
      }
    }

    // Register into local dedup cache so sender does not process their own broadcast twice
    this.isDuplicate(messageId);

    let channel = this.channels.get(channelName);
    if (!channel) {
      this.initializeChannel(channelName);
      channel = this.channels.get(channelName);
    }

    if (!channel) {
      return { success: false, messageId, error: 'Failed to obtain channel reference' };
    }

    try {
      const transmissionPayload = {
        id: messageId,
        eventType,
        institutionId: this.options.institutionId,
        timestamp: new Date().toISOString(),
        payload,
      };

      await channel.send({
        type: 'broadcast',
        event: eventType,
        payload: transmissionPayload,
      });

      return { success: true, messageId };
    } catch (err: any) {
      return { success: false, messageId, error: err.message || 'Broadcast transmission error' };
    }
  }

  /**
   * Convenience broadcaster for live vehicle GPS telemetry.
   */
  async broadcastGpsFix(
    journeyId: string,
    coords: {
      latitude: number;
      longitude: number;
      speedKmh: number;
      heading: number;
      accuracyMeters: number;
      recordedAt: string;
      vehicleId?: string;
      driverStaffId?: string;
    }
  ) {
    const journeyChannel = getJourneyTelemetryChannelName(journeyId);
    const instChannel = this.options.institutionId
      ? getInstitutionChannelName(this.options.institutionId, 'operations')
      : null;

    const promises: Promise<any>[] = [
      this.broadcast(journeyChannel, 'GPS_TELEMETRY_UPDATED', { journeyId, ...coords }),
    ];

    if (instChannel) {
      promises.push(
        this.broadcast(instChannel, 'GPS_TELEMETRY_UPDATED', { journeyId, ...coords })
      );
    }

    return Promise.all(promises);
  }

  /**
   * Convenience broadcaster for dashboard KPI invalidations.
   */
  async broadcastKpiInvalidation(
    modules: ('students' | 'staff' | 'attendance' | 'fees' | 'operations' | 'academics')[]
  ) {
    if (!this.options.institutionId) return;
    const kpiChannel = getInstitutionChannelName(this.options.institutionId, 'kpi');
    return this.broadcast(kpiChannel, 'KPI_STATS_INVALIDATED', {
      modules,
      invalidatedAt: new Date().toISOString(),
    });
  }

  // -------------------------------------------------------------
  // Teardown & Reconnection Logic
  // -------------------------------------------------------------

  private scheduleReconnection(): void {
    if (this.isDestroyed || this.reconnectTimer) return;

    if (this.reconnectAttempts >= this.options.maxReconnectAttempts) {
      this.setState('ERROR', { error: 'Maximum reconnection attempts exceeded' });
      return;
    }

    this.reconnectAttempts++;
    this.setState('RECONNECTING');

    // Exponential backoff with jitter
    const delay = Math.min(
      this.options.initialBackoffMs * Math.pow(2, this.reconnectAttempts - 1) + Math.random() * 500,
      this.options.maxBackoffMs
    );

    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectChannels();
    }, delay);
  }

  private reconnectChannels(): void {
    if (this.isDestroyed) return;

    // Resubscribe to each open channel
    for (const [channelName] of this.channels.entries()) {
      try {
        const existing = this.channels.get(channelName);
        if (existing) {
          existing.unsubscribe();
        }
      } catch {}
      this.initializeChannel(channelName);
    }
  }

  /**
   * Unsubscribes and cleans up a single channel.
   */
  unsubscribeChannel(channelName: string): void {
    const channel = this.channels.get(channelName);
    if (channel) {
      try {
        channel.unsubscribe();
      } catch (err) {
        console.warn(`[AuvrynRealtime] Error unsubscribing channel "${channelName}":`, err);
      }
      this.channels.delete(channelName);
    }
    this.subscribers.delete(channelName);

    if (this.channels.size === 0) {
      this.setState('DISCONNECTED');
    }
  }

  /**
   * Unsubscribes from all active channels.
   */
  unsubscribeAll(): void {
    for (const channelName of Array.from(this.channels.keys())) {
      this.unsubscribeChannel(channelName);
    }
    this.subscribers.clear();
    this.channels.clear();
    this.setState('DISCONNECTED');
  }

  /**
   * Complete destruction of service (e.g. app unmount or user sign-out).
   */
  destroy(): void {
    this.isDestroyed = true;
    if (this.sweepInterval) {
      clearInterval(this.sweepInterval);
      this.sweepInterval = null;
    }
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.unsubscribeAll();
    this.stateListeners.clear();
    this.reconnectListeners.clear();
    this.seenMessages.clear();
  }
}

// -------------------------------------------------------------
// Singleton Instance Manager
// -------------------------------------------------------------

let globalRealtimeInstance: AuvrynRealtimeService | null = null;

export function getAuvrynRealtime(
  client: SupabaseClient<any>,
  options?: RealtimeServiceOptions
): AuvrynRealtimeService {
  if (!globalRealtimeInstance) {
    globalRealtimeInstance = new AuvrynRealtimeService(client, options);
  } else if (options) {
    globalRealtimeInstance.setContext(options);
  }
  return globalRealtimeInstance;
}

export function resetAuvrynRealtime(): void {
  if (globalRealtimeInstance) {
    globalRealtimeInstance.destroy();
    globalRealtimeInstance = null;
  }
}
