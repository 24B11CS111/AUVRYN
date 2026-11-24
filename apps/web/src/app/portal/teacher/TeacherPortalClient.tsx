'use client';

import React, { useState, useTransition } from 'react';
import type { TeacherPortalData } from './actions';
import { getTeacherPortalDataAction, recordTeacherAttendanceAction } from './actions';
import {
  GraduationCap,
  Users,
  CalendarCheck,
  BookOpen,
  CalendarDays,
  Clock,
  Sparkles,
  CheckCircle2,
  Megaphone,
  Check,
  Send,
  Loader2,
  BookMarked,
} from 'lucide-react';
import type { EducationType } from '@edu-platform/types';
import { PortalTopNav } from '@/components/portal/PortalTopNav';
import { PreschoolDailyCareWidget } from '@/components/portal/preschool/PreschoolDailyCareWidget';
import { UniversityCreditRegistry } from '@/components/portal/university/UniversityCreditRegistry';

interface TeacherPortalClientProps {
  initialData: TeacherPortalData;
  institutionName?: string;
  educationType?: EducationType;
  userEmail?: string;
  userName?: string;
  isPreview?: boolean;
}

export function TeacherPortalClient({
  initialData,
  institutionName = 'AUVRYN Institution',
  educationType = 'primary_school',
  userEmail = 'teacher@auvryn.edu',
  userName,
  isPreview = false,
}: TeacherPortalClientProps) {
  const [data, setData] = useState<TeacherPortalData>(initialData);
  const [activeTab, setActiveTab] = useState<'overview' | 'attendance' | 'students' | 'homework' | 'timetable' | 'ai_assistant'>('overview');
  const [selectedSectionId, setSelectedSectionId] = useState<string>(
    initialData.allocations[0]?.sectionId ?? ''
  );
  const [isPending, startTransition] = useTransition();

  // Attendance local form state
  const [attendanceDate, setAttendanceDate] = useState<string>(
    new Date().toISOString().split('T')[0] || ''
  );
  const [attendanceMap, setAttendanceMap] = useState<Record<string, 'present' | 'absent' | 'late' | 'excused'>>({});
  const [attendanceSuccess, setAttendanceSuccess] = useState<string | null>(null);
  const [isSavingAttendance, setIsSavingAttendance] = useState(false);

  // AI Assistant state
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const staff = data.staffProfile;
  const allocations = data.allocations;
  const currentAllocation = allocations.find((a) => a.sectionId === selectedSectionId) || allocations[0];

  const handleSectionChange = (sectionId: string) => {
    setSelectedSectionId(sectionId);
    startTransition(async () => {
      const res = await getTeacherPortalDataAction(sectionId);
      if (res.success && res.data) {
        setData(res.data);
      }
    });
  };

  const handleMarkAll = (status: 'present' | 'absent') => {
    const nextMap: Record<string, 'present' | 'absent' | 'late' | 'excused'> = {};
    data.activeStudents.forEach((s) => {
      nextMap[s.id] = status;
    });
    setAttendanceMap(nextMap);
  };

  const handleSaveAttendance = async () => {
    if (!selectedSectionId) return;
    setIsSavingAttendance(true);
    setAttendanceSuccess(null);

    const records = data.activeStudents.map((s) => ({
      studentId: s.id,
      status: attendanceMap[s.id] || 'present',
    }));

    const res = await recordTeacherAttendanceAction({
      sectionId: selectedSectionId,
      date: attendanceDate,
      records,
    });

    setIsSavingAttendance(false);
    if (res.success) {
      setAttendanceSuccess(`Successfully marked attendance for ${records.length} students.`);
      setTimeout(() => setAttendanceSuccess(null), 4000);
    }
  };

  const handleGenerateAiPrompt = (template: string) => {
    setAiPrompt(template);
    setIsGeneratingAi(true);
    setTimeout(() => {
      setIsGeneratingAi(false);
      setAiResponse(
        `### Generated Academic Plan: ${currentAllocation?.subjectName || 'Subject'}\n\n**Grade Level**: ${currentAllocation?.className || 'Class'}\n**Topic**: Formative Concept Reinforcement\n\n1. **Learning Objective**: Students will articulate core principles and demonstrate problem-solving through 3 structured examples.\n2. **Warm-Up (5 mins)**: Quick interactive recall query.\n3. **Guided Inquiry (25 mins)**: Step-by-step concept breakdown with visual diagrams.\n4. **Independent Practice (10 mins)**: 2 practice problems with peer review.\n5. **Formative Assessment Exit Ticket**: One diagnostic question to verify retention.`
      );
    }, 1200);
  };

  return (
    <div className="space-y-6">
      <PortalTopNav
        institutionName={institutionName}
        educationType={educationType}
        role="faculty"
        userEmail={userEmail}
        userName={userName}
        isPreview={isPreview}
      />

      {/* Teacher Profile Banner */}
      <div className="bg-[#0B1E3F] text-white p-6 rounded-2xl border border-[#142C4C] shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#2563EB] text-white tracking-wide uppercase">
                Faculty Workspace
              </span>
              <span className="text-xs text-slate-300 font-mono">
                ID: {staff?.employeeId || 'FACULTY'}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight">
              {staff?.fullName || 'Educator'}
            </h1>
            <p className="text-xs text-slate-300 flex items-center gap-2 flex-wrap">
              <span className="font-semibold text-white">{staff?.designation}</span>
              <span>&bull;</span>
              <span>{staff?.departmentName}</span>
              <span>&bull;</span>
              <span>{staff?.email}</span>
            </p>
          </div>

          {/* Allocation Selector */}
          {allocations.length > 0 && (
            <div className="bg-[#07152B] p-3 rounded-xl border border-slate-700/60 space-y-1.5 self-start sm:self-auto min-w-[220px]">
              <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                Active Section & Subject
              </label>
              <select
                value={selectedSectionId}
                onChange={(e) => handleSectionChange(e.target.value)}
                className="w-full bg-[#0B1E3F] text-white text-xs rounded-lg px-2.5 py-1.5 border border-slate-600 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              >
                {allocations.map((a) => (
                  <option key={a.id} value={a.sectionId}>
                    {a.className} - {a.sectionName} ({a.subjectName})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Quick KPI stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-700/50">
          <div className="bg-[#07152B]/70 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Assigned Classes</span>
            <span className="text-xl font-bold text-white">{allocations.length}</span>
          </div>
          <div className="bg-[#07152B]/70 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Active Students</span>
            <span className="text-xl font-bold text-white">{data.activeStudents.length}</span>
          </div>
          <div className="bg-[#07152B]/70 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Weekly Periods</span>
            <span className="text-xl font-bold text-white">{data.timetable.length}</span>
          </div>
          <div className="bg-[#07152B]/70 p-3 rounded-xl">
            <span className="text-[10px] text-slate-400 font-semibold uppercase block">Assignments</span>
            <span className="text-xl font-bold text-white">{data.homework.length}</span>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-slate-200">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'overview'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <GraduationCap className="w-4 h-4" />
          Overview
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('attendance')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'attendance'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <CalendarCheck className="w-4 h-4" />
          Attendance Marking
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('students')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'students'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users className="w-4 h-4" />
          Student Roster ({data.activeStudents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('homework')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'homework'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Homework & Tasks
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('timetable')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'timetable'
              ? 'bg-[#2563EB] text-white'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Clock className="w-4 h-4" />
          My Timetable
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('ai_assistant')}
          className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors shrink-0 flex items-center gap-1.5 ${
            activeTab === 'ai_assistant'
              ? 'bg-[#0B1E3F] text-amber-300'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-500" />
          AI Teaching Assistant
        </button>
      </div>

      {isPending && (
        <div className="flex items-center justify-center py-6 text-slate-400 gap-2 text-xs">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Refreshing section records...</span>
        </div>
      )}

      {/* TAB 1: OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {educationType === 'preschool' && (
            <PreschoolDailyCareWidget
              isTeacherView
              childName={data.activeStudents[0] ? `${data.activeStudents[0].firstName} ${data.activeStudents[0].lastName}` : 'Playgroup Child'}
              className={currentAllocation?.className || 'Preschool Class'}
            />
          )}

          {educationType === 'university' && (
            <UniversityCreditRegistry
              departmentName={staff?.departmentName || 'Collegiate Faculty'}
              degreeName="Faculty Curriculum & Degree Progress"
            />
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Today's Schedule Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-[#0B1E3F] flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#2563EB]" />
                  Today&apos;s Teaching Schedule
                </h3>
                <span className="text-[11px] text-slate-500 font-medium">
                  {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric' })}
                </span>
              </div>

              {data.timetable.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-500">
                  <CalendarDays className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No teaching periods scheduled for today.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {data.timetable.slice(0, 5).map((t) => (
                    <div key={t.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 text-[#0B1E3F] flex items-center justify-center font-bold text-xs shrink-0">
                          P{t.periodNumber}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-[#17243A]">
                            {t.subjectName}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {t.className} - {t.sectionName} {t.roomName && `\u2022 Room: ${t.roomName}`}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-1 rounded-md">
                        {t.startTime} - {t.endTime}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-3">
              <h3 className="text-sm font-bold text-[#0B1E3F]">
                Quick Pedagogical Actions
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTab('attendance')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-[#2563EB] hover:bg-slate-50 text-left transition-colors"
                >
                  <CalendarCheck className="w-5 h-5 text-[#2563EB] mb-2" />
                  <p className="text-xs font-bold text-[#0B1E3F]">Mark Attendance</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Submit daily register</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('homework')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-[#2563EB] hover:bg-slate-50 text-left transition-colors"
                >
                  <BookOpen className="w-5 h-5 text-[#2563EB] mb-2" />
                  <p className="text-xs font-bold text-[#0B1E3F]">Distribute Task</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Create homework</p>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab('ai_assistant')}
                  className="p-3 rounded-xl border border-slate-200 hover:border-[#2563EB] hover:bg-slate-50 text-left transition-colors"
                >
                  <Sparkles className="w-5 h-5 text-amber-500 mb-2" />
                  <p className="text-xs font-bold text-[#0B1E3F]">AI Lesson Planner</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Generate lesson guide</p>
                </button>
              </div>
            </div>
          </div>

          {/* Right Col: Announcements & Info */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-[#0B1E3F] uppercase tracking-wider flex items-center gap-1.5">
                  <Megaphone className="w-3.5 h-3.5 text-[#2563EB]" />
                  Staff Notices
                </h3>
              </div>

              {data.recentAnnouncements.length === 0 ? (
                <p className="text-xs text-slate-400 py-3 text-center">No institutional notices posted.</p>
              ) : (
                <div className="space-y-3">
                  {data.recentAnnouncements.map((a) => (
                    <div key={a.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                      <p className="text-xs font-bold text-[#0B1E3F]">{a.title}</p>
                      <p className="text-[11px] text-slate-600 line-clamp-2">{a.body}</p>
                      <span className="text-[10px] text-slate-400 block pt-1">
                        {new Date(a.publishedAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      )}

      {/* TAB 2: ATTENDANCE MARKING */}
      {activeTab === 'attendance' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#0B1E3F]">
                Attendance Register: {currentAllocation?.className} - {currentAllocation?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">
                Subject: <strong className="text-slate-700">{currentAllocation?.subjectName}</strong> &bull; Date: {attendanceDate}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={attendanceDate}
                onChange={(e) => setAttendanceDate(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-[#2563EB]"
              />
              <button
                type="button"
                onClick={() => handleMarkAll('present')}
                className="px-3 py-1.5 text-xs font-medium bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-colors"
              >
                Mark All Present
              </button>
              <button
                type="button"
                onClick={() => handleMarkAll('absent')}
                className="px-3 py-1.5 text-xs font-medium bg-rose-50 text-rose-700 rounded-lg border border-rose-200 hover:bg-rose-100 transition-colors"
              >
                Mark All Absent
              </button>
            </div>
          </div>

          {attendanceSuccess && (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              {attendanceSuccess}
            </div>
          )}

          {data.activeStudents.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No students enrolled in this section.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Roll</th>
                    <th className="py-2.5 px-3 font-semibold">Student Name</th>
                    <th className="py-2.5 px-3 font-semibold">Admission #</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.activeStudents.map((s) => {
                    const currentStatus = attendanceMap[s.id] || 'present';
                    return (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="py-2.5 px-3 font-mono font-medium text-slate-500">
                          {s.rollNumber || '-'}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-[#17243A]">
                          {s.firstName} {s.lastName}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-500">
                          {s.admissionNumber}
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="inline-flex rounded-lg border border-slate-200 p-0.5 bg-slate-50">
                            {(['present', 'absent', 'late', 'excused'] as const).map((status) => (
                              <button
                                key={status}
                                type="button"
                                onClick={() =>
                                  setAttendanceMap((prev) => ({ ...prev, [s.id]: status }))
                                }
                                className={`px-2 py-1 text-[11px] font-semibold rounded-md capitalize transition-colors ${
                                  currentStatus === status
                                    ? status === 'present'
                                      ? 'bg-emerald-600 text-white'
                                      : status === 'absent'
                                      ? 'bg-rose-600 text-white'
                                      : 'bg-amber-600 text-white'
                                    : 'text-slate-600 hover:text-slate-900'
                                }`}
                              >
                                {status}
                              </button>
                            ))}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              type="button"
              disabled={isSavingAttendance || data.activeStudents.length === 0}
              onClick={handleSaveAttendance}
              className="px-5 py-2.5 rounded-lg bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-xs font-bold transition-colors flex items-center gap-2 shadow-xs disabled:opacity-50"
            >
              {isSavingAttendance ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving Records...
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  Save Daily Attendance
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* TAB 3: STUDENT ROSTER */}
      {activeTab === 'students' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#0B1E3F]">
                Enrolled Students: {currentAllocation?.className} - {currentAllocation?.sectionName}
              </h2>
              <p className="text-xs text-slate-500">
                Total Enrolled: <strong className="text-slate-700">{data.activeStudents.length}</strong>
              </p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                  <th className="py-2.5 px-3 font-semibold">Roll No</th>
                  <th className="py-2.5 px-3 font-semibold">Name</th>
                  <th className="py-2.5 px-3 font-semibold">Admission #</th>
                  <th className="py-2.5 px-3 font-semibold">Class / Section</th>
                  <th className="py-2.5 px-3 font-semibold">Gender</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.activeStudents.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/60">
                    <td className="py-2.5 px-3 font-mono font-medium text-slate-500">
                      {s.rollNumber || '-'}
                    </td>
                    <td className="py-2.5 px-3 font-bold text-[#17243A]">
                      {s.firstName} {s.lastName}
                    </td>
                    <td className="py-2.5 px-3 font-mono text-slate-500">
                      {s.admissionNumber}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">
                      {s.className} - {s.sectionName}
                    </td>
                    <td className="py-2.5 px-3 capitalize text-slate-500">
                      {s.gender || 'Not specified'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: HOMEWORK */}
      {activeTab === 'homework' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#0B1E3F]">
                Homework & Assignments
              </h2>
              <p className="text-xs text-slate-500">
                Active assignments published for your classes
              </p>
            </div>
          </div>

          {data.homework.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <BookMarked className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No active assignments assigned yet.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {data.homework.map((h) => (
                <div key={h.id} className="p-4 rounded-xl border border-slate-200/80 bg-slate-50/50 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="text-sm font-bold text-[#0B1E3F]">{h.title}</h4>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                      Max {h.maxMarks} pts
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-2">{h.description}</p>
                  <div className="pt-2 border-t border-slate-200 text-[11px] text-slate-500 flex items-center justify-between">
                    <span>{h.className} - {h.sectionName} ({h.subjectName})</span>
                    <span>Due: {new Date(h.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 5: TIMETABLE */}
      {activeTab === 'timetable' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <h2 className="text-base font-bold text-[#0B1E3F]">
              Faculty Timetable Matrix
            </h2>
          </div>

          {data.timetable.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-500">
              <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p>No timetable periods allocated to your profile.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-slate-50 border-y border-slate-200 text-slate-600">
                    <th className="py-2.5 px-3 font-semibold">Day</th>
                    <th className="py-2.5 px-3 font-semibold">Period</th>
                    <th className="py-2.5 px-3 font-semibold">Time</th>
                    <th className="py-2.5 px-3 font-semibold">Class & Section</th>
                    <th className="py-2.5 px-3 font-semibold">Subject</th>
                    <th className="py-2.5 px-3 font-semibold">Room</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.timetable.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50/60">
                      <td className="py-2.5 px-3 font-bold text-[#0B1E3F] capitalize">
                        {t.dayOfWeek}
                      </td>
                      <td className="py-2.5 px-3 font-semibold">Period {t.periodNumber}</td>
                      <td className="py-2.5 px-3 font-mono text-slate-500">
                        {t.startTime} - {t.endTime}
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-700">
                        {t.className} - {t.sectionName}
                      </td>
                      <td className="py-2.5 px-3 text-[#2563EB] font-semibold">
                        {t.subjectName}
                      </td>
                      <td className="py-2.5 px-3 text-slate-500">
                        {t.roomName || 'Classroom'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 6: AI TEACHER ASSISTANT */}
      {activeTab === 'ai_assistant' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-xs space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-200">
            <div>
              <h2 className="text-base font-bold text-[#0B1E3F] flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-500" />
                AUVRYN AI Teaching Assistant
              </h2>
              <p className="text-xs text-slate-500">
                Pedagogical copilot for lesson plans, assessment questions, and differentiated instructional materials
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => handleGenerateAiPrompt('Generate a 40-minute interactive lesson plan with formative exit ticket')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition-colors"
            >
              📝 40-Min Lesson Plan
            </button>
            <button
              type="button"
              onClick={() => handleGenerateAiPrompt('Create 5 formative multiple-choice questions with answer keys & misconceptions')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition-colors"
            >
              🎯 5-Question Quiz Generator
            </button>
            <button
              type="button"
              onClick={() => handleGenerateAiPrompt('Draft a concise, encouraging parent update message regarding classroom progress')}
              className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-xs text-slate-700 font-medium transition-colors"
            >
              ✉️ Parent Progress Message
            </button>
          </div>

          <div className="space-y-2">
            <textarea
              rows={3}
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Ask the AI teaching assistant to design a quiz, formulate a rubric, or draft explanatory examples..."
              className="w-full text-xs p-3 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
            <div className="flex justify-end">
              <button
                type="button"
                disabled={isGeneratingAi || !aiPrompt.trim()}
                onClick={() => handleGenerateAiPrompt(aiPrompt)}
                className="px-4 py-2 rounded-lg bg-[#0B1E3F] hover:bg-[#07152B] text-white text-xs font-bold transition-colors flex items-center gap-1.5 disabled:opacity-50"
              >
                {isGeneratingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Run AI Copilot
                  </>
                )}
              </button>
            </div>
          </div>

          {aiResponse && (
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#2563EB]">
                AI Copilot Output
              </span>
              <div className="text-xs text-slate-800 whitespace-pre-line leading-relaxed font-mono">
                {aiResponse}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
