import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { type NextRequest, NextResponse } from 'next/server';
import type { Database } from '@edu-platform/database';
import { getSupabaseServerConfig } from '@/lib/supabase/env';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/dashboard';

  if (code) {
    const cookieStore = request.cookies;
    const response = NextResponse.redirect(new URL(next, origin));

    try {
      const { url, anonKey } = getSupabaseServerConfig();

      const supabase = createServerClient<Database>(
        url,
        anonKey,
        {
          cookies: {
            get(name: string) {
              return cookieStore.get(name)?.value;
            },
            set(name: string, value: string, options: CookieOptions) {
              response.cookies.set({ name, value, ...options });
            },
            remove(name: string, options: CookieOptions) {
              response.cookies.set({ name, value: '', ...options });
            },
          },
        }
      );

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return response;
      }
    } catch (err) {
      console.error('Auth callback exchange error:', err);
    }
  }

  // Return user to an error or login page if code exchange fails
  return NextResponse.redirect(new URL('/auth/login?error=auth-callback-failed', origin));
}
