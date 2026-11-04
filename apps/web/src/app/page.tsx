import Link from 'next/link';
import { getSessionContext } from '@/lib/auth';
import { redirect } from 'next/navigation';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Cpu,
  Landmark,
  ShieldCheck,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';

export default async function HomePage() {
  const session = await getSessionContext();

  // If already authenticated and member of an institution, take them straight to dashboard
  if (session?.user) {
    if (session.memberships.length > 0) {
      redirect('/dashboard');
    } else {
      redirect('/onboarding');
    }
  }

  const institutionTypes = [
    {
      title: 'K-12 Schools',
      description: 'Streamlined section management, grade books, and parent-student portals.',
      icon: <GraduationCap className="w-6 h-6 text-indigo-600" />,
    },
    {
      title: 'Junior Colleges / +2',
      description: 'Stream tracking, competitive batch monitoring, and attendance workflows.',
      icon: <BookOpen className="w-6 h-6 text-sky-600" />,
    },
    {
      title: 'Degree Colleges',
      description: 'Semester-based academic tracking, department structures, and credit systems.',
      icon: <Building2 className="w-6 h-6 text-emerald-600" />,
    },
    {
      title: 'Engineering Colleges',
      description: 'Branch allocation, lab tracks, technical accreditation, and semester audits.',
      icon: <Cpu className="w-6 h-6 text-violet-600" />,
    },
    {
      title: 'Universities',
      description: 'Multi-constituent campus management, decentralized faculty administration.',
      icon: <Landmark className="w-6 h-6 text-amber-600" />,
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
              E
            </div>
            <div>
              <span className="font-bold text-slate-900 tracking-tight text-base sm:text-lg">
                EduPlatform
              </span>
              <span className="ml-2 text-xs font-medium px-2 py-0.5 rounded bg-slate-100 text-slate-600 hidden sm:inline-block">
                Multi-Tenant Enterprise
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/auth/login"
              className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3.5 py-2 rounded-lg transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/auth/register"
              className="text-sm font-medium text-white bg-slate-900 hover:bg-slate-800 px-4 py-2 rounded-lg transition-colors shadow-sm"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 mb-6">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Database-Level Tenant Isolation & Row Level Security</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
            Unified Education Management for Every Tier of Learning
          </h1>

          <p className="mt-6 text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            One cohesive platform architected for schools, junior colleges, degree colleges,
            engineering institutes, and universities with strict multi-tenant data boundaries.
          </p>

          <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/auth/register"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-slate-900 text-white font-semibold text-base shadow-sm hover:bg-slate-800 transition-colors"
            >
              <span>Create Institution</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/auth/login"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white border border-slate-300 text-slate-700 font-semibold text-base shadow-sm hover:bg-slate-50 transition-colors"
            >
              Sign In to Your Account
            </Link>
          </div>
        </div>

        {/* Institution Type Support Grid */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
              Tailored Architecture for All Academic Models
            </h2>
            <p className="mt-2 text-sm text-slate-500">
              Configurable terminology, term systems, and departmental hierarchies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {institutionTypes.map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl border border-slate-200/80 p-5 shadow-sm hover:border-slate-300 transition-all text-left flex flex-col justify-between"
              >
                <div>
                  <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center mb-4">
                    {item.icon}
                  </div>
                  <h3 className="font-semibold text-slate-900 text-sm mb-1.5">
                    {item.title}
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {item.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Architecture Highlights */}
          <div className="mt-16 bg-white rounded-2xl border border-slate-200/80 p-8 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0">
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Multi-Tenant Isolation</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Every query is scoped by tenant institution ID at the database layer via PostgreSQL Row Level Security.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 border border-emerald-100 flex items-center justify-center shrink-0">
                <Users className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Multi-Membership & RBAC</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Single identity supporting distinct roles (Owner, Admin, Faculty, Student) across multiple institutions.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-4">
              <div className="w-10 h-10 rounded-lg bg-sky-50 border border-sky-100 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-sky-600" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 text-sm">Audited Operations</h4>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Immutable event ledger logging administrative and governance actions across all tenant nodes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500">
          EduPlatform Architecture &bull; Clean Architecture Monorepo &bull; Next.js + React Native / Expo + Supabase
        </div>
      </footer>
    </div>
  );
}
