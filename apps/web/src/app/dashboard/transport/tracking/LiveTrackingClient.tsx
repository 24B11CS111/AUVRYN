'use client';

import React, { useState } from 'react';
import { TransportNav } from '../TransportNav';
import { TransportMap } from '@/components/transport/TransportMap';
import {
  Bus,
  RefreshCw,
} from 'lucide-react';

interface LiveTrackingClientProps {
  initialJourneys: any[];
}

export const LiveTrackingClient: React.FC<LiveTrackingClientProps> = ({ initialJourneys }) => {
  const [journeys] = useState(initialJourneys);
  const [selectedJourneyId, setSelectedJourneyId] = useState<string>(
    initialJourneys[0]?.id || ''
  );

  const selectedJourney = journeys.find((j) => j.id === selectedJourneyId) || journeys[0];
  const liveLoc = selectedJourney?.live_location;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Live Vehicle Tracking</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time GPS telemetry, bus velocity, stop ETA, and location freshness.
          </p>
        </div>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-slate-200 bg-white hover:bg-slate-50 transition"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-600" />
          <span>Refresh Telemetry</span>
        </button>
      </div>

      <TransportNav />

      {/* Main Map & Fleet Selector Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Side: Active Buses List */}
        <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900">Active Fleet ({journeys.length})</h2>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded">
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
                        ? 'border-slate-900 bg-slate-900 text-white shadow-sm'
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

              {/* Telemetry Telemetry Status Card */}
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
                  <span className="text-[10px] text-slate-400 block font-medium">Last Sync</span>
                  <span className="font-mono text-slate-600">
                    {liveLoc?.recorded_at
                      ? new Date(liveLoc.recorded_at).toLocaleTimeString()
                      : 'Pending transmission'}
                  </span>
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
