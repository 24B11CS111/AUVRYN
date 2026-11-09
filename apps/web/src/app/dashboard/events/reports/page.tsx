import React from 'react';
import { EventsNav } from '../EventsNav';
import { getEventsOverviewStatsAction, getEventsAction } from '../actions';
import { Calendar } from 'lucide-react';

export default async function EventsReportsPage() {
  const [statsRes, eventsRes] = await Promise.all([
    getEventsOverviewStatsAction(),
    getEventsAction(),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalEvents: 0,
    upcomingEvents: 0,
    completedEvents: 0,
    ongoingEvents: 0,
    totalRegistrations: 0,
    studentRegistrations: 0,
    staffRegistrations: 0,
    guestRegistrations: 0,
    totalCheckIns: 0,
    totalCertificatesIssued: 0,
  };

  const events = eventsRes.success && eventsRes.data ? eventsRes.data : [];

  // Group events by type
  const typeCounts: Record<string, number> = {};
  events.forEach((e: any) => {
    typeCounts[e.event_type] = (typeCounts[e.event_type] || 0) + 1;
  });

  const attendanceRate =
    stats.totalRegistrations > 0
      ? Math.round((stats.totalCheckIns / stats.totalRegistrations) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Events Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Attendance ratios, demographic participation, and annual event frequency.
          </p>
        </div>
      </div>

      <EventsNav />

      {/* Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Overall Turnout Rate</div>
          <div className="text-2xl font-bold text-slate-900">{attendanceRate}%</div>
          <span className="text-[11px] text-slate-400">
            {stats.totalCheckIns} of {stats.totalRegistrations} registered attendees
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Student Participants</div>
          <div className="text-2xl font-bold text-purple-600">{stats.studentRegistrations}</div>
          <span className="text-[11px] text-slate-400">Enrolled student registrations</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Staff Participants</div>
          <div className="text-2xl font-bold text-blue-600">{stats.staffRegistrations}</div>
          <span className="text-[11px] text-slate-400">Faculty and staff members</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">External Guests</div>
          <div className="text-2xl font-bold text-emerald-600">{stats.guestRegistrations}</div>
          <span className="text-[11px] text-slate-400">Invited guests and parents</span>
        </div>
      </div>

      {/* Categories Breakdown */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <Calendar className="w-4 h-4 text-blue-600" />
          Event Categories Breakdown
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(typeCounts).map(([type, count]) => (
            <div key={type} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="text-xs font-semibold text-slate-800 capitalize">
                {type.replace('_', ' ')}
              </div>
              <div className="text-lg font-bold text-slate-900 mt-1">{count} events</div>
              <div className="text-[10px] text-slate-500">
                {stats.totalEvents > 0 ? `${Math.round((count / stats.totalEvents) * 100)}% of total` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
