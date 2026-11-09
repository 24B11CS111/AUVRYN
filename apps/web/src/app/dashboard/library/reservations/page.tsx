import React from 'react';
import { LibraryNav } from '../LibraryNav';
import { getLibraryReservationsAction, cancelLibraryReservationAction } from '../actions';
import { BookmarkCheck } from 'lucide-react';

interface ReservationsPageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function LibraryReservationsPage({ searchParams }: ReservationsPageProps) {
  const { status } = await searchParams;

  const res = await getLibraryReservationsAction({ status: status || undefined });
  const reservations = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Book Holds & Reservations</h1>
          <p className="text-sm text-slate-500">
            Hold queues for titles currently on loan with automatic expiry windows.
          </p>
        </div>
      </div>

      <LibraryNav />

      {/* Reservations Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {reservations.length === 0 ? (
          <div className="text-center py-12">
            <BookmarkCheck className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No active book reservations</p>
            <p className="text-xs text-slate-400 mt-1">Members can place holds on issued books.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Book Title</th>
                  <th className="py-2.5 px-3">Reserved By</th>
                  <th className="py-2.5 px-3">Reserved At</th>
                  <th className="py-2.5 px-3">Expires At</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {reservations.map((r: any) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3">
                      <div className="font-semibold text-slate-900">{r.book?.title}</div>
                      <div className="text-[11px] text-slate-500">{r.book?.author}</div>
                    </td>
                    <td className="py-3 px-3">
                      <div className="font-medium text-slate-800">
                        {r.member?.student
                          ? `${r.member.student.first_name} ${r.member.student.last_name}`
                          : r.member?.staff
                          ? `${r.member.staff.first_name} ${r.member.staff.last_name}`
                          : 'Member'}
                      </div>
                      <div className="text-[11px] font-mono text-slate-500">
                        {r.member?.membership_number}
                      </div>
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.reserved_at ? r.reserved_at.split('T')[0] : '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {r.expires_at ? r.expires_at.split('T')[0] : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                          r.status === 'fulfilled'
                            ? 'bg-emerald-100 text-emerald-800'
                            : r.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {r.status === 'pending' && (
                        <form
                          action={async () => {
                            'use server';
                            await cancelLibraryReservationAction(r.id);
                          }}
                        >
                          <button
                            type="submit"
                            className="text-[11px] font-medium text-red-600 hover:text-red-800 hover:underline"
                          >
                            Cancel Hold
                          </button>
                        </form>
                      )}
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
