'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Users,
  Plus,
  Mail,
  GraduationCap,
  ChevronRight,
  Building,
} from 'lucide-react';
import type {
  StaffProfileRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface StaffWithRelations extends StaffProfileRow {
  department?: AcademicDepartmentRow | null;
  campus?: CampusRow | null;
}

interface StaffListClientProps {
  staffList: StaffWithRelations[];
  departments: AcademicDepartmentRow[];
  campuses: CampusRow[];
  canManage: boolean;
}

export function StaffListClient({
  staffList,
  departments,
  campuses,
  canManage,
}: StaffListClientProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [campusFilter, setCampusFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filtered = useMemo(() => {
    return staffList.filter((staff) => {
      const search = searchTerm.toLowerCase();
      const fullName = `${staff.first_name} ${staff.last_name}`.toLowerCase();
      const empId = staff.employee_id.toLowerCase();
      const email = staff.email.toLowerCase();
      const phone = staff.phone.toLowerCase();
      const desig = staff.designation.toLowerCase();

      const matchesSearch =
        !search ||
        fullName.includes(search) ||
        empId.includes(search) ||
        email.includes(search) ||
        phone.includes(search) ||
        desig.includes(search);

      const matchesCategory = categoryFilter === 'all' || staff.staff_category === categoryFilter;
      const matchesDept = departmentFilter === 'all' || staff.department_id === departmentFilter;
      const matchesCampus = campusFilter === 'all' || staff.campus_id === campusFilter;
      const matchesStatus = statusFilter === 'all' || staff.employment_status === statusFilter;

      return matchesSearch && matchesCategory && matchesDept && matchesCampus && matchesStatus;
    });
  }, [staffList, searchTerm, categoryFilter, departmentFilter, campusFilter, statusFilter]);

  const counts = useMemo(() => {
    const total = staffList.length;
    const teaching = staffList.filter((s) => s.staff_category === 'teaching').length;
    const nonTeaching = staffList.filter((s) => s.staff_category !== 'teaching').length;
    const active = staffList.filter((s) => s.employment_status === 'active').length;
    return { total, teaching, nonTeaching, active };
  }, [staffList]);

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case 'teaching':
        return <Badge variant="info">Faculty / Teaching</Badge>;
      case 'administrative':
        return <Badge variant="purple">Administration</Badge>;
      case 'technical':
        return <Badge variant="default">Technical</Badge>;
      case 'transport':
        return <Badge variant="outline">Transport</Badge>;
      case 'support':
        return <Badge variant="outline">Support</Badge>;
      default:
        return <Badge variant="default">Non-Teaching</Badge>;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'probation':
        return <Badge variant="warning">Probation</Badge>;
      case 'notice_period':
        return <Badge variant="warning">Notice Period</Badge>;
      case 'suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'terminated':
        return <Badge variant="danger">Terminated</Badge>;
      case 'resigned':
      case 'retired':
        return <Badge variant="outline">{status}</Badge>;
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
            Staff & Faculty Directory
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Centralized management of faculty members, administrative staff, technical personnel, and employment profiles.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {canManage && (
            <>
              <Link href="/dashboard/staff/invitations">
                <Button variant="outline" className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Invitations
                </Button>
              </Link>
              <Link href="/dashboard/staff/new">
                <Button className="flex items-center gap-2">
                  <Plus className="w-4 h-4" />
                  Register Staff
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Personnel</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-sky-600 uppercase tracking-wider">Teaching Faculty</p>
          <p className="text-2xl font-bold text-sky-600 mt-1">{counts.teaching}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-purple-600 uppercase tracking-wider">Admin & Support</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{counts.nonTeaching}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active On Duty</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.active}</p>
        </Card>
      </div>

      {/* Search & Filters */}
      <Card className="p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-center">
          <div>
            <Input
              placeholder="Search by name, ID, email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          <div>
            <Select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Staff Categories' },
                { value: 'teaching', label: 'Teaching Faculty' },
                { value: 'non_teaching', label: 'Non-Teaching' },
                { value: 'administrative', label: 'Administrative' },
                { value: 'technical', label: 'Technical' },
                { value: 'transport', label: 'Transport' },
                { value: 'support', label: 'Support' },
              ]}
            />
          </div>

          <div>
            <Select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Departments' },
                ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
              ]}
            />
          </div>

          <div>
            <Select
              value={campusFilter}
              onChange={(e) => setCampusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Campuses' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div>
            <Select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              options={[
                { value: 'all', label: 'All Employment Statuses' },
                { value: 'active', label: 'Active' },
                { value: 'probation', label: 'Probation' },
                { value: 'notice_period', label: 'Notice Period' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'resigned', label: 'Resigned' },
                { value: 'retired', label: 'Retired' },
                { value: 'terminated', label: 'Terminated' },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Employee ID</th>
                <th className="py-3 px-4">Staff Member</th>
                <th className="py-3 px-4">Role & Designation</th>
                <th className="py-3 px-4">Department / Campus</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.map((staff) => (
                <tr key={staff.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-mono font-medium text-xs text-indigo-600">
                    <Link href={`/dashboard/staff/${staff.id}`} className="hover:underline">
                      {staff.employee_id}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">
                      {staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ''}{staff.last_name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">
                      {staff.email} • {staff.phone}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="font-medium text-slate-800">{staff.designation}</div>
                    <div className="mt-0.5">{getCategoryBadge(staff.staff_category)}</div>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-slate-800 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {staff.department?.name || 'General / Unassigned'}
                    </div>
                    {staff.campus && (
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {staff.campus.name}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(staff.employment_status)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {staff.joining_date}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <Link href={`/dashboard/staff/${staff.id}`}>
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
                    <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">No staff members found</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {staffList.length === 0
                        ? 'No staff profiles have been registered yet.'
                        : 'No records match your active search or filter criteria.'}
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
