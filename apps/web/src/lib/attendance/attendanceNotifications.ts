import type { NotificationCategory, NotificationChannel, NotificationPriority } from '@edu-platform/types';

export interface AbsenceNotificationCandidate {
  studentId: string;
  status?: string | null;
  remarks?: string | null;
  isExcused?: boolean;
}

export interface AbsenceNotificationBatchInput {
  institutionId: string;
  sessionId: string;
  sessionDate: string;
  markedByUserId: string;
  records: AbsenceNotificationCandidate[];
}

export interface GuardianNotificationTarget {
  guardianId: string;
  guardianUserId: string;
  guardianName: string;
  guardianEmail: string | null;
  guardianPhone: string | null;
  relationship: string;
  isPrimary: boolean;
  enabledChannels: NotificationChannel[];
  pushToken: string | null;
}

export interface AbsenceNotificationResult {
  totalRecordsChecked: number;
  absentCount: number;
  guardiansNotifiedCount: number;
  notificationsCreated: number;
  deliveriesQueued: number;
  skippedGuardians: Array<{
    studentId: string;
    guardianId?: string;
    reason: string;
  }>;
  details: Array<{
    studentId: string;
    guardianUserId: string;
    notificationId: string;
    channels: NotificationChannel[];
    idempotencyKey: string;
  }>;
}

export const ATTENDANCE_ABSENCE_NOTIFICATION_TITLE = 'Attendance Alert — AUVRYN';
export const ATTENDANCE_ABSENCE_NOTIFICATION_BODY =
  'Your ward was marked absent today. Please contact the institution if you need clarification.';

/**
 * Resolves authoritative linked guardians for a student within a specific institution boundary.
 * Verifies active membership and respects guardian notification preferences.
 */
