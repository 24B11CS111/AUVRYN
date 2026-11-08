'use server';

import { createClient } from '@/lib/supabase/server';
import { requireInstitution } from '@/lib/auth';
import { revalidatePath } from 'next/cache';
import {
  createVehicleSchema,
  createVehicleDocumentSchema,
  createMaintenanceRecordSchema,
  transportStaffProfileSchema,
  createTransportStopSchema,
  createTransportRouteSchema,
  assignRouteStopsSchema,
  assignStudentTransportSchema,
  updateJourneyStatusSchema,
  recordGpsLocationSchema,
  studentBoardingEventSchema,
  correctBoardingEventSchema,
  transportChangeRequestSchema,
  transportSettingsUpdateSchema,
  type CreateVehicleInput,
  type CreateVehicleDocumentInput,
  type CreateMaintenanceRecordInput,
  type TransportStaffProfileInput,
  type CreateTransportStopInput,
  type CreateTransportRouteInput,
  type AssignRouteStopsInput,
  type AssignStudentTransportInput,
  type UpdateJourneyStatusInput,
  type RecordGpsLocationInput,
  type StudentBoardingEventInput,
  type CorrectBoardingEventInput,
  type TransportChangeRequestInput,
  type TransportSettingsUpdateInput,
} from '@edu-platform/validators';
import type {
  TransportVehicleStatus,
  StudentTransportStatus,
} from '@edu-platform/types';

// ============================================================================
// 1. Overview & Statistics
// ============================================================================

export async function getTransportOverviewStatsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const [
      { data: vehicles },
      { data: routes },
      { data: journeys },
      { data: assignments },
      { data: expiringDocs },
    ] = await Promise.all([
      supabase
        .from('transport_vehicles')
        .select('id, status, registration_number, vehicle_model, seating_capacity')
        .eq('institution_id', institutionId),
      supabase
        .from('transport_routes')
        .select('id, status, route_name, route_code, assigned_vehicle_id')
        .eq('institution_id', institutionId),
      supabase
        .from('transport_journeys')
        .select('id, status, journey_date, delay_minutes, route_id')
        .eq('institution_id', institutionId)
        .eq('journey_date', new Date().toISOString().split('T')[0]),
      supabase
        .from('student_transport_assignments')
        .select('id, status, route_id')
        .eq('institution_id', institutionId)
        .eq('status', 'active'),
      supabase
        .from('vehicle_documents')
        .select('id, vehicle_id, document_type, expiry_date, vehicle:transport_vehicles(registration_number)')
        .eq('institution_id', institutionId)
        .gte('expiry_date', new Date().toISOString().split('T')[0])
        .lte(
          'expiry_date',
          new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
        ),
    ]);

    const vehicleList = vehicles || [];
    const routeList = routes || [];
    const journeyList = journeys || [];
    const assignmentList = assignments || [];

    const totalVehicles = vehicleList.length;
    const activeVehicles = vehicleList.filter((v: any) => v.status === 'active').length;
    const underMaintenanceVehicles = vehicleList.filter(
      (v: any) => v.status === 'under_maintenance'
    ).length;

    const totalRoutes = routeList.length;
    const activeRoutes = routeList.filter((r: any) => r.status === 'active').length;

    const activeJourneys = journeyList.filter((j: any) => j.status === 'in_progress').length;
    const delayedJourneys = journeyList.filter(
      (j: any) => j.status === 'delayed' || (j.delay_minutes && j.delay_minutes > 0)
    ).length;

    const totalEnrolledStudents = assignmentList.length;
    const expiringDocumentsCount = (expiringDocs || []).length;

    return {
      success: true,
      data: {
        stats: {
          totalVehicles,
          activeVehicles,
          underMaintenanceVehicles,
          totalRoutes,
          activeRoutes,
          activeJourneys,
          delayedJourneys,
          totalEnrolledStudents,
          expiringDocumentsCount,
        },
        recentJourneys: journeyList.slice(0, 5),
        expiringDocuments: expiringDocs || [],
      },
    };
  } catch (error: any) {
    console.error('getTransportOverviewStatsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch transport overview' };
  }
}

