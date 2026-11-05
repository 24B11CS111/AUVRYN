'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import {
  requestFeeRefundAction,
  processFeeRefundAction,
} from '../actions';
import {
  RotateCcw,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  X,
} from 'lucide-react';

interface FeeRefundsClientProps {
  initialRefunds: any[];
  completedPayments: any[];
  userRole: string;
}

export function FeeRefundsClient({
  initialRefunds,
  completedPayments,
  userRole,
}: FeeRefundsClientProps) {
  const [refunds, setRefunds] = useState<any[]>(initialRefunds);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Request modal state
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [selectedPaymentId, setSelectedPaymentId] = useState(completedPayments[0]?.id || '');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [refundReason, setRefundReason] = useState('');
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);

  // Process / Approve modal state (Admin only)
  const [processingRefund, setProcessingRefund] = useState<any | null>(null);
  const [disbursementMethod, setDisbursementMethod] = useState<any>('bank_transfer');
  const [disbursementRef, setDisbursementRef] = useState('');
  const [processLoading, setProcessLoading] = useState(false);
  const [processError, setProcessError] = useState<string | null>(null);

  const isAdmin = ['owner', 'admin'].includes(userRole);

  const filteredRefunds = refunds.filter((r) => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const rNum = (r.refund_number || '').toLowerCase();
      const sName = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.toLowerCase();
      if (!rNum.includes(q) && !sName.includes(q)) return false;
    }
    return true;
  });

  const handleRequestSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestLoading(true);

    try {
      const payment = completedPayments.find((p) => p.id === selectedPaymentId);
      if (!payment) {
        setRequestError('Please select a valid completed payment.');
        setRequestLoading(false);
        return;
      }

      const res = await requestFeeRefundAction({
        paymentId: selectedPaymentId,
        studentId: payment.student_id,
        refundAmount: Number(refundAmount),
        reason: refundReason,
      });

      if (!res.success) {
        setRequestError(res.error || 'Failed to submit refund request.');
        setRequestLoading(false);
        return;
      }

      setRefunds((prev) => [res.data, ...prev]);
      setShowRequestModal(false);
      setRequestLoading(false);
    } catch (err: any) {
      setRequestError(err?.message || 'Unexpected error occurred.');
      setRequestLoading(false);
    }
  };

  const handleProcessSubmit = async (status: 'approved' | 'rejected') => {
    if (!processingRefund) return;
    setProcessError(null);
    setProcessLoading(true);

    try {
      const res = await processFeeRefundAction({
        refundId: processingRefund.id,
        status,
        disbursementMethod: status === 'approved' ? disbursementMethod : undefined,
        disbursementReference: status === 'approved' ? disbursementRef : undefined,
      });

      if (!res.success) {
        setProcessError(res.error || 'Failed to process refund.');
        setProcessLoading(false);
        return;
      }

      setRefunds((prev) =>
        prev.map((r) =>
          r.id === processingRefund.id
            ? { ...r, status: status === 'approved' ? 'processed' : 'rejected' }
            : r
        )
      );

      setProcessingRefund(null);
      setProcessLoading(false);
    } catch (err: any) {
      setProcessError(err?.message || 'Error executing refund action.');
      setProcessLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'processed':
      case 'approved':
        return <Badge className="bg-emerald-600">Processed</Badge>;
      case 'requested':
      case 'under_review':
        return <Badge className="bg-amber-600">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-rose-600">Rejected</Badge>;
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
            Fee Refund Management
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Governed refund lifecycle with mandatory separation of duties and audited reversal ledger.
          </p>
        </div>
        <Button size="sm" onClick={() => setShowRequestModal(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Request Refund
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 px-2 max-w-lg">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search refund # or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">All Refund Statuses</option>
          <option value="requested">Requested / Pending</option>
          <option value="processed">Approved & Processed</option>
          <option value="rejected">Rejected</option>
        </Select>
      </div>

      {/* Refunds Table */}
      <div className="px-2">
        <Card>
          <CardContent className="p-0">
            {filteredRefunds.length === 0 ? (
              <div className="py-12 text-center">
                <RotateCcw className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  No refund records found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No fee refund requests match your current filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                    <tr>
                      <th className="py-3.5 px-4">Refund #</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Receipt Ref</th>
                      <th className="py-3.5 px-4">Requested Amount</th>
                      <th className="py-3.5 px-4">Approved Amount</th>
                      <th className="py-3.5 px-4">Reason</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredRefunds.map((r) => (
                      <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3.5 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                          {r.refund_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {r.student?.first_name} {r.student?.last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Adm: {r.student?.admission_number || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs text-slate-600 dark:text-slate-400">
                          {r.fee_payments?.receipt_number || 'N/A'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(r.amount_requested)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-emerald-600">
                          {r.amount_approved ? formatCurrency(r.amount_approved) : '—'}
                        </td>
                        <td className="py-3.5 px-4 max-w-xs truncate text-xs text-slate-500">
                          {r.reason}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(r.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          {isAdmin && r.status === 'requested' && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setProcessingRefund(r)}
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

      {/* Modal: Request Refund */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Request Fee Refund</CardTitle>
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
                    Select Completed Payment *
                  </label>
                  <Select
                    value={selectedPaymentId}
                    onChange={(e) => {
                      setSelectedPaymentId(e.target.value);
                      const p = completedPayments.find((item) => item.id === e.target.value);
                      if (p) setRefundAmount(Number(p.amount_received));
                    }}
                    required
                  >
                    {completedPayments.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.receipt_number} - {p.student?.first_name} {p.student?.last_name} (₹{Number(p.amount_received).toLocaleString()})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Refund Amount Requested (₹) *
                  </label>
                  <Input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={refundAmount || ''}
                    onChange={(e) => setRefundAmount(Number(e.target.value))}
                    required
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Detailed Reason for Refund *
                  </label>
                  <Input
                    placeholder="e.g. Course withdrawal, duplicate deposit, category adjustment..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    required
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <Button type="button" variant="outline" onClick={() => setShowRequestModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={requestLoading}>
                    {requestLoading ? 'Submitting...' : 'Submit Request'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: Process Refund (Admin Separation of Duty) */}
      {processingRefund && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Authorize & Process Refund</CardTitle>
                <p className="text-xs text-slate-500 font-mono">
                  {processingRefund.refund_number} • Student: {processingRefund.student?.first_name} {processingRefund.student?.last_name}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setProcessingRefund(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {processError && (
                <div className="rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {processError}
                </div>
              )}

              <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-800 space-y-1 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Requested Amount:</span>
                  <span className="font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(processingRefund.amount_requested)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Reason:</span>
                  <span className="text-slate-700 dark:text-slate-300 font-medium">
                    {processingRefund.reason}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Disbursement Method *
                </label>
                <Select
                  value={disbursementMethod}
                  onChange={(e) => setDisbursementMethod(e.target.value)}
                >
                  <option value="bank_transfer">Bank Transfer / NEFT</option>
                  <option value="upi">UPI</option>
                  <option value="cash">Cash (Counter)</option>
                  <option value="cheque">Cheque</option>
                  <option value="advance_wallet">Credit to Student Advance Wallet</option>
                </Select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Disbursement UTR / Bank Reference
                </label>
                <Input
                  placeholder="e.g. UTR-982341234 or Cheque #"
                  value={disbursementRef}
                  onChange={(e) => setDisbursementRef(e.target.value)}
                />
              </div>

              <div className="flex justify-between items-center pt-3 border-t border-slate-100 dark:border-slate-800">
                <Button
                  type="button"
                  variant="danger"
                  size="sm"
                  disabled={processLoading}
                  onClick={() => handleProcessSubmit('rejected')}
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={processLoading}
                  onClick={() => handleProcessSubmit('approved')}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Approve & Disburse
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
