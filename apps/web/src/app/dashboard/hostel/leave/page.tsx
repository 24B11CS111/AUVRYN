'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import { getHostelOutpassesAction, updateHostelOutpassStatusAction } from '../actions';
import { LogOut } from 'lucide-react';

export default function HostelLeavePage() {
  const [outpasses, setOutpasses] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending_approval');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    const res = await getHostelOutpassesAction({ status: statusFilter || undefined });
    if (res.success && res.data) setOutpasses(res.data);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleUpdateStatus = (
    outpassId: string,
    newStatus: 'approved' | 'rejected' | 'departed' | 'completed'
  ) => {
    setErrorMsg(null);
    startTransition(async () => {
      const res = await updateHostelOutpassStatusAction({
        outpassId,
        status: newStatus,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update outpass');
      } else {
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Outpasses & Leave</h1>
          <p className="text-sm text-slate-500">
            Multi-tier outpass workflow with parent consent validation, warden sign-off, and security gate codes.
          </p>
        </div>
      </div>

      <HostelNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['pending_approval', 'approved', 'departed', 'returned', 'overdue', ''].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === '' ? 'All Outpasses' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Outpasses Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {outpasses.length === 0 ? (
          <div className="text-center py-12">
            <LogOut className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No outpass requests found</p>
            <p className="text-xs text-slate-400 mt-1">Student leave requests will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Gate Pass #</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Purpose & Destination</th>
                  <th className="py-2.5 px-3">Departure - Expected Return</th>
                  <th className="py-2.5 px-3">Parent Consent</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {outpasses.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-blue-700">
                      {o.gate_pass_code}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {o.student
                          ? `${o.student.first_name} ${o.student.last_name}`
                          : 'Student'}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        {o.emergency_contact}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">{o.purpose}</div>
                      <div className="text-[11px] text-slate-500">{o.destination}</div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      <div>Dep: {o.departure_time?.split('T')[0]} {o.departure_time?.split('T')[1]?.slice(0, 5)}</div>
                      <div className="text-[11px] text-slate-400">
                        Ret: {o.expected_return_time?.split('T')[0]} {o.expected_return_time?.split('T')[1]?.slice(0, 5)}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          o.parent_consent_status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.parent_consent_status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {o.parent_consent_status}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          o.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : o.status === 'departed'
                            ? 'bg-indigo-100 text-indigo-800'
                            : o.status === 'overdue'
                            ? 'bg-red-100 text-red-800'
                            : o.status === 'returned'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {o.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {o.status === 'pending_approval' && (
                          <>
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'approved')}
                              disabled={isPending}
                              className="px-2 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleUpdateStatus(o.id, 'rejected')}
                              disabled={isPending}
                              className="px-2 py-1 rounded border border-red-200 text-red-600 hover:bg-red-50 text-[11px] font-medium"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {o.status === 'approved' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'departed')}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded bg-indigo-600 text-white hover:bg-indigo-700 text-[11px] font-medium"
                          >
                            Mark Departed
                          </button>
                        )}
                        {o.status === 'departed' && (
                          <button
                            onClick={() => handleUpdateStatus(o.id, 'completed')}
                            disabled={isPending}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-medium"
                          >
                            Mark Returned
                          </button>
                        )}
                      </div>
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