// ============================================================================
// 2. Vehicles & Fleet Management
// ============================================================================

export async function getTransportVehiclesAction(filters?: { status?: string; campusId?: string }) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('transport_vehicles')
      .select(`
        *,
        campus:campuses(id, name),
        documents:vehicle_documents(id, document_type, expiry_date, status)
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }
    if (filters?.campusId) {
      query = query.eq('campus_id', filters.campusId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getTransportVehiclesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch vehicles' };
  }
}

export async function createVehicleAction(input: CreateVehicleInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions to manage vehicles' };
    }

    const validated = createVehicleSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_vehicles')
      .insert({
        institution_id: institutionId,
        registration_number: validated.registrationNumber.toUpperCase(),
        vehicle_model: validated.vehicleModel,
        vehicle_type: validated.vehicleType,
        seating_capacity: validated.seatingCapacity,
        standing_capacity: validated.standingCapacity,
        fuel_type: validated.fuelType || 'diesel',
        ownership_type: validated.ownershipType,
        status: validated.status,
        campus_id: validated.campusId || null,
        gps_device_id: validated.gpsDeviceId || null,
        make_year: validated.makeYear || null,
        color: validated.color || null,
        chassis_number: validated.chassisNumber || null,
        engine_number: validated.engineNumber || null,
        notes: validated.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport');
    revalidatePath('/dashboard/transport/vehicles');
    return { success: true, data };
  } catch (error: any) {
    console.error('createVehicleAction error:', error);
    return { success: false, error: error.message || 'Failed to register vehicle' };
  }
}

export async function updateVehicleStatusAction(vehicleId: string, status: TransportVehicleStatus) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('transport_vehicles')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', vehicleId)
      .eq('institution_id', institutionId);

    if (error) throw error;

    revalidatePath('/dashboard/transport/vehicles');
    return { success: true };
  } catch (error: any) {
    console.error('updateVehicleStatusAction error:', error);
    return { success: false, error: error.message || 'Failed to update vehicle status' };
  }
}

export async function addVehicleDocumentAction(input: CreateVehicleDocumentInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = createVehicleDocumentSchema.parse(input);
    const supabase = (await createClient()) as any;

    const now = (new Date().toISOString().split('T')[0])!;
    const status = validated.expiryDate < now ? 'expired' : 'valid';

    const { data, error } = await supabase
      .from('vehicle_documents')
      .insert({
        institution_id: institutionId,
        vehicle_id: validated.vehicleId,
        document_type: validated.documentType,
        document_number: validated.documentNumber,
        issued_date: validated.issuedDate,
        expiry_date: validated.expiryDate,
        issuing_authority: validated.issuingAuthority || null,
        file_url: validated.fileUrl || null,
        status,
        notes: validated.notes || null,
        verified_by: membership.userId,
        verified_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport/vehicles');
    return { success: true, data };
  } catch (error: any) {
    console.error('addVehicleDocumentAction error:', error);
    return { success: false, error: error.message || 'Failed to upload document' };
  }
}

export async function getVehicleMaintenanceRecordsAction(vehicleId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('vehicle_maintenance_records')
      .select(`
        *,
        vehicle:transport_vehicles(id, registration_number, vehicle_model)
      `)
      .eq('institution_id', institutionId)
      .order('start_date', { ascending: false });

    if (vehicleId) {
      query = query.eq('vehicle_id', vehicleId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getVehicleMaintenanceRecordsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch maintenance records' };
  }
}

export async function addVehicleMaintenanceAction(input: CreateMaintenanceRecordInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = createMaintenanceRecordSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('vehicle_maintenance_records')
      .insert({
        institution_id: institutionId,
        vehicle_id: validated.vehicleId,
        maintenance_type: validated.maintenanceType,
        description: validated.description,
        odometer_reading: validated.odometerReading || null,
        cost: validated.cost,
        service_center: validated.serviceCenter || null,
        start_date: validated.startDate,
        completion_date: validated.completionDate || null,
        status: validated.status,
        performed_by: validated.performedBy || null,
        notes: validated.notes || null,
      })
      .select()
      .single();

    if (error) throw error;

    // If maintenance is in progress, mark vehicle as under_maintenance
    if (validated.status === 'in_progress') {
      await supabase
        .from('transport_vehicles')
        .update({ status: 'under_maintenance', updated_at: new Date().toISOString() })
        .eq('id', validated.vehicleId)
        .eq('institution_id', institutionId);
    }

    revalidatePath('/dashboard/transport/maintenance');
    revalidatePath('/dashboard/transport/vehicles');
    return { success: true, data };
  } catch (error: any) {
    console.error('addVehicleMaintenanceAction error:', error);
    return { success: false, error: error.message || 'Failed to record maintenance' };
  }
}

// ============================================================================
// 3. Transport Staff (Drivers & Attendants)
// ============================================================================

export async function getTransportStaffAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('staff_profiles')
      .select(`
        id,
        first_name,
        last_name,
        email,
        phone,
        designation,
        employment_status,
        user_id,
        transport_profile:transport_staff_profiles(
          id,
          role_type,
          license_number,
          license_type,
          license_expiry,
          badge_number,
          police_verification_status,
          is_active
        )
      `)
      .eq('institution_id', institutionId)
      .eq('employment_status', 'active');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getTransportStaffAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch transport staff' };
  }
}

export async function upsertTransportStaffProfileAction(input: TransportStaffProfileInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = transportStaffProfileSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_staff_profiles')
      .upsert(
        {
          institution_id: institutionId,
          staff_profile_id: validated.staffProfileId,
          role_type: validated.roleType,
          license_number: validated.licenseNumber || null,
          license_type: validated.licenseType || null,
          license_expiry: validated.licenseExpiry || null,
          badge_number: validated.badgeNumber || null,
          police_verification_status: validated.policeVerificationStatus,
          police_verification_date: validated.policeVerificationDate || null,
          medical_fitness_expiry: validated.medicalFitnessExpiry || null,
          emergency_contact_name: validated.emergencyContactName || null,
          emergency_contact_phone: validated.emergencyContactPhone || null,
          notes: validated.notes || null,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'institution_id, staff_profile_id' }
      )
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport/drivers');
    return { success: true, data };
  } catch (error: any) {
    console.error('upsertTransportStaffProfileAction error:', error);
    return { success: false, error: error.message || 'Failed to update transport staff profile' };
  }
}

// ============================================================================
// 4. Routes & Stops
// ============================================================================

export async function getTransportStopsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_stops')
      .select('*')
      .eq('institution_id', institutionId)
      .eq('is_active', true)
      .order('name');

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getTransportStopsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch transport stops' };
  }
}

export async function createTransportStopAction(input: CreateTransportStopInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = createTransportStopSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_stops')
      .insert({
        institution_id: institutionId,
        name: validated.name,
        code: validated.code || null,
        address: validated.address || null,
        latitude: validated.latitude,
        longitude: validated.longitude,
        geofence_radius_meters: validated.geofenceRadiusMeters,
        landmark: validated.landmark || null,
        campus_id: validated.campusId || null,
        is_active: true,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport/stops');
    return { success: true, data };
  } catch (error: any) {
    console.error('createTransportStopAction error:', error);
    return { success: false, error: error.message || 'Failed to create stop' };
  }
}

export async function getTransportRoutesAction(academicYearId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('transport_routes')
      .select(`
        *,
        assigned_vehicle:transport_vehicles(id, registration_number, vehicle_model, seating_capacity, status),
        assigned_driver:staff_profiles!transport_routes_assigned_driver_id_fkey(id, first_name, last_name, phone),
        assigned_attendant:staff_profiles!transport_routes_assigned_attendant_id_fkey(id, first_name, last_name, phone),
        stops:route_stops(
          id,
          stop_order,
          scheduled_arrival_time,
          scheduled_departure_time,
          stop:transport_stops(id, name, address, latitude, longitude)
        )
      `)
      .eq('institution_id', institutionId)
      .order('route_code');

    if (academicYearId) {
      query = query.eq('academic_year_id', academicYearId);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Fetch passenger assignment count per route
    const { data: assignments } = await supabase
      .from('student_transport_assignments')
      .select('route_id')
      .eq('institution_id', institutionId)
      .eq('status', 'active');

    const counts: Record<string, number> = {};
    (assignments || []).forEach((a: any) => {
      counts[a.route_id] = (counts[a.route_id] || 0) + 1;
    });

    const enriched = (data || []).map((r: any) => ({
      ...r,
      assignedCount: counts[r.id] || 0,
    }));

    return { success: true, data: enriched };
  } catch (error: any) {
    console.error('getTransportRoutesAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch transport routes' };
  }
}

export async function createTransportRouteAction(input: CreateTransportRouteInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = createTransportRouteSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Check vehicle status if assigned
    if (validated.assignedVehicleId) {
      const { data: v } = await supabase
        .from('transport_vehicles')
        .select('status')
        .eq('id', validated.assignedVehicleId)
        .single();

      if (v && v.status !== 'active') {
        return {
          success: false,
          error: `Cannot assign vehicle with status '${v.status}'. Must be active.`,
        };
      }
    }

    const { data, error } = await supabase
      .from('transport_routes')
      .insert({
        institution_id: institutionId,
        route_name: validated.routeName,
        route_code: validated.routeCode.toUpperCase(),
        start_location: validated.startLocation,
        destination: validated.destination,
        campus_id: validated.campusId || null,
        academic_year_id: validated.academicYearId,
        route_type: validated.routeType,
        shift: validated.shift,
        assigned_vehicle_id: validated.assignedVehicleId || null,
        assigned_driver_id: validated.assignedDriverId || null,
        assigned_attendant_id: validated.assignedAttendantId || null,
        total_distance_km: validated.totalDistanceKm,
        estimated_duration_mins: validated.estimatedDurationMins,
        description: validated.description || null,
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport/routes');
    return { success: true, data };
  } catch (error: any) {
    console.error('createTransportRouteAction error:', error);
    return { success: false, error: error.message || 'Failed to create route' };
  }
}

export async function assignRouteStopsAction(input: AssignRouteStopsInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = assignRouteStopsSchema.parse(input);
    const supabase = (await createClient()) as any;

    // Delete existing stops for this route and re-insert
    await supabase.from('route_stops').delete().eq('route_id', validated.routeId);

    const rows = validated.stops.map((s) => ({
      institution_id: institutionId,
      route_id: validated.routeId,
      stop_id: s.stopId,
      stop_order: s.stopOrder,
      scheduled_arrival_time: s.scheduledArrivalTime,
      scheduled_departure_time: s.scheduledDepartureTime,
      pickup_allowed: s.pickupAllowed,
      dropoff_allowed: s.dropoffAllowed,
    }));

    const { error } = await supabase.from('route_stops').insert(rows);
    if (error) throw error;

    revalidatePath('/dashboard/transport/routes');
    return { success: true };
  } catch (error: any) {
    console.error('assignRouteStopsAction error:', error);
    return { success: false, error: error.message || 'Failed to assign stops to route' };
  }
}

// ============================================================================
// 5. Student Transport Assignments
// ============================================================================

export async function getStudentTransportAssignmentsAction(routeId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('student_transport_assignments')
      .select(`
        *,
        student:students(id, first_name, last_name, admission_number),
        route:transport_routes(id, route_name, route_code),
        pickup_stop:transport_stops!student_transport_assignments_pickup_stop_id_fkey(id, name),
        dropoff_stop:transport_stops!student_transport_assignments_dropoff_stop_id_fkey(id, name)
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (routeId) {
      query = query.eq('route_id', routeId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getStudentTransportAssignmentsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch student transport assignments' };
  }
}

export async function assignStudentTransportAction(input: AssignStudentTransportInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff', 'academic_admin'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = assignStudentTransportSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase.rpc('assign_student_transport_atomic', {
      p_institution_id: institutionId,
      p_student_id: validated.studentId,
      p_academic_year_id: validated.academicYearId,
      p_route_id: validated.routeId,
      p_pickup_stop_id: validated.pickupStopId,
      p_dropoff_stop_id: validated.dropoffStopId,
      p_fee_structure_id: validated.feeStructureId || null,
      p_notes: validated.notes || null,
    });

    if (error) throw error;

    revalidatePath('/dashboard/transport/assignments');
    revalidatePath('/dashboard/transport/routes');
    return { success: true, data };
  } catch (error: any) {
    console.error('assignStudentTransportAction error:', error);
    return { success: false, error: error.message || 'Failed to assign student to transport' };
  }
}

