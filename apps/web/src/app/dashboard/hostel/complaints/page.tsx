'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import { getHostelComplaintsAction, resolveHostelComplaintAction } from '../actions';
import { CheckCircle2, Loader2 } from 'lucide-react';

export default function HostelComplaintsPage() {
  const [complaints, setComplaints] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [selectedComplaint, setSelectedComplaint] = useState<any | null>(null);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = async () => {
    const res = await getHostelComplaintsAction({ status: statusFilter || undefined });
    if (res.success && res.data) setComplaints(res.data);
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleResolve = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedComplaint) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await resolveHostelComplaintAction({
        complaintId: selectedComplaint.id,
        status: 'resolved',
        resolutionNotes,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to resolve complaint');
      } else {
        setSelectedComplaint(null);
        setResolutionNotes('');
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Complaints & Maintenance</h1>
          <p className="text-sm text-slate-500">
            Student room repair tickets, plumbing, electrical issues and resolution auditing.
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
        {['open', 'in_progress', 'resolved', ''].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === '' ? 'All Complaints' : tab.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Complaints Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {complaints.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No complaints reported</p>
            <p className="text-xs text-slate-400 mt-1">All rooms and hostel facilities are in working condition.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Title & Issue</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">Room / Block</th>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Priority</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {complaints.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{c.title}</div>
                      <div className="text-[11px] text-slate-500 max-w-xs truncate">{c.description}</div>
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize font-medium text-slate-700">{c.category}</span>
                    </td>
                    <td className="py-3 px-3 text-slate-800">
                      {c.room ? `Room ${c.room.room_number}` : 'Common Area'}
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {c.student ? `${c.student.first_name} ${c.student.last_name}` : 'Student'}
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          c.priority === 'urgent'
                            ? 'bg-red-100 text-red-800 font-bold'
                            : c.priority === 'high'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {c.priority}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          c.status === 'resolved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {c.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {c.status !== 'resolved' && (
                        <button
                          onClick={() => setSelectedComplaint(c)}
                          className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-medium"
                        >
                          Resolve
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

      {/* Resolve Modal */}
      {selectedComplaint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Resolve Maintenance Ticket</h2>
            <p className="text-xs text-slate-500">
              Ticket: <span className="font-semibold text-slate-800">{selectedComplaint.title}</span>
            </p>

            <form onSubmit={handleResolve} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Resolution Notes *
                </label>
                <textarea
                  rows={3}
                  required
                  value={resolutionNotes}
                  onChange={(e) => setResolutionNotes(e.target.value)}
                  placeholder="Explain actions taken to resolve the problem..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedComplaint(null)}
                  className="px-3 py-1.5 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 text-white text-xs font-medium rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Mark as Resolved
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
