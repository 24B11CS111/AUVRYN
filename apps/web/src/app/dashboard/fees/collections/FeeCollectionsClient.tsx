'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import {
  Plus,
  Search,
  Receipt,
} from 'lucide-react';

interface FeeCollectionsClientProps {
  initialPayments: any[];
  userRole: string;
}

export function FeeCollectionsClient({ initialPayments, userRole }: FeeCollectionsClientProps) {
  const [payments] = useState<any[]>(initialPayments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMethod, setSelectedMethod] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');

  const isStaffOrAdmin = ['owner', 'admin', 'accountant', 'academic_admin'].includes(userRole);

  const filteredPayments = payments.filter((p) => {
    if (selectedMethod !== 'all' && p.payment_method !== selectedMethod) return false;
    if (selectedStatus !== 'all' && p.payment_status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const rNum = (p.receipt_number || '').toLowerCase();
      const sName = `${p.student?.first_name || ''} ${p.student?.last_name || ''}`.toLowerCase();
      const adm = (p.student?.admission_number || '').toLowerCase();
      if (!rNum.includes(q) && !sName.includes(q) && !adm.includes(q)) return false;
    }
    return true;
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-emerald-600">Completed</Badge>;
      case 'pending':
        return <Badge className="bg-amber-600">Pending</Badge>;
      case 'failed':
        return <Badge className="bg-rose-600">Failed</Badge>;
      case 'refunded':
        return <Badge className="bg-purple-600">Refunded</Badge>;
      case 'partially_refunded':
        return <Badge className="bg-indigo-600">Partially Refunded</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Payment Collections & Transactions
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Complete transaction ledger of counter receipts, UPI, and online payments.
          </p>
        </div>
        {isStaffOrAdmin && (
          <Link href="/dashboard/fees/collections/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Record Counter Payment
            </Button>
          </Link>
        )}
      </div>

      {/* Filter Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search receipt # or student..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedMethod}
          onChange={(e) => setSelectedMethod(e.target.value)}
        >
          <option value="all">All Payment Methods</option>
          <option value="cash">Cash</option>
          <option value="upi">UPI / QR</option>
          <option value="bank_transfer">Bank Transfer / NEFT</option>
          <option value="card">Debit / Credit Card</option>
          <option value="payment_gateway">Online Payment Gateway</option>
          <option value="cheque">Cheque</option>
          <option value="demand_draft">Demand Draft</option>
          <option value="advance_wallet">Advance Balance Wallet</option>
        </Select>
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Payment Statuses</option>
          <option value="completed">Completed</option>
          <option value="pending">Pending</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="partially_refunded">Partially Refunded</option>
        </Select>
      </div>

      {/* Transactions Table */}
      <div className="px-2">
        <Card>
          <CardContent className="p-0">
            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center">
                <Receipt className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  No payment collections found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No payment records match your active search and filter parameters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                    <tr>
                      <th className="py-3.5 px-4">Receipt #</th>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Method</th>
                      <th className="py-3.5 px-4">Date</th>
                      <th className="py-3.5 px-4">Amount Received</th>
                      <th className="py-3.5 px-4">Allocated</th>
                      <th className="py-3.5 px-4">Advance Credit</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Receipt</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3.5 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                          {p.receipt_number}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {p.student?.first_name} {p.student?.last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Adm: {p.student?.admission_number || 'N/A'} • {p.student?.academic_class?.name || ''}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge variant="outline" className="capitalize">
                            {p.payment_method.replace('_', ' ')}
                          </Badge>
                          {p.transaction_reference && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Ref: {p.transaction_reference}
                            </div>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {new Date(p.payment_date).toLocaleDateString()}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(p.amount_received)}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-semibold">
                          {formatCurrency(p.allocated_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500">
                          {Number(p.advance_credit_amount) > 0 ? (
                            <span className="font-semibold text-emerald-600">
                              +{formatCurrency(p.advance_credit_amount)}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(p.payment_status)}
                        </td>
                        <td className="py-3.5 px-4 text-right">
                          <Link href={`/dashboard/fees/receipts?receipt=${p.receipt_number}`}>
                            <Button size="sm" variant="ghost">
                              <Receipt className="h-4 w-4 mr-1 text-blue-600" />
                              View
                            </Button>
                          </Link>
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
    </div>
  );
}
