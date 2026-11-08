'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createTransportRouteAction, assignRouteStopsAction } from '../../actions';
import { ArrowLeft, Plus, Trash2, Loader2, MapPin } from 'lucide-react';

interface NewRouteClientProps {
  academicYears: Array<{ id: string; name: string }>;
  campuses: Array<{ id: string; name: string }>;
  vehicles: Array<{ id: string; registration_number: string; vehicle_model: string; seating_capacity: number }>;
  staff: Array<{ id: string; first_name: string; last_name: string; designation?: string }>;
  availableStops: Array<{ id: string; name: string; address?: string }>;
}

export const NewRouteClient: React.FC<NewRouteClientProps> = ({
  academicYears,
  campuses,
  vehicles,
  staff,
  availableStops,
}) => {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    routeName: '',
    routeCode: '',
    startLocation: '',
    destination: '',
    campusId: '',
    academicYearId: academicYears[0]?.id || '',
    routeType: 'both' as const,
    shift: 'morning' as const,
    assignedVehicleId: '',
    assignedDriverId: '',
    assignedAttendantId: '',
    totalDistanceKm: 15,
    estimatedDurationMins: 45,
    description: '',
  });

  const [stops, setStops] = useState<
    Array<{
      stopId: string;
      stopOrder: number;
      scheduledArrivalTime: string;
      scheduledDepartureTime: string;
      pickupAllowed: boolean;
      dropoffAllowed: boolean;
    }>
  >([]);

  const handleAddStop = () => {
    if (availableStops.length === 0 || !availableStops[0]) return;
    const nextOrder = stops.length + 1;
    setStops([
      ...stops,
      {
        stopId: availableStops[0].id,
        stopOrder: nextOrder,
        scheduledArrivalTime: '07:15',
        scheduledDepartureTime: '07:18',
        pickupAllowed: true,
        dropoffAllowed: true,
      },
    ]);
  };

  const handleRemoveStop = (idx: number) => {
    const updated = stops
      .filter((_, i) => i !== idx)
      .map((s, i) => ({ ...s, stopOrder: i + 1 }));
    setStops(updated);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!form.academicYearId) {
      setError('Please select an academic year');
      return;
    }

    startTransition(async () => {
      const res = await createTransportRouteAction(form as any);
      if (!res.success) {
        setError(res.error || 'Failed to create route');
        return;
      }

      if (stops.length > 0 && res.data) {
        await assignRouteStopsAction({
          routeId: res.data.id,
          stops,
        });
      }

      router.push('/dashboard/transport/routes');
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/transport/routes"
          className="p-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition"
        >
          <ArrowLeft className="w-4 h-4 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Create Transport Route</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Define route endpoints, assigned bus & driver, and ordered stop timings.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-red-200 bg-red-50 text-red-800 text-xs">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Core Route Details */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Route Particulars</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Route Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Sector 14 Metro - Main Campus Express"
                value={form.routeName}
                onChange={(e) => setForm({ ...form, routeName: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Route Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. RT-04A"
                value={form.routeCode}
                onChange={(e) => setForm({ ...form, routeCode: e.target.value.toUpperCase() })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 font-mono focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Starting Location <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. City Central Hub"
                value={form.startLocation}
                onChange={(e) => setForm({ ...form, startLocation: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. North University Gate"
                value={form.destination}
                onChange={(e) => setForm({ ...form, destination: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Academic Year <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={form.academicYearId}
                onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                {academicYears.map((ay) => (
                  <option key={ay.id} value={ay.id}>
                    {ay.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Campus Location
              </label>
              <select
                value={form.campusId}
                onChange={(e) => setForm({ ...form, campusId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="">All Campuses</option>
                {campuses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shift
              </label>
              <select
                value={form.shift}
                onChange={(e) => setForm({ ...form, shift: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="morning">Morning Shift</option>
                <option value="afternoon">Afternoon Shift</option>
                <option value="evening">Evening Shift</option>
                <option value="general">General All-Day</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Route Direction Type
              </label>
              <select
                value={form.routeType}
                onChange={(e) => setForm({ ...form, routeType: e.target.value as any })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="both">Both Morning Pickup & Evening Dropoff</option>
                <option value="morning_pickup">Morning Pickup Only</option>
                <option value="evening_dropoff">Evening Dropoff Only</option>
                <option value="shuttle">Continuous Campus Shuttle</option>
              </select>
            </div>
          </div>
        </div>

        {/* Vehicle & Staff Assignment */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-sm font-bold text-slate-900">Vehicle & Crew Allocation</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Vehicle
              </label>
              <select
                value={form.assignedVehicleId}
                onChange={(e) => setForm({ ...form, assignedVehicleId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white font-mono"
              >
                <option value="">Unassigned</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration_number} ({v.seating_capacity} seats)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Assigned Driver
              </label>
              <select
                value={form.assignedDriverId}
                onChange={(e) => setForm({ ...form, assignedDriverId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transport Attendant
              </label>
              <select
                value={form.assignedAttendantId}
                onChange={(e) => setForm({ ...form, assignedAttendantId: e.target.value })}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white"
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.first_name} {s.last_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Ordered Route Stops */}
        <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ordered Route Stops</h2>
              <p className="text-xs text-slate-500">
                Stops will be visited sequentially according to stop order.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddStop}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Stop</span>
            </button>
          </div>

          {stops.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl">
              <MapPin className="w-6 h-6 mx-auto text-slate-300 mb-1" />
              No stops added yet. Click &apos;Add Stop&apos; to schedule pickups.
            </div>
          ) : (
            <div className="space-y-3">
              {stops.map((s, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-wrap items-center gap-3 text-xs"
                >
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white font-bold flex items-center justify-center text-[10px]">
                    {s.stopOrder}
                  </span>

                  <div className="flex-1 min-w-[180px]">
                    <select
                      value={s.stopId}
                      onChange={(e) => {
                        const updated = [...stops];
                        if (updated[idx]) {
                          updated[idx].stopId = e.target.value;
                          setStops(updated);
                        }
                      }}
                      className="w-full px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                    >
                      {availableStops.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-mono">Arr:</span>
                    <input
                      type="text"
                      placeholder="07:15"
                      value={s.scheduledArrivalTime}
                      onChange={(e) => {
                        const updated = [...stops];
                        if (updated[idx]) {
                          updated[idx].scheduledArrivalTime = e.target.value;
                          setStops(updated);
                        }
                      }}
                      className="w-16 px-2 py-1 rounded border border-slate-200 font-mono text-center"
                    />
                  </div>

                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-slate-500 font-mono">Dep:</span>
                    <input
                      type="text"
                      placeholder="07:18"
                      value={s.scheduledDepartureTime}
                      onChange={(e) => {
                        const updated = [...stops];
                        if (updated[idx]) {
                          updated[idx].scheduledDepartureTime = e.target.value;
                          setStops(updated);
                        }
                      }}
                      className="w-16 px-2 py-1 rounded border border-slate-200 font-mono text-center"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveStop(idx)}
                    className="p-1.5 text-slate-400 hover:text-red-600 rounded transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2">
          <Link
            href="/dashboard/transport/routes"
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isPending}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
          >
            {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            <span>Save & Publish Route</span>
          </button>
        </div>
      </form>
    </div>
  );
};
