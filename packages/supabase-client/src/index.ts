import { createClient, type SupabaseClient, type SupabaseClientOptions } from '@supabase/supabase-js';
import type { Database } from '@edu-platform/database';

export type TypedSupabaseClient = SupabaseClient<Database>;

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
}

/**
 * Validate and retrieve client configuration from environment or parameters
 */
export function getSupabaseEnvConfig(customUrl?: string, customAnonKey?: string): SupabaseConfig {
  const supabaseUrl =
    customUrl ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL
      : undefined);

  const supabaseAnonKey =
    customAnonKey ||
    (typeof process !== 'undefined'
      ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
      : undefined);

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'Missing Supabase configuration: Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or EXPO_PUBLIC_*) are configured.'
    );
  }

  return { supabaseUrl, supabaseAnonKey };
}

/**
 * Creates a standard Typed Supabase Client
 */
export function createCustomSupabaseClient(
  config: SupabaseConfig,
  options?: SupabaseClientOptions<'public'>
): TypedSupabaseClient {
  return createClient<Database>(config.supabaseUrl, config.supabaseAnonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      ...options?.auth,
    },
    ...options,
  });
}

/**
 * Normalize and convert Supabase / Auth errors into user-friendly messages
 */
export function formatSupabaseError(error: unknown): string {
  if (!error) return 'An unexpected error occurred.';

  if (typeof error === 'string') return error;

  if (typeof error === 'object' && error !== null) {
    const err = error as { message?: string; error_description?: string; code?: string; details?: string };

    if (err.error_description) return err.error_description;
    if (err.message) {
      if (err.message.includes('Invalid login credentials')) {
        return 'Invalid email or password. Please verify your credentials and try again.';
      }
      if (err.message.includes('User already registered')) {
        return 'An account with this email address already exists. Please log in instead.';
      }
      if (err.message.includes('Email not confirmed')) {
        return 'Your email address has not been confirmed. Please check your inbox for the confirmation link.';
      }
      if (err.message.includes('Password should be at least')) {
        return 'Password must be at least 8 characters long.';
      }
      if (err.message.includes('duplicate key value violates unique constraint "institutions_slug_key"')) {
        return 'This institution URL slug is already taken. Please choose a different one.';
      }
      if (err.message.includes('duplicate key value violates unique constraint "institutions_code_key"')) {
        return 'This institution code is already in use. Please choose a unique code.';
      }
      return err.message;
    }
  }

  return 'Operation failed. Please try again or contact support.';
}

export * from './realtime';

