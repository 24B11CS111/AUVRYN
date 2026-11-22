import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@edu-platform/database';

const AUTH_TIMEOUT_MS = 2000;

/**
 * Execute a promise with a hard timeout ceiling to ensure
 * Edge Middleware never exceeds Vercel execution limits.
 */
function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  errorMessage = 'Auth verification timed out'
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(errorMessage)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timer);
  });
}

/**
 * Checks whether any Supabase auth session token cookies are present in the request.
 * Supabase auth tokens follow the pattern: sb-<project-ref>-auth-token or sb-<project-ref>-auth-token.<chunk>
 */
function hasAuthSessionCookies(request: NextRequest): boolean {
  const allCookies = request.cookies.getAll();
  return allCookies.some(
    (cookie) => cookie.name.includes('auth-token') || cookie.name.startsWith('sb-')
  );
}

export async function updateSession(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Direct health check bypass: do not invoke Supabase auth on container probes
  if (pathname === '/api/health' || pathname.startsWith('/api/health')) {
    return NextResponse.next();
  }

  const isProtectedRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/onboarding') ||
    pathname.startsWith('/portal') ||
    pathname.startsWith('/hrix-admin') ||
    pathname.startsWith('/auth/select-institution');

  const isAuthRoute =
    pathname === '/auth/login' ||
    pathname === '/auth/register';

  // FAST-PATH 1: If request has NO session cookies at all:
  // - If visiting a protected route -> immediate redirect to login (0ms network)
  // - If visiting a public / auth route -> immediate next() (0ms network)
  const hasSessionCookie = hasAuthSessionCookies(request);

  if (!hasSessionCookie) {
    if (isProtectedRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Configuration guard
  if (!url || !anonKey) {
    if (isProtectedRoute) {
      const loginUrl = request.nextUrl.clone();
      loginUrl.pathname = '/auth/login';
      loginUrl.searchParams.set('redirectTo', pathname);
      loginUrl.searchParams.set('error', 'configuration_missing');
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
  }

  // Safety guard against connecting to production database in non-production environments
  if (
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

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient<Database>(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set({ name, value, ...options })
          );
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  // Authenticated user resolution with strict timeout ceiling
  let user = null;
  try {
    const { data, error } = await withTimeout(
      supabase.auth.getUser(),
      AUTH_TIMEOUT_MS,
      'Supabase auth verification timed out'
    );
    if (!error && data?.user) {
      user = data.user;
    }
  } catch (err) {
    console.warn('Middleware auth verification error or timeout:', err);
    user = null;
  }

  // If user is not authenticated and trying to access protected route, redirect to login
  if (!user && isProtectedRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = '/auth/login';
    redirectUrl.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(redirectUrl);
  }

  // If user is already authenticated and visits login/register, redirect to destination or dashboard
  if (user && isAuthRoute) {
    const redirectTo = request.nextUrl.searchParams.get('redirectTo');
    const redirectUrl = request.nextUrl.clone();
    // Validate redirectTo is a safe internal relative path
    if (redirectTo && redirectTo.startsWith('/') && !redirectTo.startsWith('//')) {
      redirectUrl.pathname = redirectTo;
      redirectUrl.searchParams.delete('redirectTo');
    } else {
      redirectUrl.pathname = '/dashboard';
    }
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
