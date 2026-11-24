'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { LibraryNav } from '../LibraryNav';
import {
  getLibraryFinesAction,
  payLibraryFineAction,
  waiveLibraryFineAction,
} from '../actions';
import {
  CheckCircle2,
  Loader2,
} from 'lucide-react';

export default function LibraryFinesPage() {
  const [fines, setFines] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [selectedFine, setSelectedFine] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'pay' | 'waive' | null>(null);
  const [waiverReason, setWaiverReason] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadFines = useCallback(async () => {
    const res = await getLibraryFinesAction({ status: statusFilter || undefined });
    if (res.success && res.data) setFines(res.data);
  }, [statusFilter]);

  useEffect(() => {
    loadFines();
  }, [loadFines]);

  const handleConfirmAction = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    startTransition(async () => {
      if (actionType === 'pay') {
        const res = await payLibraryFineAction({
          fineId: selectedFine.id,
          paymentMethod: 'cash',
          notes: paymentNotes || undefined,
        });
        if (!res.success) setErrorMsg(res.error || 'Payment failed');
        else {
          setSelectedFine(null);
          setActionType(null);
          loadFines();
        }
      } else if (actionType === 'waive') {
        const res = await waiveLibraryFineAction({
          fineId: selectedFine.id,
          waiverReason: waiverReason || 'Administrative waiver',
        });
        if (!res.success) setErrorMsg(res.error || 'Waiver failed');
        else {
          setSelectedFine(null);
          setActionType(null);
          loadFines();
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Fines & Penalties</h1>
          <p className="text-sm text-slate-500">
            Overdue day rates, lost or damaged book penalties, payments and administrative waivers.
          </p>
        </div>
      </div>

      <LibraryNav />

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
          {errorMsg}
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        {['pending', 'paid', 'waived', ''].map((tab) => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${
              statusFilter === tab
                ? 'bg-slate-900 text-white'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            {tab === '' ? 'All Fines' : tab}
          </button>
        ))}
      </div>

      {/* Fines Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {fines.length === 0 ? (
          <div className="text-center py-12">
            <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No fine records found</p>
            <p className="text-xs text-slate-400 mt-1">All library members are in good standing.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Member</th>
                  <th className="py-2.5 px-3">Book Title / Copy</th>
                  <th className="py-2.5 px-3">Reason</th>
                  <th className="py-2.5 px-3">Amount</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Receipt / Details</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fines.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">
                        {f.member?.student
                          ? `${f.member.student.first_name} ${f.member.student.last_name}`
                          : f.member?.staff
                          ? `${f.member.staff.first_name} ${f.member.staff.last_name}`
                          : 'Member'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {f.member?.membership_number}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {f.circulation?.copy?.book?.title || 'General / Library Item'}
                    </td>
                    <td className="py-3 px-3">
                      <span className="capitalize font-medium text-slate-700">
                        {f.reason.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-bold text-red-600">
                      ₹{Number(f.amount).toFixed(2)}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          f.status === 'paid'
                            ? 'bg-emerald-100 text-emerald-800'
                            : f.status === 'waived'
                            ? 'bg-slate-100 text-slate-700'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {f.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 font-mono text-[11px] text-slate-500">
                      {f.receipt_number || f.waiver_reason || '—'}
                    </td>
                    <td className="py-3 px-3 text-right">
                      {f.status === 'pending' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => {
                              setSelectedFine(f);
                              setActionType('pay');
                            }}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white hover:bg-emerald-700 text-[11px] font-medium"
                          >
                            Collect Fine
                          </button>
                          <button
                            onClick={() => {
                              setSelectedFine(f);
                              setActionType('waive');
                            }}
                            className="px-2 py-1 rounded border border-slate-200 text-slate-700 hover:bg-slate-50 text-[11px] font-medium"
                          >
                            Waive
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pay / Waive Modal */}
      {selectedFine && actionType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm p-6 rounded-xl bg-white shadow-xl space-y-4">
            <h2 className="text-base font-bold text-slate-900">
              {actionType === 'pay' ? 'Collect Fine Payment' : 'Waive Fine'}
            </h2>
            <p className="text-xs text-slate-500">
              Fine Amount:{' '}
              <span className="font-bold text-slate-900">
                ₹{Number(selectedFine.amount).toFixed(2)}
              </span>
            </p>

            <form onSubmit={handleConfirmAction} className="space-y-3">
              {actionType === 'pay' ? (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Receipt / Payment Remarks
                  </label>
                  <input
                    type="text"
                    value={paymentNotes}
                    onChange={(e) => setPaymentNotes(e.target.value)}
                    placeholder="Optional notes or transaction ID"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Waiver Reason *
                  </label>
                  <input
                    type="text"
                    required
                    value={waiverReason}
                    onChange={(e) => setWaiverReason(e.target.value)}
                    placeholder="e.g. Principal special exemption, medical leave"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFine(null);
                    setActionType(null);
                  }}
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
                  Confirm
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
