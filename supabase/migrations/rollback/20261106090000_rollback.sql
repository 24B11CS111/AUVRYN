-- Rollback Migration: 20261106090000_rollback.sql
-- Description: Rollback Universal Transport Management & Live Bus Tracking Engine
-- Milestone: 10

-- 1. Drop Stored Procedures & Functions
DROP FUNCTION IF EXISTS public.purge_expired_location_history(UUID);
DROP FUNCTION IF EXISTS public.record_student_boarding_atomic(UUID, UUID, UUID, UUID, boarding_event_type, boarding_verification_method, UUID, TEXT);
DROP FUNCTION IF EXISTS public.record_vehicle_gps_location_atomic(UUID, UUID, UUID, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, NUMERIC, TEXT, TIMESTAMPTZ);
DROP FUNCTION IF EXISTS public.update_journey_status_atomic(UUID, UUID, transport_journey_status, INT, TEXT, TEXT, TEXT, UUID);
DROP FUNCTION IF EXISTS public.assign_student_transport_atomic(UUID, UUID, UUID, UUID, UUID, UUID, UUID, TEXT);

-- 2. Drop Tables (in reverse dependency order)
DROP TABLE IF EXISTS public.transport_settings CASCADE;
DROP TABLE IF EXISTS public.transport_change_requests CASCADE;
DROP TABLE IF EXISTS public.student_boarding_events CASCADE;
DROP TABLE IF EXISTS public.vehicle_location_history CASCADE;
DROP TABLE IF EXISTS public.vehicle_live_locations CASCADE;
DROP TABLE IF EXISTS public.journey_stop_events CASCADE;
DROP TABLE IF EXISTS public.transport_journeys CASCADE;
DROP TABLE IF EXISTS public.student_transport_assignments CASCADE;
DROP TABLE IF EXISTS public.route_stops CASCADE;
DROP TABLE IF EXISTS public.transport_routes CASCADE;
DROP TABLE IF EXISTS public.transport_stops CASCADE;
DROP TABLE IF EXISTS public.transport_staff_profiles CASCADE;
DROP TABLE IF EXISTS public.vehicle_maintenance_records CASCADE;
DROP TABLE IF EXISTS public.vehicle_documents CASCADE;
DROP TABLE IF EXISTS public.transport_vehicles CASCADE;

-- 3. Drop Custom Types & Enums
DROP TYPE IF EXISTS public.transport_change_request_status CASCADE;
DROP TYPE IF EXISTS public.transport_change_request_type CASCADE;
DROP TYPE IF EXISTS public.boarding_verification_method CASCADE;
DROP TYPE IF EXISTS public.boarding_event_type CASCADE;
DROP TYPE IF EXISTS public.journey_stop_status CASCADE;
DROP TYPE IF EXISTS public.transport_journey_type CASCADE;
DROP TYPE IF EXISTS public.transport_journey_status CASCADE;
DROP TYPE IF EXISTS public.student_transport_status CASCADE;
DROP TYPE IF EXISTS public.transport_route_shift CASCADE;
DROP TYPE IF EXISTS public.transport_route_type CASCADE;
DROP TYPE IF EXISTS public.transport_staff_role CASCADE;
DROP TYPE IF EXISTS public.transport_maintenance_status CASCADE;
DROP TYPE IF EXISTS public.transport_maintenance_type CASCADE;
DROP TYPE IF EXISTS public.vehicle_document_status CASCADE;
DROP TYPE IF EXISTS public.vehicle_document_type CASCADE;
DROP TYPE IF EXISTS public.transport_vehicle_status CASCADE;
