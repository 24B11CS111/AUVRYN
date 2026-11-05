'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { CommunicationsNav } from '../CommunicationsNav';
import type { Announcement } from '@edu-platform/types';
import { acknowledgeAnnouncementAction } from '../actions';
import {
  Megaphone,
  PlusCircle,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Paperclip,
  Eye,
} from 'lucide-react';

interface AnnouncementsClientProps {
  initialAnnouncements: Announcement[];
  userRole?: string;
}

export function AnnouncementsClient({
  initialAnnouncements,
  userRole,
}: AnnouncementsClientProps) {
  const [announcements, setAnnouncements] = useState<Announcement[]>(initialAnnouncements);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);

  const isAdmin = ['owner', 'admin', 'academic_admin', 'faculty'].includes(userRole || '');

  const filtered = announcements.filter((a) => {
    if (scopeFilter !== 'all' && a.scope !== scopeFilter) return false;
    if (priorityFilter !== 'all' && a.priority !== priorityFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q);
    }
    return true;
  });

  const handleAcknowledge = (announcementId: string) => {
    setActionError(null);
    startTransition(async () => {
      const res = await acknowledgeAnnouncementAction({ announcementId });
      if (res.success) {
        setAnnouncements((prev) =>
          prev.map((a) =>
            a.id === announcementId
              ? { ...a, isAcknowledged: true, acknowledgementCount: a.acknowledgementCount + 1 }
              : a
          )
        );
      } else {
        setActionError(res.error || 'Failed to acknowledge announcement');
      }
    });
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case 'urgent':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle className="w-3 h-3" />
            Urgent
          </span>
        );
      case 'important':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            Important
          </span>
        );
      case 'low':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600">
            Low
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200">
            Standard
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Announcements & Circulars
          </h1>
          <p className="text-sm text-slate-500">
            Official institution-wide notices, campus circulars, and departmental memos
          </p>
        </div>
        {isAdmin && (
          <Link
            href="/dashboard/communications/announcements/new"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Announcement</span>
          </Link>
        )}
      </div>

      <CommunicationsNav userRole={userRole} />

      {actionError && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs">
          {actionError}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search circulars by title or content..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 bg-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          >
            <option value="all">All Scopes</option>
            <option value="institution">Institution</option>
            <option value="campus">Campus</option>
            <option value="class">Class</option>
            <option value="role">Role</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-900"
          >
            <option value="all">All Priorities</option>
            <option value="urgent">Urgent</option>
            <option value="important">Important</option>
            <option value="standard">Standard</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Announcements List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
            <Megaphone className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h3 className="text-sm font-semibold text-slate-800">No announcements found</h3>
            <p className="text-xs text-slate-500 mt-1">
              {search || scopeFilter !== 'all' ? 'Try adjusting your filters.' : 'There are no notices published yet.'}
            </p>
          </div>
        ) : (
          filtered.map((ann) => (
            <div
              key={ann.id}
              className="p-5 rounded-xl border border-slate-200/90 bg-white shadow-xs space-y-3"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div className="flex items-center gap-2.5 flex-wrap">
                  {getPriorityBadge(ann.priority)}
                  <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-2 py-0.5 rounded">
                    {ann.scope}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">{ann.title}</h3>
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1.5 shrink-0">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {ann.publishedAt
                      ? new Date(ann.publishedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })
                      : 'Draft'}
                  </span>
                </div>
              </div>

              <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed">
                {ann.content}
              </div>

              {/* Attachments */}
              {ann.attachments && ann.attachments.length > 0 && (
                <div className="pt-2 flex flex-wrap gap-2">
                  {ann.attachments.map((att, idx) => (
                    <a
                      key={idx}
                      href={att.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition"
                    >
                      <Paperclip className="w-3 h-3 text-slate-500" />
                      <span>{att.name}</span>
                    </a>
                  ))}
                </div>
              )}

              {/* Footer Meta & Acknowledgement Action */}
              <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs text-slate-500">
                <div className="flex items-center gap-4">
                  <span>Posted by: <strong className="text-slate-700">{ann.creator?.fullName || 'Administrator'}</strong></span>
                  {isAdmin && (
                    <span className="flex items-center gap-1">
                      <Eye className="w-3.5 h-3.5 text-slate-400" />
                      {ann.acknowledgementCount} acknowledgements
                    </span>
                  )}
                </div>

                {ann.requiresAcknowledgement && (
                  <div>
                    {ann.isAcknowledged ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Acknowledged
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAcknowledge(ann.id)}
                        disabled={isPending}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-semibold hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Acknowledge Receipt</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
