'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { FeesNav } from './FeesNav';
import {
  CreditCard,
  TrendingUp,
  AlertCircle,
  Clock,
  Plus,
  ArrowUpRight,
  Receipt,
  Gift,
  Wallet,
  CheckCircle2,
} from 'lucide-react';

interface FeesOverviewClientProps {
  stats: {
    totalAssigned: number;
    totalCollected: number;
    totalOutstanding: number;
    overdueAmount: number;
    collectionRate: number;
    activeAssignmentsCount: number;
    recentPayments: any[];
    advanceBalance: number;
  };
  userRole: string;
  currency: string;
}

export function FeesOverviewClient({ stats, userRole, currency }: FeesOverviewClientProps) {
  const isStaffOrAdmin = ['owner', 'admin', 'accountant', 'academic_admin'].includes(userRole);
  const isStudentOrParent = ['student', 'parent'].includes(userRole);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: currency || 'INR',
      maximumFractionDigits: 2,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Module Navigation */}
      <FeesNav userRole={userRole} />

      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isStudentOrParent ? 'My Fees & Payments' : 'Fees & Payments Management'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {isStudentOrParent
              ? 'View your active fee schedules, past receipts, and make secure fee payments.'
              : 'Master fee structures, collections, installment schedules, concessions, and audit ledgers.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {isStaffOrAdmin && (
            <>
              <Link href="/dashboard/fees/structures/new">
                <Button variant="outline" size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  New Structure
                </Button>
              </Link>
              <Link href="/dashboard/fees/collections/new">
                <Button size="sm">
                  <CreditCard className="mr-2 h-4 w-4" />
                  Record Payment
                </Button>
              </Link>
            </>
          )}
          {isStudentOrParent && (
            <Link href="/dashboard/fees/assignments">
              <Button size="sm">
                <CreditCard className="mr-2 h-4 w-4" />
                Pay Pending Fees
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 px-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isStudentOrParent ? 'Total Fees Assigned' : 'Total Revenue Assigned'}
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-900 dark:text-slate-100">
              {formatCurrency(stats.totalAssigned)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Across {stats.activeAssignmentsCount} student assignments
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              {isStudentOrParent ? 'Total Paid' : 'Total Collected'}
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatCurrency(stats.totalCollected)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Collection efficiency: <span className="font-semibold text-slate-700 dark:text-slate-300">{stats.collectionRate}%</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Outstanding Balance
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
              {formatCurrency(stats.totalOutstanding)}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Remaining balance due
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-slate-500 dark:text-slate-400">
              Overdue Amount
            </CardTitle>
            <AlertCircle className="h-4 w-4 text-rose-600 dark:text-rose-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600 dark:text-rose-400">
              {formatCurrency(stats.overdueAmount)}
            </div>
            <p className="mt-1 text-xs text-rose-500 font-medium">
              Past scheduled installment grace period
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Advance Balance Card (if student has excess payment balance) */}
      {stats.advanceBalance > 0 && (
        <div className="mx-2 rounded-xl border border-emerald-200 bg-emerald-50/60 p-4 dark:border-emerald-900 dark:bg-emerald-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="rounded-lg bg-emerald-100 p-2 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Student Advance Wallet Balance
                </h4>
                <p className="text-xs text-emerald-700 dark:text-emerald-400">
                  Excess payments credited to advance wallet: {formatCurrency(stats.advanceBalance)}. This can be automatically applied to upcoming terms.
                </p>
              </div>
            </div>
            <div className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
              {formatCurrency(stats.advanceBalance)}
            </div>
          </div>
        </div>
      )}

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 px-2">
        <Link href="/dashboard/fees/assignments" className="block group">
          <Card className="h-full hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-blue-100 p-3 text-blue-600 dark:bg-blue-900/40 dark:text-blue-400">
                  <CreditCard className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 transition-colors" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                Fee Assignments & Schedules
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                View student fee structures, installment due dates, paid balances, and payment progress.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/fees/collections" className="block group">
          <Card className="h-full hover:border-emerald-400 dark:hover:border-emerald-600 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-400">
                  <Receipt className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                Collections & Receipts
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Search completed transactions, download verifiable PDF receipts with tamper-proof QR codes.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/fees/concessions" className="block group">
          <Card className="h-full hover:border-purple-400 dark:hover:border-purple-600 transition-colors">
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div className="rounded-lg bg-purple-100 p-3 text-purple-600 dark:bg-purple-900/40 dark:text-purple-400">
                  <Gift className="h-6 w-6" />
                </div>
                <ArrowUpRight className="h-5 w-5 text-slate-400 group-hover:text-purple-600 transition-colors" />
              </div>
              <h3 className="mt-4 font-semibold text-slate-900 dark:text-slate-100">
                Concessions & Scholarships
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Apply for scholarships, sibling discounts, or track administrative concession approvals.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Transactions Table */}
      <div className="px-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Transactions</CardTitle>
              <p className="text-sm text-slate-500">Latest completed fee payment receipts</p>
            </div>
            <Link href="/dashboard/fees/collections">
              <Button variant="ghost" size="sm">
                View All
                <ArrowUpRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {stats.recentPayments.length === 0 ? (
              <div className="py-8 text-center text-sm text-slate-500">
                No recent payment transactions recorded.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800">
                    <tr>
                      <th className="py-3 px-4">Receipt #</th>
                      <th className="py-3 px-4">Student</th>
                      <th className="py-3 px-4">Method</th>
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Amount</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {stats.recentPayments.map((payment) => (
                      <tr key={payment.id} className="hover:bg-slate-50 dark:hover:bg-slate-850">
                        <td className="py-3 px-4 font-mono font-medium text-blue-600 dark:text-blue-400">
                          {payment.receipt_number}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {payment.students?.first_name} {payment.students?.last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Adm: {payment.students?.admission_number || 'N/A'}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant="outline" className="capitalize">
                            {payment.payment_method.replace('_', ' ')}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-slate-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(payment.amount_received)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge variant={payment.payment_status === 'completed' ? 'default' : 'outline'}>
                            {payment.payment_status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <Link href={`/dashboard/fees/receipts?receipt=${payment.receipt_number}`}>
                            <Button variant="ghost" size="sm">
                              <Receipt className="h-4 w-4" />
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
