import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@edu-platform/database';

export function createClient() {
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

  return createBrowserClient<Database>(url, anonKey);
}
