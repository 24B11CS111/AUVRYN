-- Migration: 20261106090000_transport_management.sql
-- Description: Universal Transport Management & Live Bus Tracking Engine
-- Milestone: 10

-- ============================================================================
-- 1. Custom Types & Enumerations
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE transport_vehicle_status AS ENUM (
    'active',
    'inactive',
    'under_maintenance',
    'retired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_document_type AS ENUM (
    'insurance',
    'permit',
    'fitness_certificate',
    'pollution_certificate',
    'road_tax',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE vehicle_document_status AS ENUM (
    'valid',
    'expiring_soon',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_maintenance_type AS ENUM (
    'routine_service',
    'repair',
    'inspection',
    'emergency_breakdown',
    'tire_replacement',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_maintenance_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_staff_role AS ENUM (
    'driver',
    'attendant',
    'both'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_route_type AS ENUM (
    'morning_pickup',
    'evening_dropoff',
    'both',
    'shuttle'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_route_shift AS ENUM (
    'morning',
    'afternoon',
    'evening',
    'general'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE student_transport_status AS ENUM (
    'active',
    'suspended',
    'withdrawn',
    'pending_approval'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_journey_status AS ENUM (
    'scheduled',
    'in_progress',
    'completed',
    'delayed',
    'cancelled',
    'emergency'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_journey_type AS ENUM (
    'pickup',
    'dropoff',
    'shuttle'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE journey_stop_status AS ENUM (
    'pending',
    'arrived',
    'departed',
    'skipped'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE boarding_event_type AS ENUM (
    'pickup',
    'dropoff'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE boarding_verification_method AS ENUM (
    'driver_manual',
    'attendant_manual',
    'qr_scan',
    'nfc',
    'rfid',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_change_request_type AS ENUM (
    'new_enrollment',
    'route_change',
    'stop_change',
    'temporary_suspension',
    'withdrawal'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE transport_change_request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Vehicles & Fleet Management
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  registration_number TEXT NOT NULL,
  vehicle_model TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'school_bus', -- 'school_bus', 'college_bus', 'university_shuttle', 'van', etc.
  seating_capacity INT NOT NULL CHECK (seating_capacity > 0),
  standing_capacity INT NOT NULL DEFAULT 0 CHECK (standing_capacity >= 0),
  fuel_type TEXT DEFAULT 'diesel',
  ownership_type TEXT NOT NULL DEFAULT 'institution_owned', -- 'institution_owned', 'contracted', 'leased'
  status transport_vehicle_status NOT NULL DEFAULT 'active',
  gps_device_id TEXT,
  make_year INT,
  color TEXT,
  chassis_number TEXT,
  engine_number TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_transport_vehicle_reg UNIQUE (institution_id, registration_number)
);

-- ============================================================================
-- 3. Vehicle Documents (Permits, Insurance, Fitness, Pollution)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  document_type vehicle_document_type NOT NULL,
  document_number TEXT NOT NULL,
  issued_date DATE NOT NULL,
  expiry_date DATE NOT NULL,
  issuing_authority TEXT,
  file_url TEXT,
  status vehicle_document_status NOT NULL DEFAULT 'valid',
  notes TEXT,
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  verified_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT chk_document_dates CHECK (expiry_date >= issued_date)
);

-- ============================================================================
-- 4. Vehicle Maintenance Records
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_maintenance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  maintenance_type transport_maintenance_type NOT NULL,
  description TEXT NOT NULL,
  odometer_reading INT,
  cost NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (cost >= 0),
  service_center TEXT,
  start_date DATE NOT NULL,
  completion_date DATE,
  status transport_maintenance_status NOT NULL DEFAULT 'scheduled',
  performed_by TEXT,
  invoice_url TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 5. Transport Staff Profiles (Driver & Attendant transport details)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_staff_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  staff_profile_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  role_type transport_staff_role NOT NULL DEFAULT 'driver',
  license_number TEXT,
  license_type TEXT,
  license_expiry DATE,
  badge_number TEXT,
  police_verification_status TEXT NOT NULL DEFAULT 'verified', -- 'verified', 'pending', 'expired'
  police_verification_date DATE,
  medical_fitness_expiry DATE,
  emergency_contact_name TEXT,
  emergency_contact_phone TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_transport_staff UNIQUE (institution_id, staff_profile_id)
);

-- ============================================================================
-- 6. Transport Stops
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  geofence_radius_meters INT NOT NULL DEFAULT 50 CHECK (geofence_radius_meters > 0),
  landmark TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 7. Transport Routes
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  route_name TEXT NOT NULL,
  route_code TEXT NOT NULL,
  start_location TEXT NOT NULL,
  destination TEXT NOT NULL,
  route_type transport_route_type NOT NULL DEFAULT 'both',
  shift transport_route_shift NOT NULL DEFAULT 'general',
  assigned_vehicle_id UUID REFERENCES public.transport_vehicles(id) ON DELETE SET NULL,
  assigned_driver_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assigned_attendant_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  total_distance_km NUMERIC(6, 2) DEFAULT 0.00,
  estimated_duration_mins INT DEFAULT 45,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'inactive', 'suspended'
  description TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_route_code_inst_ay UNIQUE (institution_id, route_code, academic_year_id)
);

-- ============================================================================
-- 8. Route Stops (Ordered stops for each route)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.route_stops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.transport_stops(id) ON DELETE CASCADE,
  stop_order INT NOT NULL CHECK (stop_order >= 1),
  scheduled_arrival_time TIME NOT NULL,
  scheduled_departure_time TIME NOT NULL,
  pickup_allowed BOOLEAN NOT NULL DEFAULT true,
  dropoff_allowed BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_route_stop_order UNIQUE (route_id, stop_order)
);

-- ============================================================================
-- 9. Student Transport Assignments
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_transport_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  pickup_stop_id UUID NOT NULL REFERENCES public.transport_stops(id) ON DELETE CASCADE,
  dropoff_stop_id UUID NOT NULL REFERENCES public.transport_stops(id) ON DELETE CASCADE,
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  status student_transport_status NOT NULL DEFAULT 'active',
  parent_confirmed BOOLEAN NOT NULL DEFAULT false,
  effective_start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  effective_end_date DATE,
  cancellation_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_student_transport_active UNIQUE (institution_id, student_id, academic_year_id)
);

-- ============================================================================
-- 10. Daily Transport Journeys
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  route_id UUID NOT NULL REFERENCES public.transport_routes(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  driver_id UUID NOT NULL REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  attendant_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  journey_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shift transport_route_shift NOT NULL DEFAULT 'morning',
  journey_type transport_journey_type NOT NULL DEFAULT 'pickup',
  status transport_journey_status NOT NULL DEFAULT 'scheduled',
  scheduled_start_time TIMESTAMPTZ,
  actual_start_time TIMESTAMPTZ,
  scheduled_end_time TIMESTAMPTZ,
  actual_end_time TIMESTAMPTZ,
  current_stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
  delay_minutes INT NOT NULL DEFAULT 0 CHECK (delay_minutes >= 0),
  delay_reason TEXT,
  emergency_reason TEXT,
  emergency_reported_at TIMESTAMPTZ,
  cancellation_reason TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 11. Journey Stop Events (Actual stop arrival/departure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.journey_stop_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.transport_journeys(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.transport_stops(id) ON DELETE CASCADE,
  stop_order INT NOT NULL,
  scheduled_arrival_time TIMESTAMPTZ,
  actual_arrival_time TIMESTAMPTZ,
  actual_departure_time TIMESTAMPTZ,
  status journey_stop_status NOT NULL DEFAULT 'pending',
  skipped_reason TEXT,
  students_expected INT NOT NULL DEFAULT 0,
  students_boarded INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_journey_stop_order UNIQUE (journey_id, stop_id)
);

-- ============================================================================
-- 12. Live Vehicle Telemetry (Latest state per vehicle)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_live_locations (
  vehicle_id UUID PRIMARY KEY REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.transport_journeys(id) ON DELETE SET NULL,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  speed_kmh NUMERIC(5, 2) DEFAULT 0.00,
  heading NUMERIC(5, 2) DEFAULT 0.00,
  accuracy_meters NUMERIC(5, 2) DEFAULT 5.00,
  battery_level NUMERIC(4, 1),
  provider TEXT NOT NULL DEFAULT 'driver_mobile_app',
  recorded_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 13. Historical Breadcrumb Location Records (Prunable trail)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.vehicle_location_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES public.transport_vehicles(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.transport_journeys(id) ON DELETE CASCADE,
  latitude NUMERIC(10, 7) NOT NULL CHECK (latitude >= -90.0 AND latitude <= 90.0),
  longitude NUMERIC(10, 7) NOT NULL CHECK (longitude >= -180.0 AND longitude <= 180.0),
  speed_kmh NUMERIC(5, 2) DEFAULT 0.00,
  heading NUMERIC(5, 2) DEFAULT 0.00,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 14. Student Boarding & Drop-Off Verification Events
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.student_boarding_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.transport_journeys(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  stop_id UUID NOT NULL REFERENCES public.transport_stops(id) ON DELETE CASCADE,
  event_type boarding_event_type NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  verification_method boarding_verification_method NOT NULL DEFAULT 'driver_manual',
  verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  is_corrected BOOLEAN NOT NULL DEFAULT false,
  correction_reason TEXT,
  corrected_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  corrected_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT uq_journey_student_event UNIQUE (journey_id, student_id, event_type)
);

-- ============================================================================
-- 15. Transport Change & Service Requests
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_change_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  requested_by_user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  request_type transport_change_request_type NOT NULL,
  target_route_id UUID REFERENCES public.transport_routes(id) ON DELETE SET NULL,
  target_pickup_stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
  target_dropoff_stop_id UUID REFERENCES public.transport_stops(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status transport_change_request_status NOT NULL DEFAULT 'pending',
  reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 16. Transport Settings (Per-Institution)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.transport_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL UNIQUE REFERENCES public.institutions(id) ON DELETE CASCADE,
  gps_provider TEXT NOT NULL DEFAULT 'driver_mobile_app',
  gps_update_interval_seconds INT NOT NULL DEFAULT 15 CHECK (gps_update_interval_seconds >= 5),
  location_retention_days INT NOT NULL DEFAULT 30 CHECK (location_retention_days >= 1),
  approaching_stop_distance_meters INT NOT NULL DEFAULT 500 CHECK (approaching_stop_distance_meters >= 100),
  allow_parent_tracking BOOLEAN NOT NULL DEFAULT true,
  require_parent_change_approval BOOLEAN NOT NULL DEFAULT true,
  prevent_overcapacity_assignment BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

-- ============================================================================
-- 17. Indexes for Query Performance & Lookups
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_transport_vehicles_inst ON public.transport_vehicles(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_transport_vehicles_campus ON public.transport_vehicles(campus_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_exp ON public.vehicle_documents(institution_id, expiry_date);
CREATE INDEX IF NOT EXISTS idx_transport_routes_inst ON public.transport_routes(institution_id, academic_year_id, status);
CREATE INDEX IF NOT EXISTS idx_transport_stops_inst ON public.transport_stops(institution_id, is_active);
CREATE INDEX IF NOT EXISTS idx_route_stops_route ON public.route_stops(route_id, stop_order);
CREATE INDEX IF NOT EXISTS idx_student_trans_assign_student ON public.student_transport_assignments(student_id, status);
CREATE INDEX IF NOT EXISTS idx_student_trans_assign_route ON public.student_transport_assignments(route_id, status);
CREATE INDEX IF NOT EXISTS idx_journeys_date_status ON public.transport_journeys(institution_id, journey_date, status);
CREATE INDEX IF NOT EXISTS idx_journeys_route ON public.transport_journeys(route_id);
CREATE INDEX IF NOT EXISTS idx_journeys_driver ON public.transport_journeys(driver_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_live_loc_inst ON public.vehicle_live_locations(institution_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_loc_hist_journey ON public.vehicle_location_history(journey_id, recorded_at ASC);
CREATE INDEX IF NOT EXISTS idx_boarding_events_journey ON public.student_boarding_events(journey_id, student_id);
CREATE INDEX IF NOT EXISTS idx_boarding_events_student ON public.student_boarding_events(student_id);
CREATE INDEX IF NOT EXISTS idx_trans_change_req_inst ON public.transport_change_requests(institution_id, status);

-- ============================================================================
-- 18. Stored Procedures & Business Rule Logic
-- ============================================================================

-- A. Assign Student to Transport with Capacity Enforcement
CREATE OR REPLACE FUNCTION public.assign_student_transport_atomic(
  p_institution_id UUID,
  p_student_id UUID,
  p_academic_year_id UUID,
  p_route_id UUID,
  p_pickup_stop_id UUID,
  p_dropoff_stop_id UUID,
  p_fee_structure_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_assigned_vehicle_id UUID;
  v_seating_capacity INT;
  v_standing_capacity INT;
  v_active_assignments INT;
  v_assignment_id UUID;
  v_student_name TEXT;
  v_route_name TEXT;
  v_prevent_overcapacity BOOLEAN := true;
BEGIN
  -- 1. Check if route exists and belongs to institution
  SELECT assigned_vehicle_id, route_name
  INTO v_assigned_vehicle_id, v_route_name
  FROM public.transport_routes
  WHERE id = p_route_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transport route not found in active institution';
  END IF;

  -- 2. Fetch institution settings regarding capacity prevention
  SELECT COALESCE(prevent_overcapacity_assignment, true)
  INTO v_prevent_overcapacity
  FROM public.transport_settings
  WHERE institution_id = p_institution_id;

  IF v_prevent_overcapacity AND v_assigned_vehicle_id IS NOT NULL THEN
    -- Fetch vehicle capacity
    SELECT seating_capacity, standing_capacity
    INTO v_seating_capacity, v_standing_capacity
    FROM public.transport_vehicles
    WHERE id = v_assigned_vehicle_id;

    -- Count active students on this route (excluding current student if update)
    SELECT COUNT(*)
    INTO v_active_assignments
    FROM public.student_transport_assignments
    WHERE route_id = p_route_id
      AND academic_year_id = p_academic_year_id
      AND status = 'active'
      AND student_id != p_student_id;

    IF v_active_assignments >= (v_seating_capacity + COALESCE(v_standing_capacity, 0)) THEN
      RAISE EXCEPTION 'Vehicle seating capacity exceeded (Capacity: %, Currently Assigned: %)',
        v_seating_capacity, v_active_assignments;
    END IF;
  END IF;

  -- 3. Upsert student transport assignment
  INSERT INTO public.student_transport_assignments (
    institution_id,
    student_id,
    academic_year_id,
    route_id,
    pickup_stop_id,
    dropoff_stop_id,
    fee_structure_id,
    status,
    notes,
    updated_at
  ) VALUES (
    p_institution_id,
    p_student_id,
    p_academic_year_id,
    p_route_id,
    p_pickup_stop_id,
    p_dropoff_stop_id,
    p_fee_structure_id,
    'active',
    p_notes,
    timezone('utc', now())
  )
  ON CONFLICT (institution_id, student_id, academic_year_id)
  DO UPDATE SET
    route_id = EXCLUDED.route_id,
    pickup_stop_id = EXCLUDED.pickup_stop_id,
    dropoff_stop_id = EXCLUDED.dropoff_stop_id,
    fee_structure_id = COALESCE(EXCLUDED.fee_structure_id, student_transport_assignments.fee_structure_id),
    status = 'active',
    notes = EXCLUDED.notes,
    updated_at = timezone('utc', now())
  RETURNING id INTO v_assignment_id;

  -- Fetch student name for audit
  SELECT first_name || ' ' || last_name INTO v_student_name
  FROM public.students WHERE id = p_student_id;

  PERFORM public.log_institution_audit_event(
    p_institution_id,
    'ASSIGN_STUDENT_TRANSPORT',
    'student_transport_assignment',
    v_assignment_id::text,
    jsonb_build_object(
      'student_id', p_student_id,
      'student_name', v_student_name,
      'route_id', p_route_id,
      'route_name', v_route_name
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'assignment_id', v_assignment_id,
    'route_name', v_route_name
  );
END;
$$;

-- B. Update Journey Status & Lifecycle
CREATE OR REPLACE FUNCTION public.update_journey_status_atomic(
  p_institution_id UUID,
  p_journey_id UUID,
  p_new_status transport_journey_status,
  p_delay_minutes INT DEFAULT 0,
  p_delay_reason TEXT DEFAULT NULL,
  p_emergency_reason TEXT DEFAULT NULL,
  p_cancellation_reason TEXT DEFAULT NULL,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey RECORD;
  v_route_name TEXT;
  v_vehicle_status transport_vehicle_status;
  v_recip RECORD;
  v_notif_title TEXT;
  v_notif_body TEXT;
BEGIN
  -- 1. Fetch journey details
  SELECT j.*, r.route_name, r.id AS r_id
  INTO v_journey
  FROM public.transport_journeys j
  JOIN public.transport_routes r ON r.id = j.route_id
  WHERE j.id = p_journey_id AND j.institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journey not found';
  END IF;

  -- 2. Verify vehicle availability if starting journey
  IF p_new_status = 'in_progress' AND v_journey.status = 'scheduled' THEN
    SELECT status INTO v_vehicle_status
    FROM public.transport_vehicles
    WHERE id = v_journey.vehicle_id;

    IF v_vehicle_status != 'active' THEN
      RAISE EXCEPTION 'Assigned vehicle is unavailable (Status: %)', v_vehicle_status;
    END IF;

    UPDATE public.transport_journeys
    SET
      status = 'in_progress',
      actual_start_time = COALESCE(actual_start_time, timezone('utc', now())),
      updated_at = timezone('utc', now())
    WHERE id = p_journey_id;

    v_notif_title := 'Transport Journey Started';
    v_notif_body := 'Route ' || v_journey.route_name || ' has started its journey.';

  ELSIF p_new_status = 'completed' THEN
    UPDATE public.transport_journeys
    SET
      status = 'completed',
      actual_end_time = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE id = p_journey_id;

    -- Clear active journey reference from live telemetry
    UPDATE public.vehicle_live_locations
    SET journey_id = NULL
    WHERE vehicle_id = v_journey.vehicle_id;

  ELSIF p_new_status = 'delayed' THEN
    UPDATE public.transport_journeys
    SET
      status = 'delayed',
      delay_minutes = p_delay_minutes,
      delay_reason = p_delay_reason,
      updated_at = timezone('utc', now())
    WHERE id = p_journey_id;

    v_notif_title := 'Bus Delay Notice: ' || v_journey.route_name;
    v_notif_body := 'The bus on route ' || v_journey.route_name || ' is delayed by approximately ' || p_delay_minutes || ' minutes. Reason: ' || COALESCE(p_delay_reason, 'Traffic/Transit delay');

  ELSIF p_new_status = 'emergency' THEN
    UPDATE public.transport_journeys
    SET
      status = 'emergency',
      emergency_reason = p_emergency_reason,
      emergency_reported_at = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE id = p_journey_id;

    v_notif_title := 'EMERGENCY ALERT: Route ' || v_journey.route_name;
    v_notif_body := 'An emergency has been reported for bus on route ' || v_journey.route_name || ': ' || COALESCE(p_emergency_reason, 'Immediate attention required');

  ELSIF p_new_status = 'cancelled' THEN
    UPDATE public.transport_journeys
    SET
      status = 'cancelled',
      cancellation_reason = p_cancellation_reason,
      actual_end_time = timezone('utc', now()),
      updated_at = timezone('utc', now())
    WHERE id = p_journey_id;

    v_notif_title := 'Journey Cancelled: ' || v_journey.route_name;
    v_notif_body := 'Today''s journey for route ' || v_journey.route_name || ' has been cancelled. Reason: ' || COALESCE(p_cancellation_reason, 'Operational reasons');
  END IF;

  -- 3. If notification is warranted, dispatch to parents of students assigned to this route
  IF v_notif_title IS NOT NULL THEN
    FOR v_recip IN (
      SELECT DISTINCT g.user_id
      FROM public.student_transport_assignments sta
      JOIN public.student_guardians sg ON sg.student_id = sta.student_id
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE sta.route_id = v_journey.route_id
        AND sta.status = 'active'
        AND g.user_id IS NOT NULL
    ) LOOP
      PERFORM public.dispatch_notification_atomic(
        p_institution_id,
        v_recip.user_id,
        CASE WHEN p_new_status = 'emergency' THEN 'emergency'::notification_category ELSE 'transport'::notification_category END,
        v_notif_title,
        v_notif_body,
        CASE WHEN p_new_status = 'emergency' THEN 'urgent'::notification_priority ELSE 'high'::notification_priority END,
        jsonb_build_object(
          'journey_id', p_journey_id,
          'route_id', v_journey.route_id,
          'status', p_new_status
        ),
        ARRAY['in_app', 'push', 'sms']::notification_channel[],
        'journey-' || p_journey_id || '-' || p_new_status || '-' || v_recip.user_id,
        p_updated_by
      );
    END LOOP;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'journey_id', p_journey_id,
    'status', p_new_status
  );
END;
$$;

-- C. Ingest GPS Telemetry Safely & Scalably
CREATE OR REPLACE FUNCTION public.record_vehicle_gps_location_atomic(
  p_institution_id UUID,
  p_vehicle_id UUID,
  p_journey_id UUID,
  p_latitude NUMERIC,
  p_longitude NUMERIC,
  p_speed_kmh NUMERIC DEFAULT 0.00,
  p_heading NUMERIC DEFAULT 0.00,
  p_accuracy_meters NUMERIC DEFAULT 5.00,
  p_battery_level NUMERIC DEFAULT NULL,
  p_provider TEXT DEFAULT 'driver_mobile_app',
  p_recorded_at TIMESTAMPTZ DEFAULT timezone('utc', now())
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey_status transport_journey_status;
  v_existing_recorded_at TIMESTAMPTZ;
BEGIN
  -- 1. Validate coordinates range
  IF p_latitude < -90.0 OR p_latitude > 90.0 OR p_longitude < -180.0 OR p_longitude > 180.0 THEN
    RAISE EXCEPTION 'Invalid GPS coordinates (lat: %, lng: %)', p_latitude, p_longitude;
  END IF;

  -- 2. Verify journey is currently active ('in_progress')
  IF p_journey_id IS NOT NULL THEN
    SELECT status INTO v_journey_status
    FROM public.transport_journeys
    WHERE id = p_journey_id AND institution_id = p_institution_id;

    IF v_journey_status IS DISTINCT FROM 'in_progress' AND v_journey_status IS DISTINCT FROM 'delayed' THEN
      RAISE EXCEPTION 'Location updates rejected: Journey is not currently in progress (Status: %)', v_journey_status;
    END IF;
  END IF;

  -- 3. Check freshness against existing live state
  SELECT recorded_at INTO v_existing_recorded_at
  FROM public.vehicle_live_locations
  WHERE vehicle_id = p_vehicle_id;

  IF v_existing_recorded_at IS NOT NULL AND p_recorded_at < v_existing_recorded_at THEN
    -- Discard stale/out-of-order update
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'out_of_order_telemetry_discarded',
      'last_recorded_at', v_existing_recorded_at
    );
  END IF;

  -- 4. Upsert into vehicle_live_locations
  INSERT INTO public.vehicle_live_locations (
    vehicle_id,
    institution_id,
    journey_id,
    latitude,
    longitude,
    speed_kmh,
    heading,
    accuracy_meters,
    battery_level,
    provider,
    recorded_at,
    updated_at
  ) VALUES (
    p_vehicle_id,
    p_institution_id,
    p_journey_id,
    p_latitude,
    p_longitude,
    p_speed_kmh,
    p_heading,
    p_accuracy_meters,
    p_battery_level,
    p_provider,
    p_recorded_at,
    timezone('utc', now())
  )
  ON CONFLICT (vehicle_id)
  DO UPDATE SET
    institution_id = EXCLUDED.institution_id,
    journey_id = EXCLUDED.journey_id,
    latitude = EXCLUDED.latitude,
    longitude = EXCLUDED.longitude,
    speed_kmh = EXCLUDED.speed_kmh,
    heading = EXCLUDED.heading,
    accuracy_meters = EXCLUDED.accuracy_meters,
    battery_level = EXCLUDED.battery_level,
    provider = EXCLUDED.provider,
    recorded_at = EXCLUDED.recorded_at,
    updated_at = timezone('utc', now());

  -- 5. Append to breadcrumb trail history if journey is present
  IF p_journey_id IS NOT NULL THEN
    INSERT INTO public.vehicle_location_history (
      institution_id,
      vehicle_id,
      journey_id,
      latitude,
      longitude,
      speed_kmh,
      heading,
      recorded_at
    ) VALUES (
      p_institution_id,
      p_vehicle_id,
      p_journey_id,
      p_latitude,
      p_longitude,
      p_speed_kmh,
      p_heading,
      p_recorded_at
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'vehicle_id', p_vehicle_id,
    'recorded_at', p_recorded_at
  );
END;
$$;

-- D. Record Student Pickup / Drop-Off Verification
CREATE OR REPLACE FUNCTION public.record_student_boarding_atomic(
  p_institution_id UUID,
  p_journey_id UUID,
  p_student_id UUID,
  p_stop_id UUID,
  p_event_type boarding_event_type,
  p_verification_method boarding_verification_method DEFAULT 'driver_manual',
  p_verified_by UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_journey RECORD;
  v_student_name TEXT;
  v_stop_name TEXT;
  v_event_id UUID;
  v_guardian_user_id UUID;
  v_notif_title TEXT;
  v_notif_body TEXT;
BEGIN
  -- 1. Check journey status
  SELECT id, route_id, vehicle_id, status
  INTO v_journey
  FROM public.transport_journeys
  WHERE id = p_journey_id AND institution_id = p_institution_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Journey not found';
  END IF;

  IF v_journey.status != 'in_progress' AND v_journey.status != 'delayed' THEN
    RAISE EXCEPTION 'Cannot record boarding on inactive journey (Status: %)', v_journey.status;
  END IF;

  -- 2. Fetch student name and stop name
  SELECT first_name || ' ' || last_name INTO v_student_name
  FROM public.students WHERE id = p_student_id;

  SELECT name INTO v_stop_name
  FROM public.transport_stops WHERE id = p_stop_id;

  -- 3. Insert boarding event (unique per journey, student, event_type)
  INSERT INTO public.student_boarding_events (
    institution_id,
    journey_id,
    student_id,
    stop_id,
    event_type,
    timestamp,
    verification_method,
    verified_by,
    notes
  ) VALUES (
    p_institution_id,
    p_journey_id,
    p_student_id,
    p_stop_id,
    p_event_type,
    timezone('utc', now()),
    p_verification_method,
    p_verified_by,
    p_notes
  )
  ON CONFLICT (journey_id, student_id, event_type)
  DO UPDATE SET
    stop_id = EXCLUDED.stop_id,
    timestamp = timezone('utc', now()),
    verification_method = EXCLUDED.verification_method,
    verified_by = EXCLUDED.verified_by,
    notes = EXCLUDED.notes
  RETURNING id INTO v_event_id;

  -- 4. Notify parent/guardian
  SELECT g.user_id INTO v_guardian_user_id
  FROM public.student_guardians sg
  JOIN public.guardians g ON g.id = sg.guardian_id
  WHERE sg.student_id = p_student_id AND g.user_id IS NOT NULL
  ORDER BY sg.is_primary DESC
  LIMIT 1;

  IF v_guardian_user_id IS NOT NULL THEN
    IF p_event_type = 'pickup' THEN
      v_notif_title := 'Transport Update: ' || v_student_name || ' Boarded';
      v_notif_body := v_student_name || ' has successfully boarded the school transport at ' || COALESCE(v_stop_name, 'scheduled stop') || '.';
    ELSE
      v_notif_title := 'Transport Update: ' || v_student_name || ' Dropped Off';
      v_notif_body := v_student_name || ' has arrived and safely alighted at ' || COALESCE(v_stop_name, 'scheduled stop') || '.';
    END IF;

    PERFORM public.dispatch_notification_atomic(
      p_institution_id,
      v_guardian_user_id,
      'transport'::notification_category,
      v_notif_title,
      v_notif_body,
      'high'::notification_priority,
      jsonb_build_object(
        'student_id', p_student_id,
        'journey_id', p_journey_id,
        'event_type', p_event_type,
        'stop_name', v_stop_name,
        'timestamp', timezone('utc', now())
      ),
      ARRAY['in_app', 'push', 'sms']::notification_channel[],
      'boarding-' || v_event_id || '-' || p_event_type,
      p_verified_by
    );
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'event_id', v_event_id,
    'student_name', v_student_name,
    'event_type', p_event_type,
    'stop_name', v_stop_name
  );
END;
$$;

-- E. Prune Expired Location History
CREATE OR REPLACE FUNCTION public.purge_expired_location_history(
  p_institution_id UUID DEFAULT NULL
)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_count INT := 0;
BEGIN
  DELETE FROM public.vehicle_location_history h
  WHERE (p_institution_id IS NULL OR h.institution_id = p_institution_id)
    AND h.recorded_at < (
      timezone('utc', now()) - (
        COALESCE(
          (SELECT location_retention_days FROM public.transport_settings WHERE institution_id = h.institution_id),
          30
        ) || ' days'
      )::interval
    );

  GET DIAGNOSTICS v_deleted_count = ROW_COUNT;
  RETURN v_deleted_count;
END;
$$;

-- ============================================================================
-- 19. Row-Level Security (RLS) Policies
-- ============================================================================

ALTER TABLE public.transport_vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_staff_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_routes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.route_stops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_transport_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_journeys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journey_stop_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_live_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicle_location_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_boarding_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transport_settings ENABLE ROW LEVEL SECURITY;

-- 1. Transport Vehicles
CREATE POLICY transport_vehicles_select ON public.transport_vehicles
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY transport_vehicles_write ON public.transport_vehicles
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 2. Vehicle Documents
CREATE POLICY vehicle_documents_select ON public.vehicle_documents
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY vehicle_documents_write ON public.vehicle_documents
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 3. Vehicle Maintenance Records
CREATE POLICY vehicle_maintenance_select ON public.vehicle_maintenance_records
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY vehicle_maintenance_write ON public.vehicle_maintenance_records
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 4. Transport Staff Profiles
CREATE POLICY transport_staff_select ON public.transport_staff_profiles
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY transport_staff_write ON public.transport_staff_profiles
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 5. Transport Stops & Route Stops
CREATE POLICY transport_stops_select ON public.transport_stops
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY transport_stops_write ON public.transport_stops
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

CREATE POLICY route_stops_select ON public.route_stops
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY route_stops_write ON public.route_stops
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 6. Transport Routes
CREATE POLICY transport_routes_select ON public.transport_routes
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY transport_routes_write ON public.transport_routes
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 7. Student Transport Assignments
CREATE POLICY student_transport_assignments_select ON public.student_transport_assignments
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'staff', 'faculty']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    is_guardian_of_student(student_id)
  );

CREATE POLICY student_transport_assignments_write ON public.student_transport_assignments
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 8. Transport Journeys & Stop Events
CREATE POLICY transport_journeys_select ON public.transport_journeys
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'staff', 'faculty']) OR
    driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()) OR
    route_id IN (
      SELECT route_id FROM public.student_transport_assignments sta
      WHERE (sta.student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR is_guardian_of_student(sta.student_id))
        AND sta.status = 'active'
    )
  );

CREATE POLICY transport_journeys_write ON public.transport_journeys
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY journey_stop_events_select ON public.journey_stop_events
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY journey_stop_events_write ON public.journey_stop_events
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    journey_id IN (SELECT id FROM public.transport_journeys WHERE driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
  );

-- 9. Live Vehicle Telemetry (Zero public access; strictly authorized staff, assigned driver, or parent/student assigned to that route)
CREATE POLICY vehicle_live_locations_select ON public.vehicle_live_locations
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    journey_id IN (SELECT id FROM public.transport_journeys WHERE driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())) OR
    journey_id IN (
      SELECT j.id FROM public.transport_journeys j
      JOIN public.student_transport_assignments sta ON sta.route_id = j.route_id
      WHERE sta.status = 'active'
        AND (sta.student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR is_guardian_of_student(sta.student_id))
    )
  );

CREATE POLICY vehicle_live_locations_write ON public.vehicle_live_locations
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    journey_id IN (SELECT id FROM public.transport_journeys WHERE driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
  );

-- 10. Vehicle Location History
CREATE POLICY vehicle_location_history_select ON public.vehicle_location_history
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

CREATE POLICY vehicle_location_history_write ON public.vehicle_location_history
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    journey_id IN (SELECT id FROM public.transport_journeys WHERE driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
  );

-- 11. Student Boarding Events
CREATE POLICY student_boarding_events_select ON public.student_boarding_events
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'academic_admin', 'staff', 'faculty']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    is_guardian_of_student(student_id)
  );

CREATE POLICY student_boarding_events_write ON public.student_boarding_events
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    journey_id IN (SELECT id FROM public.transport_journeys WHERE driver_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid()))
  );

-- 12. Transport Change Requests
CREATE POLICY transport_change_requests_select ON public.transport_change_requests
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    requested_by_user_id = auth.uid() OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    is_guardian_of_student(student_id)
  );

CREATE POLICY transport_change_requests_insert ON public.transport_change_requests
  FOR INSERT WITH CHECK (
    requested_by_user_id = auth.uid() AND (
      has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
      student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
      is_guardian_of_student(student_id)
    )
  );

CREATE POLICY transport_change_requests_update ON public.transport_change_requests
  FOR UPDATE USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff'])
  );

-- 13. Transport Settings
CREATE POLICY transport_settings_select ON public.transport_settings
  FOR SELECT USING (
    institution_id IN (SELECT get_user_institution_ids())
  );

CREATE POLICY transport_settings_write ON public.transport_settings
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin'])
  );
