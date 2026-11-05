'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import {
  Award,
  Calendar,
  Clock,
  CheckCircle2,
  Plus,
  Search,
  BarChart3,
  Sliders,
  RotateCcw,
  Eye,
  CheckSquare,
  Trash2,
} from 'lucide-react';
import { deleteExaminationAction, publishExaminationResultsAction } from './actions';

interface ExamOverviewClientProps {
  initialExaminations: any[];
  academicYears: any[];
  activeYearId: string;
  classes: any[];
  stats: {
    totalExams: number;
    scheduledExams: number;
    ongoingExams: number;
    completedExams: number;
    publishedResults: number;
    pendingRevaluations: number;
  };
  userRole: string;
}

export function ExamOverviewClient({
  initialExaminations,
  academicYears,
  activeYearId,
  classes,
  stats,
  userRole,
}: ExamOverviewClientProps) {
  const router = useRouter();
  const [examinations, setExaminations] = useState<any[]>(initialExaminations);
  const [selectedYear, setSelectedYear] = useState<string>(activeYearId);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedClass, setSelectedClass] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const canManage = ['owner', 'admin', 'academic_admin', 'department_head'].includes(userRole);
  const canPublish = ['owner', 'admin', 'academic_admin'].includes(userRole);

  const filteredExams = useMemo(() => {
    return examinations.filter((exam) => {
      if (selectedYear && selectedYear !== 'all' && exam.academic_year_id !== selectedYear) {
        return false;
      }
      if (selectedStatus !== 'all' && exam.status !== selectedStatus) {
        return false;
      }
      if (selectedType !== 'all' && exam.exam_type !== selectedType) {
        return false;
      }
      if (selectedClass !== 'all' && exam.class_id !== selectedClass) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const nameMatch = exam.name.toLowerCase().includes(query);
        const classMatch = exam.academic_class?.name?.toLowerCase().includes(query);
        const typeMatch = exam.exam_type.toLowerCase().includes(query);
        if (!nameMatch && !classMatch && !typeMatch) return false;
      }
      return true;
    });
  }, [examinations, selectedYear, selectedStatus, selectedType, selectedClass, searchQuery]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete examination "${name}"? This will delete all associated subjects and marks.`)) {
      return;
    }
    setActionLoading(id);
    setErrorMsg(null);
    try {
      const res = await deleteExaminationAction(id);
      if (res.success) {
        setExaminations((prev) => prev.filter((e) => e.id !== id));
      } else {
        setErrorMsg(res.error || 'Failed to delete examination');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async (id: string) => {
    if (!confirm('Are you sure you want to consolidate and publish results for this examination? Once published, students and guardians will be able to view their transcripts.')) {
      return;
    }
    setActionLoading(id);
    setErrorMsg(null);
    try {
      const res = await publishExaminationResultsAction({ examinationId: id });
      if (res.success) {
        setExaminations((prev) =>
          prev.map((e) =>
            e.id === id
              ? { ...e, publication_status: 'published', status: 'completed' }
              : e
          )
        );
        router.push(`/dashboard/examinations/results?examId=${id}`);
      } else {
        setErrorMsg(res.error || 'Failed to publish results');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <Badge variant="default">Draft</Badge>;
      case 'scheduled':
        return <Badge variant="info">Scheduled</Badge>;
      case 'in_progress':
        return <Badge variant="warning">In Progress</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'published':
        return <Badge variant="purple">Published</Badge>;
      case 'cancelled':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getPublicationBadge = (pubStatus: string) => {
    switch (pubStatus) {
      case 'published':
        return <Badge variant="success">Published</Badge>;
      case 'under_review':
        return <Badge variant="warning">Under Review</Badge>;
      case 'withdrawn':
        return <Badge variant="danger">Withdrawn</Badge>;
      case 'unpublished':
      default:
        return <Badge variant="outline">Unpublished</Badge>;
    }
  };

  const formatExamType = (type: string) => {
    return type
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            Examination & Results Management
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Universal examination lifecycle, faculty marks rosters, automated grading, hall tickets, and published transcripts.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Link href="/dashboard/examinations/new">
              <Button variant="primary">
                <Plus className="w-4 h-4 mr-2" />
                Schedule Exam
              </Button>
            </Link>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex items-center justify-between text-red-800 text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 hover:text-red-700 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/dashboard/examinations/schedule">
          <Card className="hover:border-blue-400 hover:shadow-sm transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-50 text-blue-600">
                <Calendar className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Timetable</p>
                <p className="text-sm font-semibold text-gray-900">Exam Schedule</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/examinations/results">
          <Card className="hover:border-emerald-400 hover:shadow-sm transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-600">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Transcripts</p>
                <p className="text-sm font-semibold text-gray-900">Results Ledger</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/examinations/grading">
          <Card className="hover:border-purple-400 hover:shadow-sm transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-50 text-purple-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Configuration</p>
                <p className="text-sm font-semibold text-gray-900">Grading Schemes</p>
              </div>
            </CardContent>
          </Card>
        </Link>
        <Link href="/dashboard/examinations/revaluation">
          <Card className="hover:border-amber-400 hover:shadow-sm transition-all cursor-pointer">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-50 text-amber-600">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Review</p>
                <p className="text-sm font-semibold text-gray-900">Revaluation ({stats.pendingRevaluations})</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Total Exams</p>
              <Award className="w-4 h-4 text-gray-400" />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Scheduled</p>
              <Calendar className="w-4 h-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.scheduledExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Ongoing</p>
              <Clock className="w-4 h-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.ongoingExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Completed</p>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completedExams}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Results Out</p>
              <BarChart3 className="w-4 h-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.publishedResults}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium text-gray-500">Revaluations</p>
              <RotateCcw className="w-4 h-4 text-orange-500" />
            </div>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pendingRevaluations}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col md:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
              <Input
                placeholder="Search examinations by title, class or type..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <Select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                options={[
                  { value: 'all', label: 'All Academic Years' },
                  ...academicYears.map((ay) => ({
                    value: ay.id,
                    label: `${ay.name}${ay.is_current ? ' (Current)' : ''}`,
                  })),
                ]}
              />
              <Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                options={[
                  { value: 'all', label: 'All Statuses' },
                  { value: 'draft', label: 'Draft' },
                  { value: 'scheduled', label: 'Scheduled' },
                  { value: 'in_progress', label: 'In Progress' },
                  { value: 'completed', label: 'Completed' },
                  { value: 'cancelled', label: 'Cancelled' },
                ]}
              />
              <Select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                options={[
                  { value: 'all', label: 'All Assessment Types' },
                  { value: 'internal_assessment', label: 'Internal Assessment' },
                  { value: 'unit_test', label: 'Unit Test' },
                  { value: 'midterm', label: 'Midterm' },
                  { value: 'semester_exam', label: 'Semester Exam' },
                  { value: 'annual_exam', label: 'Annual Exam' },
                  { value: 'practical_exam', label: 'Practical Exam' },
                  { value: 'final_exam', label: 'Final Exam' },
                ]}
              />
              <Select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                options={[
                  { value: 'all', label: 'All Classes' },
                  ...classes.map((c) => ({
                    value: c.id,
                    label: c.name,
                  })),
                ]}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Examinations Table / List */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <CardTitle className="text-base font-semibold">
            Examinations ({filteredExams.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filteredExams.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-12 h-12 mx-auto text-gray-300" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No examinations found</h3>
              <p className="mt-1 text-xs text-gray-500">
                No examinations match your current filters or none have been scheduled yet.
              </p>
              {canManage && (
                <div className="mt-4">
                  <Link href="/dashboard/examinations/new">
                    <Button variant="primary">
                      <Plus className="w-4 h-4 mr-2" />
                      Schedule First Examination
                    </Button>
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Examination</th>
                    <th className="px-4 py-3">Type</th>
                    <th className="px-4 py-3">Class / Target</th>
                    <th className="px-4 py-3">Schedule Window</th>
                    <th className="px-4 py-3">Marks</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Publication</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredExams.map((exam) => (
                    <tr key={exam.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/dashboard/examinations/${exam.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600 flex items-center gap-1.5"
                        >
                          {exam.name}
                        </Link>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {exam.exam_subjects?.length || 0} subjects allocated
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex text-xs font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded">
                          {formatExamType(exam.exam_type)}
                        </span>
                      </td>
                      <td className="px-4 py-3.5">
                        <p className="text-xs font-medium text-gray-800">
                          {exam.academic_class?.name || 'All Classes'}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {exam.academic_year?.name}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {exam.start_date} to {exam.end_date}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-gray-900">{exam.max_marks}</span>
                        <span className="text-gray-400"> (Pass: {exam.passing_marks})</span>
                      </td>
                      <td className="px-4 py-3.5">
                        {getStatusBadge(exam.status)}
                      </td>
                      <td className="px-4 py-3.5">
                        {getPublicationBadge(exam.publication_status)}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/dashboard/examinations/${exam.id}`}>
                            <Button variant="outline" className="h-8 px-2.5 text-xs" title="View Details">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                          {exam.exam_subjects && exam.exam_subjects.length > 0 && (
                            <Link href={`/dashboard/examinations/${exam.id}/marks`}>
                              <Button variant="outline" className="h-8 px-2.5 text-xs" title="Enter Marks">
                                <CheckSquare className="w-3.5 h-3.5 mr-1" />
                                Marks
                              </Button>
                            </Link>
                          )}
                          {canPublish && exam.publication_status !== 'published' && (
                            <Button
                              variant="outline"
                              className="h-8 px-2.5 text-xs text-purple-700 border-purple-200 hover:bg-purple-50"
                              disabled={actionLoading === exam.id}
                              onClick={() => handlePublish(exam.id)}
                              title="Publish Results"
                            >
                              Publish
                            </Button>
                          )}
                          {exam.publication_status === 'published' && (
                            <Link href={`/dashboard/examinations/results?examId=${exam.id}`}>
                              <Button variant="outline" className="h-8 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                                Results
                              </Button>
                            </Link>
                          )}
                          {canManage && exam.publication_status !== 'published' && (
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              disabled={actionLoading === exam.id}
                              onClick={() => handleDelete(exam.id, exam.name)}
                              title="Delete Exam"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
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
  );
}