export async function updateStudentTransportStatusAction(
  assignmentId: string,
  status: StudentTransportStatus
) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('student_transport_assignments')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', assignmentId)
      .eq('institution_id', institutionId);

    if (error) throw error;

    revalidatePath('/dashboard/transport/assignments');
    return { success: true };
  } catch (error: any) {
    console.error('updateStudentTransportStatusAction error:', error);
    return { success: false, error: error.message || 'Failed to update transport status' };
  }
}

// ============================================================================
// 6. Daily Journeys
// ============================================================================

export async function getTransportJourneysAction(date?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const targetDate = date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('transport_journeys')
      .select(`
        *,
        route:transport_routes(id, route_name, route_code, total_distance_km),
        vehicle:transport_vehicles(id, registration_number, vehicle_model, seating_capacity),
        driver:staff_profiles!transport_journeys_driver_id_fkey(id, first_name, last_name, phone),
        live_location:vehicle_live_locations(latitude, longitude, speed_kmh, heading, recorded_at)
      `)
      .eq('institution_id', institutionId)
      .eq('journey_date', targetDate)
      .order('scheduled_start_time', { ascending: true });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getTransportJourneysAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch journeys' };
  }
}

export async function createDailyJourneysAction(routeIds?: string[]) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const supabase = (await createClient()) as any;
    const today = new Date().toISOString().split('T')[0];

    let query = supabase
      .from('transport_routes')
      .select('id, route_name, assigned_vehicle_id, assigned_driver_id, shift, route_type')
      .eq('institution_id', institutionId)
      .eq('status', 'active');

    if (routeIds && routeIds.length > 0) {
      query = query.in('id', routeIds);
    }

    const { data: routes, error: rError } = await query;
    if (rError) throw rError;

    const createdJourneys: any[] = [];

    for (const r of routes || []) {
      if (!r.assigned_vehicle_id || !r.assigned_driver_id) continue;

      // Check if already created for today
      const { data: existing } = await supabase
        .from('transport_journeys')
        .select('id')
        .eq('institution_id', institutionId)
        .eq('route_id', r.id)
        .eq('journey_date', today)
        .limit(1);

      if (existing && existing.length > 0) continue;

      const journeyType = r.route_type === 'evening_dropoff' ? 'dropoff' : 'pickup';

      const { data: j, error: jError } = await supabase
        .from('transport_journeys')
        .insert({
          institution_id: institutionId,
          route_id: r.id,
          vehicle_id: r.assigned_vehicle_id,
          driver_id: r.assigned_driver_id,
          journey_date: today,
          shift: r.shift,
          journey_type: journeyType,
          status: 'scheduled',
          scheduled_start_time: new Date(`${today}T07:30:00Z`).toISOString(),
          scheduled_end_time: new Date(`${today}T08:30:00Z`).toISOString(),
        })
        .select()
        .single();

      if (!jError && j) createdJourneys.push(j);
    }

    revalidatePath('/dashboard/transport/journeys');
    return { success: true, data: createdJourneys };
  } catch (error: any) {
    console.error('createDailyJourneysAction error:', error);
    return { success: false, error: error.message || 'Failed to dispatch daily journeys' };
  }
}

