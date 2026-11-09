'use server';

import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createHostelBuildingSchema,
  createHostelRoomSchema,
  createHostelBedSchema,
  allocateBedSchema,
  vacateBedSchema,
  submitHostelApplicationSchema,
  reviewHostelApplicationSchema,
  requestRoomTransferSchema,
  createOutpassSchema,
  updateOutpassStatusSchema,
  registerVisitorSchema,
  createComplaintSchema,
  resolveComplaintSchema,
  manageMessSchema,
  type CreateHostelBuildingInput,
  type CreateHostelRoomInput,
  type CreateHostelBedInput,
  type AllocateBedInput,
  type VacateBedInput,
  type SubmitHostelApplicationInput,
  type ReviewHostelApplicationInput,
  type RequestRoomTransferInput,
  type CreateOutpassInput,
  type UpdateOutpassStatusInput,
  type RegisterVisitorInput,
  type CreateComplaintInput,
  type ResolveComplaintInput,
  type ManageMessInput,
} from '@edu-platform/validators';

// ============================================================================
// 1. Overview & Statistics
// ============================================================================

export async function getHostelOverviewStatsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const [
      { data: buildings },
      { data: rooms },
      { data: beds },
      { data: allocations },
      { data: applications },
      { data: outpasses },
      { data: complaints },
    ] = await Promise.all([
      supabase.from('hostel_buildings').select('id, status, gender_policy').eq('institution_id', institutionId),
      supabase.from('hostel_rooms').select('id, status, bed_capacity').eq('institution_id', institutionId),
      supabase.from('hostel_beds').select('id, status').eq('institution_id', institutionId),
      supabase.from('hostel_allocations').select('id, status').eq('institution_id', institutionId),
      supabase.from('hostel_applications').select('id, status').eq('institution_id', institutionId),
      supabase.from('hostel_outpasses').select('id, status').eq('institution_id', institutionId),
      supabase.from('hostel_complaints').select('id, status, priority').eq('institution_id', institutionId),
    ]);

    const buildingList = buildings || [];
    const roomList = rooms || [];
    const bedList = beds || [];
    const allocList = allocations || [];
    const appList = applications || [];
    const outpassList = outpasses || [];
    const complaintList = complaints || [];

    const totalBuildings = buildingList.length;
    const totalRooms = roomList.length;
    const totalBeds = bedList.length;
    const occupiedBeds = bedList.filter((b: any) => b.status === 'occupied').length;
    const availableBeds = bedList.filter((b: any) => b.status === 'available').length;
    const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

    const activeAllocations = allocList.filter((a: any) => a.status === 'active').length;
    const pendingApplications = appList.filter((a: any) => a.status === 'pending').length;
    const activeOutpasses = outpassList.filter((o: any) => o.status === 'departed').length;
    const pendingOutpasses = outpassList.filter((o: any) => o.status === 'pending_approval').length;
    const openComplaints = complaintList.filter(
      (c: any) => c.status === 'open' || c.status === 'in_progress'
    ).length;

    return {
      success: true,
      data: {
        totalBuildings,
        totalRooms,
        totalBeds,
        occupiedBeds,
        availableBeds,
        occupancyRate,
        activeAllocations,
        pendingApplications,
        activeOutpasses,
        pendingOutpasses,
        openComplaints,
      },
    };
  } catch (error: any) {
    console.error('getHostelOverviewStatsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch hostel overview stats' };
  }
}

// ============================================================================
// 2. Buildings Management
// ============================================================================

