'use client';

import React, { useState, useTransition, useEffect } from 'react';
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
  Bus,
  Compass,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { TransportMap } from '@/components/transport/TransportMap';
import { ParentAICompanionView } from '@/components/ai/ParentAICompanionView';
import { useAuvrynRealtime } from '@/lib/realtime/useAuvrynRealtime';
import { RealtimeStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';

interface ParentPortalClientProps {
  initialData: ParentPortalData;
}

export function ParentPortalClient({ initialData }: ParentPortalClientProps) {
  const [data, setData] = useState<ParentPortalData>(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai_companion' | 'attendance' | 'results' | 'timetable' | 'fees' | 'homework' | 'leave' | 'transport'>('overview');
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
  const institutionId = (activeChild as any)?.institution_id || (activeChild as any)?.institutionId || '';

  const { connectionState, subscribeToInstitution } = useAuvrynRealtime({
    institutionId,
    userRole: 'parent',
  });

  useEffect(() => {
    const selectedId = data.selectedChildId;
    if (!institutionId || !selectedId) return;

    const sub = subscribeToInstitution('academics', (msg) => {
      if (
        msg.eventType === 'ATTENDANCE_RECORDED' ||
        msg.eventType === 'TIMETABLE_UPDATED' ||
        msg.eventType === 'EXAM_RESULTS_PUBLISHED'
      ) {
        handleChildSelect(selectedId);
      }
    });

    const opSub = subscribeToInstitution('operations', (msg) => {
      if (
        msg.eventType === 'FEE_PAYMENT_RECORDED' ||
        msg.eventType === 'STUDENT_BOARDED' ||
        msg.eventType === 'JOURNEY_STARTED' ||
        msg.eventType === 'JOURNEY_ENDED'
      ) {
        handleChildSelect(selectedId);
      }
    });

    return () => {
      sub?.unsubscribe();
      opSub?.unsubscribe();
    };
  }, [institutionId, data.selectedChildId, subscribeToInstitution]);

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
      <div className="p-6 rounded-2xl bg-[#0B1E3F] text-white border border-[#142C4C] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="text-[11px] font-semibold text-[#60A5FA] uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                <span>AUVRYN &bull; Guardian & Family Portal</span>
              </div>
              <RealtimeStatusIndicator state={connectionState} />
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
          { key: 'ai_companion', label: 'AI Companion', icon: Sparkles },
          { key: 'attendance', label: 'Attendance', icon: CalendarCheck },
          { key: 'results', label: 'Exam Results', icon: Award },
          { key: 'timetable', label: 'Timetable', icon: Calendar },
          { key: 'fees', label: 'Fees & Dues', icon: CreditCard },
          { key: 'homework', label: 'Homework', icon: BookOpen },
          { key: 'leave', label: 'Leave History', icon: CalendarOff },
          { key: 'transport', label: 'School Transport', icon: Bus },
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
      {activeTab === 'ai_companion' && (
        <ParentAICompanionView initialStudentId={data.selectedChildId || undefined} />
      )}

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

      {activeTab === 'transport' && (
        <div className="space-y-6">
          {!(data.activeChildDetails as any)?.transport?.hasTransport ? (
            <div className="p-12 text-center rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
              <Bus className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No School Transport Enrolled</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                {activeChild?.firstName} is not currently assigned to an institutional transport route.
              </p>
            </div>
          ) : (
            (() => {
              const trans = (data.activeChildDetails as any).transport;
              const route = trans.route;
              const vehicle = trans.vehicle;
              const driver = trans.driver;
              const journey = trans.activeJourney;
              const liveLoc = trans.liveLocation;
              const isLive = journey?.status === 'in_progress';
              const isDelayed = journey?.status === 'delayed';

              return (
                <div className="space-y-5">
                  {/* Transport Summary Header */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {route?.route_code}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 mt-1">{route?.route_name}</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Vehicle: <span className="font-mono font-semibold text-slate-800">{vehicle?.registration_number}</span> ({vehicle?.vehicle_model})
                      </p>
                    </div>

                    <div className="text-xs text-slate-600 space-y-1">
                      <div>
                        <span className="text-slate-400">Pickup Stop: </span>
                        <span className="font-semibold text-slate-800">{trans.pickupStop?.name}</span>
                      </div>
                      <div>
                        <span className="text-slate-400">Drop-off Stop: </span>
                        <span className="font-semibold text-slate-800">{trans.dropoffStop?.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-500 text-[11px] pt-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Driver: {driver?.first_name} {driver?.last_name} (Hotline verified)</span>
                      </div>
                    </div>

                    <div className="flex flex-col justify-between items-start md:items-end">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-bold ${
                          isLive
                            ? 'bg-emerald-100 text-emerald-800 animate-pulse'
                            : isDelayed
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {journey ? journey.status.toUpperCase() : 'NO ACTIVE JOURNEY'}
                      </span>
                      {isDelayed && (
                        <p className="text-xs text-amber-700 font-semibold mt-1">
                          +{journey.delay_minutes} min delay ({journey.delay_reason})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Live Tracking Map Component */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <Compass className="w-4 h-4 text-emerald-600" />
                      <span>Live Bus Tracking</span>
                    </h3>

                    <TransportMap
                      routeName={route?.route_name}
                      isLive={isLive}
                      height="380px"
                      vehicleLocation={
                        liveLoc
                          ? {
                              latitude: parseFloat(liveLoc.latitude),
                              longitude: parseFloat(liveLoc.longitude),
                              speedKmh: liveLoc.speed_kmh,
                              heading: liveLoc.heading,
                              recordedAt: liveLoc.recorded_at,
                            }
                          : null
                      }
                      stops={[
                        {
                          id: 'pickup',
                          name: trans.pickupStop?.name || 'Pickup Stop',
                          latitude: trans.pickupStop?.latitude || 28.61,
                          longitude: trans.pickupStop?.longitude || 77.2,
                          stopOrder: 1,
                        },
                        {
                          id: 'dropoff',
                          name: trans.dropoffStop?.name || 'Drop-off Stop',
                          latitude: trans.dropoffStop?.latitude || 28.63,
                          longitude: trans.dropoffStop?.longitude || 77.22,
                          stopOrder: 2,
                        },
                      ]}
                    />
                  </div>

                  {/* Boarding History */}
                  <div className="p-5 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">Recent Boarding & Drop-Off Confirmations</h3>
                    {(trans.recentBoardings || []).length === 0 ? (
                      <p className="text-xs text-slate-400">No boarding events recorded today yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {trans.recentBoardings.map((b: any) => (
                          <div
                            key={b.id}
                            className="p-3 rounded-xl border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-semibold text-slate-800">
                                {b.eventType === 'pickup' ? 'Boarded Bus' : 'Safely Alighted'}
                              </span>
                              <span className="text-slate-500 block text-[11px] mt-0.5">
                                At {b.stopName}
                              </span>
                            </div>
                            <span className="font-mono text-slate-600">
                              {new Date(b.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()
          )}
        </div>
      )}
    </div>
  );
}
