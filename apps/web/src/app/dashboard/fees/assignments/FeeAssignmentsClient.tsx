'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import { createStudentFeeAssignmentAction } from '../actions';
import {
  Users,
  Plus,
  Search,
  CreditCard,
  Eye,
  X,
} from 'lucide-react';

interface FeeAssignmentsClientProps {
  initialAssignments: any[];
  students: any[];
  academicYears: any[];
  feeStructures: any[];
  userRole: string;
}

export function FeeAssignmentsClient({
  initialAssignments,
  students,
  academicYears,
  feeStructures,
  userRole,
}: FeeAssignmentsClientProps) {
  const [assignments, setAssignments] = useState<any[]>(initialAssignments);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  // Assign modal state
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignStudentId, setAssignStudentId] = useState(students[0]?.id || '');
  const [assignStructureId, setAssignStructureId] = useState(feeStructures[0]?.id || '');
  const [assignYearId, setAssignYearId] = useState(academicYears[0]?.id || '');
  const [assignDueDate, setAssignDueDate] = useState(() => new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10));
  const [assignDiscount, setAssignDiscount] = useState(0);
  const [assignLoading, setAssignLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Installments view modal
  const [viewingAssignment, setViewingAssignment] = useState<any | null>(null);

  const isStaffOrAdmin = ['owner', 'admin', 'accountant', 'academic_admin', 'admissions_officer'].includes(userRole);
  const isStudentOrParent = ['student', 'parent'].includes(userRole);

  const filteredAssignments = assignments.filter((a) => {
    if (selectedStatus !== 'all' && a.status !== selectedStatus) return false;
    if (selectedYear !== 'all' && a.academic_year_id !== selectedYear) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const sName = `${a.student?.first_name || ''} ${a.student?.last_name || ''}`.toLowerCase();
      const adm = (a.student?.admission_number || '').toLowerCase();
      const struct = (a.fee_structure?.name || '').toLowerCase();
      if (!sName.includes(q) && !adm.includes(q) && !struct.includes(q)) return false;
    }
    return true;
  });

  const handleAssignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);
    setAssignLoading(true);

    try {
      const selectedStudent = students.find((s) => s.id === assignStudentId);
      const enrollmentId = selectedStudent?.student_enrollments?.[0]?.id || selectedStudent?.id;

      const res = await createStudentFeeAssignmentAction({
        studentId: assignStudentId,
        enrollmentId,
        academicYearId: assignYearId,
        feeStructureId: assignStructureId,
        dueDate: assignDueDate,
        customDiscounts: Number(assignDiscount) || 0,
      });

      if (!res.success) {
        setModalError(res.error || 'Failed to assign fee structure.');
        setAssignLoading(false);
        return;
      }

      setAssignments((prev) => [res.data, ...prev]);
      setShowAssignModal(false);
      setAssignLoading(false);
    } catch (err: any) {
      setModalError(err?.message || 'Unexpected error occurred.');
      setAssignLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-emerald-600">Paid</Badge>;
      case 'partially_paid':
        return <Badge className="bg-amber-600">Partially Paid</Badge>;
      case 'overdue':
        return <Badge className="bg-rose-600">Overdue</Badge>;
      case 'waived':
        return <Badge className="bg-purple-600">Waived</Badge>;
      default:
        return <Badge variant="outline" className="capitalize">{status}</Badge>;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {isStudentOrParent ? 'My Fee Assignments & Schedules' : 'Student Fee Assignments'}
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Track student fee balances, installment due dates, and record payments.
          </p>
        </div>
        {isStaffOrAdmin && (
          <Button size="sm" onClick={() => setShowAssignModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign Fee Structure
          </Button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search by student name, adm #, or structure..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
        >
          <option value="all">All Payment Statuses</option>
          <option value="assigned">Assigned</option>
          <option value="partially_paid">Partially Paid</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
          <option value="waived">Waived</option>
        </Select>
        <Select
          value={selectedYear}
          onChange={(e) => setSelectedYear(e.target.value)}
        >
          <option value="all">All Academic Years</option>
          {academicYears.map((y) => (
            <option key={y.id} value={y.id}>
              {y.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Assignments Table */}
      <div className="px-2">
        <Card>
          <CardContent className="p-0">
            {filteredAssignments.length === 0 ? (
              <div className="py-12 text-center">
                <Users className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
                <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                  No fee assignments found
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  No student fee assignments match the active filter criteria.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-slate-200 bg-slate-50 text-xs font-semibold uppercase text-slate-500 dark:border-slate-800 dark:bg-slate-900/50">
                    <tr>
                      <th className="py-3.5 px-4">Student</th>
                      <th className="py-3.5 px-4">Fee Structure</th>
                      <th className="py-3.5 px-4">Gross</th>
                      <th className="py-3.5 px-4">Discount</th>
                      <th className="py-3.5 px-4">Net Due</th>
                      <th className="py-3.5 px-4">Paid</th>
                      <th className="py-3.5 px-4">Balance</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {filteredAssignments.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-900 dark:text-slate-100">
                            {a.student?.first_name} {a.student?.last_name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Adm: {a.student?.admission_number || 'N/A'} • {a.student?.academic_class?.name || 'Class'}
                          </div>
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="font-medium text-slate-800 dark:text-slate-200">
                            {a.fee_structure?.name || 'Custom Fee Assignment'}
                          </div>
                          <div className="text-xs text-slate-400">
                            {a.academic_year?.name}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-400">
                          {formatCurrency(a.gross_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600">
                          {Number(a.discount_amount) > 0 ? `-${formatCurrency(a.discount_amount)}` : '₹0'}
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-900 dark:text-slate-100">
                          {formatCurrency(a.net_amount)}
                        </td>
                        <td className="py-3.5 px-4 text-emerald-600 font-medium">
                          {formatCurrency(a.paid_amount)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-amber-600 dark:text-amber-400">
                          {formatCurrency(a.balance_amount)}
                        </td>
                        <td className="py-3.5 px-4">
                          {getStatusBadge(a.status)}
                        </td>
                        <td className="py-3.5 px-4 text-right space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setViewingAssignment(a)}
                            title="View Installment Schedule"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {Number(a.balance_amount) > 0 && (
                            <Link href={`/dashboard/fees/collections/new?studentId=${a.student_id}&assignmentId=${a.id}`}>
                              <Button size="sm" variant="outline">
                                <CreditCard className="h-3.5 w-3.5 mr-1" />
                                Pay
                              </Button>
                            </Link>
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

      {/* Modal: Assign Fee Structure */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-lg">Assign Fee Structure to Student</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowAssignModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent>
              {modalError && (
                <div className="mb-4 rounded-lg bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-400">
                  {modalError}
                </div>
              )}
              <form onSubmit={handleAssignSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Student *
                  </label>
                  <Select
                    value={assignStudentId}
                    onChange={(e) => setAssignStudentId(e.target.value)}
                    required
                  >
                    {students.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.first_name} {st.last_name} ({st.admission_number || 'No Adm #'})
                      </option>
                    ))}
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Select Fee Structure *
                  </label>
                  <Select
                    value={assignStructureId}
                    onChange={(e) => setAssignStructureId(e.target.value)}
                    required
                  >
                    {feeStructures.map((fs) => (
                      <option key={fs.id} value={fs.id}>
                        {fs.name} - ₹{Number(fs.total_amount).toLocaleString()}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Academic Year *
                    </label>
                    <Select
                      value={assignYearId}
                      onChange={(e) => setAssignYearId(e.target.value)}
                      required
                    >
                      {academicYears.map((y) => (
                        <option key={y.id} value={y.id}>
                          {y.name}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      First Due Date *
                    </label>
                    <Input
                      type="date"
                      value={assignDueDate}
                      onChange={(e) => setAssignDueDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Special Initial Discount / Waiver (₹)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={assignDiscount}
                    onChange={(e) => setAssignDiscount(Number(e.target.value))}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <Button type="button" variant="outline" onClick={() => setShowAssignModal(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={assignLoading}>
                    {assignLoading ? 'Assigning...' : 'Assign Fee'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modal: View Schedule / Installments */}
      {viewingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <Card className="w-full max-w-2xl bg-white dark:bg-slate-900">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-lg">Fee Schedule & Installments</CardTitle>
                <p className="text-xs text-slate-500">
                  {viewingAssignment.student?.first_name} {viewingAssignment.student?.last_name} (Adm: {viewingAssignment.student?.admission_number})
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setViewingAssignment(null)}>
                <X className="h-4 w-4" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800 text-center text-xs">
                <div>
                  <span className="text-slate-500">Total Net Fee</span>
                  <div className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                    {formatCurrency(viewingAssignment.net_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Total Paid</span>
                  <div className="font-bold text-emerald-600 text-sm">
                    {formatCurrency(viewingAssignment.paid_amount)}
                  </div>
                </div>
                <div>
                  <span className="text-slate-500">Remaining Balance</span>
                  <div className="font-bold text-amber-600 text-sm">
                    {formatCurrency(viewingAssignment.balance_amount)}
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-bold uppercase text-slate-500 mb-2">
                  Installments Breakdown
                </h4>
                {(viewingAssignment.student_fee_installments || []).length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-500">
                    Single bullet payment (no installment splits).
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                        <tr>
                          <th className="py-2 px-3">#</th>
                          <th className="py-2 px-3">Installment</th>
                          <th className="py-2 px-3">Due Date</th>
                          <th className="py-2 px-3">Amount</th>
                          <th className="py-2 px-3">Paid</th>
                          <th className="py-2 px-3">Balance</th>
                          <th className="py-2 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {viewingAssignment.student_fee_installments.map((inst: any) => (
                          <tr key={inst.id}>
                            <td className="py-2 px-3 font-semibold text-slate-500">
                              {inst.installment_number}
                            </td>
                            <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                              {inst.name}
                            </td>
                            <td className="py-2 px-3 text-slate-500">
                              {new Date(inst.due_date).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(inst.amount)}
                            </td>
                            <td className="py-2 px-3 text-emerald-600 font-medium">
                              {formatCurrency(inst.paid_amount)}
                            </td>
                            <td className="py-2 px-3 font-bold text-amber-600">
                              {formatCurrency(inst.balance_amount)}
                            </td>
                            <td className="py-2 px-3">
                              {getStatusBadge(inst.status)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-3">
                <Button variant="outline" size="sm" onClick={() => setViewingAssignment(null)}>
                  Close
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
