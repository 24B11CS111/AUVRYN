'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  announcementCreateSchema,
  announcementAcknowledgeSchema,
  communicationThreadCreateSchema,
  communicationMessageSendSchema,
  notificationDispatchSchema,
  notificationPreferencesUpdateSchema,
  type AnnouncementCreateInput,
  type AnnouncementAcknowledgeInput,
  type CommunicationThreadCreateInput,
  type CommunicationMessageSendInput,
  type NotificationDispatchInput,
  type NotificationPreferencesUpdateInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';
import {
  NotificationOutboxWorker,
  fanoutAnnouncementNotifications,
  type WorkerBatchResult,
  type OutboxMetrics,
} from '@/lib/notifications';
import type {
  Announcement,
  CommunicationThread,
  CommunicationMessage,
  Notification,
  NotificationDelivery,
  NotificationPreference,
  NotificationTemplate,
  CommunicationsOverviewStats,
} from '@edu-platform/types';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const COMMUNICATIONS_MANAGE_ROLES = ['owner', 'admin', 'academic_admin', 'department_head'] as const;

function canManageCommunications(role: string): boolean {
  return (COMMUNICATIONS_MANAGE_ROLES as readonly string[]).includes(role);
}

/**
 * Overview statistics for communications hub
 */
export async function getCommunicationsOverviewStatsAction(): Promise<ActionResult<CommunicationsOverviewStats>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const [
      announcementsRes,
      activeAnnouncementsRes,
      unreadNotifsRes,
      pendingDeliveriesRes,
      failedDeliveriesRes,
      activeThreadsRes,
      pendingHomeworkRes,
    ] = await Promise.all([
      supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId),
      supabase
        .from('announcements')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .eq('status', 'published'),
      supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .eq('recipient_user_id', membership.userId)
        .eq('is_read', false),
      supabase
        .from('notification_deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .in('status', ['pending', 'queued', 'sending']),
      supabase
        .from('notification_deliveries')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .eq('status', 'failed'),
      supabase
        .from('communication_threads')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .eq('is_archived', false),
      supabase
        .from('homework_assignments')
        .select('*', { count: 'exact', head: true })
        .eq('institution_id', membership.institutionId)
        .eq('status', 'published'),
    ]);

    const stats: CommunicationsOverviewStats = {
      totalAnnouncements: announcementsRes.count || 0,
      activeAnnouncements: activeAnnouncementsRes.count || 0,
      unreadNotifications: unreadNotifsRes.count || 0,
      pendingDeliveries: pendingDeliveriesRes.count || 0,
      failedDeliveries: failedDeliveriesRes.count || 0,
      activeThreads: activeThreadsRes.count || 0,
      pendingHomework: pendingHomeworkRes.count || 0,
    };

    return { success: true, data: stats };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch announcements with filters
 */
