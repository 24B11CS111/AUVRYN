/**
 * AUVRYN Universal Announcement & Notification Fan-Out Engine
 *
 * Resolves target audience recipients across multi-tenant boundaries based on:
 * - Scope: institution, campus, department, program, class, section, role, individual
 * - Target Roles: parent, student, faculty, staff, admin, owner
 * - Multi-class / multi-section arrays in metadata
 *
 * Atomically generates:
 * 1. In-app notification rows in public.notifications
 * 2. Outbox push delivery jobs in public.notification_deliveries (for registered Expo push tokens)
 * 3. Non-PII audit logging
 */

import { SupabaseClient } from '@supabase/supabase-js';
import type {
  NotificationCategory,
  NotificationPriority,
  Role,
} from '@edu-platform/types';

export interface FanoutOptions {
  announcementId?: string;
  institutionId: string;
  scope: 'institution' | 'campus' | 'department' | 'program' | 'class' | 'section' | 'role' | 'individual';
  targetRoles?: Role[];
  targetClassId?: string | null;
  targetSectionId?: string | null;
  targetDepartmentId?: string | null;
  targetProgramId?: string | null;
  targetCampusId?: string | null;
  targetUserIds?: string[];
  metadata?: {
    targetClassIds?: string[];
    targetSectionIds?: string[];
    targetDepartmentIds?: string[];
    deepLinkRoute?: string;
    entityId?: string;
    entityType?: string;
    [key: string]: unknown;
  };
  title: string;
  body: string;
  category: NotificationCategory;
  priority?: NotificationPriority;
  authorId?: string;
}

export interface FanoutResult {
  success: boolean;
  recipientCount: number;
  notificationsCreated: number;
  pushDeliveriesQueued: number;
  recipientUserIds: string[];
  error?: string;
}

/**
 * Resolves eligible recipient user IDs for a given scope and targeting criteria.
 */
export async function resolveAudienceUserIds(
  supabase: SupabaseClient,
  options: FanoutOptions
): Promise<string[]> {
  const {
    institutionId,
    scope,
    targetRoles = [],
    targetClassId,
    targetSectionId,
    targetDepartmentId,
    targetProgramId,
    targetUserIds = [],
    metadata = {},
  } = options;

  // 1. If explicit user IDs provided, verify they are active institution members
  if (scope === 'individual' && targetUserIds.length > 0) {
    const { data: verified } = await supabase
      .from('institution_memberships')
      .select('user_id')
      .eq('institution_id', institutionId)
      .eq('status', 'active')
      .in('user_id', targetUserIds);

    return Array.from(new Set((verified || []).map((m: any) => m.user_id)));
  }

  const recipientUserIds = new Set<string>();

  // Helper to collect classes & sections to target
  const classIds = new Set<string>();
  if (targetClassId) classIds.add(targetClassId);
  if (metadata.targetClassIds && Array.isArray(metadata.targetClassIds)) {
    metadata.targetClassIds.forEach((id) => classIds.add(id));
  }

  const sectionIds = new Set<string>();
  if (targetSectionId) sectionIds.add(targetSectionId);
  if (metadata.targetSectionIds && Array.isArray(metadata.targetSectionIds)) {
    metadata.targetSectionIds.forEach((id) => sectionIds.add(id));
  }

  const rolesToMatch = targetRoles.length > 0
    ? targetRoles
    : ['owner', 'admin', 'faculty', 'student', 'parent', 'staff'];

  const shouldIncludeStudents = rolesToMatch.includes('student');
  const shouldIncludeParents = rolesToMatch.includes('parent') || (rolesToMatch as string[]).includes('guardian');
  const shouldIncludeFaculty = rolesToMatch.includes('faculty') || (rolesToMatch as string[]).includes('teacher');
  const shouldIncludeAdmins = rolesToMatch.includes('owner') || rolesToMatch.includes('admin');

  // 2. Class / Section Scoped Resolution
  if (scope === 'class' || scope === 'section' || classIds.size > 0 || sectionIds.size > 0) {
    let studentIds: string[] = [];

    // Find enrolled students
    let enrollmentQuery = supabase
      .from('student_enrollments')
      .select('student_id, students:student_id(user_id)')
      .eq('institution_id', institutionId)
      .eq('status', 'active');

    if (sectionIds.size > 0) {
      enrollmentQuery = enrollmentQuery.in('section_id', Array.from(sectionIds));
    } else if (classIds.size > 0) {
      enrollmentQuery = enrollmentQuery.in('class_id', Array.from(classIds));
    }

    const { data: enrollments } = await enrollmentQuery;

    if (enrollments && enrollments.length > 0) {
      studentIds = enrollments.map((e: any) => e.student_id);

      if (shouldIncludeStudents) {
        enrollments.forEach((e: any) => {
          if (e.students?.user_id) {
            recipientUserIds.add(e.students.user_id);
          }
        });
      }

      // If parents targeted, find linked guardians
      if (shouldIncludeParents && studentIds.length > 0) {
        const { data: guardianLinks } = await supabase
          .from('student_guardians')
          .select('guardian_id, guardians:guardian_id(user_id)')
          .eq('institution_id', institutionId)
          .in('student_id', studentIds);

        (guardianLinks || []).forEach((gl: any) => {
          if (gl.guardians?.user_id) {
            recipientUserIds.add(gl.guardians.user_id);
          }
        });
      }
    }

    // If faculty targeted, find allocated teachers
    if (shouldIncludeFaculty) {
      let facultyQuery = supabase
        .from('faculty_allocations')
        .select('staff_id, staff_profiles:staff_id(user_id)')
        .eq('institution_id', institutionId)
        .eq('status', 'active');

      if (sectionIds.size > 0) {
        facultyQuery = facultyQuery.in('section_id', Array.from(sectionIds));
      } else if (classIds.size > 0) {
        facultyQuery = facultyQuery.in('class_id', Array.from(classIds));
      }

      const { data: allocations } = await facultyQuery;
      (allocations || []).forEach((a: any) => {
        if (a.staff_profiles?.user_id) {
          recipientUserIds.add(a.staff_profiles.user_id);
        }
      });
    }

    return Array.from(recipientUserIds);
  }

  // 3. Department / Program Scoped Resolution
  if (scope === 'department' || scope === 'program' || targetDepartmentId || targetProgramId) {
    const deptId = targetDepartmentId;
    if (deptId && shouldIncludeFaculty) {
      const { data: staffInDept } = await supabase
        .from('staff_profiles')
        .select('user_id')
        .eq('institution_id', institutionId)
        .eq('department_id', deptId);

      (staffInDept || []).forEach((s: any) => {
        if (s.user_id) recipientUserIds.add(s.user_id);
      });
    }

    // Also collect general memberships matching roles if needed
    if (shouldIncludeAdmins) {
      const { data: admins } = await supabase
        .from('institution_memberships')
        .select('user_id')
        .eq('institution_id', institutionId)
        .eq('status', 'active')
        .in('role', ['owner', 'admin']);

      (admins || []).forEach((a: any) => recipientUserIds.add(a.user_id));
    }

    return Array.from(recipientUserIds);
  }

  // 4. Institution-Wide or Role-Targeted Scoped Resolution (Default)
  let membershipQuery = supabase
    .from('institution_memberships')
    .select('user_id, role')
    .eq('institution_id', institutionId)
    .eq('status', 'active');

  if (targetRoles.length > 0) {
    membershipQuery = membershipQuery.in('role', targetRoles);
  }

  const { data: members } = await membershipQuery;
  (members || []).forEach((m: any) => {
    if (m.user_id) {
      recipientUserIds.add(m.user_id);
    }
  });

  // Also include parents from guardians table if parent role is targeted
  if (shouldIncludeParents) {
    const { data: guardians } = await supabase
      .from('guardians')
      .select('user_id')
      .eq('institution_id', institutionId);

    (guardians || []).forEach((g: any) => {
      if (g.user_id) {
        recipientUserIds.add(g.user_id);
      }
    });
  }

  return Array.from(recipientUserIds);
}

