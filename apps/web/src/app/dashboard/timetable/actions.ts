'use server';

import { revalidatePath } from 'next/cache';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import {
  roomCreateSchema,
  roomUpdateSchema,
  timetableStructureCreateSchema,
  timetablePeriodsBatchSchema,
  timetableEntryCreateSchema,
  timetableConflictCheckSchema,
  timetableSubstitutionCreateSchema,
  timetableSubstitutionReviewSchema,
  type RoomCreateInput,
  type RoomUpdateInput,
  type TimetableStructureCreateInput,
  type TimetablePeriodsBatchInput,
  type TimetableEntryCreateInput,
  type TimetableConflictCheckInput,
  type TimetableSubstitutionCreateInput,
  type TimetableSubstitutionReviewInput,
} from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

const TIMETABLE_MANAGE_ROLES = ['owner', 'admin', 'academic_admin', 'department_head'] as const;
const TIMETABLE_SUBSTITUTE_ROLES = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'] as const;
const ROOMS_MANAGE_ROLES = ['owner', 'admin', 'academic_admin'] as const;

function canManageTimetable(role: string): boolean {
  return TIMETABLE_MANAGE_ROLES.includes(role as any);
}

function canSubstitute(role: string): boolean {
  return TIMETABLE_SUBSTITUTE_ROLES.includes(role as any);
}

function canManageRooms(role: string): boolean {
  return ROOMS_MANAGE_ROLES.includes(role as any);
}

// ==============================================================================
// 1. Room and Lab Management
// ==============================================================================

export async function getRoomsAction(
  campusId?: string | null,
  isActive?: boolean
): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('rooms')
      .select(`
        id,
        room_number,
        name,
        building,
        floor,
        room_type,
        capacity,
        facilities,
        is_active,
        campus:campuses(id, name, code)
      `)
      .eq('institution_id', institutionId)
      .order('building', { ascending: true })
      .order('room_number', { ascending: true });

    if (campusId) {
      query = query.eq('campus_id', campusId);
    }
    if (typeof isActive === 'boolean') {
      query = query.eq('is_active', isActive);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createRoomAction(input: RoomCreateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageRooms(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to create rooms' };
    }

    const parsed = roomCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid room data' };
    }

    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('rooms')
      .insert({
        institution_id: institutionId,
        campus_id: parsed.data.campusId || null,
        room_number: parsed.data.roomNumber.trim(),
        name: parsed.data.name?.trim() || null,
        building: parsed.data.building.trim(),
        floor: parsed.data.floor?.trim() || null,
        room_type: parsed.data.roomType,
        capacity: parsed.data.capacity,
        facilities: parsed.data.facilities || [],
        is_active: parsed.data.isActive,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id: session.user.id,
      action: 'create',
      entity_type: 'rooms',
      entity_id: data.id,
      description: `Created room ${data.room_number} (${data.building})`,
    });

    revalidatePath('/dashboard/timetable/rooms');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function updateRoomAction(input: RoomUpdateInput): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageRooms(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to update rooms' };
    }

    const parsed = roomUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid room data' };
    }

    const supabase = createClient() as any;
    const updatePayload: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };

    if (parsed.data.campusId !== undefined) updatePayload.campus_id = parsed.data.campusId || null;
    if (parsed.data.roomNumber !== undefined) updatePayload.room_number = parsed.data.roomNumber.trim();
    if (parsed.data.name !== undefined) updatePayload.name = parsed.data.name?.trim() || null;
    if (parsed.data.building !== undefined) updatePayload.building = parsed.data.building.trim();
    if (parsed.data.floor !== undefined) updatePayload.floor = parsed.data.floor?.trim() || null;
    if (parsed.data.roomType !== undefined) updatePayload.room_type = parsed.data.roomType;
    if (parsed.data.capacity !== undefined) updatePayload.capacity = parsed.data.capacity;
    if (parsed.data.facilities !== undefined) updatePayload.facilities = parsed.data.facilities;
    if (parsed.data.isActive !== undefined) updatePayload.is_active = parsed.data.isActive;

    const { data, error } = await supabase
      .from('rooms')
      .update(updatePayload)
      .eq('id', parsed.data.id)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/timetable/rooms');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function deleteRoomAction(roomId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageRooms(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to delete rooms' };
    }

    const supabase = createClient() as any;
    const { error } = await supabase
      .from('rooms')
      .delete()
      .eq('id', roomId)
      .eq('institution_id', institutionId);

    if (error) throw error;

    revalidatePath('/dashboard/timetable/rooms');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 2. Timetable Structures & Period Configuration
