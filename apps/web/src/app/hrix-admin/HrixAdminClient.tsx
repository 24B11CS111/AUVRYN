'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import type { HrixPlatformData } from './actions';
import { toggleInstitutionStatusAction } from './actions';
import { AuvrynLogo } from '@/components/branding';
import {
  Building2,
  Users,
  Activity,
  CreditCard,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileClock,
  Layers,
  Loader2,
  Radio,
  Server,
} from 'lucide-react';

interface HrixAdminClientProps {
  initialData: HrixPlatformData;
}

export function HrixAdminClient({ initialData }: HrixAdminClientProps) {
  const [data, setData] = useState<HrixPlatformData>(initialData);
  const [activeTab, setActiveTab] = useState<'directory' | 'subscriptions' | 'health' | 'audit_logs'>('directory');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [educationFilter, setEducationFilter] = useState<string>('all');
  const [isUpdating, setIsUpdating] = useState<string | null>(null);

  const stats = data.platformStats;

  const handleToggleStatus = async (tenantId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'active' ? 'suspended' : 'active';
    setIsUpdating(tenantId);

    const res = await toggleInstitutionStatusAction(tenantId, nextStatus);
    setIsUpdating(null);

    if (res.success) {
      setData((prev) => ({
        ...prev,
        tenants: prev.tenants.map((t) =>
          t.id === tenantId ? { ...t, status: nextStatus } : t
        ),
      }));
    }
  };

  const filteredTenants = data.tenants.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.slug.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesStatus = statusFilter === 'all' || t.status === statusFilter;
    const matchesEdu = educationFilter === 'all' || t.educationType === educationFilter;

    return matchesSearch && matchesStatus && matchesEdu;
  });

  return (
    <div className="min-h-screen bg-[#F5F7FB] pb-12">
      {/* Platform Header */}
      <header className="bg-[#07152B] border-b border-[#142C4C] text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AuvrynLogo variant="primary" size="sm" showDescriptor={false} href="/hrix-admin" />
            <div className="h-6 w-px bg-slate-700 hidden sm:block" />
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-400 text-slate-950">
                HRIX Super Admin
              </span>
              <span className="text-xs text-slate-400 font-mono">Platform Console</span>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[#0B1E3F] border border-slate-700/80 text-emerald-400">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              <span className="font-semibold">Multi-Tenant Isolation: Active</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-slate-300 hover:text-white underline font-medium"
            >
              Back to Institutional App
            </Link>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 space-y-6">
        {/* Platform KPI Banner */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Tenants</span>
              <Building2 className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0B1E3F]">{stats.totalTenants}</span>
              <span className="text-xs text-emerald-600 font-semibold">{stats.activeTenants} active</span>
            </div>
            <p className="text-[11px] text-slate-400">
              {stats.pendingTenants} pending &bull; {stats.suspendedTenants} suspended
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Total Identities</span>
              <Users className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0B1E3F]">{stats.totalIdentities}</span>
              <span className="text-xs text-slate-500">Global profiles</span>
            </div>
            <p className="text-[11px] text-slate-400">
              RBAC &amp; Tenant-partitioned
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">Platform Health</span>
              <Activity className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-emerald-600">{stats.databaseUptime}</span>
              <span className="text-xs text-emerald-700 font-semibold">Operational</span>
            </div>
            <p className="text-[11px] text-slate-400">
              PostgreSQL 17 &bull; Realtime WebSockets
            </p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-2">
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-xs font-semibold uppercase tracking-wider">MRR Oversight</span>
              <CreditCard className="w-4 h-4 text-[#2563EB]" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#0B1E3F]">{stats.monthlyRecurringRevenue}</span>
              <span className="text-xs text-slate-500">SaaS Billing</span>
            </div>
            <p className="text-[11px] text-slate-400">
              Active enterprise subscriptions
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
          <button
            type="button"
            onClick={() => setActiveTab('directory')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'directory'
                ? 'bg-[#0B1E3F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Building2 className="w-4 h-4" />
            Institution Directory ({data.tenants.length})
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('subscriptions')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'subscriptions'
                ? 'bg-[#0B1E3F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Layers className="w-4 h-4" />
            Subscription Lifecycle
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('health')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'health'
                ? 'bg-[#0B1E3F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Server className="w-4 h-4" />
            System Health &amp; Subsystems
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('audit_logs')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${
              activeTab === 'audit_logs'
                ? 'bg-[#0B1E3F] text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <FileClock className="w-4 h-4" />
            Platform Audit Logs
          </button>
        </div>

        {/* TAB 1: INSTITUTION DIRECTORY */}
        {activeTab === 'directory' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-5">
            {/* Search & Filters */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search institutions by name, code or slug..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-lg border border-slate-200 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <select
                  value={educationFilter}
                  onChange={(e) => setEducationFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none text-slate-700"
                >
                  <option value="all">All Education Types</option>
                  <option value="preschool">Preschool</option>
                  <option value="primary_school">Primary / K-12</option>
                  <option value="intermediate">Intermediate (+2)</option>
                  <option value="university">University</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs rounded-lg border border-slate-200 bg-white focus:outline-none text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  <option value="active">Active</option>
                  <option value="pending_verification">Pending Verification</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>

            {/* Tenant Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                    <th className="py-3 px-4 font-semibold">Institution</th>
                    <th className="py-3 px-4 font-semibold">Code / Slug</th>
                    <th className="py-3 px-4 font-semibold">Education Level</th>
                    <th className="py-3 px-4 font-semibold">Subscription Plan</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">Lifecycle Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No institutions match the selected filter criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t) => (
                      <tr key={t.id} className="hover:bg-slate-50/60">
                        <td className="py-3 px-4 font-bold text-[#0B1E3F]">
                          <div>{t.name}</div>
                          <span className="text-[10px] text-slate-400 font-normal">
                            {t.city}, {t.country}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-slate-600">
                          <div>{t.code}</div>
                          <span className="text-[10px] text-slate-400">/{t.slug}</span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="capitalize px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {t.educationType.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-700">
                          {t.planName}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                              t.status === 'active'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : t.status === 'suspended'
                                ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}
                          >
                            {t.status === 'active' ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <AlertTriangle className="w-3 h-3" />
                            )}
                            {t.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            disabled={isUpdating === t.id}
                            onClick={() => handleToggleStatus(t.id, t.status)}
                            className={`px-3 py-1 rounded-md text-[11px] font-bold transition-colors ${
                              t.status === 'active'
                                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                                : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            }`}
                          >
                            {isUpdating === t.id ? (
                              <Loader2 className="w-3 h-3 animate-spin inline" />
                            ) : t.status === 'active' ? (
                              'Suspend'
                            ) : (
                              'Reactivate'
                            )}
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: SUBSCRIPTION LIFECYCLE */}
        {activeTab === 'subscriptions' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <h2 className="text-base font-bold text-[#0B1E3F]">
              Subscription Plan Matrix &amp; Feature Flags
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Starter Tier</span>
                <div className="text-2xl font-bold text-[#0B1E3F]">$499 <span className="text-xs font-normal text-slate-500">/mo</span></div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>&bull; Up to 500 Students</li>
                  <li>&bull; Attendance &amp; Academics</li>
                  <li>&bull; Single Campus</li>
                  <li>&bull; Community Support</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl border-2 border-[#2563EB] bg-blue-50/20 space-y-3 relative">
                <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#2563EB] text-white">
                  Popular
                </span>
                <span className="text-xs font-bold text-[#2563EB] uppercase tracking-wider block">Enterprise Education</span>
                <div className="text-2xl font-bold text-[#0B1E3F]">$1,899 <span className="text-xs font-normal text-slate-500">/mo</span></div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>&bull; Unlimited Students &amp; Staff</li>
                  <li>&bull; Multi-Campus Hierarchy</li>
                  <li>&bull; AI Gateway &amp; Live Tracking</li>
                  <li>&bull; Realtime WebSockets &amp; 24/7 SLA</li>
                </ul>
              </div>

              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Custom Multiversity</span>
                <div className="text-2xl font-bold text-[#0B1E3F]">Custom <span className="text-xs font-normal text-slate-500">Contract</span></div>
                <ul className="text-xs text-slate-600 space-y-1.5 pt-2">
                  <li>&bull; Multi-Institution Umbrella</li>
                  <li>&bull; Dedicated Database Isolation</li>
                  <li>&bull; Custom AI Model Fine-tuning</li>
                  <li>&bull; Dedicated Technical Account Manager</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: SYSTEM HEALTH */}
        {activeTab === 'health' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-6">
            <h2 className="text-base font-bold text-[#0B1E3F]">
              Platform Subsystems &amp; Distributed Infrastructure
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.systemHealth.map((h) => (
                <div key={h.service} className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-[#0B1E3F]">{h.service}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3" />
                      {h.status}
                    </span>
                  </div>
                  <div className="flex items-baseline justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                    <span>Latency: <strong className="text-slate-700">{h.latencyMs}ms</strong></span>
                    <span>{h.lastChecked}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: AUDIT LOGS */}
        {activeTab === 'audit_logs' && (
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <h2 className="text-base font-bold text-[#0B1E3F]">
              Platform-Wide Audit &amp; Governance Stream
            </h2>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Timestamp</th>
                    <th className="py-2.5 px-3 font-semibold">Tenant</th>
                    <th className="py-2.5 px-3 font-semibold">Action</th>
                    <th className="py-2.5 px-3 font-semibold">Entity Type</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recentPlatformLogs.map((l) => (
                    <tr key={l.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 text-slate-400 font-mono">
                        {new Date(l.createdAt).toLocaleTimeString()} &bull; {new Date(l.createdAt).toLocaleDateString()}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-[#0B1E3F]">
                        {l.institutionName}
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-[#2563EB]">
                        {l.action}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 capitalize">
                        {l.entityType}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
