-- Migration: 20261108090000_library_hostel_events.sql
-- Description: Universal Library, Hostel & Events Management Engine
-- Milestone: 11

-- ============================================================================
-- 1. Custom Types & Enumerations
-- ============================================================================

-- Library Enums
DO $$ BEGIN
  CREATE TYPE library_copy_status AS ENUM (
    'available',
    'issued',
    'reserved',
    'lost',
    'damaged',
    'under_repair',
    'weeded'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE library_circulation_status AS ENUM (
    'issued',
    'returned',
    'overdue',
    'lost',
    'damaged'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE library_reservation_status AS ENUM (
    'pending',
    'fulfilled',
    'cancelled',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE library_fine_status AS ENUM (
    'pending',
    'paid',
    'waived'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE library_resource_type AS ENUM (
    'ebook',
    'journal',
    'thesis',
    'audio',
    'video',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Hostel Enums
DO $$ BEGIN
  CREATE TYPE hostel_gender_policy AS ENUM (
    'boys',
    'girls',
    'coed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hostel_room_type AS ENUM (
    'single',
    'double',
    'triple',
    'dormitory'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hostel_allocation_status AS ENUM (
    'active',
    'vacated',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hostel_outpass_status AS ENUM (
    'pending_consent',
    'pending_approval',
    'approved',
    'rejected',
    'checked_out',
    'completed',
    'overdue'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hostel_complaint_category AS ENUM (
    'electrical',
    'plumbing',
    'carpentry',
    'cleaning',
    'internet',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE hostel_complaint_status AS ENUM (
    'open',
    'in_progress',
    'resolved',
    'closed'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- Event Enums
DO $$ BEGIN
  CREATE TYPE institution_event_type AS ENUM (
    'academic',
    'cultural',
    'sports',
    'workshop',
    'seminar',
    'club_activity',
    'competition',
    'other'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_status AS ENUM (
    'draft',
    'published',
    'ongoing',
    'completed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_registration_status AS ENUM (
    'registered',
    'waitlisted',
    'confirmed',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE event_certificate_type AS ENUM (
    'participation',
    'merit',
    'winner',
    'runner_up'
  );
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. Module A — Library Management Tables
-- ============================================================================

-- 1. Library Branches
CREATE TABLE IF NOT EXISTS public.library_branches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  location TEXT,
  opening_hours TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT library_branches_code_unique UNIQUE (institution_id, code)
);

CREATE INDEX IF NOT EXISTS idx_library_branches_inst ON public.library_branches(institution_id);
CREATE INDEX IF NOT EXISTS idx_library_branches_campus ON public.library_branches(campus_id);

-- 2. Books Catalog
CREATE TABLE IF NOT EXISTS public.library_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.library_branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  isbn TEXT,
  publisher TEXT,
  category TEXT NOT NULL,
  edition TEXT,
  subject TEXT,
  dewey_decimal TEXT,
  description TEXT,
  cover_url TEXT,
  pages INT,
  language TEXT DEFAULT 'English',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_library_books_inst ON public.library_books(institution_id);
CREATE INDEX IF NOT EXISTS idx_library_books_category ON public.library_books(institution_id, category);
CREATE INDEX IF NOT EXISTS idx_library_books_isbn ON public.library_books(institution_id, isbn);
CREATE INDEX IF NOT EXISTS idx_library_books_title ON public.library_books(institution_id, title);

-- 3. Individual Book Copies
CREATE TABLE IF NOT EXISTS public.library_book_copies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.library_branches(id) ON DELETE SET NULL,
  accession_number TEXT NOT NULL,
  barcode TEXT NOT NULL,
  copy_number INT DEFAULT 1,
  status library_copy_status NOT NULL DEFAULT 'available',
  condition TEXT DEFAULT 'good',
  shelf_location TEXT,
  price NUMERIC(10,2) DEFAULT 0.00,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT library_book_copies_accession_unique UNIQUE (institution_id, accession_number),
  CONSTRAINT library_book_copies_barcode_unique UNIQUE (institution_id, barcode)
);

CREATE INDEX IF NOT EXISTS idx_library_copies_inst_book ON public.library_book_copies(institution_id, book_id);
CREATE INDEX IF NOT EXISTS idx_library_copies_status ON public.library_book_copies(institution_id, status);

-- 4. Library Members
CREATE TABLE IF NOT EXISTS public.library_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  member_type TEXT NOT NULL CHECK (member_type IN ('student', 'staff')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  membership_number TEXT NOT NULL,
  barcode TEXT NOT NULL,
  max_books_allowed INT NOT NULL DEFAULT 3,
  borrow_duration_days INT NOT NULL DEFAULT 14,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'expired')),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT library_members_number_unique UNIQUE (institution_id, membership_number),
  CONSTRAINT library_members_barcode_unique UNIQUE (institution_id, barcode),
  CONSTRAINT library_members_target_check CHECK (
    (member_type = 'student' AND student_id IS NOT NULL AND staff_id IS NULL) OR
    (member_type = 'staff' AND staff_id IS NOT NULL AND student_id IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_library_members_inst ON public.library_members(institution_id);
CREATE INDEX IF NOT EXISTS idx_library_members_student ON public.library_members(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_library_members_staff ON public.library_members(institution_id, staff_id);

-- 5. Library Circulations (Issue, Return, Renewal)
CREATE TABLE IF NOT EXISTS public.library_circulations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  copy_id UUID NOT NULL REFERENCES public.library_book_copies(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.library_members(id) ON DELETE CASCADE,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  due_date DATE NOT NULL,
  returned_at TIMESTAMPTZ,
  renewal_count INT NOT NULL DEFAULT 0,
  max_renewals INT NOT NULL DEFAULT 2,
  status library_circulation_status NOT NULL DEFAULT 'issued',
  issued_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  received_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_library_circ_inst_member ON public.library_circulations(institution_id, member_id);
CREATE INDEX IF NOT EXISTS idx_library_circ_inst_copy ON public.library_circulations(institution_id, copy_id);
CREATE INDEX IF NOT EXISTS idx_library_circ_status ON public.library_circulations(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_library_circ_due ON public.library_circulations(institution_id, due_date);

-- 6. Library Reservations
CREATE TABLE IF NOT EXISTS public.library_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.library_books(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.library_members(id) ON DELETE CASCADE,
  reserved_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  expires_at TIMESTAMPTZ NOT NULL,
  status library_reservation_status NOT NULL DEFAULT 'pending',
  fulfilled_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_library_res_inst_book ON public.library_reservations(institution_id, book_id);
CREATE INDEX IF NOT EXISTS idx_library_res_inst_member ON public.library_reservations(institution_id, member_id);
CREATE INDEX IF NOT EXISTS idx_library_res_status ON public.library_reservations(institution_id, status);

-- 7. Library Fines
CREATE TABLE IF NOT EXISTS public.library_fines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  circulation_id UUID REFERENCES public.library_circulations(id) ON DELETE CASCADE,
  member_id UUID NOT NULL REFERENCES public.library_members(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  reason TEXT NOT NULL CHECK (reason IN ('overdue', 'lost_book', 'damaged_book', 'other')),
  status library_fine_status NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  waived_at TIMESTAMPTZ,
  waived_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  waiver_reason TEXT,
  receipt_number TEXT,
  fee_record_id UUID,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_library_fines_inst_member ON public.library_fines(institution_id, member_id);
CREATE INDEX IF NOT EXISTS idx_library_fines_status ON public.library_fines(institution_id, status);

-- 8. Digital Resources
CREATE TABLE IF NOT EXISTS public.library_digital_resources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  branch_id UUID REFERENCES public.library_branches(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  author TEXT,
  resource_type library_resource_type NOT NULL DEFAULT 'ebook',
  category TEXT NOT NULL,
  file_url TEXT,
  external_url TEXT,
  access_level TEXT NOT NULL DEFAULT 'all_members' CHECK (access_level IN ('all_members', 'staff_only', 'students_only')),
  download_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_digital_res_inst ON public.library_digital_resources(institution_id);

-- 9. Library Settings
CREATE TABLE IF NOT EXISTS public.library_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  fine_per_day NUMERIC(10,2) NOT NULL DEFAULT 5.00,
  grace_period_days INT NOT NULL DEFAULT 2,
  max_fine_per_book NUMERIC(10,2) NOT NULL DEFAULT 200.00,
  default_loan_days_student INT NOT NULL DEFAULT 14,
  default_loan_days_staff INT NOT NULL DEFAULT 30,
  max_books_student INT NOT NULL DEFAULT 3,
  max_books_staff INT NOT NULL DEFAULT 6,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT library_settings_inst_unique UNIQUE (institution_id)
);

-- ============================================================================
-- 3. Module B — Hostel Management Tables
-- ============================================================================

-- 10. Hostel Buildings
CREATE TABLE IF NOT EXISTS public.hostel_buildings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  building_code TEXT NOT NULL,
  gender_policy hostel_gender_policy NOT NULL DEFAULT 'boys',
  total_floors INT NOT NULL DEFAULT 1,
  warden_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  assistant_warden_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  caretaker_contact TEXT,
  address TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT hostel_buildings_code_unique UNIQUE (institution_id, building_code)
);

CREATE INDEX IF NOT EXISTS idx_hostel_buildings_inst ON public.hostel_buildings(institution_id);
CREATE INDEX IF NOT EXISTS idx_hostel_buildings_campus ON public.hostel_buildings(campus_id);

-- 11. Hostel Rooms
CREATE TABLE IF NOT EXISTS public.hostel_rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  building_id UUID NOT NULL REFERENCES public.hostel_buildings(id) ON DELETE CASCADE,
  room_number TEXT NOT NULL,
  floor_number INT NOT NULL DEFAULT 0,
  room_type hostel_room_type NOT NULL DEFAULT 'double',
  bed_capacity INT NOT NULL DEFAULT 2,
  is_ac BOOLEAN NOT NULL DEFAULT false,
  is_attached_washroom BOOLEAN NOT NULL DEFAULT false,
  base_fee_monthly NUMERIC(10,2) DEFAULT 0.00,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'full', 'maintenance', 'inactive')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT hostel_rooms_building_number_unique UNIQUE (building_id, room_number)
);

CREATE INDEX IF NOT EXISTS idx_hostel_rooms_inst ON public.hostel_rooms(institution_id);
CREATE INDEX IF NOT EXISTS idx_hostel_rooms_building ON public.hostel_rooms(building_id);

-- 12. Hostel Beds
CREATE TABLE IF NOT EXISTS public.hostel_beds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  room_id UUID NOT NULL REFERENCES public.hostel_rooms(id) ON DELETE CASCADE,
  bed_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'maintenance')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT hostel_beds_room_bed_unique UNIQUE (room_id, bed_number)
);

CREATE INDEX IF NOT EXISTS idx_hostel_beds_inst ON public.hostel_beds(institution_id);
CREATE INDEX IF NOT EXISTS idx_hostel_beds_room ON public.hostel_beds(room_id);
CREATE INDEX IF NOT EXISTS idx_hostel_beds_status ON public.hostel_beds(institution_id, status);

-- 13. Hostel Bed Allocations
CREATE TABLE IF NOT EXISTS public.hostel_allocations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  bed_id UUID NOT NULL REFERENCES public.hostel_beds(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  allocated_from DATE NOT NULL,
  allocated_to DATE,
  vacated_at TIMESTAMPTZ,
  status hostel_allocation_status NOT NULL DEFAULT 'active',
  fee_structure_id UUID REFERENCES public.fee_structures(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hostel_alloc_inst_student ON public.hostel_allocations(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_inst_bed ON public.hostel_allocations(institution_id, bed_id);
CREATE INDEX IF NOT EXISTS idx_hostel_alloc_status ON public.hostel_allocations(institution_id, status);

-- Partial unique index ensuring a student only has one active hostel allocation at any time
CREATE UNIQUE INDEX IF NOT EXISTS idx_hostel_alloc_active_student_unique
  ON public.hostel_allocations (institution_id, student_id)
  WHERE status = 'active';

-- Partial unique index ensuring a bed is never allocated twice simultaneously
CREATE UNIQUE INDEX IF NOT EXISTS idx_hostel_alloc_active_bed_unique
  ON public.hostel_allocations (bed_id)
  WHERE status = 'active';

-- 14. Hostel Applications
CREATE TABLE IF NOT EXISTS public.hostel_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  academic_year_id UUID NOT NULL REFERENCES public.academic_years(id) ON DELETE CASCADE,
  preferred_building_id UUID REFERENCES public.hostel_buildings(id) ON DELETE SET NULL,
  preferred_room_type hostel_room_type,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlisted')),
  reviewed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hostel_apps_inst_student ON public.hostel_applications(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_apps_status ON public.hostel_applications(institution_id, status);

-- 15. Hostel Room Transfers
CREATE TABLE IF NOT EXISTS public.hostel_room_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  allocation_id UUID NOT NULL REFERENCES public.hostel_allocations(id) ON DELETE CASCADE,
  target_bed_id UUID REFERENCES public.hostel_beds(id) ON DELETE SET NULL,
  reason TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'completed')),
  reviewed_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hostel_transfers_inst ON public.hostel_room_transfers(institution_id);

-- 16. Hostel Outpasses / Student Leave
CREATE TABLE IF NOT EXISTS public.hostel_outpasses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  departure_time TIMESTAMPTZ NOT NULL,
  expected_return_time TIMESTAMPTZ NOT NULL,
  actual_departure_time TIMESTAMPTZ,
  actual_return_time TIMESTAMPTZ,
  purpose TEXT NOT NULL,
  destination TEXT NOT NULL,
  emergency_contact TEXT NOT NULL,
  parent_consent_status TEXT NOT NULL DEFAULT 'not_required' CHECK (parent_consent_status IN ('not_required', 'pending', 'approved', 'rejected')),
  parent_consent_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  parent_consent_at TIMESTAMPTZ,
  warden_status TEXT NOT NULL DEFAULT 'pending' CHECK (warden_status IN ('pending', 'approved', 'rejected')),
  warden_approved_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  warden_approved_at TIMESTAMPTZ,
  status hostel_outpass_status NOT NULL DEFAULT 'pending_approval',
  gate_pass_code TEXT NOT NULL DEFAULT substring(gen_random_uuid()::text, 1, 8),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hostel_outpasses_inst_student ON public.hostel_outpasses(institution_id, student_id);
CREATE INDEX IF NOT EXISTS idx_hostel_outpasses_status ON public.hostel_outpasses(institution_id, status);

-- 17. Hostel Visitors
CREATE TABLE IF NOT EXISTS public.hostel_visitors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  visitor_name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  id_proof_type TEXT DEFAULT 'government_id',
  id_proof_number TEXT,
  contact_phone TEXT NOT NULL,
  check_in_time TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  check_out_time TIMESTAMPTZ,
  purpose TEXT,
  checked_in_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hostel_visitors_inst_student ON public.hostel_visitors(institution_id, student_id);

-- 18. Hostel Maintenance Complaints
CREATE TABLE IF NOT EXISTS public.hostel_complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  room_id UUID REFERENCES public.hostel_rooms(id) ON DELETE SET NULL,
  category hostel_complaint_category NOT NULL DEFAULT 'other',
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status hostel_complaint_status NOT NULL DEFAULT 'open',
  assigned_to UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_hostel_complaints_inst ON public.hostel_complaints(institution_id);
CREATE INDEX IF NOT EXISTS idx_hostel_complaints_student ON public.hostel_complaints(institution_id, student_id);

-- 19. Hostel Mess & Meal Records
CREATE TABLE IF NOT EXISTS public.hostel_mess_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  meal_plan TEXT NOT NULL DEFAULT 'vegetarian' CHECK (meal_plan IN ('vegetarian', 'non_vegetarian', 'jain', 'special')),
  dietary_notes TEXT,
  start_date DATE NOT NULL,
  end_date DATE,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT hostel_mess_student_unique UNIQUE (institution_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_hostel_mess_inst ON public.hostel_mess_records(institution_id);

-- ============================================================================
-- 4. Module C — Events & Activities Tables
-- ============================================================================

-- 20. Institution Events
CREATE TABLE IF NOT EXISTS public.institution_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  campus_id UUID REFERENCES public.campuses(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  event_type institution_event_type NOT NULL DEFAULT 'academic',
  description TEXT,
  venue TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  registration_deadline TIMESTAMPTZ,
  max_participants INT NOT NULL DEFAULT 0,
  is_registration_open BOOLEAN NOT NULL DEFAULT true,
  organizer_staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  status event_status NOT NULL DEFAULT 'draft',
  banner_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_events_inst ON public.institution_events(institution_id);
CREATE INDEX IF NOT EXISTS idx_events_status ON public.institution_events(institution_id, status);
CREATE INDEX IF NOT EXISTS idx_events_start ON public.institution_events(institution_id, start_time);

-- 21. Event Registrations
CREATE TABLE IF NOT EXISTS public.event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  event_id UUID NOT NULL REFERENCES public.institution_events(id) ON DELETE CASCADE,
  participant_category TEXT NOT NULL CHECK (participant_category IN ('student', 'staff', 'guest')),
  student_id UUID REFERENCES public.students(id) ON DELETE CASCADE,
  staff_id UUID REFERENCES public.staff_profiles(id) ON DELETE CASCADE,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  status event_registration_status NOT NULL DEFAULT 'registered',
  registered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  ticket_code TEXT NOT NULL DEFAULT substring(gen_random_uuid()::text, 1, 8),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT event_reg_student_unique UNIQUE (event_id, student_id),
  CONSTRAINT event_reg_staff_unique UNIQUE (event_id, staff_id)
);

CREATE INDEX IF NOT EXISTS idx_event_reg_inst_event ON public.event_registrations(institution_id, event_id);
CREATE INDEX IF NOT EXISTS idx_event_reg_student ON public.event_registrations(institution_id, student_id);

-- 22. Event Attendance
CREATE TABLE IF NOT EXISTS public.event_attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE UNIQUE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  checked_in_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_event_att_inst ON public.event_attendance(institution_id);

-- 23. Event Certificates
CREATE TABLE IF NOT EXISTS public.event_certificates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  institution_id UUID NOT NULL REFERENCES public.institutions(id) ON DELETE CASCADE,
  registration_id UUID NOT NULL REFERENCES public.event_registrations(id) ON DELETE CASCADE UNIQUE,
  certificate_number TEXT NOT NULL,
  certificate_type event_certificate_type NOT NULL DEFAULT 'participation',
  title TEXT NOT NULL,
  issued_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  issued_by UUID REFERENCES public.staff_profiles(id) ON DELETE SET NULL,
  certificate_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  CONSTRAINT event_certificates_number_unique UNIQUE (institution_id, certificate_number)
);

CREATE INDEX IF NOT EXISTS idx_event_cert_inst ON public.event_certificates(institution_id);

-- ============================================================================
-- 5. Stored Procedures & Atomic Workflows
-- ============================================================================

-- A. Issue Library Book Atomic
CREATE OR REPLACE FUNCTION public.issue_library_book_atomic(
  p_institution_id UUID,
  p_copy_id UUID,
  p_member_id UUID,
  p_issued_by UUID,
  p_loan_days INT DEFAULT 14
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_copy_status library_copy_status;
  v_member_status TEXT;
  v_max_books INT;
  v_current_issues INT;
  v_circulation_id UUID;
  v_due_date DATE;
BEGIN
  -- 1. Check member status and active borrows limit
  SELECT status, max_books_allowed INTO v_member_status, v_max_books
  FROM public.library_members
  WHERE id = p_member_id AND institution_id = p_institution_id;

  IF v_member_status IS NULL THEN
    RAISE EXCEPTION 'Library member not found';
  END IF;

  IF v_member_status <> 'active' THEN
    RAISE EXCEPTION 'Library member is not active (Status: %)', v_member_status;
  END IF;

  SELECT count(*) INTO v_current_issues
  FROM public.library_circulations
  WHERE member_id = p_member_id AND institution_id = p_institution_id AND status = 'issued';

  IF v_current_issues >= v_max_books THEN
    RAISE EXCEPTION 'Borrowing limit reached: Member already has % books issued (Max: %)', v_current_issues, v_max_books;
  END IF;

  -- 2. Lock and check book copy status
  SELECT status INTO v_copy_status
  FROM public.library_book_copies
  WHERE id = p_copy_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF v_copy_status IS NULL THEN
    RAISE EXCEPTION 'Book copy not found';
  END IF;

  IF v_copy_status <> 'available' THEN
    RAISE EXCEPTION 'Book copy is not available for issue (Status: %)', v_copy_status;
  END IF;

  -- 3. Update copy status to issued
  UPDATE public.library_book_copies
  SET status = 'issued', updated_at = timezone('utc', now())
  WHERE id = p_copy_id;

  -- 4. Create circulation record
  v_due_date := (timezone('utc', now())::date + p_loan_days);
  INSERT INTO public.library_circulations (
    institution_id,
    copy_id,
    member_id,
    issued_at,
    due_date,
    status,
    issued_by
  ) VALUES (
    p_institution_id,
    p_copy_id,
    p_member_id,
    timezone('utc', now()),
    v_due_date,
    'issued',
    p_issued_by
  )
  RETURNING id INTO v_circulation_id;

  RETURN jsonb_build_object(
    'success', true,
    'circulation_id', v_circulation_id,
    'due_date', v_due_date
  );
END;
$$;

-- B. Return Library Book Atomic
CREATE OR REPLACE FUNCTION public.return_library_book_atomic(
  p_institution_id UUID,
  p_circulation_id UUID,
  p_received_by UUID,
  p_condition TEXT DEFAULT 'good'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_circ RECORD;
  v_overdue_days INT;
  v_fine_rate NUMERIC;
  v_grace_days INT;
  v_max_fine NUMERIC;
  v_fine_amount NUMERIC := 0.00;
  v_fine_id UUID;
  v_next_reservation UUID;
BEGIN
  -- 1. Lock and fetch circulation record
  SELECT * INTO v_circ
  FROM public.library_circulations
  WHERE id = p_circulation_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF v_circ IS NULL THEN
    RAISE EXCEPTION 'Circulation record not found';
  END IF;

  IF v_circ.status <> 'issued' AND v_circ.status <> 'overdue' THEN
    RAISE EXCEPTION 'Book circulation is already returned or resolved (Status: %)', v_circ.status;
  END IF;

  -- 2. Mark circulation as returned
  UPDATE public.library_circulations
  SET status = 'returned',
      returned_at = timezone('utc', now()),
      received_by = p_received_by,
      updated_at = timezone('utc', now())
  WHERE id = p_circulation_id;

  -- 3. Calculate overdue fine if applicable
  IF timezone('utc', now())::date > v_circ.due_date THEN
    v_overdue_days := (timezone('utc', now())::date - v_circ.due_date);

    SELECT fine_per_day, grace_period_days, max_fine_per_book
    INTO v_fine_rate, v_grace_days, v_max_fine
    FROM public.library_settings
    WHERE institution_id = p_institution_id;

    v_fine_rate := COALESCE(v_fine_rate, 5.00);
    v_grace_days := COALESCE(v_grace_days, 2);
    v_max_fine := COALESCE(v_max_fine, 200.00);

    IF v_overdue_days > v_grace_days THEN
      v_fine_amount := LEAST(v_overdue_days * v_fine_rate, v_max_fine);

      INSERT INTO public.library_fines (
        institution_id,
        circulation_id,
        member_id,
        amount,
        reason,
        status
      ) VALUES (
        p_institution_id,
        p_circulation_id,
        v_circ.member_id,
        v_fine_amount,
        'overdue',
        'pending'
      )
      RETURNING id INTO v_fine_id;
    END IF;
  END IF;

  -- 4. Check if there is a pending reservation for this book
  SELECT r.id INTO v_next_reservation
  FROM public.library_reservations r
  JOIN public.library_book_copies c ON c.book_id = r.book_id
  WHERE c.id = v_circ.copy_id AND r.status = 'pending'
  ORDER BY r.reserved_at ASC
  LIMIT 1;

  IF v_next_reservation IS NOT NULL THEN
    -- Keep copy reserved for waiting member
    UPDATE public.library_book_copies
    SET status = 'reserved', condition = p_condition, updated_at = timezone('utc', now())
    WHERE id = v_circ.copy_id;

    UPDATE public.library_reservations
    SET status = 'fulfilled', fulfilled_at = timezone('utc', now()), updated_at = timezone('utc', now())
    WHERE id = v_next_reservation;
  ELSE
    -- Restore copy to available
    UPDATE public.library_book_copies
    SET status = 'available', condition = p_condition, updated_at = timezone('utc', now())
    WHERE id = v_circ.copy_id;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'fine_assessed', v_fine_amount,
    'fine_id', v_fine_id
  );
END;
$$;

-- C. Allocate Hostel Bed Atomic (Prevents double booking)
CREATE OR REPLACE FUNCTION public.allocate_hostel_bed_atomic(
  p_institution_id UUID,
  p_student_id UUID,
  p_bed_id UUID,
  p_academic_year_id UUID,
  p_allocated_from DATE,
  p_allocated_to DATE DEFAULT NULL,
  p_fee_structure_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_bed_status TEXT;
  v_room_id UUID;
  v_active_alloc_id UUID;
  v_new_alloc_id UUID;
  v_occupied_count INT;
  v_room_capacity INT;
BEGIN
  -- 1. Check if student already has an active allocation
  SELECT id INTO v_active_alloc_id
  FROM public.hostel_allocations
  WHERE student_id = p_student_id AND institution_id = p_institution_id AND status = 'active';

  IF v_active_alloc_id IS NOT NULL THEN
    RAISE EXCEPTION 'Student already has an active hostel bed allocation (Allocation ID: %)', v_active_alloc_id;
  END IF;

  -- 2. Lock bed row and verify availability
  SELECT status, room_id INTO v_bed_status, v_room_id
  FROM public.hostel_beds
  WHERE id = p_bed_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF v_bed_status IS NULL THEN
    RAISE EXCEPTION 'Hostel bed not found';
  END IF;

  IF v_bed_status <> 'available' THEN
    RAISE EXCEPTION 'Hostel bed is not available for allocation (Status: %)', v_bed_status;
  END IF;

  -- 3. Lock room and verify room capacity
  SELECT bed_capacity INTO v_room_capacity
  FROM public.hostel_rooms
  WHERE id = v_room_id
  FOR UPDATE;

  SELECT count(*) INTO v_occupied_count
  FROM public.hostel_beds
  WHERE room_id = v_room_id AND status = 'occupied';

  IF v_occupied_count >= v_room_capacity THEN
    RAISE EXCEPTION 'Hostel room is already at maximum capacity (% beds)', v_room_capacity;
  END IF;

  -- 4. Mark bed as occupied
  UPDATE public.hostel_beds
  SET status = 'occupied', updated_at = timezone('utc', now())
  WHERE id = p_bed_id;

  -- 5. If room is now full, update room status
  IF (v_occupied_count + 1) >= v_room_capacity THEN
    UPDATE public.hostel_rooms
    SET status = 'full', updated_at = timezone('utc', now())
    WHERE id = v_room_id;
  END IF;

  -- 6. Insert allocation record
  INSERT INTO public.hostel_allocations (
    institution_id,
    student_id,
    bed_id,
    academic_year_id,
    allocated_from,
    allocated_to,
    status,
    fee_structure_id
  ) VALUES (
    p_institution_id,
    p_student_id,
    p_bed_id,
    p_academic_year_id,
    p_allocated_from,
    p_allocated_to,
    'active',
    p_fee_structure_id
  )
  RETURNING id INTO v_new_alloc_id;

  RETURN jsonb_build_object(
    'success', true,
    'allocation_id', v_new_alloc_id,
    'bed_id', p_bed_id,
    'room_id', v_room_id
  );
END;
$$;

-- D. Vacate Hostel Bed Atomic
CREATE OR REPLACE FUNCTION public.vacate_hostel_bed_atomic(
  p_institution_id UUID,
  p_allocation_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_alloc RECORD;
  v_room_id UUID;
BEGIN
  -- 1. Lock allocation record
  SELECT * INTO v_alloc
  FROM public.hostel_allocations
  WHERE id = p_allocation_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF v_alloc IS NULL THEN
    RAISE EXCEPTION 'Hostel allocation record not found';
  END IF;

  IF v_alloc.status <> 'active' THEN
    RAISE EXCEPTION 'Hostel allocation is not active (Status: %)', v_alloc.status;
  END IF;

  -- 2. Mark allocation as vacated
  UPDATE public.hostel_allocations
  SET status = 'vacated', vacated_at = timezone('utc', now()), updated_at = timezone('utc', now())
  WHERE id = p_allocation_id;

  -- 3. Release bed back to available
  UPDATE public.hostel_beds
  SET status = 'available', updated_at = timezone('utc', now())
  WHERE id = v_alloc.bed_id
  RETURNING room_id INTO v_room_id;

  -- 4. Mark room back to available if it was full
  UPDATE public.hostel_rooms
  SET status = 'available', updated_at = timezone('utc', now())
  WHERE id = v_room_id AND status = 'full';

  RETURN jsonb_build_object(
    'success', true,
    'allocation_id', p_allocation_id,
    'bed_id', v_alloc.bed_id
  );
END;
$$;

-- E. Register Event Participant Atomic (Enforces max capacity)
CREATE OR REPLACE FUNCTION public.register_event_participant_atomic(
  p_institution_id UUID,
  p_event_id UUID,
  p_participant_category TEXT,
  p_student_id UUID DEFAULT NULL,
  p_staff_id UUID DEFAULT NULL,
  p_guest_name TEXT DEFAULT NULL,
  p_guest_email TEXT DEFAULT NULL,
  p_guest_phone TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_event RECORD;
  v_current_count INT;
  v_status event_registration_status;
  v_registration_id UUID;
  v_ticket_code TEXT;
BEGIN
  -- 1. Lock event row and check registration status
  SELECT * INTO v_event
  FROM public.institution_events
  WHERE id = p_event_id AND institution_id = p_institution_id
  FOR UPDATE;

  IF v_event IS NULL THEN
    RAISE EXCEPTION 'Event not found';
  END IF;

  IF NOT v_event.is_registration_open OR v_event.status <> 'published' THEN
    RAISE EXCEPTION 'Registration is closed for this event';
  END IF;

  IF v_event.registration_deadline IS NOT NULL AND timezone('utc', now()) > v_event.registration_deadline THEN
    RAISE EXCEPTION 'Registration deadline has passed';
  END IF;

  -- 2. Check participant count against max_participants
  SELECT count(*) INTO v_current_count
  FROM public.event_registrations
  WHERE event_id = p_event_id AND status IN ('registered', 'confirmed');

  IF v_event.max_participants > 0 AND v_current_count >= v_event.max_participants THEN
    v_status := 'waitlisted';
  ELSE
    v_status := 'registered';
  END IF;

  v_ticket_code := substring(gen_random_uuid()::text, 1, 8);

  -- 3. Insert registration
  INSERT INTO public.event_registrations (
    institution_id,
    event_id,
    participant_category,
    student_id,
    staff_id,
    guest_name,
    guest_email,
    guest_phone,
    status,
    ticket_code
  ) VALUES (
    p_institution_id,
    p_event_id,
    p_participant_category,
    p_student_id,
    p_staff_id,
    p_guest_name,
    p_guest_email,
    p_guest_phone,
    v_status,
    v_ticket_code
  )
  RETURNING id INTO v_registration_id;

  RETURN jsonb_build_object(
    'success', true,
    'registration_id', v_registration_id,
    'status', v_status,
    'ticket_code', v_ticket_code
  );
END;
$$;

-- ============================================================================
-- 6. Row-Level Security (RLS) Policies
-- ============================================================================

-- Enable RLS across all tables
ALTER TABLE public.library_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_book_copies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_circulations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_reservations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_fines ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_digital_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.library_settings ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.hostel_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_room_transfers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_outpasses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_visitors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_complaints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hostel_mess_records ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.institution_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_attendance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_certificates ENABLE ROW LEVEL SECURITY;

-- 1. Library Branches & Books: Public to institution members
CREATE POLICY library_branches_select ON public.library_branches
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY library_branches_write ON public.library_branches
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_books_select ON public.library_books
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY library_books_write ON public.library_books
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_copies_select ON public.library_book_copies
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY library_copies_write ON public.library_book_copies
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

-- 2. Library Members & Circulation: Scoped to self or staff
CREATE POLICY library_members_select ON public.library_members
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY library_members_write ON public.library_members
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_circulations_select ON public.library_circulations
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    member_id IN (
      SELECT id FROM public.library_members
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
         OR staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY library_circulations_write ON public.library_circulations
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_reservations_select ON public.library_reservations
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    member_id IN (
      SELECT id FROM public.library_members
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
         OR staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY library_reservations_write ON public.library_reservations
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_fines_select ON public.library_fines
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    member_id IN (
      SELECT id FROM public.library_members
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
         OR staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY library_fines_write ON public.library_fines
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_digital_res_select ON public.library_digital_resources
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY library_digital_res_write ON public.library_digital_resources
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY library_settings_select ON public.library_settings
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY library_settings_write ON public.library_settings
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin']));

-- 3. Hostel Buildings, Rooms & Beds: Viewable by members, editable by staff
CREATE POLICY hostel_buildings_select ON public.hostel_buildings
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY hostel_buildings_write ON public.hostel_buildings
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY hostel_rooms_select ON public.hostel_rooms
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY hostel_rooms_write ON public.hostel_rooms
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY hostel_beds_select ON public.hostel_beds
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY hostel_beds_write ON public.hostel_beds
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

-- 4. Hostel Allocations: Viewable by staff, assigned student, or guardian
CREATE POLICY hostel_allocations_select ON public.hostel_allocations
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    student_id IN (
      SELECT sg.student_id FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
    )
  );
CREATE POLICY hostel_allocations_write ON public.hostel_allocations
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY hostel_applications_select ON public.hostel_applications
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY hostel_applications_write ON public.hostel_applications
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY hostel_transfers_select ON public.hostel_room_transfers
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    allocation_id IN (
      SELECT id FROM public.hostel_allocations
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    )
  );
CREATE POLICY hostel_transfers_write ON public.hostel_room_transfers
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    allocation_id IN (
      SELECT id FROM public.hostel_allocations
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
    )
  );

-- 5. Hostel Outpasses: Guarded with guardian consent and warden signoff
CREATE POLICY hostel_outpasses_select ON public.hostel_outpasses
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    student_id IN (
      SELECT sg.student_id FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
    )
  );
CREATE POLICY hostel_outpasses_write ON public.hostel_outpasses
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    student_id IN (
      SELECT sg.student_id FROM public.student_guardians sg
      JOIN public.guardians g ON g.id = sg.guardian_id
      WHERE g.user_id = auth.uid()
    )
  );

CREATE POLICY hostel_visitors_select ON public.hostel_visitors
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY hostel_visitors_write ON public.hostel_visitors
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY hostel_complaints_select ON public.hostel_complaints
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY hostel_complaints_write ON public.hostel_complaints
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );

CREATE POLICY hostel_mess_select ON public.hostel_mess_records
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
  );
CREATE POLICY hostel_mess_write ON public.hostel_mess_records
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

-- 6. Events & Registrations
CREATE POLICY institution_events_select ON public.institution_events
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY institution_events_write ON public.institution_events
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY event_registrations_select ON public.event_registrations
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );
CREATE POLICY event_registrations_write ON public.event_registrations
  FOR ALL USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid()) OR
    staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY event_attendance_select ON public.event_attendance
  FOR SELECT USING (institution_id IN (SELECT get_user_institution_ids()));
CREATE POLICY event_attendance_write ON public.event_attendance
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));

CREATE POLICY event_certificates_select ON public.event_certificates
  FOR SELECT USING (
    has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']) OR
    registration_id IN (
      SELECT id FROM public.event_registrations
      WHERE student_id IN (SELECT id FROM public.students WHERE user_id = auth.uid())
         OR staff_id IN (SELECT id FROM public.staff_profiles WHERE user_id = auth.uid())
    )
  );
CREATE POLICY event_certificates_write ON public.event_certificates
  FOR ALL USING (has_institution_role(institution_id, ARRAY['owner', 'admin', 'staff']));
