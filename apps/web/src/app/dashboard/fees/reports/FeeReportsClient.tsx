'use client';

import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import {
  Layers,
  CreditCard,
  Clock,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

interface FeeReportsClientProps {
  payments: any[];
  assignments: any[];
  ledgerEntries: any[];
  userRole: string;
}

export function FeeReportsClient({
  payments,
  assignments,
  ledgerEntries,
  userRole,
}: FeeReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'heads' | 'methods' | 'aging' | 'ledger'>('heads');
  const [ledgerFilter, setLedgerFilter] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  // 1. Collections by Method
  const methodTotals: Record<string, number> = {};
  payments.forEach((p) => {
    if (p.payment_status === 'completed') {
      const m = p.payment_method || 'other';
      methodTotals[m] = (methodTotals[m] || 0) + Number(p.amount_received || 0);
    }
  });

  // 2. Collections by Fee Head
  const headTotals: Record<string, number> = {};
  payments.forEach((p) => {
    (p.payment_allocations || []).forEach((alloc: any) => {
      const cat = alloc.fee_head?.category || 'tuition';
      headTotals[cat] = (headTotals[cat] || 0) + Number(alloc.allocated_amount || 0);
    });
  });

  // 3. Overdue Aging
  const now = new Date().getTime();
  let agingCurrent = 0;
  let aging1to30 = 0;
  let aging31to60 = 0;
  let aging61to90 = 0;
  let agingOver90 = 0;

  assignments.forEach((a) => {
    (a.student_fee_installments || []).forEach((inst: any) => {
      const bal = Number(inst.balance_amount) || 0;
      if (bal > 0) {
        const dueDate = new Date(inst.due_date).getTime();
        const diffDays = Math.floor((now - dueDate) / (1000 * 3600 * 24));
        if (diffDays <= 0) {
          agingCurrent += bal;
        } else if (diffDays <= 30) {
          aging1to30 += bal;
        } else if (diffDays <= 60) {
          aging31to60 += bal;
        } else if (diffDays <= 90) {
          aging61to90 += bal;
        } else {
          agingOver90 += bal;
        }
      }
    });
  });

  const filteredLedger = ledgerEntries.filter((e) => {
    if (ledgerFilter !== 'all' && e.entry_type !== ledgerFilter) return false;
    return true;
  });

  const exportCSV = () => {
    const headers = ['Timestamp', 'Student', 'Entry Type', 'Debit', 'Credit', 'Balance After', 'Description'];
    const rows = filteredLedger.map((l) => [
      new Date(l.created_at).toISOString(),
      `"${l.student?.first_name || ''} ${l.student?.last_name || ''}"`,
      l.entry_type,
      l.debit_amount || 0,
      l.credit_amount || 0,
      l.balance_after || 0,
      `"${(l.description || '').replace(/"/g, '""')}"`,
    ]);
    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `financial_ledger_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Financial Analytics & Audit Reports
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Real-time collection breakdowns, overdue aging schedules, and immutable ledger journal.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={exportCSV}>
          <FileSpreadsheet className="mr-2 h-4 w-4" />
          Export Ledger CSV
        </Button>
      </div>

      {/* Report Tabs */}
      <div className="flex space-x-2 border-b border-slate-200 dark:border-slate-800 px-2 pb-2">
        <Button
          variant={activeTab === 'heads' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('heads')}
        >
          <Layers className="h-4 w-4 mr-1.5" />
          Collections by Head
        </Button>
        <Button
          variant={activeTab === 'methods' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('methods')}
        >
          <CreditCard className="h-4 w-4 mr-1.5" />
          Collections by Mode
        </Button>
        <Button
          variant={activeTab === 'aging' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('aging')}
        >
          <Clock className="h-4 w-4 mr-1.5" />
          Overdue Aging
        </Button>
        <Button
          variant={activeTab === 'ledger' ? 'primary' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('ledger')}
        >
          <Shield className="h-4 w-4 mr-1.5" />
          Immutable Ledger
        </Button>
      </div>

      {/* Tab: Collections by Fee Head */}
      {activeTab === 'heads' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 px-2">
          {Object.keys(headTotals).length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-500">
              No collection records available yet.
            </div>
          ) : (
            Object.entries(headTotals).map(([cat, total]) => (
              <Card key={cat}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {cat} Fees
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
                    {formatCurrency(total)}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Total collected under category</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Collections by Payment Method */}
      {activeTab === 'methods' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 px-2">
          {Object.keys(methodTotals).length === 0 ? (
            <div className="col-span-full py-12 text-center text-sm text-slate-500">
              No payment transactions recorded yet.
            </div>
          ) : (
            Object.entries(methodTotals).map(([method, total]) => (
              <Card key={method}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    {method.replace('_', ' ')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {formatCurrency(total)}
                  </div>
                  <p className="mt-1 text-xs text-slate-400">Total processed via this channel</p>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab: Overdue Aging */}
      {activeTab === 'aging' && (
        <div className="space-y-4 px-2">
          <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
            <Card className="border-l-4 border-l-emerald-500">
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-slate-500">Current (Not Due)</div>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-1">
                  {formatCurrency(agingCurrent)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-amber-400">
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-slate-500">1 - 30 Days</div>
                <div className="text-xl font-bold text-amber-600 mt-1">
                  {formatCurrency(aging1to30)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-slate-500">31 - 60 Days</div>
                <div className="text-xl font-bold text-orange-600 mt-1">
                  {formatCurrency(aging31to60)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-rose-500">
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-slate-500">61 - 90 Days</div>
                <div className="text-xl font-bold text-rose-600 mt-1">
                  {formatCurrency(aging61to90)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-700">
              <CardContent className="pt-4">
                <div className="text-xs font-medium text-slate-500">&gt; 90 Days Overdue</div>
                <div className="text-xl font-bold text-red-700 mt-1">
                  {formatCurrency(agingOver90)}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab: Immutable Financial Ledger */}
      {activeTab === 'ledger' && (
        <div className="space-y-4 px-2">
          <div className="flex items-center space-x-3 max-w-xs">
            <Select
              value={ledgerFilter}
              onChange={(e) => setLedgerFilter(e.target.value)}
            >
              <option value="all">All Entry Types</option>
              <option value="fee_charged">Fee Charged</option>
              <option value="payment_received">Payment Received</option>
              <option value="advance_credit">Advance Credit</option>
              <option value="refund_issued">Refund Issued</option>
              <option value="concession_applied">Concession Applied</option>
            </Select>
          </div>

          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="border-b border-slate-200 bg-slate-50 uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                    <tr>
                      <th className="py-3 px-4">Date / Time</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Entry Type</th>
                      <th className="py-3 px-4 text-right">Debit (Charge)</th>
                      <th className="py-3 px-4 text-right">Credit (Receipt)</th>
                      <th className="py-3 px-4 text-right">Balance After</th>
                      <th className="py-3 px-4">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono text-[11px]">
                    {filteredLedger.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400 font-sans">
                          No ledger records match the selected filter.
                        </td>
                      </tr>
                    ) : (
                      filteredLedger.map((l) => (
                        <tr key={l.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40">
                          <td className="py-2.5 px-4 text-slate-500">
                            {new Date(l.created_at).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-sans font-medium text-slate-900 dark:text-slate-100">
                            {l.student?.first_name} {l.student?.last_name}
                          </td>
                          <td className="py-2.5 px-4">
                            <span className="font-semibold text-blue-600 dark:text-blue-400">
                              {l.entry_type}
                            </span>
                          </td>
                          <td className="py-2.5 px-4 text-right text-rose-600 font-semibold">
                            {Number(l.debit_amount) > 0 ? `₹${Number(l.debit_amount).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right text-emerald-600 font-semibold">
                            {Number(l.credit_amount) > 0 ? `₹${Number(l.credit_amount).toLocaleString()}` : '—'}
                          </td>
                          <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                            ₹{Number(l.balance_after).toLocaleString()}
                          </td>
                          <td className="py-2.5 px-4 font-sans text-slate-500 max-w-sm truncate">
                            {l.description}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
