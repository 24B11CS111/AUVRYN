import React from 'react';
import Link from 'next/link';
import { requireInstitution } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { INSTITUTION_TYPE_DEFINITIONS } from '@edu-platform/types';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/lib/utils';
import {
  Building2,
  Calendar,
  Users,
  ShieldCheck,
  FileClock,
  MapPin,
  ArrowRight,
  Clock,
  Sparkles,
} from 'lucide-react';
import type { CampusRow, AcademicYearRow, AuditLogRow } from '@edu-platform/database';
import { LiveDashboardWatcher } from '@/components/dashboard/LiveDashboardWatcher';

export default async function DashboardPage() {
  const session = await requireInstitution();
  const supabase = createClient();
  const activeMembership = session.activeMembership!;
  const institution = activeMembership.institution!;
  const typeDef = INSTITUTION_TYPE_DEFINITIONS[institution.type];

  // 1. Fetch real campuses for this institution
  const { data: rawCampuses } = await supabase
    .from('campuses')
    .select('*')
    .eq('institution_id', institution.id)
    .order('is_primary', { ascending: false });

  const campuses = rawCampuses as unknown as CampusRow[] | null;

  // 2. Fetch real active academic year for this institution
  const { data: rawAcademicYears } = await supabase
    .from('academic_years')
    .select('*')
    .eq('institution_id', institution.id)
    .order('is_current', { ascending: false });

  const academicYears = rawAcademicYears as unknown as AcademicYearRow[] | null;

  // 3. Fetch real members count for this institution
  const { count: memberCount } = await supabase
    .from('institution_memberships')
    .select('*', { count: 'exact', head: true })
    .eq('institution_id', institution.id)
    .eq('status', 'active');

  // 4. Fetch real recent audit logs for this institution
  const { data: rawAuditLogs } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('institution_id', institution.id)
    .order('created_at', { ascending: false })
    .limit(5);

  const recentAuditLogs = rawAuditLogs as unknown as AuditLogRow[] | null;

  const primaryCampus = campuses?.find((c) => c.is_primary) || campuses?.[0];
  const currentAcademicYear = academicYears?.find((ay) => ay.is_current) || academicYears?.[0];

  return (
    <div className="space-y-6">
      <LiveDashboardWatcher institutionId={institution.id} />
      {/* Top Banner: Real Institution Overview */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {institution.name}
              </h1>
              <Badge variant="purple">{typeDef.label}</Badge>
            </div>
            <p className="text-xs text-slate-500 flex items-center gap-2">
              <span>Code: <strong className="text-slate-700">{institution.code}</strong></span>
              <span>&bull;</span>
              <span>Slug: <strong className="text-slate-700">/{institution.slug}</strong></span>
              <span>&bull;</span>
              <span className="flex items-center gap-1">
                <MapPin className="w-3 h-3 text-slate-400" />
                {institution.city}, {institution.state}, {institution.country}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="success">Active Tenant</Badge>
            <span className="text-xs text-slate-500 font-mono">
              ID: {institution.id.slice(0, 8)}...
            </span>
          </div>
        </div>
      </div>

      {/* Primary Metrics Grid (Real Data) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Campuses Metric */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Campuses
            </span>
            <div className="p-2 rounded-lg bg-sky-50 text-sky-600">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {campuses ? campuses.length : 0}
            </div>
            <div className="text-xs text-slate-500 mt-1 truncate">
              Primary: {primaryCampus ? primaryCampus.name : 'None registered'}
            </div>
          </div>
        </Card>

        {/* Members Metric */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Active Members
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl font-bold text-slate-900">
              {memberCount !== null ? memberCount : 1}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Your role: <strong className="capitalize text-slate-700">{activeMembership.role}</strong>
            </div>
          </div>
        </Card>

        {/* Academic Session Metric */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Academic Year
            </span>
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Calendar className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-slate-900 truncate">
              {currentAcademicYear ? currentAcademicYear.name : 'Not configured'}
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Structure: {currentAcademicYear ? currentAcademicYear.term_system : 'Annual'}
            </div>
          </div>
        </Card>

        {/* Security / Isolation Metric */}
        <Card>
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Tenant Boundary
            </span>
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-sm font-bold text-emerald-700">
              RLS Enforced
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Database-isolated tenant
            </div>
          </div>
        </Card>
      </div>

      {/* Two Column Layout: Quick Management & Audit Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Setup Guides and Entity Lists */}
        <div className="lg:col-span-2 space-y-6">
          {/* Institutional Setup Progress Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  Institutional Foundation Status
                </CardTitle>
                <Badge variant="success">Core Ready</Badge>
              </div>
              <CardDescription>
                Core multi-tenant operational records configured for {typeDef.label}.
              </CardDescription>
            </CardHeader>

            <div className="space-y-3 mt-4">
              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Central Campus Registered
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {primaryCampus?.name} ({primaryCampus?.code}) &bull; {primaryCampus?.city}
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/campuses"
                  className="font-medium text-slate-900 hover:underline flex items-center gap-1"
                >
                  Manage <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Active Academic Calendar
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      {currentAcademicYear?.name} ({currentAcademicYear?.code})
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/academics"
                  className="font-medium text-slate-900 hover:underline flex items-center gap-1"
                >
                  Calendar <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200/60 text-xs">
                <div className="flex items-center gap-2.5">
                  <div className="w-2 h-2 rounded-full bg-emerald-500" />
                  <div>
                    <span className="font-semibold text-slate-800">
                      Administrator Membership Assigned
                    </span>
                    <span className="text-slate-500 block text-[11px]">
                      Owner authority assigned to {session.profile?.fullName || session.profile?.email || 'User'} ({session.profile?.email || 'No email'})
                    </span>
                  </div>
                </div>
                <Link
                  href="/dashboard/members"
                  className="font-medium text-slate-900 hover:underline flex items-center gap-1"
                >
                  Members <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Real Audit Logs Stream */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileClock className="w-4 h-4 text-slate-500" />
                  Audit Trail
                </CardTitle>
                <Link
                  href="/dashboard/audit"
                  className="text-xs font-semibold text-slate-900 hover:underline"
                >
                  View all
                </Link>
              </div>
              <CardDescription>
                Immutable security logs recorded for this tenant.
              </CardDescription>
            </CardHeader>

            <div className="space-y-3 mt-4">
              {recentAuditLogs && recentAuditLogs.length > 0 ? (
                recentAuditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900 font-mono">
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(log.created_at)}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Entity: <strong className="text-slate-700">{log.entity_type}</strong>
                    </p>
                  </div>
                ))
              ) : (
                <div className="py-6 text-center text-xs text-slate-500">
                  No audit logs recorded yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
