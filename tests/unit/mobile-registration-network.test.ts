import { describe, expect, it, vi } from 'vitest';
import { formatMobileAuthError } from '../../apps/mobile/src/lib/authErrors';
import { registerAdminAccount, type MobileRegistrationClient } from '../../apps/mobile/src/lib/registration';
import {
  initializeMobileSupabaseClient,
  inspectMobileSupabaseConfig,
  resolveMobileSupabaseConfig,
  SUPABASE_CONFIGURATION_ERROR,
  SUPABASE_PUBLIC_KEY_ERROR,
  SUPABASE_URL_ERROR,
} from '../../apps/mobile/src/lib/supabaseConfig';

const validUrl = 'https://school-project.supabase.co';
const publicKey = `header.${Buffer.from(JSON.stringify({ role: 'anon' })).toString('base64url')}.signature`;

describe('mobile Supabase configuration', () => {
  it('reports missing build-time public variables without creating a client', () => {
    const config = resolveMobileSupabaseConfig(undefined, undefined);
    const createClient = vi.fn();

    expect(config).toEqual({ config: null, error: SUPABASE_CONFIGURATION_ERROR });
    expect(initializeMobileSupabaseClient(config, createClient)).toBeNull();
    expect(createClient).not.toHaveBeenCalled();
  });

  it('reports variable presence and validity without returning credential values', () => {
    expect(inspectMobileSupabaseConfig(undefined, publicKey)).toEqual({
      urlPresent: false,
      anonKeyPresent: true,
      urlValid: false,
      anonKeyPublic: true,
    });
  });

  it('rejects invalid and localhost project URLs', () => {
    expect(resolveMobileSupabaseConfig('not-a-url', publicKey).error).toBe(SUPABASE_URL_ERROR);
    expect(resolveMobileSupabaseConfig('http://localhost:54321', publicKey).error).toBe(
      SUPABASE_URL_ERROR
    );
  });

  it('rejects service-role and secret keys for a mobile client', () => {
    const legacyServiceRoleToken = `header.${Buffer.from(
      JSON.stringify({ role: 'service_role' })
    ).toString('base64url')}.signature`;

    expect(resolveMobileSupabaseConfig(validUrl, 'sb_secret_do_not_use').error).toBe(
      SUPABASE_PUBLIC_KEY_ERROR
    );
    expect(resolveMobileSupabaseConfig(validUrl, 'legacy_service_role_key').error).toBe(
      SUPABASE_PUBLIC_KEY_ERROR
    );
    expect(resolveMobileSupabaseConfig(validUrl, legacyServiceRoleToken).error).toBe(
      SUPABASE_PUBLIC_KEY_ERROR
    );
    expect(resolveMobileSupabaseConfig(validUrl, 'not-a-public-key').error).toBe(
      SUPABASE_PUBLIC_KEY_ERROR
    );
  });

  it('initializes the client only with a valid HTTPS URL and public key', () => {
    const config = resolveMobileSupabaseConfig(validUrl, publicKey);
    const createClient = vi.fn(() => ({ initialized: true }));

    expect(initializeMobileSupabaseClient(config, createClient)).toEqual({ initialized: true });
    expect(createClient).toHaveBeenCalledWith(validUrl, publicKey);
  });
});

describe('mobile registration service', () => {
  const input = {
    fullName: '  Admin User  ',
    email: '  admin@example.edu  ',
    password: 'StrongPassword123',
  };

  it('sends normalized metadata through Supabase signup and reports email confirmation', async () => {
    const signUp = vi.fn().mockResolvedValue({ data: { session: null }, error: null });
    const client = { auth: { signUp } } as unknown as MobileRegistrationClient;

    await expect(registerAdminAccount(client, input)).resolves.toEqual({
      ok: true,
      requiresEmailConfirmation: true,
    });
    expect(signUp).toHaveBeenCalledWith({
      email: 'admin@example.edu',
      password: input.password,
      options: { data: { full_name: 'Admin User' } },
    });
  });

  it('maps transport failures separately from Supabase Auth rejections', async () => {
    const networkMessage = 'Unable to reach the authentication service. Check your internet connection and the configured Supabase project URL.';
    const networkClient = {
      auth: { signUp: vi.fn().mockRejectedValue(new TypeError('Network request failed')) },
    } as unknown as MobileRegistrationClient;
    const rejectedClient = {
      auth: {
        signUp: vi.fn().mockResolvedValue({
          data: { session: null },
          error: { code: 'email_exists', status: 422, message: 'User already registered' },
        }),
      },
    } as unknown as MobileRegistrationClient;

    await expect(registerAdminAccount(networkClient, input)).resolves.toEqual({
      ok: false,
      error: networkMessage,
    });
    await expect(registerAdminAccount(rejectedClient, input)).resolves.toEqual({
      ok: false,
      error: 'An account with this email already exists. Sign in or use a different email address.',
    });
    expect(formatMobileAuthError({ status: 400, message: 'invalid data' }, 'registration')).toBe(
      'Supabase rejected the registration request. Check the email and password details and try again.'
    );
  });

  it('returns a configuration error instead of sending signup when no client exists', async () => {
    await expect(registerAdminAccount(null, input)).resolves.toEqual({
      ok: false,
      error: SUPABASE_CONFIGURATION_ERROR,
    });
  });
});