export async function updateJourneyStatusAction(input: UpdateJourneyStatusInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = updateJourneyStatusSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase.rpc('update_journey_status_atomic', {
      p_institution_id: institutionId,
      p_journey_id: validated.journeyId,
      p_new_status: validated.newStatus,
      p_delay_minutes: validated.delayMinutes || 0,
      p_delay_reason: validated.delayReason || null,
      p_emergency_reason: validated.emergencyReason || null,
      p_cancellation_reason: validated.cancellationReason || null,
      p_updated_by: membership.userId,
    });

    if (error) throw error;

    revalidatePath('/dashboard/transport/journeys');
    revalidatePath('/dashboard/transport/tracking');
    return { success: true, data };
  } catch (error: any) {
    console.error('updateJourneyStatusAction error:', error);
    return { success: false, error: error.message || 'Failed to update journey status' };
  }
}

// ============================================================================
// 7. Live Vehicle Tracking & GPS Telemetry
// ============================================================================

export async function getLiveFleetTrackingAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_journeys')
      .select(`
        id,
        journey_date,
        shift,
        journey_type,
        status,
        delay_minutes,
        delay_reason,
        route:transport_routes(id, route_name, route_code, start_location, destination),
        vehicle:transport_vehicles(id, registration_number, vehicle_model, seating_capacity),
        driver:staff_profiles!transport_journeys_driver_id_fkey(id, first_name, last_name, phone),
        live_location:vehicle_live_locations(latitude, longitude, speed_kmh, heading, accuracy_meters, recorded_at)
      `)
      .eq('institution_id', institutionId)
      .in('status', ['in_progress', 'delayed', 'emergency'])
      .order('actual_start_time', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getLiveFleetTrackingAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch live fleet tracking' };
  }
}

