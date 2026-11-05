'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import {
  createStaffInvitationAction,
  revokeStaffInvitationAction,
} from '../actions';
import {
  ArrowLeft,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  Ban,
  Building,
  GraduationCap,
} from 'lucide-react';
import type {
  StaffInvitationRow,
  StaffProfileRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface InvitationWithRelations extends StaffInvitationRow {
  department?: AcademicDepartmentRow | null;
  campus?: CampusRow | null;
  staff?: StaffProfileRow | null;
}

interface StaffInvitationsClientProps {
  invitations: InvitationWithRelations[];
  staffList: StaffProfileRow[];
  departments: AcademicDepartmentRow[];
  campuses: CampusRow[];
  canManage: boolean;
}

export function StaffInvitationsClient({
  invitations,
  staffList,
  departments,
  campuses,
  canManage,
}: StaffInvitationsClientProps) {
  const router = useRouter();

  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // Invite Form State
  const [inviteData, setInviteData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'faculty',
    departmentId: '',
    campusId: '',
    staffId: '',
  });

  const counts = useMemo(() => {
    const total = invitations.length;
    const pending = invitations.filter((i) => i.status === 'pending').length;
    const accepted = invitations.filter((i) => i.status === 'accepted').length;
    const revokedOrExpired = invitations.filter((i) => ['expired', 'revoked'].includes(i.status)).length;
    return { total, pending, accepted, revokedOrExpired };
  }, [invitations]);

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await createStaffInvitationAction({
        email: inviteData.email.trim(),
        firstName: inviteData.firstName.trim(),
        lastName: inviteData.lastName.trim(),
        role: inviteData.role as any,
        departmentId: inviteData.departmentId || undefined,
        campusId: inviteData.campusId || undefined,
        staffId: inviteData.staffId || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to send invitation.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Onboarding invitation issued for ${inviteData.email}.`);
      setIsInviteModalOpen(false);
      setInviteData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'faculty',
        departmentId: '',
        campusId: '',
        staffId: '',
      });
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRevoke = async (invitationId: string) => {
    if (!confirm('Are you sure you want to revoke this staff invitation?')) return;
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await revokeStaffInvitationAction(invitationId);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to revoke invitation.');
        return;
      }
      setSuccessMsg('Staff invitation revoked.');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    }
  };

  const copyInviteLink = (token: string) => {
    const link = `${window.location.origin}/auth/register?token=${token}`;
    navigator.clipboard.writeText(link);
    setCopiedToken(token);
    setTimeout(() => setCopiedToken(null), 3000);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'accepted':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Accepted</Badge>;
      case 'pending':
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1 inline" /> Pending</Badge>;
      case 'expired':
        return <Badge variant="outline"><Clock className="w-3 h-3 mr-1 inline" /> Expired</Badge>;
      case 'revoked':
        return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1 inline" /> Revoked</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/staff"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Staff Directory
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Access & Onboarding Invitations
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Invite new or existing personnel to activate their credentials, accept institutional roles, and link their profile.
          </p>
        </div>

        {canManage && (
          <Button onClick={() => setIsInviteModalOpen(true)} className="flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Send New Invitation
          </Button>
        )}
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

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Invitations</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{counts.total}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">Pending Acceptance</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{counts.pending}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Successfully Onboarded</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{counts.accepted}</p>
        </Card>
        <Card className="p-4 bg-white border border-slate-200">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">Expired / Revoked</p>
          <p className="text-2xl font-bold text-rose-600 mt-1">{counts.revokedOrExpired}</p>
        </Card>
      </div>

      {/* Invitations Table */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Invitee</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Department / Campus</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Expires</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {invitations.map((inv) => (
                <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-900">
                      {inv.first_name} {inv.last_name}
                    </div>
                    <div className="text-xs text-slate-500 font-mono">{inv.email}</div>
                  </td>
                  <td className="py-3.5 px-4">
                    <Badge variant="purple" className="capitalize">
                      {inv.role.replace('_', ' ')}
                    </Badge>
                  </td>
                  <td className="py-3.5 px-4 text-xs">
                    <div className="font-medium text-slate-800 flex items-center gap-1">
                      <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                      {inv.department?.name || 'General Department'}
                    </div>
                    {inv.campus && (
                      <div className="text-slate-500 flex items-center gap-1 mt-0.5">
                        <Building className="w-3.5 h-3.5 text-slate-400" />
                        {inv.campus.name}
                      </div>
                    )}
                  </td>
                  <td className="py-3.5 px-4">
                    {getStatusBadge(inv.status)}
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-500 whitespace-nowrap">
                    {new Date(inv.expires_at).toLocaleDateString()}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {inv.status === 'pending' && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => copyInviteLink(inv.invitation_token)}
                            className="h-8 text-xs flex items-center gap-1"
                          >
                            {copiedToken === inv.invitation_token ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                                Copied
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                Copy Link
                              </>
                            )}
                          </Button>

                          {canManage && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRevoke(inv.id)}
                              className="h-8 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}

              {invitations.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-500">
                    <Mail className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                    <p className="font-medium">No staff invitations issued yet</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Send an invitation link to onboard new faculty members or administrative staff.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Send Invitation Modal */}
      <Modal
        isOpen={isInviteModalOpen}
        onClose={() => setIsInviteModalOpen(false)}
        title="Issue Staff Onboarding Invitation"
      >
        <form onSubmit={handleInviteSubmit} className="space-y-4">
          <Input
            label="Email Address *"
            type="email"
            placeholder="e.g. staff.member@institution.edu"
            value={inviteData.email}
            onChange={(e) => setInviteData({ ...inviteData, email: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="First Name *"
              value={inviteData.firstName}
              onChange={(e) => setInviteData({ ...inviteData, firstName: e.target.value })}
              required
            />
            <Input
              label="Last Name *"
              value={inviteData.lastName}
              onChange={(e) => setInviteData({ ...inviteData, lastName: e.target.value })}
              required
            />
          </div>

          <Select
            label="Assigned System Role *"
            value={inviteData.role}
            onChange={(e) => setInviteData({ ...inviteData, role: e.target.value })}
            options={[
              { value: 'faculty', label: 'Faculty Member' },
              { value: 'staff', label: 'Support / Technical Staff' },
              { value: 'department_head', label: 'Head of Department' },
              { value: 'academic_admin', label: 'Academic Administrator' },
              { value: 'hr_administrator', label: 'HR Administrator' },
              { value: 'accountant', label: 'Accountant' },
              { value: 'admin', label: 'Institution Admin' },
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Department (Optional)"
              value={inviteData.departmentId}
              onChange={(e) => setInviteData({ ...inviteData, departmentId: e.target.value })}
              options={[
                { value: '', label: 'General / Unassigned' },
                ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
              ]}
            />

            <Select
              label="Campus (Optional)"
              value={inviteData.campusId}
              onChange={(e) => setInviteData({ ...inviteData, campusId: e.target.value })}
              options={[
                { value: '', label: 'All Campuses / Central' },
                ...campuses.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          {staffList.length > 0 && (
            <Select
              label="Link to Existing Staff Profile (Optional)"
              value={inviteData.staffId}
              onChange={(e) => setInviteData({ ...inviteData, staffId: e.target.value })}
              options={[
                { value: '', label: 'Create fresh profile linkage' },
                ...staffList.map((s) => ({ value: s.id, label: `${s.employee_id}: ${s.first_name} ${s.last_name}` })),
              ]}
            />
          )}

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsInviteModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !inviteData.email || !inviteData.firstName || !inviteData.lastName}
            >
              {isSubmitting ? 'Sending...' : 'Generate Invitation'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
