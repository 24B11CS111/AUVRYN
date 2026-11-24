import { createBrowserClient } from '@supabase/ssr';
import type { Database } from '@edu-platform/database';
import { getSupabaseBrowserConfig } from './env';

export function createClient() {
  const { url, anonKey } = getSupabaseBrowserConfig();

  return createBrowserClient<Database>(url, anonKey);
}
