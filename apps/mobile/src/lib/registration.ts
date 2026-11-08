import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@edu-platform/database';
import { formatMobileAuthError } from './authErrors';
import { SUPABASE_CONFIGURATION_ERROR } from './supabaseConfig';

export type MobileRegistrationClient = Pick<SupabaseClient<Database>, 'auth'> | null;

export type MobileRegistrationResult =
  | { ok: true; requiresEmailConfirmation: boolean }
  | { ok: false; error: string };

export async function registerAdminAccount(
  client: MobileRegistrationClient,
  input: { fullName: string; email: string; password: string }
): Promise<MobileRegistrationResult> {
  if (!client) {
    return { ok: false, error: SUPABASE_CONFIGURATION_ERROR };
  }

  try {
    const { data, error } = await client.auth.signUp({
      email: input.email.trim(),
      password: input.password,
      options: {
        data: { full_name: input.fullName.trim() },
      },
    });

    if (error) {
      return { ok: false, error: formatMobileAuthError(error, 'registration') };
    }

    return { ok: true, requiresEmailConfirmation: !data.session };
  } catch (error) {
    return { ok: false, error: formatMobileAuthError(error, 'registration') };
  }
}