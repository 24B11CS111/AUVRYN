export const SUPABASE_CONFIGURATION_ERROR =
  'Supabase is not configured in this app build. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in the EAS build environment, then rebuild.';

export const SUPABASE_URL_ERROR =
  'The Supabase URL is invalid. Configure a reachable HTTPS Supabase project URL and rebuild the app.';

export const SUPABASE_PUBLIC_KEY_ERROR =
  'The mobile app requires a public anon or publishable key. Service-role and secret keys must never be used in a mobile app.';

export interface MobileSupabaseConfig {
  url: string;
  anonKey: string;
}

export interface MobileSupabaseConfigDiagnostic {
  urlPresent: boolean;
  anonKeyPresent: boolean;
  urlValid: boolean;
  anonKeyPublic: boolean;
}

export type MobileSupabaseConfigResult =
  | { config: MobileSupabaseConfig; error: null }
  | { config: null; error: string };

function decodeBase64UrlAscii(value: string): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/');
  let accumulator = 0;
  let bitCount = 0;
  let decoded = '';

  for (const character of normalized) {
    if (character === '=') break;
    const digit = alphabet.indexOf(character);
    if (digit < 0) return '';
    accumulator = (accumulator << 6) | digit;
    bitCount += 6;
    if (bitCount >= 8) {
      bitCount -= 8;
      decoded += String.fromCharCode((accumulator >> bitCount) & 0xff);
    }
  }

  return decoded;
}

function getJwtRole(key: string): string | null {
  const payload = key.split('.')[1];
  if (!payload) return null;
  return decodeBase64UrlAscii(payload).match(/"role"\s*:\s*"([^"]+)"/i)?.[1]?.toLowerCase() ?? null;
}

function isServiceRoleKey(key: string): boolean {
  return /^sb_secret_/i.test(key) || /service[_-]?role/i.test(key) || getJwtRole(key) === 'service_role';
}

function isPublicAnonKey(key: string): boolean {
  return /^sb_publishable_[a-z0-9_-]+$/i.test(key) || getJwtRole(key) === 'anon';
}

export function initializeMobileSupabaseClient<TClient>(
  result: MobileSupabaseConfigResult,
  createClient: (url: string, anonKey: string) => TClient
): TClient | null {
  return result.config ? createClient(result.config.url, result.config.anonKey) : null;
}

export function inspectMobileSupabaseConfig(
  urlValue?: string,
  anonKeyValue?: string
): MobileSupabaseConfigDiagnostic {
  const url = urlValue?.trim();
  const anonKey = anonKeyValue?.trim();
  let urlValid = false;

  if (url && !/your[-_ ]?project|placeholder|dummy/i.test(url)) {
    try {
      const parsedUrl = new URL(url);
      urlValid =
        parsedUrl.protocol === 'https:' &&
        Boolean(parsedUrl.hostname) &&
        !['localhost', '127.0.0.1', '::1'].includes(parsedUrl.hostname.toLowerCase());
    } catch {
      urlValid = false;
    }
  }

  return {
    urlPresent: Boolean(url),
    anonKeyPresent: Boolean(anonKey),
    urlValid,
    anonKeyPublic: Boolean(anonKey && isPublicAnonKey(anonKey) && !isServiceRoleKey(anonKey)),
  };
}

export function resolveMobileSupabaseConfig(
  urlValue?: string,
  anonKeyValue?: string
): MobileSupabaseConfigResult {
  const url = urlValue?.trim();
  const anonKey = anonKeyValue?.trim();

  if (
    !url ||
    !anonKey ||
    /your[-_ ]?project|placeholder|dummy/i.test(url) ||
    /your[-_ ]?key|placeholder|dummy/i.test(anonKey)
  ) {
    return { config: null, error: SUPABASE_CONFIGURATION_ERROR };
  }

  const diagnostic = inspectMobileSupabaseConfig(url, anonKey);
  if (!diagnostic.urlValid) {
    return { config: null, error: SUPABASE_URL_ERROR };
  }
  if (!diagnostic.anonKeyPublic) {
    return { config: null, error: SUPABASE_PUBLIC_KEY_ERROR };
  }

  return { config: { url: url.replace(/\/+$/, ''), anonKey }, error: null };
}