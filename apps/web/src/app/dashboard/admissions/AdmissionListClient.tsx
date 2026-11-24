'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  ChevronRight,
} from 'lucide-react';
import type {
  AdmissionApplicationRow,
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
} from '@edu-platform/database';

interface AdmissionWithRelations extends AdmissionApplicationRow {
  academic_year?: AcademicYearRow;
  program?: AcademicProgramRow;
  class?: AcademicClassRow;
}

interface AdmissionListClientProps {
  applications: AdmissionWithRelations[];
  years: AcademicYearRow[];
  programs: AcademicProgramRow[];
  canManage: boolean;
}

export function AdmissionListClient({
  applications,
  years,
  programs,
  canManage,
}: AdmissionListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('all');
  const [programFilter, setProgramFilter] = useState('all');

  // Filtered applications
  const filtered = useMemo(() => {
    return applications.filter((app) => {
      // Search
      const search = searchTerm.toLowerCase();
      const fullName = `${app.first_name} ${app.last_name}`.toLowerCase();
      const appNum = (app.application_number || '').toLowerCase();
      const phone = (app.phone || '').toLowerCase();
      const email = (app.email || '').toLowerCase();
      const guardianName = (app.primary_guardian_name || '').toLowerCase();

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        appNum.includes(search) ||
        phone.includes(search) ||
        email.includes(search) ||
        guardianName.includes(search);

      // Status
      const matchesStatus = statusFilter === 'all' || app.status === statusFilter;

      // Year
      const matchesYear = yearFilter === 'all' || app.academic_year_id === yearFilter;

      // Program
      const matchesProgram = programFilter === 'all' || app.program_id === programFilter;

      return matchesSearch && matchesStatus && matchesYear && matchesProgram;
    });
  }, [applications, searchTerm, statusFilter, yearFilter, programFilter]);

  // Counts
  const counts = useMemo(() => {
    const total = applications.length;
    const pending = applications.filter((a) =>
      ['submitted', 'received', 'documents_pending', 'under_verification'].includes(a.status)
    ).length;
    const confirmed = applications.filter((a) =>
      ['approved', 'confirmed'].includes(a.status)
    ).length;
    const enrolled = applications.filter((a) => a.status === 'enrolled').length;
    return { total, pending, confirmed, enrolled };
  }, [applications]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default"><Clock className="w-3 h-3 mr-1 inline" /> Submitted</Badge>;
      case 'received':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1 inline" /> Received</Badge>;
      case 'documents_pending':
        return <Badge variant="warning"><AlertCircle className="w-3 h-3 mr-1 inline" /> Docs Pending</Badge>;
      case 'under_verification':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1 inline" /> Under Review</Badge>;
      case 'approved':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Approved</Badge>;
      case 'confirmed':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Confirmed</Badge>;
      case 'enrolled':
        return <Badge variant="info"><UserCheck className="w-3 h-3 mr-1 inline" /> Enrolled</Badge>;
      case 'rejected':
        return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1 inline" /> Rejected</Badge>;
      case 'waitlisted':
        return <Badge variant="outline">Waitlisted</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Admissions Management
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Track, verify, and process incoming student enrollment applications through the complete admission lifecycle.
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link href="/admissions/register" target="_blank">
              <Button variant="outline" className="flex items-center gap-1.5 text-xs">
                <FileText className="w-3.5 h-3.5" />
                Public Registration Portal
              </Button>
            </Link>
            <Link href="/dashboard/admissions/new">
              <Button className="flex items-center gap-2 text-xs">
                <Plus className="w-4 h-4" />
                New Application Wizard
              </Button>
            </Link>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Received</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">In Review / Pending</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.pending}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Approved / Confirmed</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.confirmed}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-indigo-600 uppercase tracking-wider">Converted & Enrolled</p>
          <p className="text-2xl font-bold text-indigo-600 mt-1">{counts.enrolled}</p>
        </Card>
      </div>

      {/* Filters & Search */}
      <Card className="p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
          <div>
            <Input
              placeholder="Search by name, app #, guardian, phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Lifecycle Statuses' },
                { value: 'submitted', label: 'Submitted' },
                { value: 'received', label: 'Received' },
                { value: 'documents_pending', label: 'Documents Pending' },
                { value: 'under_verification', label: 'Under Verification' },
                { value: 'approved', label: 'Approved' },
                { value: 'confirmed', label: 'Confirmed' },
                { value: 'enrolled', label: 'Enrolled' },
                { value: 'waitlisted', label: 'Waitlisted' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>

          <div>
            <Select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Academic Years' },
                ...years.map((y) => ({ value: y.id, label: y.name })),
              ]}
            />
          </div>

          <div>
            <Select
              value={programFilter}
              onChange={(e) => setProgramFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Programs' },
                ...programs.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` })),
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Applications Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Application #</th>
                <th className="py-3 px-4">Applicant</th>
                <th className="py-3 px-4">Applied Program / Class</th>
                <th className="py-3 px-4">Guardian Contact</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Applied On</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-xs text-indigo-600">
                    <Link href={`/dashboard/admissions/${app.id}`} className="hover:underline">
                      {app.application_number}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">
                      {app.first_name} {app.middle_name ? `${app.middle_name} ` : ''}{app.last_name}
                    </div>
                    <div className="text-xs text-slate-500 capitalize">{app.gender} • DOB: {app.date_of_birth}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">
                      {app.program?.name || 'General Program'}
                    </div>
                    <div className="text-xs text-slate-500">
                      {app.class?.name ? `Class: ${app.class.name}` : ''}
                      {app.academic_year?.name ? ` • ${app.academic_year.name}` : ''}
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-slate-800">{app.primary_guardian_name}</div>
                    <div className="text-slate-500 font-mono">{app.primary_guardian_phone}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(app.status)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href={`/dashboard/admissions/${app.id}`}>
                      <Button variant="outline" size="sm" className="h-8 text-xs">
                        View
                        <ChevronRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}

              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-500">
                    <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">No admission applications found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {applications.length === 0
                        ? 'No applications have been registered yet.'
                        : 'No applications match your active search and filter criteria.'}
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
