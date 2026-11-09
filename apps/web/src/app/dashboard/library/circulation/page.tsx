'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { LibraryNav } from '../LibraryNav';
import {
  getLibraryCirculationsAction,
  getLibraryCopiesAction,
  getLibraryMembersAction,
  issueLibraryBookAction,
  returnLibraryBookAction,
  renewLibraryBookAction,
} from '../actions';
import {
  ArrowRightLeft,
  Plus,
  Loader2,
} from 'lucide-react';

export default function CirculationDeskPage() {
  const [circulations, setCirculations] = useState<any[]>([]);
  const [copies, setCopies] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('issued');
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  // Issue modal fields
  const [selectedCopyId, setSelectedCopyId] = useState('');
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [loanDays, setLoanDays] = useState(14);

  const loadData = async () => {
    const [cRes, cpRes, mRes] = await Promise.all([
      getLibraryCirculationsAction({ status: statusFilter || undefined }),
      getLibraryCopiesAction(),
      getLibraryMembersAction(),
    ]);

    if (cRes.success && cRes.data) setCirculations(cRes.data);
    if (cpRes.success && cpRes.data) setCopies(cpRes.data.filter((c: any) => c.status === 'available'));
    if (mRes.success && mRes.data) setMembers(mRes.data.filter((m: any) => m.status === 'active'));
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const handleIssueBook = (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);

    startTransition(async () => {
      const res = await issueLibraryBookAction({
        copyId: selectedCopyId,
        memberId: selectedMemberId,
        loanDurationDays: Number(loanDays),
      });

      if (!res.success) {
        setActionError(res.error || 'Failed to issue book');
      } else {
        setIsIssueModalOpen(false);
        setSelectedCopyId('');
        setSelectedMemberId('');
        loadData();
      }
    });
  };

  const handleReturnBook = (circId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await returnLibraryBookAction({
        circulationId: circId,
        condition: 'good',
      });

      if (!res.success) {
        setActionError(res.error || 'Failed to return book');
      } else {
        loadData();
      }
    });
  };

  const handleRenewBook = (circId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await renewLibraryBookAction({
        circulationId: circId,
        extensionDays: 14,
      });

      if (!res.success) {
        setActionError(res.error || 'Failed to renew loan');
      } else {
        loadData();
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Circulation Desk</h1>
          <p className="text-sm text-slate-500">
            Issue books, process returns with condition inspection, and apply fine rules.
          </p>
        </div>
        <button
          onClick={() => setIsIssueModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Issue Book
        </button>
      </div>

      <LibraryNav />

      {actionError && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {actionError}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['issued', 'returned', 'overdue', ''].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === '' ? 'All Records' : tab}
          </button>
        ))}
      </div>

      {/* Circulations Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {circulations.length === 0 ? (
          <div className="text-center py-12">
            <ArrowRightLeft className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No circulation transactions found</p>
            <p className="text-xs text-slate-400 mt-1">Issue a book using the button above.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Accession / Barcode</th>
                  <th className="py-2.5 px-3">Title</th>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Issued Date</th>
                  <th className="py-2.5 px-3">Due Date</th>
                  <th className="py-2.5 px-3">Renewals</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {circulations.map((c) => {
                  const isOverdue =
                    c.status === 'issued' &&
                    new Date(c.due_date).getTime() < new Date().setHours(0, 0, 0, 0);

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-medium text-slate-800">
                        {c.copy?.accession_number}
                      </td>
                      <td className="py-3 px-3 font-medium text-slate-900">
                        {c.copy?.book?.title}
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-slate-900 font-medium">
                          {c.member?.student
                            ? `${c.member.student.first_name} ${c.member.student.last_name}`
                            : c.member?.staff
                            ? `${c.member.staff.first_name} ${c.member.staff.last_name}`
                            : 'Library Member'}
                        </div>
                        <div className="text-[11px] font-mono text-slate-500">
                          {c.member?.membership_number} ({c.member?.member_type})
                        </div>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {c.issued_at ? c.issued_at.split('T')[0] : '—'}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`font-medium ${
                            isOverdue ? 'text-red-600 font-bold' : 'text-slate-700'
                          }`}
                        >
                          {c.due_date}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-slate-600">
                        {c.renewal_count} / {c.max_renewals}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            c.status === 'returned'
                              ? 'bg-slate-100 text-slate-700'
                              : isOverdue
                              ? 'bg-red-100 text-red-800'
                              : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {isOverdue && c.status === 'issued' ? 'OVERDUE' : c.status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {c.status === 'issued' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleRenewBook(c.id)}
                              disabled={isPending || c.renewal_count >= c.max_renewals}
                              title="Renew loan"
                              className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 text-[11px] font-medium disabled:opacity-40"
                            >
                              Renew
                            </button>
                            <button
                              onClick={() => handleReturnBook(c.id)}
                              disabled={isPending}
                              className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-medium disabled:opacity-50"
                            >
                              Return
                            </button>
                          </div>
                        )}
                        {c.status === 'returned' && (
                          <span className="text-[11px] text-slate-400">
                            Returned on {c.returned_at?.split('T')[0]}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Book Modal */}
      {isIssueModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">Issue Book to Member</h2>
            <form onSubmit={handleIssueBook} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Book Copy *
                </label>
                <select
                  value={selectedCopyId}
                  onChange={(e) => setSelectedCopyId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose an available book copy --</option>
                  {copies.map((cp) => (
                    <option key={cp.id} value={cp.id}>
                      [{cp.accession_number}] {cp.book?.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select Member *
                </label>
                <select
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Choose registered member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      [{m.membership_number}] {m.student ? `${m.student.first_name} ${m.student.last_name}` : m.staff ? `${m.staff.first_name} ${m.staff.last_name}` : 'Member'} ({m.member_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Loan Duration (Days) *
                </label>
                <input
                  type="number"
                  min={1}
                  max={90}
                  value={loanDays}
                  onChange={(e) => setLoanDays(Number(e.target.value))}
                  required
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsIssueModalOpen(false)}
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
                  Confirm Issue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
