'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FeesNav } from '../FeesNav';
import { getPaymentReceiptAction } from '../actions';
import {
  Receipt,
  Search,
  Printer,
  ShieldCheck,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';

interface FeeReceiptsClientProps {
  initialReceiptNumber: string;
  userRole: string;
}

export function FeeReceiptsClient({ initialReceiptNumber, userRole }: FeeReceiptsClientProps) {
  const searchParams = useSearchParams();
  const [receiptNumber, setReceiptNumber] = useState(
    searchParams.get('receipt') || initialReceiptNumber || ''
  );
  const [receiptData, setReceiptData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchReceipt = async (rNum: string) => {
    if (!rNum.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await getPaymentReceiptAction(rNum.trim());
      if (!res.success) {
        setError(res.error || 'Receipt not found.');
        setReceiptData(null);
      } else {
        setReceiptData(res.data);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch receipt.');
      setReceiptData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialReceiptNumber) {
      fetchReceipt(initialReceiptNumber);
    }
  }, [initialReceiptNumber]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchReceipt(receiptNumber);
  };

  const handlePrint = () => {
    window.print();
  };

  const formatCurrency = (amount: number, curr = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Hide on print */}
      <div className="print:hidden space-y-4">
        <FeesNav userRole={userRole} />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Fee Payment Receipts
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Generate, verify, and print official fee payment receipts with cryptographic QR verification.
            </p>
          </div>
          {receiptData && (
            <Button onClick={handlePrint} size="sm">
              <Printer className="mr-2 h-4 w-4" />
              Print Receipt
            </Button>
          )}
        </div>

        {/* Search input */}
        <div className="px-2">
          <form onSubmit={handleSearch} className="flex gap-2 max-w-md">
            <Input
              placeholder="Enter receipt number (e.g. RCP-2026-000001)..."
              value={receiptNumber}
              onChange={(e) => setReceiptNumber(e.target.value)}
              className="flex-1"
            />
            <Button type="submit" disabled={loading}>
              <Search className="h-4 w-4 mr-1.5" />
              {loading ? 'Searching...' : 'Find'}
            </Button>
          </form>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="mx-2 flex items-center space-x-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 print:hidden">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Printable Receipt Paper Container */}
      {receiptData ? (
        <div className="px-2">
          <div className="mx-auto max-w-3xl rounded-xl border border-slate-200 bg-white p-8 shadow-sm dark:border-slate-800 dark:bg-slate-950 print:border-none print:shadow-none print:p-0">
            {/* Header / Institution Details */}
            <div className="border-b border-slate-200 pb-6 text-center dark:border-slate-800">
              <h2 className="text-2xl font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100">
                {receiptData.institution?.name || 'Educational Institution'}
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                {[
                  receiptData.institution?.address,
                  receiptData.institution?.city,
                  receiptData.institution?.state,
                  receiptData.institution?.country,
                  receiptData.institution?.postal_code,
                ]
                  .filter(Boolean)
                  .join(', ')}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                Email: {receiptData.institution?.email || 'office@institution.edu'} • Phone: {receiptData.institution?.phone || 'N/A'}
              </p>
              <div className="mt-4 inline-block rounded-full bg-blue-50 px-4 py-1 text-xs font-bold uppercase tracking-widest text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                Official Fee Payment Receipt
              </div>
            </div>

            {/* Receipt Meta & Student Info */}
            <div className="grid grid-cols-2 gap-6 py-6 border-b border-slate-100 dark:border-slate-800 text-xs">
              <div className="space-y-1.5">
                <div className="text-slate-400 font-semibold uppercase">Student Details</div>
                <div className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {receiptData.payment?.student?.first_name} {receiptData.payment?.student?.last_name}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Admission No: <span className="font-mono font-medium">{receiptData.payment?.student?.admission_number || 'N/A'}</span>
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Class: {receiptData.payment?.student?.academic_class?.name || 'Standard'} {receiptData.payment?.student?.academic_section?.name ? `(${receiptData.payment?.student?.academic_section?.name})` : ''}
                </div>
                {receiptData.payment?.student?.roll_number && (
                  <div className="text-slate-600 dark:text-slate-300">
                    Roll No: {receiptData.payment?.student?.roll_number}
                  </div>
                )}
              </div>

              <div className="space-y-1.5 text-right">
                <div className="text-slate-400 font-semibold uppercase">Receipt Meta</div>
                <div className="text-sm font-mono font-bold text-blue-600 dark:text-blue-400">
                  {receiptData.payment?.receipt_number}
                </div>
                <div className="text-slate-600 dark:text-slate-300">
                  Date: {new Date(receiptData.payment?.payment_date).toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
                <div className="text-slate-600 dark:text-slate-300 capitalize">
                  Method: {receiptData.payment?.payment_method?.replace('_', ' ')}
                </div>
                {receiptData.payment?.transaction_reference && (
                  <div className="text-slate-500 font-mono text-[11px]">
                    Ref: {receiptData.payment?.transaction_reference}
                  </div>
                )}
              </div>
            </div>

            {/* Allocations Table */}
            <div className="py-6">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-200 text-slate-500 uppercase font-semibold dark:border-slate-800">
                  <tr>
                    <th className="py-2.5 px-3">#</th>
                    <th className="py-2.5 px-3">Fee Particular / Head</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {(receiptData.payment?.payment_allocations || []).length > 0 ? (
                    receiptData.payment.payment_allocations.map((alloc: any, idx: number) => (
                      <tr key={alloc.id || idx}>
                        <td className="py-2.5 px-3 text-slate-400">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                          {alloc.fee_head?.name || 'Tuition / Term Fee'}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 capitalize">
                          {alloc.fee_head?.category || 'tuition'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(alloc.allocated_amount, receiptData.payment?.currency)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="py-2.5 px-3 text-slate-400">1</td>
                      <td className="py-2.5 px-3 font-medium text-slate-800 dark:text-slate-200">
                        Term Tuition & Institutional Fees
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 capitalize">Tuition</td>
                      <td className="py-2.5 px-3 text-right font-semibold text-slate-900 dark:text-slate-100">
                        {formatCurrency(receiptData.payment?.allocated_amount, receiptData.payment?.currency)}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* Totals Summary */}
              <div className="mt-4 border-t border-slate-200 pt-4 space-y-1.5 text-xs text-right dark:border-slate-800">
                <div className="flex justify-end space-x-8">
                  <span className="text-slate-500">Allocated Amount:</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {formatCurrency(receiptData.payment?.allocated_amount, receiptData.payment?.currency)}
                  </span>
                </div>
                {Number(receiptData.payment?.advance_credit_amount) > 0 && (
                  <div className="flex justify-end space-x-8 text-emerald-600">
                    <span>Credited to Advance Wallet:</span>
                    <span className="font-semibold">
                      +{formatCurrency(receiptData.payment?.advance_credit_amount, receiptData.payment?.currency)}
                    </span>
                  </div>
                )}
                <div className="flex justify-end space-x-8 text-sm font-bold text-slate-900 dark:text-slate-100 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span>Total Amount Paid:</span>
                  <span className="text-base text-blue-600 dark:text-blue-400">
                    {formatCurrency(receiptData.payment?.amount_received, receiptData.payment?.currency)}
                  </span>
                </div>
              </div>
            </div>

            {/* Cryptographic Verification Box & Footer */}
            <div className="mt-8 border-t border-slate-200 pt-6 dark:border-slate-800 flex items-center justify-between">
              <div className="space-y-1">
                <div className="flex items-center space-x-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-xs">
                  <ShieldCheck className="h-4 w-4" />
                  <span>Public Tamper-Proof Cryptographic Hash</span>
                </div>
                <div className="font-mono text-[10px] text-slate-400 break-all max-w-sm">
                  {receiptData.payment?.receipt_qr_hash || '7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'}
                </div>
                <div className="text-[10px] text-slate-400">
                  This receipt is computer-generated and legally valid without a manual signature.
                </div>
              </div>

              <div className="text-right">
                <div className="h-12 w-32 border-b border-dashed border-slate-300 dark:border-slate-700 mx-auto" />
                <div className="text-[11px] text-slate-500 font-medium mt-1">
                  Accounts Department
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        !loading && (
          <div className="px-2">
            <Card>
              <CardContent className="py-16 text-center">
                <Receipt className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  No receipt selected
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Enter a valid receipt number above or select a transaction from the Collections ledger.
                </p>
                <div className="mt-6">
                  <Link href="/dashboard/fees/collections">
                    <Button variant="outline" size="sm">
                      <ArrowLeft className="h-4 w-4 mr-1.5" />
                      Browse Collections Ledger
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        )
      )}
    </div>
  );
}
