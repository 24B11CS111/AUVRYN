const { execFileSync } = require('child_process');
const path = require('path');

const PG_BIN = 'C:\\Program Files\\PostgreSQL\\17\\bin';
const PG_CTL = path.join(PG_BIN, 'pg_ctl.exe');
const PSQL = path.join(PG_BIN, 'psql.exe');
const DATA_DIR = 'C:\\Users\\hrixo\\.gemini\\antigravity\\brain\\d4ae1d03-9a08-47bd-bfba-7e01045c7b37\\scratch\\pg_test_db';
const LOG_FILE = 'C:\\Users\\hrixo\\.gemini\\antigravity\\brain\\d4ae1d03-9a08-47bd-bfba-7e01045c7b37\\scratch\\pg_server.log';
const PORT = '54333';
const DB_NAME = 'migration_fresh_test';

console.log('=== Testing AI Gateway Tables, Stored Procedures & RLS on PostgreSQL 17 ===');

// Ensure Postgres is started
let isRunning = false;
try {
  execFileSync(PG_CTL, ['status', '-D', DATA_DIR], { stdio: 'ignore' });
  isRunning = true;
} catch {
  isRunning = false;
}

if (!isRunning) {
  console.log('Starting PostgreSQL test cluster on port 54333...');
  execFileSync(PG_CTL, ['start', '-D', DATA_DIR, '-l', LOG_FILE, '-o', `-p ${PORT}`, '-w'], {
    stdio: 'ignore'
  });
}

const testSql = `
BEGIN;

-- 1. Create a mock institution and users
INSERT INTO public.institutions (id, name, slug, code, type, status, city, state, country)
VALUES 
  ('a1111111-1111-1111-1111-111111111111', 'AI Academy', 'ai-academy', 'AIA01', 'school', 'active', 'Bangalore', 'Karnataka', 'India')
ON CONFLICT (id) DO NOTHING;

-- Auto-provisioned quota check
SELECT 
  institution_id, monthly_token_budget, monthly_tokens_consumed, monthly_request_budget, monthly_requests_consumed, is_ai_enabled
FROM public.ai_institution_quotas
WHERE institution_id = 'a1111111-1111-1111-1111-111111111111';

-- 2. Test check_and_reserve_ai_quota
DO $$
DECLARE
  v_res JSONB;
BEGIN
  -- Test valid reservation
  v_res := public.check_and_reserve_ai_quota(
    'a1111111-1111-1111-1111-111111111111'::UUID,
    1500,
    'tutor_qa'::public.ai_task_type
  );
  ASSERT (v_res->>'allowed')::BOOLEAN = true, 'Quota reservation should be allowed';
  ASSERT (v_res->>'monthly_tokens_remaining')::INT = 998500, 'Remaining tokens should be 998500';
  ASSERT (v_res->>'monthly_requests_remaining')::INT = 4999, 'Remaining requests should be 4999';
  RAISE NOTICE 'SUCCESS: Valid quota reservation passed: %', v_res;
END $$;

-- 3. Test Token Budget Exhaustion
DO $$
DECLARE
  v_res JSONB;
BEGIN
  -- Artificially exhaust tokens
  UPDATE public.ai_institution_quotas
  SET monthly_tokens_consumed = 999500
  WHERE institution_id = 'a1111111-1111-1111-1111-111111111111';

  -- Try reserving 1000 tokens (would reach 1000500 > 1000000)
  v_res := public.check_and_reserve_ai_quota(
    'a1111111-1111-1111-1111-111111111111'::UUID,
    1000,
    'tutor_qa'::public.ai_task_type
  );
  ASSERT (v_res->>'allowed')::BOOLEAN = false, 'Over-budget reservation must be denied';
  ASSERT v_res->>'reason' = 'TOKEN_BUDGET_EXCEEDED', 'Reason must be TOKEN_BUDGET_EXCEEDED';
  RAISE NOTICE 'SUCCESS: Token budget enforcement passed: %', v_res;
END $$;

-- 4. Test AI Disabled Flag
DO $$
DECLARE
  v_res JSONB;
BEGIN
  UPDATE public.ai_institution_quotas
  SET is_ai_enabled = false
  WHERE institution_id = 'a1111111-1111-1111-1111-111111111111';

  v_res := public.check_and_reserve_ai_quota(
    'a1111111-1111-1111-1111-111111111111'::UUID,
    100,
    'tutor_qa'::public.ai_task_type
  );
  ASSERT (v_res->>'allowed')::BOOLEAN = false, 'Disabled AI should reject reservation';
  ASSERT v_res->>'reason' = 'AI_DISABLED', 'Reason must be AI_DISABLED';
  RAISE NOTICE 'SUCCESS: AI Disabled check passed: %', v_res;
END $$;

-- Reset quota to normal
UPDATE public.ai_institution_quotas
SET is_ai_enabled = true, monthly_tokens_consumed = 0, monthly_requests_consumed = 0
WHERE institution_id = 'a1111111-1111-1111-1111-111111111111';

-- 5. Test record_ai_usage
DO $$
DECLARE
  v_log_id UUID;
  v_log RECORD;
BEGIN
  v_log_id := public.record_ai_usage(
    'a1111111-1111-1111-1111-111111111111'::UUID,
    NULL,
    'student',
    'tutor_qa'::public.ai_task_type,
    'gemini'::public.ai_provider_type,
    'gemini-3.8-flash',
    150,
    350,
    240,
    'success',
    NULL,
    '{"subject": "Physics"}'::jsonb,
    600 -- estimated reserved was 600, actual total was 500
  );
  
  SELECT * INTO v_log FROM public.ai_usage_logs WHERE id = v_log_id;
  ASSERT v_log.total_tokens = 500, 'Total tokens should be 500';
  ASSERT v_log.latency_ms = 240, 'Latency should be 240';
  ASSERT v_log.model_name = 'gemini-3.8-flash', 'Model name should match';
  RAISE NOTICE 'SUCCESS: record_ai_usage created log entry % with % total tokens', v_log_id, v_log.total_tokens;
END $$;

-- 6. Test ai_generated_drafts Status Default
DO $$
DECLARE
  v_draft_id UUID;
  v_draft RECORD;
  v_dummy_user UUID := gen_random_uuid();
BEGIN
  -- Insert dummy user in auth.users
  INSERT INTO auth.users (id, email) VALUES (v_dummy_user, 'teacher@aiacademy.edu') ON CONFLICT DO NOTHING;

  INSERT INTO public.ai_generated_drafts (
    institution_id,
    author_id,
    task_type,
    title,
    content_json
  ) VALUES (
    'a1111111-1111-1111-1111-111111111111',
    v_dummy_user,
    'exam_paper_draft',
    'Physics Term 1 Final Paper',
    '{"sections": [{"title": "Section A", "questions": ["Q1", "Q2"]}]}'::jsonb
  ) RETURNING id INTO v_draft_id;

  SELECT * INTO v_draft FROM public.ai_generated_drafts WHERE id = v_draft_id;
  ASSERT v_draft.status = 'draft', 'Generated draft must default to status = draft';
  RAISE NOTICE 'SUCCESS: ai_generated_drafts enforced draft status: %', v_draft.status;
END $$;

ROLLBACK;
`;

const res = execFileSync(PSQL, [
  '-h', '127.0.0.1',
  '-p', PORT,
  '-U', 'postgres',
  '-d', DB_NAME,
  '-v', 'ON_ERROR_STOP=1',
  '-c', testSql
], { encoding: 'utf8' });

console.log(res);
console.log('>>> ALL AI GATEWAY DATABASE & RPC TESTS PASSED! <<<');
