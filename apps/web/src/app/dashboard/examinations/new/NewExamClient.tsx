'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Award, ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { createExaminationAction } from '../actions';
import type { ExamType, ExamStatus } from '@edu-platform/types';

interface NewExamClientProps {
  academicYears: any[];
  campuses: any[];
  programs: any[];
  classes: any[];
  gradingScales: any[];
}

export function NewExamClient({
  academicYears,
  campuses,
  programs,
  classes,
  gradingScales,
}: NewExamClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const defaultYear = academicYears.find((y) => y.is_current)?.id || academicYears[0]?.id || '';
  const defaultScale = gradingScales.find((s) => s.is_default)?.id || gradingScales[0]?.id || '';

  const [formData, setFormData] = useState({
    name: '',
    examType: 'midterm' as ExamType,
    academicYearId: defaultYear,
    campusId: '',
    programId: '',
    classId: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    maxMarks: 100,
    passingMarks: 40,
    weightagePercentage: 100,
    gradingScaleId: defaultScale,
    status: 'scheduled' as ExamStatus,
    instructions: '',
  });

  const handleChange = (field: string, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!formData.name.trim()) {
      setErrorMsg('Please enter an examination title');
      return;
    }
    if (!formData.academicYearId) {
      setErrorMsg('Please select an academic year');
      return;
    }
    if (formData.endDate < formData.startDate) {
      setErrorMsg('End date cannot be earlier than start date');
      return;
    }
    if (Number(formData.passingMarks) > Number(formData.maxMarks)) {
      setErrorMsg('Passing marks cannot exceed maximum marks');
      return;
    }

    setLoading(true);
    try {
      const res = await createExaminationAction({
        name: formData.name.trim(),
        examType: formData.examType,
        academicYearId: formData.academicYearId,
        campusId: formData.campusId || null,
        programId: formData.programId || null,
        classId: formData.classId || null,
        startDate: formData.startDate,
        endDate: formData.endDate,
        maxMarks: Number(formData.maxMarks),
        passingMarks: Number(formData.passingMarks),
        weightagePercentage: Number(formData.weightagePercentage),
        gradingScaleId: formData.gradingScaleId || null,
        status: formData.status,
        instructions: formData.instructions.trim() || undefined,
      });

      if (res.success && res.data) {
        router.push(`/dashboard/examinations/${res.data.id}`);
      } else {
        setErrorMsg(res.error || 'Failed to create examination');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/examinations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Schedule New Examination
            </h1>
            <p className="text-xs text-gray-500">
              Define examination parameters, maximum marks, grading scale, and target hierarchy.
            </p>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex items-center gap-2 text-red-800 text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold flex items-center gap-2">
              <Award className="w-4 h-4 text-blue-600" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Examination Name <span className="text-red-500">*</span>
                </label>
                <Input
                  placeholder="e.g. Semester 1 Midterm Examination 2026"
                  value={formData.name}
                  onChange={(e) => handleChange('name', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Examination Type <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.examType}
                  onChange={(e) => handleChange('examType', e.target.value)}
                  options={[
                    { value: 'internal_assessment', label: 'Internal Assessment' },
                    { value: 'unit_test', label: 'Unit Test' },
                    { value: 'midterm', label: 'Midterm Examination' },
                    { value: 'semester_exam', label: 'Semester Examination' },
                    { value: 'annual_exam', label: 'Annual Examination' },
                    { value: 'practical_exam', label: 'Practical Examination' },
                    { value: 'laboratory_exam', label: 'Laboratory Examination' },
                    { value: 'assignment', label: 'Assignment / Coursework' },
                    { value: 'project', label: 'Project Review' },
                    { value: 'viva', label: 'Viva Voce' },
                    { value: 'final_exam', label: 'Final Examination' },
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Academic Year <span className="text-red-500">*</span>
                </label>
                <Select
                  value={formData.academicYearId}
                  onChange={(e) => handleChange('academicYearId', e.target.value)}
                  options={academicYears.map((ay) => ({
                    value: ay.id,
                    label: `${ay.name}${ay.is_current ? ' (Current)' : ''}`,
                  }))}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">
              Scope & Academic Target
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Campus (Optional)
                </label>
                <Select
                  value={formData.campusId}
                  onChange={(e) => handleChange('campusId', e.target.value)}
                  options={[
                    { value: '', label: 'All Campuses' },
                    ...campuses.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Program (Optional)
                </label>
                <Select
                  value={formData.programId}
                  onChange={(e) => handleChange('programId', e.target.value)}
                  options={[
                    { value: '', label: 'All Programs' },
                    ...programs.map((p) => ({ value: p.id, label: p.name })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Target Class (Optional)
                </label>
                <Select
                  value={formData.classId}
                  onChange={(e) => handleChange('classId', e.target.value)}
                  options={[
                    { value: '', label: 'All Classes (Institution-wide)' },
                    ...classes.map((c) => ({ value: c.id, label: c.name })),
                  ]}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="border-b pb-4">
            <CardTitle className="text-base font-semibold">
              Evaluation & Grading Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Maximum Marks <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="1000"
                  step="0.5"
                  value={formData.maxMarks}
                  onChange={(e) => handleChange('maxMarks', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Passing Marks <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  max={formData.maxMarks}
                  step="0.5"
                  value={formData.passingMarks}
                  onChange={(e) => handleChange('passingMarks', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Weightage (%) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  step="1"
                  value={formData.weightagePercentage}
                  onChange={(e) => handleChange('weightagePercentage', e.target.value)}
                  required
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Grading Scheme / Scale
                </label>
                <Select
                  value={formData.gradingScaleId}
                  onChange={(e) => handleChange('gradingScaleId', e.target.value)}
                  options={[
                    { value: '', label: 'Marks Percentage Only (No Grade Scale)' },
                    ...gradingScales.map((s) => ({
                      value: s.id,
                      label: `${s.name} (${s.calculation_type})`,
                    })),
                  ]}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Initial Status
                </label>
                <Select
                  value={formData.status}
                  onChange={(e) => handleChange('status', e.target.value)}
                  options={[
                    { value: 'draft', label: 'Draft' },
                    { value: 'scheduled', label: 'Scheduled' },
                    { value: 'in_progress', label: 'In Progress' },
                  ]}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Start Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  value={formData.startDate}
                  onChange={(e) => handleChange('startDate', e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  End Date <span className="text-red-500">*</span>
                </label>
                <Input
                  type="date"
                  min={formData.startDate}
                  value={formData.endDate}
                  onChange={(e) => handleChange('endDate', e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="pt-2">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Instructions & General Guidelines (Optional)
              </label>
              <textarea
                rows={3}
                className="w-full text-sm rounded-md border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none"
                placeholder="Guidelines printed on hall tickets and displayed during marks entry..."
                value={formData.instructions}
                onChange={(e) => handleChange('instructions', e.target.value)}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex items-center justify-end gap-3">
          <Link href="/dashboard/examinations">
            <Button variant="outline" type="button">
              Cancel
            </Button>
          </Link>
          <Button variant="primary" type="submit" disabled={loading}>
            <Save className="w-4 h-4 mr-2" />
            {loading ? 'Creating Examination...' : 'Create Examination'}
          </Button>
        </div>
      </form>
    </div>
  );
}