export async function getHostelBuildingsAction(campusId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('hostel_buildings')
      .select('*, warden:staff_profiles!hostel_buildings_warden_id_fkey(id, first_name, last_name, phone)')
      .eq('institution_id', institutionId)
      .order('name', { ascending: true });

    if (campusId) {
      query = query.eq('campus_id', campusId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelBuildingsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch buildings' };
  }
}

export async function createHostelBuildingAction(input: CreateHostelBuildingInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to create hostel building' };
    }

    const validated = createHostelBuildingSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_buildings')
      .insert({
        institution_id: institutionId,
        campus_id: validated.campusId || null,
        name: validated.name,
        building_code: validated.buildingCode.toUpperCase(),
        gender_policy: validated.genderPolicy,
        total_floors: validated.totalFloors,
        warden_id: validated.wardenId || null,
        assistant_warden_id: validated.assistantWardenId || null,
        caretaker_contact: validated.caretakerContact || null,
        address: validated.address || null,
        status: validated.status || 'active',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel');
    revalidatePath('/dashboard/hostel/buildings');
    return { success: true, data };
  } catch (error: any) {
    console.error('createHostelBuildingAction error:', error);
    return { success: false, error: error.message || 'Failed to create building' };
  }
}

// ============================================================================
// 3. Rooms & Beds
// ============================================================================

export async function getHostelRoomsAction(buildingId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_rooms')
      .select('*, building:hostel_buildings(id, name, building_code, gender_policy), beds:hostel_beds(*)')
      .eq('institution_id', institutionId)
      .order('room_number', { ascending: true });

    if (buildingId) {
      queryBuilder = queryBuilder.eq('building_id', buildingId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelRoomsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch rooms' };
  }
}

export async function createHostelRoomAction(input: CreateHostelRoomInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to add rooms' };
    }

    const validated = createHostelRoomSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data: room, error: roomError } = await supabase
      .from('hostel_rooms')
      .insert({
        institution_id: institutionId,
        building_id: validated.buildingId,
        room_number: validated.roomNumber,
        floor_number: validated.floorNumber || 0,
        room_type: validated.roomType,
        bed_capacity: validated.bedCapacity,
        is_ac: validated.isAc ?? false,
        is_attached_washroom: validated.isAttachedWashroom ?? false,
        base_fee_monthly: validated.baseFeeMonthly || 0,
        status: (validated as any).status || 'available',
      })
      .select()
      .single();

    if (roomError) throw roomError;

    // Auto-create beds corresponding to bedCapacity (e.g. Bed A, Bed B...)
    const bedInserts = Array.from({ length: validated.bedCapacity }, (_, idx) => ({
      institution_id: institutionId,
      room_id: room.id,
      bed_number: `${validated.roomNumber}-${String.fromCharCode(65 + idx)}`,
      status: 'available',
    }));

    await supabase.from('hostel_beds').insert(bedInserts);

    revalidatePath('/dashboard/hostel');
    revalidatePath('/dashboard/hostel/rooms');
    return { success: true, data: room };
  } catch (error: any) {
    console.error('createHostelRoomAction error:', error);
    return { success: false, error: error.message || 'Failed to create room' };
  }
}

export async function getHostelBedsAction(roomId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_beds')
      .select(
        `
        *,
        room:hostel_rooms(id, room_number, building:hostel_buildings(id, name, building_code)),
        current_allocation:hostel_allocations!hostel_allocations_bed_id_fkey(
          id, status, student:students(id, first_name, last_name, admission_number)
        )
      `
      )
      .eq('institution_id', institutionId)
      .order('bed_number', { ascending: true });

    if (roomId) {
      queryBuilder = queryBuilder.eq('room_id', roomId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelBedsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch beds' };
  }
}

export async function createHostelBedAction(input: CreateHostelBedInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to create bed' };
    }

    const validated = createHostelBedSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_beds')
      .insert({
        institution_id: institutionId,
        room_id: validated.roomId,
        bed_number: validated.bedNumber,
        status: (validated as any).status || 'available',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/rooms');
    return { success: true, data };
  } catch (error: any) {
    console.error('createHostelBedAction error:', error);
    return { success: false, error: error.message || 'Failed to create bed' };
  }
}

// ============================================================================
// 4. Atomic Allocations & Vacations
// ============================================================================

export async function allocateHostelBedAction(input: AllocateBedInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = allocateBedSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('allocate_hostel_bed_atomic', {
      p_institution_id: institutionId,
      p_student_id: validated.studentId,
      p_bed_id: validated.bedId,
      p_academic_year_id: validated.academicYearId,
      p_allocated_from: validated.allocatedFrom,
      p_allocated_to: validated.allocatedTo || null,
      p_fee_structure_id: validated.feeStructureId || null,
    });

    if (error) throw error;
    if (data && !data.success) {
      return { success: false, error: data.error || 'Failed to allocate bed' };
    }

    revalidatePath('/dashboard/hostel');
    revalidatePath('/dashboard/hostel/allocations');
    revalidatePath('/dashboard/hostel/rooms');
    return { success: true, data };
  } catch (error: any) {
    console.error('allocateHostelBedAction error:', error);
    return { success: false, error: error.message || 'Failed to allocate bed' };
  }
}

