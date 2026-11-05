'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import {
  requestFeeConcessionAction,
  approveFeeConcessionAction,
} from '../actions';
import {
  Gift,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';

interface FeeConcessionsClientProps {
  initialConcessions: any[];
  activeAssignments: any[];
  userRole: string;
}

export function FeeConcessionsClient({
  initialConcessions,
  activeAssignments,
  userRole,
}: FeeConcessionsClientProps) {
  const [concessions, setConcessions] = useState<any[]>(initialConcessions);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState(activeAssignments[0]?.id || '');
  const [concessionType, setConcessionType] = useState<any>('scholarship');
  const [calcType, setCalcType] = useState<any>('percentage');
  const [calcValue, setCalcValue] = useState<number>(10);
  const [reason, setReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Approve modal state (Admin only)
  const [reviewingConcession, setReviewingConcession] = useState<any | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);

  const isAdmin = ['owner', 'admin'].includes(userRole);

  const filteredConcessions = concessions.filter((c) => {
    if (statusFilter !== 'all' && c.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sName = `${c.student?.first_name || ''} ${c.student?.last_name || ''}`.toLowerCase();
      const adm = (c.student?.admission_number || '').toLowerCase();
      const type = (c.concession_type || '').toLowerCase();
      if (!sName.includes(q) && !adm.includes(q) && !type.includes(q)) return false;
    }
    return true;
  });

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestLoading(true);

    try {
      const assignment = activeAssignments.find((a) => a.id === selectedAssignmentId);
      if (!assignment) {
        setRequestError('Please select a valid student fee assignment.');
        setRequestLoading(false);
        return;
      }

      const res = await requestFeeConcessionAction({
        studentId: assignment.student_id,
        assignmentId: selectedAssignmentId,
        concessionType,
        calculationType: calcType,
        concessionValue: Number(calcValue),
        reason,
      });

      if (!res.success) {
        setRequestError(res.error || 'Failed to submit concession request.');
        setRequestLoading(false);
        return;
      }

      setConcessions((prev) => [res.data, ...prev]);
      setShowRequestModal(false);
      setRequestLoading(false);
    } catch (err: any) {
      setRequestError(err?.message || 'Unexpected error occurred.');
      setRequestLoading(false);
    }
  };

  const handleReviewSubmit = async (status: 'approved' | 'rejected') => {
    if (!reviewingConcession) return;
    setReviewError(null);
    setReviewLoading(true);

    try {
      const res = await approveFeeConcessionAction({
        concessionId: reviewingConcession.id,
        status,
        rejectionReason: status === 'rejected' ? rejectionReason : undefined,
      });

      if (!res.success) {
        setReviewError(res.error || 'Failed to review concession.');
        setReviewLoading(false);
        return;
      }

      setConcessions((prev) =>
        prev.map((c) =>
          c.id === reviewingConcession.id ? { ...c, status } : c
        )
      );

      setReviewingConcession(null);
      setReviewLoading(false);
    } catch (err: any) {
      setReviewError(err?.message || 'Error processing concession review.');
      setReviewLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-emerald-600">Approved</Badge>;
      case 'requested':
      case 'under_review':
        return <Badge className="bg-amber-600">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-600">Rejected</Badge>;
      case 'revoked':
        return <Badge className="bg-purple-600">Revoked</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Concessions & Scholarships
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Merit scholarships, sibling discounts, and fee concessions with administrative dual-control approval.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowRequestModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Apply for Concession
        </Button>
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by student or type..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Statuses</option>
          <option value="requested">Pending Review</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {/* Concessions Table */}
      <div className="px-2">
        <Card>
          <CardContent className="p-0">
            {filteredConcessions.length === 0 ? (
              <div className="py-12 text-center">
                <Gift className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  No concessions found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No scholarship or discount requests match your filter.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Concession Type</th>
                      <th className="py-3.5 px-4">Calculation</th>
                      <th className="py-3.5 px-4">Original Fee</th>
                      <th className="py-3.5 px-4">Discount Value</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredConcessions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {c.student?.first_name} {c.student?.last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Adm: {c.student?.admission_number || 'N/A'} • {c.student?.academic_class?.name || ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="capitalize">
                            {c.concession_type?.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {c.calculation_type === 'percentage'
                            ? `${c.calculation_value}%`
                            : `Fixed ${formatCurrency(c.calculation_value)}`}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(c.original_amount)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {c.approved_amount > 0 ? `-${formatCurrency(c.approved_amount)}` : 'Pending'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500">
                          {c.reason}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(c.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin && (c.status === 'requested' || c.status === 'under_review') && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setReviewingConcession(c)}
                            >
                              Review
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal: Request Concession */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Apply for Fee Concession / Scholarship</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowRequestModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {requestError && (
                <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {requestError}
                </div>
              )}
              <form onSubmit={handleRequestSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Active Student Fee Assignment *
                  </label>
                  <Select
                    value={selectedAssignmentId}
                    onChange={(e) => setSelectedAssignmentId(e.target.value)}
                    required
                  >
                    {activeAssignments.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.student?.first_name} {a.student?.last_name} (Adm: {a.student?.admission_number}) - Net: ₹{Number(a.net_amount).toLocaleString()}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Concession Type *
                    </label>
                    <Select
                      value={concessionType}
                      onChange={(e) => setConcessionType(e.target.value)}
                    >
                      <option value="scholarship">Merit Scholarship</option>
                      <option value="sibling_discount">Sibling Discount</option>
                      <option value="staff_ward">Staff Ward Waiver</option>
                      <option value="financial_aid">Need-based Aid</option>
                      <option value="sports_quota">Sports Quota</option>
                      <option value="early_bird">Early Bird</option>
                      <option value="special_waiver">Special Waiver</option>
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Calculation Type *
                    </label>
                    <Select
                      value={calcType}
                      onChange={(e) => setCalcType(e.target.value)}
                    >
                      <option value="percentage">Percentage (%)</option>
                      <option value="fixed_amount">Fixed Amount (₹)</option>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Concession Value ({calcType === 'percentage' ? '%' : '₹'}) *
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={calcValue || ''}
                    onChange={(e) => setCalcValue(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Justification / Reason *
                  </label>
                  <Input
                    placeholder="e.g. Sibling studying in Grade 8, Board 98th percentile award..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <Button type="button" variant="outline" onClick={() => setShowRequestModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={requestLoading}>
                    {requestLoading ? 'Submitting...' : 'Submit Concession Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Review & Approve (Admin Dual Control) */}
      {reviewingConcession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Review Concession Request</CardTitle>
                <p className="text-xs text-slate-500">
                  Student: {reviewingConcession.student?.first_name} {reviewingConcession.student?.last_name}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setReviewingConcession(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {reviewError && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {reviewError}
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Concession Type:</span>
                  <span className="font-semibold capitalize text-slate-900 dark:text-slate-100">
                    {reviewingConcession.concession_type?.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Rate:</span>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">
                    {reviewingConcession.calculation_type === 'percentage'
                      ? `${reviewingConcession.calculation_value}%`
                      : formatCurrency(reviewingConcession.calculation_value)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reason:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {reviewingConcession.reason}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Rejection Reason (Required only if rejecting)
                </label>
                <Input
                  placeholder="e.g. Quota exhausted, documentation incomplete..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={reviewLoading}
                  onClick={() => handleReviewSubmit('rejected')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Request
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={reviewLoading}
                  onClick={() => handleReviewSubmit('approved')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve Concession
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
