import { execFileSync } from 'child_process';
import * as path from 'path';

const PSQL = 'C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe';
const PORT = '54333';
const DB_NAME = 'edu_integration_test';

export interface SqlResult<T = any> {
  rows: T[];
  rowCount: number;
  error?: string;
  sqlState?: string;
}

/**
 * Executes raw SQL against the integration PostgreSQL test database.
 */
export function executeRawSql(sql: string, db = DB_NAME): string {
  try {
    return execFileSync(
      PSQL,
      ['-h', '127.0.0.1', '-p', PORT, '-U', 'postgres', '-d', db, '-t', '-A', '-c', sql],
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }
    );
  } catch (err: any) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`[psql error]: ${stderr}`);
  }
}

/**
 * Runs a query and returns JSON rows.
 */
export function queryJson<T = any>(sql: string, db = DB_NAME): T[] {
  const wrapped = `
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (${sql.replace(/;+\s*$/, '')}) t;
  `;
  const res = executeRawSql(wrapped, db).trim();
  if (!res) return [];
  try {
    return JSON.parse(res);
  } catch (err: any) {
    throw new Error(`Failed to parse SQL JSON response: "${res}". Error: ${err.message}`);
  }
}

/**
 * Executes a query under a simulated Supabase user authentication context.
 * Sets the PostgreSQL role to `authenticated` and populates `request.jwt.claim.sub` and `role`.
 * This activates full Row-Level Security (RLS) policies and `auth.uid()` evaluation.
 */
