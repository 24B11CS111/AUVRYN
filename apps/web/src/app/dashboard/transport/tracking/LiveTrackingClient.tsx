'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { TransportNav } from '../TransportNav';
import { TransportMap } from '@/components/transport/TransportMap';
import {
  Bus,
  RefreshCw,
} from 'lucide-react';
import { useAuvrynRealtime } from '@/lib/realtime/useAuvrynRealtime';
import { RealtimeStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';

interface LiveTrackingClientProps {
  initialJourneys: any[];
}

export const LiveTrackingClient: React.FC<LiveTrackingClientProps> = ({ initialJourneys }) => {
  const [journeys, setJourneys] = useState(initialJourneys);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>(
    initialJourneys[0]?.id || ''
  );
  const [lastFixTime, setLastFixTime] = useState<number>(Date.now());

  const selectedJourney = journeys.find((j) => j.id === selectedJourneyId) || journeys[0];
  const liveLoc = selectedJourney?.live_location;
  const institutionId = selectedJourney?.institution_id || initialJourneys[0]?.institution_id;

  // Real-time synchronization hook
  const { connectionState, subscribeToJourney, subscribeToInstitution } = useAuvrynRealtime({
    institutionId,
  });

  // Calculate fix freshness
  const freshness = useMemo(() => {
    if (!liveLoc?.recorded_at) return 'stale';
    const fixAgeMs = Date.now() - new Date(liveLoc.recorded_at).getTime();
    if (fixAgeMs < 35000) return 'fresh'; // under 35 seconds
    if (fixAgeMs < 120000) return 'aging'; // under 2 minutes
    return 'stale';
  }, [liveLoc?.recorded_at, lastFixTime]);

  // Periodic tick to recompute freshness
  useEffect(() => {
    const timer = setInterval(() => {
      setLastFixTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Subscribe to live GPS telemetry for selected journey
  useEffect(() => {
    if (!selectedJourneyId) return;

    const sub = subscribeToJourney(selectedJourneyId, (message) => {
      if (message.eventType === 'GPS_TELEMETRY_UPDATED') {
        const payload = message.payload as any;
        if (payload) {
          setJourneys((prev) =>
            prev.map((j) => {
              if (j.id === selectedJourneyId) {
                return {
                  ...j,
                  live_location: {
                    latitude: payload.latitude,
                    longitude: payload.longitude,
                    speed_kmh: payload.speedKmh ?? payload.speed_kmh ?? 0,
                    heading: payload.heading ?? 0,
                    recorded_at: payload.recordedAt ?? payload.recorded_at ?? new Date().toISOString(),
                  },
                };
              }
              return j;
            })
          );
          setLastFixTime(Date.now());
        }
      } else if (message.eventType === 'JOURNEY_ENDED') {
        // Remove ended journey from active fleet
        setJourneys((prev) => prev.filter((j) => j.id !== selectedJourneyId));
      }
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [selectedJourneyId, subscribeToJourney]);

  // Subscribe to institutional fleet updates
  useEffect(() => {
    if (!institutionId) return;

    const sub = subscribeToInstitution('operations', (message) => {
      if (message.eventType === 'JOURNEY_STARTED') {
        const newJourney = message.payload as any;
        if (newJourney && newJourney.id) {
          setJourneys((prev) => {
            if (prev.some((j) => j.id === newJourney.id)) return prev;
            return [newJourney, ...prev];
          });
        }
      } else if (message.eventType === 'JOURNEY_ENDED') {
        const endedId = (message.payload as any)?.journeyId || (message.payload as any)?.id;
        if (endedId) {
          setJourneys((prev) => prev.filter((j) => j.id !== endedId));
        }
      }
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [institutionId, subscribeToInstitution]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#0B1E3F] tracking-tight">Live Vehicle Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time GPS telemetry, bus velocity, stop ETA, and location freshness.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <RealtimeStatusIndicator state={connectionState} />
          <button
            type="button"
            onClick={() => setLastFixTime(Date.now())}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 transition"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
            <span>Check Telemetry</span>
          </button>
        </div>
      </div>

      <TransportNav />

      {/* Main Map & Fleet Selector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Active Buses List */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Active Fleet ({journeys.length})</h2>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Live Feed
            </span>
          </div>

          {journeys.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <Bus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              No active journeys transmitting GPS telemetry right now.
            </div>
          ) : (
            <div className="space-y-2 max-h-[480px] overflow-y-auto">
              {journeys.map((j) => {
                const isSelected = j.id === (selectedJourney?.id || selectedJourneyId);
                const hasFix = !!j.live_location;

                return (
                  <button
                    key={j.id}
                    type="button"
                    onClick={() => setSelectedJourneyId(j.id)}
                    className={`w-full text-left p-3 rounded-xl border transition ${
                      isSelected
                        ? 'border-[#0B1E3F] bg-[#0B1E3F] text-white shadow-sm'
                        : 'border-slate-200 bg-slate-50/50 hover:bg-slate-100/70 text-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono font-bold text-xs">
                        {j.vehicle?.registration_number || 'Bus'}
                      </span>
                      <span
                        className={`w-2 h-2 rounded-full ${
                          hasFix ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'
                        }`}
                        title={hasFix ? 'Telemetry fix active' : 'No recent fix'}
                      />
                    </div>
                    <p className={`text-xs mt-0.5 ${isSelected ? 'text-slate-200 font-medium' : 'text-slate-600'}`}>
                      {j.route?.route_name}
                    </p>
                    <div
                      className={`flex items-center justify-between text-[10px] mt-2 pt-2 border-t ${
                        isSelected ? 'border-slate-800 text-slate-400' : 'border-slate-200/60 text-slate-400'
                      }`}
                    >
                      <span>Driver: {j.driver?.first_name || 'Assigned'}</span>
                      <span>{hasFix ? `${j.live_location.speed_kmh?.toFixed(0)} km/h` : 'No fix'}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Right Side: Map & Telemetry Details */}
        <div className="lg:col-span-2 space-y-4">
          {selectedJourney ? (
            <>
              <TransportMap
                routeName={selectedJourney.route?.route_name}
                isLive={true}
                height="420px"
                vehicleLocation={
                  liveLoc
                    ? {
                        latitude: parseFloat(liveLoc.latitude),
                        longitude: parseFloat(liveLoc.longitude),
                        speedKmh: liveLoc.speed_kmh,
                        heading: liveLoc.heading,
                        recordedAt: liveLoc.recorded_at,
                      }
                    : null
                }
                stops={[
                  {
                    id: 's1',
                    name: selectedJourney.route?.start_location || 'Start Depot',
                    latitude: 28.61,
                    longitude: 77.2,
                    stopOrder: 1,
                    scheduledTime: '07:30',
                  },
                  {
                    id: 's2',
                    name: 'Midpoint Junction',
                    latitude: 28.62,
                    longitude: 77.21,
                    stopOrder: 2,
                    scheduledTime: '07:50',
                  },
                  {
                    id: 's3',
                    name: selectedJourney.route?.destination || 'Campus Gate',
                    latitude: 28.63,
                    longitude: 77.22,
                    stopOrder: 3,
                    scheduledTime: '08:15',
                  },
                ]}
              />

              {/* Telemetry Status Card */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Vehicle Reg</span>
                  <span className="font-mono font-bold text-slate-900">
                    {selectedJourney.vehicle?.registration_number}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Driver Contact</span>
                  <span className="font-medium text-slate-800">
                    {selectedJourney.driver?.phone || 'Through School Hotline'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Velocity / Heading</span>
                  <span className="font-mono font-semibold text-emerald-600">
                    {liveLoc?.speed_kmh?.toFixed(0) || 0} km/h • {liveLoc?.heading || 0}°
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-medium">Telemetry Freshness</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`w-2 h-2 rounded-full ${
                        freshness === 'fresh'
                          ? 'bg-emerald-500 animate-pulse'
                          : freshness === 'aging'
                          ? 'bg-amber-500'
                          : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-mono text-slate-700 capitalize font-medium text-[11px]">
                      {freshness === 'fresh' ? 'Live (<30s)' : freshness === 'aging' ? 'Aging (<2m)' : 'Stale (>2m)'}
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="p-16 rounded-2xl border border-slate-200 bg-white text-center text-slate-400 text-xs">
              Select an active bus to track its location.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
