import React from 'react';
import { EventsNav } from '../EventsNav';
import { getEventRegistrationsAction, getEventsAction } from '../actions';
import { Users } from 'lucide-react';

interface RegistrationsPageProps {
  searchParams: Promise<{ eventId?: string; status?: string }>;
}

export default async function EventRegistrationsPage({ searchParams }: RegistrationsPageProps) {
  const { eventId, status } = await searchParams;

  const [regsRes, eventsRes] = await Promise.all([
    getEventRegistrationsAction({ eventId, status }),
    getEventsAction(),
  ]);

  const registrations = regsRes.success && regsRes.data ? regsRes.data : [];
  const events = eventsRes.success && eventsRes.data ? eventsRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Event Registrations</h1>
          <p className="text-sm text-slate-500">
            Participant roster, ticket codes, capacity waitlists and attendance status.
          </p>
        </div>
      </div>

      <EventsNav />

      {/* Filter Bar */}
      <form className="flex gap-2" method="GET">
        <select
          name="eventId"
          defaultValue={eventId || ''}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Events</option>
          {events.map((e: any) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>
        <select
          name="status"
          defaultValue={status || ''}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Statuses</option>
          <option value="registered">Registered</option>
          <option value="attended">Attended</option>
          <option value="waitlisted">Waitlisted</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
        >
          Filter
        </button>
      </form>

      {/* Registrations Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {registrations.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No registrations found</p>
            <p className="text-xs text-slate-400 mt-1">Registrations will appear once participants sign up.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3">Event</th>
                  <th className="py-2.5 px-3">Participant Name</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Registered At</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {registrations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {r.ticket_code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {r.event?.title || 'Event'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {r.student
                          ? `${r.student.first_name} ${r.student.last_name}`
                          : r.staff
                          ? `${r.staff.first_name} ${r.staff.last_name}`
                          : r.guest_name || 'Guest'}
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
