'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../../FeesNav';
import { recordFeePaymentAction } from '../../actions';
import {
  ArrowLeft,
  CreditCard,
  AlertCircle,
  Wallet,
} from 'lucide-react';

interface NewFeePaymentClientProps {
  students: any[];
  userRole: string;
}

export function NewFeePaymentClient({ students, userRole }: NewFeePaymentClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const defaultStudentId = searchParams.get('studentId') || students[0]?.id || '';
  const defaultAssignmentId = searchParams.get('assignmentId') || '';

  const [studentId, setStudentId] = useState(defaultStudentId);
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [assignmentId, setAssignmentId] = useState(defaultAssignmentId);
  const [amountReceived, setAmountReceived] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<any>('cash');
  const [externalTransactionId, setExternalTransactionId] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync selected student
  useEffect(() => {
    const s = students.find((item) => item.id === studentId);
    setSelectedStudent(s || null);

    // Auto-select first active assignment if available
    const activeAssignments = s?.student_fee_assignments || [];
    if (activeAssignments.length > 0) {
      const match = defaultAssignmentId
        ? activeAssignments.find((a: any) => a.id === defaultAssignmentId) || activeAssignments[0]
        : activeAssignments[0];
      setAssignmentId(match.id);
      setAmountReceived(Number(match.balance_amount) || 0);
    } else {
      setAssignmentId('');
      setAmountReceived(0);
    }
  }, [studentId, students, defaultAssignmentId]);

  const currentAssignment = selectedStudent?.student_fee_assignments?.find(
    (a: any) => a.id === assignmentId
  );

  const pendingBalance = Number(currentAssignment?.balance_amount) || 0;
  const isOverpayment = amountReceived > pendingBalance && pendingBalance > 0;
  const excessAmount = isOverpayment ? amountReceived - pendingBalance : 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!studentId) {
      setError('Please select a student.');
      return;
    }

    if (amountReceived <= 0) {
      setError('Amount received must be greater than zero.');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        studentId,
        assignmentId: assignmentId || null,
        amountReceived: Number(amountReceived),
        paymentMethod,
        paymentDate: new Date().toISOString().slice(0, 10),
        externalTransactionId: externalTransactionId || undefined,
        notes: notes || undefined,
        allocations: [],
      };

      const res = await recordFeePaymentAction(payload as any);
      if (!res.success) {
        setError(res.error || 'Failed to record payment.');
        setLoading(false);
        return;
      }

      const receiptNumber = res.data?.receipt_number;
      router.push(`/dashboard/fees/receipts?receipt=${receiptNumber}`);
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unexpected payment recording error.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex items-center space-x-3 px-2">
        <Link href="/dashboard/fees/collections">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Collections
          </Button>
        </Link>
      </div>

      <div className="px-2">
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Record Fee Payment (Counter Receipt)</CardTitle>
            <p className="text-sm text-slate-500">
              Collect fees via Cash, UPI, Card, Bank Transfer, or apply Advance Wallet balances.
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-6 flex items-center space-x-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Student Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Select Student *
                </label>
                <Select
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                  required
                >
                  <option value="">Choose Student</option>
                  {students.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.first_name} {st.last_name} ({st.admission_number || 'No Adm #'}) - {st.academic_class?.name || 'Class'}
                    </option>
                  ))}
                </Select>
              </div>

              {/* Student Assignment Info */}
              {selectedStudent && (
                <div className="rounded-lg border border-slate-100 bg-slate-50/60 p-4 dark:border-slate-800 dark:bg-slate-900/40 space-y-3">
                  <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                    <span>Active Fee Structure</span>
                    <span>Outstanding Balance</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {currentAssignment?.fee_structures?.name || 'Assigned Tuition Fee'}
                    </div>
                    <div className="text-lg font-bold text-amber-600 dark:text-amber-400">
                      ₹{pendingBalance.toLocaleString()}
                    </div>
                  </div>
                </div>
              )}

              {/* Amount Received */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Amount Received (₹) *
                </label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  placeholder="0.00"
                  value={amountReceived || ''}
                  onChange={(e) => setAmountReceived(Number(e.target.value))}
                  required
                />
              </div>

              {/* Overpayment Wallet Notice */}
              {isOverpayment && (
                <div className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 flex items-start space-x-2">
                  <Wallet className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold">Advance Wallet Credit:</span> An excess amount of ₹{excessAmount.toLocaleString()} will be automatically credited to the student&apos;s advance wallet balance and can be utilized for future terms.
                  </div>
                </div>
              )}

              {/* Payment Method */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Payment Method *
                  </label>
                  <Select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    required
                  >
                    <option value="cash">Cash (Counter)</option>
                    <option value="upi">UPI / QR Code</option>
                    <option value="bank_transfer">Bank Transfer / NEFT / IMPS</option>
                    <option value="card">Debit / Credit Card</option>
                    <option value="cheque">Cheque</option>
                    <option value="demand_draft">Demand Draft (DD)</option>
                    <option value="advance_wallet">Advance Wallet Balance</option>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Reference / Transaction ID
                  </label>
                  <Input
                    placeholder="e.g. UPI Ref, UTR, or Cheque #"
                    value={externalTransactionId}
                    onChange={(e) => setExternalTransactionId(e.target.value)}
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Receipt Remarks / Notes (Optional)
                </label>
                <Input
                  placeholder="Optional internal remarks..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                <Link href="/dashboard/fees/collections">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  <CreditCard className="h-4 w-4 mr-1.5" />
                  {loading ? 'Processing...' : 'Collect & Issue Receipt'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
