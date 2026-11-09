-- Forward Migration: 20261110090000_harden_transport_gps_authorization.sql
-- Description: Enforce server-side authorization on vehicle GPS telemetry and atomic push token registration
-- Verification Gate: Phase 2.5 Security Hardening (REM-MED-01)

-- 1. Hardened record_vehicle_gps_location_atomic with server-side authorization
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
  v_caller_uid UUID := auth.uid();
  v_caller_role TEXT := auth.role();
  v_journey_rec RECORD;
  v_existing_recorded_at TIMESTAMPTZ;
  v_is_admin BOOLEAN := false;
BEGIN
  -- A. Authentication Check (service_role bypasses for automated IoT/backend ingestion)
  IF v_caller_role IS DISTINCT FROM 'service_role' THEN
    IF v_caller_uid IS NULL THEN
      RAISE EXCEPTION 'Authentication required to submit vehicle GPS telemetry'
        USING ERRCODE = '42501';
    END IF;

    -- B. Verify active institution membership
    IF NOT EXISTS (
      SELECT 1 FROM public.institution_memberships
      WHERE institution_id = p_institution_id
        AND user_id = v_caller_uid
        AND status = 'active'
    ) THEN
      RAISE EXCEPTION 'Unauthorized: Caller % is not an active member of institution %', v_caller_uid, p_institution_id
        USING ERRCODE = '42501';
    END IF;

    -- C. Journey ID is required for mobile/authenticated telemetry submissions
    IF p_journey_id IS NULL THEN
      RAISE EXCEPTION 'journey_id is required for authenticated driver telemetry updates'
        USING ERRCODE = '22023';
    END IF;

    -- D. Fetch journey record and resolve driver/attendant user IDs
    SELECT
      j.id,
      j.institution_id,
      j.vehicle_id,
      j.driver_id,
      j.attendant_id,
      j.status,
      sp_driver.user_id AS driver_user_id,
      sp_attendant.user_id AS attendant_user_id
    INTO v_journey_rec
    FROM public.transport_journeys j
    LEFT JOIN public.staff_profiles sp_driver ON sp_driver.id = j.driver_id
    LEFT JOIN public.staff_profiles sp_attendant ON sp_attendant.id = j.attendant_id
    WHERE j.id = p_journey_id AND j.institution_id = p_institution_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Journey % not found in institution %', p_journey_id, p_institution_id
        USING ERRCODE = 'P0002';
    END IF;

    -- E. Verify vehicle is assigned to this journey
    IF v_journey_rec.vehicle_id != p_vehicle_id THEN
      RAISE EXCEPTION 'Vehicle % is not assigned to journey %', p_vehicle_id, p_journey_id
        USING ERRCODE = '22023';
    END IF;

    -- F. Verify journey is currently active ('in_progress' or 'delayed')
    IF v_journey_rec.status NOT IN ('in_progress', 'delayed') THEN
      RAISE EXCEPTION 'Location updates rejected: Journey % is not in progress (status: %)', p_journey_id, v_journey_rec.status
        USING ERRCODE = 'P0001';
    END IF;

    -- G. Authorization Check: Caller MUST be the assigned driver, attendant, or institution admin
    v_is_admin := public.has_institution_role(p_institution_id, ARRAY['owner', 'admin']::text[]);

    IF NOT v_is_admin
       AND (v_journey_rec.driver_user_id IS DISTINCT FROM v_caller_uid)
       AND (v_journey_rec.attendant_user_id IS DISTINCT FROM v_caller_uid) THEN
      RAISE EXCEPTION 'Unauthorized: Caller % is not the assigned driver or attendant for journey %', v_caller_uid, p_journey_id
        USING ERRCODE = '42501';
    END IF;
  ELSE
    -- Service role invocation: verify vehicle belongs to institution
    IF NOT EXISTS (
      SELECT 1 FROM public.transport_vehicles
      WHERE id = p_vehicle_id AND institution_id = p_institution_id
    ) THEN
      RAISE EXCEPTION 'Vehicle % does not belong to institution %', p_vehicle_id, p_institution_id
        USING ERRCODE = '22023';
    END IF;

    IF p_journey_id IS NOT NULL THEN
      SELECT status INTO v_journey_rec
      FROM public.transport_journeys
      WHERE id = p_journey_id AND institution_id = p_institution_id;

      IF NOT FOUND THEN
        RAISE EXCEPTION 'Journey % not found in institution %', p_journey_id, p_institution_id
          USING ERRCODE = 'P0002';
      END IF;
    END IF;
  END IF;

  -- 1. Validate coordinates range
  IF p_latitude < -90.0 OR p_latitude > 90.0 OR p_longitude < -180.0 OR p_longitude > 180.0 THEN
    RAISE EXCEPTION 'Invalid GPS coordinates (lat: %, lng: %)', p_latitude, p_longitude
      USING ERRCODE = '22023';
  END IF;

  -- 2. Check freshness against existing live state
  SELECT recorded_at INTO v_existing_recorded_at
  FROM public.vehicle_live_locations
  WHERE vehicle_id = p_vehicle_id;

  IF v_existing_recorded_at IS NOT NULL AND p_recorded_at < v_existing_recorded_at THEN
    RETURN jsonb_build_object(
      'success', false,
      'reason', 'out_of_order_telemetry_discarded',
      'last_recorded_at', v_existing_recorded_at
    );
  END IF;

  -- 3. Upsert into vehicle_live_locations
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

  -- 4. Append to breadcrumb trail history if journey is present
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
    'journey_id', p_journey_id,
    'recorded_at', p_recorded_at
  );
END;
$$;

-- Revoke default public execution; restrict to authenticated and service_role
REVOKE EXECUTE ON FUNCTION public.record_vehicle_gps_location_atomic(
  UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ
) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.record_vehicle_gps_location_atomic(
  UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ
) TO authenticated, service_role;


-- 2. Atomic push device token registration procedure
-- Handles shared-device account switching and token re-assignment safely
CREATE OR REPLACE FUNCTION public.register_push_device_token_atomic(
  p_token TEXT,
  p_platform TEXT DEFAULT 'android',
  p_app_version TEXT DEFAULT '1.0.0'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_uid UUID := auth.uid();
BEGIN
  IF v_caller_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required to register push device token'
      USING ERRCODE = '42501';
  END IF;

  IF p_token IS NULL OR trim(p_token) = '' THEN
    RAISE EXCEPTION 'Device push token cannot be empty'
      USING ERRCODE = '22023';
  END IF;

  -- Reassign or insert token row for caller.
  -- This seamlessly handles shared-device account switching without violating RLS.
  INSERT INTO public.push_device_tokens (
    user_id,
    token,
    platform,
    app_version,
    is_active,
    last_used_at,
    created_at
  ) VALUES (
    v_caller_uid,
    trim(p_token),
    p_platform,
    p_app_version,
    true,
    timezone('utc', now()),
    timezone('utc', now())
  )
  ON CONFLICT (token)
  DO UPDATE SET
    user_id = v_caller_uid,
    platform = EXCLUDED.platform,
    app_version = EXCLUDED.app_version,
    is_active = true,
    last_used_at = timezone('utc', now());

  RETURN jsonb_build_object(
    'success', true,
    'token', trim(p_token),
    'user_id', v_caller_uid
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.register_push_device_token_atomic(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_push_device_token_atomic(TEXT, TEXT, TEXT) TO authenticated, service_role;
