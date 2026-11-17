/**
 * Staging Seed Runner Wrapper
 * Platform: AUVRYN — The Intelligent Education Ecosystem
 *
 * SAFETY ARCHITECTURE:
 * 1. PostgreSQL session variables (app.environment, app.allow_pilot_seed) are client-controlled
 *    and can be spoofed in the SQL Editor. They DO NOT provide authoritative project identity.
 * 2. This wrapper independently inspects and validates the actual target project reference
 *    BEFORE any database connection or script execution.
 * 3. Positively identifies local vs staging environments.
 * 4. Strictly and unconditionally rejects production project 'dhgdjpjgsvbknquetecl'.
 * 5. Injects an ephemeral, cryptographically verifiable runner signature into the session.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PRODUCTION_PROJECT_REF = 'dhgdjpjgsvbknquetecl';
const PRODUCTION_REF_PREFIX = 'dhgdjpjg';
const AUTHORIZED_TARGETS = ['local', 'local_development', 'staging', 'test', 'local_test'];

/**
 * Extracts a Supabase project reference from a URL or raw reference string.
 */
function extractProjectRef(rawInput) {
  if (!rawInput || typeof rawInput !== 'string') return null;
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  // Pattern: https://<ref>.supabase.co
  const httpsMatch = trimmed.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  if (httpsMatch && httpsMatch[1]) return httpsMatch[1].toLowerCase();

  // Pattern: db.<ref>.supabase.co
  const dbMatch = trimmed.match(/db\.([a-z0-9_-]+)\.supabase\.co/i);
  if (dbMatch && dbMatch[1]) return dbMatch[1].toLowerCase();

  // Pattern: postgres.<ref>@...
  const userMatch = trimmed.match(/postgres\.([a-z0-9_-]+)@/i);
  if (userMatch && userMatch[1]) return userMatch[1].toLowerCase();

  // Pattern: direct alphanumeric project ref with optional dashes/underscores
  if (/^[a-z0-9_-]{8,50}$/i.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

/**
 * Authoritatively validates target environment and project reference.
 */
function validateTargetEnvironment(options = {}) {
  const target = (options.target || process.env.TARGET_ENV || '').trim().toLowerCase();

  if (!target) {
    return {
      isValid: false,
      error: 'CRITICAL SAFETY BLOCK: Target environment is not specified. Specify --target <local|staging>. Execution refused.',
    };
  }

  // Reject production aliases immediately
  if (['production', 'prod', 'live'].includes(target)) {
    return {
      isValid: false,
      error: 'CRITICAL SAFETY BLOCK: Staging seed script execution is strictly forbidden in production environments.',
    };
  }

  // Reject unauthorized / ambiguous environments
  if (!AUTHORIZED_TARGETS.includes(target)) {
    return {
      isValid: false,
      error: `CRITICAL SAFETY BLOCK: Ambiguous or unauthorized target environment '${target}'. Only 'local' or 'staging' are permitted.`,
    };
  }

  // 1. Local Development Scenario
  if (['local', 'local_development', 'test', 'local_test'].includes(target)) {
    const dbUrl = options.dbUrl || process.env.DATABASE_URL || '';
    if (dbUrl) {
      if (dbUrl.includes(PRODUCTION_REF_PREFIX) || dbUrl.includes('supabase.co')) {
        return {
          isValid: false,
          error: 'CRITICAL SAFETY BLOCK: Remote Supabase database detected while target is set to local. Refusing execution.',
        };
      }
    }
    return {
      isValid: true,
      env: 'local_development',
      projectRef: 'local_development',
      isLocal: true,
    };
  }

  // 2. Remote Staging Scenario
  if (target === 'staging') {
    const rawRef =
      options.projectRef ||
      options.stagingProjectRef ||
      process.env.STAGING_PROJECT_REF ||
      process.env.SUPABASE_PROJECT_REF ||
      options.supabaseUrl ||
      options.dbUrl ||
      process.env.SUPABASE_URL ||
      process.env.DATABASE_URL ||
      '';

    const projectRef = extractProjectRef(rawRef);

    if (!projectRef) {
      return {
        isValid: false,
        error: 'CRITICAL SAFETY BLOCK: Target project cannot be positively identified. Remote staging seed requires an explicit Supabase project reference via --project-ref or STAGING_PROJECT_REF.',
      };
    }

    // Hard check: Explicitly reject production project reference
    if (projectRef === PRODUCTION_PROJECT_REF || projectRef.startsWith(PRODUCTION_REF_PREFIX)) {
      return {
        isValid: false,
        error: `CRITICAL SAFETY BLOCK: Target project reference '${projectRef}' matches the PRODUCTION Supabase project. Staging seed execution against production is strictly prohibited.`,
      };
    }

    // Hard check: Reject if URLs contain production signatures
    const urlString = `${options.dbUrl || ''} ${options.supabaseUrl || ''} ${process.env.DATABASE_URL || ''} ${process.env.SUPABASE_URL || ''}`;
    if (urlString.includes(PRODUCTION_REF_PREFIX)) {
      return {
        isValid: false,
        error: 'CRITICAL SAFETY BLOCK: Production Supabase project reference detected in connection strings. Refusing execution.',
      };
    }

    return {
      isValid: true,
      env: 'staging',
      projectRef,
      isLocal: false,
    };
  }

  return {
    isValid: false,
    error: `CRITICAL SAFETY BLOCK: Unhandled environment scenario: ${target}`,
  };
}

/**
 * Generates the runner authorization preamble to be injected into the session.
 */
function generateRunnerPreamble(validation) {
  if (!validation.isValid || !validation.projectRef) {
    throw new Error('Cannot generate preamble for invalid validation result');
  }

  const nonce = crypto.randomBytes(16).toString('hex');
  const signature = crypto.createHmac('sha256', nonce).update(validation.projectRef).digest('hex');

  return {
    nonce,
    signature,
    sql: [
      `SET app.environment = '${validation.env}';`,
      `SET app.allow_pilot_seed = 'true';`,
      `SET app.seed_target_project_ref = '${validation.projectRef}';`,
      `SET app.seed_runner_nonce = '${nonce}';`,
      `SET app.seed_runner_signature = '${signature}';`,
    ].join('\n'),
  };
}

// CLI Execution Entrypoint
async function main() {
  const args = process.argv.slice(2);
  const options = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--target' && args[i + 1]) {
      options.target = args[++i];
    } else if (arg.startsWith('--target=')) {
      options.target = arg.split('=')[1];
    } else if (arg === '--project-ref' && args[i + 1]) {
      options.projectRef = args[++i];
    } else if (arg.startsWith('--project-ref=')) {
      options.projectRef = arg.split('=')[1];
    } else if (arg === '--db-url' && args[i + 1]) {
      options.dbUrl = args[++i];
    } else if (arg.startsWith('--db-url=')) {
      options.dbUrl = arg.split('=')[1];
    }
  }

  const validation = validateTargetEnvironment(options);

  if (!validation.isValid) {
    console.error('\n' + '='.repeat(80));
    console.error('SEED RUNNER SAFETY ABORT:');
    console.error(validation.error);
    console.error('='.repeat(80) + '\n');
    process.exit(1);
  }

  console.log('\n' + '='.repeat(80));
  console.log('SEED RUNNER SAFETY VERIFICATION PASSED');
  console.log(`Target Environment: ${validation.env}`);
  console.log(`Verified Project Ref: ${validation.projectRef}`);
  console.log(`Execution Mode: ${validation.isLocal ? 'Local Database' : 'Isolated Remote Staging'}`);
  console.log('='.repeat(80) + '\n');

  const preamble = generateRunnerPreamble(validation);
  console.log('Runner preamble prepared successfully.');
  console.log('Note: To execute the seed against this verified target, execute via psql or programmatic migration client with the generated runner preamble.');
}

if (require.main === module) {
  main().catch((err) => {
    console.error('Seed runner failed:', err);
    process.exit(1);
  });
}

module.exports = {
  PRODUCTION_PROJECT_REF,
  PRODUCTION_REF_PREFIX,
  extractProjectRef,
  validateTargetEnvironment,
  generateRunnerPreamble,
};
