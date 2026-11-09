'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import {
  getHostelAllocationsAction,
  getHostelBedsAction,
  allocateHostelBedAction,
  vacateHostelBedAction,
} from '../actions';
import { BedDouble, Plus, Loader2 } from 'lucide-react';

export default function HostelAllocationsPage() {
  const [allocations, setAllocations] = useState<any[]>([]);
  const [availableBeds, setAvailableBeds] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [isAllocateModalOpen, setIsAllocateModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form states
  const [studentId, setStudentId] = useState('');
  const [bedId, setBedId] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [allocatedFrom, setAllocatedFrom] = useState<string>(
    new Date().toISOString().split('T')[0] || ''
  );

  const loadData = async () => {
    const [aRes, bRes] = await Promise.all([
      getHostelAllocationsAction({ status: statusFilter || undefined }),
      getHostelBedsAction(),
    ]);

    if (aRes.success && aRes.data) setAllocations(aRes.data);
    if (bRes.success && bRes.data) {
      setAvailableBeds(bRes.data.filter((b: any) => b.status === 'available'));
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleAllocateBed = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      const res = await allocateHostelBedAction({
        studentId,
        bedId,
        academicYearId,
        allocatedFrom,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to allocate bed');
      } else {
        setIsAllocateModalOpen(false);
        setStudentId('');
        setBedId('');
        loadData();
      }
    });
  };

  const handleVacate = (allocationId: string) => {
    if (!confirm('Are you sure you want to vacate this bed?')) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await vacateHostelBedAction({ allocationId });
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to vacate bed');
      } else {
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bed Allocations</h1>
          <p className="text-sm text-slate-500">
            Atomic student bed assignments, active leases, check-ins, and vacations.
          </p>
        </div>
        <button
          onClick={() => setIsAllocateModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Allocate Bed
        </button>
      </div>

      <HostelNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['active', 'vacated', 'transferred', ''].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === '' ? 'All Allocations' : tab}
          </button>
        ))}
      </div>

      {/* Allocations Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {allocations.length === 0 ? (
          <div className="text-center py-12">
            <BedDouble className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No allocations found</p>
            <p className="text-xs text-slate-400 mt-1">Assign a bed using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Bed #</th>
                  <th className="py-2.5 px-3">Room & Block</th>
                  <th className="py-2.5 px-3">From Date</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {allocations.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {a.student
                          ? `${a.student.first_name} ${a.student.last_name}`
                          : 'Student'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {a.student?.admission_number}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {a.bed?.bed_number}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      Room {a.bed?.room?.room_number} • {a.bed?.room?.building?.name}
                    </td>
                    <td className="py-3 px-3 text-slate-600">{a.allocated_from}</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          a.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {a.status === 'active' && (
                        <button
                          onClick={() => handleVacate(a.id)}
                          disabled={isPending}
                          className="px-2.5 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-medium"
                        >
                          Vacate Bed
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Allocate Modal */}
      {isAllocateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Allocate Hostel Bed</h2>
            <form onSubmit={handleAllocateBed} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Student ID *
                </label>
                <input
                  type="text"
                  required
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  placeholder="Enter Student UUID"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Available Bed *
                </label>
                <select
                  value={bedId}
                  onChange={(e) => setBedId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose an available bed --</option>
                  {availableBeds.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.bed_number}] Room {b.room?.room_number} ({b.room?.building?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Academic Year ID *
                </label>
                <input
                  type="text"
                  required
                  value={academicYearId}
                  onChange={(e) => setAcademicYearId(e.target.value)}
                  placeholder="Enter Academic Year UUID"
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocated From Date *
                </label>
                <input
                  type="date"
                  required
                  value={allocatedFrom}
                  onChange={(e) => setAllocatedFrom(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAllocateModalOpen(false)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Confirm Allocation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
