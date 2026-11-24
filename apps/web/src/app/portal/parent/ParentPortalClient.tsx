'use client';

import React, { useState, useTransition, useEffect } from 'react';
import Link from 'next/link';
import type { ParentPortalData } from './actions';
import {
  getParentPortalDataAction,
  getParentStudentIdentityAndConsentsAction,
  updateParentEmergencyContactsAction,
  withdrawParentConsentAction,
  requestStudentCorrectionAction,
} from './actions';
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
  Lock,
  Phone,
  CheckCircle2,
  Edit3,
} from 'lucide-react';
import type { EducationType } from '@edu-platform/types';
import { TransportMap } from '@/components/transport/TransportMap';
import { ParentAICompanionView } from '@/components/ai/ParentAICompanionView';
import { useAuvrynRealtime } from '@/lib/realtime/useAuvrynRealtime';
import { RealtimeStatusIndicator } from '@/components/realtime/RealtimeStatusIndicator';
import { PortalTopNav } from '@/components/portal/PortalTopNav';
import { PreschoolDailyCareWidget } from '@/components/portal/preschool/PreschoolDailyCareWidget';

interface ParentPortalClientProps {
  initialData: ParentPortalData;
  institutionName?: string;
  educationType?: EducationType;
  userEmail?: string;
  userName?: string;
  isPreview?: boolean;
}

