-- ==============================================================================
-- AUVRYN Staging & Local Pilot Demonstration Seed Script
-- Platform: AUVRYN — The Intelligent Education Ecosystem
--
-- TARGET: Local PostgreSQL / Isolated Staging Test Database ONLY
-- SAFETY: This script must NEVER be executed against production.
--
-- CRITICAL ARCHITECTURAL SECURITY NOTICE:
-- In-database session variables (such as app.environment or app.allow_pilot_seed)
-- are client-controlled and can be manipulated by any SQL Editor user with 'SET ...'.
-- Therefore, custom PostgreSQL session settings DO NOT constitute authoritative project identity.
--
-- DIRECT AD-HOC EXECUTION OF THIS SCRIPT VIA SUPABASE DASHBOARD SQL EDITOR IS BLOCKED.
--
-- Execution is permitted ONLY through the validated environment wrapper:
--   Node.js:    node scripts/seed-staging.cjs --target <local|staging> --project-ref <staging-ref>
--   PowerShell: .\scripts\seed-staging.ps1 -Target <local|staging> -ProjectRef <staging-ref>
--
-- The wrapper authoritatively validates the Supabase project reference BEFORE connecting,
-- strictly and unconditionally rejects the production project 'dhgdjpjgsvbknquetecl',
-- and injects the verified project reference and ephemeral runner token into the session.
-- ==============================================================================

DO $$
DECLARE
  v_env TEXT;
  v_allow_seed TEXT;
  v_target_project TEXT;
  v_runner_nonce TEXT;
  v_runner_sig TEXT;
  v_non_demo_users INT;
  v_non_demo_insts INT;
  v_jwt_claim TEXT;
BEGIN
  -- 1. Check for Authoritative Seed Runner Validation
  -- Direct SQL Editor execution without the verified wrapper is strictly prohibited.
  v_target_project := NULLIF(TRIM(current_setting('app.seed_target_project_ref', true)), '');
  v_runner_nonce := NULLIF(TRIM(current_setting('app.seed_runner_nonce', true)), '');
  v_runner_sig := NULLIF(TRIM(current_setting('app.seed_runner_signature', true)), '');

  IF v_target_project IS NULL OR v_runner_nonce IS NULL OR v_runner_sig IS NULL THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Direct SQL Editor execution is disabled. Staging seed execution is permitted ONLY through the certified wrapper (scripts/seed-staging.cjs or scripts/seed-staging.ps1), which independently validates project identity. Session settings (app.environment) alone are not authoritative.'
      USING ERRCODE = '55000';
  END IF;

  -- 2. Explicitly Reject Production Project Reference
  IF v_target_project = 'dhgdjpjgsvbknquetecl' OR v_target_project LIKE 'dhgdjpjg%' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Target project ref ''%'' is the PRODUCTION database. Staging seed execution against production is strictly prohibited.', v_target_project
      USING ERRCODE = '55000';
  END IF;

  -- 3. Check for missing or ambiguous environment identity
  v_env := NULLIF(TRIM(current_setting('app.environment', true)), '');
  v_allow_seed := NULLIF(TRIM(current_setting('app.allow_pilot_seed', true)), '');

  IF v_env IS NULL THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Missing environment identity. To execute this staging seed in an authorized non-production environment, execute via the validated runner wrapper.'
      USING ERRCODE = '55000';
  END IF;

  -- 4. Explicitly reject production and unknown environments
  IF v_env NOT IN ('staging', 'local_development', 'test', 'local_test') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Ambiguous or unauthorized environment ''%''. This seed script can only run in ''staging'' or ''local_development''. Execution refused.', v_env
      USING ERRCODE = '55000';
  END IF;

  IF v_env IN ('production', 'prod', 'live') THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Staging seed script is strictly forbidden in production environments.'
      USING ERRCODE = '55000';
  END IF;

  -- 5. Require explicit secondary confirmation flag
  IF v_allow_seed IS NULL OR v_allow_seed != 'true' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Explicit seed permission missing. Staging seed must be invoked via the validated runner wrapper.'
      USING ERRCODE = '55000';
  END IF;

  -- 6. Multi-Factor Production Database Detection:
  -- A. Detect PostgREST active JWT claim
  v_jwt_claim := current_setting('request.jwt.claim.sub', true);
  IF v_jwt_claim IS NOT NULL THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: PostgREST JWT claim detected. Cannot seed through client PostgREST connection.'
      USING ERRCODE = '55000';
  END IF;

  -- B. Detect Supabase production project references in GUCs or settings
  IF current_setting('app.settings.project_id', true) LIKE '%dhgdjpjg%' 
     OR current_setting('app.supabase_url', true) LIKE '%dhgdjpjg%' 
     OR current_setting('request.header.host', true) LIKE '%dhgdjpjg%' THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Supabase production project reference detected. Execution refused.'
      USING ERRCODE = '55000';
  END IF;

  -- C. Detect existing non-demo user accounts in auth.users
  SELECT count(*) INTO v_non_demo_users
  FROM auth.users
  WHERE email NOT LIKE '%@auvryn-academy.demo';

  IF v_non_demo_users > 0 THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Target database contains % non-demo user account(s). Refusing execution to prevent corrupting real data.', v_non_demo_users
      USING ERRCODE = '55000';
  END IF;

  -- D. Detect existing non-demo institutions in public.institutions
  SELECT count(*) INTO v_non_demo_insts
  FROM public.institutions
  WHERE code != 'AUVRYN-DEMO' AND slug != 'auvryn-academy-demo';

  IF v_non_demo_insts > 0 THEN
    RAISE EXCEPTION 'CRITICAL SAFETY BLOCK: Target database contains % non-demo institution(s). Refusing execution.', v_non_demo_insts
      USING ERRCODE = '55000';
  END IF;
