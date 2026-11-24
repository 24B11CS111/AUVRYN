'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { HostelNav } from '../HostelNav';
import { getHostelApplicationsAction, reviewHostelApplicationAction } from '../actions';
import { UserPlus, Loader2 } from 'lucide-react';

export default function HostelApplicationsPage() {
  const [applications, setApplications] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [reviewStatus, setReviewStatus] = useState<'approved' | 'rejected' | 'waitlisted'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    const res = await getHostelApplicationsAction(statusFilter || undefined);
    if (res.success && res.data) setApplications(res.data);
  }, [statusFilter]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;
    setErrorMsg(null);

    startTransition(async () => {
      const res = await reviewHostelApplicationAction({
        applicationId: selectedApp.id,
        status: reviewStatus,
        reviewNotes: reviewNotes || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to review application');
      } else {
        setSelectedApp(null);
        setReviewNotes('');
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Hostel Applications</h1>
          <p className="text-sm text-slate-500">
            Student boarding admission requests, room preferences and review decisions.
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
        {['pending', 'approved', 'waitlisted', 'rejected', ''].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === '' ? 'All Applications' : tab}
          </button>
        ))}
      </div>

      {/* Applications Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {applications.length === 0 ? (
          <div className="text-center py-12">
            <UserPlus className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No applications found</p>
            <p className="text-xs text-slate-400 mt-1">Student boarding applications will appear here.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Student</th>
                  <th className="py-2.5 px-3">Preferred Block</th>
                  <th className="py-2.5 px-3">Preferred Room</th>
                  <th className="py-2.5 px-3">Reason / Details</th>
                  <th className="py-2.5 px-3">Applied At</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {applications.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {app.student
                          ? `${app.student.first_name} ${app.student.last_name}`
                          : 'Student'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {app.student?.admission_number}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {app.preferred_building?.name || 'Any Block'}
                    </td>
                    <td className="py-3 px-3 capitalize text-slate-700">
                      {app.preferred_room_type || 'Any Room'}
                    </td>
                    <td className="py-3 px-3 text-slate-600 max-w-xs truncate">
                      {app.reason || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {app.created_at ? app.created_at.split('T')[0] : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          app.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : app.status === 'rejected'
                            ? 'bg-red-100 text-red-800'
                            : app.status === 'waitlisted'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {app.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {app.status === 'pending' && (
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="px-2.5 py-1 rounded bg-blue-600 text-white hover:bg-blue-700 text-[11px] font-medium"
                        >
                          Review
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

      {/* Review Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Review Hostel Application</h2>
            <p className="text-xs text-slate-500">
              Student:{' '}
              <span className="font-semibold text-slate-800">
                {selectedApp.student?.first_name} {selectedApp.student?.last_name}
              </span>
            </p>

            <form onSubmit={handleReview} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Decision *
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value as any)}
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approved">Approve Application</option>
                  <option value="waitlisted">Place on Waitlist</option>
                  <option value="rejected">Reject Application</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Review Notes / Comments
                </label>
                <textarea
                  rows={3}
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional review feedback..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
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
                  Save Decision
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
