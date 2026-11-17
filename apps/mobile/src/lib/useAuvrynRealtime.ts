import { useEffect, useState, useRef, useCallback } from 'react';
import { supabase } from './supabase';
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

export interface UseMobileRealtimeOptions {
  institutionId?: string;
  userId?: string;
  userRole?: string;
}

export function useMobileRealtime(options: UseMobileRealtimeOptions = {}) {
  const [connectionState, setConnectionState] = useState<RealtimeConnectionState>('DISCONNECTED');
  const serviceRef = useRef<AuvrynRealtimeService | null>(null);

  if (!serviceRef.current && supabase) {
    serviceRef.current = getAuvrynRealtime(supabase, {
      institutionId: options.institutionId,
      userId: options.userId,
      userRole: options.userRole,
    });
  }

  useEffect(() => {
    if (serviceRef.current && (options.institutionId || options.userId || options.userRole)) {
      serviceRef.current.setContext({
        institutionId: options.institutionId,
        userId: options.userId,
        userRole: options.userRole,
      });
    }
  }, [options.institutionId, options.userId, options.userRole]);

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
        console.warn('[useMobileRealtime] Institution subscription error:', err);
        return null;
      }
    },
    [options.institutionId]
  );

  const subscribeToNotifications = useCallback(
    (handler: (message: RealtimeMessage) => void): RealtimeSubscription | null => {
      const service = serviceRef.current;
      const uId = options.userId || service?.getContext().userId;
      if (!service || !uId) return null;

      try {
        return service.subscribeToUserNotifications(uId, handler);
      } catch (err) {
        console.warn('[useMobileRealtime] User notification subscription error:', err);
        return null;
      }
    },
    [options.userId]
  );

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
        console.warn('[useMobileRealtime] Journey subscription error:', err);
        return null;
      }
    },
    []
  );

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

  return {
    connectionState,
    service: serviceRef.current,
    subscribeToInstitution,
    subscribeToNotifications,
    subscribeToJourney,
    broadcast,
  };
}
