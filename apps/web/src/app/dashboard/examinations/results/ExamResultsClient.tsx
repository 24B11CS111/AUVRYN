'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Award,
  ArrowLeft,
  Search,
  Printer,
  FileText,
} from 'lucide-react';
import { getExaminationResultsAction } from '../actions';

interface ExamResultsClientProps {
  examinations: any[];
  activeExamId: string | null;
  classes: any[];
  initialResults: any[];
  userRole: string;
}

export function ExamResultsClient({
  examinations,
  activeExamId,
  classes,
  initialResults,
}: ExamResultsClientProps) {
  const [selectedExamId, setSelectedExamId] = useState<string>(activeExamId || '');
  const [selectedClassId, setSelectedClassId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [results, setResults] = useState<any[]>(initialResults);
  const [loading, setLoading] = useState(false);
  const [selectedResult, setSelectedResult] = useState<any | null>(null);

  const handleExamChange = async (examId: string) => {
    setSelectedExamId(examId);
    setLoading(true);
    try {
      const res = await getExaminationResultsAction(examId, {
        classId: selectedClassId !== 'all' ? selectedClassId : undefined,
      });
      if (res.success && res.data) {
        setResults(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleClassChange = async (classId: string) => {
    setSelectedClassId(classId);
    if (!selectedExamId) return;
    setLoading(true);
    try {
      const res = await getExaminationResultsAction(selectedExamId, {
        classId: classId !== 'all' ? classId : undefined,
      });
      if (res.success && res.data) {
        setResults(res.data);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredResults = useMemo(() => {
    return results.filter((r) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.toLowerCase().includes(query);
        const admMatch = r.student?.admission_number?.toLowerCase().includes(query);
        if (!nameMatch && !admMatch) return false;
      }
      return true;
    });
  }, [results, searchQuery]);

  // Summary Metrics
  const metrics = useMemo(() => {
    const total = results.length;
    if (total === 0) return { total: 0, pass: 0, fail: 0, distinction: 0, avgPercentage: 0 };
    const pass = results.filter((r) => ['pass', 'distinction', 'promoted_with_backlog'].includes(r.result_status)).length;
    const fail = results.filter((r) => r.result_status === 'fail').length;
    const distinction = results.filter((r) => r.result_status === 'distinction').length;
    const totalPct = results.reduce((sum, r) => sum + Number(r.percentage || 0), 0);
    return {
      total,
      pass,
      fail,
      distinction,
      avgPercentage: (totalPct / total).toFixed(1),
    };
  }, [results]);

  const getResultBadge = (status: string) => {
    switch (status) {
      case 'distinction':
        return <Badge variant="purple">Distinction</Badge>;
      case 'pass':
        return <Badge variant="success">Pass</Badge>;
      case 'fail':
        return <Badge variant="danger">Fail</Badge>;
      case 'promoted_with_backlog':
        return <Badge variant="warning">Promoted (Backlog)</Badge>;
      case 'withheld':
        return <Badge variant="default">Withheld</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const activeExam = examinations.find((e) => e.id === selectedExamId);

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
              Examination Results Ledger & Transcripts
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Consolidated scores, percentage, GPA/CGPA calculations, and student mark cards.
            </p>
          </div>
        </div>
      </div>

      {/* Selector and Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Examination
            </label>
            <Select
              value={selectedExamId}
              onChange={(e) => handleExamChange(e.target.value)}
              options={examinations.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.exam_type}) - ${e.publication_status}`,
              }))}
            />
          </div>

          <div className="w-full md:w-64">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Filter by Class
            </label>
            <Select
              value={selectedClassId}
              onChange={(e) => handleClassChange(e.target.value)}
              options={[
                { value: 'all', label: 'All Classes' },
                ...classes.map((c) => ({ value: c.id, label: c.name })),
              ]}
            />
          </div>

          <div className="w-full md:w-72">
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Search Student
            </label>
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
              <Input
                placeholder="Name or admission number..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Candidates</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Passed</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{metrics.pass}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Distinction</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{metrics.distinction}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Failed / Backlog</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{metrics.fail}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Average %</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.avgPercentage}%</p>
          </CardContent>
        </Card>
      </div>

      {/* Results Ledger Table */}
      <Card>
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Results Ledger ({filteredResults.length})
          </CardTitle>
          {activeExam && (
            <span className="text-xs text-gray-500">
              Exam: <strong className="text-gray-900">{activeExam.name}</strong>
            </span>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading results ledger...</div>
          ) : filteredResults.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mt-2">No results published yet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Ensure marks have been entered and the examination has been published by an administrator.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Adm No.</th>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Class / Section</th>
                    <th className="px-4 py-3">Marks (Obt / Max)</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">GPA</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Transcript</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredResults.map((r) => (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-gray-700">
                        {r.student?.admission_number}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {r.student?.first_name} {r.student?.last_name}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {r.academic_class?.name} {r.academic_section ? `(${r.academic_section.name})` : ''}
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-gray-900">
                        {r.total_obtained_marks} / {r.total_max_marks}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-800">
                        {Number(r.percentage).toFixed(1)}%
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-blue-700">
                        {r.gpa !== null ? Number(r.gpa).toFixed(2) : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-800">
                        {r.final_grade || '—'}
                      </td>
                      <td className="px-4 py-3">
                        {getResultBadge(r.result_status)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button
                          variant="outline"
                          className="h-8 px-2.5 text-xs"
                          onClick={() => setSelectedResult(r)}
                        >
                          <FileText className="w-3.5 h-3.5 mr-1" />
                          Mark Card
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Card / Transcript Modal */}
      <Modal
        isOpen={Boolean(selectedResult)}
        onClose={() => setSelectedResult(null)}
        title="Student Examination Mark Card"
      >
        {selectedResult && (
          <div className="space-y-4">
            {/* Header info */}
            <div className="border-b pb-3 text-center">
              <h2 className="text-base font-bold text-gray-900">
                Official Examination Transcript
              </h2>
              <p className="text-xs text-gray-500">
                {activeExam?.name} • Academic Year {selectedResult.academic_class?.name}
              </p>
            </div>

            {/* Student bio */}
            <div className="grid grid-cols-2 gap-2 text-xs bg-gray-50 p-3 rounded">
              <div>
                <span className="text-gray-500 font-medium">Candidate Name: </span>
                <span className="font-semibold text-gray-900">
                  {selectedResult.student?.first_name} {selectedResult.student?.last_name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Admission No: </span>
                <span className="font-mono font-semibold text-gray-900">
                  {selectedResult.student?.admission_number}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Class: </span>
                <span className="font-semibold text-gray-900">
                  {selectedResult.academic_class?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-500 font-medium">Section: </span>
                <span className="font-semibold text-gray-900">
                  {selectedResult.academic_section?.name || 'A'}
                </span>
              </div>
            </div>

            {/* Summary scores */}
            <div className="border rounded p-3 text-xs space-y-2">
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Total Marks Obtained:</span>
                <span className="font-bold text-gray-900">
                  {selectedResult.total_obtained_marks} / {selectedResult.total_max_marks}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Percentage:</span>
                <span className="font-bold text-gray-900">
                  {Number(selectedResult.percentage).toFixed(2)}%
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Grade Point Average (GPA):</span>
                <span className="font-bold text-blue-700">
                  {selectedResult.gpa !== null ? Number(selectedResult.gpa).toFixed(2) : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between border-b pb-1">
                <span className="text-gray-600">Final Awarded Grade:</span>
                <span className="font-bold text-gray-900">
                  {selectedResult.final_grade || 'Pass'}
                </span>
              </div>
              <div className="flex justify-between items-center pt-1">
                <span className="text-gray-600">Result Status:</span>
                <div>{getResultBadge(selectedResult.result_status)}</div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t">
              <span className="text-[11px] text-gray-400">
                Grading Scheme Version: {selectedResult.grading_scale_version}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => window.print()}>
                  <Printer className="w-3.5 h-3.5 mr-1" />
                  Print Card
                </Button>
                <Button variant="primary" size="sm" onClick={() => setSelectedResult(null)}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
