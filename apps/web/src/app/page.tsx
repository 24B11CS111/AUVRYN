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
  Layers,
  ArrowRight,
  Sparkles,
  Brain,
} from 'lucide-react';
import { AuvrynLogo } from '@/components/branding';
import { LandingClientWrapper } from '@/components/home/LandingClientWrapper';

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
      icon: <GraduationCap className="w-6 h-6 text-[#2563EB]" />,
    },
    {
      title: 'Junior Colleges / +2',
      description: 'Stream tracking, competitive batch monitoring, and attendance workflows.',
      icon: <BookOpen className="w-6 h-6 text-[#1D4ED8]" />,
    },
    {
      title: 'Degree Colleges',
      description: 'Semester-based academic tracking, department structures, and credit systems.',
      icon: <Building2 className="w-6 h-6 text-[#0B1E3F]" />,
    },
    {
      title: 'Engineering Colleges',
      description: 'Branch allocation, lab tracks, technical accreditation, and semester audits.',
      icon: <Cpu className="w-6 h-6 text-[#2563EB]" />,
    },
    {
      title: 'Universities',
      description: 'Multi-constituent campus management, decentralized faculty administration.',
      icon: <Landmark className="w-6 h-6 text-[#142C4C]" />,
    },
  ];

  return (
    <LandingClientWrapper>
      <div className="min-h-screen flex flex-col bg-[#F5F7FB]">
        {/* Top Header */}
        <header className="border-b border-[#E2E8F0] bg-white/90 backdrop-blur-md sticky top-0 z-40">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
            <AuvrynLogo variant="horizontal" size="sm" showDescriptor={true} href="/" />

            <div className="flex items-center gap-3">
              <Link
                href="/auth/login"
                className="text-xs sm:text-sm font-semibold text-[#17243A] hover:text-[#2563EB] px-3.5 py-2 rounded-lg transition-colors"
              >
                Sign In
              </Link>
              <Link
                href="/auth/register"
                className="text-xs sm:text-sm font-semibold text-white bg-[#0B1E3F] hover:bg-[#142C4C] px-4 py-2 rounded-lg transition-all shadow-sm active:scale-95"
              >
                Get Started
              </Link>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 sm:pt-24 sm:pb-28 text-center">
            {/* Intelligent Ecosystem Pill */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#EAF2FF] border border-[#BFDBFE] text-xs font-semibold text-[#2563EB] mb-6 shadow-xs">
              <Sparkles className="w-4 h-4 text-[#2563EB]" />
              <span>THE INTELLIGENT EDUCATION ECOSYSTEM &bull; ENTERPRISE RLS ISOLATION</span>
            </div>

            <h1 className="text-4xl sm:text-6xl font-extrabold text-[#0B1E3F] tracking-tight max-w-4xl mx-auto leading-tight sm:leading-tight">
              One Institution. One Intelligent System.
            </h1>

            <p className="mt-6 text-base sm:text-xl text-[#64748B] max-w-2xl mx-auto leading-relaxed">
              AUVRYN connects students, teachers, parents, administrators and institutions through intelligent operations, unified academics, automation and AI.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                href="/auth/register"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#0B1E3F] text-white font-semibold text-sm sm:text-base shadow-sm hover:bg-[#142C4C] transition-all active:scale-95"
              >
                <span>Deploy Institution Workspace</span>
                <ArrowRight className="w-4 h-4 text-[#2563EB]" />
              </Link>
              <Link
                href="/auth/login"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-white border border-[#E2E8F0] text-[#17243A] font-semibold text-sm sm:text-base shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all active:scale-95"
              >
                Access Portal
              </Link>
            </div>
          </div>

          {/* Academic Model Grid */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
            <div className="text-center mb-12">
              <h2 className="text-2xl font-bold text-[#0B1E3F] tracking-tight">
                Architected for Every Tier of Education
              </h2>
              <p className="mt-2 text-sm text-[#64748B]">
                Native support for diverse hierarchies, academic terms, grading systems, and student lifecycles.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              {institutionTypes.map((item, index) => (
                <div
                  key={index}
                  className="bg-white rounded-xl border border-[#E2E8F0] p-5 shadow-xs hover:border-[#BFDBFE] hover:shadow-md transition-all text-left flex flex-col justify-between"
                >
                  <div>
                    <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] border border-[#BFDBFE]/50 flex items-center justify-center mb-4">
                      {item.icon}
                    </div>
                    <h3 className="font-semibold text-[#0B1E3F] text-sm mb-1.5">
                      {item.title}
                    </h3>
                    <p className="text-xs text-[#64748B] leading-relaxed">
                      {item.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Architecture Highlights */}
            <div className="mt-16 bg-white rounded-2xl border border-[#E2E8F0] p-8 shadow-xs grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                  <Brain className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#0B1E3F] text-sm">Intelligent AI Engines</h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Socratic student tutoring, automated lesson planning, executive reporting, and parent companions with PII redaction.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#0B1E3F] text-sm">PostgreSQL Row-Level Security</h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Absolute tenant isolation where cross-institution data leakage is mathematically prevented at the database kernel.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-[#EAF2FF] border border-[#BFDBFE] flex items-center justify-center shrink-0">
                  <Layers className="w-5 h-5 text-[#2563EB]" />
                </div>
                <div>
                  <h4 className="font-semibold text-[#0B1E3F] text-sm">Unified Web & Mobile Sync</h4>
                  <p className="text-xs text-[#64748B] mt-1 leading-relaxed">
                    Real-time synchronization across administrators, teachers, parents, and students with native GPS and push alerts.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="border-t border-[#E2E8F0] bg-white py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#64748B]">
            <AuvrynLogo variant="horizontal" size="xs" showDescriptor={false} />
            <div>
              &copy; 2026 AUVRYN &bull; The Intelligent Education Ecosystem &bull; All Rights Reserved.
            </div>
            <div className="flex items-center gap-4">
              <Link href="/auth/login" className="hover:text-[#2563EB]">Login</Link>
              <Link href="/auth/register" className="hover:text-[#2563EB]">Register</Link>
            </div>
          </div>
        </footer>
      </div>
    </LandingClientWrapper>
  );
}
