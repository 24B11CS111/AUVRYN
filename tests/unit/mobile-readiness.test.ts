import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  resolveMobileSupabaseConfig,
  inspectMobileSupabaseConfig,
} from '../../apps/mobile/src/lib/supabaseConfig';
import { formatMobileAuthError } from '../../apps/mobile/src/lib/authErrors';

describe('AUVRYN Mobile — Production Readiness & Quality Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('1. Mobile Supabase Configuration & Boundary Guards', () => {
    it('successfully resolves valid HTTPS URL and public anon key in staging', () => {
      process.env.APP_ENV = 'staging';
      process.env.NODE_ENV = 'production';

      const stagingUrl = 'https://yoficzamgwuwqpxsvlyu.supabase.co';
      const validAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.mock';

      const result = resolveMobileSupabaseConfig(stagingUrl, validAnonKey);
      expect(result.error).toBeNull();
      expect(result.config?.url).toBe(stagingUrl);
      expect(result.config?.anonKey).toBe(validAnonKey);
    });

    it('strictly blocks direct connection to production Supabase in staging builds', () => {
      process.env.APP_ENV = 'staging';
      delete process.env.ALLOW_PROD;
      delete process.env.EXPO_PUBLIC_ALLOW_PROD;

      const prodUrl = 'https://dhgdjpjgsvbknquetecl.supabase.co';
      const validAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.mock';

      const result = resolveMobileSupabaseConfig(prodUrl, validAnonKey);
      expect(result.config).toBeNull();
      expect(result.error).toContain('CRITICAL SAFETY BLOCK');
    });

    it('strictly blocks direct connection to production Supabase in preview builds', () => {
      delete process.env.APP_ENV;
      process.env.EAS_BUILD_PROFILE = 'preview';
      delete process.env.ALLOW_PROD;

      const prodUrl = 'https://dhgdjpjgsvbknquetecl.supabase.co';
      const validAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.mock';

      const result = resolveMobileSupabaseConfig(prodUrl, validAnonKey);
      expect(result.config).toBeNull();
      expect(result.error).toContain('CRITICAL SAFETY BLOCK');
    });

    it('allows production Supabase connection in official production builds', () => {
      delete process.env.APP_ENV;
      delete process.env.EXPO_PUBLIC_APP_ENV;
      delete process.env.EAS_BUILD_PROFILE;
      process.env.NODE_ENV = 'production';

      const prodUrl = 'https://dhgdjpjgsvbknquetecl.supabase.co';
      const validAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.mock';

      const result = resolveMobileSupabaseConfig(prodUrl, validAnonKey);
      expect(result.error).toBeNull();
      expect(result.config?.url).toBe(prodUrl);
    });

    it('strictly rejects service role keys in mobile applications', () => {
      const stagingUrl = 'https://yoficzamgwuwqpxsvlyu.supabase.co';
      const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoic2VydmljZV9yb2xlIn0.mock';

      const result = resolveMobileSupabaseConfig(stagingUrl, serviceRoleKey);
      expect(result.config).toBeNull();
      expect(result.error).toContain('requires a public anon or publishable key');
    });

    it('strictly rejects insecure HTTP and non-URL formats', () => {
      const result = resolveMobileSupabaseConfig('http://insecure.supabase.co', 'anon-key');
      expect(result.config).toBeNull();
      expect(result.error).toContain('URL is invalid');
    });

    it('properly diagnoses missing or placeholder configuration', () => {
      const diagnostic = inspectMobileSupabaseConfig(undefined, 'your-key');
      expect(diagnostic.urlPresent).toBe(false);
      expect(diagnostic.anonKeyPublic).toBe(false);
    });
  });

  describe('2. Mobile Authentication Error Normalization', () => {
    it('normalizes network errors gracefully', () => {
      const err = new Error('Network request failed');
      const formatted = formatMobileAuthError(err, 'sign-in');
      expect(formatted).toContain('Unable to reach the authentication service');
    });

    it('normalizes invalid credential errors cleanly without exposing internals', () => {
      const err = { message: 'Invalid login credentials' };
      const formatted = formatMobileAuthError(err, 'sign-in');
      expect(formatted).toBe('Invalid email or password.');
    });

    it('normalizes rate limiting (HTTP 429)', () => {
      const err = { status: 429, message: 'Too many requests' };
      const formatted = formatMobileAuthError(err, 'sign-in');
      expect(formatted).toContain('Too many authentication attempts');
    });

    it('normalizes unconfirmed email address during sign-in', () => {
      const err = { message: 'Email not confirmed' };
      const formatted = formatMobileAuthError(err, 'sign-in');
      expect(formatted).toContain('Email confirmation is required');
    });
  });
});
