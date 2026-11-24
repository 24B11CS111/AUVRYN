# AUVRYN — Multi-Tenant Announcement & Notification System

## 1. System Overview

The AUVRYN Communication Ecosystem provides high-throughput, multi-tenant broadcast announcements and personalized event notifications. It implements an asynchronous transactional outbox pattern to decouple event generation from external communication transports (in-app, mobile push, SMS, email).

---

## 2. Notification Pipeline Architecture

```
+----------------------------------------------------------------------------------------------------+
|                                    EVENT TRIGGER SOURCES                                           |
|  - Circular Announcements (/dashboard/communications)                                              |
|  - Class Roll Call Attendance Marking (/portal/teacher)                                            |
|  - Homework Assignment & Grading (/portal/teacher)                                                 |
|  - Examination Results Publishing (/dashboard/examinations)                                        |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                                AUDIENCE FAN-OUT ENGINE (fanout.ts)                                 |
|  1. resolveAudienceUserIds() -> Multi-tenant SQL resolution across roles, sections, and guardians  |
|  2. Batch insert into 'notifications' (In-App notifications with deep links)                       |
|  3. Resolve active device tokens from 'push_device_tokens'                                          |
|  4. Batch insert into 'notification_deliveries' (channel = 'push', status = 'pending')             |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
|                          TRANSACTIONAL OUTBOX WORKER (worker.ts)                                   |
|  1. Atomic batch claim via 'claim_notification_deliveries' (FOR UPDATE SKIP LOCKED)                |
|  2. Dispatch via PushDeliveryAdapter (Expo Push API / FCM)                                         |
|  3. Record execution result and audit log; retry on transient failure up to max_attempts           |
+----------------------------------------------------------------------------------------------------+
```

---

## 3. Targeting Scopes & Resolution Logic

The fan-out engine (`apps/web/src/lib/notifications/fanout.ts`) supports 5 targeting scopes:

| Scope | Recipient Criteria | Resolved User Accounts |
| :--- | :--- | :--- |
| `institution` | All active members of the current institution | Owners, Admins, Faculty, Students, Parents |
| `role` | Members assigned to explicit roles (e.g. `parent`, `student`, `faculty`) | Filtered by `institution_memberships.role` |
| `class` | All students enrolled in target class + their linked guardians | `student_enrollments.class_id` + `student_guardians` |
| `section` | All students enrolled in target section + their linked guardians | `student_enrollments.section_id` + `student_guardians` |
| `individual` | Specific verified institution user IDs | Validated against `institution_memberships` |

### Multi-Tenant & Family Isolation Guarantees
- **Strict Boundary Check**: Queries enforce `institution_id = target_institution_id` on all joins.
- **Guardianship Privacy**: When a student is targeted, only verified active guardians from `student_guardians` receive notifications. Guardians belonging to other institutions or unlinked families are strictly excluded.

---

## 4. Priority Escalation & Delivery Channels

Announcements and notifications support 4 priority tiers:
1. `low`: Informational updates (club meetings, newsletter).
2. `standard` / `normal`: General operational notices (homework assigned, routine schedule updates).
3. `important` / `high`: Time-sensitive notices (exam schedules, fee invoice reminders).
4. `urgent`: Immediate safety or absence alerts (student marked absent, school closure, emergency transport delay).

---

## 5. Idempotency & Deduplication Engine

To prevent duplicate push alerts and in-app noise:
- Every queued delivery record in `notification_deliveries` requires an `idempotency_key`.
- For absence alerts: `att_absence_${sessionId}_${studentId}_${guardianUserId}`
- For coursework notifications: `hw_assign_${homeworkId}_${recipientUserId}`
- For push deliveries: `push_${notificationId}_${tokenHash}`
- Attempting to dispatch duplicate jobs is blocked at the database level via unique constraints and pre-flight checks.

---

## 6. Real-Time Delivery via Supabase Realtime

The web and mobile applications maintain active WebSocket subscriptions on the `public.notifications` table filtered by `recipient_user_id = auth.uid()`.
- On record insertion, the client state increments the unread notification badge count in real time without polling.
- In-app notification drawer allows instantaneous "Mark as Read" or "Mark All as Read".