// ==============================================================================

export async function getTimetableStructuresAction(
  academicYearId?: string | null,
  campusId?: string | null
): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('timetable_structures')
      .select(`
        id,
        name,
        description,
        working_days,
        start_time,
        end_time,
        periods_per_day,
        is_default,
        is_active,
        academic_year_id,
        campus_id,
        program_id,
        periods:timetable_periods(
          id,
          period_number,
          name,
          start_time,
          end_time,
          is_break,
          break_type,
          session_slot
        )
      `)
      .eq('institution_id', institutionId)
      .order('is_default', { ascending: false })
      .order('name', { ascending: true });

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }
    if (campusId) {
      query = query.eq('campus_id', campusId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Sort periods inside each structure by period_number
    (data || []).forEach((st: any) => {
      if (st.periods) {
        st.periods.sort((a: any, b: any) => a.period_number - b.period_number);
      }
    });

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createTimetableStructureAction(
  input: TimetableStructureCreateInput
): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageTimetable(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to create timetable structure' };
    }

    const parsed = timetableStructureCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid structure data' };
    }

    const supabase = createClient() as any;

    // If default, unset previous default in the same academic year
    if (parsed.data.isDefault) {
      await supabase
        .from('timetable_structures')
        .update({ is_default: false })
        .eq('institution_id', institutionId)
        .eq('academic_year_id', parsed.data.academicYearId);
    }

    const { data, error } = await supabase
      .from('timetable_structures')
      .insert({
        institution_id: institutionId,
        academic_year_id: parsed.data.academicYearId,
        campus_id: parsed.data.campusId || null,
        program_id: parsed.data.programId || null,
        name: parsed.data.name.trim(),
        description: parsed.data.description?.trim() || null,
        working_days: parsed.data.workingDays,
        start_time: parsed.data.startTime,
        end_time: parsed.data.endTime,
        periods_per_day: parsed.data.periodsPerDay,
        is_default: parsed.data.isDefault,
        is_active: parsed.data.isActive,
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Generate default period slots if none exist
    const defaultPeriods = [];
    const parts = parsed.data.startTime.split(':');
    const startH = Number(parts[0] ?? '8');
    const startM = Number(parts[1] ?? '30');
    let curMinutes = startH * 60 + startM;
    const slotDuration = 50; // 50 mins period

    for (let i = 1; i <= parsed.data.periodsPerDay; i++) {
      const nextMinutes = curMinutes + slotDuration;
      const sh = String(Math.floor(curMinutes / 60)).padStart(2, '0');
      const sm = String(curMinutes % 60).padStart(2, '0');
      const eh = String(Math.floor(nextMinutes / 60)).padStart(2, '0');
      const em = String(nextMinutes % 60).padStart(2, '0');

      defaultPeriods.push({
        institution_id: institutionId,
        structure_id: data.id,
        period_number: i,
        name: `Period ${i}`,
        start_time: `${sh}:${sm}:00`,
        end_time: `${eh}:${em}:00`,
        is_break: false,
        break_type: 'none',
        session_slot: curMinutes < 12 * 60 ? 'morning' : 'afternoon',
      });

      curMinutes = nextMinutes + 10; // 10 min gap
    }

    if (defaultPeriods.length > 0) {
      await supabase.from('timetable_periods').insert(defaultPeriods);
    }

    revalidatePath('/dashboard/timetable/manage');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function updateTimetablePeriodsAction(
  input: TimetablePeriodsBatchInput
): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageTimetable(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to modify periods' };
    }

    const parsed = timetablePeriodsBatchSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid period configuration' };
    }

    const supabase = createClient() as any;

    // Delete existing periods and replace with new period definitions
    await supabase
      .from('timetable_periods')
      .delete()
      .eq('structure_id', parsed.data.structureId)
      .eq('institution_id', institutionId);

    const payload = parsed.data.periods.map((p) => ({
      institution_id: institutionId,
      structure_id: parsed.data.structureId,
      period_number: p.periodNumber,
      name: p.name.trim(),
      start_time: p.startTime.length === 5 ? `${p.startTime}:00` : p.startTime,
      end_time: p.endTime.length === 5 ? `${p.endTime}:00` : p.endTime,
      is_break: p.isBreak,
      break_type: p.breakType,
      session_slot: p.sessionSlot,
    }));

    const { error } = await supabase.from('timetable_periods').insert(payload);
    if (error) throw error;

    revalidatePath('/dashboard/timetable/manage');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 3. Timetable Entries & Conflict Detection
// ==============================================================================

export async function getTimetableEntriesAction(filters: {
  academicYearId?: string | null;
  classId?: string | null;
  sectionId?: string | null;
  facultyId?: string | null;
  roomId?: string | null;
  dayOfWeek?: string | null;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('timetable_entries')
      .select(`
        id,
        academic_year_id,
        campus_id,
        structure_id,
        class_id,
        section_id,
        subject_id,
        faculty_id,
        room_id,
        day_of_week,
        start_time,
        end_time,
        period_number,
        session_type,
        effective_start_date,
        effective_end_date,
        is_active,
        color_code,
        notes,
        academic_class:academic_classes(id, name),
        academic_section:academic_sections(id, name),
        subject:academic_subjects(id, name, code, subject_type),
        faculty:staff_profiles(id, employee_id, first_name, last_name, designation),
        room:rooms(id, room_number, name, building, floor, room_type)
      `)
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('period_number', { ascending: true });

    if (filters.academicYearId) query = query.eq('academic_year_id', filters.academicYearId);
    if (filters.classId) query = query.eq('class_id', filters.classId);
    if (filters.sectionId) query = query.eq('section_id', filters.sectionId);
    if (filters.facultyId) query = query.eq('faculty_id', filters.facultyId);
    if (filters.roomId) query = query.eq('room_id', filters.roomId);
    if (filters.dayOfWeek) query = query.eq('day_of_week', filters.dayOfWeek);

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

/**
 * Checks for conflicts before scheduling an entry
 */
export async function checkTimetableConflictsAction(
  input: TimetableConflictCheckInput
): Promise<ActionResult<{ hasConflict: boolean; conflicts: any[] }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    const parsed = timetableConflictCheckSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid conflict check inputs' };
    }

    const supabase = createClient() as any;
    const { data, error } = await supabase.rpc('check_timetable_entry_conflicts', {
      p_institution_id: institutionId,
      p_academic_year_id: parsed.data.academicYearId,
      p_day_of_week: parsed.data.dayOfWeek,
      p_period_number: parsed.data.periodNumber,
      p_start_time: parsed.data.startTime.length === 5 ? `${parsed.data.startTime}:00` : parsed.data.startTime,
      p_end_time: parsed.data.endTime.length === 5 ? `${parsed.data.endTime}:00` : parsed.data.endTime,
      p_faculty_id: parsed.data.facultyId,
      p_room_id: parsed.data.roomId || null,
      p_class_id: parsed.data.classId,
      p_section_id: parsed.data.sectionId || null,
      p_exclude_entry_id: parsed.data.excludeEntryId || null,
    });

    if (error) throw error;

    const conflicts = data || [];
    return {
      success: true,
      data: {
        hasConflict: conflicts.length > 0,
        conflicts,
      },
    };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

/**
 * Atomically saves (creates or updates) a timetable entry using the database stored procedure
 */
export async function saveTimetableEntryAction(
  input: TimetableEntryCreateInput & { id?: string | null }
): Promise<ActionResult<{ id: string }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageTimetable(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to manage timetable entries' };
    }

    const parsed = timetableEntryCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid timetable entry data' };
    }

    const supabase = createClient() as any;

    const startTimeFmt = parsed.data.startTime.length === 5 ? `${parsed.data.startTime}:00` : parsed.data.startTime;
    const endTimeFmt = parsed.data.endTime.length === 5 ? `${parsed.data.endTime}:00` : parsed.data.endTime;

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('save_timetable_entry', {
      p_institution_id: institutionId,
      p_academic_year_id: parsed.data.academicYearId,
      p_campus_id: parsed.data.campusId || null,
      p_structure_id: parsed.data.structureId || null,
      p_class_id: parsed.data.classId,
      p_section_id: parsed.data.sectionId || null,
      p_subject_id: parsed.data.subjectId,
      p_faculty_id: parsed.data.facultyId,
      p_room_id: parsed.data.roomId || null,
      p_day_of_week: parsed.data.dayOfWeek,
      p_start_time: startTimeFmt,
      p_end_time: endTimeFmt,
      p_period_number: parsed.data.periodNumber,
      p_session_type: parsed.data.sessionType,
      p_effective_start_date: parsed.data.effectiveStartDate,
      p_effective_end_date: parsed.data.effectiveEndDate || null,
      p_color_code: parsed.data.colorCode || '#3b82f6',
      p_notes: parsed.data.notes?.trim() || null,
      p_user_id: session.user.id,
      p_entry_id: input.id || null,
    });

    if (error) {
      return { success: false, error: error.message || formatSupabaseError(error) };
    }

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id: session.user.id,
      action: input.id ? 'update' : 'create',
      entity_type: 'timetable_entries',
      entity_id: data,
      description: `Saved timetable slot: Day ${parsed.data.dayOfWeek}, Period ${parsed.data.periodNumber}`,
    });

    revalidatePath('/dashboard/timetable');
    revalidatePath('/dashboard/timetable/manage');
    revalidatePath('/dashboard/timetable/classes');
    revalidatePath('/dashboard/timetable/faculty');
    return { success: true, data: { id: data } };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function deleteTimetableEntryAction(entryId: string): Promise<ActionResult<void>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageTimetable(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Insufficient permissions to delete timetable entries' };
    }

    const supabase = createClient() as any;
    const { error } = await supabase
      .from('timetable_entries')
      .delete()
      .eq('id', entryId)
      .eq('institution_id', institutionId);

    if (error) throw error;

    revalidatePath('/dashboard/timetable');
    revalidatePath('/dashboard/timetable/manage');
    revalidatePath('/dashboard/timetable/classes');
    revalidatePath('/dashboard/timetable/faculty');
    return { success: true };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 4. Faculty Substitution Workflows