export async function recordVehicleGpsLocationAction(input: RecordGpsLocationInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = recordGpsLocationSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase.rpc('record_vehicle_gps_location_atomic', {
      p_institution_id: institutionId,
      p_vehicle_id: validated.vehicleId,
      p_journey_id: validated.journeyId || null,
      p_latitude: validated.latitude,
      p_longitude: validated.longitude,
      p_speed_kmh: validated.speedKmh || 0,
      p_heading: validated.heading || 0,
      p_accuracy_meters: validated.accuracyMeters || 5,
      p_battery_level: validated.batteryLevel || null,
      p_provider: validated.provider || 'driver_mobile_app',
      p_recorded_at: validated.recordedAt || new Date().toISOString(),
    });

    if (error) throw error;

    return { success: true, data };
  } catch (error: any) {
    console.error('recordVehicleGpsLocationAction error:', error);
    return { success: false, error: error.message || 'Failed to record GPS telemetry' };
  }
}

// ============================================================================
// 8. Boarding & Drop-Off Verification
// ============================================================================

export async function getStudentBoardingEventsAction(journeyId?: string) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    let query = supabase
      .from('student_boarding_events')
      .select(`
        *,
        student:students(id, first_name, last_name, admission_number),
        stop:transport_stops(id, name, address),
        journey:transport_journeys(id, journey_date, route:transport_routes(route_name))
      `)
      .eq('institution_id', institutionId)
      .order('timestamp', { ascending: false });

    if (journeyId) {
      query = query.eq('journey_id', journeyId);
    }

    const { data, error } = await query;
    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getStudentBoardingEventsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch boarding events' };
  }
}

