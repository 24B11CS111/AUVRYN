const fs = require('fs');

// Read service key from .env.example without printing or logging it
const envContent = fs.readFileSync('.env.example', 'utf8');
const keyMatch = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s]+)/);
if (!keyMatch) {
  console.error('Service key not found in .env.example');
  process.exit(1);
}
const serviceKey = keyMatch[1];
const baseUrl = 'https://dhgdjpjgsvbknquetecl.supabase.co';

async function fetchJson(path, options = {}) {
  const headers = {
    'apikey': serviceKey,
    'Authorization': 'Bearer ' + serviceKey,
    ...(options.headers || {})
  };
  const res = await fetch(baseUrl + path, { ...options, headers });
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch {}
  return { status: res.status, headers: res.headers, text, json };
}

async function runInspection() {
  console.log('=== STARTING READ-ONLY INSPECTION OF dhgdjpjgsvbknquetecl ===\n');

  // 1. PostgREST OpenAPI Introspection
  console.log('[Check 1] Inspecting PostgREST Schema Definitions...');
  const openApiRes = await fetchJson('/rest/v1/');
  console.log('  OpenAPI Endpoint HTTP Status:', openApiRes.status);
  
  const existingDefinitions = [];
  const existingRpc = [];
  if (openApiRes.status === 200 && openApiRes.json) {
    const defs = openApiRes.json.definitions || {};
    existingDefinitions.push(...Object.keys(defs));
    const paths = openApiRes.json.paths || {};
    Object.keys(paths).forEach(p => {
      if (p.startsWith('/rpc/')) {
        existingRpc.push(p.replace('/rpc/', ''));
      }
    });
  }
  console.log(`  Found ${existingDefinitions.length} exposed tables/views in public schema.`);
  console.log(`  Found ${existingRpc.length} exposed RPC functions.`);

  // 2. Query Storage Buckets
  console.log('\n[Check 2] Inspecting Storage Buckets...');
  const bucketsRes = await fetchJson('/storage/v1/bucket');
  console.log('  Storage Endpoint HTTP Status:', bucketsRes.status);
  if (bucketsRes.status === 200 && Array.isArray(bucketsRes.json)) {
    console.log(`  Found ${bucketsRes.json.length} storage buckets:`);
    bucketsRes.json.forEach(b => console.log(`    - ID: "${b.id}", Name: "${b.name}", Public: ${b.public}`));
  } else {
    console.log('  Buckets response:', bucketsRes.text);
  }

  // 3. Query Auth Users
  console.log('\n[Check 3] Inspecting Supabase Auth Users...');
  const authRes = await fetchJson('/auth/v1/admin/users');
  console.log('  Auth Admin Endpoint HTTP Status:', authRes.status);
  if (authRes.status === 200 && authRes.json && Array.isArray(authRes.json.users)) {
    console.log(`  Total Registered Auth Users: ${authRes.json.users.length}`);
  } else {
    console.log('  Auth response:', authRes.text);
  }

  // 4. Test Table-by-Table Existence and Row Counts for all platform tables
  console.log('\n[Check 4] Probing Specific Platform Tables (Existence & Row Counts)...');
  const candidateTables = [
    // Migration 1: Initial schema
    'institutions', 'profiles', 'institution_memberships', 'audit_logs', 'academic_years', 'academic_terms',
    // Migration 2: Academic hierarchy
    'academic_departments', 'academic_programs', 'courses', 'classes', 'sections',
    // Migration 3: Student admissions
    'admission_applications', 'students', 'guardians', 'student_guardians',
    // Migration 4: Staff faculty
    'staff_profiles', 'faculty_assignments', 'departments',
    // Migration 5: Attendance management
    'attendance_sessions', 'student_attendance_records', 'staff_attendance_records', 'attendance_corrections',
    // Migration 6: Timetable scheduling
    'rooms', 'timetable_structures', 'timetable_periods', 'timetable_entries', 'timetable_substitutions', 'schedule_notifications',
    // Migration 7: Examination results
    'grading_scales', 'grading_scale_rules', 'examinations', 'exam_subjects', 'student_exam_marks', 'student_exam_results', 'hall_tickets', 'exam_revaluations',
    // Migration 8: Fees payments
    'fee_structures', 'fee_components', 'student_fee_assignments', 'student_payments', 'financial_ledger',
    // Migration 9: Communications
    'communication_threads', 'communication_messages', 'notifications',
    // Migration 10: Transport
    'vehicles', 'transport_routes', 'route_stops', 'transport_assignments', 'active_journeys', 'vehicle_location_history',
    // Migration 11: Library, hostel, events
    'library_books', 'library_members', 'hostel_buildings', 'hostel_rooms', 'campus_events',
    // Migration 14: Notification worker
    'notification_deliveries', 'notification_delivery_logs',
    // Supabase internal migrations
    'schema_migrations'
  ];

  const tableResults = [];
  for (const table of candidateTables) {
    const res = await fetchJson(`/rest/v1/${table}?select=*`, {
      method: 'HEAD',
      headers: { 'Prefer': 'count=exact' }
    });
    if (res.status === 200 || res.status === 206) {
      const countHeader = res.headers.get('content-range') || '';
      const count = countHeader.split('/')[1] || '0';
      tableResults.push({ table, exists: true, rowCount: count });
    } else if (res.status === 404) {
      tableResults.push({ table, exists: false, reason: '404 Not Found' });
    } else {
      tableResults.push({ table, exists: false, reason: `HTTP ${res.status}: ${res.text}` });
    }
  }

  const existing = tableResults.filter(t => t.exists);
  const missing = tableResults.filter(t => !t.exists);

  console.log(`\nExisting Tables Found (${existing.length}):`);
  existing.forEach(t => console.log(`  [EXISTS] ${t.table} (Rows: ${t.rowCount})`));

  console.log(`\nMissing Tables (${missing.length}):`);
  missing.forEach(t => console.log(`  [MISSING] ${t.table} (${t.reason})`));

  console.log('\n=== INSPECTION COMPLETE ===');
}

runInspection().catch(err => {
  console.error('Inspection failed:', err);
  process.exit(1);
});
