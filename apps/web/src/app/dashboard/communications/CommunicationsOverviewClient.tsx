'use client';

import React from 'react';
import Link from 'next/link';
import { CommunicationsNav } from './CommunicationsNav';
import type { CommunicationsOverviewStats } from '@edu-platform/types';
import {
  Megaphone,
  MessageSquare,
  Bell,
  Send,
  PlusCircle,
  CheckCircle2,
  Smartphone,
  Mail,
  MessageCircle,
  BookOpen,
} from 'lucide-react';

interface CommunicationsOverviewClientProps {
  stats: CommunicationsOverviewStats;
  userRole?: string;
}

export function CommunicationsOverviewClient({
  stats,
  userRole,
}: CommunicationsOverviewClientProps) {
  const isAdmin = ['owner', 'admin', 'academic_admin'].includes(userRole || '');

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Communications Hub
          </h1>
          <p className="text-sm text-slate-500">
            Unified announcement broadcast, threaded messaging, and multichannel notifications
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isAdmin && (
            <Link
              href="/dashboard/communications/announcements/new"
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Announcement</span>
            </Link>
          )}
          <Link
            href="/dashboard/communications/messages"
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-sm hover:bg-slate-50 transition"
          >
            <MessageSquare className="w-4 h-4 text-slate-500" />
            <span>Messages</span>
          </Link>
        </div>
      </div>

      <CommunicationsNav userRole={userRole} />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Announcements</span>
            <Megaphone className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeAnnouncements}</div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.totalAnnouncements} total published circulars
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Unread Alerts</span>
            <Bell className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.unreadNotifications}</div>
          <div className="text-xs text-slate-500 mt-1">Pending in personal notification inbox</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Active Threads</span>
            <MessageSquare className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.activeThreads}</div>
          <div className="text-xs text-slate-500 mt-1">Secure parent & student conversations</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200/80 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Outbox Queue</span>
            <Send className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{stats.pendingDeliveries}</div>
          <div className="text-xs text-slate-500 mt-1">
            {stats.failedDeliveries > 0 ? (
              <span className="text-rose-600 font-medium">
                {stats.failedDeliveries} failed deliveries
              </span>
            ) : (
              <span className="text-emerald-600 font-medium">All deliveries healthy</span>
            )}
          </div>
        </div>
      </div>

      {/* Multichannel Notification Gateway Health */}
      <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">Notification Delivery Channels</h2>
            <p className="text-xs text-slate-500">
              Active adapters configured for transactional delivery with retry policies
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Engine Online
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3 pt-2">
          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center gap-3">
            <div className="p-2 rounded-md bg-white border border-slate-200 shadow-2xs">
              <Bell className="w-4 h-4 text-indigo-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">In-App Feed</div>
              <div className="text-[10px] text-slate-500">Real-time sync</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center gap-3">
            <div className="p-2 rounded-md bg-white border border-slate-200 shadow-2xs">
              <Smartphone className="w-4 h-4 text-blue-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Push (FCM/APNs)</div>
              <div className="text-[10px] text-slate-500">Device tokens active</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center gap-3">
            <div className="p-2 rounded-md bg-white border border-slate-200 shadow-2xs">
              <Mail className="w-4 h-4 text-emerald-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">Email Gateway</div>
              <div className="text-[10px] text-slate-500">HTML templates</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center gap-3">
            <div className="p-2 rounded-md bg-white border border-slate-200 shadow-2xs">
              <MessageSquare className="w-4 h-4 text-amber-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">SMS Gateway</div>
              <div className="text-[10px] text-slate-500">Transactional routes</div>
            </div>
          </div>

          <div className="p-3 rounded-lg border border-slate-100 bg-slate-50/70 flex items-center gap-3">
            <div className="p-2 rounded-md bg-white border border-slate-200 shadow-2xs">
              <MessageCircle className="w-4 h-4 text-green-600" />
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-900">WhatsApp</div>
              <div className="text-[10px] text-slate-500">Verified templates</div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link
          href="/dashboard/communications/announcements"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-3">
            <Megaphone className="w-5 h-5 text-indigo-600 group-hover:scale-105 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Announcements & Circulars</h3>
          <p className="text-xs text-slate-500 mt-1">
            Publish notices with campus, class, or role targeting, mandatory read receipts, and file attachments.
          </p>
        </Link>

        <Link
          href="/dashboard/communications/messages"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="w-9 h-9 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center mb-3">
            <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:scale-105 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Threaded Messaging</h3>
          <p className="text-xs text-slate-500 mt-1">
            Secure parent-teacher and student-faculty conversations with moderation controls.
          </p>
        </Link>

        <Link
          href="/dashboard/assignments"
          className="p-5 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition group"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-3">
            <BookOpen className="w-5 h-5 text-blue-600 group-hover:scale-105 transition" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900">Homework & Assignments</h3>
          <p className="text-xs text-slate-500 mt-1">
            Create homework tasks, review online student submissions, track late penalties, and enter grades.
          </p>
        </Link>
      </div>
    </div>
  );
}
