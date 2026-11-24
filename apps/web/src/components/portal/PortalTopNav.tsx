'use client';

import React, { useState, useEffect, useRef, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Bell,
  Check,
  CheckCheck,
  LogOut,
  Baby,
  GraduationCap,
  BookOpen,
  Landmark,
  Building2,
  CalendarCheck,
  CreditCard,
  Bus,
  AlertTriangle,
  Megaphone,
} from 'lucide-react';
import type { EducationType } from '@edu-platform/types';
import { EDUCATION_TYPE_DEFINITIONS } from '@edu-platform/types';
import {
  getNotificationsAction,
  markNotificationReadAction,
  markAllNotificationsReadAction,
} from '@/app/dashboard/communications/actions';
import { createClient } from '@/lib/supabase/client';

export interface PortalTopNavProps {
  institutionName: string;
  educationType: EducationType;
  role: 'parent' | 'student' | 'faculty' | 'owner' | 'admin';
  userEmail: string;
  userName?: string;
  isPreview?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  attendance: CalendarCheck,
  academic: BookOpen,
  homework: BookOpen,
  fees: CreditCard,
  transport: Bus,
  emergency: AlertTriangle,
  announcements: Megaphone,
  general: Bell,
};

const CATEGORY_COLORS: Record<string, string> = {
  attendance: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  academic: 'bg-blue-50 text-blue-700 border-blue-200',
  homework: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  fees: 'bg-amber-50 text-amber-700 border-amber-200',
  transport: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  emergency: 'bg-rose-50 text-rose-700 border-rose-200',
  announcements: 'bg-purple-50 text-purple-700 border-purple-200',
  general: 'bg-slate-50 text-slate-700 border-slate-200',
};

const EDU_ICONS: Record<EducationType, React.ComponentType<{ className?: string }>> = {
  preschool: Baby,
  primary_school: GraduationCap,
  intermediate: BookOpen,
  university: Landmark,
};