export async function recordStudentBoardingAction(input: StudentBoardingEventInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = studentBoardingEventSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase.rpc('record_student_boarding_atomic', {
      p_institution_id: institutionId,
      p_journey_id: validated.journeyId,
      p_student_id: validated.studentId,
      p_stop_id: validated.stopId,
      p_event_type: validated.eventType,
      p_verification_method: validated.verificationMethod,
      p_verified_by: membership.userId,
      p_notes: validated.notes || null,
    });

    if (error) throw error;

    revalidatePath('/dashboard/transport/boarding');
    return { success: true, data };
  } catch (error: any) {
    console.error('recordStudentBoardingAction error:', error);
    return { success: false, error: error.message || 'Failed to record boarding event' };
  }
}

export async function correctBoardingEventAction(input: CorrectBoardingEventInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const validated = correctBoardingEventSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('student_boarding_events')
      .update({
        is_corrected: true,
        correction_reason: validated.correctionReason,
        corrected_by: membership.userId,
        corrected_at: new Date().toISOString(),
      })
      .eq('id', validated.eventId)
      .eq('institution_id', institutionId);

    if (error) throw error;

    revalidatePath('/dashboard/transport/boarding');
    return { success: true };
  } catch (error: any) {
    console.error('correctBoardingEventAction error:', error);
    return { success: false, error: error.message || 'Failed to correct boarding event' };
  }
}

