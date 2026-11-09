'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { EventsNav } from '../EventsNav';
import {
  getEventsAction,
  getEventRegistrationsAction,
  recordEventAttendanceAction,
} from '../actions';
import { CheckCircle2, Search } from 'lucide-react';

export default function EventAttendancePage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [searchTicket, setSearchTicket] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getEventsAction({ status: 'published' });
      if (res.success && res.data) {
        setEvents(res.data);
        if (res.data.length > 0) {
          setSelectedEventId(res.data[0].id);
        }
      }
    })();
  }, []);

  const loadRegistrations = async () => {
    if (!selectedEventId) return;
    const res = await getEventRegistrationsAction({ eventId: selectedEventId });
    if (res.success && res.data) setRegistrations(res.data);
  };

  useEffect(() => {
    loadRegistrations();
  }, [selectedEventId]);

  const handleCheckIn = (registrationId: string) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await recordEventAttendanceAction({ registrationId });
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to check in participant');
      } else {
        loadRegistrations();
      }
    });
  };

  const filtered = registrations.filter((r) => {
    if (!searchTicket) return true;
    return (
      r.ticket_code.toLowerCase().includes(searchTicket.toLowerCase()) ||
      (r.student &&
        `${r.student.first_name} ${r.student.last_name}`
          .toLowerCase()
          .includes(searchTicket.toLowerCase())) ||
      (r.guest_name && r.guest_name.toLowerCase().includes(searchTicket.toLowerCase()))
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Check-in Attendance Desk</h1>
          <p className="text-sm text-slate-500">
            Verify entrance ticket codes and log real-time attendee admissions.
          </p>
        </div>
      </div>

      <EventsNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Select Event & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <select
          value={selectedEventId}
          onChange={(e) => setSelectedEventId(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 sm:w-72"
        >
          {events.map((e) => (
            <option key={e.id} value={e.id}>
              {e.title}
            </option>
          ))}
        </select>

        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            value={searchTicket}
            onChange={(e) => setSearchTicket(e.target.value)}
            placeholder="Scan / type ticket code or attendee name..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
          />
        </div>
      </div>

      {/* Roster Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No matching tickets found</p>
            <p className="text-xs text-slate-400 mt-1">Verify event selection or search query.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Ticket Code</th>
                  <th className="py-2.5 px-3">Attendee</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {r.ticket_code}
                    </td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {r.student
                        ? `${r.student.first_name} ${r.student.last_name}`
                        : r.staff
                        ? `${r.staff.first_name} ${r.staff.last_name}`
                        : r.guest_name || 'Guest'}
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-600">
                      {r.participant_category}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          r.status === 'attended'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.status !== 'attended' && (
                        <button
                          onClick={() => handleCheckIn(r.id)}
                          disabled={isPending}
                          className="px-3 py-1 bg-emerald-600 text-white rounded text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50"
                        >
                          Check In
                        </button>
                      )}
                      {r.status === 'attended' && (
                        <span className="text-emerald-600 font-semibold text-xs flex items-center justify-end gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Admitted
                        </span>
                      )}
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