export function queryAsUser<T = any>(options: {
  userId: string;
  role?: string;
  sql: string;
  db?: string;
}): SqlResult<T> {
  const { userId, role = 'authenticated', sql, db = DB_NAME } = options;

  // Single transaction block setting auth claims and executing statement under RLS
  const wrapped = `
    BEGIN;
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claim.sub" = '${userId}';
    SET LOCAL "request.jwt.claim.role" = '${role}';
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (${sql.replace(/;+\s*$/, '')}) t;
    COMMIT;
  `;

  try {
    const raw = executeRawSql(wrapped, db).trim();
    const startIndex = raw.indexOf('[');
    const endIndex = raw.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      const jsonStr = raw.substring(startIndex, endIndex + 1);
      const rows = JSON.parse(jsonStr);
      return { rows, rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  } catch (err: any) {
    const msg = err.message || '';
    const stateMatch = msg.match(/SQLSTATE\s+([A-Z0-9]{5})/i) || msg.match(/([0-9]{5})/);
    return {
      rows: [],
      rowCount: 0,
      error: msg,
      sqlState: stateMatch ? stateMatch[1] : undefined,
    };
  }
}

/**
 * Executes a mutation (INSERT/UPDATE/DELETE) under a simulated user auth context.
 * Returns success, rows affected, or RLS error.
 */
export function mutateAsUser(options: {
  userId: string;
  role?: string;
  sql: string;
  db?: string;
}): { success: boolean; error?: string; sqlState?: string; output?: string } {
  const { userId, role = 'authenticated', sql, db = DB_NAME } = options;

  const wrapped = `
    BEGIN;
    SET LOCAL ROLE authenticated;
    SET LOCAL "request.jwt.claim.sub" = '${userId}';
    SET LOCAL "request.jwt.claim.role" = '${role}';
    ${sql.replace(/;+\s*$/, '')};
    COMMIT;
  `;

  try {
    const output = executeRawSql(wrapped, db);
    return { success: true, output };
  } catch (err: any) {
    const msg = err.message || '';
    const stateMatch = msg.match(/SQLSTATE\s+([A-Z0-9]{5})/i) || msg.match(/([0-9]{5})/);
    return {
      success: false,
      error: msg,
      output: msg,
      sqlState: stateMatch ? stateMatch[1] : undefined,
    };
  }
}

/**
 * Executes a query under the anonymous `anon` role.
 */
export function queryAsAnon<T = any>(sql: string, db = DB_NAME): SqlResult<T> {
  const wrapped = `
    BEGIN;
    SET LOCAL ROLE anon;
    SET LOCAL "request.jwt.claim.sub" = '';
    SET LOCAL "request.jwt.claim.role" = 'anon';
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (${sql.replace(/;+\s*$/, '')}) t;
    COMMIT;
  `;

  try {
    const raw = executeRawSql(wrapped, db).trim();
    const jsonLine = raw
      .split('\n')
      .map((l) => l.trim())
      .find((l) => l.startsWith('[') && l.endsWith(']'));

    const rows = jsonLine ? JSON.parse(jsonLine) : [];
    return { rows, rowCount: rows.length };
  } catch (err: any) {
    const msg = err.message || '';
    const stateMatch = msg.match(/SQLSTATE\s+([A-Z0-9]{5})/i) || msg.match(/([0-9]{5})/);
    return {
      rows: [],
      rowCount: 0,
      error: msg,
      sqlState: stateMatch ? stateMatch[1] : undefined,
    };
  }
}

/**
 * Executes a statement under `service_role`.
 */
export function executeAsServiceRole(sql: string, db = DB_NAME): { success: boolean; error?: string; output?: string } {
  const wrapped = `
    BEGIN;
    SET LOCAL ROLE service_role;
    SET LOCAL "request.jwt.claim.role" = 'service_role';
    ${sql.replace(/;+\s*$/, '')};
    COMMIT;
  `;

  try {
    const output = executeRawSql(wrapped, db);
    return { success: true, output };
  } catch (err: any) {
    const msg = err.message || '';
    return { success: false, error: msg, output: msg };
  }
}

/**
 * Executes a query under `service_role` and returns parsed JSON rows.
 */
export function queryAsServiceRole<T = any>(sql: string, db = DB_NAME): SqlResult<T> {
  const wrapped = `
    BEGIN;
    SET LOCAL ROLE service_role;
    SET LOCAL "request.jwt.claim.role" = 'service_role';
    SELECT COALESCE(json_agg(t), '[]'::json)
    FROM (${sql.replace(/;+\s*$/, '')}) t;
    COMMIT;
  `;

  try {
    const raw = executeRawSql(wrapped, db).trim();
    const startIndex = raw.indexOf('[');
    const endIndex = raw.lastIndexOf(']');
    if (startIndex !== -1 && endIndex !== -1 && endIndex >= startIndex) {
      const jsonStr = raw.substring(startIndex, endIndex + 1);
      const rows = JSON.parse(jsonStr);
      return { rows, rowCount: rows.length };
    }
    return { rows: [], rowCount: 0 };
  } catch (err: any) {
    const msg = err.message || '';
    const stateMatch = msg.match(/SQLSTATE\s+([A-Z0-9]{5})/i) || msg.match(/([0-9]{5})/);
    return {
      rows: [],
      rowCount: 0,
      error: msg,
      sqlState: stateMatch ? stateMatch[1] : undefined,
    };
  }
}

// Fixed UUID Fixtures for Repeatable Integration Tests
export const FIXTURES = {
  instAlpha: '11111111-1111-1111-1111-111111111111',
  instBeta: '22222222-2222-2222-2222-222222222222',

  userAliceOwner: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  userBobTeacher: 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  userCharlieStudent: 'cccccccc-cccc-cccc-cccc-cccccccccccc',
  userCharlie2Student: '12121212-1212-1212-1212-121212121212',
  userDavidOwnerBeta: 'dddddddd-dddd-dddd-dddd-dddddddddddd',
  userEveSuspended: 'eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee',
  userFrankMultiInst: 'ffffffff-ffff-ffff-ffff-ffffffffffff',
  userGraceGuardian: '07070707-0707-0707-0707-070707070707',
  userHenryDriver: '08080808-0808-0808-0808-080808080808',
  userIanAttendant: '09090909-0909-0909-0909-090909090909',

  studentCharlieId: '10000000-0000-0000-0000-000000000001',
  studentCharlie2Id: '10000000-0000-0000-0000-000000000002',
  studentBetaId: '20000000-0000-0000-0000-000000000001',

  staffBobId: '30000000-0000-0000-0000-000000000001',
  staffHenryDriverId: '30000000-0000-0000-0000-000000000002',
  staffIanAttendantId: '30000000-0000-0000-0000-000000000003',
  staffBetaDriverId: '30000000-0000-0000-0000-000000000004',

  vehicleAlphaBus1: '40000000-0000-0000-0000-000000000001',
  vehicleAlphaBus2: '40000000-0000-0000-0000-000000000002',
  vehicleBetaBus1: '40000000-0000-0000-0000-000000000003',

  routeAlpha1: '50000000-0000-0000-0000-000000000001',
  routeBeta1: '50000000-0000-0000-0000-000000000002',
  journeyAlphaMorning: '60000000-0000-0000-0000-000000000001',
  journeyAlphaCompleted: '60000000-0000-0000-0000-000000000002',
  journeyBetaMorning: '60000000-0000-0000-0000-000000000003',

  attendanceSessionAlpha: '70000000-0000-0000-0000-000000000001',
  academicYearAlpha: '80000000-0000-0000-0000-000000000001',
  academicYearBeta: '80000000-0000-0000-0000-000000000002',
  academicProgramAlpha: '82000000-0000-0000-0000-000000000001',
  academicClassAlpha: '83000000-0000-0000-0000-000000000001',
  enrollmentCharlieId: '84000000-0000-0000-0000-000000000001',
  feeStructureAlpha: '90000000-0000-0000-0000-000000000001',
  feeHeadTuitionAlpha: '91000000-0000-0000-0000-000000000001',
  feeAssignmentCharlie: '92000000-0000-0000-0000-000000000001',
};

/**
 * Truncates and resets all test fixtures cleanly between integration scenarios.
 */
export function resetTestFixtures(): void {
  executeRawSql(`
    -- Truncate existing application tables
    TRUNCATE TABLE
      public.fee_refund_requests,
      public.fee_payments,
      public.student_fee_installments,
      public.student_fee_assignment_items,
      public.student_fee_assignments,
      public.fee_structure_items,
      public.fee_structures,
      public.fee_heads,
      public.vehicle_location_history,
      public.vehicle_live_locations,
      public.transport_journeys,
      public.transport_routes,
      public.transport_vehicles,
      public.notification_delivery_logs,
      public.notification_deliveries,
      public.notifications,
      public.push_device_tokens,
      storage.objects,
      public.student_attendance_records,
      public.attendance_sessions,
      public.student_guardians,
      public.guardians,
      public.student_enrollments,
      public.academic_classes,
      public.academic_programs,
      public.staff_profiles,
      public.students,
      public.academic_years,
      public.institution_memberships,
      public.institutions,
      public.profiles,
      auth.users
    CASCADE;

    -- 1. Auth Users
    INSERT INTO auth.users (id, email) VALUES
      ('${FIXTURES.userAliceOwner}', 'alice.owner@alpha.edu'),
      ('${FIXTURES.userBobTeacher}', 'bob.teacher@alpha.edu'),
      ('${FIXTURES.userCharlieStudent}', 'charlie.student@alpha.edu'),
      ('${FIXTURES.userCharlie2Student}', 'charlie2.student@alpha.edu'),
      ('${FIXTURES.userDavidOwnerBeta}', 'david.owner@beta.edu'),
      ('${FIXTURES.userEveSuspended}', 'eve.suspended@alpha.edu'),
      ('${FIXTURES.userFrankMultiInst}', 'frank.multi@edu.platform'),
      ('${FIXTURES.userGraceGuardian}', 'grace.guardian@family.org'),
      ('${FIXTURES.userHenryDriver}', 'henry.driver@alpha.edu'),
      ('${FIXTURES.userIanAttendant}', 'ian.attendant@alpha.edu');

    -- 2. Public Profiles (update full_name created by auth trigger)
    INSERT INTO public.profiles (id, email, full_name) VALUES
      ('${FIXTURES.userAliceOwner}', 'alice.owner@alpha.edu', 'Alice Owner'),
      ('${FIXTURES.userBobTeacher}', 'bob.teacher@alpha.edu', 'Bob Teacher'),
      ('${FIXTURES.userCharlieStudent}', 'charlie.student@alpha.edu', 'Charlie Student'),
      ('${FIXTURES.userCharlie2Student}', 'charlie2.student@alpha.edu', 'Charlie2 Student'),
      ('${FIXTURES.userDavidOwnerBeta}', 'david.owner@beta.edu', 'David Owner Beta'),
      ('${FIXTURES.userEveSuspended}', 'eve.suspended@alpha.edu', 'Eve Suspended'),
      ('${FIXTURES.userFrankMultiInst}', 'frank.multi@edu.platform', 'Frank Multi'),
      ('${FIXTURES.userGraceGuardian}', 'grace.guardian@family.org', 'Grace Guardian'),
      ('${FIXTURES.userHenryDriver}', 'henry.driver@alpha.edu', 'Henry Driver'),
      ('${FIXTURES.userIanAttendant}', 'ian.attendant@alpha.edu', 'Ian Attendant')
    ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

    -- 3. Institutions
    INSERT INTO public.institutions (id, name, code, slug, type, status, city, state, country) VALUES
      ('${FIXTURES.instAlpha}', 'Institution Alpha', 'ALPHA', 'institution-alpha', 'school', 'active', 'New Delhi', 'Delhi', 'India'),
      ('${FIXTURES.instBeta}', 'Institution Beta', 'BETA', 'institution-beta', 'degree_college', 'active', 'Mumbai', 'Maharashtra', 'India');

    -- 4. Institution Memberships
    INSERT INTO public.institution_memberships (institution_id, user_id, role, status) VALUES
      ('${FIXTURES.instAlpha}', '${FIXTURES.userAliceOwner}', 'owner', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userBobTeacher}', 'faculty', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userCharlieStudent}', 'student', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userCharlie2Student}', 'student', 'active'),
      ('${FIXTURES.instBeta}', '${FIXTURES.userDavidOwnerBeta}', 'owner', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userEveSuspended}', 'faculty', 'suspended'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userFrankMultiInst}', 'staff', 'active'),
      ('${FIXTURES.instBeta}', '${FIXTURES.userFrankMultiInst}', 'faculty', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userGraceGuardian}', 'parent', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userHenryDriver}', 'staff', 'active'),
      ('${FIXTURES.instAlpha}', '${FIXTURES.userIanAttendant}', 'staff', 'active');

    -- 5. Staff Profiles
    INSERT INTO public.staff_profiles (id, institution_id, user_id, employee_id, first_name, last_name, email, phone, date_of_birth, designation, joining_date) VALUES
      ('${FIXTURES.staffBobId}', '${FIXTURES.instAlpha}', '${FIXTURES.userBobTeacher}', 'EMP-BOB-01', 'Bob', 'Teacher', 'bob@alpha.edu', '9998887771', '1985-05-10', 'Senior Math Teacher', '2020-01-01'),
      ('${FIXTURES.staffHenryDriverId}', '${FIXTURES.instAlpha}', '${FIXTURES.userHenryDriver}', 'EMP-HENRY-01', 'Henry', 'Driver', 'henry@alpha.edu', '9998887772', '1980-04-15', 'Bus Driver', '2021-02-01'),
      ('${FIXTURES.staffIanAttendantId}', '${FIXTURES.instAlpha}', '${FIXTURES.userIanAttendant}', 'EMP-IAN-01', 'Ian', 'Attendant', 'ian@alpha.edu', '9998887773', '1990-09-20', 'Bus Attendant', '2022-03-01'),
      ('${FIXTURES.staffBetaDriverId}', '${FIXTURES.instBeta}', '${FIXTURES.userDavidOwnerBeta}', 'EMP-BETA-01', 'David', 'Driver', 'david@beta.edu', '9998887774', '1982-01-01', 'Beta Driver', '2021-01-01');

    -- 6. Students
    INSERT INTO public.students (
      id, institution_id, user_id, admission_number, first_name, last_name, date_of_birth, status,
      emergency_contact_name, emergency_contact_phone, emergency_contact_relationship
    ) VALUES
      ('${FIXTURES.studentCharlieId}', '${FIXTURES.instAlpha}', '${FIXTURES.userCharlieStudent}', 'ADM-CHARLIE-01', 'Charlie', 'Student', '2010-06-15', 'active', 'Grace Guardian', '9991112223', 'mother'),
      ('${FIXTURES.studentCharlie2Id}', '${FIXTURES.instAlpha}', '${FIXTURES.userCharlie2Student}', 'ADM-CHARLIE-02', 'Charlie2', 'PeerStudent', '2010-07-20', 'active', 'Grace Guardian', '9991112223', 'mother'),
      ('${FIXTURES.studentBetaId}', '${FIXTURES.instBeta}', NULL, 'ADM-BETA-01', 'BetaStudent', 'One', '2005-01-10', 'active', 'Beta Contact', '9991112224', 'parent');

    -- 7. Guardians and Student-Guardian Linking
    INSERT INTO public.guardians (id, institution_id, user_id, first_name, last_name, phone, email, relationship_default) VALUES
      ('11000000-0000-0000-0000-000000000001', '${FIXTURES.instAlpha}', '${FIXTURES.userGraceGuardian}', 'Grace', 'Guardian', '9991112223', 'grace.guardian@family.org', 'mother');

    INSERT INTO public.student_guardians (institution_id, student_id, guardian_id, relationship, is_primary) VALUES
      ('${FIXTURES.instAlpha}', '${FIXTURES.studentCharlieId}', '11000000-0000-0000-0000-000000000001', 'mother', true);

    -- 8. Academic Year, Programs & Classes
    INSERT INTO public.academic_years (id, institution_id, name, code, start_date, end_date, is_current) VALUES
      ('${FIXTURES.academicYearAlpha}', '${FIXTURES.instAlpha}', '2026-2027', 'AY-2026', '2026-06-01', '2027-05-31', true),
      ('${FIXTURES.academicYearBeta}', '${FIXTURES.instBeta}', '2026-2027', 'AY-BETA-26', '2026-06-01', '2027-05-31', true);

    INSERT INTO public.academic_programs (id, institution_id, name, code, level) VALUES
      ('${FIXTURES.academicProgramAlpha}', '${FIXTURES.instAlpha}', 'Secondary Education', 'SEC-PROG', 'secondary');

    INSERT INTO public.academic_classes (id, institution_id, program_id, academic_year_id, name, code, level_number) VALUES
      ('${FIXTURES.academicClassAlpha}', '${FIXTURES.instAlpha}', '${FIXTURES.academicProgramAlpha}', '${FIXTURES.academicYearAlpha}', 'Grade 10', 'G10', 10);

    INSERT INTO public.student_enrollments (id, institution_id, student_id, academic_year_id, program_id, class_id) VALUES
      ('${FIXTURES.enrollmentCharlieId}', '${FIXTURES.instAlpha}', '${FIXTURES.studentCharlieId}', '${FIXTURES.academicYearAlpha}', '${FIXTURES.academicProgramAlpha}', '${FIXTURES.academicClassAlpha}');

    -- 9. Attendance Session & Records
    INSERT INTO public.attendance_sessions (id, institution_id, academic_year_id, class_id, session_date, marked_by_staff_id, topic_covered) VALUES
      ('${FIXTURES.attendanceSessionAlpha}', '${FIXTURES.instAlpha}', '${FIXTURES.academicYearAlpha}', '${FIXTURES.academicClassAlpha}', CURRENT_DATE, '${FIXTURES.staffBobId}', 'Morning Session');

    INSERT INTO public.student_attendance_records (id, institution_id, session_id, student_id, enrollment_id, status) VALUES
      ('71000000-0000-0000-0000-000000000001', '${FIXTURES.instAlpha}', '${FIXTURES.attendanceSessionAlpha}', '${FIXTURES.studentCharlieId}', '${FIXTURES.enrollmentCharlieId}', 'present'),
      ('71000000-0000-0000-0000-000000000002', '${FIXTURES.instAlpha}', '${FIXTURES.attendanceSessionAlpha}', '${FIXTURES.studentCharlie2Id}', NULL, 'absent');

    -- 10. Transport Vehicles, Routes, Journeys
    INSERT INTO public.transport_vehicles (id, institution_id, registration_number, vehicle_model, vehicle_type, seating_capacity, status) VALUES
      ('${FIXTURES.vehicleAlphaBus1}', '${FIXTURES.instAlpha}', 'DL-01-AL-1001', 'Tata Starbus 40', 'school_bus', 40, 'active'),
      ('${FIXTURES.vehicleAlphaBus2}', '${FIXTURES.instAlpha}', 'DL-01-AL-1002', 'Ashok Leyland 30', 'school_bus', 30, 'active'),
      ('${FIXTURES.vehicleBetaBus1}', '${FIXTURES.instBeta}', 'MH-02-BE-2001', 'Eicher Starline 50', 'college_bus', 50, 'active');

    INSERT INTO public.transport_routes (id, institution_id, academic_year_id, route_name, route_code, start_location, destination, shift) VALUES
      ('${FIXTURES.routeAlpha1}', '${FIXTURES.instAlpha}', '${FIXTURES.academicYearAlpha}', 'North Campus Express', 'R-NORTH-01', 'City Center', 'North Campus', 'morning'),
      ('${FIXTURES.routeBeta1}', '${FIXTURES.instBeta}', '${FIXTURES.academicYearBeta}', 'South Campus Express', 'R-SOUTH-01', 'South Station', 'South Campus', 'morning');

    INSERT INTO public.transport_journeys (id, institution_id, route_id, vehicle_id, driver_id, attendant_id, journey_date, shift, status) VALUES
      ('${FIXTURES.journeyAlphaMorning}', '${FIXTURES.instAlpha}', '${FIXTURES.routeAlpha1}', '${FIXTURES.vehicleAlphaBus1}', '${FIXTURES.staffHenryDriverId}', '${FIXTURES.staffIanAttendantId}', CURRENT_DATE, 'morning', 'in_progress'),
      ('${FIXTURES.journeyAlphaCompleted}', '${FIXTURES.instAlpha}', '${FIXTURES.routeAlpha1}', '${FIXTURES.vehicleAlphaBus1}', '${FIXTURES.staffHenryDriverId}', NULL, CURRENT_DATE, 'morning', 'completed'),
      ('${FIXTURES.journeyBetaMorning}', '${FIXTURES.instBeta}', '${FIXTURES.routeBeta1}', '${FIXTURES.vehicleBetaBus1}', '${FIXTURES.staffBetaDriverId}', NULL, CURRENT_DATE, 'morning', 'in_progress');

    -- 11. Storage Buckets & Objects for RLS verification
    INSERT INTO storage.buckets (id, name, public) VALUES
      ('student-documents', 'student-documents', false),
      ('staff-documents', 'staff-documents', false),
      ('institution-assets', 'institution-assets', true),
      ('vehicle-documents', 'vehicle-documents', false),
      ('communication-attachments', 'communication-attachments', false)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO storage.objects (id, bucket_id, name, owner) VALUES
      ('81000000-0000-0000-0000-000000000001', 'student-documents', '${FIXTURES.instAlpha}/students/${FIXTURES.studentCharlieId}/birth_cert.pdf', '${FIXTURES.userCharlieStudent}'),
      ('81000000-0000-0000-0000-000000000002', 'student-documents', '${FIXTURES.instAlpha}/students/${FIXTURES.studentCharlie2Id}/report_card.pdf', '${FIXTURES.userCharlie2Student}'),
      ('81000000-0000-0000-0000-000000000003', 'student-documents', '${FIXTURES.instBeta}/students/${FIXTURES.studentBetaId}/transcript.pdf', '${FIXTURES.userDavidOwnerBeta}');

    -- 12. Fee Heads, Structures & Assignments
    INSERT INTO public.fee_heads (id, institution_id, name, code, category) VALUES
      ('${FIXTURES.feeHeadTuitionAlpha}', '${FIXTURES.instAlpha}', 'Tuition Fee', 'HEAD-TUIT', 'tuition');

    INSERT INTO public.fee_structures (id, institution_id, academic_year_id, class_id, name, code, total_amount) VALUES
      ('${FIXTURES.feeStructureAlpha}', '${FIXTURES.instAlpha}', '${FIXTURES.academicYearAlpha}', '${FIXTURES.academicClassAlpha}', 'Standard Tuition 2026', 'FS-TUIT-26', 5000.00);

    INSERT INTO public.fee_structure_items (institution_id, fee_structure_id, fee_head_id, amount) VALUES
      ('${FIXTURES.instAlpha}', '${FIXTURES.feeStructureAlpha}', '${FIXTURES.feeHeadTuitionAlpha}', 5000.00);

    INSERT INTO public.student_fee_assignments (
      id, institution_id, student_id, enrollment_id, academic_year_id, fee_structure_id,
      invoice_number, base_amount, concession_amount, fine_amount, net_payable_amount,
      paid_amount, outstanding_balance, status, due_date
    ) VALUES (
      '${FIXTURES.feeAssignmentCharlie}', '${FIXTURES.instAlpha}', '${FIXTURES.studentCharlieId}',
      '${FIXTURES.enrollmentCharlieId}', '${FIXTURES.academicYearAlpha}', '${FIXTURES.feeStructureAlpha}',
      'INV-ALPHA-001', 5000.00, 0.00, 0.00, 5000.00,
      0.00, 5000.00, 'pending', CURRENT_DATE + INTERVAL '30 days'
    );
  `);
}
