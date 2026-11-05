'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  BookOpen,
  ArrowLeft,
  Building,
  BarChart3,
  Search,
} from 'lucide-react';

interface AttendanceReportsClientProps {
  institution: {
    id: string;
    name: string;
    type: string;
  };
  overallStats: {
    totalSessions: number;
    totalStudentRecords: number;
    totalPresent: number;
    totalAbsent: number;
    attendancePercentage: number;
    shortageCount: number;
  };
  classSummaries: Array<{
    classId: string;
    className: string;
    sectionName?: string | null;
    totalSessions: number;
    totalStudents: number;
    presentCount: number;
    absentCount: number;
    attendancePercentage: number;
  }>;
  studentMetrics: Array<{
    studentId: string;
    admissionNumber: string;
    studentName: string;
    className: string;
    sectionName?: string | null;
    totalSessions: number;
    attendedSessions: number;
    absentSessions: number;
    attendancePercentage: number;
    isShortage: boolean;
  }>;
  subjectSummaries: Array<{
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    totalSessions: number;
    attendancePercentage: number;
  }>;
}

export function AttendanceReportsClient({
  institution,
  overallStats,
  classSummaries,
  studentMetrics,
  subjectSummaries,
}: AttendanceReportsClientProps) {
  const [activeTab, setActiveTab] = useState<'classes' | 'students' | 'subjects'>('classes');
  const [studentSearch, setStudentSearch] = useState('');
  const [onlyShortage, setOnlyShortage] = useState(false);

  const filteredStudents = studentMetrics.filter((s) => {
    if (onlyShortage && !s.isShortage) return false;
    if (studentSearch.trim()) {
      const q = studentSearch.toLowerCase();
      return (
        s.studentName.toLowerCase().includes(q) ||
        s.admissionNumber.toLowerCase().includes(q) ||
        s.className.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/attendance" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance Reports & Analytics</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            {institution.name} &bull; Institutional attendance intelligence, cohort comparisons, and regulatory attendance shortage tracking.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/attendance/mark">
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs">
              Mark Attendance
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Attendance</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{overallStats.attendancePercentage}%</span>
                <span className="text-xs text-slate-500">institutional avg</span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Sessions Held</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{overallStats.totalSessions}</span>
                <span className="text-xs text-slate-500">recorded</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Roll Calls</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{overallStats.totalStudentRecords}</span>
                <span className="text-xs text-slate-500">entries</span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Attendance Shortages</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-rose-600">{overallStats.shortageCount}</span>
                <span className="text-xs text-rose-600 font-medium">students &lt; 75%</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <AlertTriangle className="h-6 w-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'classes'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Building className="h-4 w-4" />
          <span>Class Breakdown ({classSummaries.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
            activeTab === 'students'
              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
              : 'text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Users className="h-4 w-4" />
          <span>Student Percentages ({studentMetrics.length})</span>
        </button>

        {subjectSummaries.length > 0 && (
          <button
            onClick={() => setActiveTab('subjects')}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors flex items-center gap-2 ${
              activeTab === 'subjects'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Subject Analytics ({subjectSummaries.length})</span>
          </button>
        )}
      </div>

      {/* 1. Class Breakdown Tab */}
      {activeTab === 'classes' && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Class & Section Attendance Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {classSummaries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <BarChart3 className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p>No class attendance sessions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-3 pl-4">Class</th>
                      <th className="p-3">Section</th>
                      <th className="p-3 text-center">Sessions Held</th>
                      <th className="p-3 text-center">Enrolled Students</th>
                      <th className="p-3 text-center">Total Present</th>
                      <th className="p-3 text-center">Total Absent</th>
                      <th className="p-3 text-right pr-4">Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {classSummaries.map((cls, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 pl-4 font-semibold text-slate-900">{cls.className}</td>
                        <td className="p-3 text-slate-600 font-medium">
                          {cls.sectionName ? `Sec ${cls.sectionName}` : 'All Sections'}
                        </td>
                        <td className="p-3 text-center font-mono">{cls.totalSessions}</td>
                        <td className="p-3 text-center font-mono">{cls.totalStudents}</td>
                        <td className="p-3 text-center text-emerald-700 font-semibold">{cls.presentCount}</td>
                        <td className="p-3 text-center text-rose-700 font-semibold">{cls.absentCount}</td>
                        <td className="p-3 text-right pr-4">
                          <div className="flex items-center justify-end gap-2">
                            <div className="w-20 bg-slate-200 rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  cls.attendancePercentage >= 85
                                    ? 'bg-emerald-500'
                                    : cls.attendancePercentage >= 75
                                    ? 'bg-amber-500'
                                    : 'bg-rose-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(0, cls.attendancePercentage))}%` }}
                              />
                            </div>
                            <span className="font-bold text-slate-900 w-10 text-right">
                              {cls.attendancePercentage}%
                            </span>
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
      )}

      {/* 2. Student Attendance Percentages Tab */}
      {activeTab === 'students' && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Student Attendance Metrics ({filteredStudents.length})
            </CardTitle>

            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-xs text-rose-700 font-medium cursor-pointer">
                <input
                  type="checkbox"
                  checked={onlyShortage}
                  onChange={(e) => setOnlyShortage(e.target.checked)}
                  className="rounded border-slate-300 text-rose-600 focus:ring-rose-500"
                />
                <span>Only Show &lt; 75% Shortage</span>
              </label>

              <div className="relative w-48">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter student..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  className="pl-8 text-xs bg-slate-50 h-8"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {filteredStudents.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <Users className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p>No student records matching filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-3 pl-4">Admission #</th>
                      <th className="p-3">Student Name</th>
                      <th className="p-3">Class & Section</th>
                      <th className="p-3 text-center">Eligible Sessions</th>
                      <th className="p-3 text-center">Attended</th>
                      <th className="p-3 text-center">Absences</th>
                      <th className="p-3 text-center">Attendance %</th>
                      <th className="p-3 text-right pr-4">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredStudents.map((st) => (
                      <tr key={st.studentId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 pl-4 font-mono text-slate-500">{st.admissionNumber}</td>
                        <td className="p-3 font-semibold text-slate-900">{st.studentName}</td>
                        <td className="p-3 text-slate-600">
                          {st.className} {st.sectionName ? `- ${st.sectionName}` : ''}
                        </td>
                        <td className="p-3 text-center font-mono">{st.totalSessions}</td>
                        <td className="p-3 text-center text-emerald-700 font-semibold font-mono">
                          {st.attendedSessions}
                        </td>
                        <td className="p-3 text-center text-rose-700 font-semibold font-mono">
                          {st.absentSessions}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`font-bold ${
                              st.attendancePercentage >= 85
                                ? 'text-emerald-700'
                                : st.attendancePercentage >= 75
                                ? 'text-amber-700'
                                : 'text-rose-700'
                            }`}
                          >
                            {st.attendancePercentage}%
                          </span>
                        </td>
                        <td className="p-3 text-right pr-4">
                          {st.isShortage ? (
                            <Badge variant="outline" className="text-[11px] bg-rose-50 text-rose-700 border-rose-300 font-semibold">
                              Shortage Alert
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[11px] bg-emerald-50 text-emerald-700 border-emerald-300 font-medium">
                              Satisfactory
                            </Badge>
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
      )}

      {/* 3. Subject-Wise Breakdown Tab */}
      {activeTab === 'subjects' && (
        <Card className="border-slate-200 shadow-xs overflow-hidden">
          <CardHeader className="p-4 border-b border-slate-100">
            <CardTitle className="text-sm font-semibold text-slate-900">
              Subject & Lecture Attendance Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {subjectSummaries.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-sm">
                <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-2" />
                <p>No subject lecture sessions recorded yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="p-3 pl-4">Subject Code</th>
                      <th className="p-3">Subject Name</th>
                      <th className="p-3 text-center">Lectures Held</th>
                      <th className="p-3 text-right pr-4">Average Attendance Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {subjectSummaries.map((sub) => (
                      <tr key={sub.subjectId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 pl-4 font-mono font-semibold text-slate-700">{sub.subjectCode}</td>
                        <td className="p-3 font-medium text-slate-900">{sub.subjectName}</td>
                        <td className="p-3 text-center font-mono">{sub.totalSessions}</td>
                        <td className="p-3 text-right pr-4 font-bold text-slate-900">
                          {sub.attendancePercentage}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
