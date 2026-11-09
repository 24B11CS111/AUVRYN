'use server';

import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createInstitutionEventSchema,
  updateEventStatusSchema,
  registerEventParticipantSchema,
  recordEventAttendanceSchema,
  issueEventCertificateSchema,
  type CreateInstitutionEventInput,
  type UpdateEventStatusInput,
  type RegisterEventParticipantInput,
  type RecordEventAttendanceInput,
  type IssueEventCertificateInput,
} from '@edu-platform/validators';

// ============================================================================
// 1. Overview & Statistics
// ============================================================================

export async function getEventsOverviewStatsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const [
      { data: events },
      { data: registrations },
      { data: attendance },
      { data: certificates },
    ] = await Promise.all([
      supabase.from('institution_events').select('id, status, event_type, start_time, max_participants').eq('institution_id', institutionId),
      supabase.from('event_registrations').select('id, status, participant_category, event_id').eq('institution_id', institutionId),
      supabase.from('event_attendance').select('id, event_registration:event_registrations(event_id)').eq('institution_id', institutionId),
      supabase.from('event_certificates').select('id, certificate_type').eq('institution_id', institutionId),
    ]);

    const eventList = events || [];
    const regList = registrations || [];
    const attList = attendance || [];
    const certList = certificates || [];

    const nowStr = new Date().toISOString();

    const totalEvents = eventList.length;
    const upcomingEvents = eventList.filter(
      (e: any) => e.status === 'published' && e.start_time > nowStr
    ).length;
    const completedEvents = eventList.filter((e: any) => e.status === 'completed').length;
    const ongoingEvents = eventList.filter((e: any) => e.status === 'ongoing').length;

    const totalRegistrations = regList.length;
    const studentRegistrations = regList.filter((r: any) => r.participant_category === 'student').length;
    const staffRegistrations = regList.filter((r: any) => r.participant_category === 'staff').length;
    const guestRegistrations = regList.filter((r: any) => r.participant_category === 'guest').length;

    const totalCheckIns = attList.length;
    const totalCertificatesIssued = certList.length;

    return {
      success: true,
      data: {
        totalEvents,
        upcomingEvents,
        completedEvents,
        ongoingEvents,
        totalRegistrations,
        studentRegistrations,
        staffRegistrations,
        guestRegistrations,
        totalCheckIns,
        totalCertificatesIssued,
      },
    };
  } catch (error: any) {
    console.error('getEventsOverviewStatsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch events statistics' };
  }
}

// ============================================================================
// 2. Events Management
// ============================================================================

export async function getEventsAction(filters?: {
  eventType?: string;
  status?: string;
  query?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('institution_events')
      .select(
        `
        *,
        campus:campuses(id, name),
        organizer:staff_profiles(id, first_name, last_name, email),
        registrations:event_registrations(id, status)
      `
      )
      .eq('institution_id', institutionId)
      .order('start_time', { ascending: false });

    if (filters?.eventType) {
      queryBuilder = queryBuilder.eq('event_type', filters.eventType);
    }
    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.query) {
      queryBuilder = queryBuilder.or(
        `title.ilike.%${filters.query}%,description.ilike.%${filters.query}%,venue.ilike.%${filters.query}%`
      );
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getEventsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch events' };
  }
}

export async function getEventDetailsAction(eventId: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('institution_events')
      .select(
        `
        *,
        campus:campuses(id, name),
        organizer:staff_profiles(id, first_name, last_name, email),
        registrations:event_registrations(
          id, participant_category, status, ticket_code, registered_at,
          student:students(id, first_name, last_name, admission_number),
          staff:staff_profiles(id, first_name, last_name),
          guest_name, guest_email, guest_phone,
          attendance:event_attendance(id, checked_in_at),
          certificate:event_certificates(id, certificate_number, certificate_url)
        )
      `
      )
      .eq('institution_id', institutionId)
      .eq('id', eventId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error: any) {
    console.error('getEventDetailsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch event details' };
  }
}

export async function createEventAction(input: CreateInstitutionEventInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to create events' };
    }

    const validated = createInstitutionEventSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('institution_events')
      .insert({
        institution_id: institutionId,
        campus_id: validated.campusId || null,
        title: validated.title,
        event_type: validated.eventType,
        description: validated.description || null,
        venue: validated.venue,
        start_time: validated.startTime,
        end_time: validated.endTime,
        registration_deadline: validated.registrationDeadline || null,
        max_participants: validated.maxParticipants || 0,
        is_registration_open: validated.isRegistrationOpen ?? true,
        organizer_staff_id: validated.organizerStaffId || null,
        status: validated.status || 'draft',
        banner_url: validated.bannerUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/events');
    return { success: true, data };
  } catch (error: any) {
    console.error('createEventAction error:', error);
    return { success: false, error: error.message || 'Failed to create event' };
  }
}

