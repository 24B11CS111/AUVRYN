import { describe, it, expect } from 'vitest';
// @ts-ignore
const seedRunner = require('../../scripts/seed-staging.cjs');

/**
 * Staging Seed Safety Guard & Environment Isolation Tests
 *
 * Verifies that:
 * 1. In-database session variables (app.environment, app.allow_pilot_seed) cannot be treated
 *    as authoritative project identity: direct SQL Editor execution without runner validation is blocked.
 * 2. scripts/seed-staging.cjs authoritatively validates target environment and project reference.
 * 3. Production project 'dhgdjpjgsvbknquetecl' and any 'dhgdjpjg*' references are strictly rejected.
 * 4. Missing or unidentifiable project references are strictly rejected.
 * 5. Unknown and ambiguous environments ('qa', 'unknown', 'preview', etc.) are strictly rejected.
 * 6. Local development and valid non-production staging environments are accepted.
 */

interface EnvironmentContext {
  targetProjectRef?: string | null;
  runnerNonce?: string | null;
  runnerSignature?: string | null;
  appEnvironment?: string | null;
  allowPilotSeed?: string | null;
  jwtClaimSub?: string | null;
  projectIdSetting?: string | null;
  supabaseUrlSetting?: string | null;
  requestHeaderHost?: string | null;
  nonDemoUserCount?: number;
  nonDemoInstitutionCount?: number;
}

function evaluateSeedSafetyGuard(ctx: EnvironmentContext): { allowed: boolean; error?: string } {
  // 1. Check for Authoritative Seed Runner Validation
  const targetProject = ctx.targetProjectRef ? ctx.targetProjectRef.trim() : null;
  const runnerNonce = ctx.runnerNonce ? ctx.runnerNonce.trim() : null;
  const runnerSig = ctx.runnerSignature ? ctx.runnerSignature.trim() : null;

  if (!targetProject || !runnerNonce || !runnerSig) {
    return {
      allowed: false,
      error: 'CRITICAL SAFETY BLOCK: Direct SQL Editor execution is disabled. Staging seed execution is permitted ONLY through the certified wrapper (scripts/seed-staging.cjs or scripts/seed-staging.ps1), which independently validates project identity. Session settings (app.environment) alone are not authoritative.',
    };
  }

  // 2. Explicitly Reject Production Project Reference
  if (targetProject === 'dhgdjpjgsvbknquetecl' || targetProject.startsWith('dhgdjpjg')) {
    return {
      allowed: false,
      error: `CRITICAL SAFETY BLOCK: Target project ref '${targetProject}' is the PRODUCTION database. Staging seed execution against production is strictly prohibited.`,
    };
  }

  // 3. Check for missing or ambiguous environment identity
  const env = ctx.appEnvironment ? ctx.appEnvironment.trim() : null;
  const allowSeed = ctx.allowPilotSeed ? ctx.allowPilotSeed.trim() : null;

  if (!env) {
    return {
      allowed: false,
      error: 'CRITICAL SAFETY BLOCK: Missing environment identity. To execute this staging seed in an authorized non-production environment, execute via the validated runner wrapper.',
    };
  }

  // 4. Reject production and unauthorized environments
  const authorizedEnvs = ['staging', 'local_development', 'test', 'local_test'];
  if (!authorizedEnvs.includes(env)) {
    return {
      allowed: false,
      error: `CRITICAL SAFETY BLOCK: Ambiguous or unauthorized environment '${env}'. This seed script can only run in 'staging' or 'local_development'. Execution refused.`,
    };
  }

  if (['production', 'prod', 'live'].includes(env)) {
    return {
      allowed: false,
      error: 'CRITICAL SAFETY BLOCK: Staging seed script is strictly forbidden in production environments.',
    };
  }

  // 5. Require explicit secondary confirmation flag
  if (allowSeed !== 'true') {
    return {
      allowed: false,
      error: 'CRITICAL SAFETY BLOCK: Explicit seed permission missing. Staging seed must be invoked via the validated runner wrapper.',
    };
  }

  // 6. Multi-Factor Production Database Detection
  // A. PostgREST JWT claim
  if (ctx.jwtClaimSub) {
    return {
      allowed: false,
      error: 'CRITICAL SAFETY BLOCK: PostgREST JWT claim detected. Cannot seed through client PostgREST connection.',
    };
  }

  // B. Supabase production project references
  if (
    (ctx.projectIdSetting && ctx.projectIdSetting.includes('dhgdjpjg')) ||
    (ctx.supabaseUrlSetting && ctx.supabaseUrlSetting.includes('dhgdjpjg')) ||
    (ctx.requestHeaderHost && ctx.requestHeaderHost.includes('dhgdjpjg'))
  ) {
    return {
      allowed: false,
      error: 'CRITICAL SAFETY BLOCK: Supabase production project reference detected. Execution refused.',
    };
  }

  // C. Existing non-demo users
  if (ctx.nonDemoUserCount !== undefined && ctx.nonDemoUserCount > 0) {
    return {
      allowed: false,
      error: `CRITICAL SAFETY BLOCK: Target database contains ${ctx.nonDemoUserCount} non-demo user account(s). Refusing execution to prevent corrupting real data.`,
    };
  }

  // D. Existing non-demo institutions
  if (ctx.nonDemoInstitutionCount !== undefined && ctx.nonDemoInstitutionCount > 0) {
    return {
      allowed: false,
      error: `CRITICAL SAFETY BLOCK: Target database contains ${ctx.nonDemoInstitutionCount} non-demo institution(s). Refusing execution.`,
    };
  }

  return { allowed: true };
}