// ==============================================================================

export async function getSubstitutionsAction(filters?: {
  date?: string | null;
  facultyId?: string | null;
  status?: string | null;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    let query = supabase
      .from('timetable_substitutions')
      .select(`
        id,
        substitution_date,
        reason,
        status,
        remarks,
        approved_at,
        created_at,
        timetable_entry:timetable_entries(
          id,
          day_of_week,
          period_number,
          start_time,
          end_time,
          session_type,
          academic_class:academic_classes(name),
          academic_section:academic_sections(name),
          subject:academic_subjects(name, code),
          room:rooms(room_number, building)
        ),
        original_faculty:staff_profiles!timetable_substitutions_original_faculty_id_fkey(
          id, employee_id, first_name, last_name, designation
        ),
        substitute_faculty:staff_profiles!timetable_substitutions_substitute_faculty_id_fkey(
          id, employee_id, first_name, last_name, designation
        ),
        approver:profiles(full_name)
      `)
      .eq('institution_id', institutionId)
      .order('substitution_date', { ascending: false });

    if (filters?.date) query = query.eq('substitution_date', filters.date);
    if (filters?.status) query = query.eq('status', filters.status);
    if (filters?.facultyId) {
      query = query.or(`original_faculty_id.eq.${filters.facultyId},substitute_faculty_id.eq.${filters.facultyId}`);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function getAvailableSubstituteFacultyAction(params: {
  date: string;
  dayOfWeek: string;
  periodNumber: number;
  startTime: string;
  endTime: string;
  excludeFacultyId?: string | null;
}): Promise<ActionResult<any[]>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    const startTimeFmt = params.startTime.length === 5 ? `${params.startTime}:00` : params.startTime;
    const endTimeFmt = params.endTime.length === 5 ? `${params.endTime}:00` : params.endTime;

    const { data, error } = await supabase.rpc('get_available_substitute_faculty', {
      p_institution_id: institutionId,
      p_substitution_date: params.date,
      p_day_of_week: params.dayOfWeek,
      p_period_number: params.periodNumber,
      p_start_time: startTimeFmt,
      p_end_time: endTimeFmt,
      p_exclude_faculty_id: params.excludeFacultyId || null,
    });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function createSubstitutionRequestAction(
  input: TimetableSubstitutionCreateInput
): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canSubstitute(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Cannot create substitution requests' };
    }

    const parsed = timetableSubstitutionCreateSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid substitution request' };
    }

    const supabase = createClient() as any;

    const { data, error } = await supabase
      .from('timetable_substitutions')
      .insert({
        institution_id: institutionId,
        timetable_entry_id: parsed.data.timetableEntryId,
        substitution_date: parsed.data.substitutionDate,
        original_faculty_id: parsed.data.originalFacultyId,
        substitute_faculty_id: parsed.data.substituteFacultyId,
        reason: parsed.data.reason.trim(),
        status: 'pending',
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;

    // Create schedule notification for the substitute teacher
    await supabase.from('schedule_notifications').insert({
      institution_id: institutionId,
      recipient_type: 'faculty',
      recipient_id: parsed.data.substituteFacultyId,
      timetable_entry_id: parsed.data.timetableEntryId,
      substitution_id: data.id,
      title: 'Substitution Request Assigned',
      message: `You have been requested to substitute on ${parsed.data.substitutionDate}. Reason: ${parsed.data.reason.trim()}`,
      change_type: 'substitution',
      effective_date: parsed.data.substitutionDate,
      created_by: session.user.id,
    });

    revalidatePath('/dashboard/timetable/faculty');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

export async function reviewSubstitutionAction(
  input: TimetableSubstitutionReviewInput
): Promise<ActionResult<any>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;

    if (!canManageTimetable(session.activeMembership?.role || '')) {
      return { success: false, error: 'Unauthorized: Only administrators and coordinators can review substitutions' };
    }

    const parsed = timetableSubstitutionReviewSchema.safeParse(input);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || 'Invalid review data' };
    }

    const supabase = createClient() as any;
    const { data, error } = await supabase
      .from('timetable_substitutions')
      .update({
        status: parsed.data.status,
        remarks: parsed.data.remarks?.trim() || null,
        approved_by: session.user.id,
        approved_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', parsed.data.substitutionId)
      .eq('institution_id', institutionId)
      .select()
      .single();

    if (error) throw error;

    // Audit log
    await supabase.from('audit_logs').insert({
      institution_id: institutionId,
      actor_id: session.user.id,
      action: 'update',
      entity_type: 'timetable_substitutions',
      entity_id: data.id,
      description: `Reviewed substitution request: ${parsed.data.status}`,
    });

    revalidatePath('/dashboard/timetable/faculty');
    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}

// ==============================================================================
// 5. Attendance Bridge: Start Attendance from Scheduled Timetable Entry
// ==============================================================================

/**
 * Initiates an authorized attendance workflow directly from a scheduled timetable entry.
 * Resolves cohort metadata, pre-fills or references the timetable entry, and returns the session ID.
 */
export async function startAttendanceFromTimetableAction(
  timetableEntryId: string,
  sessionDate: string
): Promise<ActionResult<{ sessionId: string }>> {
  try {
    const session = await requireInstitution();
    const institutionId = session.activeInstitutionId!;
    const supabase = createClient() as any;

    // 1. Fetch timetable entry details
    const { data: entry, error: entryErr } = await supabase
      .from('timetable_entries')
      .select(`
        id,
        academic_year_id,
        campus_id,
        class_id,
        section_id,
        subject_id,
        faculty_id,
        period_number,
        start_time,
        end_time,
        session_type
      `)
      .eq('id', timetableEntryId)
      .eq('institution_id', institutionId)
      .single();

    if (entryErr || !entry) {
      return { success: false, error: 'Timetable entry not found' };
    }

    // 2. Check if an attendance session already exists for this entry and date
    const { data: existingSession } = await supabase
      .from('attendance_sessions')
      .select('id')
      .eq('institution_id', institutionId)
      .eq('session_date', sessionDate)
      .eq('class_id', entry.class_id)
      .eq('subject_id', entry.subject_id)
      .eq('period_number', entry.period_number)
      .maybeSingle();

    if (existingSession) {
      return { success: true, data: { sessionId: existingSession.id } };
    }

    // 3. Map session type
    let mappedType = 'lecture';
    if (entry.session_type === 'laboratory' || entry.session_type === 'practical') {
      mappedType = 'lab';
    } else if (entry.session_type === 'tutorial') {
      mappedType = 'tutorial';
    }

    // 4. Create new attendance session linking timetable_entry_id
    const { data: newSession, error: createErr } = await supabase
      .from('attendance_sessions')
      .insert({
        institution_id: institutionId,
        academic_year_id: entry.academic_year_id,
        campus_id: entry.campus_id,
        class_id: entry.class_id,
        section_id: entry.section_id,
        subject_id: entry.subject_id,
        session_date: sessionDate,
        session_type: mappedType,
        period_number: entry.period_number,
        start_time: entry.start_time,
        end_time: entry.end_time,
        marked_by_staff_id: entry.faculty_id,
        timetable_entry_id: entry.id,
        status: 'draft',
        created_by: session.user.id,
      })
      .select('id')
      .single();

    if (createErr) throw createErr;

    revalidatePath('/dashboard/attendance');
    return { success: true, data: { sessionId: newSession.id } };
  } catch (err: any) {
    return { success: false, error: formatSupabaseError(err) };
  }
}
