'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import {
  CalendarCheck,
  Search,
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Loader2,
  History,
  ArrowLeft,
  X,
} from 'lucide-react';
import { correctStudentAttendanceAction } from '../actions';
import type { AttendanceStatus } from '@edu-platform/types';

interface StudentAttendanceClientProps {
  institution: {
    id: string;
    name: string;
  };
  initialRecords: any[];
  classes: Array<{ id: string; name: string }>;
  canCorrect: boolean;
  selectedDateDefault: string;
}

export function StudentAttendanceClient({
  initialRecords,
  classes,
  canCorrect,
  selectedDateDefault,
}: StudentAttendanceClientProps) {
  const [records, setRecords] = useState(initialRecords);
  const [searchQuery, setSearchQuery] = useState('');
  const [classFilter, setClassFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState(selectedDateDefault);

  // Correction Modal state
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [newStatus, setNewStatus] = useState<AttendanceStatus>('present');
  const [correctionReason, setCorrectionReason] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSubmittingCorrection, startCorrection] = useTransition();

  const handleOpenCorrection = (record: any) => {
    setEditingRecord(record);
    setNewStatus(record.status);
    setCorrectionReason('');
    setFeedback(null);
  };

  const handleSaveCorrection = () => {
    if (!editingRecord) return;
    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'Correction reason must be at least 3 characters.' });
      return;
    }

    startCorrection(async () => {
      const res = await correctStudentAttendanceAction({
        recordId: editingRecord.id,
        newStatus,
        reason: correctionReason.trim(),
      });

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to correct attendance.' });
        return;
      }

      setRecords((prev) =>
        prev.map((r) =>
          r.id === editingRecord.id ? { ...r, status: newStatus } : r
        )
      );

      setEditingRecord(null);
      setFeedback({
        type: 'success',
        message: 'Attendance record updated and audit history logged.',
      });
    });
  };

  // Filter records
  const filteredRecords = records.filter((r) => {
    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const stName = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.toLowerCase();
      const adm = (r.student?.admission_number || '').toLowerCase();
      if (!stName.includes(q) && !adm.includes(q)) return false;
    }
    // Class
    if (classFilter && r.session?.class_id !== classFilter) return false;
    // Status
    if (statusFilter && r.status !== statusFilter) return false;
    // Date
    if (dateFilter && r.session?.session_date !== dateFilter) return false;

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/attendance" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Student Attendance Registers</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Browse submitted roll calls, verify attendance status, and log authorized corrections with full audit trails.
          </p>
        </div>

        <Link href="/dashboard/attendance/mark">
          <Button className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm text-xs">
            <CalendarCheck className="h-4 w-4" />
            <span>Mark New Attendance</span>
          </Button>
        </Link>
      </div>

      {/* Global Feedback */}
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

      {/* Filter Toolbar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                type="text"
                placeholder="Search student or admission #..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 text-xs bg-slate-50"
              />
            </div>

            {/* Date */}
            <div>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="text-xs bg-slate-50"
              />
            </div>

            {/* Class */}
            <div>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 bg-slate-50 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-md p-2 bg-slate-50 focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Statuses</option>
                <option value="present">Present</option>
                <option value="absent">Absent</option>
                <option value="late">Late</option>
                <option value="half_day">Half Day</option>
                <option value="excused">Excused</option>
                <option value="on_leave">On Leave</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Attendance Records List */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Attendance Entries ({filteredRecords.length})
          </CardTitle>
          {dateFilter && (
            <button
              onClick={() => setDateFilter('')}
              className="text-xs text-indigo-600 hover:text-indigo-800"
            >
              Clear Date Filter
            </button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <CalendarCheck className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p>No student attendance records matching filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 pl-4">Date</th>
                    <th className="p-3">Student Name</th>
                    <th className="p-3">Admission #</th>
                    <th className="p-3">Class & Section</th>
                    <th className="p-3">Subject / Type</th>
                    <th className="p-3 text-center">Status</th>
                    <th className="p-3">Remarks</th>
                    {canCorrect && <th className="p-3 text-right pr-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRecords.map((r: any) => {
                    const st = r.student;
                    const sess = r.session;
                    return (
                      <tr key={r.id} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 pl-4 font-medium text-slate-900 whitespace-nowrap">
                          {sess?.session_date || 'N/A'}
                        </td>
                        <td className="p-3 font-semibold text-slate-900">
                          {st?.first_name} {st?.last_name}
                        </td>
                        <td className="p-3 text-slate-500 font-mono">
                          {st?.admission_number || 'N/A'}
                        </td>
                        <td className="p-3 text-slate-700 whitespace-nowrap">
                          {sess?.class?.name} {sess?.section?.name ? `- ${sess.section.name}` : ''}
                        </td>
                        <td className="p-3 text-slate-600">
                          {sess?.subject?.name || <span className="capitalize">{sess?.session_type}</span>}
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold text-[11px] capitalize ${
                              r.status === 'present'
                                ? 'bg-emerald-100 text-emerald-800'
                                : r.status === 'absent'
                                ? 'bg-rose-100 text-rose-800'
                                : r.status === 'late'
                                ? 'bg-amber-100 text-amber-800'
                                : r.status === 'half_day'
                                ? 'bg-purple-100 text-purple-800'
                                : 'bg-slate-100 text-slate-800'
                            }`}
                          >
                            {r.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 max-w-xs truncate">
                          {r.remarks || '-'}
                        </td>
                        {canCorrect && (
                          <td className="p-3 text-right pr-4">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenCorrection(r)}
                              className="h-7 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-auto"
                            >
                              <Edit2 className="h-3 w-3" />
                              <span>Correct</span>
                            </Button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Manual Correction Modal */}
      {editingRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-slate-200 animate-in fade-in-50 zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <span>Authorized Attendance Correction</span>
              </CardTitle>
              <button
                onClick={() => setEditingRecord(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p>
                  <strong className="text-slate-700">Student:</strong>{' '}
                  {editingRecord.student?.first_name} {editingRecord.student?.last_name} (
                  {editingRecord.student?.admission_number})
                </p>
                <p>
                  <strong className="text-slate-700">Date:</strong> {editingRecord.session?.session_date}
                </p>
                <p>
                  <strong className="text-slate-700">Current Status:</strong>{' '}
                  <span className="capitalize font-semibold">{editingRecord.status}</span>
                </p>
              </div>

              {/* New Status Picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Status *
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as AttendanceStatus)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                  <option value="excused">Excused</option>
                  <option value="on_leave">On Leave</option>
                </select>
              </div>

              {/* Mandatory Reason */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Correction (Audited) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this status is being amended (e.g. Medical certificate provided, bus delayed)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-indigo-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  This reason is permanently preserved in the attendance audit log and cannot be deleted.
                </p>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingRecord(null)}
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveCorrection}
                  disabled={isSubmittingCorrection}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  {isSubmittingCorrection ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                      Saving...
                    </>
                  ) : (
                    'Record Correction'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