export async function vacateHostelBedAction(input: VacateBedInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = vacateBedSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Call atomic stored procedure
    const { data, error } = await supabase.rpc('vacate_hostel_bed_atomic', {
      p_institution_id: institutionId,
      p_allocation_id: validated.allocationId,
    });

    if (error) throw error;
    if (data && !data.success) {
      return { success: false, error: data.error || 'Failed to vacate bed' };
    }

    revalidatePath('/dashboard/hostel');
    revalidatePath('/dashboard/hostel/allocations');
    revalidatePath('/dashboard/hostel/rooms');
    return { success: true, data };
  } catch (error: any) {
    console.error('vacateHostelBedAction error:', error);
    return { success: false, error: error.message || 'Failed to vacate bed' };
  }
}

export async function getHostelAllocationsAction(filters?: {
  status?: string;
  studentId?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_allocations')
      .select(
        `
        *,
        student:students(id, first_name, last_name, admission_number),
        bed:hostel_beds(id, bed_number, room:hostel_rooms(room_number, building:hostel_buildings(name, building_code)))
      `
      )
      .eq('institution_id', institutionId)
      .order('allocated_from', { ascending: false });

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.studentId) {
      queryBuilder = queryBuilder.eq('student_id', filters.studentId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelAllocationsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch allocations' };
  }
}

// ============================================================================
// 5. Hostel Applications & Room Transfers
// ============================================================================

export async function submitHostelApplicationAction(input: SubmitHostelApplicationInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = submitHostelApplicationSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_applications')
      .insert({
        institution_id: institutionId,
        student_id: validated.studentId,
        academic_year_id: validated.academicYearId,
        preferred_building_id: validated.preferredBuildingId || null,
        preferred_room_type: validated.preferredRoomType || null,
        reason: validated.reason || null,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/applications');
    return { success: true, data };
  } catch (error: any) {
    console.error('submitHostelApplicationAction error:', error);
    return { success: false, error: error.message || 'Failed to submit application' };
  }
}

export async function getHostelApplicationsAction(status?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_applications')
      .select(
        `
        *,
        student:students(id, first_name, last_name, admission_number),
        preferred_building:hostel_buildings(id, name)
      `
      )
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (status) {
      queryBuilder = queryBuilder.eq('status', status);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelApplicationsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch applications' };
  }
}

export async function reviewHostelApplicationAction(input: ReviewHostelApplicationInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to review applications' };
    }

    const validated = reviewHostelApplicationSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_applications')
      .update({
        status: validated.status,
        review_notes: validated.reviewNotes || null,
        reviewed_by: session.user.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', validated.applicationId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/applications');
    return { success: true, data };
  } catch (error: any) {
    console.error('reviewHostelApplicationAction error:', error);
    return { success: false, error: error.message || 'Failed to review application' };
  }
}

export async function submitHostelTransferRequestAction(input: RequestRoomTransferInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = requestRoomTransferSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_room_transfers')
      .insert({
        institution_id: institutionId,
        allocation_id: validated.allocationId,
        target_bed_id: validated.targetBedId || null,
        reason: validated.reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/allocations');
    return { success: true, data };
  } catch (error: any) {
    console.error('submitHostelTransferRequestAction error:', error);
    return { success: false, error: error.message || 'Failed to submit room transfer' };
  }
}

// ============================================================================
// 6. Outpasses & Student Leave Workflows
// ============================================================================

export async function createHostelOutpassAction(input: CreateOutpassInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = createOutpassSchema.parse(input);
    const supabase = (await createClient()) as any;

    const gatePass = Math.random().toString(36).substring(2, 10).toUpperCase();

    const { data, error } = await supabase
      .from('hostel_outpasses')
      .insert({
        institution_id: institutionId,
        student_id: validated.studentId,
        departure_time: validated.departureTime,
        expected_return_time: validated.expectedReturnTime,
        purpose: validated.purpose,
        destination: validated.destination,
        emergency_contact: validated.emergencyContact,
        parent_consent_status: validated.parentConsentStatus || 'not_required',
        warden_status: 'pending',
        status: 'pending_approval',
        gate_pass_code: gatePass,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/leave');
    return { success: true, data };
  } catch (error: any) {
    console.error('createHostelOutpassAction error:', error);
    return { success: false, error: error.message || 'Failed to create outpass' };
  }
}

export async function getHostelOutpassesAction(filters?: {
  status?: string;
  studentId?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_outpasses')
      .select('*, student:students(id, first_name, last_name, admission_number)')
      .eq('institution_id', institutionId)
      .order('departure_time', { ascending: false });

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.studentId) {
      queryBuilder = queryBuilder.eq('student_id', filters.studentId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelOutpassesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch outpasses' };
  }
}

export async function updateHostelOutpassStatusAction(input: UpdateOutpassStatusInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = updateOutpassStatusSchema.parse(input);
    const supabase = (await createClient()) as any;

    const rawVal = validated as any;
    const updates: Record<string, any> = {
      status: validated.status,
      notes: rawVal.notes || null,
      updated_at: new Date().toISOString(),
    };

    if (validated.status === 'departed' || rawVal.action === 'check_out') {
      updates.status = 'departed';
      updates.actual_departure_time = new Date().toISOString();
    } else if (validated.status === 'completed' || (validated.status as any) === 'returned' || rawVal.action === 'check_in') {
      updates.status = 'completed';
      updates.actual_return_time = new Date().toISOString();
    } else if (validated.status === 'approved' || rawVal.action === 'approve_warden') {
      updates.status = 'approved';
      updates.warden_status = 'approved';
      updates.warden_approved_by = session.user.id;
      updates.warden_approved_at = new Date().toISOString();
    } else if (validated.status === 'rejected' || rawVal.action === 'reject_warden') {
      updates.status = 'rejected';
      updates.warden_status = 'rejected';
      updates.rejection_reason = validated.rejectionReason || rawVal.notes || 'Rejected by administration';
    }

    const { data, error } = await supabase
      .from('hostel_outpasses')
      .update(updates)
      .eq('institution_id', institutionId)
      .eq('id', validated.outpassId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/leave');
    return { success: true, data };
  } catch (error: any) {
    console.error('updateHostelOutpassStatusAction error:', error);
    return { success: false, error: error.message || 'Failed to update outpass status' };
  }
}

// ============================================================================
// 7. Visitors & Complaints
// ============================================================================

export async function createHostelVisitorAction(input: RegisterVisitorInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = registerVisitorSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_visitors')
      .insert({
        institution_id: institutionId,
        student_id: validated.studentId,
        visitor_name: validated.visitorName,
        relationship: validated.relationship,
        id_proof_type: validated.idProofType || 'government_id',
        id_proof_number: validated.idProofNumber || null,
        contact_phone: validated.contactPhone,
        purpose: validated.purpose || null,
        notes: validated.notes || null,
        checked_in_by: session.user.id,
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/visitors');
    return { success: true, data };
  } catch (error: any) {
    console.error('createHostelVisitorAction error:', error);
    return { success: false, error: error.message || 'Failed to register visitor' };
  }
}

export async function getHostelVisitorsAction(studentId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_visitors')
      .select('*, student:students(id, first_name, last_name, admission_number)')
      .eq('institution_id', institutionId)
      .order('check_in_time', { ascending: false });

    if (studentId) {
      queryBuilder = queryBuilder.eq('student_id', studentId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelVisitorsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch visitors' };
  }
}

export async function checkOutHostelVisitorAction(visitorId: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_visitors')
      .update({
        check_out_time: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', visitorId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/visitors');
    return { success: true, data };
  } catch (error: any) {
    console.error('checkOutHostelVisitorAction error:', error);
    return { success: false, error: error.message || 'Failed to check out visitor' };
  }
}

export async function createHostelComplaintAction(input: CreateComplaintInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = createComplaintSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_complaints')
      .insert({
        institution_id: institutionId,
        student_id: validated.studentId,
        room_id: validated.roomId || null,
        category: validated.category,
        title: validated.title,
        description: validated.description,
        priority: validated.priority || 'normal',
        status: 'open',
      })
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/complaints');
    return { success: true, data };
  } catch (error: any) {
    console.error('createHostelComplaintAction error:', error);
    return { success: false, error: error.message || 'Failed to file complaint' };
  }
}

export async function getHostelComplaintsAction(filters?: {
  status?: string;
  studentId?: string;
}) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_complaints')
      .select(
        `
        *,
        student:students(id, first_name, last_name, admission_number),
        room:hostel_rooms(room_number, building:hostel_buildings(name)),
        assigned_staff:staff_profiles(first_name, last_name)
      `
      )
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      queryBuilder = queryBuilder.eq('status', filters.status);
    }
    if (filters?.studentId) {
      queryBuilder = queryBuilder.eq('student_id', filters.studentId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelComplaintsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch complaints' };
  }
}

export async function resolveHostelComplaintAction(input: ResolveComplaintInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized to resolve complaints' };
    }

    const validated = resolveComplaintSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_complaints')
      .update({
        status: validated.status,
        resolution_notes: validated.resolutionNotes,
        resolved_at: validated.status === 'resolved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('institution_id', institutionId)
      .eq('id', validated.complaintId)
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel/complaints');
    return { success: true, data };
  } catch (error: any) {
    console.error('resolveHostelComplaintAction error:', error);
    return { success: false, error: error.message || 'Failed to update complaint' };
  }
}

// ============================================================================
// 8. Mess / Meals
// ============================================================================

export async function manageHostelMessAction(input: ManageMessInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = manageMessSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('hostel_mess_records')
      .upsert(
        {
          institution_id: institutionId,
          student_id: validated.studentId,
          meal_plan: validated.mealPlan,
          dietary_notes: validated.dietaryNotes || null,
          start_date: validated.startDate,
          end_date: validated.endDate || null,
          status: (validated as any).status || 'active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'institution_id,student_id' }
      )
      .select()
      .single();

    if (error) throw error;
    revalidatePath('/dashboard/hostel');
    return { success: true, data };
  } catch (error: any) {
    console.error('manageHostelMessAction error:', error);
    return { success: false, error: error.message || 'Failed to update mess records' };
  }
}

export async function getHostelMessRecordsAction(studentId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let queryBuilder = supabase
      .from('hostel_mess_records')
      .select('*, student:students(id, first_name, last_name, admission_number)')
      .eq('institution_id', institutionId);

    if (studentId) {
      queryBuilder = queryBuilder.eq('student_id', studentId);
    }

    const { data, error } = await queryBuilder;
    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getHostelMessRecordsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch mess records' };
  }
}