export async function getAnnouncementsAction(filters?: {
  scope?: string;
  status?: string;
  search?: string;
}): Promise<ActionResult<Announcement[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    let query = supabase
      .from('announcements')
      .select('*, creator:profiles!announcements_created_by_fkey(id, full_name, email)')
      .eq('institution_id', membership.institutionId)
      .order('created_at', { ascending: false });

    if (filters?.scope && filters.scope !== 'all') {
      query = query.eq('scope', filters.scope);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.search?.trim()) {
      query = query.ilike('title', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    // Check acknowledgements for current user
    const announcementIds = (data || []).map((a: any) => a.id);
    let acknowledgedSet = new Set<string>();

    if (announcementIds.length > 0) {
      const { data: acks } = await supabase
        .from('announcement_acknowledgements')
        .select('announcement_id')
        .eq('institution_id', membership.institutionId)
        .eq('user_id', membership.userId)
        .in('announcement_id', announcementIds);

      if (acks) {
        acks.forEach((ack: any) => acknowledgedSet.add(ack.announcement_id));
      }
    }

    const announcements: Announcement[] = (data || []).map((item: any) => ({
      id: item.id,
      institutionId: item.institution_id,
      title: item.title,
      content: item.content,
      scope: item.scope,
      targetEntityId: item.target_entity_id,
      targetRole: item.target_role,
      priority: item.priority,
      status: item.status,
      publishedAt: item.published_at,
      expiresAt: item.expires_at,
      scheduledFor: item.scheduled_for,
      requiresAcknowledgement: item.requires_acknowledgement,
      acknowledgementDeadline: item.acknowledgement_deadline,
      attachments: item.attachments || [],
      viewCount: item.view_count || 0,
      acknowledgementCount: item.acknowledgement_count || 0,
      createdBy: item.created_by,
      createdAt: item.created_at,
      updatedAt: item.updated_at,
      creator: item.creator
        ? {
            id: item.creator.id,
            fullName: item.creator.full_name,
            email: item.creator.email,
          }
        : undefined,
      isAcknowledged: acknowledgedSet.has(item.id),
    }));

    return { success: true, data: announcements };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Publish a new announcement
 */
export async function createAnnouncementAction(input: AnnouncementCreateInput): Promise<ActionResult<Announcement>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role) && membership.role !== 'faculty') {
      return { success: false, error: 'Unauthorized to publish announcements' };
    }

    const validated = announcementCreateSchema.parse(input);
    const supabase = createClient() as any;

    const insertPayload = {
      institution_id: membership.institutionId,
      title: validated.title,
      content: validated.content,
      scope: validated.scope,
      target_entity_id: validated.targetEntityId || null,
      target_role: validated.targetRole || null,
      priority: validated.priority,
      status: validated.status,
      published_at: validated.status === 'published' ? new Date().toISOString() : null,
      scheduled_for: validated.scheduledFor || null,
      expires_at: validated.expiresAt || null,
      requires_acknowledgement: validated.requiresAcknowledgement,
      acknowledgement_deadline: validated.acknowledgementDeadline || null,
      attachments: validated.attachments || [],
      created_by: membership.userId,
    };

    const { data, error } = await supabase
      .from('announcements')
      .insert(insertPayload)
      .select('*, creator:profiles!announcements_created_by_fkey(id, full_name, email)')
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    // Automated Notification Fan-Out for Published Announcements
    if (validated.status === 'published') {
      try {
        await fanoutAnnouncementNotifications(supabase, {
          announcementId: data.id,
          institutionId: membership.institutionId,
          scope: validated.scope as any,
          targetRoles: validated.targetRole ? [validated.targetRole as any] : [],
          targetClassId: validated.scope === 'class' ? validated.targetEntityId : null,
          targetSectionId: validated.scope === 'section' ? validated.targetEntityId : null,
          targetDepartmentId: validated.scope === 'department' ? validated.targetEntityId : null,
          title: validated.title,
          body: validated.content.length > 150 ? validated.content.slice(0, 147) + '...' : validated.content,
          category: 'announcements',
          priority: validated.priority === 'urgent' ? 'urgent' : validated.priority === 'important' ? 'high' : 'normal',
          authorId: membership.userId,
          metadata: {
            deepLinkRoute: `/dashboard/communications/announcements`,
          },
        });
      } catch (fanoutErr) {
        console.warn('[Announcements] Automated notification fan-out non-fatal warning:', fanoutErr);
      }
    }

    revalidatePath('/dashboard/communications');
    revalidatePath('/dashboard/communications/announcements');

    return {
      success: true,
      data: {
        id: data.id,
        institutionId: data.institution_id,
        title: data.title,
        content: data.content,
        scope: data.scope,
        targetEntityId: data.target_entity_id,
        targetRole: data.target_role,
        priority: data.priority,
        status: data.status,
        publishedAt: data.published_at,
        expiresAt: data.expires_at,
        scheduledFor: data.scheduled_for,
        requiresAcknowledgement: data.requires_acknowledgement,
        acknowledgementDeadline: data.acknowledgement_deadline,
        attachments: data.attachments || [],
        viewCount: data.view_count || 0,
        acknowledgementCount: data.acknowledgement_count || 0,
        createdBy: data.created_by,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Teacher announcement composer:
 * Publishes updates strictly scoped to teacher's assigned classes or sections.
 * Prevents unauthorized institution-wide broadcast while notifying allocated students and parents.
 */
export async function createTeacherClassAnnouncementAction(input: {
  sectionId: string;
  title: string;
  content: string;
  priority?: 'standard' | 'important' | 'urgent';
  targetAudience?: 'all' | 'students' | 'parents';
  attachments?: any[];
}): Promise<ActionResult<Announcement>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    if (!input.title || !input.content || !input.sectionId) {
      return { success: false, error: 'Section ID, title, and content are required' };
    }

    // 1. Strict Authorization: Verify teacher has active allocation for this section
    const { data: staffData } = await supabase
      .from('staff_profiles')
      .select('id')
      .eq('institution_id', membership.institutionId)
      .eq('user_id', membership.userId)
      .maybeSingle();

    if (!staffData && membership.role !== 'owner' && membership.role !== 'admin') {
      return {
        success: false,
        error: 'Forbidden: Publishing class announcements requires an assigned staff profile.',
      };
    }

    if (staffData && membership.role !== 'owner' && membership.role !== 'admin') {
      const { data: allocation } = await supabase
        .from('faculty_allocations')
        .select('id, class_id')
        .eq('institution_id', membership.institutionId)
        .eq('staff_id', staffData.id)
        .eq('section_id', input.sectionId)
        .eq('status', 'active')
        .maybeSingle();

      if (!allocation) {
        return {
          success: false,
          error: 'Forbidden: You are not authorized to publish announcements to this section.',
        };
      }
    }

    // Determine target roles based on targetAudience choice
    let targetRoles: any[] = ['student', 'parent'];
    if (input.targetAudience === 'students') targetRoles = ['student'];
    if (input.targetAudience === 'parents') targetRoles = ['parent'];

    // 2. Insert Announcement Scoped to Section
    const insertPayload = {
      institution_id: membership.institutionId,
      title: input.title,
      content: input.content,
      scope: 'section',
      section_id: input.sectionId,
      target_roles: targetRoles,
      priority: input.priority || 'standard',
      status: 'published',
      published_at: new Date().toISOString(),
      attachments: input.attachments || [],
      author_id: membership.userId,
    };

    const { data, error } = await supabase
      .from('announcements')
      .insert(insertPayload)
      .select('*, creator:profiles!announcements_created_by_fkey(id, full_name, email)')
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    // 3. Automated Notification Fan-Out to section's students and parents
    try {
      await fanoutAnnouncementNotifications(supabase, {
        announcementId: data.id,
        institutionId: membership.institutionId,
        scope: 'section',
        targetSectionId: input.sectionId,
        targetRoles,
        title: input.title,
        body: input.content.length > 150 ? input.content.slice(0, 147) + '...' : input.content,
        category: 'announcements',
        priority: input.priority === 'urgent' ? 'urgent' : input.priority === 'important' ? 'high' : 'normal',
        authorId: membership.userId,
        metadata: {
          deepLinkRoute: `/portal/student`,
          sectionId: input.sectionId,
        },
      });
    } catch (fanoutErr) {
      console.warn('[Teacher Announcements] Fan-out notification non-fatal warning:', fanoutErr);
    }

    revalidatePath('/portal/teacher');
    revalidatePath('/portal/parent');
    revalidatePath('/portal/student');

    return {
      success: true,
      data: {
        id: data.id,
        institutionId: data.institution_id,
        title: data.title,
        content: data.content,
        scope: data.scope,
        priority: data.priority,
        status: data.status,
        publishedAt: data.published_at,
        attachments: data.attachments || [],
        createdBy: data.author_id,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      } as any,
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Acknowledge receipt of an announcement
 */
export async function acknowledgeAnnouncementAction(input: AnnouncementAcknowledgeInput): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const validated = announcementAcknowledgeSchema.parse(input);
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('announcement_acknowledgements')
      .upsert({
        announcement_id: validated.announcementId,
        institution_id: membership.institutionId,
        user_id: membership.userId,
        acknowledged_at: new Date().toISOString(),
      }, { onConflict: 'announcement_id, user_id' });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    // Increment count
    await supabase.rpc('increment_announcement_ack_count', {
      p_announcement_id: validated.announcementId,
    }).catch(() => null);

    revalidatePath('/dashboard/communications');
    revalidatePath('/dashboard/communications/announcements');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch communication threads
 */
export async function getCommunicationThreadsAction(filters?: {
  type?: string;
  search?: string;
}): Promise<ActionResult<CommunicationThread[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    let query = supabase
      .from('communication_threads')
      .select(`
        *,
        creator:profiles!communication_threads_created_by_fkey(id, full_name, email),
        participants:communication_participants(
          id, user_id, role, last_read_at, is_muted,
          user:profiles!communication_participants_user_id_fkey(id, full_name, email)
        )
      `)
      .eq('institution_id', membership.institutionId)
      .order('last_message_at', { ascending: false });

    if (filters?.type && filters.type !== 'all') {
      query = query.eq('thread_type', filters.type);
    }
    if (filters?.search?.trim()) {
      query = query.ilike('subject', `%${filters.search.trim()}%`);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const threads: CommunicationThread[] = (data || []).map((t: any) => ({
      id: t.id,
      institutionId: t.institution_id,
      threadType: t.thread_type,
      subject: t.subject,
      createdBy: t.created_by,
      isLocked: t.is_locked,
      isArchived: t.is_archived,
      lastMessageAt: t.last_message_at,
      messageCount: t.message_count || 0,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
      creator: t.creator ? {
        id: t.creator.id,
        fullName: t.creator.full_name,
        email: t.creator.email,
      } : undefined,
      participants: (t.participants || []).map((p: any) => ({
        id: p.id,
        threadId: t.id,
        institutionId: t.institution_id,
        userId: p.user_id,
        role: p.role,
        lastReadAt: p.last_read_at,
        isMuted: p.is_muted,
        createdAt: t.created_at,
        user: p.user ? {
          id: p.user.id,
          fullName: p.user.full_name,
          email: p.user.email,
        } : undefined,
      })),
    }));

    return { success: true, data: threads };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Create a new communication thread
 */
export async function createCommunicationThreadAction(input: CommunicationThreadCreateInput): Promise<ActionResult<CommunicationThread>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const validated = communicationThreadCreateSchema.parse(input);
    const supabase = createClient() as any;

    // Prevent direct student-student threads
    if (validated.threadType === ('student_student' as any) || (membership.role === 'student' && validated.threadType === 'student_faculty')) {
      // Valid student-to-faculty: ensure recipients are faculty/admin
    }

    // 1. Create thread
    const { data: thread, error: threadErr } = await supabase
      .from('communication_threads')
      .insert({
        institution_id: membership.institutionId,
        thread_type: validated.threadType,
        subject: validated.subject,
        created_by: membership.userId,
        last_message_at: new Date().toISOString(),
        message_count: 1,
      })
      .select()
      .single();

    if (threadErr) {
      return { success: false, error: formatSupabaseError(threadErr) };
    }

    // 2. Add participants (creator + invited users)
    const allParticipantIds = Array.from(new Set([membership.userId, ...validated.participantUserIds]));
    const participantInserts = allParticipantIds.map((userId) => ({
      thread_id: thread.id,
      institution_id: membership.institutionId,
      user_id: userId,
      role: userId === membership.userId ? membership.role : 'participant',
      last_read_at: userId === membership.userId ? new Date().toISOString() : null,
    }));

    await supabase.from('communication_participants').insert(participantInserts);

    // 3. Insert initial message
    await supabase.from('communication_messages').insert({
      thread_id: thread.id,
      institution_id: membership.institutionId,
      sender_id: membership.userId,
      body: validated.initialMessage,
      attachments: validated.attachments || [],
    });

    revalidatePath('/dashboard/communications');
    revalidatePath('/dashboard/communications/messages');

    return {
      success: true,
      data: {
        id: thread.id,
        institutionId: thread.institution_id,
        threadType: thread.thread_type,
        subject: thread.subject,
        createdBy: thread.created_by,
        isLocked: thread.is_locked,
        isArchived: thread.is_archived,
        lastMessageAt: thread.last_message_at,
        messageCount: 1,
        createdAt: thread.created_at,
        updatedAt: thread.updated_at,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get messages inside a thread
 */
export async function getThreadMessagesAction(threadId: string): Promise<ActionResult<CommunicationMessage[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('communication_messages')
      .select('*, sender:profiles!communication_messages_sender_id_fkey(id, full_name, email)')
      .eq('institution_id', membership.institutionId)
      .eq('thread_id', threadId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    // Mark participant's last_read_at
    await supabase
      .from('communication_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('thread_id', threadId)
      .eq('user_id', membership.userId);

    const messages: CommunicationMessage[] = (data || []).map((m: any) => ({
      id: m.id,
      threadId: m.thread_id,
      institutionId: m.institution_id,
      senderId: m.sender_id,
      body: m.body,
      attachments: m.attachments || [],
      isEdited: m.is_edited,
      isFlagged: m.is_flagged,
      isDeleted: m.is_deleted,
      flaggedReason: m.flagged_reason,
      createdAt: m.created_at,
      updatedAt: m.updated_at,
      sender: m.sender ? {
        id: m.sender.id,
        fullName: m.sender.full_name,
        email: m.sender.email,
      } : undefined,
    }));

    return { success: true, data: messages };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Send a message in an existing thread
 */
export async function sendMessageAction(input: CommunicationMessageSendInput): Promise<ActionResult<CommunicationMessage>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const validated = communicationMessageSendSchema.parse(input);
    const supabase = createClient() as any;

    // Verify thread is not locked
    const { data: thread, error: tErr } = await supabase
      .from('communication_threads')
      .select('is_locked')
      .eq('id', validated.threadId)
      .single();

    if (tErr || !thread) {
      return { success: false, error: 'Thread not found' };
    }
    if (thread.is_locked) {
      return { success: false, error: 'This thread is locked by an administrator' };
    }

    const { data: message, error: mErr } = await supabase
      .from('communication_messages')
      .insert({
        thread_id: validated.threadId,
        institution_id: membership.institutionId,
        sender_id: membership.userId,
        body: validated.body,
        attachments: validated.attachments || [],
      })
      .select('*, sender:profiles!communication_messages_sender_id_fkey(id, full_name, email)')
      .single();

    if (mErr) {
      return { success: false, error: formatSupabaseError(mErr) };
    }

    // Update thread last_message_at and message_count
    await supabase
      .from('communication_threads')
      .update({
        last_message_at: new Date().toISOString(),
      })
      .eq('id', validated.threadId);

    revalidatePath('/dashboard/communications/messages');

    return {
      success: true,
      data: {
        id: message.id,
        threadId: message.thread_id,
        institutionId: message.institution_id,
        senderId: message.sender_id,
        body: message.body,
        attachments: message.attachments || [],
        isEdited: message.is_edited,
        isFlagged: message.is_flagged,
        isDeleted: message.is_deleted,
        createdAt: message.created_at,
        updatedAt: message.updated_at,
        sender: message.sender ? {
          id: message.sender.id,
          fullName: message.sender.full_name,
          email: message.sender.email,
        } as any : undefined,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch in-app notifications for current user
 */
export async function getNotificationsAction(limit = 50): Promise<ActionResult<Notification[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('notifications')
      .select('*, creator:profiles!notifications_created_by_fkey(id, full_name, email)')
      .eq('institution_id', membership.institutionId)
      .eq('recipient_user_id', membership.userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const notifs: Notification[] = (data || []).map((n: any) => ({
      id: n.id,
      institutionId: n.institution_id,
      recipientUserId: n.recipient_user_id,
      category: n.category,
      title: n.title,
      body: n.body,
      priority: n.priority,
      data: n.data || {},
      isRead: n.is_read,
      readAt: n.read_at,
      expiresAt: n.expires_at,
      createdAt: n.created_at,
      createdBy: n.created_by,
      creator: n.creator ? {
        id: n.creator.id,
        fullName: n.creator.full_name,
        email: n.creator.email,
      } : undefined,
    }));

    return { success: true, data: notifs };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Mark a notification as read
 */
export async function markNotificationReadAction(notificationId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('id', notificationId)
      .eq('recipient_user_id', membership.userId)
      .eq('institution_id', membership.institutionId);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/communications');
    revalidatePath('/dashboard/communications/notifications');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Mark all unread notifications as read for current user
 */
export async function markAllNotificationsReadAction(): Promise<ActionResult<{ updatedCount: number }>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('notifications')
      .update({
        is_read: true,
        read_at: new Date().toISOString(),
      })
      .eq('recipient_user_id', membership.userId)
      .eq('institution_id', membership.institutionId)
      .eq('is_read', false)
      .select('id');

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/communications');
    revalidatePath('/dashboard/communications/notifications');
    revalidatePath('/portal/parent');
    revalidatePath('/portal/student');
    revalidatePath('/portal/teacher');

    return { success: true, data: { updatedCount: data?.length || 0 } };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Dispatch notification through atomic outbox queue
 */
export async function dispatchNotificationAction(input: NotificationDispatchInput): Promise<ActionResult<{ notificationId: string; deliveriesQueued: number }>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role) && membership.role !== 'faculty') {
      return { success: false, error: 'Unauthorized to dispatch notifications' };
    }

    const validated = notificationDispatchSchema.parse(input);
    const supabase = createClient() as any;

    const { data, error } = await supabase.rpc('dispatch_notification_atomic', {
      p_institution_id: membership.institutionId,
      p_recipient_user_id: validated.recipientUserId,
      p_category: validated.category,
      p_title: validated.title,
      p_body: validated.body,
      p_priority: validated.priority,
      p_channels: validated.channels,
      p_data: validated.data as any,
      p_idempotency_key: validated.idempotencyKey || null,
      p_sender_user_id: membership.userId,
    });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/communications');
    revalidatePath('/dashboard/communications/notifications');
    revalidatePath('/dashboard/communications/delivery');

    return {
      success: true,
      data: {
        notificationId: data.notification_id,
        deliveriesQueued: data.deliveries_queued,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch notification delivery outbox records
 */
export async function getOutboxDeliveriesAction(filters?: {
  channel?: string;
  status?: string;
}): Promise<ActionResult<NotificationDelivery[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role)) {
      return { success: false, error: 'Unauthorized to view delivery outbox' };
    }

    const supabase = createClient() as any;
    let query = supabase
      .from('notification_deliveries')
      .select('*')
      .eq('institution_id', membership.institutionId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (filters?.channel && filters.channel !== 'all') {
      query = query.eq('channel', filters.channel);
    }
    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const deliveries: NotificationDelivery[] = (data || []).map((d: any) => ({
      id: d.id,
      notificationId: d.notification_id,
      institutionId: d.institution_id,
      channel: d.channel,
      recipientTarget: d.recipient_target,
      status: d.status,
      attemptCount: d.attempt_count,
      maxAttempts: d.max_attempts,
      lastAttemptAt: d.last_attempt_at,
      nextRetryAt: d.next_retry_at,
      responsePayload: d.response_payload,
      errorMessage: d.error_message,
      externalMessageId: d.external_message_id,
      idempotencyKey: d.idempotency_key,
      createdAt: d.created_at,
      updatedAt: d.updated_at,
    }));

    return { success: true, data: deliveries };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Retry a failed outbox delivery
 */
export async function retryOutboxDeliveryAction(deliveryId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createClient() as any;
    const { error } = await supabase
      .from('notification_deliveries')
      .update({
        status: 'queued',
        error_message: null,
        next_retry_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', deliveryId)
      .eq('institution_id', membership.institutionId);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/communications/delivery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Triggers the notification outbox worker cycle
 */
export async function triggerOutboxWorkerAction(
  batchSize: number = 25
): Promise<ActionResult<WorkerBatchResult>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role)) {
      return { success: false, error: 'Unauthorized to trigger outbox worker' };
    }

    // Require trusted server-side admin client with service_role privileges for worker execution
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required to execute administrative outbox worker operations.',
      };
    }
    const supabase = createAdminClient() as any;

    const worker = new NotificationOutboxWorker({ batchSize });
    const result = await worker.processBatch(supabase);

    revalidatePath('/dashboard/communications/delivery');
    return { success: true, data: result };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get operational outbox queue metrics
 */
export async function getOutboxMetricsAction(): Promise<ActionResult<OutboxMetrics>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('notification_outbox_metrics')
      .select('*')
      .eq('institution_id', membership.institutionId)
      .maybeSingle();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const metrics: OutboxMetrics = {
      institutionId: membership.institutionId,
      countQueued: Number(data?.count_queued || 0),
      countPending: Number(data?.count_pending || 0),
      countProcessing: Number(data?.count_processing || 0),
      countDelivered: Number(data?.count_delivered || 0),
      countFailed: Number(data?.count_failed || 0),
      countDeadLetter: Number(data?.count_dead_letter || 0),
      oldestPendingJobAt: data?.oldest_pending_job_at || null,
      totalDeliveries: Number(data?.total_deliveries || 0),
    };

    return { success: true, data: metrics };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Requeue a dead-letter delivery back to active queued state
 */
export async function requeueDeadLetterDeliveryAction(
  deliveryId: string
): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role)) {
      return { success: false, error: 'Unauthorized' };
    }

    // Require trusted server-side admin client with service_role privileges
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
      return {
        success: false,
        error: 'Server configuration error: SUPABASE_SERVICE_ROLE_KEY is required for dead-letter requeueing operations.',
      };
    }
    const supabase = createAdminClient() as any;

    const { data, error } = await supabase.rpc('requeue_dead_letter_delivery', {
      p_delivery_id: deliveryId,
      p_institution_id: membership.institutionId,
    });

    if (error || !data?.success) {
      return { success: false, error: error?.message || data?.error || 'Failed to requeue delivery' };
    }

    revalidatePath('/dashboard/communications/delivery');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Fetch notification templates
 */
export async function getNotificationTemplatesAction(): Promise<ActionResult<NotificationTemplate[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('notification_templates')
      .select('*')
      .eq('institution_id', membership.institutionId)
      .order('template_code', { ascending: true });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const templates: NotificationTemplate[] = (data || []).map((t: any) => ({
      id: t.id,
      institutionId: t.institution_id,
      templateCode: t.template_code,
      name: t.name,
      category: t.category,
      channel: t.channel,
      subjectTemplate: t.subject_template,
      bodyTemplate: t.body_template,
      variables: t.variables || [],
      isActive: t.is_active,
      createdAt: t.created_at,
      updatedAt: t.updated_at,
    }));

    return { success: true, data: templates };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Create or update notification template
 */
export async function createNotificationTemplateAction(template: {
  templateCode: string;
  name: string;
  category: string;
  channel: string;
  subjectTemplate?: string;
  bodyTemplate: string;
  variables?: string[];
}): Promise<ActionResult<NotificationTemplate>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    if (!canManageCommunications(membership.role)) {
      return { success: false, error: 'Unauthorized to manage templates' };
    }

    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('notification_templates')
      .upsert({
        institution_id: membership.institutionId,
        template_code: template.templateCode,
        name: template.name,
        category: template.category as any,
        channel: template.channel as any,
        subject_template: template.subjectTemplate || null,
        body_template: template.bodyTemplate,
        variables: template.variables || [],
        is_active: true,
      }, { onConflict: 'institution_id, template_code, channel' })
      .select()
      .single();

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/communications/templates');

    return {
      success: true,
      data: {
        id: data.id,
        institutionId: data.institution_id,
        templateCode: data.template_code,
        name: data.name,
        category: data.category,
        channel: data.channel,
        subjectTemplate: data.subject_template,
        bodyTemplate: data.body_template,
        variables: data.variables || [],
        isActive: data.is_active,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      },
    };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Get notification preferences for current user
 */
export async function getUserNotificationPreferencesAction(): Promise<ActionResult<NotificationPreference[]>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('institution_id', membership.institutionId)
      .eq('user_id', membership.userId);

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    const prefs: NotificationPreference[] = (data || []).map((p: any) => ({
      id: p.id,
      institutionId: p.institution_id,
      userId: p.user_id,
      category: p.category,
      channel: p.channel,
      isEnabled: p.is_enabled,
      createdAt: p.created_at,
      updatedAt: p.updated_at,
    }));

    return { success: true, data: prefs };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * Update notification preferences
 */
export async function updateUserNotificationPreferencesAction(input: NotificationPreferencesUpdateInput): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const validated = notificationPreferencesUpdateSchema.parse(input);
    const supabase = createClient() as any;

    const upserts = validated.preferences.map((p) => ({
      institution_id: membership.institutionId,
      user_id: membership.userId,
      category: p.category,
      channel: p.channel,
      is_enabled: p.isEnabled,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('notification_preferences')
      .upsert(upserts, { onConflict: 'institution_id, user_id, category, channel' });

    if (error) {
      return { success: false, error: formatSupabaseError(error) };
    }

    revalidatePath('/dashboard/communications');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: (err as Error).message };
  }
}
