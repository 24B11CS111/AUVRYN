import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { Database } from '@edu-platform/database';

export function createClient() {
  const cookieStore = cookies();
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (
    url &&
    (url.includes('dhgdjpjgsvbknquetecl') || url.includes('dhgdjpjg')) &&
    (process.env.NEXT_PUBLIC_APP_ENV === 'staging' ||
      process.env.VERCEL_ENV === 'preview' ||
      process.env.NODE_ENV !== 'production' ||
      process.env.NEXT_PUBLIC_ALLOW_PROD !== 'true')
  ) {
    throw new Error(
      'CRITICAL SAFETY BLOCK: Direct connection to the PRODUCTION Supabase project (dhgdjpjgsvbknquetecl) is strictly prohibited in non-production environments.'
    );
  }

  return createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options });
          } catch {
            // Can happen in Server Components (read-only cookie store)
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options });
          } catch {
            // Can happen in Server Components
          }
        },
      },
    }
  );
}

/**
 * Creates an administrative Supabase client using SUPABASE_SERVICE_ROLE_KEY.
 * Restricted strictly for server-side trusted operational scripts.
 */
export function createAdminClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is required for admin server client');
  }

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceRoleKey,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
      cookies: {
        get() {
          return undefined;
        },
        set() {},
        remove() {},
      },
    }
  );
}
