'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { Profile, InstitutionMembership } from '@edu-platform/types';
import {
  Menu,
  Bell,
  LogOut,
  ChevronDown,
  CheckCircle2,
} from 'lucide-react';
import { useAuvrynRealtime } from '@/lib/realtime/useAuvrynRealtime';
import { RealtimeStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';

interface TopNavProps {
  profile?: Profile | null;
  activeMembership: InstitutionMembership | null;
  onOpenSidebar: () => void;
}

interface InAppNotificationItem {
  id: string;
  title: string;
  body: string;
  category: string;
  created_at: string;
  is_read: boolean;
}

export function TopNav({
  profile,
  activeMembership,
  onOpenSidebar,
}: TopNavProps) {
  const router = useRouter();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<InAppNotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState<number>(0);

  const institutionId = activeMembership?.institutionId || (activeMembership as any)?.institution_id;
  const userId = profile?.id;
  const userRole = activeMembership?.role;

  // Real-time synchronization hook
  const { connectionState, subscribeToNotifications, service } = useAuvrynRealtime({
    institutionId,
    userId,
    userRole,
  });

  const displayName =
    profile?.fullName?.trim() ||
    (profile as any)?.full_name?.trim() ||
    profile?.email?.split('@')[0]?.trim() ||
    'User';

  const avatarInitial = (displayName.charAt(0) || 'U').toUpperCase();
  const displayEmail = profile?.email || '';

  // Initial load of unread notifications
  const loadNotifications = useCallback(async () => {
    if (!userId) return;
    const supabase = createClient();
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('id, title, body, category, created_at, is_read')
        .eq('recipient_user_id', userId)
        .eq('is_read', false)
        .order('created_at', { ascending: false })
        .limit(10);

      if (!error && data) {
        setNotifications(data as InAppNotificationItem[]);
        setUnreadCount(data.length);
      }
    } catch {
      // Ignore network errors in offline/initial renders
    }
  }, [userId]);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Subscribe to live user notifications
  useEffect(() => {
    if (!userId) return;

    const sub = subscribeToNotifications((message) => {
      if (message.eventType === 'NOTIFICATION_CREATED') {
        const notif = message.payload as InAppNotificationItem;
        if (notif && notif.id) {
          setNotifications((prev) => {
            if (prev.some((n) => n.id === notif.id)) return prev;
            return [notif, ...prev];
          });
          setUnreadCount((c) => c + 1);
        }
      } else if (message.eventType === 'NOTIFICATION_READ') {
        const readId = (message.payload as any)?.id;
        if (readId) {
          setNotifications((prev) => prev.filter((n) => n.id !== readId));
          setUnreadCount((c) => Math.max(0, c - 1));
        }
      }
    });

    return () => {
      sub?.unsubscribe();
    };
  }, [userId, subscribeToNotifications]);

  // Mark notification as read
  const handleMarkAsRead = async (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    setUnreadCount((c) => Math.max(0, c - 1));

    try {
      const supabase = createClient();
      await (supabase.from('notifications') as any)
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('id', id);
    } catch (err) {
      console.warn('Failed to update notification read status on server:', err);
    }
  };

  const handleSignOut = async () => {
    if (service) {
      service.destroy();
    }
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push('/auth/login');
    router.refresh();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
      {/* Left: Mobile hamburger */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSidebar}
          className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 lg:hidden"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <span className="font-semibold text-[#0B1E3F]">
            {activeMembership?.institution?.name || 'AUVRYN Ecosystem'}
          </span>
          <span>/</span>
          <span className="capitalize px-1.5 py-0.5 rounded bg-slate-100 text-[#0B1E3F] font-medium text-[11px]">
            {activeMembership?.role ? activeMembership.role.replace('_', ' ') : 'Member'}
          </span>
        </div>
      </div>

      {/* Right: Realtime status, Notifications & Profile */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Real-time Connection State Indicator */}
        <RealtimeStatusIndicator
          state={connectionState}
          onRetry={loadNotifications}
        />

        {/* Notifications Popover */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 relative transition-colors"
            title="In-app notifications"
          >
            <Bell className="w-4 h-4 text-[#17243A]" />
            {unreadCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[8px] h-2 px-1 rounded-full bg-[#2563EB] ring-2 ring-white flex items-center justify-center text-[9px] font-bold text-white">
                {unreadCount > 9 ? '9+' : unreadCount > 1 ? unreadCount : ''}
              </span>
            )}
          </button>

          {isNotificationsOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsNotificationsOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-lg border border-slate-200 p-3 z-50">
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
                  <span className="text-xs font-semibold text-slate-900">
                    Notifications {unreadCount > 0 && `(${unreadCount})`}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">
                    {connectionState === 'CONNECTED' ? 'Live Sync' : 'Offline'}
                  </span>
                </div>

                {notifications.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 mx-auto mb-1.5 opacity-80" />
                    <p>No unread notifications at this time.</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2">
                    {notifications.map((n) => (
                      <div
                        key={n.id}
                        className="p-2.5 rounded-lg border border-slate-100 bg-[#F5F7FB] hover:bg-slate-100/70 transition-colors flex items-start justify-between gap-2"
                      >
                        <div className="space-y-0.5 text-left flex-1 min-w-0">
                          <p className="text-xs font-semibold text-[#0B1E3F] truncate">
                            {n.title}
                          </p>
                          <p className="text-[11px] text-slate-600 line-clamp-2">
                            {n.body}
                          </p>
                          <span className="text-[10px] text-slate-400 capitalize">
                            {n.category} &bull; {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleMarkAsRead(n.id)}
                          className="text-[10px] text-[#2563EB] hover:text-[#0B1E3F] font-semibold shrink-0 pt-0.5"
                          title="Mark as read"
                        >
                          Dismiss
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsProfileOpen(!isProfileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#0B1E3F] text-white flex items-center justify-center text-xs font-bold overflow-hidden">
              {profile?.avatarUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={profile.avatarUrl}
                  alt={displayName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>{avatarInitial}</span>
              )}
            </div>
            <div className="hidden sm:block text-left">
              <div className="text-xs font-semibold text-[#17243A] leading-tight">
                {displayName}
              </div>
              <div className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">
                {displayEmail}
              </div>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
          </button>

          {isProfileOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1 z-50">
                <div className="px-3 py-2 border-b border-slate-100">
                  <p className="text-xs font-bold text-[#0B1E3F]">{displayName}</p>
                  <p className="text-[11px] text-slate-500 truncate">{displayEmail}</p>
                </div>

                <div className="p-1">
                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-600 hover:bg-rose-50 rounded-lg font-medium transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
