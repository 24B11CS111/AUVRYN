const { execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const PG_CTL = path.join(PG_BIN, 'pg_ctl.exe');
const PSQL = path.join(PG_BIN, 'psql.exe');
const DATA_DIR = path.join(process.cwd(), 'scratch', 'integration_pg_data');
const LOG_FILE = path.join(process.cwd(), 'scratch', 'integration_pg.log');
const PORT = '54333';
const DB_NAME = 'migration_fresh_test';

console.log('=== Fresh Isolated PostgreSQL 17 Migration Validation ===');
console.log('Target Database:', DB_NAME);
console.log('Port:', PORT);

// Step 0: Ensure Postgres is started in this session
let isRunning = false;
try {
  execFileSync(PG_CTL, ['status', '-D', DATA_DIR], { stdio: 'ignore' });
  isRunning = true;
  console.log('[Step 0] PostgreSQL test cluster is already running.');
} catch {
  isRunning = false;
}

if (!isRunning) {
  console.log('[Step 0] Starting PostgreSQL test cluster on port 54333...');
  execFileSync(PG_CTL, ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-o', `-p ${PORT}`, '-w'], {
    stdio: 'ignore'
  });
  console.log('[Step 0] PostgreSQL test cluster started.');
}

// 1. Terminate connections and recreate database
console.log('\n[Step 1] Dropping and creating clean database:', DB_NAME);
try {
  execFileSync(PSQL, [
    '-h', '127.0.0.1',
    '-p', PORT,
    '-U', 'postgres',
    '-d', 'postgres',
    '-c', `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '${DB_NAME}';`
  ], { stdio: 'inherit' });
} catch {}

execFileSync(PSQL, [
  '-h', '127.0.0.1',
  '-p', PORT,
  '-U', 'postgres',
  '-d', 'postgres',
  '-v', 'ON_ERROR_STOP=1',
  '-c', `DROP DATABASE IF EXISTS ${DB_NAME};`
], { stdio: 'inherit' });

execFileSync(PSQL, [
  '-h', '127.0.0.1',
  '-p', PORT,
  '-U', 'postgres',
  '-d', 'postgres',
  '-v', 'ON_ERROR_STOP=1',
  '-c', `CREATE DATABASE ${DB_NAME};`
], { stdio: 'inherit' });

// 2. Apply Supabase prelude
console.log('\n[Step 2] Applying Supabase prelude...');
const preludePath = path.resolve(__dirname, '../tests/integration/supabase-prelude.sql');
execFileSync(PSQL, [
  '-h', '127.0.0.1',
  '-p', PORT,
  '-U', 'postgres',
  '-d', DB_NAME,
  '-v', 'ON_ERROR_STOP=1',
  '-f', preludePath
], { stdio: 'inherit' });
console.log('  -> Supabase prelude applied successfully.');

// 3. Sequentially run all 16 migration files
const migrationsDir = path.resolve(__dirname, '../supabase/migrations');
const migrationFiles = fs.readdirSync(migrationsDir)
  .filter(f => f.endsWith('.sql') && !f.includes('rollback'))
  .sort();

console.log(`\n[Step 3] Applying ${migrationFiles.length} migrations in sequence with ON_ERROR_STOP=1...`);

const results = [];
let allPassed = true;

for (let i = 0; i < migrationFiles.length; i++) {
  const file = migrationFiles[i];
  const fullPath = path.join(migrationsDir, file);
  const start = Date.now();
  try {
    execFileSync(PSQL, [
      '-h', '127.0.0.1',
      '-p', PORT,
      '-U', 'postgres',
      '-d', DB_NAME,
      '-v', 'ON_ERROR_STOP=1',
      '-f', fullPath
    ], { stdio: 'pipe' });
    const duration = Date.now() - start;
    results.push({ file, status: 'PASS', duration: `${duration}ms` });
    console.log(`  [${i + 1}/${migrationFiles.length}] PASS: ${file} (${duration}ms)`);
  } catch (err) {
    const duration = Date.now() - start;
    allPassed = false;
    results.push({ file, status: 'FAIL', duration: `${duration}ms`, error: err.stderr ? err.stderr.toString() : err.message });
    console.error(`  [${i + 1}/${migrationFiles.length}] FAIL: ${file} (${duration}ms)`);
    console.error('  Error output:', err.stderr ? err.stderr.toString() : err.message);
    break;
  }
}

// 4. Schema verification
if (allPassed) {
  console.log('\n[Step 4] Querying schema object counts...');
  const tableCount = execFileSync(PSQL, [
    '-h', '127.0.0.1',
    '-p', PORT,
    '-U', 'postgres',
    '-d', DB_NAME,
    '-t', '-A',
    '-c', "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
  ], { encoding: 'utf8' }).trim();

  const functionCount = execFileSync(PSQL, [
    '-h', '127.0.0.1',
    '-p', PORT,
    '-U', 'postgres',
    '-d', DB_NAME,
    '-t', '-A',
    '-c', "SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public';"
  ], { encoding: 'utf8' }).trim();

  const policyCount = execFileSync(PSQL, [
    '-h', '127.0.0.1',
    '-p', PORT,
    '-U', 'postgres',
    '-d', DB_NAME,
    '-t', '-A',
    '-c', "SELECT count(*) FROM pg_policies WHERE schemaname = 'public';"
  ], { encoding: 'utf8' }).trim();

  console.log(`  Total public tables:    ${tableCount}`);
  console.log(`  Total public functions: ${functionCount}`);
  console.log(`  Total public policies:  ${policyCount}`);
  console.log(`\n>>> ALL ${migrationFiles.length} MIGRATIONS PASSED WITH ZERO ERRORS! <<<`);
  process.exit(0);
} else {
  console.error('\n>>> MIGRATION VALIDATION FAILED <<<');
  process.exit(1);
}
