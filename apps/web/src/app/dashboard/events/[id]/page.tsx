import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { EventsNav } from '../EventsNav';
import { getEventDetailsAction } from '../actions';
import { ArrowLeft, Users } from 'lucide-react';

interface EventDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function EventDetailPage({ params }: EventDetailPageProps) {
  const { id } = await params;
  const res = await getEventDetailsAction(id);

  if (!res.success || !res.data) {
    notFound();
  }

  const event = res.data;
  const registrations = event.registrations || [];
  const attendedCount = registrations.filter((r: any) => r.status === 'attended').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/events"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{event.title}</h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-blue-50 text-blue-700 border border-blue-200">
              {event.event_type}
            </span>
          </div>
          <p className="text-sm text-slate-500">
            {event.venue} • {event.start_time?.split('T')[0]}
          </p>
        </div>
      </div>

      <EventsNav />

      {/* Overview & Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Status</div>
          <div className="text-lg font-bold text-slate-900 capitalize">{event.status}</div>
          <span className="text-[11px] text-slate-400">Current state</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Registrations</div>
          <div className="text-lg font-bold text-slate-900">
            {registrations.length}
            {event.max_participants > 0 ? ` / ${event.max_participants}` : ''}
          </div>
          <span className="text-[11px] text-slate-400">Confirmed entries</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Attended / Check-in</div>
          <div className="text-lg font-bold text-emerald-600">
            {attendedCount}
          </div>
          <span className="text-[11px] text-slate-400">Physical attendance</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Turnout Ratio</div>
          <div className="text-lg font-bold text-indigo-600">
            {registrations.length > 0 ? `${Math.round((attendedCount / registrations.length) * 100)}%` : '0%'}
          </div>
          <span className="text-[11px] text-slate-400">Actual participation</span>
        </div>
      </div>

      {/* Details & Registrations List */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Users className="w-4 h-4 text-blue-600" />
            Registered Participants ({registrations.length})
          </h2>
          <Link
            href="/dashboard/events/attendance"
            className="text-xs text-blue-600 hover:underline"
          >
            Open Check-in Desk →
          </Link>
        </div>

        {registrations.length === 0 ? (
          <p className="text-xs text-slate-500 py-6 text-center">No participants registered yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3">Participant Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Registered At</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Check-in Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {r.ticket_code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {r.student
                          ? `${r.student.first_name} ${r.student.last_name}`
                          : r.staff
                          ? `${r.staff.first_name} ${r.staff.last_name}`
                          : r.guest_name || 'Guest'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {r.student?.admission_number || r.guest_email || '—'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                        {r.participant_category}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.registered_at ? r.registered_at.split('T')[0] : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          r.status === 'attended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'waitlisted'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.attendance?.checked_in_at
                        ? r.attendance.checked_in_at.split('T')[1]?.slice(0, 5)
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
