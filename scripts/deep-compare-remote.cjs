const fs = require('fs');

const envContent = fs.readFileSync('.env.example', 'utf8');
const serviceKey = envContent.match(/SUPABASE_SERVICE_ROLE_KEY=([^\s]+)/)[1];
const baseUrl = 'https://dhgdjpjgsvbknquetecl.supabase.co';

async function main() {
  const res = await fetch(baseUrl + '/rest/v1/', {
    headers: { 'apikey': serviceKey, 'Authorization': 'Bearer ' + serviceKey }
  });
  const spec = await res.json();
  const defs = spec.definitions || {};
  
  const m1 = ['institutions', 'campuses', 'academic_years', 'academic_terms', 'profiles', 'institution_memberships', 'audit_logs'];
  const m2 = ['academic_departments', 'academic_programs', 'academic_classes', 'academic_sections', 'academic_subjects', 'academic_class_subjects'];
  const m3 = ['students', 'guardians', 'student_guardians', 'admission_applications', 'admission_status_history', 'student_enrollments', 'student_documents'];
  const m8 = ['fee_heads', 'fee_structures', 'fee_structure_items', 'fee_structure_installments', 'institution_fee_settings', 'student_fee_assignments', 'student_fee_assignment_items', 'student_fee_installments', 'fee_concessions', 'fee_refund_requests', 'fee_payments', 'payment_allocations', 'student_advance_balances', 'financial_ledger_entries', 'gateway_orders', 'gateway_webhook_events'];
  
  console.log('=== VERIFYING MIGRATION 1 TABLES ===');
  for (const t of m1) {
    if (defs[t]) {
      const cols = Object.keys(defs[t].properties || {});
      console.log(`[PASS] ${t}: ${cols.length} columns (${cols.slice(0, 5).join(', ')}...)`);
    } else {
      console.log(`[FAIL] ${t} MISSING!`);
    }
  }

  console.log('\n=== VERIFYING MIGRATION 2 TABLES ===');
  for (const t of m2) {
    if (defs[t]) {
      const cols = Object.keys(defs[t].properties || {});
      console.log(`[PASS] ${t}: ${cols.length} columns (${cols.slice(0, 5).join(', ')}...)`);
    } else {
      console.log(`[FAIL] ${t} MISSING!`);
    }
  }

  console.log('\n=== VERIFYING MIGRATION 3 TABLES ===');
  for (const t of m3) {
    if (defs[t]) {
      const cols = Object.keys(defs[t].properties || {});
      console.log(`[PASS] ${t}: ${cols.length} columns (${cols.slice(0, 5).join(', ')}...)`);
    } else {
      console.log(`[FAIL] ${t} MISSING!`);
    }
  }

  console.log('\n=== VERIFYING MIGRATION 8 TABLES ===');
  for (const t of m8) {
    if (defs[t]) {
      const cols = Object.keys(defs[t].properties || {});
      console.log(`[PASS] ${t}: ${cols.length} columns (${cols.slice(0, 5).join(', ')}...)`);
    } else {
      console.log(`[FAIL] ${t} MISSING!`);
    }
  }

  const allDefined = new Set([...m1, ...m2, ...m3, ...m8]);
  const otherTables = Object.keys(defs).filter(t => !allDefined.has(t));
  console.log('\n=== ANY OTHER TABLES IN REMOTE? ===');
  console.log(otherTables.length ? otherTables : 'None (Exactly 36 tables match Migrations 1, 2, 3, 8)');
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
