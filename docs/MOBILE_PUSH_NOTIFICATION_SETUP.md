# AUVRYN — Mobile Push Notification Configuration & Operations Guide

## 1. Overview

AUVRYN mobile clients (`apps/mobile` built on React Native and Expo SDK 52) interface seamlessly with the central notification system using native Expo Push Notifications and FCM / APNs channels.

---

## 2. Push Token Lifecycle

```
[Mobile App Launch]
        |
        v  registerDevicePushTokenAsync(userId) in notificationService.ts
[Check / Request System Permissions (getPermissionsAsync / requestPermissionsAsync)]
        |
        v  Configure Android Notification Channels (General, Transport & Safety Alerts)
[Acquire Native Expo Push Token (getExpoPushTokenAsync)]
        |
        v  Invoke Atomic RPC: register_push_device_token_atomic
[Upsert in push_device_tokens Table (user_id, token, platform, is_active: true)]
```

### Shared-Device & Account Switching Protection
- When an account logs out or switches roles, `unregisterDevicePushTokenAsync(userId, token)` sets `is_active = false` and clears the token from the current session.
- The stored procedure `register_push_device_token_atomic` ensures that an existing token is revoked from any previous account on that device, eliminating cross-user push leakage on shared family tablets or school devices.

---

## 3. Native Android Notification Channels

Configured via `setupAndroidNotificationChannels()`:
1. `default`:
   - Name: `General Notifications`
   - Importance: `AndroidImportance.MAX`
   - Vibration Pattern: `[0, 250, 250, 250]`
   - Light Color: `#0f172a`
2. `transport_alerts`:
   - Name: `Transport & Safety Alerts`
   - Importance: `AndroidImportance.HIGH`
   - Vibration Pattern: `[0, 500, 250, 500]`
   - Light Color: `#e11d48`

---

## 4. Deep-Link Routing Protocol

When a user taps an incoming push notification, Expo Notifications routes the user directly to the relevant view based on the payload data:

```json
{
  "to": "ExponentPushToken[...]",
  "title": "Attendance Alert — AUVRYN",
  "body": "Student marked absent for Morning Roll Call.",
  "data": {
    "deep_link": "/portal/parent/attendance",
    "category": "attendance",
    "priority": "urgent",
    "sessionId": "sess-uuid"
  }
}
```

- If app is in background or closed, `Notifications.addNotificationResponseReceivedListener` intercepts the intent and transitions the active tab navigator to the target tab (`Attendance`, `Coursework`, `Results`, `Alerts`).
- If app is in foreground, a non-intrusive in-app banner toast is presented while playing the designated system chime.

---

## 5. Production Environment Variables

To activate live external delivery via Expo's push service:

```bash
# Production .env / Vercel Environment Variables
EXPO_ACCESS_TOKEN="your_expo_access_token_here"
```

If `EXPO_ACCESS_TOKEN` is unset (in development or isolated staging), `PushDeliveryAdapter` safely logs the delivery payload to the audit trail and records a simulated successful dispatch without crashing or blocking the worker loop.