export function PortalTopNav({
  institutionName,
  educationType,
  role,
  userEmail,
  userName,
  isPreview,
}: PortalTopNavProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string>('all');
  const [isPending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  const eduDef = EDUCATION_TYPE_DEFINITIONS[educationType] || EDUCATION_TYPE_DEFINITIONS.primary_school;
  const EduIcon = EDU_ICONS[educationType] || Building2;

  const roleLabelMap: Record<string, string> = {
    parent: 'Guardian & Family',
    student: 'Student Workspace',
    faculty: 'Faculty & Educator',
    owner: 'Owner (Preview)',
    admin: 'Administrator (Preview)',
  };

  const loadNotifications = async () => {
    try {
      const res = await getNotificationsAction(30);
      if (res.success && res.data) {
        setNotifications(res.data);
        const unread = res.data.filter((n: any) => !n.isRead).length;
        setUnreadCount(unread);
      }
    } catch {
      // Non-blocking for offline or restricted environments
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleMarkAsRead = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    startTransition(async () => {
      await markNotificationReadAction(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    });
  };

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllNotificationsReadAction();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    });
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
  };

  const filteredNotifications = notifications.filter((n) => {
    if (activeCategory === 'all') return true;
    return (n.category || '').toLowerCase() === activeCategory.toLowerCase();
  });

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs mb-6 rounded-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
        {/* Left: Brand & Institution Info */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#0B1E3F] to-[#2563EB] flex items-center justify-center text-white font-bold text-base shadow-xs group-hover:scale-105 transition-transform">
              A
            </div>
            <div className="flex flex-col">
              <span className="text-base font-bold text-slate-900 tracking-tight leading-none group-hover:text-blue-600 transition-colors">
                AUVRYN
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5">
                {institutionName}
              </span>
            </div>
          </Link>

          {/* Education Type Pill */}
          <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200/80">
            <EduIcon className="w-3.5 h-3.5 text-blue-600" />
            <span>{eduDef.label}</span>
          </div>

          {/* Role Badge */}
          <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-blue-50 text-blue-700 border border-blue-200">
            {roleLabelMap[role] || role}
            {isPreview ? ' (Audited Preview)' : ''}
          </span>
        </div>

        {/* Right: Notification Center & User Menu */}
        <div className="flex items-center gap-3">
          {/* Notification Popover Trigger */}
          <div className="relative" ref={popoverRef}>
            <button
              type="button"
              onClick={() => setIsOpen(!isOpen)}
              className="relative p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              aria-label="View notifications"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center shadow-xs animate-pulse">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Drawer Popover */}
            {isOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-white border border-slate-200 shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                {/* Popover Header */}
                <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900 text-sm">Notifications</span>
                    {unreadCount > 0 && (
                      <span className="px-2 py-0.5 text-[11px] font-bold bg-blue-100 text-blue-700 rounded-full">
                        {unreadCount} new
                      </span>
                    )}
                  </div>
                  {unreadCount > 0 && (
                    <button
                      type="button"
                      onClick={handleMarkAllRead}
                      disabled={isPending}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-1 transition"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      Mark all read
                    </button>
                  )}
                </div>

                {/* Filter Categories */}
                <div className="px-3 py-2 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto text-[11px] font-medium no-scrollbar">
                  {['all', 'attendance', 'academic', 'fees', 'transport', 'announcements'].map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-2.5 py-1 rounded-lg capitalize whitespace-nowrap transition ${
                        activeCategory === cat
                          ? 'bg-blue-600 text-white font-semibold shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Notification Items List */}
                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                  {filteredNotifications.length === 0 ? (
                    <div className="p-8 text-center text-slate-500">
                      <Bell className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-700">No notifications in this view</p>
                      <p className="text-[11px] text-slate-400 mt-0.5">You are up to date on all updates.</p>
                    </div>
                  ) : (
                    filteredNotifications.map((n) => {
                      const CatIcon = CATEGORY_ICONS[n.category] || Bell;
                      const badgeClass = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.general;
                      return (
                        <div
                          key={n.id}
                          className={`p-3.5 hover:bg-slate-50 transition flex items-start gap-3 cursor-pointer ${
                            !n.isRead ? 'bg-blue-50/40' : ''
                          }`}
                          onClick={() => {
                            if (n.data?.deep_link) {
                              router.push(n.data.deep_link);
                              setIsOpen(false);
                            }
                          }}
                        >
                          <div className={`p-2 rounded-xl border flex-shrink-0 ${badgeClass}`}>
                            <CatIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-slate-900 truncate">
                                {n.title}
                              </h4>
                              {!n.isRead && (
                                <span className="w-2 h-2 rounded-full bg-blue-600 flex-shrink-0" />
                              )}
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5">
                              {n.body}
                            </p>
                            <div className="flex items-center justify-between mt-1.5 text-[10px] text-slate-400">
                              <span>
                                {n.createdAt ? new Date(n.createdAt).toLocaleDateString() : 'Recent'}
                              </span>
                              {!n.isRead && (
                                <button
                                  type="button"
                                  onClick={(e) => handleMarkAsRead(n.id, e)}
                                  className="text-blue-600 hover:text-blue-800 font-semibold flex items-center gap-0.5"
                                  title="Mark as read"
                                >
                                  <Check className="w-3 h-3" /> Read
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Popover Footer */}
                <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
                  <Link
                    href="/dashboard/communications/notifications"
                    onClick={() => setIsOpen(false)}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 inline-flex items-center gap-1"
                  >
                    View All Notifications &rarr;
                  </Link>
                </div>
              </div>
            )}
          </div>

          {/* User Profile & Sign Out */}
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="hidden sm:flex flex-col text-right">
              <span className="text-xs font-bold text-slate-900 leading-tight">
                {userName || userEmail.split('@')[0]}
              </span>
              <span className="text-[10px] text-slate-500 leading-none">{userEmail}</span>
            </div>
            <button
              type="button"
              onClick={handleSignOut}
              className="p-2 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 transition"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