export function ParentPortalClient({
  initialData,
  institutionName = 'AUVRYN Institution',
  educationType = 'primary_school',
  userEmail = 'parent@auvryn.edu',
  userName,
  isPreview = false,
}: ParentPortalClientProps) {
  const [data, setData] = useState<ParentPortalData>(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'ai_companion' | 'attendance' | 'results' | 'timetable' | 'fees' | 'homework' | 'leave' | 'transport' | 'identity_consent'>('overview');
  const [isPending, startTransition] = useTransition();

  // Identity & Consents state
  const [studentIdentityData, setStudentIdentityData] = useState<{
    identityDocuments: any[];
    emergencyContacts: any[];
    consents: any[];
  } | null>(null);
  const [isEmergencyModalOpen, setIsEmergencyModalOpen] = useState(false);
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState(false);
  const [correctionField, setCorrectionField] = useState('address');
  const [correctionProposedVal, setCorrectionProposedVal] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [portalActionMsg, setPortalActionMsg] = useState<string | null>(null);

  // Emergency contact edit state
  const [editPrimaryName, setEditPrimaryName] = useState('');
  const [editPrimaryPhone, setEditPrimaryPhone] = useState('');
  const [editPrimaryRel, setEditPrimaryRel] = useState('Father');

  const fetchIdentityAndConsents = async (studentId: string) => {
    try {
      const res = await getParentStudentIdentityAndConsentsAction(studentId);
      if (res.success && res.data) {
        setStudentIdentityData(res.data);
        const prim = res.data.emergencyContacts.find((c: any) => c.priority === 'primary');
        if (prim) {
          setEditPrimaryName(prim.name);
          setEditPrimaryPhone(prim.phone_primary);
          setEditPrimaryRel(prim.relationship);
        }
      }
    } catch {
      // ignore
    }
  };

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

  useEffect(() => {
    if (data.selectedChildId) {
      fetchIdentityAndConsents(data.selectedChildId);
    }
  }, [data.selectedChildId]);

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
      <PortalTopNav
        institutionName={institutionName}
        educationType={educationType}
        role="parent"
        userEmail={userEmail}
        userName={userName}
        isPreview={isPreview}
      />

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
          { key: 'identity_consent', label: 'Identity & Consents', icon: ShieldCheck },
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
        <div className="space-y-6">
          {educationType === 'preschool' && (
            <PreschoolDailyCareWidget
              childName={activeChild ? `${activeChild.firstName} ${activeChild.lastName}` : 'Child'}
              className={activeChild?.className || 'Preschool Class'}
            />
          )}

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

      {/* IDENTITY & CONSENTS TAB */}
      {activeTab === 'identity_consent' && (
        <div className="space-y-6">
          {portalActionMsg && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50 text-xs text-emerald-800 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              <span>{portalActionMsg}</span>
            </div>
          )}

          {/* Student Identity & Document Card */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900">Verified Student Identity & Enrollment</h2>
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                    Active Enrollment
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Institution-scoped admission record and verified document references.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 self-start sm:self-auto"
              >
                <Edit3 className="w-3.5 h-3.5" />
                Request Record Correction
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Student Legal Name</span>
                <span className="font-bold text-slate-800">{activeChild?.firstName} {activeChild?.lastName}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Admission Number</span>
                <span className="font-mono font-bold text-blue-700">{activeChild?.admissionNumber}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Class & Cohort</span>
                <span className="font-semibold text-slate-800">{activeChild?.className || 'Class N/A'}</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-medium">Roll Number</span>
                <span className="font-medium text-slate-800">{activeChild?.rollNumber || 'Unassigned'}</span>
              </div>
            </div>

            {/* Verified Identity Documents List */}
            <div className="pt-4 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
                Verified Identity Documents
              </span>

              {(!studentIdentityData?.identityDocuments || studentIdentityData.identityDocuments.length === 0) ? (
                <div className="p-3 rounded-xl border border-slate-100 bg-slate-50 text-xs text-slate-500">
                  Identity documents registered during institutional admission.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {studentIdentityData.identityDocuments.map((doc: any) => (
                    <div
                      key={doc.id}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/70 flex items-center justify-between text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-slate-800 capitalize">
                            {doc.document_type.replace('_', ' ')}
                          </span>
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            doc.verification_status === 'verified' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {doc.verification_status}
                          </span>
                        </div>
                        <span className="text-slate-500 block text-[11px] font-mono mt-0.5">
                          Masked Ref: {doc.masked_reference}
                        </span>
                      </div>
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-3 rounded-xl bg-blue-50/60 border border-blue-200 flex items-start gap-2.5 text-xs text-blue-900">
                <Lock className="w-4 h-4 text-blue-700 mt-0.5 flex-shrink-0" />
                <p>
                  <strong>Legal Privacy Compliance:</strong> In accordance with UIDAI regulations and the Digital Personal Data Protection (DPDP) Act, raw unmasked 12-digit Aadhaar numbers are never stored in AUVRYN systems. Only audited masked tokens and encrypted files are retained.
                </p>
              </div>
            </div>
          </div>

          {/* Emergency Contacts & Authorized Pickups */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900">Emergency Contacts & Authorized Pickups</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Designated family members and guardians authorized for immediate contact and dismissal.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center gap-1.5"
              >
                <Phone className="w-3.5 h-3.5" />
                Update Emergency Contacts
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!studentIdentityData?.emergencyContacts || studentIdentityData.emergencyContacts.length === 0) ? (
                <div className="p-4 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 col-span-2 text-center">
                  No separate emergency records found. Click &quot;Update Emergency Contacts&quot; to register primary contact.
                </div>
              ) : (
                studentIdentityData.emergencyContacts.map((contact: any) => (
                  <div
                    key={contact.id}
                    className={`p-4 rounded-xl border text-xs space-y-1.5 ${
                      contact.priority === 'primary'
                        ? 'border-rose-200 bg-rose-50/30'
                        : 'border-slate-200 bg-slate-50/50'
                    }`}
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-bold text-slate-900">{contact.name}</span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        contact.priority === 'primary' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-700'
                      }`}>
                        {contact.priority}
                      </span>
                    </div>
                    <p className="text-slate-600">Relationship: <strong>{contact.relationship}</strong></p>
                    <p className="text-slate-600">Phone: <strong>{contact.phone_primary}</strong></p>
                    {contact.is_authorized_pickup && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                        Authorized Pickup
                      </span>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Consent Management (DPDP Act Compliance) */}
          <div className="p-6 rounded-2xl border border-slate-200 bg-white shadow-xs space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h2 className="text-base font-bold text-slate-900">Consent Management & Data Rights</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Under the DPDP Act, you have the right to review and withdraw optional consents at any time.
              </p>
            </div>

            <div className="space-y-3">
              {(!studentIdentityData?.consents || studentIdentityData.consents.length === 0) ? (
                <p className="text-xs text-slate-500 italic py-2">Consent records recorded during online admission.</p>
              ) : (
                studentIdentityData.consents.map((cr: any) => (
                  <div
                    key={cr.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 uppercase">
                          {cr.consent_type.replace(/_/g, ' ')}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          cr.granted && !cr.withdrawn ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                        }`}>
                          {cr.withdrawn ? 'Withdrawn' : cr.granted ? 'Active Consent' : 'Not Granted'}
                        </span>
                      </div>
                      <p className="text-slate-500 text-[11px]">
                        Granted by {cr.granted_by_name} ({cr.granted_by_relationship}) • Version {cr.consent_version}
                      </p>
                      {cr.withdrawn && (
                        <p className="text-rose-600 text-[11px]">
                          Consent was withdrawn on {new Date(cr.withdrawn_at).toLocaleDateString()}
                        </p>
                      )}
                    </div>

                    {/* Allow withdrawal for optional media or communication consent */}
                    {(cr.consent_type === 'photo_media_publication' || cr.consent_type === 'non_essential_communications') && cr.granted && !cr.withdrawn && (
                      <button
                        type="button"
                        onClick={async () => {
                          if (!data.selectedChildId) return;
                          const res = await withdrawParentConsentAction(data.selectedChildId, cr.consent_type, 'Parent revoked via portal');
                          if (res.success) {
                            setPortalActionMsg('Optional consent successfully withdrawn.');
                            fetchIdentityAndConsents(data.selectedChildId);
                          }
                        }}
                        className="px-3 py-1.5 rounded-lg border border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800 font-semibold text-xs whitespace-nowrap self-start sm:self-auto"
                      >
                        Withdraw Consent
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Update Emergency Contacts */}
      {isEmergencyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Update Emergency Contact</h3>
            <p className="text-slate-500">
              Provide updated primary emergency responder information for school records.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Full Legal Name *</label>
                <input
                  type="text"
                  value={editPrimaryName}
                  onChange={(e) => setEditPrimaryName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Contact Name"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Relationship to Student *</label>
                <input
                  type="text"
                  value={editPrimaryRel}
                  onChange={(e) => setEditPrimaryRel(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="e.g. Father / Mother / Guardian"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Primary Phone Number *</label>
                <input
                  type="text"
                  value={editPrimaryPhone}
                  onChange={(e) => setEditPrimaryPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="10-digit mobile"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsEmergencyModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!data.selectedChildId || !editPrimaryName.trim() || !editPrimaryPhone.trim()) return;
                  const res = await updateParentEmergencyContactsAction(
                    data.selectedChildId,
                    {
                      name: editPrimaryName,
                      relationship: editPrimaryRel,
                      phonePrimary: editPrimaryPhone,
                    }
                  );
                  if (res.success) {
                    setPortalActionMsg('Emergency contacts updated successfully.');
                    setIsEmergencyModalOpen(false);
                    fetchIdentityAndConsents(data.selectedChildId);
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Save Contacts
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Request Correction */}
      {isCorrectionModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 text-xs">
            <h3 className="text-base font-bold text-slate-900">Request Record Correction</h3>
            <p className="text-slate-500">
              Parents cannot directly alter verified academic records. Submit a correction request with reason for administrative verification.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-semibold mb-1">Field to Correct</label>
                <select
                  value={correctionField}
                  onChange={(e) => setCorrectionField(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                >
                  <option value="address">Residential Address</option>
                  <option value="phone">Guardian Phone Number</option>
                  <option value="email">Guardian Email</option>
                  <option value="student_name_spelling">Student Name Spelling</option>
                  <option value="blood_group">Blood Group</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Proposed Correct Value *</label>
                <input
                  type="text"
                  value={correctionProposedVal}
                  onChange={(e) => setCorrectionProposedVal(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="New value"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-semibold mb-1">Reason for Correction *</label>
                <textarea
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                  placeholder="Describe why this correction is needed and attach supporting document reference"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsCorrectionModalOpen(false)}
                className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (!data.selectedChildId || !correctionProposedVal.trim() || !correctionReason.trim()) return;
                  const res = await requestStudentCorrectionAction(
                    data.selectedChildId,
                    correctionField,
                    correctionProposedVal,
                    correctionReason
                  );
                  if (res.success) {
                    setPortalActionMsg('Correction request submitted for administrative review.');
                    setIsCorrectionModalOpen(false);
                    setCorrectionProposedVal('');
                    setCorrectionReason('');
                  }
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium"
              >
                Submit Request
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
