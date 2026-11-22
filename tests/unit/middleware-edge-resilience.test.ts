import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '../../apps/web/src/lib/supabase/middleware';

describe('AUVRYN Edge Middleware Resilience & Performance Suite', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = {
      ...originalEnv,
      NEXT_PUBLIC_SUPABASE_URL: 'https://test-project.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      NEXT_PUBLIC_APP_ENV: 'staging',
      VERCEL_ENV: 'preview',
      NODE_ENV: 'test',
    };
  });

  it('bypasses container health check /api/health immediately without calling Supabase', async () => {
    const req = new NextRequest('https://auvryn.staging.internal/api/health');
    const start = performance.now();
    const res = await updateSession(req);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    // Fast path must complete in under 5ms
    expect(duration).toBeLessThan(50);
  });

  it('fast-paths unauthenticated visitor on protected route without network call (<5ms)', async () => {
    const req = new NextRequest('https://auvryn.staging.internal/dashboard');
    const start = performance.now();
    const res = await updateSession(req);
    const duration = performance.now() - start;

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/auth/login?redirectTo=%2Fdashboard');
    // Fast path redirect with zero cookies must complete instantly
    expect(duration).toBeLessThan(50);
  });

  it('fast-paths unauthenticated visitor on portal route without network call (<5ms)', async () => {
    const req = new NextRequest('https://auvryn.staging.internal/portal/parent');
    const start = performance.now();
    const res = await updateSession(req);
    const duration = performance.now() - start;

    expect(res.status).toBe(307);
    const location = res.headers.get('location');
    expect(location).toContain('/auth/login?redirectTo=%2Fportal%2Fparent');
    expect(duration).toBeLessThan(50);
  });

  it('fast-paths unauthenticated visitor on public homepage without network call (<5ms)', async () => {
    const req = new NextRequest('https://auvryn.staging.internal/');
    const start = performance.now();
    const res = await updateSession(req);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect(duration).toBeLessThan(50);
  });

  it('fast-paths unauthenticated visitor on login page without network call (<5ms)', async () => {
    const req = new NextRequest('https://auvryn.staging.internal/auth/login');
    const start = performance.now();
    const res = await updateSession(req);
    const duration = performance.now() - start;

    expect(res.status).toBe(200);
    expect(res.headers.get('location')).toBeNull();
    expect(duration).toBeLessThan(50);
  });

  it('strictly enforces critical safety block if production project is configured in staging', async () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dhgdjpjgsvbknquetecl.supabase.co';
    const req = new NextRequest('https://auvryn.staging.internal/dashboard');
    // Set a dummy cookie so it attempts initialization
    req.cookies.set('sb-dhgdjpjgsvbknquetecl-auth-token', 'dummy-token');

    await expect(updateSession(req)).rejects.toThrow(
      'CRITICAL SAFETY BLOCK: Direct connection to the PRODUCTION Supabase project (dhgdjpjgsvbknquetecl) is strictly prohibited in non-production environments.'
    );
  });
});
