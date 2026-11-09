import React from 'react';
import Link from 'next/link';
import { LibraryNav } from './LibraryNav';
import {
  getLibraryOverviewStatsAction,
  getLibraryCirculationsAction,
  getLibraryBranchesAction,
} from './actions';
import {
  BookOpen,
  ArrowRightLeft,
  Users,
  AlertTriangle,
  BookmarkCheck,
  Plus,
  Building,
} from 'lucide-react';

export default async function LibraryOverviewPage() {
  const [statsRes, circRes, branchRes] = await Promise.all([
    getLibraryOverviewStatsAction(),
    getLibraryCirculationsAction({ status: 'issued' }),
    getLibraryBranchesAction(),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    activeCirculations: 0,
    overdueCirculations: 0,
    totalMembers: 0,
    studentMembers: 0,
    staffMembers: 0,
    pendingFines: 0,
    pendingReservations: 0,
  };

  const circulations = circRes.success && circRes.data ? circRes.data.slice(0, 5) : [];
  const branches = branchRes.success && branchRes.data ? branchRes.data : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Management</h1>
          <p className="text-sm text-slate-500">
            Catalogue, barcodes, circulation desk, memberships, holds and fine policies.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/library/circulation"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            Circulation Desk
          </Link>
          <Link
            href="/dashboard/library/books/new"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-slate-700 text-xs font-semibold hover:bg-slate-50"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Book
          </Link>
        </div>
      </div>

      <LibraryNav />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Book Titles</span>
            <BookOpen className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-xl font-bold text-slate-900">{stats.totalTitles}</div>
          <span className="text-xs text-slate-400">{stats.totalCopies} physical copies</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Available</span>
            <BookmarkCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-xl font-bold text-emerald-600">{stats.availableCopies}</div>
          <span className="text-xs text-slate-400">Ready to issue</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Issued Out</span>
            <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-xl font-bold text-indigo-600">{stats.activeCirculations}</div>
          <span className="text-xs text-slate-400">In circulation</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Overdue</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-xl font-bold text-amber-600">{stats.overdueCirculations}</div>
          <span className="text-xs text-slate-400">Requires return</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Members</span>
            <Users className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-xl font-bold text-purple-600">{stats.totalMembers}</div>
          <span className="text-xs text-slate-400">{stats.studentMembers} students, {stats.staffMembers} staff</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium">Unpaid Fines</span>
            <AlertTriangle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-xl font-bold text-red-600">₹{Number(stats.pendingFines).toFixed(2)}</div>
          <span className="text-xs text-slate-400">{stats.pendingReservations} active holds</span>
        </div>
      </div>

      {/* Branches & Active Circulation */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Branches */}
        <div className="lg:col-span-1 p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-blue-600" />
              Library Branches ({branches.length})
            </h2>
          </div>
          {branches.length === 0 ? (
            <p className="text-xs text-slate-500 py-4 text-center">No branch configured yet.</p>
          ) : (
            <div className="space-y-2">
              {branches.map((b: any) => (
                <div key={b.id} className="p-3 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-slate-900">{b.name}</p>
                    <p className="text-[11px] text-slate-500">Code: {b.code} • {b.location || 'Central'}</p>
                  </div>
                  <span className="text-[11px] font-medium text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    {b.opening_hours || '9 AM - 5 PM'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Circulations */}
        <div className="lg:col-span-2 p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              Recent Circulations
            </h2>
            <Link href="/dashboard/library/circulation" className="text-xs text-blue-600 hover:underline">
              Open Circulation Desk →
            </Link>
          </div>

          {circulations.length === 0 ? (
            <p className="text-xs text-slate-500 py-6 text-center">No active book loans currently.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="py-2 px-3">Accession / Barcode</th>
                    <th className="py-2 px-3">Book Title</th>
                    <th className="py-2 px-3">Borrower</th>
                    <th className="py-2 px-3">Due Date</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {circulations.map((c: any) => (
                    <tr key={c.id} className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-3 font-mono font-medium text-slate-700">
                        {c.copy?.accession_number || 'N/A'}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-900">
                        {c.copy?.book?.title || 'Unknown Book'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">
                        {c.member?.student
                          ? `${c.member.student.first_name} ${c.member.student.last_name}`
                          : c.member?.staff
                          ? `${c.member.staff.first_name} ${c.member.staff.last_name}`
                          : c.member?.membership_number || 'Member'}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600">{c.due_date}</td>
                      <td className="py-2.5 px-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          c.status === 'issued' ? 'bg-blue-100 text-blue-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {c.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
