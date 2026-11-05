import React from 'react';
import { requireInstitution } from '@/lib/auth';
import {
  getNotificationsAction,
  getUserNotificationPreferencesAction,
} from '../actions';
import { NotificationsClient } from './NotificationsClient';

export default async function NotificationsPage() {
  const session = await requireInstitution();
  const userRole = session.activeMembership!.role;

  const [notifsRes, prefsRes] = await Promise.all([
    getNotificationsAction(50),
    getUserNotificationPreferencesAction(),
  ]);

  const notifications = notifsRes.success && notifsRes.data ? notifsRes.data : [];
  const preferences = prefsRes.success && prefsRes.data ? prefsRes.data : [];

  return (
    <div className="container mx-auto py-6">
      <NotificationsClient
        initialNotifications={notifications}
        initialPreferences={preferences}
        userRole={userRole}
      />
    </div>
  );
}
