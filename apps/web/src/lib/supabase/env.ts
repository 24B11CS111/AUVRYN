/**
 * AUVRYN Authoritative Environment & Supabase Configuration Module
 *
 * Centralizes environment detection across local development, Vercel, and Render.
 * Enforces production database boundary guards and safe client initialization.
 */

export type AppEnvironment = 'development' | 'staging' | 'production';

export const PRODUCTION_SUPABASE_PROJECT_ID = 'dhgdjpjgsvbknquetecl';
export const STAGING_SUPABASE_PROJECT_ID = 'yoficzamgwuwqpxsvlyu';

/**
 * Authoritatively determines the current execution environment:
 * - 'development': Local development machines and automated tests
 * - 'staging': Staging servers, Vercel preview deployments, and Render PR previews
 * - 'production': Official production deployments on Render or Vercel
 */
export function getAppEnvironment(): AppEnvironment {
  // 1. Explicit user/platform environment configuration takes precedence
  const explicitEnv = (
    process.env.NEXT_PUBLIC_APP_ENV ||
    process.env.APP_ENV ||
    process.env.DEPLOYMENT_ENV ||
    ''
  ).toLowerCase().trim();

  if (explicitEnv === 'staging') {
    return 'staging';
  }

  if (explicitEnv === 'production' || explicitEnv === 'prod') {
    return 'production';
  }

  if (explicitEnv === 'development' || explicitEnv === 'dev' || explicitEnv === 'local') {
    return 'development';
  }

  // 2. Platform PR / Preview indicators strictly indicate staging
  if (process.env.VERCEL_ENV === 'preview' || process.env.IS_PULL_REQUEST === 'true') {
    return 'staging';
  }

  // 3. Platform Production indicators
  if (process.env.VERCEL_ENV === 'production') {
    return 'production';
  }

  // 4. Render Web Service detection
  if (process.env.RENDER === 'true') {
    // If running on Render in production mode and not a PR preview, it is production
    if (process.env.NODE_ENV === 'production') {
      return 'production';
    }
    return 'development';
  }

  // 5. Fallback to NODE_ENV
  if (process.env.NODE_ENV === 'production') {
    return 'production';
  }

  return 'development';
}

/**
 * Checks whether a given Supabase URL points to the PRODUCTION project.
 */
export function isProductionSupabaseUrl(url: string | undefined | null): boolean {
  if (!url) return false;
  return url.includes(PRODUCTION_SUPABASE_PROJECT_ID) || url.includes('dhgdjpjg');
}

/**
 * Validates that connecting to the production database is only allowed in production environments.
 * Throws a CRITICAL SAFETY BLOCK if a non-production environment attempts to connect to production.
 */
export function validateSupabaseUrlSecurity(url: string | undefined | null): void {
  if (!url) return;

  if (isProductionSupabaseUrl(url)) {
    const env = getAppEnvironment();
    const isAllowProd =
      process.env.NEXT_PUBLIC_ALLOW_PROD === 'true' ||
      process.env.ALLOW_PROD === 'true';

    // Disallow production database in non-production environments
    if (env !== 'production' && !isAllowProd) {
      throw new Error(
        `CRITICAL SAFETY BLOCK: Direct connection to the PRODUCTION Supabase project (${PRODUCTION_SUPABASE_PROJECT_ID}) is strictly prohibited in non-production environments.`
      );
    }
  }
}

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

/**
 * Server-side Supabase configuration resolver.
 * Supports standard NEXT_PUBLIC_* variables as well as server-only SUPABASE_URL / SUPABASE_ANON_KEY.
 * Produces clear, actionable error messages if variables are missing or invalid.
 */
export function getSupabaseServerConfig(): SupabaseConfig {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    const missing: string[] = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_ANON_KEY)');
    throw new Error(
      `Missing required Supabase server configuration: ${missing.join(' and ')} must be configured in environment variables.`
    );
  }

  validateSupabaseUrlSecurity(url);

  return { url, anonKey };
}

/**
 * Admin server-side Supabase configuration resolver.
 * Strictly requires SUPABASE_SERVICE_ROLE_KEY.
 */
export function getSupabaseAdminConfig(): { url: string; serviceRoleKey: string } {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '').trim();
  const serviceRoleKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();

  if (!url || !serviceRoleKey) {
    const missing: string[] = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL (or SUPABASE_URL)');
    if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');
    throw new Error(
      `Missing required Supabase admin configuration: ${missing.join(' and ')} must be configured in environment variables.`
    );
  }

  validateSupabaseUrlSecurity(url);

  return { url, serviceRoleKey };
}

/**
 * Browser-side Supabase configuration resolver.
 * Strictly uses public-safe keys only.
 */
export function getSupabaseBrowserConfig(): SupabaseConfig {
  const url = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();
  const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '').trim();

  if (!url || !anonKey) {
    const missing: string[] = [];
    if (!url) missing.push('NEXT_PUBLIC_SUPABASE_URL');
    if (!anonKey) missing.push('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    throw new Error(
      `Missing required Supabase client configuration: ${missing.join(' and ')} must be configured.`
    );
  }

  validateSupabaseUrlSecurity(url);

  return { url, anonKey };
}
