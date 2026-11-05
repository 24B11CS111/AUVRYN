'use client';

import React from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CalendarCheck,
  Users,
  UserX,
  Clock,
  ArrowRight,
  ClipboardList,
  FileText,
  UserCheck,
  Calendar,
  Building,
  CheckCircle2,
} from 'lucide-react';

interface AttendanceDashboardClientProps {
  institution: {
    id: string;
    name: string;
    type: string;
  };
  todayDate: string;
  stats: {
    totalSessionsToday: number;
    totalRecordedStudents: number;
    presentStudents: number;
    absentStudents: number;
    lateStudents: number;
    attendanceRate: number;
    staffTotal: number;
    staffPresent: number;
    staffOnLeave: number;
    pendingLeaves: number;
  };
  recentSessions: any[];
  userRole: string;
}

export function AttendanceDashboardClient({
  institution,
  todayDate,
  stats,
  recentSessions,
  userRole,
}: AttendanceDashboardClientProps) {
  const isSchool = institution.type === 'school' || institution.type === 'junior_college';
  const canMark = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'].includes(userRole);

  return (
    <div className="space-y-6">
      {/* Top Banner / Hero */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Attendance System</h1>
            <Badge variant="outline" className="capitalize text-xs font-medium text-slate-600 bg-slate-50">
              {institution.type.replace('_', ' ')} Mode
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Universal attendance tracking, live registers, mobile marking, and leave management for {todayDate}.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canMark && (
            <Link href="/dashboard/attendance/mark">
              <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm">
                <CalendarCheck className="h-4 w-4" />
                <span>Mark Attendance</span>
              </Button>
            </Link>
          )}
          <Link href="/dashboard/attendance/leaves">
            <Button variant="outline" className="flex items-center gap-1.5">
              <FileText className="h-4 w-4 text-slate-500" />
              <span>Leave Requests</span>
              {stats.pendingLeaves > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-semibold rounded-full bg-amber-100 text-amber-800">
                  {stats.pendingLeaves}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Attendance Rate */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Today's Attendance Rate</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{stats.attendanceRate}%</span>
                <span className="text-xs text-slate-500">
                  ({stats.presentStudents}/{stats.totalRecordedStudents || 0})
                </span>
              </div>
            </div>
            <div className="p-3 bg-emerald-50 rounded-xl">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
          </CardContent>
        </Card>

        {/* Sessions Today */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {isSchool ? 'Class Registers' : 'Lectures & Labs'} Today
              </p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{stats.totalSessionsToday}</span>
                <span className="text-xs text-slate-500">sessions</span>
              </div>
            </div>
            <div className="p-3 bg-indigo-50 rounded-xl">
              <Calendar className="h-6 w-6 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        {/* Absences & Late */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Absences & Late Arrivals</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-rose-600">{stats.absentStudents}</span>
                <span className="text-xs text-amber-600">({stats.lateStudents} late)</span>
              </div>
            </div>
            <div className="p-3 bg-rose-50 rounded-xl">
              <UserX className="h-6 w-6 text-rose-600" />
            </div>
          </CardContent>
        </Card>

        {/* Staff Attendance */}
        <Card className="border-slate-200 shadow-xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Staff on Duty</p>
              <div className="flex items-baseline gap-2 mt-1.5">
                <span className="text-2xl font-bold text-slate-900">{stats.staffPresent}</span>
                <span className="text-xs text-slate-500">
                  / {stats.staffTotal} ({stats.staffOnLeave} leave)
                </span>
              </div>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <UserCheck className="h-6 w-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link href="/dashboard/attendance/students" className="group">
          <Card className="h-full border-slate-200 hover:border-indigo-300 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                  <Users className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900 mt-3">Student Registers</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                Browse daily registers, view class-wise roll calls, and perform authorized attendance corrections.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/attendance/staff" className="group">
          <Card className="h-full border-slate-200 hover:border-blue-300 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-blue-50 rounded-lg text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                  <Building className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900 mt-3">Staff Attendance</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                Department-wise faculty and non-teaching daily rosters, check-in timestamps, and leave status.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/dashboard/attendance/reports" className="group">
          <Card className="h-full border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                  <ClipboardList className="h-5 w-5" />
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:text-emerald-600 group-hover:translate-x-1 transition-all" />
              </div>
              <CardTitle className="text-base font-semibold text-slate-900 mt-3">Reports & Analytics</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-slate-500">
                Detailed attendance percentages, monthly trends, absence alerts, and &lt;75% shortage monitoring.
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Attendance Sessions List */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Clock className="h-4 w-4 text-slate-500" />
            <span>Recent Attendance Sessions</span>
          </CardTitle>
          <Link href="/dashboard/attendance/students" className="text-xs font-medium text-indigo-600 hover:text-indigo-800">
            View All Registers &rarr;
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {recentSessions.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p>No attendance sessions recorded yet today.</p>
              {canMark && (
                <Link href="/dashboard/attendance/mark" className="inline-block mt-3">
                  <Button size="sm" variant="outline" className="text-xs">
                    Mark First Session
                  </Button>
                </Link>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentSessions.map((s: any) => {
                const pct = s.total_students > 0 ? Math.round((s.present_count / s.total_students) * 100) : 0;
                return (
                  <div key={s.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 transition-colors">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-slate-900">
                          {s.class?.name} {s.section?.name ? `- Sec ${s.section.name}` : ''}
                        </span>
                        {s.subject?.name && (
                          <Badge variant="outline" className="text-xs bg-slate-100 font-normal">
                            {s.subject.name}
                          </Badge>
                        )}
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            s.status === 'locked'
                              ? 'bg-slate-100 text-slate-700'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}
                        >
                          {s.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        Date: {s.session_date} &bull; Type: <span className="capitalize">{s.session_type}</span>
                        {s.marked_by_staff && (
                          <span> &bull; Teacher: {s.marked_by_staff.first_name} {s.marked_by_staff.last_name}</span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <div className="text-right">
                        <span className="font-semibold text-slate-900">{pct}% Present</span>
                        <p className="text-slate-500">
                          {s.present_count} / {s.total_students} students
                        </p>
                      </div>

                      <div className="w-16 bg-slate-200 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${
                            pct >= 85 ? 'bg-emerald-500' : pct >= 75 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
