'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  CalendarCheck,
  CheckCircle2,
  UserX,
  Search,
  Check,
  ArrowLeft,
  AlertTriangle,
  Loader2,
  Filter,
} from 'lucide-react';
import {
  getStudentsForMarkingAction,
  recordStudentAttendanceAction,
} from '../actions';
import type { AttendanceStatus, AttendanceSessionType } from '@edu-platform/types';

interface AttendanceMarkingClientProps {
  institution: {
    id: string;
    name: string;
    type: string;
  };
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  classes: Array<{ id: string; name: string }>;
  sections: Array<{ id: string; name: string; classId: string }>;
  subjects: Array<{ id: string; name: string; code: string }>;
  todayDate: string;
  defaultStaffId?: string | null;
}

interface StudentMarkRow {
  studentId: string;
  enrollmentId?: string;
  admissionNumber: string;
  fullName: string;
  rollNumber: string;
  gender: string;
  photoUrl?: string;
  approvedLeave?: { leaveType: string; reason: string } | null;
  status: AttendanceStatus;
  remarks: string;
  isExcused: boolean;
}

export function AttendanceMarkingClient({
  institution,
  academicYears,
  classes,
  sections,
  subjects,
  todayDate,
  defaultStaffId,
}: AttendanceMarkingClientProps) {
  const isCollege = institution.type !== 'school' && institution.type !== 'junior_college';

  // Selection state
  const defaultYear = academicYears.find((y) => y.isCurrent)?.id || academicYears[0]?.id || '';
  const [selectedYearId, setSelectedYearId] = useState(defaultYear);
  const [selectedClassId, setSelectedClassId] = useState(classes[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState('');
  const [selectedSubjectId, setSelectedSubjectId] = useState('');
  const [selectedDate, setSelectedDate] = useState(todayDate);
  const [sessionType, setSessionType] = useState<AttendanceSessionType>('daily');
  const [periodNumber, setPeriodNumber] = useState<string>('');
  const [topicCovered, setTopicCovered] = useState<string>('');

  // Roster & Marking state
  const [roster, setRoster] = useState<StudentMarkRow[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [existingSession, setExistingSession] = useState<any | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const [isLoadingRoster, startLoadingRoster] = useTransition();
  const [isSubmitting, startSubmitting] = useTransition();

  // Filter sections by selected class
  const classSections = sections.filter((s) => s.classId === selectedClassId);

  // Load roster
  const handleLoadRoster = () => {
    if (!selectedClassId) {
      setFeedback({ type: 'error', message: 'Please select a class.' });
      return;
    }
    setFeedback(null);
    startLoadingRoster(async () => {
      const res = await getStudentsForMarkingAction(
        selectedClassId,
        selectedSectionId || null,
        selectedYearId || null,
        selectedDate
      );

      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.error || 'Failed to load students.' });
        return;
      }

      setExistingSession(res.data.existingSession);

      const mapped: StudentMarkRow[] = res.data.students.map((st: any) => ({
        studentId: st.studentId,
        enrollmentId: st.enrollmentId,
        admissionNumber: st.admissionNumber,
        fullName: st.fullName,
        rollNumber: st.rollNumber,
        gender: st.gender,
        photoUrl: st.photoUrl,
        approvedLeave: st.approvedLeave,
        // If student is on approved leave, default to on_leave
        status: st.approvedLeave ? 'on_leave' : 'present',
        remarks: st.approvedLeave ? `Leave: ${st.approvedLeave.leaveType}` : '',
        isExcused: !!st.approvedLeave,
      }));

      setRoster(mapped);
    });
  };

  // Bulk actions
  const handleMarkAll = (status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((r) => {
        // Keep approved leave status intact
        if (r.approvedLeave && status === 'present') return r;
        return {
          ...r,
          status,
          isExcused: status === 'excused' || status === 'on_leave',
        };
      })
    );
  };

  // Individual status toggle
  const handleStatusChange = (studentId: string, status: AttendanceStatus) => {
    setRoster((prev) =>
      prev.map((r) => {
        if (r.studentId !== studentId) return r;
        return {
          ...r,
          status,
          isExcused: status === 'excused' || status === 'on_leave',
        };
      })
    );
  };

  // Summary counts
  const countPresent = roster.filter((r) => r.status === 'present').length;
  const countAbsent = roster.filter((r) => r.status === 'absent').length;
  const countLate = roster.filter((r) => r.status === 'late').length;
  const countHalfDay = roster.filter((r) => r.status === 'half_day').length;
  const countExcused = roster.filter((r) => r.status === 'excused' || r.status === 'on_leave').length;

  // Filter roster by search
  const filteredRoster = roster.filter((r) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      r.fullName.toLowerCase().includes(q) ||
      r.admissionNumber.toLowerCase().includes(q) ||
      r.rollNumber.toLowerCase().includes(q)
    );
  });

  // Submit attendance
  const handleSubmitAttendance = () => {
    if (roster.length === 0) return;
    setFeedback(null);
    setShowConfirmModal(false);

    startSubmitting(async () => {
      const res = await recordStudentAttendanceAction({
        session: {
          academicYearId: selectedYearId,
          classId: selectedClassId,
          sectionId: selectedSectionId || undefined,
          subjectId: selectedSubjectId || undefined,
          sessionDate: selectedDate,
          sessionType,
          periodNumber: periodNumber ? parseInt(periodNumber, 10) : undefined,
          topicCovered: topicCovered || undefined,
          markedByStaffId: defaultStaffId || undefined,
        },
        records: roster.map((r) => ({
          studentId: r.studentId,
          enrollmentId: r.enrollmentId || undefined,
          status: r.status,
          remarks: r.remarks || undefined,
          isExcused: r.isExcused,
        })),
      });

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to submit attendance.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Attendance recorded successfully for ${roster.length} students!`,
      });
      // Refresh session state
      setExistingSession({ id: res.data?.sessionId, status: 'submitted' });
    });
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/attendance" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Mark Attendance</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Teacher attendance console with instant roll calls, mobile touch controls, and duplicate prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/attendance/students">
            <Button variant="outline" size="sm" className="text-xs">
              View Registers
            </Button>
          </Link>
        </div>
      </div>

      {/* Feedback Messages */}
      {feedback && (
        <div
          className={`p-4 rounded-lg flex items-center justify-between text-sm ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-rose-600" />
            )}
            <span>{feedback.message}</span>
          </div>
          <button
            onClick={() => setFeedback(null)}
            className="text-xs text-slate-400 hover:text-slate-600 font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Session Selection Panel */}
      <Card className="border-slate-200 shadow-xs">
        <CardHeader className="pb-3 border-b border-slate-100">
          <CardTitle className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Filter className="h-4 w-4 text-slate-500" />
            <span>Attendance Session Context</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            {/* Academic Year */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Academic Year</label>
              <select
                value={selectedYearId}
                onChange={(e) => setSelectedYearId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Picker */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Session Date</label>
              <Input
                type="date"
                max={todayDate}
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="text-sm bg-white"
              />
            </div>

            {/* Class */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Class / Grade *</label>
              <select
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId('');
                }}
                className="w-full text-sm border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Section */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Section / Division</label>
              <select
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="w-full text-sm border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Sections</option>
                {classSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>

            {/* College / University Extra Fields */}
            {isCollege && (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Subject / Course</label>
                  <select
                    value={selectedSubjectId}
                    onChange={(e) => setSelectedSubjectId(e.target.value)}
                    className="w-full text-sm border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">General Daily Attendance</option>
                    {subjects.map((sub) => (
                      <option key={sub.id} value={sub.id}>
                        {sub.code} - {sub.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Session Type</label>
                  <select
                    value={sessionType}
                    onChange={(e) => setSessionType(e.target.value as AttendanceSessionType)}
                    className="w-full text-sm border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="daily">Daily Attendance</option>
                    <option value="lecture">Lecture</option>
                    <option value="lab">Lab Practical</option>
                    <option value="practical">Practical Session</option>
                    <option value="tutorial">Tutorial</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Period # (Optional)</label>
                  <Input
                    type="number"
                    min={1}
                    max={12}
                    placeholder="e.g. 1"
                    value={periodNumber}
                    onChange={(e) => setPeriodNumber(e.target.value)}
                    className="text-sm bg-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Topic Covered (Optional)</label>
                  <Input
                    type="text"
                    placeholder="e.g. Thermodynamics Chapter 3"
                    value={topicCovered}
                    onChange={(e) => setTopicCovered(e.target.value)}
                    className="text-sm bg-white"
                  />
                </div>
              </>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {existingSession ? (
                <span className="text-amber-600 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3.5 w-3.5 inline" /> An attendance session already exists for this date.
                </span>
              ) : (
                'Select class and date to pull up the active student roll call.'
              )}
            </p>

            <Button
              onClick={handleLoadRoster}
              disabled={isLoadingRoster || !selectedClassId}
              className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5"
            >
              {isLoadingRoster ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Loading Students...</span>
                </>
              ) : (
                <>
                  <CalendarCheck className="h-4 w-4" />
                  <span>Load Student Roster</span>
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Roster Marking Interface */}
      {roster.length > 0 && (
        <div className="space-y-4">
          {/* Quick Action & Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkAll('present')}
                className="bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border-emerald-200 text-xs font-medium"
              >
                <Check className="h-3.5 w-3.5 mr-1" /> Mark All Present
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleMarkAll('absent')}
                className="bg-rose-50 text-rose-700 hover:bg-rose-100 border-rose-200 text-xs font-medium"
              >
                <UserX className="h-3.5 w-3.5 mr-1" /> Mark All Absent
              </Button>
            </div>

            <div className="flex items-center gap-3">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Filter student or roll #..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs bg-slate-50"
                />
              </div>

              <div className="flex items-center gap-2 text-xs font-medium bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                <span className="text-emerald-700">P: {countPresent}</span>
                <span className="text-slate-300">|</span>
                <span className="text-rose-700">A: {countAbsent}</span>
                <span className="text-slate-300">|</span>
                <span className="text-amber-700">L: {countLate}</span>
                <span className="text-slate-300">|</span>
                <span className="text-purple-700">H: {countHalfDay}</span>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600">E: {countExcused}</span>
              </div>
            </div>
          </div>

          {/* Student Roster Cards / Table (Mobile-friendly) */}
          <div className="space-y-2">
            {filteredRoster.map((student, idx) => {
              return (
                <div
                  key={student.studentId}
                  className={`p-3.5 sm:p-4 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    student.status === 'present'
                      ? 'bg-white border-slate-200'
                      : student.status === 'absent'
                      ? 'bg-rose-50/50 border-rose-200'
                      : student.status === 'late'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-purple-50/40 border-purple-200'
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-xs text-slate-700 shrink-0">
                      {student.rollNumber || idx + 1}
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-900">{student.fullName}</span>
                        <span className="text-xs text-slate-500 font-mono">({student.admissionNumber})</span>
                        {student.approvedLeave && (
                          <Badge variant="outline" className="text-xs bg-amber-50 text-amber-800 border-amber-200">
                            Approved Leave ({student.approvedLeave.leaveType})
                          </Badge>
                        )}
                      </div>
                      {student.remarks && (
                        <p className="text-xs text-slate-500 italic mt-0.5">{student.remarks}</p>
                      )}
                    </div>
                  </div>

                  {/* Right: Touch-Friendly Status Buttons */}
                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {/* Present Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'present')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[36px] ${
                        student.status === 'present'
                          ? 'bg-emerald-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-emerald-50 hover:text-emerald-700'
                      }`}
                    >
                      Present
                    </button>

                    {/* Absent Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'absent')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[36px] ${
                        student.status === 'absent'
                          ? 'bg-rose-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-rose-50 hover:text-rose-700'
                      }`}
                    >
                      Absent
                    </button>

                    {/* Late Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'late')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all min-w-[36px] ${
                        student.status === 'late'
                          ? 'bg-amber-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-amber-50 hover:text-amber-700'
                      }`}
                    >
                      Late
                    </button>

                    {/* Half Day Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'half_day')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        student.status === 'half_day'
                          ? 'bg-purple-600 text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-purple-50 hover:text-purple-700'
                      }`}
                    >
                      Half Day
                    </button>

                    {/* Excused Button */}
                    <button
                      type="button"
                      onClick={() => handleStatusChange(student.studentId, 'excused')}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        student.status === 'excused' || student.status === 'on_leave'
                          ? 'bg-slate-800 text-white shadow-xs scale-105'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Excused
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Sticky Bottom Action Bar */}
          <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 py-3.5 px-4 sm:px-8 shadow-lg">
            <div className="max-w-7xl mx-auto flex items-center justify-between">
              <div className="text-xs text-slate-600 hidden sm:block">
                <span>Roster: <strong>{roster.length}</strong> students</span> &bull;{' '}
                <span className="text-emerald-600 font-semibold">{countPresent} Present</span> &bull;{' '}
                <span className="text-rose-600 font-semibold">{countAbsent} Absent</span>
                {countLate > 0 && <span> &bull; <span className="text-amber-600 font-semibold">{countLate} Late</span></span>}
              </div>

              <div className="flex items-center gap-3 ml-auto">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setRoster([])}
                  className="text-xs"
                >
                  Discard
                </Button>

                <Button
                  onClick={() => setShowConfirmModal(true)}
                  disabled={isSubmitting}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm px-5 flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      <span>Submit Attendance ({countPresent} Present)</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-slate-200 animate-in fade-in-50 zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <CalendarCheck className="h-5 w-5 text-indigo-600" />
                <span>Confirm Attendance Submission</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <p className="text-sm text-slate-600">
                You are about to submit the attendance register for date <strong>{selectedDate}</strong>:
              </p>

              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1.5 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Total Enrolled:</span>
                  <span className="font-semibold text-slate-900">{roster.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-emerald-700">Present:</span>
                  <span className="font-bold text-emerald-700">{countPresent}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rose-700">Absent:</span>
                  <span className="font-bold text-rose-700">{countAbsent}</span>
                </div>
                {countLate > 0 && (
                  <div className="flex justify-between">
                    <span className="text-amber-700">Late:</span>
                    <span className="font-bold text-amber-700">{countLate}</span>
                  </div>
                )}
                {countExcused > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Excused / On Leave:</span>
                    <span className="font-semibold text-slate-800">{countExcused}</span>
                  </div>
                )}
              </div>

              {countAbsent > 0 && (
                <p className="text-xs text-slate-500 italic">
                  Note: Absent and late arrival events will automatically be queued for authorized primary guardians.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowConfirmModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSubmitAttendance}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Confirm & Submit
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
