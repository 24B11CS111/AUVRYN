'use client';

import React, { useState, useTransition } from 'react';
import type { LeaveRequest } from '@edu-platform/types';
import {
  reviewLeaveRequestAction,
  submitParentChildLeaveAction,
} from './actions';
import {
  PlusCircle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  X,
} from 'lucide-react';

interface LeaveManagementClientProps {
  initialRequests: LeaveRequest[];
  userRole?: string;
  linkedStudents?: Array<{ id: string; firstName: string; lastName: string; admissionNumber: string }>;
}

export function LeaveManagementClient({
  initialRequests,
  userRole,
  linkedStudents = [],
}: LeaveManagementClientProps) {
  const [requests, setRequests] = useState<LeaveRequest[]>(initialRequests);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState(linkedStudents[0]?.id || '');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const canApprove = ['owner', 'admin', 'hr_administrator', 'academic_admin', 'department_head'].includes(
    userRole || ''
  );
  const canApply = ['parent', 'student', 'staff', 'faculty'].includes(userRole || '');

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !startDate || !endDate || !reason.trim()) return;
    setError(null);

    startTransition(async () => {
      const res = await submitParentChildLeaveAction({
        studentId: selectedStudentId,
        startDate,
        endDate,
        reason: reason.trim(),
      });

      if (res.success && res.data) {
        setShowApplyModal(false);
        setReason('');
        // Add optimistic request
        const st = linkedStudents.find((s) => s.id === selectedStudentId);
        setRequests((prev) => [
          {
            id: res.data!.leaveRequestId,
            institutionId: '',
            applicantType: 'student',
            studentId: selectedStudentId,
            leaveType: 'casual',
            startDate,
            endDate,
            reason,
            status: 'pending',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            student: st ? {
              id: st.id,
              admissionNumber: st.admissionNumber,
              firstName: st.firstName,
              lastName: st.lastName,
            } as any : undefined,
          },
          ...prev,
        ]);
      } else {
        setError(res.error || 'Failed to submit leave request');
      }
    });
  };

  const handleReview = (id: string, status: 'approved' | 'rejected') => {
    setError(null);
    startTransition(async () => {
      const res = await reviewLeaveRequestAction(id, status);
      if (res.success) {
        setRequests((prev) =>
          prev.map((r) => (r.id === id ? { ...r, status } : r))
        );
      } else {
        setError(res.error || 'Failed to update leave request');
      }
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3" />
            Pending Review
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Leave Management
          </h1>
          <p className="text-sm text-slate-500">
            Student absence notes and staff leave approvals integrated with attendance records
          </p>
        </div>
        {canApply && linkedStudents.length > 0 && (
          <button
            type="button"
            onClick={() => setShowApplyModal(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-lg bg-slate-900 text-white text-xs font-semibold shadow-sm hover:bg-slate-800 transition"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Apply for Child Leave</span>
          </button>
        )}
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Leave Requests Table */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/50">
                <th className="py-2.5 px-4">Applicant / Student</th>
                <th className="py-2.5 px-4">Type</th>
                <th className="py-2.5 px-4">Leave Window</th>
                <th className="py-2.5 px-4">Reason</th>
                <th className="py-2.5 px-4">Status</th>
                <th className="py-2.5 px-4">Reviewer</th>
                {canApprove && <th className="py-2.5 px-4 text-right">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={canApprove ? 7 : 6} className="py-12 text-center text-slate-400">
                    No leave requests found
                  </td>
                </tr>
              ) : (
                requests.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-semibold text-slate-800">
                      {r.student
                        ? `${r.student.firstName} ${r.student.lastName}`
                        : 'Staff Member'}
                    </td>
                    <td className="py-3 px-4 capitalize text-slate-500">
                      {r.applicantType} ({r.leaveType})
                    </td>
                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {r.startDate} <span className="text-slate-400">to</span> {r.endDate}
                    </td>
                    <td className="py-3 px-4 text-slate-600 max-w-[250px] truncate">
                      {r.reason}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(r.status)}</td>
                    <td className="py-3 px-4 text-[11px] text-slate-500">
                      {r.reviewer?.fullName || '—'}
                    </td>
                    {canApprove && (
                      <td className="py-3 px-4 text-right">
                        {r.status === 'pending' && (
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleReview(r.id, 'approved')}
                              disabled={isPending}
                              className="px-2 py-1 rounded bg-emerald-600 text-white text-[11px] font-semibold hover:bg-emerald-700 transition"
                            >
                              Approve
                            </button>
                            <button
                              type="button"
                              onClick={() => handleReview(r.id, 'rejected')}
                              disabled={isPending}
                              className="px-2 py-1 rounded bg-rose-600 text-white text-[11px] font-semibold hover:bg-rose-700 transition"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Apply for Student Leave</h3>
              <button
                type="button"
                onClick={() => setShowApplyModal(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleApply} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Select Child *</label>
                <select
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                >
                  {linkedStudents.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.firstName} {st.lastName} ({st.admissionNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Date *</label>
                  <input
                    type="date"
                    required
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Reason for Absence *</label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Family medical emergency / health issue"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowApplyModal(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isPending ? 'Submitting...' : 'Submit Leave Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