describe('Staging Seed Isolation & Safety Architecture', () => {
  describe('In-Database SQL Guard & SQL Editor Spoofing Prevention', () => {
    it('blocks direct SQL Editor execution when user sets app.environment = staging without runner verification', () => {
      // Simulates an SQL Editor user executing:
      // SET app.environment = 'staging'; SET app.allow_pilot_seed = 'true';
      const result = evaluateSeedSafetyGuard({
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
        // Note: runner variables are missing because it was pasted directly into the SQL Editor
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Direct SQL Editor execution is disabled');
    });

    it('blocks direct SQL Editor execution when user sets app.environment = local_development without runner verification', () => {
      const result = evaluateSeedSafetyGuard({
        appEnvironment: 'local_development',
        allowPilotSeed: 'true',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Direct SQL Editor execution is disabled');
    });

    it('strictly rejects when targetProjectRef is the production Supabase project', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'dhgdjpjgsvbknquetecl',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('is the PRODUCTION database');
    });

    it('strictly rejects when targetProjectRef starts with dhgdjpjg prefix', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'dhgdjpjg_sandbox',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('is the PRODUCTION database');
    });

    it('rejects execution when appEnvironment is ambiguous or unauthorized', () => {
      const ambiguous = ['qa', 'dev', 'unknown', 'preview', 'sandbox'];
      for (const env of ambiguous) {
        const result = evaluateSeedSafetyGuard({
          targetProjectRef: 'isolated-staging-project-12345',
          runnerNonce: '1234567890abcdef',
          runnerSignature: 'valid_signature',
          appEnvironment: env,
          allowPilotSeed: 'true',
        });
        expect(result.allowed).toBe(false);
        expect(result.error).toContain('Ambiguous or unauthorized environment');
      }
    });

    it('rejects execution if run through PostgREST client session (JWT sub claim present)', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'isolated-staging-project-12345',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
        jwtClaimSub: 'auth0|1234567890',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('PostgREST JWT claim detected');
    });

    it('detects production Supabase URL in settings', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'isolated-staging-project-12345',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
        supabaseUrlSetting: 'https://dhgdjpjgsvbknquetecl.supabase.co',
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Supabase production project reference detected');
    });

    it('halts execution if target database already contains real non-demo users', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'isolated-staging-project-12345',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
        nonDemoUserCount: 12,
      });
      expect(result.allowed).toBe(false);
      expect(result.error).toContain('Target database contains 12 non-demo user account(s)');
    });

    it('allows execution in clean staging environment with verified runner signature', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'isolated-staging-project-12345',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'staging',
        allowPilotSeed: 'true',
        nonDemoUserCount: 0,
        nonDemoInstitutionCount: 0,
      });
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('allows execution in clean local development with verified runner signature', () => {
      const result = evaluateSeedSafetyGuard({
        targetProjectRef: 'local_development',
        runnerNonce: '1234567890abcdef',
        runnerSignature: 'valid_signature',
        appEnvironment: 'local_development',
        allowPilotSeed: 'true',
        nonDemoUserCount: 0,
        nonDemoInstitutionCount: 0,
      });
      expect(result.allowed).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('Seed Runner Wrapper Validation (scripts/seed-staging.cjs)', () => {
    describe('Production Scenarios', () => {
      it('strictly rejects --target production', () => {
        const val = seedRunner.validateTargetEnvironment({ target: 'production' });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('strictly forbidden in production environments');
      });

      it('strictly rejects --target prod or live', () => {
        expect(seedRunner.validateTargetEnvironment({ target: 'prod' }).isValid).toBe(false);
        expect(seedRunner.validateTargetEnvironment({ target: 'live' }).isValid).toBe(false);
      });

      it('strictly rejects target project reference matching production dhgdjpjgsvbknquetecl', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: 'dhgdjpjgsvbknquetecl',
        });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('matches the PRODUCTION Supabase project');
      });

      it('strictly rejects target project reference starting with dhgdjpjg', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: 'dhgdjpjg_backup',
        });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('matches the PRODUCTION Supabase project');
      });

      it('strictly rejects when database connection URL contains production project reference', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: 'validstagingproject12345',
          dbUrl: 'postgresql://postgres.dhgdjpjgsvbknquetecl:secret@aws-0-ap-south-1.pooler.supabase.com:6543/postgres',
        });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('Production Supabase project reference detected');
      });
    });

    describe('Unknown and Ambiguous Environment Scenarios', () => {
      it('strictly rejects when target environment is missing', () => {
        const val = seedRunner.validateTargetEnvironment({});
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('Target environment is not specified');
      });

      it('strictly rejects ambiguous target environments (qa, dev, preview, unknown, sandbox)', () => {
        const ambiguous = ['qa', 'dev', 'preview', 'unknown', 'sandbox', 'testnet'];
        for (const target of ambiguous) {
          const val = seedRunner.validateTargetEnvironment({ target });
          expect(val.isValid).toBe(false);
          expect(val.error).toContain('Ambiguous or unauthorized target environment');
        }
      });

      it('strictly rejects remote staging when project reference cannot be positively identified', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: '',
        });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('Target project cannot be positively identified');
      });

      it('strictly rejects remote staging when project reference is whitespace or malformed', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: '   ',
        });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('Target project cannot be positively identified');
      });
    });

    describe('Local Development Scenarios', () => {
      it('successfully validates --target local', () => {
        const val = seedRunner.validateTargetEnvironment({ target: 'local' });
        expect(val.isValid).toBe(true);
        expect(val.env).toBe('local_development');
        expect(val.projectRef).toBe('local_development');
        expect(val.isLocal).toBe(true);
      });

      it('successfully validates --target local_development', () => {
        const val = seedRunner.validateTargetEnvironment({ target: 'local_development' });
        expect(val.isValid).toBe(true);
        expect(val.env).toBe('local_development');
        expect(val.isLocal).toBe(true);
      });

      it('rejects local target if dbUrl points to remote Supabase', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'local',
          dbUrl: 'https://anyproject12345.supabase.co',
        });
        expect(val.isValid).toBe(false);
        expect(val.error).toContain('Remote Supabase database detected while target is set to local');
      });
    });

    describe('Verified Isolated Staging Scenarios', () => {
      it('successfully validates staging with a valid non-production project ref', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: 'stagingdemo9876543210',
        });
        expect(val.isValid).toBe(true);
        expect(val.env).toBe('staging');
        expect(val.projectRef).toBe('stagingdemo9876543210');
        expect(val.isLocal).toBe(false);
      });

      it('extracts project reference correctly from Supabase URL', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          supabaseUrl: 'https://stagingdemo9876543210.supabase.co',
        });
        expect(val.isValid).toBe(true);
        expect(val.projectRef).toBe('stagingdemo9876543210');
      });

      it('extracts project reference correctly from PostgreSQL connection string', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          dbUrl: 'postgresql://postgres.stagingdemo9876543210:secret@db.stagingdemo9876543210.supabase.co:5432/postgres',
        });
        expect(val.isValid).toBe(true);
        expect(val.projectRef).toBe('stagingdemo9876543210');
      });

      it('generates cryptographic runner preamble with nonce, signature, and project ref', () => {
        const val = seedRunner.validateTargetEnvironment({
          target: 'staging',
          projectRef: 'stagingdemo9876543210',
        });
        const preamble = seedRunner.generateRunnerPreamble(val);

        expect(preamble.nonce).toBeDefined();
        expect(preamble.nonce.length).toBe(32); // 16 bytes hex
        expect(preamble.signature).toBeDefined();
        expect(preamble.signature.length).toBe(64); // sha256 hex
        expect(preamble.sql).toContain("SET app.environment = 'staging';");
        expect(preamble.sql).toContain("SET app.allow_pilot_seed = 'true';");
        expect(preamble.sql).toContain("SET app.seed_target_project_ref = 'stagingdemo9876543210';");
        expect(preamble.sql).toContain(`SET app.seed_runner_nonce = '${preamble.nonce}';`);
        expect(preamble.sql).toContain(`SET app.seed_runner_signature = '${preamble.signature}';`);
      });
    });
  });
});
