'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { HomeworkAssignment } from '@edu-platform/types';
import {
  BookOpen,
  PlusCircle,
  Search,
  Calendar,
  CheckCircle2,
  Users,
} from 'lucide-react';

interface AssignmentsClientProps {
  initialAssignments: HomeworkAssignment[];
  userRole?: string;
}

export function AssignmentsClient({
  initialAssignments,
  userRole,
}: AssignmentsClientProps) {
  const [assignments] = useState<HomeworkAssignment[]>(initialAssignments);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const canCreate = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'].includes(
    userRole || ''
  );

  const filtered = assignments.filter((a) => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        a.title.toLowerCase().includes(q) ||
        (a.subject?.name && a.subject.name.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Homework & Assignments
          </h1>
          <p className="text-sm text-slate-500">
            Coursework tasks, digital submissions, grading rubrics, and late submission policies
          </p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/assignments/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Assignment</span>
          </Link>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search assignments by title or subject..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
        >
          <option value="all">All Statuses</option>
          <option value="published">Published</option>
          <option value="closed">Closed</option>
          <option value="draft">Draft</option>
        </select>
      </div>

      {/* Assignments List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <BookOpen className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No assignments found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search || statusFilter !== 'all' ? 'Try adjusting your filters.' : 'There are no active assignments.'}
            </p>
          </div>
        ) : (
          filtered.map((a) => (
            <Link
              key={a.id}
              href={`/dashboard/assignments/${a.id}`}
              className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs hover:border-slate-300 hover:shadow-sm transition flex flex-col justify-between group space-y-3"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {a.subject?.name || 'Subject'}
                    </span>
                    <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                      {a.class?.name || 'Class'} {a.section?.name ? `(${a.section.name})` : ''}
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700">
                    Max: {a.maxMarks} marks
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition">
                  {a.title}
                </h3>

                {a.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {a.description}
                  </p>
                )}
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>Due: {a.dueDate} {a.dueTime ? `@ ${a.dueTime}` : ''}</span>
                </div>

                {userRole === 'student' && a.userSubmission ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    <CheckCircle2 className="w-3 h-3" />
                    {a.userSubmission.status}
                  </span>
                ) : (
                  <div className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-slate-400" />
                    <span>{a.submissionCount || 0} submitted</span>
                  </div>
                )}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
