-- ==============================================================================
-- POSTGRESQL RLS REPRODUCIBLE VERIFICATION SUITE
-- Executes directly against PostgreSQL / Supabase to verify Row Level Security
-- Usage:
--   psql -h <host> -U postgres -d postgres -f supabase/tests/rls_security_verification.sql
--   or
--   supabase test db
-- ==============================================================================

BEGIN;

-- 1. Setup Synthetic Test Environment
CREATE TEMP TABLE rls_test_results (
  test_name TEXT,
  passed BOOLEAN,
  details TEXT
);

DO $$
DECLARE
  v_user_alice UUID := '11111111-1111-1111-1111-111111111111'; -- Owner of Inst A
  v_user_bob UUID   := '22222222-2222-2222-2222-222222222222'; -- Admin of Inst A, Owner of Inst B
  v_user_charlie UUID := '33333333-3333-3333-3333-333333333333'; -- Revoked member of Inst A
  v_user_david UUID := '44444444-4444-4444-4444-444444444444'; -- Unaffiliated stranger

  v_inst_a UUID := 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_inst_b UUID := 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  v_campus_a UUID := 'caaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  v_campus_b UUID := 'cbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

  v_count INT;
  v_error_caught BOOLEAN;
BEGIN
  -- Insert Synthetic Profiles
  INSERT INTO public.profiles (id, email, full_name) VALUES
    (v_user_alice, 'alice@test.edu', 'Alice Owner'),
    (v_user_bob, 'bob@test.edu', 'Bob Admin'),
    (v_user_charlie, 'charlie@test.edu', 'Charlie Revoked'),
    (v_user_david, 'david@test.edu', 'David Stranger')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Synthetic Institutions
  INSERT INTO public.institutions (id, name, slug, code, type, status, city, state, country) VALUES
    (v_inst_a, 'Synthetic School A', 'syn-school-a', 'SYNA', 'school', 'active', 'City A', 'State A', 'Country A'),
    (v_inst_b, 'Synthetic College B', 'syn-college-b', 'SYNB', 'degree_college', 'active', 'City B', 'State B', 'Country B')
  ON CONFLICT (id) DO NOTHING;

  -- Insert Memberships
  INSERT INTO public.institution_memberships (institution_id, user_id, role, status) VALUES
    (v_inst_a, v_user_alice, 'owner', 'active'),
    (v_inst_a, v_user_bob, 'admin', 'active'),
    (v_inst_a, v_user_charlie, 'faculty', 'revoked'),
    (v_inst_b, v_user_bob, 'owner', 'active')
  ON CONFLICT (institution_id, user_id) DO UPDATE SET role = EXCLUDED.role, status = EXCLUDED.status;

  -- Insert Campuses
  INSERT INTO public.campuses (id, institution_id, name, code, is_primary, city, state, country) VALUES
    (v_campus_a, v_inst_a, 'Campus A Main', 'CAMPA', true, 'City A', 'State A', 'Country A'),
    (v_campus_b, v_inst_b, 'Campus B Main', 'CAMPB', true, 'City B', 'State B', 'Country B')
  ON CONFLICT (id) DO NOTHING;

  -- ============================================================================
  -- TEST 1: Cross-Tenant Isolation (Alice belongs to Inst A, tries to select Inst B)
  -- ============================================================================
  -- Emulate Alice's session
  PERFORM set_config('role', 'authenticated', true);
  PERFORM set_config('request.jwt.claim.sub', v_user_alice::text, true);

  SELECT count(*) INTO v_count FROM public.campuses WHERE institution_id = v_inst_b;
  IF v_count = 0 THEN
    INSERT INTO rls_test_results VALUES ('1. Cross-Tenant SELECT Isolation', true, 'Alice cannot see Inst B campuses');
  ELSE
    INSERT INTO rls_test_results VALUES ('1. Cross-Tenant SELECT Isolation', false, 'LEAK: Alice saw ' || v_count || ' Inst B records');
  END IF;

  -- ============================================================================
  -- TEST 2: Cross-Tenant Mutation (Alice tries to insert into Inst B)
  -- ============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.campuses (institution_id, name, code, is_primary, city, state, country)
    VALUES (v_inst_b, 'Rogue Campus', 'ROGUE', false, 'City B', 'State B', 'Country B');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('2. Cross-Tenant INSERT Prevention', true, 'Alice was denied inserting into Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('2. Cross-Tenant INSERT Prevention', false, 'SECURITY FAILURE: Alice inserted into Inst B');
  END IF;

  -- ============================================================================
  -- TEST 3: Privilege Escalation (Bob is Admin in Inst A, tries to elevate to Owner)
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_bob::text, true);

  v_error_caught := false;
  BEGIN
    -- Bob tries to promote Charlie to Owner in Inst A
    UPDATE public.institution_memberships
    SET role = 'owner'
    WHERE institution_id = v_inst_a AND user_id = v_user_charlie;
    -- If RLS denies update, row is filtered out (0 rows updated)
    GET DIAGNOSTICS v_count = ROW_COUNT;
    IF v_count = 0 THEN
      v_error_caught := true;
    END IF;
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('3. Privilege Escalation Prevention', true, 'Admin cannot promote another member to Owner');
  ELSE
    INSERT INTO rls_test_results VALUES ('3. Privilege Escalation Prevention', false, 'SECURITY FAILURE: Admin elevated member to Owner');
  END IF;

  -- ============================================================================
  -- TEST 4: Revoked Membership Exclusion (Charlie has revoked status in Inst A)
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_charlie::text, true);

  SELECT count(*) INTO v_count FROM public.campuses WHERE institution_id = v_inst_a;
  IF v_count = 0 THEN
    INSERT INTO rls_test_results VALUES ('4. Revoked Membership Exclusion', true, 'Revoked user Charlie has 0 access to Inst A');
  ELSE
    INSERT INTO rls_test_results VALUES ('4. Revoked Membership Exclusion', false, 'LEAK: Revoked member accessed ' || v_count || ' records');
  END IF;

  -- ============================================================================
  -- TEST 5: Direct Raw Client INSERT on Institutions (Blocked)
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_david::text, true);

  v_error_caught := false;
  BEGIN
    INSERT INTO public.institutions (name, slug, code, type, city, state, country)
    VALUES ('Rogue School', 'rogue-school', 'ROGUE', 'school', 'City', 'State', 'Country');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('5. Raw Client Institution INSERT Blocked', true, 'Direct raw insert is forbidden by RLS');
  ELSE
    INSERT INTO rls_test_results VALUES ('5. Raw Client Institution INSERT Blocked', false, 'SECURITY FAILURE: Raw institution inserted');
  END IF;

  -- ============================================================================
  -- TEST 6: Audit Log Direct Client INSERT (Blocked)
  -- ============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.audit_logs (institution_id, actor_user_id, action, entity_type)
    VALUES (v_inst_a, v_user_david, 'forged.action', 'institution');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('6. Audit Log Forgery Prevention', true, 'Direct client audit log insert is blocked');
  ELSE
    INSERT INTO rls_test_results VALUES ('6. Audit Log Forgery Prevention', false, 'SECURITY FAILURE: Direct client inserted audit log');
  END IF;

  -- ============================================================================
  -- TEST 7: Academic Departments Cross-Tenant SELECT Isolation
  -- ============================================================================
  -- Insert test departments
  INSERT INTO public.academic_departments (id, institution_id, name, code)
  VALUES ('da000000-0000-0000-0000-000000000001', v_inst_a, 'Dept A', 'D-A'),
         ('db000000-0000-0000-0000-000000000002', v_inst_b, 'Dept B', 'D-B')
  ON CONFLICT DO NOTHING;

  PERFORM set_config('request.jwt.claim.sub', v_user_alice::text, true);

  SELECT count(*) INTO v_count FROM public.academic_departments WHERE institution_id = v_inst_b;
  IF v_count = 0 THEN
    INSERT INTO rls_test_results VALUES ('7. Academic Department Cross-Tenant Read Block', true, 'Inst A user sees 0 departments from Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('7. Academic Department Cross-Tenant Read Block', false, 'LEAK: Alice saw ' || v_count || ' departments from Inst B');
  END IF;

  -- ============================================================================
  -- TEST 8: Academic Cross-Tenant INSERT Prevention
  -- ============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.academic_departments (institution_id, name, code)
    VALUES (v_inst_b, 'Malicious Dept', 'MALICIOUS');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('8. Academic Department Cross-Tenant Write Block', true, 'Inst A user blocked from inserting into Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('8. Academic Department Cross-Tenant Write Block', false, 'SECURITY FAILURE: Alice inserted department into Inst B');
  END IF;

  -- ============================================================================
  -- TEST 9: Unauthorized User Academic Modification Blocked
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_david::text, true);

  v_error_caught := false;
  BEGIN
    INSERT INTO public.academic_departments (institution_id, name, code)
    VALUES (v_inst_a, 'David Rogue Dept', 'ROGUE-D');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('9. Stranger Academic Creation Blocked', true, 'Unaffiliated user blocked from academic modification');
  ELSE
    INSERT INTO rls_test_results VALUES ('9. Stranger Academic Creation Blocked', false, 'SECURITY FAILURE: Stranger created academic department');
  END IF;

  -- ============================================================================
  -- TEST 10: Authorized Academic Admin Insert
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_bob::text, true);

  v_error_caught := false;
  BEGIN
    INSERT INTO public.academic_departments (institution_id, name, code)
    VALUES (v_inst_b, 'Engineering Faculty', 'ENGR-FAC');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('10. Authorized Academic Creation', true, 'Owner/Admin Bob successfully created department in Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('10. Authorized Academic Creation', false, 'FAILURE: Authorized Bob could not create department in Inst B');
  END IF;

  -- ============================================================================
  -- TEST 11: Student Creation & Cross-Tenant Isolation
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_alice::text, true);

  -- Alice creates a student in Inst A
  v_error_caught := false;
  BEGIN
    INSERT INTO public.students (institution_id, admission_number, first_name, last_name, date_of_birth, gender, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
    VALUES (v_inst_a, 'ADM-TEST-001', 'Test', 'Student', '2012-01-01', 'male', 'Parent Test', '9999999999', 'Father');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('11. Authorized Student Creation', true, 'Alice successfully inserted student into Inst A');
  ELSE
    INSERT INTO rls_test_results VALUES ('11. Authorized Student Creation', false, 'FAILURE: Alice could not create student in Inst A');
  END IF;

  -- Alice tries to insert student into Inst B
  v_error_caught := false;
  BEGIN
    INSERT INTO public.students (institution_id, admission_number, first_name, last_name, date_of_birth, gender, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship)
    VALUES (v_inst_b, 'ADM-TEST-X', 'Rogue', 'Student', '2012-01-01', 'female', 'Parent X', '9999999999', 'Mother');
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('12. Cross-Tenant Student Write Block', true, 'Alice blocked from creating student in Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('12. Cross-Tenant Student Write Block', false, 'SECURITY FAILURE: Alice inserted student into Inst B');
  END IF;

  -- ============================================================================
  -- TEST 13: Stranger Student Access Blocked
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_david::text, true);

  SELECT COUNT(*) INTO v_count FROM public.students;
  IF v_count = 0 THEN
    INSERT INTO rls_test_results VALUES ('13. Stranger Student Read Block', true, 'David sees 0 students due to RLS');
  ELSE
    INSERT INTO rls_test_results VALUES ('13. Stranger Student Read Block', false, 'SECURITY FAILURE: David can read students across institutions');
  END IF;

  -- ============================================================================
  -- TEST 14: Admissions Officer / Admin Application Creation
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_bob::text, true);

  v_error_caught := false;
  BEGIN
    INSERT INTO public.admission_applications (
      institution_id, application_number, academic_year_id, program_id,
      first_name, last_name, date_of_birth, gender, phone,
      primary_guardian_name, primary_guardian_relationship, primary_guardian_phone,
      status
    ) VALUES (
      v_inst_b, 'APP-TEST-999', '22222222-2222-2222-2222-222222222222', '33333333-3333-3333-3333-333333333333',
      'Admit', 'Candidate', '2011-03-10', 'female', '9888888888',
      'Guardian One', 'Mother', '9888888888',
      'submitted'
    );
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('14. Authorized Admission Submission', true, 'Authorized user created admission application in Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('14. Authorized Admission Submission', false, 'FAILURE: Authorized user could not submit admission');
  END IF;

  -- ============================================================================
  -- TEST 15: Staff Profile Creation in Inst A (Owner/Admin)
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_alice::text, true);

  v_error_caught := false;
  BEGIN
    INSERT INTO public.staff_profiles (
      institution_id, employee_id, first_name, last_name, date_of_birth,
      gender, email, phone, joining_date, designation, staff_category,
      employment_type, employment_status
    ) VALUES (
      v_inst_a, 'EMP-TEST-001', 'Prof', 'Sharma', '1980-05-15',
      'male', 'prof.sharma@test.edu', '9123456789', '2026-01-01', 'Professor of Physics',
      'teaching', 'full_time', 'active'
    );
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF NOT v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('15. Authorized Staff Profile Creation', true, 'Alice successfully created staff profile in Inst A');
  ELSE
    INSERT INTO rls_test_results VALUES ('15. Authorized Staff Profile Creation', false, 'FAILURE: Alice could not create staff profile in Inst A');
  END IF;

  -- ============================================================================
  -- TEST 16: Cross-Tenant Staff Profile Write Block (Alice -> Inst B)
  -- ============================================================================
  v_error_caught := false;
  BEGIN
    INSERT INTO public.staff_profiles (
      institution_id, employee_id, first_name, last_name, date_of_birth,
      gender, email, phone, joining_date, designation, staff_category,
      employment_type, employment_status
    ) VALUES (
      v_inst_b, 'EMP-TEST-ROGUE', 'Rogue', 'Staff', '1985-01-01',
      'female', 'rogue@test.edu', '9123456788', '2026-01-01', 'Lecturer',
      'teaching', 'full_time', 'active'
    );
  EXCEPTION
    WHEN insufficient_privilege OR check_violation THEN
      v_error_caught := true;
  END;

  IF v_error_caught THEN
    INSERT INTO rls_test_results VALUES ('16. Cross-Tenant Staff Write Block', true, 'Alice blocked from creating staff profile in Inst B');
  ELSE
    INSERT INTO rls_test_results VALUES ('16. Cross-Tenant Staff Write Block', false, 'SECURITY FAILURE: Alice inserted staff profile into Inst B');
  END IF;

  -- ============================================================================
  -- TEST 17: Stranger Staff Read Block (David sees 0 staff records)
  -- ============================================================================
  PERFORM set_config('request.jwt.claim.sub', v_user_david::text, true);

  SELECT COUNT(*) INTO v_count FROM public.staff_profiles;
  IF v_count = 0 THEN
    INSERT INTO rls_test_results VALUES ('17. Stranger Staff Read Block', true, 'David sees 0 staff profiles due to RLS');
  ELSE
    INSERT INTO rls_test_results VALUES ('17. Stranger Staff Read Block', false, 'SECURITY FAILURE: David can read staff profiles across institutions');
  END IF;

END $$;

-- Print test report
SELECT test_name, passed, details FROM rls_test_results;

ROLLBACK;
