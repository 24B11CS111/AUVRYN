'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { LibraryNav } from '../../LibraryNav';
import { createLibraryBookAction } from '../../actions';
import { ArrowLeft, Loader2 } from 'lucide-react';

export default function NewBookPage() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const formData = new FormData(form);

    startTransition(async () => {
      const res = await createLibraryBookAction({
        title: formData.get('title') as string,
        author: formData.get('author') as string,
        category: formData.get('category') as string,
        isbn: (formData.get('isbn') as string) || undefined,
        publisher: (formData.get('publisher') as string) || undefined,
        edition: (formData.get('edition') as string) || undefined,
        subject: (formData.get('subject') as string) || undefined,
        deweyDecimal: (formData.get('deweyDecimal') as string) || undefined,
        description: (formData.get('description') as string) || undefined,
        language: (formData.get('language') as string) || 'English',
      });

      if (!res.success) {
        setError(res.error || 'Failed to add book');
      } else {
        router.push('/dashboard/library/books');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/library/books"
          className="p-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-900 hover:bg-slate-50"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Add Book to Catalogue</h1>
          <p className="text-sm text-slate-500">Record a new title in the institution library inventory.</p>
        </div>
      </div>

      <LibraryNav />

      <div className="max-w-2xl p-6 rounded-xl border border-slate-200 bg-white shadow-sm">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Book Title *
              </label>
              <input
                type="text"
                name="title"
                required
                placeholder="e.g. Introduction to Algorithms"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Author *
              </label>
              <input
                type="text"
                name="author"
                required
                placeholder="e.g. Thomas H. Cormen"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Category *
              </label>
              <select
                name="category"
                required
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="Computer Science">Computer Science</option>
                <option value="Mathematics">Mathematics</option>
                <option value="Physics">Physics</option>
                <option value="Literature">Literature</option>
                <option value="History">History</option>
                <option value="Engineering">Engineering</option>
                <option value="General Science">General Science</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                ISBN (10 or 13 digits)
              </label>
              <input
                type="text"
                name="isbn"
                placeholder="e.g. 978-0262033848"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Publisher
              </label>
              <input
                type="text"
                name="publisher"
                placeholder="e.g. MIT Press"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Edition
              </label>
              <input
                type="text"
                name="edition"
                placeholder="e.g. 3rd Edition"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Dewey Decimal / Call #
              </label>
              <input
                type="text"
                name="deweyDecimal"
                placeholder="e.g. 005.1"
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Description / Notes
              </label>
              <textarea
                name="description"
                rows={3}
                placeholder="Brief summary or subject notes..."
                className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Link
              href="/dashboard/library/books"
              className="px-4 py-2 border border-slate-300 text-slate-700 text-xs font-medium rounded-lg hover:bg-slate-50"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save Book
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
