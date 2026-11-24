export type MobileAuthOperation = 'sign-in' | 'registration' | 'password-reset';

interface AuthErrorDetails {
  code?: unknown;
  message?: unknown;
  name?: unknown;
  status?: unknown;
}

export function formatMobileAuthError(
  error: unknown,
  operation: MobileAuthOperation
): string {
  const details =
    typeof error === 'object' && error !== null ? (error as AuthErrorDetails) : {};
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : '';
  const message = typeof details.message === 'string' ? details.message.toLowerCase() : '';
  const name = typeof details.name === 'string' ? details.name.toLowerCase() : '';
  const searchable = `${code} ${message} ${name}`;

  if (/network request failed|failed to fetch|fetch failed|networkerror|enotfound|econn|etimedout|timeout/.test(searchable)) {
    return 'Unable to reach the authentication service. Check your internet connection and the configured Supabase project URL.';
  }

  if (/user_already_exists|email_exists|already registered/.test(searchable)) {
    return 'An account with this email already exists. Sign in or use a different email address.';
  }

  if (/email_not_confirmed|email not confirmed/.test(searchable)) {
    return 'Email confirmation is required. Check your inbox for the confirmation link.';
  }

  if (/invalid_credentials|invalid login credentials|invalid email or password/.test(searchable)) {
    return 'Invalid email or password.';
  }

  if (/weak_password|password should be at least|password.*too short/.test(searchable)) {
    return 'The password does not meet the requirements. Use at least 8 characters.';
  }

  const status = typeof details.status === 'number' ? details.status : undefined;
  if (status === 429) {
    return 'Too many authentication attempts. Wait a moment and try again.';
  }
  if (status !== undefined && status >= 500) {
    return 'The authentication service is temporarily unavailable. Try again later.';
  }
  if (status !== undefined && status >= 400) {
    if (operation === 'registration') {
      return 'Supabase rejected the registration request. Check the email and password details and try again.';
    }
    if (operation === 'password-reset') {
      return 'Supabase rejected the password reset request. Check your email and try again.';
    }
    return 'Supabase rejected the sign-in request. Check your email and password.';
  }

  return 'Unable to complete the authentication request. Check your connection and try again.';
}