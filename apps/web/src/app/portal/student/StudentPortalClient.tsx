'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { StudentPortalData } from './actions';
import {
  GraduationCap,
  CalendarCheck,
  Award,
  CreditCard,
  BookOpen,
  Calendar,
  Layers,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
import { StudentAITutorView } from '@/components/ai/StudentAITutorView';
import { useAuvrynRealtime } from '@/lib/realtime/useAuvrynRealtime';
import { RealtimeStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';

interface StudentPortalClientProps {
  initialData: StudentPortalData;
}

export function StudentPortalClient({ initialData }: StudentPortalClientProps) {
  const router = useRouter();
  const [data] = useState<StudentPortalData>(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai_tutor' | 'timetable' | 'homework' | 'results' | 'hall_tickets' | 'fees'>('overview');

  const student = data.student;
  const att = data.attendanceSummary;
  const institutionId = (student as any)?.institution_id || (student as any)?.institutionId || '';

  const { connectionState, subscribeToInstitution } = useAuvrynRealtime({
    institutionId,
    userRole: 'student',
  });

  useEffect(() => {
    if (!institutionId) return;

    const sub = subscribeToInstitution('academics', (msg) => {
      if (
        msg.eventType === 'ATTENDANCE_RECORDED' ||
        msg.eventType === 'TIMETABLE_UPDATED' ||
        msg.eventType === 'EXAM_RESULTS_PUBLISHED'
      ) {
        router.refresh();
      }
    });

    const opSub = subscribeToInstitution('operations', (msg) => {
      if (msg.eventType === 'FEE_PAYMENT_RECORDED') {
        router.refresh();
      }
    });

    return () => {
      sub?.unsubscribe();
      opSub?.unsubscribe();
    };
  }, [institutionId, subscribeToInstitution, router]);

  if (!student) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4 text-center">
        <GraduationCap className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h2 className="text-lg font-bold text-slate-800">No student profile found</h2>
        <p className="text-xs text-slate-500 mt-1">
          Your account is not linked to an active student record. Please contact administration.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Student Banner */}
      <div className="p-6 rounded-2xl bg-[#0B1E3F] text-white border border-[#142C4C] shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-semibold text-[#60A5FA] uppercase tracking-wider flex items-center gap-1.5">
            <GraduationCap className="w-3.5 h-3.5" />
            <span>AUVRYN &bull; Student Academic Workspace</span>
          </div>
          <RealtimeStatusIndicator state={connectionState} />
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {student.firstName} {student.lastName}
            </h1>
            <div className="flex items-center gap-4 text-xs text-slate-300 mt-1">
              <span>Class: <strong className="text-white">{student.className || 'N/A'} {student.sectionName ? `(${student.sectionName})` : ''}</strong></span>
              <span>Roll No: <strong className="text-white">{student.rollNumber || 'N/A'}</strong></span>
              <span>Admission No: <strong className="text-white">{student.admissionNumber}</strong></span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Attendance</span>
            <CalendarCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{att.percentage}%</div>
          <div className="text-xs text-slate-500 mt-1">
            {att.present} of {att.totalSessions} sessions attended
          </div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Coursework</span>
            <BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.homework.length}</div>
          <div className="text-xs text-slate-500 mt-1">Active homework assignments</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Exam Results</span>
            <Award className="w-4 h-4 text-purple-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{data.results.length}</div>
          <div className="text-xs text-slate-500 mt-1">Published marksheets available</div>
        </div>

        <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Fee Balance</span>
            <CreditCard className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            ₹{data.fees.outstanding.toLocaleString('en-IN')}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {data.fees.outstanding === 0 ? 'All fees cleared' : 'Outstanding dues'}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-medium">
        {[
          { key: 'overview', label: 'Overview', icon: Layers },
          { key: 'ai_tutor', label: 'AI Tutor', icon: Sparkles },
          { key: 'timetable', label: 'Timetable', icon: Calendar },
          { key: 'homework', label: 'Assignments', icon: BookOpen },
          { key: 'results', label: 'Exam Grades', icon: Award },
          { key: 'hall_tickets', label: 'Hall Tickets', icon: FileCheck2 },
          { key: 'fees', label: 'Fee Invoices', icon: CreditCard },
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

      {/* Panels */}
      {activeTab === 'ai_tutor' && <StudentAITutorView />}

      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Upcoming Assignments */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900 flex items-center justify-between">
              <span>Assignments Due</span>
              <button
                type="button"
                onClick={() => setActiveTab('homework')}
                className="text-xs text-indigo-600 hover:underline font-normal"
              >
                View all
              </button>
            </h3>
            <div className="space-y-2">
              {data.homework.slice(0, 5).map((hw) => (
                <Link
                  key={hw.id}
                  href={`/dashboard/assignments/${hw.id}`}
                  className="block text-xs py-1.5 border-b border-slate-100 last:border-none hover:bg-slate-50/50 rounded px-1 transition"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-800 truncate">{hw.title}</span>
                    <span className="text-[10px] text-slate-400 shrink-0">Due {hw.dueDate}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">{hw.subjectName}</div>
                </Link>
              ))}
            </div>
          </div>

          {/* Today's Timetable */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Today's Class Schedule</h3>
            <div className="space-y-2">
              {data.timetable.slice(0, 4).map((tt) => (
                <div key={tt.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 text-xs space-y-0.5">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-900">{tt.subjectName}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{tt.startTime} - {tt.endTime}</span>
                  </div>
                  <div className="text-[11px] text-slate-500">
                    Period {tt.periodNumber} {tt.roomNumber ? `• Room ${tt.roomNumber}` : ''}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* School Circulars */}
          <div className="p-5 rounded-xl border border-slate-200 bg-white shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-slate-900">Student Notices</h3>
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

      {activeTab === 'timetable' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Weekly Timetable</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {data.timetable.map((tt) => (
              <div key={tt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-500 uppercase font-semibold">
                  <span>{tt.dayOfWeek}</span>
                  <span>Period {tt.periodNumber}</span>
                </div>
                <div className="text-sm font-bold text-slate-900">{tt.subjectName}</div>
                <div className="text-xs text-slate-600">{tt.startTime} - {tt.endTime}</div>
                {tt.facultyName && <div className="text-[11px] text-slate-400">Faculty: {tt.facultyName}</div>}
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'homework' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Assignments & Tasks</h2>
          <div className="space-y-3">
            {data.homework.map((hw) => (
              <Link
                key={hw.id}
                href={`/dashboard/assignments/${hw.id}`}
                className="p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs transition flex items-center justify-between gap-4 block"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {hw.subjectName}
                    </span>
                    <h3 className="text-xs font-bold text-slate-900">{hw.title}</h3>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">
                    Due: {hw.dueDate} {hw.dueTime ? `@ ${hw.dueTime}` : ''} • Max: {hw.maxMarks} marks
                  </div>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                    hw.submissionStatus === 'graded'
                      ? 'bg-emerald-50 text-emerald-700'
                      : hw.submissionStatus === 'submitted'
                      ? 'bg-blue-50 text-blue-700'
                      : 'bg-amber-50 text-amber-700'
                  }`}>
                    {hw.submissionStatus}
                  </span>
                  {hw.marksObtained !== null && hw.marksObtained !== undefined && (
                    <div className="text-xs font-bold text-slate-900 mt-1">
                      {hw.marksObtained} / {hw.maxMarks}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'results' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Examination Results & Transcripts</h2>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50 text-slate-400 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4">Examination</th>
                  <th className="py-2.5 px-4">Obtained Marks</th>
                  <th className="py-2.5 px-4">Percentage</th>
                  <th className="py-2.5 px-4">Grade</th>
                  <th className="py-2.5 px-4">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.results.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-4 font-bold text-slate-800">{r.examName}</td>
                    <td className="py-3 px-4 text-slate-700">{r.obtainedMarks} / {r.totalMarks}</td>
                    <td className="py-3 px-4 font-semibold text-slate-900">{r.percentage}%</td>
                    <td className="py-3 px-4 font-bold text-indigo-700">{r.grade || '—'}</td>
                    <td className="py-3 px-4 uppercase text-[10px] font-semibold text-emerald-700">
                      {r.resultStatus}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'hall_tickets' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Examination Hall Tickets</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {data.hallTickets.length === 0 ? (
              <div className="col-span-full py-8 text-center text-xs text-slate-400">
                No active hall tickets issued
              </div>
            ) : (
              data.hallTickets.map((ht) => (
                <div key={ht.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/40 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{ht.examName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      ht.isEligible ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                    }`}>
                      {ht.isEligible ? 'Eligible' : 'Not Eligible'}
                    </span>
                  </div>
                  <div className="text-xs font-mono text-slate-600">Ticket #: {ht.ticketNumber}</div>
                  {ht.ineligibilityReason && (
                    <div className="text-[11px] text-rose-600">{ht.ineligibilityReason}</div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {activeTab === 'fees' && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Fee Invoices & Dues</h2>
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
                {data.fees.installments.map((fi) => (
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
    </div>
  );
}
