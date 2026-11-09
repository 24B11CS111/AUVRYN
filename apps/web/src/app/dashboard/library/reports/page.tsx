import React from 'react';
import { LibraryNav } from '../LibraryNav';
import { getLibraryOverviewStatsAction, getLibraryBooksAction, getLibraryFinesAction } from '../actions';
import { BookOpen } from 'lucide-react';

export default async function LibraryReportsPage() {
  const [statsRes, booksRes, finesRes] = await Promise.all([
    getLibraryOverviewStatsAction(),
    getLibraryBooksAction(),
    getLibraryFinesAction(),
  ]);

  const stats = statsRes.success && statsRes.data ? statsRes.data : {
    totalTitles: 0,
    totalCopies: 0,
    availableCopies: 0,
    issuedCopies: 0,
    activeCirculations: 0,
    overdueCirculations: 0,
    totalMembers: 0,
    pendingFines: 0,
  };

  const books = booksRes.success && booksRes.data ? booksRes.data : [];
  const fines = finesRes.success && finesRes.data ? finesRes.data : [];

  // Group books by category
  const categoryCounts: Record<string, number> = {};
  books.forEach((b: any) => {
    categoryCounts[b.category] = (categoryCounts[b.category] || 0) + 1;
  });

  const paidFines = fines
    .filter((f: any) => f.status === 'paid')
    .reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);

  const waivedFines = fines
    .filter((f: any) => f.status === 'waived')
    .reduce((sum: number, f: any) => sum + Number(f.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Reports & Analytics</h1>
          <p className="text-sm text-slate-500">
            Circulation health, overdue tracking, collection distribution and fine auditing.
          </p>
        </div>
      </div>

      <LibraryNav />

      {/* High-level Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Circulation Utilization</div>
          <div className="text-2xl font-bold text-slate-900">
            {stats.totalCopies > 0
              ? `${Math.round((stats.activeCirculations / stats.totalCopies) * 100)}%`
              : '0%'}
          </div>
          <span className="text-[11px] text-slate-400">
            {stats.activeCirculations} of {stats.totalCopies} copies in hand
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Overdue Rate</div>
          <div className="text-2xl font-bold text-amber-600">
            {stats.activeCirculations > 0
              ? `${Math.round((stats.overdueCirculations / stats.activeCirculations) * 100)}%`
              : '0%'}
          </div>
          <span className="text-[11px] text-slate-400">
            {stats.overdueCirculations} books overdue
          </span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Fines Collected</div>
          <div className="text-2xl font-bold text-emerald-600">
            ₹{paidFines.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">Successfully recovered</span>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-sm">
          <div className="text-xs text-slate-500 mb-1">Fines Waived</div>
          <div className="text-2xl font-bold text-slate-600">
            ₹{waivedFines.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-400">Admin granted exemptions</span>
        </div>
      </div>

      {/* Category Distribution Breakdown */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm space-y-4">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <BookOpen className="w-4 h-4 text-blue-600" />
          Catalogue Distribution by Subject & Category
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <div key={cat} className="p-3 rounded-lg border border-slate-100 bg-slate-50">
              <div className="text-xs font-semibold text-slate-800">{cat}</div>
              <div className="text-lg font-bold text-slate-900 mt-1">{count} titles</div>
              <div className="text-[10px] text-slate-500">
                {stats.totalTitles > 0 ? `${Math.round((count / stats.totalTitles) * 100)}% of catalog` : '0%'}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
