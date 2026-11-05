'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { FeesNav } from '../../FeesNav';
import { createFeeStructureAction } from '../../actions';
import {
  ArrowLeft,
  Plus,
  Trash2,
  AlertCircle,
  Save,
} from 'lucide-react';

interface NewFeeStructureClientProps {
  feeHeads: any[];
  academicYears: any[];
  campuses: any[];
  classes: any[];
  programs: any[];
  userRole: string;
}

export function NewFeeStructureClient({
  feeHeads,
  academicYears,
  campuses,
  classes,
  programs,
  userRole,
}: NewFeeStructureClientProps) {
  const router = useRouter();

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || '');
  const [campusId, setCampusId] = useState('');
  const [classId, setClassId] = useState('');
  const [programId, setProgramId] = useState('');
  const [studentCategory, setStudentCategory] = useState('general');

  // Dynamic fee head items
  const [items, setItems] = useState<Array<{ feeHeadId: string; amount: number; isMandatory: boolean }>>([
    { feeHeadId: feeHeads[0]?.id || '', amount: 15000, isMandatory: true },
  ]);

  // Dynamic installments
  const [installments, setInstallments] = useState<Array<{ name: string; percentage: number; dueDaysOffset: number }>>([
    { name: 'Term 1 / Enrollment', percentage: 50, dueDaysOffset: 0 },
    { name: 'Term 2', percentage: 50, dueDaysOffset: 90 },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addItem = () => {
    setItems((prev) => [...prev, { feeHeadId: feeHeads[0]?.id || '', amount: 0, isMandatory: true }]);
  };

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, field: string, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const addInstallment = () => {
    setInstallments((prev) => [
      ...prev,
      { name: `Installment ${prev.length + 1}`, percentage: 0, dueDaysOffset: prev.length * 60 },
    ]);
  };

  const removeInstallment = (index: number) => {
    setInstallments((prev) => prev.filter((_, i) => i !== index));
  };

  const updateInstallment = (index: number, field: string, value: any) => {
    setInstallments((prev) =>
      prev.map((inst, i) => (i === index ? { ...inst, [field]: value } : inst))
    );
  };

  const totalAmount = items.reduce((acc, it) => acc + (Number(it.amount) || 0), 0);
  const totalPercentage = installments.reduce((acc, inst) => acc + (Number(inst.percentage) || 0), 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim() || !code.trim() || !academicYearId) {
      setError('Please fill in Structure Name, Code, and Academic Year.');
      return;
    }

    if (items.some((it) => !it.feeHeadId || it.amount < 0)) {
      setError('All fee head items must have a valid fee head and non-negative amount.');
      return;
    }

    if (installments.length > 0 && Math.abs(totalPercentage - 100) > 0.01) {
      setError(`Installment percentages must sum exactly to 100%. Current sum: ${totalPercentage}%`);
      return;
    }

    setLoading(true);
    try {
      const payload = {
        name,
        code: code.toUpperCase(),
        academicYearId,
        campusId: campusId || undefined,
        classId: classId || undefined,
        programId: programId || undefined,
        studentCategory,
        items: items.map((it, idx) => ({
          feeHeadId: it.feeHeadId,
          amount: Number(it.amount),
          isMandatory: it.isMandatory,
          orderIndex: idx + 1,
        })),
        installments: installments.map((inst, idx) => ({
          installmentNumber: idx + 1,
          name: inst.name,
          percentage: Number(inst.percentage),
          dueDaysOffset: Number(inst.dueDaysOffset) || 0,
        })),
      };

      const res = await createFeeStructureAction(payload as any);
      if (!res.success) {
        setError(res.error || 'Failed to create fee structure.');
        setLoading(false);
        return;
      }

      router.push('/dashboard/fees/structures');
      router.refresh();
    } catch (err: any) {
      setError(err?.message || 'Unexpected error occurred.');
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FeesNav userRole={userRole} />

      <div className="flex items-center space-x-3 px-2">
        <Link href="/dashboard/fees/structures">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Structures
          </Button>
        </Link>
      </div>

      <div className="px-2">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle className="text-xl">Create Master Fee Structure</CardTitle>
            <p className="text-sm text-slate-500">
              Configure institution fee heads and installment percentages for an academic tier.
            </p>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-6 flex items-center space-x-2 rounded-lg bg-rose-50 p-4 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-400">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Details */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Structure Name *
                  </label>
                  <Input
                    placeholder="e.g. Grade 10 Standard Annual Fee"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Structure Code *
                  </label>
                  <Input
                    placeholder="e.g. G10-2026-ANNUAL"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    required
                  />
                </div>
              </div>

              {/* Hierarchy Scope */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-5">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Academic Year *
                  </label>
                  <Select
                    value={academicYearId}
                    onChange={(e) => setAcademicYearId(e.target.value)}
                    required
                  >
                    <option value="">Select Year</option>
                    {academicYears.map((y) => (
                      <option key={y.id} value={y.id}>
                        {y.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Campus
                  </label>
                  <Select
                    value={campusId}
                    onChange={(e) => setCampusId(e.target.value)}
                  >
                    <option value="">All Campuses</option>
                    {campuses.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Program
                  </label>
                  <Select
                    value={programId}
                    onChange={(e) => setProgramId(e.target.value)}
                  >
                    <option value="">All Programs</option>
                    {programs.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Class
                  </label>
                  <Select
                    value={classId}
                    onChange={(e) => setClassId(e.target.value)}
                  >
                    <option value="">All Classes</option>
                    {classes.map((cls) => (
                      <option key={cls.id} value={cls.id}>
                        {cls.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Category
                  </label>
                  <Select
                    value={studentCategory}
                    onChange={(e) => setStudentCategory(e.target.value)}
                  >
                    <option value="general">General</option>
                    <option value="scholarship">Scholarship</option>
                    <option value="staff_ward">Staff Ward</option>
                    <option value="quota">Quota / Reserved</option>
                  </Select>
                </div>
              </div>

              {/* Fee Heads Section */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Fee Heads & Line Items
                    </h3>
                    <p className="text-xs text-slate-500">Add the itemized heads that make up this fee structure.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addItem}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Fee Head
                  </Button>
                </div>

                <div className="space-y-2">
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-center space-x-3 bg-slate-50/60 p-3 rounded-lg dark:bg-slate-900/40">
                      <div className="flex-1">
                        <Select
                          value={item.feeHeadId}
                          onChange={(e) => updateItem(idx, 'feeHeadId', e.target.value)}
                          required
                        >
                          {feeHeads.map((head) => (
                            <option key={head.id} value={head.id}>
                              {head.name} ({head.category})
                            </option>
                          ))}
                        </Select>
                      </div>
                      <div className="w-36">
                        <Input
                          type="number"
                          placeholder="Amount"
                          value={item.amount}
                          onChange={(e) => updateItem(idx, 'amount', e.target.value)}
                          min="0"
                          required
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <label className="text-xs text-slate-600 dark:text-slate-400 cursor-pointer flex items-center space-x-1">
                          <input
                            type="checkbox"
                            checked={item.isMandatory}
                            onChange={(e) => updateItem(idx, 'isMandatory', e.target.checked)}
                            className="rounded"
                          />
                          <span>Mandatory</span>
                        </label>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={items.length <= 1}
                        onClick={() => removeItem(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end pr-10 text-sm font-bold text-slate-900 dark:text-slate-100">
                  Total Fee: ₹{totalAmount.toLocaleString()}
                </div>
              </div>

              {/* Installments Schedule Section */}
              <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      Installment Breakdown (Must sum to 100%)
                    </h3>
                    <p className="text-xs text-slate-500">Define installment share percentage and schedule offset.</p>
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={addInstallment}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Installment
                  </Button>
                </div>

                <div className="space-y-2">
                  {installments.map((inst, idx) => (
                    <div key={idx} className="flex items-center space-x-3 bg-slate-50/60 p-3 rounded-lg dark:bg-slate-900/40">
                      <div className="w-12 text-xs font-semibold text-slate-500 text-center">
                        #{idx + 1}
                      </div>
                      <div className="flex-1">
                        <Input
                          placeholder="Installment Name (e.g. Term 1)"
                          value={inst.name}
                          onChange={(e) => updateInstallment(idx, 'name', e.target.value)}
                          required
                        />
                      </div>
                      <div className="w-28">
                        <Input
                          type="number"
                          placeholder="%"
                          value={inst.percentage}
                          onChange={(e) => updateInstallment(idx, 'percentage', e.target.value)}
                          min="0"
                          max="100"
                          step="0.01"
                          required
                        />
                      </div>
                      <div className="w-36">
                        <Input
                          type="number"
                          placeholder="Days Offset"
                          value={inst.dueDaysOffset}
                          onChange={(e) => updateInstallment(idx, 'dueDaysOffset', e.target.value)}
                          min="0"
                        />
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={installments.length <= 1}
                        onClick={() => removeInstallment(idx)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center pr-10 text-xs">
                  <span
                    className={
                      Math.abs(totalPercentage - 100) < 0.01
                        ? 'text-emerald-600 font-semibold'
                        : 'text-rose-600 font-semibold'
                    }
                  >
                    Installment Total: {totalPercentage}% (Must be 100%)
                  </span>
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="flex justify-end space-x-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <Link href="/dashboard/fees/structures">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={loading}>
                  <Save className="h-4 w-4 mr-1.5" />
                  {loading ? 'Creating...' : 'Create Structure'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
