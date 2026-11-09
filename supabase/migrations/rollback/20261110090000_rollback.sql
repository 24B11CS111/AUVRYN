-- Rollback Migration: 20261110090000_rollback.sql
-- Description: Rollback server-side GPS telemetry authorization hardening and atomic push token registration
-- Verification Gate: Phase 2.5 Security Rollback

-- 1. Drop atomic push token procedure
DROP FUNCTION IF EXISTS public.register_push_device_token_atomic(TEXT, TEXT, TEXT);

-- 2. Restore previous record_vehicle_gps_location_atomic definition
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
