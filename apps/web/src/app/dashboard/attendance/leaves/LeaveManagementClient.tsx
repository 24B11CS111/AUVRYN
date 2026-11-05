'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Plus,
  ArrowLeft,
  X,
  Loader2,
  User,
  Building,
} from 'lucide-react';
import { submitLeaveRequestAction, reviewLeaveRequestAction } from '../actions';
import type { LeaveType, LeaveApplicantType } from '@edu-platform/types';

interface LeaveManagementClientProps {
  initialLeaves: any[];
  students: Array<{ id: string; name: string; admissionNumber: string }>;
  staffList: Array<{ id: string; name: string; employeeId: string }>;
  canReview: boolean;
}

export function LeaveManagementClient({
  initialLeaves,
  students,
  staffList,
  canReview,
}: LeaveManagementClientProps) {
  const [leaves, setLeaves] = useState(initialLeaves);
  const [activeTab, setActiveTab] = useState<'student' | 'staff'>('student');
  const [statusFilter, setStatusFilter] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Apply Leave Modal state
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [applicantType, setApplicantType] = useState<LeaveApplicantType>('student');
  const [selectedStudentId, setSelectedStudentId] = useState(students[0]?.id || '');
  const [selectedStaffId, setSelectedStaffId] = useState(staffList[0]?.id || '');
  const [leaveType, setLeaveType] = useState<LeaveType>('casual');
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));
  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');
  const [isApplying, startApplying] = useTransition();

  // Review Modal state
  const [reviewingLeave, setReviewingLeave] = useState<any | null>(null);
  const [reviewDecision, setReviewDecision] = useState<'approved' | 'rejected'>('approved');
  const [reviewRemarks, setReviewRemarks] = useState('');
  const [isReviewing, startReviewing] = useTransition();

  // Apply leave submit
  const handleApplyLeave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim() || reason.trim().length < 5) {
      setFeedback({ type: 'error', message: 'Reason must be at least 5 characters.' });
      return;
    }
    if (endDate < startDate) {
      setFeedback({ type: 'error', message: 'End date cannot precede start date.' });
      return;
    }

    startApplying(async () => {
      const res = await submitLeaveRequestAction({
        applicantType,
        studentId: applicantType === 'student' ? selectedStudentId : undefined,
        staffId: applicantType === 'staff' ? selectedStaffId : undefined,
        leaveType,
        startDate,
        endDate,
        reason: reason.trim(),
        supportingDocumentUrl: documentUrl.trim() || undefined,
      });

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.error || 'Failed to submit leave request.' });
        return;
      }

      setShowApplyModal(false);
      setReason('');
      setDocumentUrl('');
      setFeedback({
        type: 'success',
        message: 'Leave application submitted successfully for review!',
      });

      // Construct optimistic row
      const applicantName =
        applicantType === 'student'
          ? students.find((s) => s.id === selectedStudentId)?.name || 'Student'
          : staffList.find((s) => s.id === selectedStaffId)?.name || 'Staff';

      setLeaves((prev) => [
        {
          id: res.data!.leaveId,
          applicant_type: applicantType,
          student_id: applicantType === 'student' ? selectedStudentId : null,
          staff_id: applicantType === 'staff' ? selectedStaffId : null,
          leave_type: leaveType,
          start_date: startDate,
          end_date: endDate,
          reason,
          status: 'pending',
          created_at: new Date().toISOString(),
          student: applicantType === 'student' ? { first_name: applicantName, last_name: '' } : null,
          staff: applicantType === 'staff' ? { first_name: applicantName, last_name: '' } : null,
        },
        ...prev,
      ]);
    });
  };

  // Review leave submit
  const handleReviewLeave = () => {
    if (!reviewingLeave) return;

    startReviewing(async () => {
      const res = await reviewLeaveRequestAction({
        leaveRequestId: reviewingLeave.id,
        status: reviewDecision,
        reviewRemarks: reviewRemarks.trim() || undefined,
      });

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to update leave request.' });
        return;
      }

      setLeaves((prev) =>
        prev.map((l) =>
          l.id === reviewingLeave.id
            ? { ...l, status: reviewDecision, review_remarks: reviewRemarks.trim() }
            : l
        )
      );

      setReviewingLeave(null);
      setFeedback({
        type: 'success',
        message: `Leave request marked as ${reviewDecision}!`,
      });
    });
  };

  // Filter leaves
  const filteredLeaves = leaves.filter((l) => {
    if (l.applicant_type !== activeTab) return false;
    if (statusFilter && l.status !== statusFilter) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/attendance" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Leave Management</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Student and staff leave requests, medical certificates, and official approvals synchronized with attendance.
          </p>
        </div>

        <Button
          onClick={() => setShowApplyModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm text-xs"
        >
          <Plus className="h-4 w-4" />
          <span>Apply for Leave</span>
        </Button>
      </div>

      {/* Global Feedback */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button onClick={() => setFeedback(null)} className="text-xs text-slate-400 hover:text-slate-600 font-bold">
            &times;
          </button>
        </div>
      )}

      {/* Tabs & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('student')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'student'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Student Leaves</span>
          </button>
          <button
            onClick={() => setActiveTab('staff')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'staff'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <Building className="h-4 w-4" />
            <span>Staff Leaves</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Leaves List */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">
            {activeTab === 'student' ? 'Student Leave Applications' : 'Staff Leave Applications'} ({filteredLeaves.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredLeaves.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p>No leave requests found.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredLeaves.map((l: any) => {
                const applicantName =
                  l.applicant_type === 'student'
                    ? `${l.student?.first_name || ''} ${l.student?.last_name || ''}`
                    : `${l.staff?.first_name || ''} ${l.staff?.last_name || ''}`;

                return (
                  <div key={l.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">{applicantName}</span>
                        <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700 capitalize font-medium">
                          {l.leave_type} Leave
                        </Badge>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-bold capitalize ${
                            l.status === 'approved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : l.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {l.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        Duration: <strong>{l.start_date}</strong> to <strong>{l.end_date}</strong>
                        {l.supporting_document_url && (
                          <span>
                            {' '}&bull;{' '}
                            <a
                              href={l.supporting_document_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 underline"
                            >
                              View Attachment
                            </a>
                          </span>
                        )}
                      </p>

                      <p className="text-xs text-slate-700 italic">
                        &quot;{l.reason}&quot;
                      </p>

                      {l.review_remarks && (
                        <p className="text-xs text-slate-500">
                          Reviewer Remarks: {l.review_remarks}
                        </p>
                      )}
                    </div>

                    {canReview && l.status === 'pending' && (
                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewingLeave(l);
                            setReviewDecision('approved');
                            setReviewRemarks('');
                          }}
                          className="text-xs text-emerald-700 border-emerald-300 hover:bg-emerald-50 h-8"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setReviewingLeave(l);
                            setReviewDecision('rejected');
                            setReviewRemarks('');
                          }}
                          className="text-xs text-rose-700 border-rose-300 hover:bg-rose-50 h-8"
                        >
                          <XCircle className="h-3.5 w-3.5 mr-1" />
                          Reject
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Apply Leave Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-lg bg-white shadow-2xl border-slate-200 animate-in fade-in-50 zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span>Submit Leave Application</span>
              </CardTitle>
              <button onClick={() => setShowApplyModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-5">
              <form onSubmit={handleApplyLeave} className="space-y-4">
                {/* Applicant Type */}
                <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setApplicantType('student')}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      applicantType === 'student' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Student
                  </button>
                  <button
                    type="button"
                    onClick={() => setApplicantType('staff')}
                    className={`py-1.5 text-xs font-semibold rounded-md transition-colors ${
                      applicantType === 'staff' ? 'bg-white text-indigo-700 shadow-xs' : 'text-slate-600'
                    }`}
                  >
                    Staff / Faculty
                  </button>
                </div>

                {/* Applicant Select */}
                {applicantType === 'student' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Student *</label>
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      {students.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.admissionNumber})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Select Staff Member *</label>
                    <select
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                    >
                      {staffList.map((st) => (
                        <option key={st.id} value={st.id}>
                          {st.name} ({st.employeeId})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Leave Type */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Leave Type *</label>
                  <select
                    value={leaveType}
                    onChange={(e) => setLeaveType(e.target.value as LeaveType)}
                    className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="casual">Casual Leave</option>
                    <option value="sick">Sick / Medical Leave</option>
                    <option value="academic">Academic / Duty Leave</option>
                    <option value="bereavement">Bereavement Leave</option>
                    <option value="maternity">Maternity Leave</option>
                    <option value="emergency">Emergency Leave</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Date Range */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date *</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="text-xs bg-white"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">End Date *</label>
                    <Input
                      type="date"
                      value={endDate}
                      min={startDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="text-xs bg-white"
                      required
                    />
                  </div>
                </div>

                {/* Reason */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Leave *</label>
                  <textarea
                    rows={3}
                    placeholder="Provide detailed explanation for this leave request..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                {/* Supporting Document URL */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Supporting Document URL (Optional)
                  </label>
                  <Input
                    type="url"
                    placeholder="https://..."
                    value={documentUrl}
                    onChange={(e) => setDocumentUrl(e.target.value)}
                    className="text-xs bg-white"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <Button type="button" variant="outline" size="sm" onClick={() => setShowApplyModal(false)}>
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isApplying}
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                  >
                    {isApplying ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                        Submitting...
                      </>
                    ) : (
                      'Submit Application'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Review Modal */}
      {reviewingLeave && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-slate-200 animate-in fade-in-50 zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-indigo-600" />
                <span>Review Leave Request</span>
              </CardTitle>
              <button onClick={() => setReviewingLeave(null)} className="text-slate-400 hover:text-slate-600 font-bold">
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p>
                  <strong>Dates:</strong> {reviewingLeave.start_date} to {reviewingLeave.end_date}
                </p>
                <p>
                  <strong>Type:</strong> <span className="capitalize">{reviewingLeave.leave_type}</span>
                </p>
                <p>
                  <strong>Reason:</strong> {reviewingLeave.reason}
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Decision *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setReviewDecision('approved')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      reviewDecision === 'approved'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-400 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Approve Leave
                  </button>
                  <button
                    type="button"
                    onClick={() => setReviewDecision('rejected')}
                    className={`py-2 text-xs font-bold rounded-lg border transition-all ${
                      reviewDecision === 'rejected'
                        ? 'bg-rose-50 text-rose-800 border-rose-400 shadow-xs'
                        : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Reject Leave
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Remarks (Optional)</label>
                <textarea
                  rows={2}
                  placeholder="Review notes or conditions..."
                  value={reviewRemarks}
                  onChange={(e) => setReviewRemarks(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setReviewingLeave(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleReviewLeave}
                  disabled={isReviewing}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {isReviewing ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    'Confirm Decision'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
