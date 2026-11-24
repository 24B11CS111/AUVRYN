'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginInput } from '@edu-platform/validators';
import { formatSupabaseError } from '@edu-platform/supabase-client';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Alert } from '@/components/ui/Alert';
import { Lock, Mail, Loader2, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { AuvrynLogo } from '@/components/branding';
import { determinePostLoginRedirectAction } from '@/app/auth/actions';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const explicitRedirect = searchParams.get('redirectTo');

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  // Load remembered email if present
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedEmail = localStorage.getItem('auvryn_remembered_email');
      if (savedEmail) {
        setValue('email', savedEmail);
      }
    }
  }, [setValue]);

  const onSubmit = async (values: LoginInput) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        setServerError(formatSupabaseError(error));
        setIsLoading(false);
        return;
      }

      // Handle remember-me preference
      if (typeof window !== 'undefined') {
        if (rememberMe) {
          localStorage.setItem('auvryn_remembered_email', values.email);
        } else {
          localStorage.removeItem('auvryn_remembered_email');
        }
      }

      // Check if user had an explicit destination (not the default /dashboard)
      if (
        explicitRedirect &&
        explicitRedirect.startsWith('/') &&
        !explicitRedirect.startsWith('//') &&
        explicitRedirect !== '/dashboard'
      ) {
        router.push(explicitRedirect);
        router.refresh();
        return;
      }

      // Smart server-side role & membership resolution
      const postLoginResult = await determinePostLoginRedirectAction();
      const targetDestination = postLoginResult.destination || '/dashboard';

      router.push(targetDestination);
      router.refresh();
    } catch (err) {
      setServerError(formatSupabaseError(err));
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/80 rounded-2xl sm:px-10">
      {serverError && (
        <div className="mb-6">
          <Alert variant="error">{serverError}</Alert>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
        <Input
          label="Email address"
          type="email"
          autoComplete="email"
          placeholder="name@institution.edu"
          leftIcon={<Mail className="w-4 h-4 text-slate-400" />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider text-[#17243A]"
            >
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-xs font-medium text-[#2563EB] hover:text-[#0B1E3F] hover:underline"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative rounded-lg shadow-sm">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="block w-full rounded-lg border border-[#E2E8F0] bg-white pl-10 pr-10 py-2 text-sm text-[#17243A] placeholder:text-slate-400 transition-colors focus:outline-none focus:ring-2 focus:ring-[#2563EB]/25 focus:border-[#2563EB]"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600 focus:outline-none"
              tabIndex={-1}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {errors.password?.message && (
            <p className="text-xs text-[#DC4545] font-medium mt-1">
              {errors.password.message}
            </p>
          )}
        </div>

        <div className="flex items-center justify-between pt-1">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-slate-300 text-[#2563EB] focus:ring-[#2563EB]/25"
            />
            <span className="text-xs text-slate-600 font-medium">Remember this session</span>
          </label>
        </div>

        <Button
          type="submit"
          variant="primary"
          className="w-full mt-2 bg-[#2563EB] hover:bg-[#1D4ED8] text-white font-semibold py-2.5 rounded-lg transition-colors shadow-xs"
          isLoading={isLoading}
        >
          {isLoading ? 'Verifying Credentials...' : 'Sign In to AUVRYN'}
        </Button>
      </form>

      <div className="mt-6 border-t border-slate-200 pt-5 text-center text-sm text-slate-600">
        Don&apos;t have an account?{' '}
        <Link
          href="/auth/register"
          className="font-semibold text-[#2563EB] hover:text-[#0B1E3F] hover:underline"
        >
          Register an institution
        </Link>
      </div>

      <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-center gap-1.5 text-[11px] text-slate-400">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
        <span>Enterprise RBAC &bull; Database-Isolated Multi-Tenancy</span>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex flex-col justify-center py-12 sm:px-6 lg:px-8 bg-[#F5F7FB]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <div className="flex justify-center mb-4">
          <AuvrynLogo variant="primary" size="md" showDescriptor={true} showTagline={true} href="/" />
        </div>
        <h2 className="text-xl font-bold tracking-tight text-[#0B1E3F]">
          Sign in to your account
        </h2>
        <p className="mt-1.5 text-xs text-slate-500">
          Access your institution dashboard, academic portal, or workspace
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <Suspense
          fallback={
            <div className="bg-white py-12 px-6 shadow-sm border border-slate-200/80 rounded-2xl flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
