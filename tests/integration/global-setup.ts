import { execFileSync } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const PG_CTL = path.join(PG_BIN, 'pg_ctl.exe');
const PSQL = path.join(PG_BIN, 'psql.exe');
const INIT_DB = path.join(PG_BIN, 'initdb.exe');
const DATA_DIR = path.join(process.cwd(), 'scratch', 'integration_pg_data');
const LOG_FILE = path.join(process.cwd(), 'scratch', 'integration_pg.log');
const PORT = '54333';
const DB_NAME = 'edu_integration_test';

export function runPsql(sql: string, db = DB_NAME): string {
  return execFileSync(PSQL, [
    '-h', '127.0.0.1',
    '-p', PORT,
    '-U', 'postgres',
    '-d', db,
    '-t', '-A',
    '-c', sql,
  ], { encoding: 'utf8' });
}

export function runPsqlFile(filePath: string, db = DB_NAME): string {
  return execFileSync(PSQL, [
    '-h', '127.0.0.1',
    '-p', PORT,
    '-U', 'postgres',
    '-d', db,
    '-f', filePath,
  ], { encoding: 'utf8' });
}

export async function setup() {
  const isIntegrationRun = process.argv.some((arg) => arg.includes('integration'));
  if (!isIntegrationRun) {
    return;
  }

  console.log('[Integration Setup] Checking PostgreSQL binaries...');
  if (!fs.existsSync(PG_CTL) || !fs.existsSync(PSQL)) {
    throw new Error(`PostgreSQL 17 tools not found at ${PG_BIN}`);
  }

  if (!fs.existsSync(DATA_DIR) || !fs.existsSync(path.join(DATA_DIR, 'PG_VERSION'))) {
    console.log('[Integration Setup] Initializing clean PostgreSQL test cluster...');
    if (fs.existsSync(DATA_DIR)) {
      fs.rmSync(DATA_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(DATA_DIR), { recursive: true });
    execFileSync(INIT_DB, ['-D', DATA_DIR, '-U', 'postgres', '-A', 'trust', '--no-sync'], {
      stdio: 'ignore',
    });
  }

  console.log('[Integration Setup] Checking PostgreSQL status...');
  let isRunning = false;
  try {
    execFileSync(PG_CTL, ['status', '-D', DATA_DIR], { stdio: 'ignore' });
    isRunning = true;
    console.log('[Integration Setup] PostgreSQL 17 test cluster already running.');
  } catch {
    isRunning = false;
  }

  if (!isRunning) {
    console.log('[Integration Setup] Starting PostgreSQL 17 test cluster on port 54333...');
    execFileSync(PG_CTL, ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-o', `-p ${PORT}`, '-w'], {
      stdio: 'ignore',
    });
  }

  console.log('[Integration Setup] Resetting clean test database:', DB_NAME);
  runPsql(`DROP DATABASE IF EXISTS ${DB_NAME};`, 'postgres');
  runPsql(`CREATE DATABASE ${DB_NAME};`, 'postgres');

  console.log('[Integration Setup] Applying Supabase mock prelude...');
  const preludePath = path.resolve(__dirname, 'supabase-prelude.sql');
  runPsqlFile(preludePath, DB_NAME);

  const migrationsDir = path.resolve(__dirname, '../../supabase/migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql') && !f.includes('rollback'))
    .sort();

  console.log(`[Integration Setup] Applying ${migrationFiles.length} platform migrations in sequence...`);

  for (const file of migrationFiles) {
    const fullPath = path.join(migrationsDir, file);
    runPsqlFile(fullPath, DB_NAME);
  }

  console.log('[Integration Setup] Granting schema privileges to Supabase roles...');
  runPsql(`
    GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
    GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

    -- Re-enforce Phase 2.4 Worker RPC security isolation
    REVOKE EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) FROM PUBLIC, anon, authenticated;
    REVOKE EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) FROM PUBLIC, anon, authenticated;
    GRANT EXECUTE ON FUNCTION public.claim_notification_deliveries(INT, TEXT, INTERVAL) TO service_role;
    GRANT EXECUTE ON FUNCTION public.resolve_notification_delivery(UUID, TEXT, TEXT, TEXT, JSONB, TEXT, TEXT, BOOLEAN, INT) TO service_role;
    GRANT EXECUTE ON FUNCTION public.requeue_dead_letter_delivery(UUID, UUID) TO service_role;
  `, DB_NAME);

  const tableCount = runPsql(
    "SELECT count(*) FROM information_schema.tables WHERE table_schema IN ('public', 'auth', 'storage');",
    DB_NAME
  ).trim();

  console.log(`[Integration Setup] Migration complete. Total tables ready: ${tableCount}`);
}

export async function teardown() {
  const isIntegrationRun = process.argv.some((arg) => arg.includes('integration'));
  if (!isIntegrationRun) {
    return;
  }

  console.log('[Integration Setup] Stopping PostgreSQL test cluster...');
  try {
    execFileSync(PG_CTL, ['stop', '-D', DATA_DIR, '-m', 'fast'], { stdio: 'ignore' });
  } catch (err: any) {
    console.warn('[Integration Teardown] Warning during stop:', err.message);
  }
}
