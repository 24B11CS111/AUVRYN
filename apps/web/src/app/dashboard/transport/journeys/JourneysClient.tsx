'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import {
  createDailyJourneysAction,
  updateJourneyStatusAction,
} from '../actions';
import {
  CalendarDays,
  Play,
  CheckCircle2,
  ShieldAlert,
  Loader2,
  Calendar,
} from 'lucide-react';

interface JourneysClientProps {
  initialJourneys: any[];
}

export const JourneysClient: React.FC<JourneysClientProps> = ({ initialJourneys }) => {
  const [journeys, setJourneys] = useState(initialJourneys);
  const [isPending, startTransition] = useTransition();
  const [selectedJourney, setSelectedJourney] = useState<any | null>(null);
  const [delayModalOpen, setDelayModalOpen] = useState(false);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const [delayMinutes, setDelayMinutes] = useState(15);
  const [delayReason, setDelayReason] = useState('Heavy traffic congestion');
  const [emergencyReason, setEmergencyReason] = useState('');

  const handleDispatchDaily = () => {
    startTransition(async () => {
      const res = await createDailyJourneysAction();
      if (res.success) {
        window.location.reload();
      }
    });
  };

  const handleStatusChange = (journeyId: string, newStatus: any) => {
    startTransition(async () => {
      const res = await updateJourneyStatusAction({
        journeyId,
        newStatus,
      });
      if (res.success) {
        setJourneys((prev) =>
          prev.map((j) => (j.id === journeyId ? { ...j, status: newStatus } : j))
        );
      }
    });
  };

  const handleReportDelay = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJourney) return;

    startTransition(async () => {
      const res = await updateJourneyStatusAction({
        journeyId: selectedJourney.id,
        newStatus: 'delayed',
        delayMinutes,
        delayReason,
      });
      if (res.success) {
        setJourneys((prev) =>
          prev.map((j) =>
            j.id === selectedJourney.id
              ? { ...j, status: 'delayed', delay_minutes: delayMinutes, delay_reason: delayReason }
              : j
          )
        );
        setDelayModalOpen(false);
      }
    });
  };

  const handleReportEmergency = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedJourney) return;

    startTransition(async () => {
      const res = await updateJourneyStatusAction({
        journeyId: selectedJourney.id,
        newStatus: 'emergency',
        emergencyReason,
      });
      if (res.success) {
        setJourneys((prev) =>
          prev.map((j) =>
            j.id === selectedJourney.id ? { ...j, status: 'emergency', emergency_reason: emergencyReason } : j
          )
        );
        setEmergencyModalOpen(false);
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Daily Journey Dispatch Board</h1>
          <p className="text-xs text-slate-500 mt-1">
            Real-time journey lifecycle, delay notices, schedule adherence, and emergency escalations.
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleDispatchDaily}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
        >
          {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Calendar className="w-3.5 h-3.5" />}
          <span>Generate Today&apos;s Journeys</span>
        </button>
      </div>

      <TransportNav />

      {/* Journeys List */}
      <div className="space-y-3">
        {journeys.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white text-slate-400 text-xs">
            <CalendarDays className="w-8 h-8 mx-auto text-slate-300 mb-2" />
            No journeys scheduled for today. Click &apos;Generate Today&apos;s Journeys&apos; to dispatch active routes.
          </div>
        ) : (
          journeys.map((j) => {
            const isLive = j.status === 'in_progress';
            const isDelayed = j.status === 'delayed';
            const isEmergency = j.status === 'emergency';
            const isCompleted = j.status === 'completed';

            return (
              <div
                key={j.id}
                className={`p-5 rounded-2xl border bg-white shadow-xs space-y-3 transition ${
                  isEmergency
                    ? 'border-red-300 bg-red-50/20'
                    : isDelayed
                    ? 'border-amber-200'
                    : 'border-slate-200'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        isLive
                          ? 'bg-emerald-500 animate-pulse'
                          : isDelayed
                          ? 'bg-amber-500'
                          : isEmergency
                          ? 'bg-red-600 animate-ping'
                          : isCompleted
                          ? 'bg-slate-300'
                          : 'bg-blue-400'
                      }`}
                    />
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">
                        {j.route?.route_name || 'Route'} ({j.route?.route_code})
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Shift: <span className="capitalize font-semibold">{j.shift}</span> • Type:{' '}
                        <span className="capitalize font-semibold">{j.journey_type}</span> • Date:{' '}
                        <span className="font-mono">{j.journey_date}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isLive
                          ? 'bg-emerald-100 text-emerald-800'
                          : isDelayed
                          ? 'bg-amber-100 text-amber-800'
                          : isEmergency
                          ? 'bg-red-100 text-red-800'
                          : isCompleted
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-blue-50 text-blue-700'
                      }`}
                    >
                      {j.status.toUpperCase()}
                    </span>

                    {/* Operational Controls */}
                    {j.status === 'scheduled' && (
                      <button
                        type="button"
                        onClick={() => handleStatusChange(j.id, 'in_progress')}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Play className="w-3 h-3" />
                        <span>Start</span>
                      </button>
                    )}

                    {(isLive || isDelayed) && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJourney(j);
                            setDelayModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100"
                        >
                          Report Delay
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedJourney(j);
                            setEmergencyModalOpen(true);
                          }}
                          className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-red-300 bg-red-50 text-red-700 hover:bg-red-100"
                        >
                          Emergency
                        </button>
                        <button
                          type="button"
                          onClick={() => handleStatusChange(j.id, 'completed')}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-900 text-white hover:bg-slate-800"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                          <span>End</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Details Bar */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs bg-slate-50/75 p-3 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Assigned Bus</span>
                    <span className="font-mono font-bold text-slate-800">
                      {j.vehicle?.registration_number || 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Driver</span>
                    <span className="font-semibold text-slate-800">
                      {j.driver ? `${j.driver.first_name} ${j.driver.last_name}` : 'Unassigned'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Timings</span>
                    <span className="font-mono text-slate-700">
                      {j.actual_start_time
                        ? `Started: ${new Date(j.actual_start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                        : 'Scheduled: 07:30'}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-medium">Delay Status</span>
                    <span
                      className={`font-semibold ${
                        j.delay_minutes > 0 ? 'text-amber-600' : 'text-slate-700'
                      }`}
                    >
                      {j.delay_minutes > 0 ? `+${j.delay_minutes} min delay` : 'On Time'}
                    </span>
                  </div>
                </div>

                {isEmergency && j.emergency_reason && (
                  <div className="p-3 rounded-xl border border-red-300 bg-red-50 text-red-900 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold">Emergency Active:</span> {j.emergency_reason}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Delay Modal */}
      {delayModalOpen && selectedJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">
              Report Delay — {selectedJourney.route?.route_name}
            </h2>

            <form onSubmit={handleReportDelay} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Estimated Delay (Minutes)</label>
                <input
                  type="number"
                  min="1"
                  max="180"
                  required
                  value={delayMinutes}
                  onChange={(e) => setDelayMinutes(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Delay</label>
                <textarea
                  rows={2}
                  required
                  value={delayReason}
                  onChange={(e) => setDelayReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <p className="text-[11px] text-slate-500">
                This will automatically send delay alerts to all parents whose students are assigned to this route.
              </p>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDelayModalOpen(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-amber-600 text-white font-semibold hover:bg-amber-700"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Broadcast Delay</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Emergency Modal */}
      {emergencyModalOpen && selectedJourney && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-red-300 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-red-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-600" />
              <span>Report Route Emergency</span>
            </h2>

            <form onSubmit={handleReportEmergency} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Emergency Description & Immediate Needs
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Mechanical breakdown, road blockage, accident, or medical incident..."
                  value={emergencyReason}
                  onChange={(e) => setEmergencyReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-red-200"
                />
              </div>

              <div className="p-3 rounded-xl bg-red-50 text-red-800 text-[11px] space-y-1">
                <p className="font-bold">Urgent Escalation Notice:</p>
                <p>
                  Urgent priority emergency notifications will be dispatched to all transport administrators and parents of passenger students.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEmergencyModalOpen(false)}
                  className="px-3 py-1.5 font-semibold text-slate-600 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-red-600 text-white font-semibold hover:bg-red-700"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  <span>Trigger Emergency Protocol</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
