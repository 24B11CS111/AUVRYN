'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { TransportNav } from '../TransportNav';
import {
  Plus,
  Search,
} from 'lucide-react';

interface RoutesClientProps {
  initialRoutes: any[];
}

export const RoutesClient: React.FC<RoutesClientProps> = ({ initialRoutes }) => {
  const [routes] = useState(initialRoutes);
  const [search, setSearch] = useState('');

  const filtered = routes.filter((r) => {
    return (
      r.route_name.toLowerCase().includes(search.toLowerCase()) ||
      r.route_code.toLowerCase().includes(search.toLowerCase()) ||
      r.destination.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transport Routes</h1>
          <p className="text-xs text-slate-500 mt-1">
            Configured routes, assigned buses and drivers, ordered stops, and capacity utilization.
          </p>
        </div>
        <Link
          href="/dashboard/transport/routes/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Create New Route</span>
        </Link>
      </div>

      <TransportNav />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by route name, code, or destination..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      {/* Routes Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtered.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs">
            No transport routes configured.
          </div>
        ) : (
          filtered.map((r) => {
            const stopsCount = (r.stops || []).length;
            const vehicle = r.assigned_vehicle;
            const driver = r.assigned_driver;
            const assignedCount = r.assignedCount || 0;
            const capacity = vehicle?.seating_capacity || 0;
            const pct = capacity > 0 ? Math.round((assignedCount / capacity) * 100) : 0;

            return (
              <div key={r.id} className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                      {r.route_code}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1">{r.route_name}</h3>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                      r.status === 'active' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {r.status}
                  </span>
                </div>

                <div className="text-xs text-slate-600 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Shift & Type:</span>
                    <span className="capitalize font-medium">
                      {r.shift} • {r.route_type.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Span:</span>
                    <span className="font-medium truncate max-w-[180px]">
                      {r.start_location} → {r.destination}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Bus:</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      {vehicle?.registration_number || 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Assigned Driver:</span>
                    <span className="font-medium">
                      {driver ? `${driver.first_name} ${driver.last_name}` : 'Unassigned'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Stops:</span>
                    <span className="font-medium">{stopsCount} scheduled stops</span>
                  </div>
                </div>

                {/* Capacity Gauge */}
                {vehicle && (
                  <div className="pt-2 border-t border-slate-100 space-y-1">
                    <div className="flex justify-between text-[11px]">
                      <span className="text-slate-500">Occupancy:</span>
                      <span className="font-semibold text-slate-800">
                        {assignedCount} / {capacity} seats ({pct}%)
                      </span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(pct, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
