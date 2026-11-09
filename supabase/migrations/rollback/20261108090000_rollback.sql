-- Rollback Migration: 20261108090000_rollback.sql
-- Description: Rollback Universal Library, Hostel & Events Management Engine

-- 1. Drop Stored Procedures
DROP FUNCTION IF EXISTS public.register_event_participant_atomic(UUID, UUID, TEXT, UUID, UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.vacate_hostel_bed_atomic(UUID, UUID);
DROP FUNCTION IF EXISTS public.allocate_hostel_bed_atomic(UUID, UUID, UUID, UUID, DATE, DATE, UUID);
DROP FUNCTION IF EXISTS public.return_library_book_atomic(UUID, UUID, UUID, TEXT);
DROP FUNCTION IF EXISTS public.issue_library_book_atomic(UUID, UUID, UUID, UUID, INT);

-- 2. Drop Events Tables
DROP TABLE IF EXISTS public.event_certificates CASCADE;
DROP TABLE IF EXISTS public.event_attendance CASCADE;
DROP TABLE IF EXISTS public.event_registrations CASCADE;
DROP TABLE IF EXISTS public.institution_events CASCADE;

-- 3. Drop Hostel Tables
DROP TABLE IF EXISTS public.hostel_mess_records CASCADE;
DROP TABLE IF EXISTS public.hostel_complaints CASCADE;
DROP TABLE IF EXISTS public.hostel_visitors CASCADE;
DROP TABLE IF EXISTS public.hostel_outpasses CASCADE;
DROP TABLE IF EXISTS public.hostel_room_transfers CASCADE;
DROP TABLE IF EXISTS public.hostel_applications CASCADE;
DROP TABLE IF EXISTS public.hostel_allocations CASCADE;
DROP TABLE IF EXISTS public.hostel_beds CASCADE;
DROP TABLE IF EXISTS public.hostel_rooms CASCADE;
DROP TABLE IF EXISTS public.hostel_buildings CASCADE;

-- 4. Drop Library Tables
DROP TABLE IF EXISTS public.library_settings CASCADE;
DROP TABLE IF EXISTS public.library_digital_resources CASCADE;
DROP TABLE IF EXISTS public.library_fines CASCADE;
DROP TABLE IF EXISTS public.library_reservations CASCADE;
DROP TABLE IF EXISTS public.library_circulations CASCADE;
DROP TABLE IF EXISTS public.library_members CASCADE;
DROP TABLE IF EXISTS public.library_book_copies CASCADE;
DROP TABLE IF EXISTS public.library_books CASCADE;
DROP TABLE IF EXISTS public.library_branches CASCADE;

-- 5. Drop Custom Types & Enums
DROP TYPE IF EXISTS public.event_certificate_type;
DROP TYPE IF EXISTS public.event_registration_status;
DROP TYPE IF EXISTS public.event_status;
DROP TYPE IF EXISTS public.institution_event_type;

DROP TYPE IF EXISTS public.hostel_complaint_status;
DROP TYPE IF EXISTS public.hostel_complaint_category;
DROP TYPE IF EXISTS public.hostel_outpass_status;
DROP TYPE IF EXISTS public.hostel_allocation_status;
DROP TYPE IF EXISTS public.hostel_room_type;
DROP TYPE IF EXISTS public.hostel_gender_policy;

DROP TYPE IF EXISTS public.library_resource_type;
DROP TYPE IF EXISTS public.library_fine_status;
DROP TYPE IF EXISTS public.library_reservation_status;
DROP TYPE IF EXISTS public.library_circulation_status;
DROP TYPE IF EXISTS public.library_copy_status;
