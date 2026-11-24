import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  getAppEnvironment,
  isProductionSupabaseUrl,
  validateSupabaseUrlSecurity,
  getSupabaseServerConfig,
  getSupabaseAdminConfig,
  getSupabaseBrowserConfig,
  PRODUCTION_SUPABASE_PROJECT_ID,
  STAGING_SUPABASE_PROJECT_ID,
} from '../../apps/web/src/lib/supabase/env';

describe('AUVRYN Supabase Environment & Security Guard Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('getAppEnvironment()', () => {
    it('detects staging when NEXT_PUBLIC_APP_ENV is staging', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'staging';
      process.env.NODE_ENV = 'production';
      expect(getAppEnvironment()).toBe('staging');
    });

    it('detects production when NEXT_PUBLIC_APP_ENV is production', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'production';
      process.env.NODE_ENV = 'development';
      expect(getAppEnvironment()).toBe('production');
    });

    it('detects staging when VERCEL_ENV is preview', () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      process.env.VERCEL_ENV = 'preview';
      expect(getAppEnvironment()).toBe('staging');
    });

    it('detects staging when IS_PULL_REQUEST is true (e.g. Render PR Preview)', () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      process.env.IS_PULL_REQUEST = 'true';
      expect(getAppEnvironment()).toBe('staging');
    });

    it('detects production on Render when RENDER=true and NODE_ENV=production', () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      delete process.env.APP_ENV;
      delete process.env.VERCEL_ENV;
      delete process.env.IS_PULL_REQUEST;
      process.env.RENDER = 'true';
      process.env.NODE_ENV = 'production';
      expect(getAppEnvironment()).toBe('production');
    });

    it('detects development on Render when NODE_ENV is development', () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      delete process.env.APP_ENV;
      delete process.env.VERCEL_ENV;
      delete process.env.IS_PULL_REQUEST;
      process.env.RENDER = 'true';
      process.env.NODE_ENV = 'development';
      expect(getAppEnvironment()).toBe('development');
    });
  });

  describe('isProductionSupabaseUrl()', () => {
    it('identifies production project ID', () => {
      expect(isProductionSupabaseUrl(`https://${PRODUCTION_SUPABASE_PROJECT_ID}.supabase.co`)).toBe(true);
      expect(isProductionSupabaseUrl('https://dhgdjpjgsvbknquetecl.supabase.co')).toBe(true);
    });

    it('returns false for staging and local URLs', () => {
      expect(isProductionSupabaseUrl(`https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`)).toBe(false);
      expect(isProductionSupabaseUrl('http://127.0.0.1:54321')).toBe(false);
      expect(isProductionSupabaseUrl(undefined)).toBe(false);
    });
  });

  describe('validateSupabaseUrlSecurity()', () => {
    it('blocks non-production environments from connecting to production Supabase', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'staging';
      delete process.env.NEXT_PUBLIC_ALLOW_PROD;
      delete process.env.ALLOW_PROD;

      expect(() =>
        validateSupabaseUrlSecurity(`https://${PRODUCTION_SUPABASE_PROJECT_ID}.supabase.co`)
      ).toThrowError(/CRITICAL SAFETY BLOCK/);
    });

    it('allows staging environment to connect to staging Supabase', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'staging';
      expect(() =>
        validateSupabaseUrlSecurity(`https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`)
      ).not.toThrow();
    });

    it('allows production environment (e.g. Render) to connect to production Supabase', () => {
      delete process.env.NEXT_PUBLIC_APP_ENV;
      delete process.env.APP_ENV;
      process.env.RENDER = 'true';
      process.env.NODE_ENV = 'production';

      expect(() =>
        validateSupabaseUrlSecurity(`https://${PRODUCTION_SUPABASE_PROJECT_ID}.supabase.co`)
      ).not.toThrow();
    });

    it('allows explicit override with ALLOW_PROD=true if specifically flagged', () => {
      process.env.NEXT_PUBLIC_APP_ENV = 'staging';
      process.env.ALLOW_PROD = 'true';

      expect(() =>
        validateSupabaseUrlSecurity(`https://${PRODUCTION_SUPABASE_PROJECT_ID}.supabase.co`)
      ).not.toThrow();
    });
  });

  describe('Configuration Resolvers', () => {
    it('resolves server config using NEXT_PUBLIC_* variables', () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`;
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'valid-anon-key';
      delete process.env.SUPABASE_URL;
      delete process.env.SUPABASE_ANON_KEY;

      const config = getSupabaseServerConfig();
      expect(config.url).toBe(`https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`);
      expect(config.anonKey).toBe('valid-anon-key');
    });

    it('resolves server config fallback using server-only SUPABASE_* variables', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      process.env.SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`;
      process.env.SUPABASE_ANON_KEY = 'valid-server-anon-key';

      const config = getSupabaseServerConfig();
      expect(config.url).toBe(`https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`);
      expect(config.anonKey).toBe('valid-server-anon-key');
    });

    it('throws descriptive error if URL or Key is missing', () => {
      delete process.env.NEXT_PUBLIC_SUPABASE_URL;
      delete process.env.SUPABASE_URL;
      delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
      delete process.env.SUPABASE_ANON_KEY;

      expect(() => getSupabaseServerConfig()).toThrowError(
        /Missing required Supabase server configuration/
      );
    });

    it('resolves admin config requiring service role key', () => {
      process.env.SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`;
      process.env.SUPABASE_SERVICE_ROLE_KEY = 'valid-service-role-key';

      const adminConfig = getSupabaseAdminConfig();
      expect(adminConfig.url).toBe(`https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`);
      expect(adminConfig.serviceRoleKey).toBe('valid-service-role-key');
    });

    it('throws error if admin service role key is missing', () => {
      process.env.SUPABASE_URL = `https://${STAGING_SUPABASE_PROJECT_ID}.supabase.co`;
      delete process.env.SUPABASE_SERVICE_ROLE_KEY;

      expect(() => getSupabaseAdminConfig()).toThrowError(
        /SUPABASE_SERVICE_ROLE_KEY/
      );
    });
  });
});