export async function updateEventStatusAction(input: UpdateEventStatusInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to change event status' };
    }

    const validated = updateEventStatusSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('institution_events')
      .update({
        status: validated.status,
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', validated.eventId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/events');
    revalidatePath(`/dashboard/events/${validated.eventId}`);
    return { success: true, data };
  } catch (error: any) {
    console.error('updateEventStatusAction error:', error);
    return { success: false, error: error.message || 'Failed to update event status' };
  }
}

// ============================================================================
// 3. Event Registrations (Atomic Capacity Limit & Waitlist)
// ============================================================================

export async function registerEventParticipantAction(input: RegisterEventParticipantInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = registerEventParticipantSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('register_event_participant_atomic', {
      p_institution_id: institutionId,
      p_event_id: validated.eventId,
      p_participant_category: validated.participantCategory,
      p_student_id: validated.studentId || null,
      p_staff_id: validated.staffId || null,
      p_guest_name: validated.guestName || null,
      p_guest_email: validated.guestEmail || null,
      p_guest_phone: validated.guestPhone || null,
    });

    if (error) throw error;
    if (data && !data.success) {
      return { success: false, error: data.error || 'Failed to register for event' };
    }

    revalidatePath('/dashboard/events');
    revalidatePath(`/dashboard/events/${validated.eventId}`);
    revalidatePath('/dashboard/events/registrations');
    return { success: true, data };
  } catch (error: any) {
    console.error('registerEventParticipantAction error:', error);
    return { success: false, error: error.message || 'Failed to register participant' };
  }
}

export async function getEventRegistrationsAction(filters?: {
  eventId?: string;
  status?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('event_registrations')
      .select(
        `
        *,
        event:institution_events(id, title, event_type, start_time, venue),
        student:students(id, first_name, last_name, admission_number),
        staff:staff_profiles(id, first_name, last_name),
        attendance:event_attendance(id, checked_in_at)
      `
      )
      .eq('institution_id', institutionId)
      .order('registered_at', { ascending: false });

    if (filters?.eventId) {
      queryBuilder = queryBuilder.eq('event_id', filters.eventId);
    }
    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getEventRegistrationsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch registrations' };
  }
}

// ============================================================================
// 4. Physical Attendance & Check-in
// ============================================================================

export async function recordEventAttendanceAction(input: RecordEventAttendanceInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to check in attendees' };
    }

    const validated = recordEventAttendanceSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('event_attendance')
      .upsert(
        {
          institution_id: institutionId,
          registration_id: validated.registrationId,
          checked_in_at: new Date().toISOString(),
          checked_in_by: session.user.id,
        },
        { onConflict: 'registration_id' }
      )
      .select()
      .single();

    if (error) throw error;

    // Update registration status to attended
    await supabase
      .from('event_registrations')
      .update({ status: 'attended', updated_at: new Date().toISOString() })
      .eq('id', validated.registrationId);

    revalidatePath('/dashboard/events/attendance');
    revalidatePath('/dashboard/events/registrations');
    return { success: true, data };
  } catch (error: any) {
    console.error('recordEventAttendanceAction error:', error);
    return { success: false, error: error.message || 'Failed to check in attendee' };
  }
}

export async function getEventAttendanceAction(_eventId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('event_attendance')
      .select(
        `
        *,
        registration:event_registrations(
          id, ticket_code, participant_category, guest_name,
          student:students(id, first_name, last_name, admission_number),
          staff:staff_profiles(id, first_name, last_name)
        ),
        checker:staff_profiles(id, first_name, last_name)
      `
      )
      .eq('institution_id', institutionId)
      .order('checked_in_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getEventAttendanceAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch attendance records' };
  }
}

// ============================================================================
// 5. Certificates Issuance
// ============================================================================

export async function issueEventCertificateAction(input: IssueEventCertificateInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to issue certificates' };
    }

    const validated = issueEventCertificateSchema.parse(input);
    const supabase = (await createClient()) as any;

    const certNumber =
      validated.certificateNumber ||
      `CERT-${Date.now().toString(36).toUpperCase()}-${Math.floor(Math.random() * 1000)}`;

    const { data, error } = await supabase
      .from('event_certificates')
      .insert({
        institution_id: institutionId,
        registration_id: validated.registrationId,
        certificate_number: certNumber,
        certificate_type: validated.certificateType || 'participation',
        title: validated.title,
        issued_by: session.user.id,
        certificate_url: validated.certificateUrl || null,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/events/certificates');
    return { success: true, data };
  } catch (error: any) {
    console.error('issueEventCertificateAction error:', error);
    return { success: false, error: error.message || 'Failed to issue certificate' };
  }
}

export async function getEventCertificatesAction(_eventId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('event_certificates')
      .select(
        `
        *,
        registration:event_registrations(
          id, ticket_code, participant_category, guest_name,
          event:institution_events(id, title, event_type),
          student:students(id, first_name, last_name, admission_number),
          staff:staff_profiles(id, first_name, last_name)
        )
      `
      )
      .eq('institution_id', institutionId)
      .order('issued_at', { ascending: false });

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getEventCertificatesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch certificates' };
  }
}
