'use client';

import React, { useState, useTransition } from 'react';
import { TransportNav } from '../TransportNav';
import {
  assignStudentTransportAction,
  updateStudentTransportStatusAction,
} from '../actions';
import {
  Plus,
  Search,
  Loader2,
} from 'lucide-react';
import type { StudentTransportStatus } from '@edu-platform/types';

interface AssignmentsClientProps {
  initialAssignments: any[];
  students: Array<{ id: string; first_name: string; last_name: string; admission_number: string }>;
  routes: Array<{ id: string; route_name: string; route_code: string; assigned_vehicle?: any }>;
  stops: Array<{ id: string; name: string }>;
  academicYears: Array<{ id: string; name: string }>;
  feeStructures: Array<{ id: string; name: string; total_amount: number }>;
}

export const AssignmentsClient: React.FC<AssignmentsClientProps> = ({
  initialAssignments,
  students,
  routes,
  stops,
  academicYears,
  feeStructures,
}) => {
  const [assignments, setAssignments] = useState(initialAssignments);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    studentId: students[0]?.id || '',
    academicYearId: academicYears[0]?.id || '',
    routeId: routes[0]?.id || '',
    pickupStopId: stops[0]?.id || '',
    dropoffStopId: stops[0]?.id || '',
    feeStructureId: '',
    notes: '',
  });

  const filtered = assignments.filter((a) => {
    const studentName = `${a.student?.first_name} ${a.student?.last_name}`.toLowerCase();
    const adm = a.student?.admission_number?.toLowerCase() || '';
    const route = a.route?.route_name?.toLowerCase() || '';
    return studentName.includes(search.toLowerCase()) || adm.includes(search.toLowerCase()) || route.includes(search.toLowerCase());
  });

  const handleAssign = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const res = await assignStudentTransportAction(form as any);
      if (res.success) {
        setModalOpen(false);
        // Refresh page or optimistic update
        window.location.reload();
      } else {
        setError(res.error || 'Failed to assign student to route');
      }
    });
  };

  const handleStatusChange = (id: string, status: StudentTransportStatus) => {
    startTransition(async () => {
      const res = await updateStudentTransportStatusAction(id, status);
      if (res.success) {
        setAssignments((prev) =>
          prev.map((a) => (a.id === id ? { ...a, status } : a))
        );
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Student Transport Assignments</h1>
          <p className="text-xs text-slate-500 mt-1">
            Allocate students to routes and stops with seating capacity enforcement.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-900 text-white hover:bg-slate-800 transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Transport Enrollment</span>
        </button>
      </div>

      <TransportNav />

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Search by student name, admission no, or route..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 bg-white focus:outline-hidden focus:ring-2 focus:ring-slate-900/10"
        />
      </div>

      {/* Assignments Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full text-xs text-left">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-4">Student</th>
              <th className="py-3 px-4">Route</th>
              <th className="py-3 px-4">Pickup Stop</th>
              <th className="py-3 px-4">Drop-off Stop</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No student transport assignments found.
                </td>
              </tr>
            ) : (
              filtered.map((a) => (
                <tr key={a.id} className="hover:bg-slate-50/50 transition">
                  <td className="py-3 px-4">
                    <div className="font-bold text-slate-900">
                      {a.student?.first_name} {a.student?.last_name}
                    </div>
                    <div className="text-[11px] font-mono text-slate-400">
                      Adm: {a.student?.admission_number}
                    </div>
                  </td>
                  <td className="py-3 px-4">
                    <span className="font-semibold text-slate-800">
                      {a.route?.route_name || a.route?.route_code}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {a.pickup_stop?.name || 'Default Stop'}
                  </td>
                  <td className="py-3 px-4 text-slate-600">
                    {a.dropoff_stop?.name || 'Default Stop'}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : a.status === 'suspended'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {a.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-right">
                    <select
                      disabled={isPending}
                      value={a.status}
                      onChange={(e) => handleStatusChange(a.id, e.target.value as any)}
                      className="text-[11px] px-2 py-1 rounded border border-slate-200 bg-white"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="withdrawn">Withdrawn</option>
                    </select>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* New Assignment Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-bold text-slate-900">Enroll Student in Transport</h2>

            {error && (
              <div className="p-2.5 rounded-lg border border-red-200 bg-red-50 text-red-800 text-[11px]">
                {error}
              </div>
            )}

            <form onSubmit={handleAssign} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Select Student <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.studentId}
                  onChange={(e) => setForm({ ...form, studentId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name} ({st.admission_number})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.academicYearId}
                  onChange={(e) => setForm({ ...form, academicYearId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {academicYears.map((ay) => (
                    <option key={ay.id} value={ay.id}>
                      {ay.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Transport Route <span className="text-red-500">*</span>
                </label>
                <select
                  required
                  value={form.routeId}
                  onChange={(e) => setForm({ ...form, routeId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  {routes.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.route_name} ({r.route_code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Pickup Stop <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.pickupStopId}
                    onChange={(e) => setForm({ ...form, pickupStopId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {stops.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Drop-off Stop <span className="text-red-500">*</span>
                  </label>
                  <select
                    required
                    value={form.dropoffStopId}
                    onChange={(e) => setForm({ ...form, dropoffStopId: e.target.value })}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                  >
                    {stops.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Approved Transport Fee Structure (Optional)
                </label>
                <select
                  value={form.feeStructureId}
                  onChange={(e) => setForm({ ...form, feeStructureId: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white"
                >
                  <option value="">No fee structure link</option>
                  {feeStructures.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name} (Amount: {f.total_amount})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-400 mt-1">
                  Note: Transport fee assignments are managed in accordance with the fee governance policy.
                </p>
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
                  <span>Enroll in Route</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
