import React from 'react';
import { LibraryNav } from '../LibraryNav';
import { getLibraryMembersAction } from '../actions';
import { Users, Search } from 'lucide-react';

interface MembersPageProps {
  searchParams: Promise<{ query?: string; memberType?: 'student' | 'staff' }>;
}

export default async function LibraryMembersPage({ searchParams }: MembersPageProps) {
  const { query, memberType } = await searchParams;

  const res = await getLibraryMembersAction({ query, memberType });
  const members = res.success && res.data ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Library Members</h1>
          <p className="text-sm text-slate-500">
            Student and faculty library accounts, circulation allowances, and digital card barcodes.
          </p>
        </div>
      </div>

      <LibraryNav />

      {/* Filter Bar */}
      <form className="flex gap-2" method="GET">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            name="query"
            defaultValue={query}
            placeholder="Search by membership # or barcode..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          name="memberType"
          defaultValue={memberType || ''}
          className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">All Member Types</option>
          <option value="student">Students</option>
          <option value="staff">Staff / Faculty</option>
        </select>
        <button
          type="submit"
          className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
        >
          Search
        </button>
      </form>

      {/* Members Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No library members registered</p>
            <p className="text-xs text-slate-400 mt-1">Enroll students and staff to library memberships.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Membership #</th>
                  <th className="py-2.5 px-3">Card Barcode</th>
                  <th className="py-2.5 px-3">Full Name</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Borrow Limit</th>
                  <th className="py-2.5 px-3">Loan Duration</th>
                  <th className="py-2.5 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {members.map((m: any) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {m.membership_number}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">{m.barcode}</td>
                    <td className="py-3 px-3 font-medium text-slate-900">
                      {m.student
                        ? `${m.student.first_name} ${m.student.last_name}`
                        : m.staff
                        ? `${m.staff.first_name} ${m.staff.last_name}`
                        : '—'}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                          m.member_type === 'student'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {m.member_type}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-700">{m.max_books_allowed} books</td>
                    <td className="py-3 px-3 text-slate-700">{m.borrow_duration_days} days</td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          m.status === 'active'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {m.status.toUpperCase()}
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
  );
}