export async function resolveStudentGuardiansForNotification(
  supabase: any,
  institutionId: string,
  studentId: string
): Promise<{ targets: GuardianNotificationTarget[]; skipped: Array<{ guardianId?: string; reason: string }> }> {
  const targets: GuardianNotificationTarget[] = [];
  const skipped: Array<{ guardianId?: string; reason: string }> = [];

  // 1. Fetch explicitly linked guardians from student_guardians joined with guardians
  const { data: links, error: linkErr } = await supabase
    .from('student_guardians')
    .select(`
      guardian_id,
      relationship,
      is_primary,
      guardians!inner (
        id,
        institution_id,
        user_id,
        first_name,
        last_name,
        email,
        phone
      )
    `)
    .eq('student_id', studentId)
    .eq('institution_id', institutionId);

  if (linkErr || !links || links.length === 0) {
    skipped.push({ reason: 'NO_LINKED_GUARDIANS' });
    return { targets, skipped };
  }

  for (const item of links) {
    const guardian = (item as any).guardians;
    if (!guardian) {
      skipped.push({ guardianId: item.guardian_id, reason: 'GUARDIAN_NOT_FOUND' });
      continue;
    }

    // Strict institution boundary check
    if (guardian.institution_id !== institutionId) {
      skipped.push({ guardianId: guardian.id, reason: 'CROSS_INSTITUTION_ISOLATION_VIOLATION' });
      continue;
    }

    const guardianUserId = guardian.user_id;
    if (!guardianUserId) {
      skipped.push({ guardianId: guardian.id, reason: 'NO_LINKED_USER_ACCOUNT' });
      continue;
    }

    // 2. Verify active membership of the guardian in the institution
    const { data: membership, error: memErr } = await supabase
      .from('institution_memberships')
      .select('id, status')
      .eq('institution_id', institutionId)
      .eq('user_id', guardianUserId)
      .eq('status', 'active')
      .maybeSingle();

    if (memErr || !membership) {
      skipped.push({ guardianId: guardian.id, reason: 'NO_ACTIVE_INSTITUTION_MEMBERSHIP' });
      continue;
    }

    // 3. Check notification preferences for category 'attendance'
    const { data: pref } = await supabase
      .from('notification_preferences')
      .select('enabled_channels, is_muted')
      .eq('institution_id', institutionId)
      .eq('user_id', guardianUserId)
      .eq('category', 'attendance')
      .maybeSingle();

    if (pref && pref.is_muted) {
      skipped.push({ guardianId: guardian.id, reason: 'MUTED_BY_PREFERENCE' });
      continue;
    }

    // Channels: default to ['in_app', 'push'] if not configured, or respect enabled channels
    let channels: NotificationChannel[] = ['in_app', 'push'];
    if (pref && Array.isArray(pref.enabled_channels) && pref.enabled_channels.length > 0) {
      channels = pref.enabled_channels;
    }

    // 4. Resolve active push device token if 'push' is an enabled channel
    let pushToken: string | null = null;
    if (channels.includes('push')) {
      const { data: tokenRow } = await supabase
        .from('push_device_tokens')
        .select('token')
        .eq('user_id', guardianUserId)
        .eq('is_active', true)
        .order('last_used_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      pushToken = tokenRow?.token || null;
    }

    targets.push({
      guardianId: guardian.id,
      guardianUserId,
      guardianName: `${guardian.first_name || ''} ${guardian.last_name || ''}`.trim(),
      guardianEmail: guardian.email || null,
      guardianPhone: guardian.phone || null,
      relationship: item.relationship || 'Guardian',
      isPrimary: Boolean(item.is_primary),
      enabledChannels: channels,
      pushToken,
    });
  }

  return { targets, skipped };
}

/**
 * Creates an idempotent attendance absence notification for a single guardian through the outbox.
 * Guarantees deduplication across duplicate submissions using deterministic idempotency keys.
 */
export async function queueAbsenceNotificationForGuardian(
  supabase: any,
  params: {
    institutionId: string;
    sessionId: string;
    sessionDate: string;
    studentId: string;
    guardian: GuardianNotificationTarget;
    markedByUserId: string;
  }
): Promise<{ success: boolean; notificationId?: string; idempotencyKey?: string; duplicate?: boolean; error?: string }> {
  const { institutionId, sessionId, sessionDate, studentId, guardian, markedByUserId } = params;

  // Base deterministic idempotency key
  const baseIdempotencyKey = `att_absence_${sessionId}_${studentId}_${guardian.guardianUserId}`;

  // 1. Idempotency Check: verify if notification has already been queued for this session + student + guardian
  const { data: existingDelivery } = await supabase
    .from('notification_deliveries')
    .select('id, notification_id')
    .eq('institution_id', institutionId)
    .like('idempotency_key', `${baseIdempotencyKey}%`)
    .limit(1)
    .maybeSingle();

  if (existingDelivery) {
    return {
      success: true,
      duplicate: true,
      notificationId: existingDelivery.notification_id,
      idempotencyKey: baseIdempotencyKey,
    };
  }

  // 2. Insert central notification record
  // Non-PII metadata: strictly omits medical, grades, behavioral or private remarks
  const notificationPayload = {
    institution_id: institutionId,
    recipient_user_id: guardian.guardianUserId,
    category: 'attendance' as NotificationCategory,
    title: ATTENDANCE_ABSENCE_NOTIFICATION_TITLE,
    body: ATTENDANCE_ABSENCE_NOTIFICATION_BODY,
    priority: 'high' as NotificationPriority,
    data: {
      type: 'STUDENT_ABSENCE',
      sessionId,
      studentId,
      date: sessionDate,
    },
    created_by: markedByUserId,
  };

  const { data: insertedNotif, error: notifErr } = await supabase
    .from('notifications')
    .insert(notificationPayload)
    .select('id')
    .single();

  if (notifErr || !insertedNotif) {
    return {
      success: false,
      error: notifErr?.message || 'Failed to insert notification record',
    };
  }

  const notificationId = insertedNotif.id;

  // 3. Insert delivery outbox queue records for each enabled channel
  const deliveryInserts = guardian.enabledChannels.map((channel) => {
    let destination: string | null = null;
    if (channel === 'push') {
      destination = guardian.pushToken;
    } else if (channel === 'email') {
      destination = guardian.guardianEmail;
    } else if (channel === 'sms' || channel === 'whatsapp') {
      destination = guardian.guardianPhone;
    }

    return {
      institution_id: institutionId,
      notification_id: notificationId,
      channel,
      status: 'queued',
      destination,
      idempotency_key: `${baseIdempotencyKey}_${channel}`,
      max_attempts: 3,
    };
  });

  const { error: deliveryErr } = await supabase
    .from('notification_deliveries')
    .insert(deliveryInserts);

  if (deliveryErr) {
    return {
      success: false,
      notificationId,
      error: deliveryErr.message,
    };
  }

  return {
    success: true,
    notificationId,
    idempotencyKey: baseIdempotencyKey,
    duplicate: false,
  };
}

/**
 * Main Orchestrator: Processes an attendance batch and queues automatic absence notifications
 * for all committed absent students and their authorized linked guardians.
 *
 * Rules:
 * - Only records with status === 'absent' generate absence notifications.
 * - 'present', 'late', 'excused', 'half_day', 'on_leave' do NOT generate absence notifications.
 * - Respects institution isolation, guardian relationships, and notification preferences.
 * - Idempotent across multiple batch submissions.
 */
export async function processAttendanceAbsenceNotifications(
  supabase: any,
  input: AbsenceNotificationBatchInput
): Promise<AbsenceNotificationResult> {
  const result: AbsenceNotificationResult = {
    totalRecordsChecked: input.records.length,
    absentCount: 0,
    guardiansNotifiedCount: 0,
    notificationsCreated: 0,
    deliveriesQueued: 0,
    skippedGuardians: [],
    details: [],
  };

  // 1. Filter strictly for committed absences
  const absentRecords = input.records.filter((r) => r.status === 'absent');
  result.absentCount = absentRecords.length;

  if (absentRecords.length === 0) {
    return result;
  }

  // 2. Process each absent student
  for (const record of absentRecords) {
    // Verify student exists and belongs to this institution
    const { data: student, error: stuErr } = await supabase
      .from('students')
      .select('id, institution_id')
      .eq('id', record.studentId)
      .eq('institution_id', input.institutionId)
      .maybeSingle();

    if (stuErr || !student) {
      result.skippedGuardians.push({
        studentId: record.studentId,
        reason: 'STUDENT_NOT_FOUND_OR_CROSS_INSTITUTION',
      });
      continue;
    }

    // Resolve guardians
    const { targets, skipped } = await resolveStudentGuardiansForNotification(
      supabase,
      input.institutionId,
      record.studentId
    );

    if (skipped.length > 0) {
      skipped.forEach((s) => {
        result.skippedGuardians.push({
          studentId: record.studentId,
          guardianId: s.guardianId,
          reason: s.reason,
        });
      });
    }

    // Queue notification for each authorized target guardian
    for (const guardian of targets) {
      const queueRes = await queueAbsenceNotificationForGuardian(supabase, {
        institutionId: input.institutionId,
        sessionId: input.sessionId,
        sessionDate: input.sessionDate,
        studentId: record.studentId,
        guardian,
        markedByUserId: input.markedByUserId,
      });

      if (queueRes.success && !queueRes.duplicate) {
        result.guardiansNotifiedCount++;
        result.notificationsCreated++;
        result.deliveriesQueued += guardian.enabledChannels.length;
        result.details.push({
          studentId: record.studentId,
          guardianUserId: guardian.guardianUserId,
          notificationId: queueRes.notificationId!,
          channels: guardian.enabledChannels,
          idempotencyKey: queueRes.idempotencyKey!,
        });
      } else if (queueRes.duplicate) {
        result.skippedGuardians.push({
          studentId: record.studentId,
          guardianId: guardian.guardianId,
          reason: 'DUPLICATE_IDEMPOTENT_SUBMISSION',
        });
      } else if (queueRes.error) {
        result.skippedGuardians.push({
          studentId: record.studentId,
          guardianId: guardian.guardianId,
          reason: `QUEUE_ERROR: ${queueRes.error}`,
        });
      }
    }
  }

  return result;
}
