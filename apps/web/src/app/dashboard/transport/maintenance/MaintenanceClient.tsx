'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import { addVehicleMaintenanceAction } from '../actions';
import {
  Plus,
  Loader2,
} from 'lucide-react';
import type { TransportMaintenanceType, TransportMaintenanceStatus } from '@edu-platform/types';

interface MaintenanceClientProps {
  initialRecords: any[];
  vehicles: Array<{ id: string; registration_number: string; vehicle_model: string }>;
}

export const MaintenanceClient: React.FC<MaintenanceClientProps> = ({
  initialRecords,
  vehicles,
}) => {
  const [records, setRecords] = useState(initialRecords);
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    vehicleId: vehicles[0]?.id || '',
    maintenanceType: 'routine_service' as TransportMaintenanceType,
    description: '',
    odometerReading: 25000,
    cost: 500,
    serviceCenter: '',
    startDate: new Date().toISOString().split('T')[0],
    completionDate: '',
    status: 'scheduled' as TransportMaintenanceStatus,
    performedBy: '',
    notes: '',
  });

  const handleCreateRecord = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await addVehicleMaintenanceAction(form as any);
      if (res.success && res.data) {
        setRecords((prev) => [res.data, ...prev]);
        setModalOpen(false);
      } else {
        setError(res.error || 'Failed to record maintenance');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Fleet Maintenance & Service Records</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track routine services, mechanical repairs, inspections, and odometer logs.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Schedule Service</span>
        </button>
      </div>

      <TransportNav />

      {/* Maintenance Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Vehicle</th>
              <th className="py-3 px-4">Service Type</th>
              <th className="py-3 px-4">Description</th>
              <th className="py-3 px-4">Cost</th>
              <th className="py-3 px-4">Dates</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No maintenance records logged for the fleet.
                </td>
              </tr>
            ) : (
              records.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4">
                    <span className="font-mono font-bold text-slate-900">
                      {r.vehicle?.registration_number || 'Vehicle'}
                    </span>
                    <span className="text-[11px] text-slate-400 block">
                      {r.vehicle?.vehicle_model}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-semibold text-slate-800 capitalize">
                    {r.maintenance_type?.replace('_', ' ')}
                  </td>
                  <td className="py-3 px-4 text-slate-600 max-w-xs truncate">
                    {r.description}
                  </td>
                  <td className="py-3 px-4 font-mono font-bold text-slate-900">
                    ${r.cost?.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                    {r.start_date} {r.completion_date && `→ ${r.completion_date}`}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        r.status === 'completed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : r.status === 'in_progress'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {r.status?.replace('_', ' ')}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Scheduling Maintenance */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Log Vehicle Maintenance</h2>

            {error && (
              <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateRecord} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Target Vehicle <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.vehicleId}
                  onChange={(e) => setForm({ ...form, vehicleId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white font-mono"
                >
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration_number} — {v.vehicle_model}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Type</label>
                  <select
                    value={form.maintenanceType}
                    onChange={(e) => setForm({ ...form, maintenanceType: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="routine_service">Routine Periodic Service</option>
                    <option value="repair">Mechanical / Electrical Repair</option>
                    <option value="inspection">Safety / Fitness Inspection</option>
                    <option value="emergency_breakdown">Emergency Breakdown</option>
                    <option value="tire_replacement">Tire / Wheel Replacement</option>
                    <option value="other">Other Maintenance</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Initial Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as any })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    <option value="scheduled">Scheduled</option>
                    <option value="in_progress">In Progress (Unavailable)</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Description of Work <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Brake pad replacement, engine oil change, wiper blade check..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Odometer (km)</label>
                  <input
                    type="number"
                    value={form.odometerReading}
                    onChange={(e) => setForm({ ...form, odometerReading: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Cost ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={form.cost}
                    onChange={(e) => setForm({ ...form, cost: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Service Date</label>
                  <input
                    type="date"
                    required
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Service Center / Workshop</label>
                <input
                  type="text"
                  placeholder="e.g. Authorized Tata Motors Workshop"
                  value={form.serviceCenter}
                  onChange={(e) => setForm({ ...form, serviceCenter: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
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
                  <span>Save Record</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