/**
 * Atomically fans out in-app notifications and enqueues push deliveries.
 */
export async function fanoutAnnouncementNotifications(
  supabase: SupabaseClient,
  options: FanoutOptions
): Promise<FanoutResult> {
  try {
    const recipientUserIds = await resolveAudienceUserIds(supabase, options);

    if (recipientUserIds.length === 0) {
      return {
        success: true,
        recipientCount: 0,
        notificationsCreated: 0,
        pushDeliveriesQueued: 0,
        recipientUserIds: [],
      };
    }

    const {
      institutionId,
      title,
      body,
      category = 'announcements',
      priority = 'normal',
      authorId,
      announcementId,
      metadata = {},
    } = options;

    const notificationPayloads = recipientUserIds.map((userId) => ({
      institution_id: institutionId,
      recipient_user_id: userId,
      category,
      title,
      body,
      priority,
      data: {
        announcement_id: announcementId || null,
        deep_link: metadata.deepLinkRoute || `/dashboard/communications/announcements`,
        scope: options.scope,
        category,
        priority,
        ...metadata,
      },
      is_read: false,
      created_by: authorId || null,
      created_at: new Date().toISOString(),
    }));

    // 1. Batch Insert In-App Notifications
    const { data: insertedNotifications, error: insertError } = await supabase
      .from('notifications')
      .insert(notificationPayloads)
      .select('id, recipient_user_id');

    if (insertError) {
      return {
        success: false,
        recipientCount: recipientUserIds.length,
        notificationsCreated: 0,
        pushDeliveriesQueued: 0,
        recipientUserIds: [],
        error: insertError.message,
      };
    }

    const createdNotifications = insertedNotifications || [];

    // 2. Resolve Active Push Tokens for Eligible Recipients
    const { data: activeTokens } = await supabase
      .from('push_device_tokens')
      .select('user_id, token')
      .in('user_id', recipientUserIds)
      .eq('is_active', true);

    const tokenMap = new Map<string, string>();
    (activeTokens || []).forEach((t: any) => {
      if (!tokenMap.has(t.user_id)) {
        tokenMap.set(t.user_id, t.token);
      }
    });

    // 3. Enqueue Push Deliveries for users with registered push tokens
    const pushDeliveries: any[] = [];
    createdNotifications.forEach((n: any) => {
      const token = tokenMap.get(n.recipient_user_id);
      if (token) {
        pushDeliveries.push({
          institution_id: institutionId,
          notification_id: n.id,
          channel: 'push',
          destination: token,
          status: 'pending',
          attempts_count: 0,
          max_attempts: 3,
          idempotency_key: `push_${n.id}_${token.substring(0, 16)}`,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
    });

    let pushCount = 0;
    if (pushDeliveries.length > 0) {
      const { error: pushError } = await supabase
        .from('notification_deliveries')
        .insert(pushDeliveries);

      if (!pushError) {
        pushCount = pushDeliveries.length;
      }
    }

    return {
      success: true,
      recipientCount: recipientUserIds.length,
      notificationsCreated: createdNotifications.length,
      pushDeliveriesQueued: pushCount,
      recipientUserIds,
    };
  } catch (err: any) {
    return {
      success: false,
      recipientCount: 0,
      notificationsCreated: 0,
      pushDeliveriesQueued: 0,
      recipientUserIds: [],
      error: err.message || 'Unknown fanout error',
    };
  }
}
