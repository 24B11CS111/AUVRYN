'use client';

import React, { useState, useTransition } from 'react';
import { CommunicationsNav } from '../CommunicationsNav';
import type { Notification, NotificationPreference } from '@edu-platform/types';
import {
  markNotificationReadAction,
  updateUserNotificationPreferencesAction,
} from '../actions';
import {
  Bell,
  Sliders,
  Clock,
  AlertTriangle,
  CreditCard,
  CalendarCheck,
  Award,
  BookOpen,
} from 'lucide-react';

interface NotificationsClientProps {
  initialNotifications: Notification[];
  initialPreferences: NotificationPreference[];
  userRole?: string;
}

export function NotificationsClient({
  initialNotifications,
  initialPreferences,
  userRole,
}: NotificationsClientProps) {
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [preferences, setPreferences] = useState<NotificationPreference[]>(initialPreferences);
  const [showPreferences, setShowPreferences] = useState(false);
  const [, startTransition] = useTransition();

  const handleMarkRead = (id: string) => {
    startTransition(async () => {
      const res = await markNotificationReadAction(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
      }
    });
  };

  const handleTogglePref = (category: string, channel: string) => {
    const existing = preferences.find(
      (p) => p.category === category && p.channel === channel
    );
    const updatedIsEnabled = existing ? !existing.isEnabled : false;

    const newPrefs = existing
      ? preferences.map((p) =>
          p.category === category && p.channel === channel
            ? { ...p, isEnabled: updatedIsEnabled }
            : p
        )
      : [
          ...preferences,
          {
            id: `temp-${Date.now()}`,
            institutionId: '',
            userId: '',
            category: category as any,
            channel: channel as any,
            isEnabled: updatedIsEnabled,
            createdAt: '',
            updatedAt: '',
          },
        ];

    setPreferences(newPrefs);

    startTransition(async () => {
      await updateUserNotificationPreferencesAction({
        preferences: newPrefs.map((p) => ({
          category: p.category,
          channel: p.channel,
          isEnabled: p.isEnabled,
        })),
      });
    });
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'attendance':
        return <CalendarCheck className="w-4 h-4 text-emerald-600" />;
      case 'fees_payments':
        return <CreditCard className="w-4 h-4 text-blue-600" />;
      case 'examinations':
      case 'results':
        return <Award className="w-4 h-4 text-purple-600" />;
      case 'homework':
        return <BookOpen className="w-4 h-4 text-amber-600" />;
      case 'emergency':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Bell className="w-4 h-4 text-slate-500" />;
    }
  };

  const categories = [
    { key: 'attendance', label: 'Attendance Alerts' },
    { key: 'examinations', label: 'Exams & Results' },
    { key: 'fees_payments', label: 'Fees & Invoicing' },
    { key: 'homework', label: 'Homework & Assignments' },
    { key: 'announcements', label: 'Circulars & Notices' },
  ];

  const channels = ['in_app', 'push', 'email', 'sms'];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Notification Center
          </h1>
          <p className="text-sm text-slate-500">
            Personal notifications and notification delivery preferences
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowPreferences(!showPreferences)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-slate-700 text-xs font-semibold shadow-xs hover:bg-slate-50 transition"
        >
          <Sliders className="w-4 h-4" />
          <span>{showPreferences ? 'View Notifications' : 'Channel Preferences'}</span>
        </button>
      </div>

      <CommunicationsNav userRole={userRole} />

      {showPreferences ? (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-6">
          <div>
            <h2 className="text-base font-bold text-slate-900">Notification Delivery Preferences</h2>
            <p className="text-xs text-slate-500 mt-1">
              Configure which channels you receive automated transactional alerts on
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-3">Category</th>
                  <th className="py-2.5 px-3 text-center">In-App</th>
                  <th className="py-2.5 px-3 text-center">Push</th>
                  <th className="py-2.5 px-3 text-center">Email</th>
                  <th className="py-2.5 px-3 text-center">SMS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {categories.map((cat) => (
                  <tr key={cat.key} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-medium text-slate-800">{cat.label}</td>
                    {channels.map((ch) => {
                      const pref = preferences.find(
                        (p) => p.category === cat.key && p.channel === ch
                      );
                      const isChecked = pref ? pref.isEnabled : true;
                      return (
                        <td key={ch} className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleTogglePref(cat.key, ch)}
                            className="h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                          />
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="p-12 text-center rounded-xl border border-dashed border-slate-200 bg-slate-50/50">
              <Bell className="w-8 h-8 text-slate-400 mx-auto mb-2" />
              <h3 className="text-sm font-semibold text-slate-800">No notifications</h3>
              <p className="text-xs text-slate-500 mt-1">You are all caught up with your alerts.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                className={`p-4 rounded-xl border transition flex items-start justify-between gap-4 ${
                  n.isRead
                    ? 'border-slate-200 bg-white text-slate-600'
                    : 'border-indigo-100 bg-indigo-50/20 text-slate-900 shadow-2xs'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-white border border-slate-200/80 shadow-2xs mt-0.5">
                    {getCategoryIcon(n.category)}
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">{n.title}</span>
                      {!n.isRead && (
                        <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0" />
                      )}
                      <span className="text-[10px] uppercase font-semibold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                        {n.category.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="text-xs text-slate-600 leading-relaxed">{n.body}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{new Date(n.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!n.isRead && (
                  <button
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className="text-xs text-indigo-600 hover:text-indigo-800 font-medium shrink-0 pt-1"
                  >
                    Mark as read
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
