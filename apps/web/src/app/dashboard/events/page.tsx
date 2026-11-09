import React from 'react';
import Link from 'next/link';
import { EventsNav } from './EventsNav';
import { getEventsOverviewStatsAction, getEventsAction } from './actions';
import {
  Calendar,
  Plus,
  Users,
  CheckCircle2,
  Award,
  MapPin,
  Clock,
  Sparkles,
} from 'lucide-react';

interface EventsPageProps {
  searchParams: Promise<{ eventType?: string; status?: string; query?: string }>;
}

export default async function EventsOverviewPage({ searchParams }: EventsPageProps) {
  const { eventType, status, query } = await searchParams;

  const [statsRes, eventsRes] = await Promise.all([
    getEventsOverviewStatsAction(),
    getEventsAction({ eventType, status, query }),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Events & Activities</h1>
          <p className="text-sm text-slate-500">
            Conferences, cultural fests, sports meets, workshops, registration desks and certificates.
          </p>
        </div>
        <Link
          href="/dashboard/events/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Create Event
        </Link>
      </div>

      <EventsNav />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">All Events</span>
            <Calendar className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalEvents}</div>
          <span className="text-xs text-slate-400">{stats.completedEvents} completed</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Upcoming</span>
            <Clock className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{stats.upcomingEvents}</div>
          <span className="text-xs text-slate-400">Scheduled ahead</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Ongoing</span>
            <Sparkles className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-600">{stats.ongoingEvents}</div>
          <span className="text-xs text-slate-400">Currently active</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Registrations</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-600">{stats.totalRegistrations}</div>
          <span className="text-xs text-slate-400">{stats.studentRegistrations} students</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Attendance</span>
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-600">{stats.totalCheckIns}</div>
          <span className="text-xs text-slate-400">Physical check-ins</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Certificates</span>
            <Award className="w-4 h-4 text-rose-600" />
          </div>
          <div className="text-xl font-bold text-rose-600">{stats.totalCertificatesIssued}</div>
          <span className="text-xs text-slate-400">Issued credentials</span>
        </div>
      </div>

      {/* Events Grid */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Events Schedule</h2>
        {events.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-200 bg-white shadow-sm">
            <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No events found</p>
            <p className="text-xs text-slate-400 mt-1">Create an event using the button above.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {events.map((e: any) => {
              const regCount = (e.registrations || []).length;
              const maxPart = e.max_participants || 0;

              return (
                <div
                  key={e.id}
                  className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
                        {e.event_type}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          e.status === 'published'
                            ? 'bg-emerald-100 text-emerald-800'
                            : e.status === 'ongoing'
                            ? 'bg-amber-100 text-amber-800'
                            : e.status === 'completed'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {e.status}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-900 leading-snug">{e.title}</h3>
                    {e.description && (
                      <p className="text-xs text-slate-500 line-clamp-2">{e.description}</p>
                    )}

                    <div className="text-xs text-slate-600 space-y-1 pt-2">
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" />
                        <span>{e.venue}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-700">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {e.start_time?.split('T')[0]} {e.start_time?.split('T')[1]?.slice(0, 5)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">
                      <strong className="text-slate-900">{regCount}</strong>
                      {maxPart > 0 ? ` / ${maxPart}` : ''} registered
                    </span>
                    <Link
                      href={`/dashboard/events/${e.id}`}
                      className="text-blue-600 font-semibold hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
