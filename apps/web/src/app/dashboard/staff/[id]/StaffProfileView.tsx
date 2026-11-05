'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { recordStaffEmploymentAction } from '../actions';
import {
  ArrowLeft,
  User,
  Briefcase,
  GraduationCap,
  FileText,
  Edit,
  History,
  BookOpen,
} from 'lucide-react';
import type {
  StaffProfileRow,
  StaffEmploymentRow,
  FacultyAllocationRow,
  StaffDocumentRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface StaffProfileViewProps {
  staff: StaffProfileRow;
  employments: (StaffEmploymentRow & {
    department?: AcademicDepartmentRow | null;
    campus?: CampusRow | null;
  })[];
  allocations: FacultyAllocationRow[];
  documents: StaffDocumentRow[];
  departments: AcademicDepartmentRow[];
  campuses: CampusRow[];
  canManage: boolean;
  canAllocate: boolean;
}

export function StaffProfileView({
  staff,
  employments,
  allocations,
  documents,
  departments,
  campuses,
  canManage,
  canAllocate,
}: StaffProfileViewProps) {
  const router = useRouter();

  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // New Employment / Transfer Form State
  const [transferData, setTransferData] = useState({
    designation: staff.designation,
    departmentId: staff.department_id || '',
    campusId: staff.campus_id || '',
    employmentType: staff.employment_type as any,
    employmentStatus: staff.employment_status as any,
    startDate: new Date().toISOString().split('T')[0],
    remarks: '',
  });

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await recordStaffEmploymentAction({
        staffId: staff.id,
        designation: transferData.designation,
        departmentId: transferData.departmentId || undefined,
        campusId: transferData.campusId || undefined,
        employmentType: transferData.employmentType,
        employmentStatus: transferData.employmentStatus,
        startDate: transferData.startDate || new Date().toISOString().slice(0, 10),
        remarks: transferData.remarks || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to record employment transfer.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Employment update and placement successfully recorded.');
      setIsTransferModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

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
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Breadcrumb & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Staff Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {staff.first_name} {staff.middle_name ? `${staff.middle_name} ` : ''}{staff.last_name}
            </h1>
            <div>{getStatusBadge(staff.employment_status)}</div>
            <div>{getCategoryBadge(staff.staff_category)}</div>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Employee ID: <span className="font-semibold text-slate-900">{staff.employee_id}</span> • Joined: {staff.joining_date}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {canManage && (
            <>
              <Link href={`/dashboard/staff/${staff.id}/edit`}>
                <Button variant="outline" size="sm" className="flex items-center gap-1.5">
                  <Edit className="w-3.5 h-3.5" />
                  Edit Profile
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTransferModalOpen(true)}
                className="flex items-center gap-1.5"
              >
                <History className="w-3.5 h-3.5" />
                Transfer / Promotion
              </Button>
            </>
          )}

          {staff.staff_category === 'teaching' && canAllocate && (
            <Link href={`/dashboard/staff/${staff.id}/assignments`}>
              <Button size="sm" className="flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5" />
                Academic Allocations
              </Button>
            </Link>
          )}

          <Link href={`/dashboard/staff/${staff.id}/documents`}>
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Documents ({documents.length})
            </Button>
          </Link>
        </div>
      </div>

      {errorMsg && (
        <Alert variant="error">
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success">
          {successMsg}
        </Alert>
      )}

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details & Timeline */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Placement Card */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              Current Institutional Placement & Role
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Designation</span>
                <span className="font-semibold text-slate-900">{staff.designation}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Department</span>
                <span className="font-medium text-slate-900">
                  {departments.find((d) => d.id === staff.department_id)?.name || 'General'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Campus</span>
                <span className="font-medium text-slate-900">
                  {campuses.find((c) => c.id === staff.campus_id)?.name || 'Central / All'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Employment Type</span>
                <span className="font-medium text-slate-900 capitalize">{staff.employment_type.replace('_', ' ')}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 pt-3 border-t border-slate-100 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Qualification</span>
                <span className="font-medium text-slate-900">{staff.qualification || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Experience</span>
                <span className="font-medium text-slate-900">{staff.years_of_experience || 0} Years</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Authentication Account</span>
                <span className="font-mono text-xs text-slate-700">
                  {staff.user_id ? 'Linked User Account' : 'No User Account Linked'}
                </span>
              </div>
            </div>
          </Card>

          {/* Personal Demographics & Contact */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              Personal Demographics & Contact Details
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Date of Birth</span>
                <span className="font-medium text-slate-900">{staff.date_of_birth}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Gender</span>
                <span className="font-medium text-slate-900 capitalize">{staff.gender.replace('_', ' ')}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Official Email</span>
                <span className="font-mono font-medium text-slate-900 truncate block">{staff.email}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Phone Number</span>
                <span className="font-mono font-medium text-slate-900">{staff.phone}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Residential Address</span>
              <p className="font-medium text-slate-900 mt-0.5">
                {[staff.address, staff.city, staff.state, staff.postal_code, staff.country]
                  .filter(Boolean)
                  .join(', ') || 'No residential address recorded.'}
              </p>
            </div>

            {(staff.emergency_contact_name || staff.emergency_contact_phone) && (
              <div className="mt-4 pt-3 border-t border-slate-100 text-sm">
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Emergency Contact</span>
                <p className="font-medium text-slate-900 mt-0.5">
                  {staff.emergency_contact_name} ({staff.emergency_contact_relationship || 'Contact'}) •{' '}
                  <span className="font-mono">{staff.emergency_contact_phone}</span>
                </p>
              </div>
            )}
          </Card>

          {/* Employment History & Career Progression Timeline */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <History className="w-4 h-4 text-indigo-600" />
              Employment History & Career Timeline ({employments.length})
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {employments.map((emp) => (
                <div key={emp.id} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900">{emp.designation}</span>
                      {getStatusBadge(emp.employment_status)}
                    </div>
                    <div className="text-slate-600 mt-1 flex items-center gap-3">
                      <span>Dept: <strong className="text-slate-800">{emp.department?.name || 'General'}</strong></span>
                      {emp.campus && <span>Campus: <strong className="text-slate-800">{emp.campus.name}</strong></span>}
                      <span>Type: <strong className="text-slate-800 capitalize">{emp.employment_type.replace('_', ' ')}</strong></span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-1">
                      Start: {emp.start_date} {emp.end_date ? `→ End: ${emp.end_date}` : '→ Present'}
                    </span>
                    {emp.remarks && (
                      <p className="text-slate-500 italic mt-1 bg-slate-50 p-2 rounded border border-slate-100">
                        {emp.remarks}
                      </p>
                    )}
                  </div>
                </div>
              ))}

              {employments.length === 0 && (
                <p className="text-xs text-slate-400">No previous employment records registered.</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Quick Links & Summary Cards */}
        <div className="space-y-6">
          {/* Academic Allocations Summary Card */}
          {staff.staff_category === 'teaching' && (
            <Card className="p-5">
              <div className="flex items-center justify-between border-b pb-2 mb-3">
                <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-indigo-600" />
                  Active Allocations ({allocations.length})
                </h3>
                {canAllocate && (
                  <Link href={`/dashboard/staff/${staff.id}/assignments`}>
                    <Button variant="outline" size="sm" className="text-xs h-7">
                      Manage
                    </Button>
                  </Link>
                )}
              </div>

              <div className="space-y-2">
                {allocations.slice(0, 4).map((alloc) => (
                  <div
                    key={alloc.id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-900">
                        {alloc.is_class_teacher ? 'Class Teacher' : 'Subject Faculty'}
                      </span>
                      {alloc.is_class_teacher && <Badge variant="purple">Class Teacher</Badge>}
                    </div>
                    <p className="text-slate-500">
                      Status: <span className="capitalize font-medium text-slate-700">{alloc.status}</span>
                    </p>
                  </div>
                ))}

                {allocations.length === 0 && (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No academic subject or class allocations assigned yet.
                  </p>
                )}
              </div>
            </Card>
          )}

          {/* Documents Card */}
          <Card className="p-5">
            <div className="flex items-center justify-between border-b pb-2 mb-3">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                Staff Documents ({documents.length})
              </h3>
              <Link href={`/dashboard/staff/${staff.id}/documents`}>
                <Button variant="outline" size="sm" className="text-xs h-7">
                  View All
                </Button>
              </Link>
            </div>

            <div className="space-y-2">
              {documents.slice(0, 4).map((doc) => (
                <div
                  key={doc.id}
                  className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-semibold text-slate-900 truncate max-w-[150px]">{doc.title}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">{doc.document_type}</p>
                  </div>
                  <Badge variant={doc.verification_status === 'verified' ? 'success' : 'warning'}>
                    {doc.verification_status}
                  </Badge>
                </div>
              ))}

              {documents.length === 0 && (
                <p className="text-xs text-slate-400 py-3 text-center">
                  No qualification or contract documents uploaded.
                </p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Record Transfer / Promotion Modal */}
      <Modal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        title="Record Department Transfer or Role Promotion"
      >
        <form onSubmit={handleTransferSubmit} className="space-y-4">
          <Input
            label="New Designation / Title *"
            value={transferData.designation}
            onChange={(e) => setTransferData({ ...transferData, designation: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department"
              value={transferData.departmentId}
              onChange={(e) => setTransferData({ ...transferData, departmentId: e.target.value })}
              options={[
                { value: '', label: 'General / Unassigned' },
                ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
              ]}
            />

            <Select
              label="Campus Location"
              value={transferData.campusId}
              onChange={(e) => setTransferData({ ...transferData, campusId: e.target.value })}
              options={[
                { value: '', label: 'Central / All Campuses' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Employment Type *"
              value={transferData.employmentType}
              onChange={(e) => setTransferData({ ...transferData, employmentType: e.target.value as any })}
              options={[
                { value: 'full_time', label: 'Full Time' },
                { value: 'part_time', label: 'Part Time' },
                { value: 'contract', label: 'Contract' },
                { value: 'adjunct', label: 'Adjunct' },
                { value: 'visiting', label: 'Visiting' },
              ]}
            />

            <Select
              label="Employment Status *"
              value={transferData.employmentStatus}
              onChange={(e) => setTransferData({ ...transferData, employmentStatus: e.target.value as any })}
              options={[
                { value: 'active', label: 'Active' },
                { value: 'probation', label: 'Probation' },
                { value: 'notice_period', label: 'Notice Period' },
                { value: 'suspended', label: 'Suspended' },
                { value: 'resigned', label: 'Resigned' },
                { value: 'retired', label: 'Retired' },
              ]}
            />
          </div>

          <Input
            label="Effective Start Date *"
            type="date"
            value={transferData.startDate}
            onChange={(e) => setTransferData({ ...transferData, startDate: e.target.value })}
            required
          />

          <Input
            label="Transfer / Promotion Remarks"
            placeholder="e.g. Promoted to Senior Lecturer following annual faculty review"
            value={transferData.remarks}
            onChange={(e) => setTransferData({ ...transferData, remarks: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsTransferModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !transferData.designation}>
              {isSubmitting ? 'Recording...' : 'Save Employment Record'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
