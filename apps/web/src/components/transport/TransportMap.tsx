'use client';

import React from 'react';
import { MapPin, Navigation, Compass, AlertCircle, Clock } from 'lucide-react';

interface MapStop {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  stopOrder?: number;
  scheduledTime?: string;
  isPassed?: boolean;
}

interface MapVehicleLocation {
  latitude: number;
  longitude: number;
  speedKmh?: number;
  heading?: number;
  recordedAt?: string;
}

interface TransportMapProps {
  stops?: MapStop[];
  vehicleLocation?: MapVehicleLocation | null;
  routeName?: string;
  isLive?: boolean;
  height?: string;
}

export const TransportMap: React.FC<TransportMapProps> = ({
  stops = [],
  vehicleLocation,
  routeName,
  isLive = false,
  height = '360px',
}) => {
  const hasStops = stops.length > 0;
  const hasLocation = !!vehicleLocation && !isNaN(vehicleLocation.latitude) && !isNaN(vehicleLocation.longitude);

  return (
    <div
      style={{ height }}
      className="relative w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-950 flex flex-col justify-between p-4 shadow-inner"
    >
      {/* Map Header Overlay */}
      <div className="z-10 flex items-center justify-between gap-3 bg-slate-900/80 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-800 text-xs text-white">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${isLive && hasLocation ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'}`} />
          <span className="font-semibold">{routeName || 'Transport Route'}</span>
        </div>
        <div className="flex items-center gap-3 text-slate-300">
          {hasLocation && (
            <>
              <span className="flex items-center gap-1">
                <Navigation className="w-3 h-3 text-emerald-400" />
                <span>{vehicleLocation?.speedKmh?.toFixed(0) || 0} km/h</span>
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>
                  {vehicleLocation?.recordedAt
                    ? new Date(vehicleLocation.recordedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                    : 'Awaiting sync'}
                </span>
              </span>
            </>
          )}
          {!hasLocation && (
            <span className="text-amber-400 flex items-center gap-1 text-[11px]">
              <AlertCircle className="w-3 h-3" />
              <span>Awaiting telemetry</span>
            </span>
          )}
        </div>
      </div>

      {/* Stylized Vector Route Canvas */}
      <div className="absolute inset-0 flex items-center justify-center p-8 opacity-90">
        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:20px_20px] opacity-40 pointer-events-none" />

        {hasStops ? (
          <div className="relative w-full max-w-2xl flex items-center justify-between z-0">
            {/* Connecting Route Line */}
            <div className="absolute left-6 right-6 top-1/2 -translate-y-1/2 h-1 bg-gradient-to-r from-indigo-500 via-sky-500 to-emerald-500 rounded-full" />

            {stops.map((stop, idx) => {
              const isFirst = idx === 0;
              const isLast = idx === stops.length - 1;
              return (
                <div key={stop.id} className="relative z-10 flex flex-col items-center group">
                  <div
                    className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold transition-all shadow-md ${
                      isFirst
                        ? 'border-indigo-400 bg-indigo-950 text-indigo-200'
                        : isLast
                        ? 'border-emerald-400 bg-emerald-950 text-emerald-200'
                        : 'border-slate-500 bg-slate-900 text-slate-200'
                    }`}
                  >
                    {stop.stopOrder || idx + 1}
                  </div>
                  <div className="mt-2 text-center max-w-[100px]">
                    <p className="text-[11px] font-semibold text-slate-200 truncate">{stop.name}</p>
                    {stop.scheduledTime && (
                      <p className="text-[10px] text-slate-400 font-mono">{stop.scheduledTime}</p>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Live Vehicle Marker */}
            {hasLocation && (
              <div
                className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center animate-bounce"
                title={`Live Bus: ${vehicleLocation?.latitude.toFixed(4)}, ${vehicleLocation?.longitude.toFixed(4)}`}
              >
                <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-white flex items-center justify-center text-white shadow-xl shadow-emerald-500/50">
                  <Navigation
                    className="w-5 h-5 transition-transform"
                    style={{ transform: `rotate(${vehicleLocation?.heading || 0}deg)` }}
                  />
                </div>
                <div className="mt-1 px-2 py-0.5 rounded bg-emerald-900/90 text-[10px] font-bold text-white border border-emerald-600/50 backdrop-blur-xs">
                  Active Bus
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center text-slate-500 z-10">
            <Compass className="w-10 h-10 mx-auto text-slate-600 mb-2 opacity-50" />
            <p className="text-xs">No route coordinates or stops plotted</p>
          </div>
        )}
      </div>

      {/* Map Footer Telemetry Coordinates */}
      <div className="z-10 flex items-center justify-between text-[11px] text-slate-400 bg-slate-900/70 backdrop-blur-md px-3.5 py-2 rounded-xl border border-slate-800">
        <div className="flex items-center gap-1.5">
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span>
            {hasLocation
              ? `GPS: ${vehicleLocation?.latitude.toFixed(5)}°, ${vehicleLocation?.longitude.toFixed(5)}°`
              : 'GPS: No active fix'}
          </span>
        </div>
        <div className="text-[10px] text-slate-500 font-mono">
          Provider: Replaceable Leaflet / OSM Layer
        </div>
      </div>
    </div>
  );
};
