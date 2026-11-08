'use client';

import React from 'react';
import { TransportNav } from '../TransportNav';

interface ReportsClientProps {
  routes: any[];
  vehicles: any[];
}

export const ReportsClient: React.FC<ReportsClientProps> = ({ routes, vehicles }) => {
  const totalCapacity = vehicles.reduce((acc, v) => acc + (v.seating_capacity || 0), 0);
  const totalAssigned = routes.reduce((acc, r) => acc + (r.assignedCount || 0), 0);
  const overallUtilizationPct = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transport Analytics & Utilization Reports</h1>
          <p className="text-xs text-slate-500 mt-1">
            Fleet seat utilization, route load distribution, and schedule efficiency.
          </p>
        </div>
      </div>

      <TransportNav />

      {/* Aggregate Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Fleet Capacity</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalCapacity} seats</div>
          <p className="text-[11px] text-slate-400 mt-1">Across {vehicles.length} registered vehicles</p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Allocated Passengers</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{totalAssigned} students</div>
          <p className="text-[11px] text-slate-400 mt-1">Assigned across {routes.length} active routes</p>
        </div>

        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Fleet Load Factor</div>
          <div className="text-2xl font-bold text-emerald-600 mt-1">{overallUtilizationPct}%</div>
          <p className="text-[11px] text-slate-400 mt-1">Overall capacity utilization</p>
        </div>
      </div>

      {/* Route Load Analysis Table */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900">Route Load Factor & Seat Allocation</h2>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-2.5 px-3">Route Code</th>
                <th className="py-2.5 px-3">Route Name</th>
                <th className="py-2.5 px-3">Bus Registration</th>
                <th className="py-2.5 px-3">Vehicle Capacity</th>
                <th className="py-2.5 px-3">Assigned Students</th>
                <th className="py-2.5 px-3">Load Factor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {routes.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No active routes available for analysis.
                  </td>
                </tr>
              ) : (
                routes.map((r) => {
                  const cap = r.assigned_vehicle?.seating_capacity || 0;
                  const assigned = r.assignedCount || 0;
                  const pct = cap > 0 ? Math.round((assigned / cap) * 100) : 0;

                  return (
                    <tr key={r.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900">{r.route_code}</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{r.route_name}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-600">
                        {r.assigned_vehicle?.registration_number || 'Unassigned'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{cap} seats</td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800">{assigned}</td>
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono font-bold ${
                              pct >= 100 ? 'text-red-600' : pct >= 80 ? 'text-amber-600' : 'text-emerald-600'
                            }`}
                          >
                            {pct}%
                          </span>
                          <div className="w-20 h-1.5 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                pct >= 100 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(pct, 100)}%` }}
                            />
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
