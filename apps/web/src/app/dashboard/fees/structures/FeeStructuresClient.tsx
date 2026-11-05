'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../FeesNav';
import {
  Layers,
  Plus,
  Search,
  Calendar,
  Building,
  GraduationCap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface FeeStructuresClientProps {
  initialStructures: any[];
  academicYears: any[];
  campuses: any[];
  classes: any[];
  userRole: string;
}

export function FeeStructuresClient({
  initialStructures,
  academicYears,
  campuses,
  classes,
  userRole,
}: FeeStructuresClientProps) {
  const [structures] = useState<any[]>(initialStructures);
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedCampus, setSelectedCampus] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const isStaffOrAdmin = ['owner', 'admin', 'accountant', 'academic_admin'].includes(userRole);

  const filteredStructures = structures.filter((st) => {
    if (selectedYear !== 'all' && st.academic_year_id !== selectedYear) return false;
    if (selectedCampus !== 'all' && st.campus_id !== selectedCampus) return false;
    if (selectedClass !== 'all' && st.class_id !== selectedClass) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = st.name.toLowerCase().includes(q);
      const matchCode = st.code.toLowerCase().includes(q);
      if (!matchName && !matchCode) return false;
    }
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const formatCurrency = (amount: number, curr = 'INR') => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: curr,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between px-2">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Master Fee Structures
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Define multi-head tuition and installment fee templates scoped by academic year, campus, and class.
          </p>
        </div>
        {isStaffOrAdmin && (
          <Link href="/dashboard/fees/structures/new">
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Create Fee Structure
            </Button>
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 px-2">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Search structure name or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
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
        <Select
          value={selectedCampus}
          onChange={(e) => setSelectedCampus(e.target.value)}
        >
          <option value="all">All Campuses</option>
          {campuses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
        >
          <option value="all">All Classes</option>
          {classes.map((cls) => (
            <option key={cls.id} value={cls.id}>
              {cls.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Fee Structures List */}
      <div className="space-y-4 px-2">
        {filteredStructures.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Layers className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
              <h3 className="mt-4 text-lg font-medium text-slate-900 dark:text-slate-100">
                No fee structures found
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                No master fee structures match the selected filter criteria.
              </p>
            </CardContent>
          </Card>
        ) : (
          filteredStructures.map((st) => {
            const isExpanded = expandedId === st.id;
            return (
              <Card key={st.id} className="overflow-hidden transition-all">
                <CardHeader className="cursor-pointer bg-slate-50/50 hover:bg-slate-50 dark:bg-slate-900/40 dark:hover:bg-slate-900/80 transition-colors" onClick={() => toggleExpand(st.id)}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                          {st.code}
                        </span>
                        <CardTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                          {st.name}
                        </CardTitle>
                        <Badge variant="outline" className="capitalize">
                          {st.student_category || 'general'}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                        <span className="flex items-center">
                          <Calendar className="mr-1 h-3.5 w-3.5" />
                          {st.academic_year?.name || 'N/A'}
                        </span>
                        {st.campus && (
                          <span className="flex items-center">
                            <Building className="mr-1 h-3.5 w-3.5" />
                            {st.campus.name}
                          </span>
                        )}
                        {st.academic_class && (
                          <span className="flex items-center">
                            <GraduationCap className="mr-1 h-3.5 w-3.5" />
                            {st.academic_class.name}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-lg font-bold text-slate-900 dark:text-slate-100">
                          {formatCurrency(st.total_amount, st.currency)}
                        </div>
                        <div className="text-xs text-slate-500">
                          {(st.fee_structure_items || []).length} heads • {(st.fee_structure_installments || []).length} installments
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {isExpanded && (
                  <CardContent className="border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-950 space-y-6">
                    {/* Fee Heads Breakdown */}
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                        Itemized Fee Heads
                      </h4>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {(st.fee_structure_items || []).map((it: any) => (
                          <div
                            key={it.id}
                            className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3 dark:border-slate-800 dark:bg-slate-900/40"
                          >
                            <div>
                              <div className="text-sm font-medium text-slate-900 dark:text-slate-100">
                                {it.fee_head?.name || 'Fee Head'}
                              </div>
                              <div className="text-xs text-slate-500 capitalize">
                                {it.fee_head?.category || 'tuition'}
                              </div>
                            </div>
                            <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                              {formatCurrency(it.amount, st.currency)}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Installments Schedule */}
                    {(st.fee_structure_installments || []).length > 0 && (
                      <div>
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                          Installment Payment Plan
                        </h4>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead className="border-b border-slate-100 text-slate-400 dark:border-slate-800">
                              <tr>
                                <th className="py-2 px-3">#</th>
                                <th className="py-2 px-3">Installment Name</th>
                                <th className="py-2 px-3">Share (%)</th>
                                <th className="py-2 px-3">Due Date</th>
                                <th className="py-2 px-3">Estimated Amount</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                              {st.fee_structure_installments.map((inst: any) => {
                                const instAmount = (st.total_amount * inst.percentage) / 100;
                                return (
                                  <tr key={inst.id}>
                                    <td className="py-2 px-3 font-semibold text-slate-500">
                                      {inst.installment_number}
                                    </td>
                                    <td className="py-2 px-3 font-medium text-slate-900 dark:text-slate-100">
                                      {inst.name}
                                    </td>
                                    <td className="py-2 px-3 text-slate-600 dark:text-slate-300">
                                      {inst.percentage}%
                                    </td>
                                    <td className="py-2 px-3 text-slate-500">
                                      {inst.due_date ? new Date(inst.due_date).toLocaleDateString() : 'Dynamic / Assigned'}
                                    </td>
                                    <td className="py-2 px-3 font-semibold text-slate-900 dark:text-slate-100">
                                      {formatCurrency(instAmount, st.currency)}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
