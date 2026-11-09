import React from 'react';
import Link from 'next/link';
import { LibraryNav } from '../LibraryNav';
import { getLibraryBooksAction, getLibraryBranchesAction } from '../actions';
import { Plus, BookOpen, Search } from 'lucide-react';

interface BooksPageProps {
  searchParams: Promise<{ query?: string; category?: string; branchId?: string }>;
}

export default async function LibraryBooksPage({ searchParams }: BooksPageProps) {
  const { query, category, branchId } = await searchParams;

  const [booksRes, branchesRes] = await Promise.all([
    getLibraryBooksAction({ query, category, branchId }),
    getLibraryBranchesAction(),
  ]);

  const books = booksRes.success && booksRes.data ? booksRes.data : [];
  const branches = branchesRes.success && branchesRes.data ? branchesRes.data : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Book Catalogue</h1>
          <p className="text-sm text-slate-500">
            Browse and manage library titles, ISBN codes, Dewey decimal classifications, and copy counts.
          </p>
        </div>
        <Link
          href="/dashboard/library/books/new"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-xs font-semibold hover:bg-blue-700 shadow-sm"
        >
          <Plus className="w-3.5 h-3.5" />
          Add New Book
        </Link>
      </div>

      <LibraryNav />

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <form className="flex-1 flex gap-2" method="GET">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              name="query"
              defaultValue={query}
              placeholder="Search by title, author, or ISBN..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            name="category"
            defaultValue={category || ''}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Categories</option>
            <option value="Computer Science">Computer Science</option>
            <option value="Mathematics">Mathematics</option>
            <option value="Physics">Physics</option>
            <option value="Literature">Literature</option>
            <option value="History">History</option>
            <option value="Engineering">Engineering</option>
          </select>
          <select
            name="branchId"
            defaultValue={branchId || ''}
            className="px-3 py-2 text-xs rounded-lg border border-slate-300 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Branches</option>
            {branches.map((b: any) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="px-4 py-2 bg-slate-900 text-white text-xs font-medium rounded-lg hover:bg-slate-800"
          >
            Filter
          </button>
        </form>
      </div>

      {/* Books Table */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-sm">
        {books.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-700">No books found in catalogue</p>
            <p className="text-xs text-slate-400 mt-1">Try refining search or click Add New Book.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Title & Author</th>
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3">ISBN</th>
                  <th className="py-2.5 px-3">Branch</th>
                  <th className="py-2.5 px-3">Dewey / Call #</th>
                  <th className="py-2.5 px-3">Copies (Avail / Total)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {books.map((b: any) => {
                  const copies = b.copies || [];
                  const totalCopies = copies.length;
                  const availCopies = copies.filter((c: any) => c.status === 'available').length;

                  return (
                    <tr key={b.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-900">{b.title}</div>
                        <div className="text-[11px] text-slate-500">by {b.author} • {b.publisher || 'General'}</div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700">
                          {b.category}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-600">{b.isbn || '—'}</td>
                      <td className="py-3 px-3 text-slate-600">{b.branch?.name || 'Central'}</td>
                      <td className="py-3 px-3 font-mono text-slate-500">{b.dewey_decimal || '—'}</td>
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            availCopies > 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {availCopies} / {totalCopies}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
