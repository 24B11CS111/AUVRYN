'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  ArrowLeft,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { createGradingScaleAction } from '../actions';
import type { GradingCalculationType } from '@edu-platform/types';

interface GradingScalesClientProps {
  initialScales: any[];
  userRole: string;
}

export function GradingScalesClient({
  initialScales,
  userRole,
}: GradingScalesClientProps) {
  const [scales, setScales] = useState<any[]>(initialScales);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canManage = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const [form, setForm] = useState({
    name: '',
    description: '',
    calculationType: 'letter_grade_percentage' as GradingCalculationType,
    isCreditBased: false,
    isDefault: false,
    rules: [
      { grade: 'A1', gradePoint: 10.0, minPercentage: 91, maxPercentage: 100, isPassing: true, description: 'Outstanding' },
      { grade: 'A2', gradePoint: 9.0, minPercentage: 81, maxPercentage: 90, isPassing: true, description: 'Excellent' },
      { grade: 'B1', gradePoint: 8.0, minPercentage: 71, maxPercentage: 80, isPassing: true, description: 'Very Good' },
      { grade: 'B2', gradePoint: 7.0, minPercentage: 61, maxPercentage: 70, isPassing: true, description: 'Good' },
      { grade: 'C1', gradePoint: 6.0, minPercentage: 51, maxPercentage: 60, isPassing: true, description: 'Above Average' },
      { grade: 'C2', gradePoint: 5.0, minPercentage: 41, maxPercentage: 50, isPassing: true, description: 'Average' },
      { grade: 'D', gradePoint: 4.0, minPercentage: 33, maxPercentage: 40, isPassing: true, description: 'Pass' },
      { grade: 'E', gradePoint: 0.0, minPercentage: 0, maxPercentage: 32, isPassing: false, description: 'Needs Improvement / Fail' },
    ],
  });

  const loadPreset = (preset: 'gpa_10' | 'gpa_4' | 'cbse') => {
    if (preset === 'gpa_10') {
      setForm((prev) => ({
        ...prev,
        name: 'Standard 10-Point GPA Scale',
        calculationType: 'gpa_10_point',
        isCreditBased: true,
        rules: [
          { grade: 'O', gradePoint: 10.0, minPercentage: 90, maxPercentage: 100, isPassing: true, description: 'Outstanding' },
          { grade: 'A+', gradePoint: 9.0, minPercentage: 80, maxPercentage: 89.99, isPassing: true, description: 'Excellent' },
          { grade: 'A', gradePoint: 8.0, minPercentage: 70, maxPercentage: 79.99, isPassing: true, description: 'Very Good' },
          { grade: 'B+', gradePoint: 7.0, minPercentage: 60, maxPercentage: 69.99, isPassing: true, description: 'Good' },
          { grade: 'B', gradePoint: 6.0, minPercentage: 50, maxPercentage: 59.99, isPassing: true, description: 'Above Average' },
          { grade: 'C', gradePoint: 5.0, minPercentage: 40, maxPercentage: 49.99, isPassing: true, description: 'Pass' },
          { grade: 'F', gradePoint: 0.0, minPercentage: 0, maxPercentage: 39.99, isPassing: false, description: 'Fail' },
        ],
      }));
    } else if (preset === 'gpa_4') {
      setForm((prev) => ({
        ...prev,
        name: 'US 4-Point GPA Scale',
        calculationType: 'gpa_4_point',
        isCreditBased: true,
        rules: [
          { grade: 'A', gradePoint: 4.0, minPercentage: 90, maxPercentage: 100, isPassing: true, description: 'Superior' },
          { grade: 'B', gradePoint: 3.0, minPercentage: 80, maxPercentage: 89.99, isPassing: true, description: 'Good' },
          { grade: 'C', gradePoint: 2.0, minPercentage: 70, maxPercentage: 79.99, isPassing: true, description: 'Average' },
          { grade: 'D', gradePoint: 1.0, minPercentage: 60, maxPercentage: 69.99, isPassing: true, description: 'Passing' },
          { grade: 'F', gradePoint: 0.0, minPercentage: 0, maxPercentage: 59.99, isPassing: false, description: 'Failing' },
        ],
      }));
    } else {
      setForm((prev) => ({
        ...prev,
        name: 'CBSE Secondary Grading System (A1-E)',
        calculationType: 'letter_grade_percentage',
        isCreditBased: false,
        rules: [
          { grade: 'A1', gradePoint: 10.0, minPercentage: 91, maxPercentage: 100, isPassing: true, description: 'Top 1/8th of passed candidates' },
          { grade: 'A2', gradePoint: 9.0, minPercentage: 81, maxPercentage: 90, isPassing: true, description: 'Next 1/8th of passed candidates' },
          { grade: 'B1', gradePoint: 8.0, minPercentage: 71, maxPercentage: 80, isPassing: true, description: 'Next 1/8th' },
          { grade: 'B2', gradePoint: 7.0, minPercentage: 61, maxPercentage: 70, isPassing: true, description: 'Next 1/8th' },
          { grade: 'C1', gradePoint: 6.0, minPercentage: 51, maxPercentage: 60, isPassing: true, description: 'Next 1/8th' },
          { grade: 'C2', gradePoint: 5.0, minPercentage: 41, maxPercentage: 50, isPassing: true, description: 'Next 1/8th' },
          { grade: 'D', gradePoint: 4.0, minPercentage: 33, maxPercentage: 40, isPassing: true, description: 'Next 1/8th' },
          { grade: 'E', gradePoint: 0.0, minPercentage: 0, maxPercentage: 32, isPassing: false, description: 'Essential Repeat' },
        ],
      }));
    }
  };

  const handleAddRule = () => {
    setForm((prev) => ({
      ...prev,
      rules: [
        ...prev.rules,
        { grade: 'New', gradePoint: 0.0, minPercentage: 0, maxPercentage: 0, isPassing: true, description: '' },
      ],
    }));
  };

  const handleRemoveRule = (index: number) => {
    setForm((prev) => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const handleRuleChange = (index: number, field: string, value: any) => {
    setForm((prev) => {
      const updated = [...prev.rules];
      const current = updated[index] || {
        grade: '',
        gradePoint: 0,
        minPercentage: 0,
        maxPercentage: 100,
        isPassing: true,
        description: '',
      };
      updated[index] = { ...current, [field]: value };
      return { ...prev, rules: updated };
    });
  };

  const handleCreateScale = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      setErrorMsg('Please enter a scheme name');
      return;
    }
    if (form.rules.length === 0) {
      setErrorMsg('Please define at least one grading interval rule');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await createGradingScaleAction({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        calculationType: form.calculationType,
        isCreditBased: form.isCreditBased,
        isDefault: form.isDefault,
        rules: form.rules.map((r) => ({
          grade: r.grade,
          gradePoint: Number(r.gradePoint),
          minPercentage: Number(r.minPercentage),
          maxPercentage: Number(r.maxPercentage),
          isPassing: Boolean(r.isPassing),
          description: r.description || undefined,
        })),
      });

      if (res.success && res.data) {
        setScales((prev) => [...prev, { ...res.data, rules: form.rules }]);
        setIsCreateModalOpen(false);
        setSuccessMsg('Grading scheme configured successfully');
      } else {
        setErrorMsg(res.error || 'Failed to create grading scheme');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/examinations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Institutional Grading Schemes
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Configurable grade boundaries, GPA calculations, 10-point & 4-point systems, and letter grade mappings.
            </p>
          </div>
        </div>

        {canManage && (
          <Button variant="primary" onClick={() => setIsCreateModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Grading Scheme
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex items-center justify-between text-red-800 text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold ml-4">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold ml-4">✕</button>
        </div>
      )}

      {/* List of Scales */}
      <div className="grid grid-cols-1 gap-6">
        {scales.map((scale) => (
          <Card key={scale.id}>
            <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base font-semibold">{scale.name}</CardTitle>
                  {scale.is_default && <Badge variant="purple">Default</Badge>}
                  <Badge variant="info">{scale.calculation_type}</Badge>
                  {scale.is_credit_based && <Badge variant="outline">Credit Weighted</Badge>}
                </div>
                {scale.description && (
                  <p className="text-xs text-gray-500 mt-1">{scale.description}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 font-mono">
                Version {scale.version}
              </span>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-gray-600">
                  <thead className="bg-gray-50 text-[11px] uppercase text-gray-500 border-b">
                    <tr>
                      <th className="px-4 py-2.5">Grade</th>
                      <th className="px-4 py-2.5">Grade Point</th>
                      <th className="px-4 py-2.5">Percentage Range</th>
                      <th className="px-4 py-2.5">Status</th>
                      <th className="px-4 py-2.5">Description</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(scale.rules || [])
                      .sort((a: any, b: any) => Number(b.min_percentage ?? b.minPercentage) - Number(a.min_percentage ?? a.minPercentage))
                      .map((rule: any, idx: number) => {
                        const grade = rule.grade;
                        const pt = rule.grade_point ?? rule.gradePoint;
                        const min = rule.min_percentage ?? rule.minPercentage;
                        const max = rule.max_percentage ?? rule.maxPercentage;
                        const isPass = rule.is_passing ?? rule.isPassing;
                        const desc = rule.description;

                        return (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="px-4 py-2 font-bold text-gray-900">{grade}</td>
                            <td className="px-4 py-2 font-semibold text-blue-700">{Number(pt).toFixed(1)}</td>
                            <td className="px-4 py-2">{min}% - {max}%</td>
                            <td className="px-4 py-2">
                              {isPass ? (
                                <span className="inline-flex items-center gap-1 text-emerald-700">
                                  <CheckCircle2 className="w-3 h-3" /> Pass
                                </span>
                              ) : (
                                <span className="text-red-600 font-medium">Fail / Repeat</span>
                              )}
                            </td>
                            <td className="px-4 py-2 text-gray-500">{desc || '—'}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Create Grading Scheme Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Configure New Grading Scheme"
      >
        <form onSubmit={handleCreateScale} className="space-y-4 max-h-[80vh] overflow-y-auto pr-1">
          {/* Quick Presets */}
          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs">
            <span className="font-semibold text-blue-900 flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              Quick System Presets:
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => loadPreset('gpa_10')}
                className="bg-white border border-blue-300 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs font-medium"
              >
                10-Point GPA (UGC/AICTE)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('gpa_4')}
                className="bg-white border border-blue-300 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs font-medium"
              >
                4-Point GPA (US / International)
              </button>
              <button
                type="button"
                onClick={() => loadPreset('cbse')}
                className="bg-white border border-blue-300 text-blue-700 px-2 py-1 rounded hover:bg-blue-100 text-xs font-medium"
              >
                CBSE (A1-E)
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Scheme Name <span className="text-red-500">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g. UGC 10-Point Relative Grading System"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Calculation Type
              </label>
              <Select
                value={form.calculationType}
                onChange={(e) => setForm({ ...form, calculationType: e.target.value as any })}
                options={[
                  { value: 'gpa_10_point', label: '10-Point GPA' },
                  { value: 'gpa_4_point', label: '4-Point GPA' },
                  { value: 'letter_grade_percentage', label: 'Letter Grade (% based)' },
                  { value: 'marks_based', label: 'Marks Percentage Only' },
                  { value: 'pass_fail', label: 'Pass / Fail' },
                ]}
              />
            </div>

            <div className="flex items-center gap-4 pt-5">
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isCreditBased}
                  onChange={(e) => setForm({ ...form, isCreditBased: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Credit Weighted
              </label>
              <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={(e) => setForm({ ...form, isDefault: e.target.checked })}
                  className="rounded border-gray-300"
                />
                Set Default
              </label>
            </div>
          </div>

          {/* Rules List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-700">
                Grade Boundary Rules ({form.rules.length})
              </span>
              <Button type="button" variant="outline" size="sm" onClick={handleAddRule} className="h-7 text-xs">
                <Plus className="w-3 h-3 mr-1" />
                Add Row
              </Button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto">
              {form.rules.map((rule, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded text-xs border">
                  <div className="w-16">
                    <Input
                      placeholder="Grade"
                      value={rule.grade}
                      onChange={(e) => handleRuleChange(idx, 'grade', e.target.value)}
                      className="h-7 text-xs font-bold"
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      step="0.1"
                      placeholder="Pt"
                      value={rule.gradePoint}
                      onChange={(e) => handleRuleChange(idx, 'gradePoint', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      step="1"
                      placeholder="Min %"
                      value={rule.minPercentage}
                      onChange={(e) => handleRuleChange(idx, 'minPercentage', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="w-16">
                    <Input
                      type="number"
                      step="1"
                      placeholder="Max %"
                      value={rule.maxPercentage}
                      onChange={(e) => handleRuleChange(idx, 'maxPercentage', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Description"
                      value={rule.description}
                      onChange={(e) => handleRuleChange(idx, 'description', e.target.value)}
                      className="h-7 text-xs"
                    />
                  </div>
                  <label className="flex items-center gap-1 text-[11px] text-gray-600">
                    <input
                      type="checkbox"
                      checked={rule.isPassing}
                      onChange={(e) => handleRuleChange(idx, 'isPassing', e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Pass
                  </label>
                  <button
                    type="button"
                    onClick={() => handleRemoveRule(idx)}
                    className="text-red-400 hover:text-red-600 p-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Configuring...' : 'Save Grading Scheme'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
