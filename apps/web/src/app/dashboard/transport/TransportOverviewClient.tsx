'use client';

import React from 'react';
import Link from 'next/link';
import { TransportNav } from './TransportNav';
import {
  Bus,
  Route,
  Users,
  Compass,
  CalendarCheck,
  FileWarning,
  CheckCircle2,
  Clock,
  ArrowRight,
} from 'lucide-react';

interface TransportOverviewClientProps {
  initialData: any;
}

export const TransportOverviewClient: React.FC<TransportOverviewClientProps> = ({ initialData }) => {
  const stats = initialData?.stats || {
    totalVehicles: 0,
    activeVehicles: 0,
    underMaintenanceVehicles: 0,
    totalRoutes: 0,
    activeRoutes: 0,
    activeJourneys: 0,
    delayedJourneys: 0,
    totalEnrolledStudents: 0,
    expiringDocumentsCount: 0,
  };

  const recentJourneys = initialData?.recentJourneys || [];
  const expiringDocs = initialData?.expiringDocuments || [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Transport & Bus Management</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time fleet operations, GPS tracking, student boarding verification, and route schedules.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/transport/tracking"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Open Live Tracking</span>
          </Link>
          <Link
            href="/dashboard/transport/vehicles/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
          >
            <Bus className="w-3.5 h-3.5" />
            <span>Add Vehicle</span>
          </Link>
        </div>
      </div>

      {/* Navigation Tabs */}
      <TransportNav />

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Fleet Size</span>
            <Bus className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalVehicles}</span>
            <span className="text-xs text-slate-500">({stats.activeVehicles} active)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {stats.underMaintenanceVehicles} in maintenance
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Active Journeys Today</span>
            <CalendarCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-emerald-600">{stats.activeJourneys}</span>
            <span className="text-xs text-slate-500">running</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {stats.delayedJourneys > 0 ? (
              <span className="text-amber-600 font-semibold">{stats.delayedJourneys} delayed</span>
            ) : (
              'All routes on schedule'
            )}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Configured Routes</span>
            <Route className="w-4 h-4 text-sky-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalRoutes}</span>
            <span className="text-xs text-slate-500">routes</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {stats.activeRoutes} active for current term
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Assigned Students</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{stats.totalEnrolledStudents}</span>
            <span className="text-xs text-slate-500">enrolled</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Capacity-checked allocations
          </div>
        </div>
      </div>

      {/* Operational Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today's Journey Status */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-500" />
              <h2 className="text-sm font-bold text-slate-900">Today&apos;s Dispatch Board</h2>
            </div>
            <Link
              href="/dashboard/transport/journeys"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>View all</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentJourneys.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <Bus className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              No active journeys dispatched for today.
            </div>
          ) : (
            <div className="space-y-2">
              {recentJourneys.map((j: any) => (
                <div
                  key={j.id}
                  className="p-3 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      Route {j.route?.route_code || j.route_id}
                    </span>
                    <p className="text-[11px] text-slate-500">
                      {j.journey_type === 'pickup' ? 'Morning Pickup' : 'Evening Dropoff'} • Shift: {j.shift}
                    </p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        j.status === 'in_progress'
                          ? 'bg-emerald-100 text-emerald-800'
                          : j.status === 'delayed'
                          ? 'bg-amber-100 text-amber-800'
                          : j.status === 'completed'
                          ? 'bg-slate-100 text-slate-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {j.status}
                    </span>
                    {j.delay_minutes > 0 && (
                      <p className="text-[10px] text-amber-600 font-semibold mt-0.5">
                        +{j.delay_minutes} min delay
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Maintenance & Document Alerts */}
        <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileWarning className="w-4 h-4 text-amber-500" />
              <h2 className="text-sm font-bold text-slate-900">Expiring Vehicle Documents</h2>
            </div>
            <Link
              href="/dashboard/transport/vehicles"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
            >
              <span>Manage fleet</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {expiringDocs.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs">
              <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-400 mb-2" />
              All fleet insurance, fitness, and pollution certificates are up to date.
            </div>
          ) : (
            <div className="space-y-2">
              {expiringDocs.map((doc: any) => (
                <div
                  key={doc.id}
                  className="p-3 rounded-lg border border-amber-200/60 bg-amber-50/40 flex items-center justify-between"
                >
                  <div>
                    <span className="text-xs font-bold text-slate-800">
                      {doc.vehicle?.registration_number || 'Vehicle'} • {doc.document_type.replace('_', ' ')}
                    </span>
                    <p className="text-[11px] text-amber-800">
                      Expires: {doc.expiry_date}
                    </p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-200 text-amber-900">
                    Action Required
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
