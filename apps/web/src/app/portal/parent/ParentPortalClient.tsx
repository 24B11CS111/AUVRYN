'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { ParentPortalData } from './actions';
import { getParentPortalDataAction } from './actions';
import {
  Users,
  CalendarCheck,
  Award,
  CreditCard,
  BookOpen,
  CalendarOff,
  Calendar,
  Layers,
} from 'lucide-react';

interface ParentPortalClientProps {
  initialData: ParentPortalData;
}

export function ParentPortalClient({ initialData }: ParentPortalClientProps) {
  const [data, setData] = useState<ParentPortalData>(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'results' | 'timetable' | 'fees' | 'homework' | 'leave'>('overview');
  const [isPending, startTransition] = useTransition();

  const handleChildSelect = (studentId: string) => {
    startTransition(async () => {
      const res = await getParentPortalDataAction(studentId);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const activeChild = data.activeChildDetails?.student;
  const attSummary = data.activeChildDetails?.attendanceSummary;
  const fees = data.activeChildDetails?.fees;

  if (data.children.length === 0) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No linked student records found</h2>
        <p className="text-xs text-slate-500 mt-1">
          Your parent profile is not currently linked to any enrolled students. Please contact the institution administration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Child Switcher */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 to-slate-800 text-white shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Parent Portal
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Family Academic Dashboard</h1>
          </div>

          {/* Child Switcher Pills */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-slate-300 font-medium">Select Child:</span>
            {data.children.map((ch) => {
              const isSelected = ch.id === data.selectedChildId;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => handleChildSelect(ch.id)}
                  disabled={isPending}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    isSelected
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {ch.firstName} {ch.lastName} ({ch.className || 'Student'})
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Child Info */}
        {activeChild && (
          <div className="pt-3 border-t border-slate-700/60 flex flex-wrap items-center gap-6 text-xs text-slate-300">
            <div>Admission No: <strong className="text-white">{activeChild.admissionNumber}</strong></div>
            <div>Class & Section: <strong className="text-white">{activeChild.className || 'N/A'} {activeChild.sectionName ? `(${activeChild.sectionName})` : ''}</strong></div>
            {activeChild.rollNumber && <div>Roll No: <strong className="text-white">{activeChild.rollNumber}</strong></div>}
          </div>
        )}
      </div>

      {/* KPI Cards for Selected Child */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {attSummary ? `${attSummary.percentage}%` : '100%'}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {attSummary?.present || 0} sessions attended
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fee Balance</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{fees ? fees.outstanding.toLocaleString('en-IN') : 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {fees && fees.outstanding === 0 ? 'All fees settled' : 'Outstanding installments'}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Coursework</span>
            <BookOpen className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {data.activeChildDetails?.homework?.length || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Active homework assignments</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Published Results</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {data.activeChildDetails?.results?.length || 0}
          </div>
          <div className="text-xs text-slate-500 mt-1">Exam report cards available</div>
        </div>
      </div>

      {/* Portal Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { key: 'results', label: 'Exam Results', icon: Award },
          { key: 'timetable', label: 'Timetable', icon: Calendar },
          { key: 'fees', label: 'Fees & Dues', icon: CreditCard },
          { key: 'homework', label: 'Homework', icon: BookOpen },
          { key: 'leave', label: 'Leave History', icon: CalendarOff },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg whitespace-nowrap transition ${
                isActive
                  ? 'bg-slate-900 text-white font-semibold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Attendance */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Recent Attendance</span>
              <button
                type="button"
                onClick={() => setActiveTab('attendance')}
                className="text-xs text-indigo-600 hover:underline font-normal"
              >
                View all
              </button>
            </h3>
            <div className="space-y-2">
              {(data.activeChildDetails?.recentAttendance || []).slice(0, 5).map((att, i) => (
                <div key={i} className="flex items-center justify-between text-xs py-1.5 border-b border-slate-100 last:border-none">
                  <span className="text-slate-600">{att.date}</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                    att.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                  }`}>
                    {att.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Homework */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Upcoming Homework</span>
              <button
                type="button"
                onClick={() => setActiveTab('homework')}
                className="text-xs text-indigo-600 hover:underline font-normal"
              >
                View all
              </button>
            </h3>
            <div className="space-y-2">
              {(data.activeChildDetails?.homework || []).slice(0, 5).map((hw) => (
                <div key={hw.id} className="text-xs py-1.5 border-b border-slate-100 last:border-none space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 truncate">{hw.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">Due {hw.dueDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{hw.subjectName}</div>
                </div>
              ))}
            </div>
          </div>

          {/* School Announcements */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">School Notices</h3>
            <div className="space-y-3">
              {data.announcements.slice(0, 4).map((ann) => (
                <div key={ann.id} className="text-xs space-y-1 pb-2 border-b border-slate-100 last:border-none">
                  <div className="font-semibold text-slate-900">{ann.title}</div>
                  <div className="text-slate-500 line-clamp-2 text-[11px]">{ann.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'attendance' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Attendance Log</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Date</th>
                  <th className="py-2.5 px-4">Session Type</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.activeChildDetails?.recentAttendance || []).map((r, i) => (
                  <tr key={i} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{r.date}</td>
                    <td className="py-3 px-4 capitalize text-slate-500">{r.sessionType}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        r.status === 'present' ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                      }`}>
                        {r.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Academic Examination Results</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Examination</th>
                  <th className="py-2.5 px-4">Marks Obtained</th>
                  <th className="py-2.5 px-4">Percentage</th>
                  <th className="py-2.5 px-4">Grade</th>
                  <th className="py-2.5 px-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.activeChildDetails?.results || []).map((res) => (
                  <tr key={res.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{res.examName}</td>
                    <td className="py-3 px-4 text-slate-700">{res.obtainedMarks} / {res.totalMarks}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{res.percentage}%</td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{res.grade || '—'}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-semibold text-emerald-700">
                      {res.resultStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'timetable' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Class Timetable</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {(data.activeChildDetails?.timetable || []).map((tt) => (
              <div key={tt.id} className="p-3 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase font-semibold">
                  <span>{tt.dayOfWeek}</span>
                  <span>Period {tt.periodNumber}</span>
                </div>
                <div className="text-xs font-bold text-slate-900">{tt.subjectName}</div>
                <div className="text-[11px] text-slate-500">{tt.startTime} - {tt.endTime}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Fee Schedule & Dues</h2>
            <Link
              href="/dashboard/fees"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Open Online Fee Gateway
            </Link>
          </div>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Installment</th>
                  <th className="py-2.5 px-4">Due Date</th>
                  <th className="py-2.5 px-4">Amount</th>
                  <th className="py-2.5 px-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(data.activeChildDetails?.fees?.installments || []).map((fi) => (
                  <tr key={fi.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-medium text-slate-800">{fi.installmentName}</td>
                    <td className="py-3 px-4 text-slate-500">{fi.dueDate}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">₹{fi.amount.toLocaleString('en-IN')}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                        fi.status === 'paid' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {fi.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Homework & Coursework</h2>
          <div className="space-y-3">
            {(data.activeChildDetails?.homework || []).map((hw) => (
              <div key={hw.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {hw.subjectName}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">{hw.title}</h3>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Due: {hw.dueDate} • Max Marks: {hw.maxMarks}
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                    hw.submissionStatus === 'graded' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {hw.submissionStatus}
                  </span>
                  {hw.marksObtained !== null && hw.marksObtained !== undefined && (
                    <div className="text-xs font-bold text-slate-900 mt-1">
                      {hw.marksObtained} / {hw.maxMarks}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'leave' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900">Child Leave Applications</h2>
            <Link
              href="/dashboard/leave"
              className="text-xs font-semibold text-indigo-600 hover:underline"
            >
              Apply New Leave
            </Link>
          </div>
          <div className="space-y-3">
            {(data.activeChildDetails?.recentLeave || []).map((l) => (
              <div key={l.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-semibold text-slate-800">
                    {l.startDate} to {l.endDate}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{l.reason}</div>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                  l.status === 'approved' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                }`}>
                  {l.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
