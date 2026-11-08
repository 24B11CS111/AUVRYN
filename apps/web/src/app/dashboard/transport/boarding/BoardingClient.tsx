'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import {
  recordStudentBoardingAction,
  correctBoardingEventAction,
} from '../actions';
import {
  CheckCircle2,
  QrCode,
  Search,
  Loader2,
  FileEdit,
} from 'lucide-react';
import type { BoardingEventType, BoardingVerificationMethod } from '@edu-platform/types';

interface BoardingClientProps {
  initialEvents: any[];
  activeJourneys: any[];
  students: Array<{ id: string; first_name: string; last_name: string; admission_number: string }>;
  stops: Array<{ id: string; name: string }>;
}

export const BoardingClient: React.FC<BoardingClientProps> = ({
  initialEvents,
  activeJourneys,
  students,
  stops,
}) => {
  const [events, setEvents] = useState(initialEvents);
  const [search, setSearch] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Quick Verification Form
  const [journeyId, setJourneyId] = useState(activeJourneys[0]?.id || '');
  const [studentId, setStudentId] = useState(students[0]?.id || '');
  const [stopId, setStopId] = useState(stops[0]?.id || '');
  const [eventType, setEventType] = useState<BoardingEventType>('pickup');
  const [verificationMethod] = useState<BoardingVerificationMethod>('driver_manual');

  // Correction Modal
  const [correctionModalOpen, setCorrectionModalOpen] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [correctionReason, setCorrectionReason] = useState('');

  const filtered = events.filter((e) => {
    const studentName = `${e.student?.first_name} ${e.student?.last_name}`.toLowerCase();
    const adm = e.student?.admission_number?.toLowerCase() || '';
    return studentName.includes(search.toLowerCase()) || adm.includes(search.toLowerCase());
  });

  const handleRecordBoarding = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!journeyId) {
      setError('No active journey selected. Make sure a journey is in progress.');
      return;
    }

    startTransition(async () => {
      const res = await recordStudentBoardingAction({
        journeyId,
        studentId,
        stopId,
        eventType,
        verificationMethod,
      });

      if (res.success) {
        window.location.reload();
      } else {
        setError(res.error || 'Failed to record boarding event');
      }
    });
  };

  const handleCorrectEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;

    startTransition(async () => {
      const res = await correctBoardingEventAction({
        eventId: selectedEventId,
        correctionReason,
      });

      if (res.success) {
        setEvents((prev) =>
          prev.map((ev) =>
            ev.id === selectedEventId
              ? { ...ev, is_corrected: true, correction_reason: correctionReason }
              : ev
          )
        );
        setCorrectionModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Boarding & Drop-Off Verification</h1>
          <p className="text-xs text-slate-500 mt-1">
            Verification terminal with QR/manual confirmation, duplicate protection, and audit corrections.
          </p>
        </div>
      </div>

      <TransportNav />

      {error && (
        <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs">
          {error}
        </div>
      )}

      {/* Verification Terminal Form */}
      <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <QrCode className="w-4 h-4 text-indigo-600" />
          <span>Quick Verification Terminal</span>
        </h2>

        <form onSubmit={handleRecordBoarding} className="grid grid-cols-1 sm:grid-cols-5 gap-3 text-xs items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Active Journey</label>
            <select
              value={journeyId}
              onChange={(e) => setJourneyId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              {activeJourneys.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.route?.route_name || j.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Student</label>
            <select
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              {students.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.first_name} {st.last_name} ({st.admission_number})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Stop</label>
            <select
              value={stopId}
              onChange={(e) => setStopId(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              {stops.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Event Type</label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
            >
              <option value="pickup">Pickup (Boarded Bus)</option>
              <option value="dropoff">Drop-Off (Safely Alighted)</option>
            </select>
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center justify-center gap-1 px-4 py-2 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Confirm Event</span>
          </button>
        </form>
      </div>

      {/* Events Log Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">Verified Boarding Feed</h2>
          <div className="relative w-64">
            <Search className="absolute left-2.5 top-2 w-3.5 h-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search student name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1 text-xs rounded-lg border border-slate-200 bg-white"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Student</th>
                <th className="py-3 px-4">Event</th>
                <th className="py-3 px-4">Stop</th>
                <th className="py-3 px-4">Method</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4">Status / Audit</th>
                <th className="py-3 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No boarding events recorded for this session.
                  </td>
                </tr>
              ) : (
                filtered.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-50/50 transition">
                    <td className="py-3 px-4">
                      <span className="font-bold text-slate-900">
                        {ev.student?.first_name} {ev.student?.last_name}
                      </span>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        {ev.student?.admission_number}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                          ev.event_type === 'pickup'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {ev.event_type === 'pickup' ? 'PICKUP' : 'DROP-OFF'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{ev.stop?.name || 'Stop'}</td>
                    <td className="py-3 px-4 capitalize text-slate-500 font-mono text-[11px]">
                      {ev.verification_method?.replace('_', ' ')}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600">
                      {new Date(ev.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-4">
                      {ev.is_corrected ? (
                        <span className="text-amber-700 font-semibold text-[10px] bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Corrected: {ev.correction_reason}
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[10px] flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Verified</span>
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      {!ev.is_corrected && (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedEventId(ev.id);
                            setCorrectionModalOpen(true);
                          }}
                          className="text-[11px] text-slate-600 hover:text-slate-900 flex items-center gap-1 ml-auto"
                        >
                          <FileEdit className="w-3 h-3" />
                          <span>Correct</span>
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Correction Modal */}
      {correctionModalOpen && selectedEventId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Audit Correction for Boarding Event</h2>

            <form onSubmit={handleCorrectEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Reason for Correction (Audited)
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Scanned wrong student card by mistake; student was marked absent by parent..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setCorrectionModalOpen(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Save Correction</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