// ============================================================================
// 9. Change Requests & Settings
// ============================================================================

export async function getTransportChangeRequestsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_change_requests')
      .select(`
        *,
        student:students(id, first_name, last_name, admission_number),
        requested_by:profiles!transport_change_requests_requested_by_user_id_fkey(id, full_name, email),
        target_route:transport_routes(id, route_name, route_code),
        target_pickup_stop:transport_stops!transport_change_requests_target_pickup_stop_id_fkey(id, name),
        target_dropoff_stop:transport_stops!transport_change_requests_target_dropoff_stop_id_fkey(id, name)
      `)
      .eq('institution_id', institutionId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { success: true, data: data || [] };
  } catch (error: any) {
    console.error('getTransportChangeRequestsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch transport change requests' };
  }
}

export async function submitTransportChangeRequestAction(input: TransportChangeRequestInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    const validated = transportChangeRequestSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_change_requests')
      .insert({
        institution_id: institutionId,
        student_id: validated.studentId,
        requested_by_user_id: membership.userId,
        request_type: validated.requestType,
        target_route_id: validated.targetRouteId || null,
        target_pickup_stop_id: validated.targetPickupStopId || null,
        target_dropoff_stop_id: validated.targetDropoffStopId || null,
        reason: validated.reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport');
    revalidatePath('/portal/parent');
    return { success: true, data };
  } catch (error: any) {
    console.error('submitTransportChangeRequestAction error:', error);
    return { success: false, error: error.message || 'Failed to submit transport change request' };
  }
}

export async function reviewTransportChangeRequestAction(
  requestId: string,
  status: 'approved' | 'rejected',
  notes?: string
) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin', 'staff'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: insufficient permissions' };
    }

    const supabase = (await createClient()) as any;

    const { error } = await supabase
      .from('transport_change_requests')
      .update({
        status,
        reviewed_by: membership.userId,
        reviewed_at: new Date().toISOString(),
        review_notes: notes || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('institution_id', institutionId);

    if (error) throw error;

    revalidatePath('/dashboard/transport');
    return { success: true };
  } catch (error: any) {
    console.error('reviewTransportChangeRequestAction error:', error);
    return { success: false, error: error.message || 'Failed to review request' };
  }
}

export async function getTransportSettingsAction() {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_settings')
      .select('*')
      .eq('institution_id', institutionId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;

    return {
      success: true,
      data: data || {
        gps_provider: 'driver_mobile_app',
        gps_update_interval_seconds: 15,
        location_retention_days: 30,
        approaching_stop_distance_meters: 500,
        allow_parent_tracking: true,
        require_parent_change_approval: true,
        prevent_overcapacity_assignment: true,
      },
    };
  } catch (error: any) {
    console.error('getTransportSettingsAction error:', error);
    return { success: false, error: error.message || 'Failed to fetch transport settings' };
  }
}

export async function updateTransportSettingsAction(input: TransportSettingsUpdateInput) {
  try {
    const session = await requireInstitution();
    const membership = session.activeMembership!;
    const institutionId = membership.institutionId;

    if (!['owner', 'admin'].includes(membership.role)) {
      return { success: false, error: 'Unauthorized: only administrators can change transport settings' };
    }

    const validated = transportSettingsUpdateSchema.parse(input);
    const supabase = (await createClient()) as any;

    const { data, error } = await supabase
      .from('transport_settings')
      .upsert(
        {
          institution_id: institutionId,
          gps_provider: validated.gpsProvider,
          gps_update_interval_seconds: validated.gpsUpdateIntervalSeconds,
          location_retention_days: validated.locationRetentionDays,
          approaching_stop_distance_meters: validated.approachingStopDistanceMeters,
          allow_parent_tracking: validated.allowParentTracking,
          require_parent_change_approval: validated.requireParentChangeApproval,
          prevent_overcapacity_assignment: validated.preventOvercapacityAssignment,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'institution_id' }
      )
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/dashboard/transport/settings');
    return { success: true, data };
  } catch (error: any) {
    console.error('updateTransportSettingsAction error:', error);
    return { success: false, error: error.message || 'Failed to update transport settings' };
  }
}

