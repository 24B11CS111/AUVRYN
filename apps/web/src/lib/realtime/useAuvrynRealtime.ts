'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import { createClient } from '@/lib/supabase/client';
import {
  getAuvrynRealtime,
  AuvrynRealtimeService,
} from '@edu-platform/supabase-client';
import type {
  RealtimeConnectionState,
  RealtimeEventType,
  RealtimeMessage,
  RealtimeSubscription,
} from '@edu-platform/types';

export interface UseAuvrynRealtimeOptions {
  institutionId?: string;
  userId?: string;
  userRole?: string;
  autoConnect?: boolean;
}

/**
 * React Hook for Web Components to interface with AUVRYN Real-time Sync Engine.
 */
export function useAuvrynRealtime(options: UseAuvrynRealtimeOptions = {}) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('DISCONNECTED');
  const serviceRef = useRef<AuvrynRealtimeService | null>(null);

  // Initialize service instance
  if (!serviceRef.current) {
    const supabase = createClient();
    serviceRef.current = getAuvrynRealtime(supabase as any, {
      institutionId: options.institutionId,
      userId: options.userId,
      userRole: options.userRole,
    });
  }

  // Update context when props change
  useEffect(() => {
    if (serviceRef.current && (options.institutionId || options.userId || options.userRole)) {
      serviceRef.current.setContext({
        institutionId: options.institutionId,
        userId: options.userId,
        userRole: options.userRole,
      });
    }
  }, [options.institutionId, options.userId, options.userRole]);

  // Subscribe to connection state changes
  useEffect(() => {
    const service = serviceRef.current;
    if (!service) return;

    const unsubscribe = service.onStateChange((state) => {
      setConnectionState(state);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  /**
   * Subscribe to institution-scoped category events
   */
  const subscribeToInstitution = useCallback(
    (
      category: 'global' | 'academics' | 'operations' | 'kpi',
      handler: (message: RealtimeMessage) => void
    ): RealtimeSubscription | null => {
      const service = serviceRef.current;
      const instId = options.institutionId || service?.getContext().institutionId;
      if (!service || !instId) return null;

      try {
        return service.subscribeToInstitution(instId, category, handler);
      } catch (err) {
        console.warn('[useAuvrynRealtime] Institution subscription error:', err);
        return null;
      }
    },
    [options.institutionId]
  );

  /**
   * Subscribe to user-scoped in-app notifications
   */
  const subscribeToNotifications = useCallback(
    (handler: (message: RealtimeMessage) => void): RealtimeSubscription | null => {
      const service = serviceRef.current;
      const uId = options.userId || service?.getContext().userId;
      if (!service || !uId) return null;

      try {
        return service.subscribeToUserNotifications(uId, handler);
      } catch (err) {
        console.warn('[useAuvrynRealtime] User notification subscription error:', err);
        return null;
      }
    },
    [options.userId]
  );

  /**
   * Subscribe to journey GPS telemetry
   */
  const subscribeToJourney = useCallback(
    (
      journeyId: string,
      handler: (message: RealtimeMessage) => void
    ): RealtimeSubscription | null => {
      const service = serviceRef.current;
      if (!service || !journeyId) return null;

      try {
        return service.subscribeToJourneyTelemetry(journeyId, handler);
      } catch (err) {
        console.warn('[useAuvrynRealtime] Journey subscription error:', err);
        return null;
      }
    },
    []
  );

  /**
   * Broadcast an event
   */
  const broadcast = useCallback(
    async <T = any>(
      channelName: string,
      eventType: RealtimeEventType,
      payload: T
    ) => {
      const service = serviceRef.current;
      if (!service) return { success: false, messageId: '', error: 'Service not initialized' };
      return service.broadcast(channelName, eventType, payload);
    },
    []
  );

  /**
   * Broadcast KPI invalidation
   */
  const broadcastKpiInvalidation = useCallback(
    async (modules: ('students' | 'staff' | 'attendance' | 'fees' | 'operations' | 'academics')[]) => {
      const service = serviceRef.current;
      if (!service) return;
      return service.broadcastKpiInvalidation(modules);
    },
    []
  );

  return {
    connectionState,
    service: serviceRef.current,
    subscribeToInstitution,
    subscribeToNotifications,
    subscribeToJourney,
    broadcast,
    broadcastKpiInvalidation,
  };
}