END $$;

BEGIN;

-- 1. Create Synthetic Demo Institution
INSERT INTO public.institutions (
  id,
  name,
  code,
  slug,
  institution_type,
  status,
  subscription_tier,
  subscription_status,
  is_verified,
  onboarding_step
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'Auvryn Academy of Science & Arts (Demo)',
  'AUVRYN-DEMO',
  'auvryn-academy-demo',
  'k12_school',
  'active',
  'pilot',
  'active',
  true,
  5
) ON CONFLICT (id) DO NOTHING;

-- 2. Create Campus
INSERT INTO public.campuses (
  id,
  institution_id,
  name,
  code,
  address,
  city,
  state,
  postal_code,
  country,
  is_main
) VALUES (
  'c0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Main City Campus',
  'MCC-01',
  '100 Education Boulevard',
  'Metropolis',
  'State',
  '110001',
  'India',
  true
) ON CONFLICT (id) DO NOTHING;

-- 3. Academic Year & Terms
INSERT INTO public.academic_years (
  id,
  institution_id,
  name,
  code,
  start_date,
  end_date,
  is_active
) VALUES (
  'y0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  '2026–2027 Academic Year',
  'AY-2026-27',
  '2026-06-01',
  '2027-04-30',
  true
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_terms (
  id,
  institution_id,
  academic_year_id,
  name,
  term_type,
  start_date,
  end_date,
  is_active
) VALUES 
  ('t0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'y0000000-0000-0000-0000-000000000001', 'Term 1', 'semester', '2026-06-01', '2026-10-31', true),
  ('t0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'y0000000-0000-0000-0000-000000000001', 'Term 2', 'semester', '2026-11-01', '2027-04-30', false)
ON CONFLICT (id) DO NOTHING;

-- 4. Academic Department & Programs
INSERT INTO public.academic_departments (
  id,
  institution_id,
  name,
  code
) VALUES (
  'd0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Science & Mathematics',
  'DEPT-SCI'
) ON CONFLICT (id) DO NOTHING;

-- 5. Classes & Sections
INSERT INTO public.academic_classes (
  id,
  institution_id,
  academic_year_id,
  name,
  numeric_grade,
  display_order
) VALUES (
  'b0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'y0000000-0000-0000-0000-000000000001',
  'Grade 10',
  10,
  1
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_sections (
  id,
  institution_id,
  class_id,
  name,
  max_capacity
) VALUES (
  's0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'b0000000-0000-0000-0000-000000000001',
  '10-A',
  35
) ON CONFLICT (id) DO NOTHING;

-- 6. Subjects
INSERT INTO public.academic_subjects (
  id,
  institution_id,
  name,
  code,
  subject_type
) VALUES 
  ('j0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'Physics', 'PHY-10', 'core'),
  ('j0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 'Mathematics', 'MTH-10', 'core'),
  ('j0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 'English Literature', 'ENG-10', 'core')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.academic_class_subjects (
  institution_id,
  class_id,
  subject_id,
  is_elective
) VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000001', false),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000002', false),
  ('a0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', 'j0000000-0000-0000-0000-000000000003', false)
ON CONFLICT (class_id, subject_id) DO NOTHING;

-- 7. Synthetic Auth Users & Profiles (Password: PilotDemo2026!)
INSERT INTO auth.users (
  id,
  instance_id,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  role
) VALUES 
  ('u0000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000000', 'owner@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Vikram","last_name":"Rathore"}', now(), now(), 'authenticated'),
  ('u0000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000000', 'admin@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Anita","last_name":"Desai"}', now(), now(), 'authenticated'),
  ('u0000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000000', 'teacher.sharma@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Rajesh","last_name":"Sharma"}', now(), now(), 'authenticated'),
  ('u0000000-0000-0000-0000-000000000004', '00000000-0000-0000-0000-000000000000', 'student.aarav@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Aarav","last_name":"Mehta"}', now(), now(), 'authenticated'),
  ('u0000000-0000-0000-0000-000000000005', '00000000-0000-0000-0000-000000000000', 'parent.rajesh@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Rajesh","last_name":"Mehta"}', now(), now(), 'authenticated'),
  ('u0000000-0000-0000-0000-000000000006', '00000000-0000-0000-0000-000000000000', 'accounts@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sunita","last_name":"Patel"}', now(), now(), 'authenticated'),
  ('u0000000-0000-0000-0000-000000000007', '00000000-0000-0000-0000-000000000000', 'driver.singh@auvryn-academy.demo', crypt('PilotDemo2026!', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Gurdeep","last_name":"Singh"}', now(), now(), 'authenticated')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.profiles (
  id,
  first_name,
  last_name,
  email
) VALUES 
  ('u0000000-0000-0000-0000-000000000001', 'Vikram', 'Rathore', 'owner@auvryn-academy.demo'),
  ('u0000000-0000-0000-0000-000000000002', 'Anita', 'Desai', 'admin@auvryn-academy.demo'),
  ('u0000000-0000-0000-0000-000000000003', 'Rajesh', 'Sharma', 'teacher.sharma@auvryn-academy.demo'),
  ('u0000000-0000-0000-0000-000000000004', 'Aarav', 'Mehta', 'student.aarav@auvryn-academy.demo'),
  ('u0000000-0000-0000-0000-000000000005', 'Rajesh', 'Mehta', 'parent.rajesh@auvryn-academy.demo'),
  ('u0000000-0000-0000-0000-000000000006', 'Sunita', 'Patel', 'accounts@auvryn-academy.demo'),
  ('u0000000-0000-0000-0000-000000000007', 'Gurdeep', 'Singh', 'driver.singh@auvryn-academy.demo')
ON CONFLICT (id) DO NOTHING;

-- 8. Institution Memberships
INSERT INTO public.institution_memberships (
  institution_id,
  user_id,
  role,
  status
) VALUES 
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000001', 'owner', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000002', 'admin', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'faculty', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000004', 'student', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000005', 'guardian', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000006', 'accountant', 'active'),
  ('a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000007', 'staff', 'active')
ON CONFLICT (institution_id, user_id) DO NOTHING;

-- 9. Staff Profiles & Faculty Allocations
INSERT INTO public.staff_profiles (
  id,
  institution_id,
  user_id,
  employee_id,
  designation,
  employment_type,
  joining_date
) VALUES 
  ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000003', 'FAC-0101', 'Senior Physics Lecturer', 'full_time', '2022-06-01'),
  ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000006', 'ACC-0201', 'Senior Bursar & Accountant', 'full_time', '2021-04-01'),
  ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'u0000000-0000-0000-0000-000000000007', 'DRV-0301', 'Senior Transport Driver', 'contract', '2023-01-15')
ON CONFLICT (id) DO NOTHING;

-- 10. Student & Guardian Records with Bi-directional Linking
INSERT INTO public.guardians (
  id,
  institution_id,
  user_id,
  first_name,
  last_name,
  email,
  phone
) VALUES (
  'g0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'u0000000-0000-0000-0000-000000000005',
  'Rajesh',
  'Mehta',
  'parent.rajesh@auvryn-academy.demo',
  '+919876543210'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.students (
  id,
  institution_id,
  user_id,
  first_name,
  last_name,
  admission_number,
  admission_date,
  date_of_birth,
  gender,
  status
) VALUES (
  'm0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'u0000000-0000-0000-0000-000000000004',
  'Aarav',
  'Mehta',
  'ADM-2026-001',
  '2026-06-01',
  '2010-08-15',
  'male',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_guardians (
  institution_id,
  student_id,
  guardian_id,
  relationship,
  is_primary
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000001',
  'g0000000-0000-0000-0000-000000000001',
  'father',
  true
) ON CONFLICT (student_id, guardian_id) DO NOTHING;

-- 11. Transport Setup & Assignment
INSERT INTO public.vehicles (
  id,
  institution_id,
  vehicle_number,
  capacity,
  make_model,
  status
) VALUES (
  'v0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'BUS-12',
  40,
  'Tata Starbus 40-Seater',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.transport_drivers (
  id,
  institution_id,
  staff_profile_id,
  license_number,
  license_expiry,
  status
) VALUES (
  'r0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'e0000000-0000-0000-0000-000000000003',
  'DL-2022-IND-998877',
  '2028-12-31',
  'active'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.routes (
  id,
  institution_id,
  name,
  code,
  assigned_vehicle_id,
  assigned_driver_id
) VALUES (
  'x0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Route 3: North Loop',
  'RT-03-N',
  'v0000000-0000-0000-0000-000000000001',
  'r0000000-0000-0000-0000-000000000001'
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_transport_assignments (
  institution_id,
  student_id,
  route_id,
  assigned_stop_name,
  is_active
) VALUES (
  'a0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000001',
  'x0000000-0000-0000-0000-000000000001',
  'North Gate / Central Gardens Stop',
  true
) ON CONFLICT (student_id, route_id) DO NOTHING;

-- 12. Fee Heads, Structures & Assignment
INSERT INTO public.fee_heads (
  id,
  institution_id,
  name,
  code,
  is_refundable
) VALUES (
  'h0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'Tuition Fee - Grade 10',
  'TUI-10',
  false
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.fee_structures (
  id,
  institution_id,
  academic_year_id,
  name,
  code,
  total_amount
) VALUES (
  'f0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'y0000000-0000-0000-0000-000000000001',
  'Grade 10 Annual Tuition Structure',
  'FEE-G10-ANNUAL',
  25000.00
) ON CONFLICT (id) DO NOTHING;

INSERT INTO public.student_fee_assignments (
  id,
  institution_id,
  student_id,
  fee_structure_id,
  academic_year_id,
  gross_amount,
  net_payable_amount,
  paid_amount,
  outstanding_balance,
  status
) VALUES (
  'p0000000-0000-0000-0000-000000000001',
  'a0000000-0000-0000-0000-000000000001',
  'm0000000-0000-0000-0000-000000000001',
  'f0000000-0000-0000-0000-000000000001',
  'y0000000-0000-0000-0000-000000000001',
  25000.00,
  25000.00,
  0.00,
  25000.00,
  'pending'
) ON CONFLICT (id) DO NOTHING;

COMMIT;
