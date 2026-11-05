'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Building,
  CheckCircle2,
  AlertTriangle,
  Search,
  Save,
  Loader2,
  ArrowLeft,
  X,
  History,
} from 'lucide-react';
import {
  getStaffAttendanceRosterAction,
  recordStaffAttendanceBatchAction,
  correctStaffAttendanceAction,
} from '../actions';
import type { StaffAttendanceStatus } from '@edu-platform/types';

interface StaffAttendanceClientProps {
  departments: Array<{ id: string; name: string }>;
  initialRoster: any[];
  initialDate: string;
  canManage: boolean;
}

interface StaffMarkRow {
  staffId: string;
  employeeId: string;
  fullName: string;
  designation: string;
  category: string;
  departmentName: string;
  photoUrl?: string;
  recordId?: string | null;
  status: StaffAttendanceStatus;
  checkInTime: string;
  checkOutTime: string;
  remarks: string;
  approvedLeave?: { leaveType: string; reason: string } | null;
}

export function StaffAttendanceClient({
  departments,
  initialRoster,
  initialDate,
  canManage,
}: StaffAttendanceClientProps) {
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [roster, setRoster] = useState<StaffMarkRow[]>(initialRoster);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Correction state
  const [editingStaff, setEditingStaff] = useState<StaffMarkRow | null>(null);
  const [newStatus, setNewStatus] = useState<StaffAttendanceStatus>('present');
  const [correctionReason, setCorrectionReason] = useState('');

  const [isLoading, startLoading] = useTransition();
  const [isSaving, startSaving] = useTransition();

  // Load roster when date or department filter changes
  const handleFetchRoster = (date: string, dept: string) => {
    setFeedback(null);
    startLoading(async () => {
      const res = await getStaffAttendanceRosterAction(date, dept || null);
      if (!res.success || !res.data) {
        setFeedback({ type: 'error', message: res.error || 'Failed to load staff roster.' });
        return;
      }
      setRoster(res.data.staff);
    });
  };

  const handleStatusChange = (staffId: string, status: StaffAttendanceStatus) => {
    setRoster((prev) =>
      prev.map((s) => (s.staffId === staffId ? { ...s, status } : s))
    );
  };

  const handleTimeChange = (staffId: string, field: 'checkInTime' | 'checkOutTime', val: string) => {
    setRoster((prev) =>
      prev.map((s) => (s.staffId === staffId ? { ...s, [field]: val } : s))
    );
  };

  const handleRemarkChange = (staffId: string, val: string) => {
    setRoster((prev) =>
      prev.map((s) => (s.staffId === staffId ? { ...s, remarks: val } : s))
    );
  };

  // Bulk save
  const handleSaveAttendance = () => {
    if (!canManage) return;
    setFeedback(null);

    startSaving(async () => {
      const res = await recordStaffAttendanceBatchAction({
        attendanceDate: selectedDate,
        records: roster.map((s) => ({
          staffId: s.staffId,
          status: s.status,
          checkInTime: s.checkInTime || undefined,
          checkOutTime: s.checkOutTime || undefined,
          remarks: s.remarks || undefined,
        })),
      });

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to record staff attendance.' });
        return;
      }

      setFeedback({
        type: 'success',
        message: `Staff attendance saved successfully for ${selectedDate}!`,
      });
    });
  };

  // Correction
  const handleOpenCorrection = (staff: StaffMarkRow) => {
    setEditingStaff(staff);
    setNewStatus(staff.status);
    setCorrectionReason('');
    setFeedback(null);
  };

  const handleSaveCorrection = () => {
    if (!editingStaff || !editingStaff.recordId) {
      setFeedback({ type: 'error', message: 'No existing attendance record found to correct. Use Save Attendance.' });
      setEditingStaff(null);
      return;
    }

    if (!correctionReason.trim() || correctionReason.trim().length < 3) {
      setFeedback({ type: 'error', message: 'Correction reason must be at least 3 characters.' });
      return;
    }

    startSaving(async () => {
      const res = await correctStaffAttendanceAction({
        recordId: editingStaff.recordId!,
        newStatus,
        reason: correctionReason.trim(),
      });

      if (!res.success) {
        setFeedback({ type: 'error', message: res.error || 'Failed to correct staff attendance.' });
        return;
      }

      setRoster((prev) =>
        prev.map((s) => (s.staffId === editingStaff.staffId ? { ...s, status: newStatus } : s))
      );

      setEditingStaff(null);
      setFeedback({
        type: 'success',
        message: 'Staff attendance correction recorded with audit history.',
      });
    });
  };

  const countPresent = roster.filter((s) => s.status === 'present').length;
  const countAbsent = roster.filter((s) => s.status === 'absent').length;
  const countLate = roster.filter((s) => s.status === 'late').length;
  const countOnLeave = roster.filter((s) => s.status === 'on_leave').length;

  const filteredRoster = roster.filter((s) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      s.fullName.toLowerCase().includes(q) ||
      s.employeeId.toLowerCase().includes(q) ||
      s.designation.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6 pb-20">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/attendance" className="text-slate-400 hover:text-slate-600 transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Staff & Faculty Attendance</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Department-wise daily attendance roster, check-in tracking, leave synchronization, and audited manual adjustments.
          </p>
        </div>

        {canManage && (
          <Button
            onClick={handleSaveAttendance}
            disabled={isSaving || roster.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 shadow-sm text-xs"
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                <span>Save Daily Roster</span>
              </>
            )}
          </Button>
        )}
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

      {/* Filter and Date Bar */}
      <Card className="border-slate-200 shadow-xs">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Date */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Roster Date</label>
              <Input
                type="date"
                max={initialDate}
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  handleFetchRoster(e.target.value, departmentFilter);
                }}
                className="text-xs bg-white"
              />
            </div>

            {/* Department */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Department Filter</label>
              <select
                value={departmentFilter}
                onChange={(e) => {
                  setDepartmentFilter(e.target.value);
                  handleFetchRoster(selectedDate, e.target.value);
                }}
                className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
              >
                <option value="">All Departments</option>
                {departments.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Search */}
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Search Staff</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Name, ID or designation..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 text-xs bg-white"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Roster Table */}
      <Card className="border-slate-200 shadow-xs overflow-hidden">
        <CardHeader className="p-4 border-b border-slate-100 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold text-slate-900">
            Staff Roster ({filteredRoster.length})
          </CardTitle>
          <div className="flex items-center gap-2 text-xs font-medium">
            <span className="text-emerald-700 font-semibold">{countPresent} Present</span> &bull;
            <span className="text-rose-700 font-semibold">{countAbsent} Absent</span> &bull;
            <span className="text-amber-700 font-semibold">{countLate} Late</span> &bull;
            <span className="text-slate-600 font-semibold">{countOnLeave} On Leave</span>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600 mb-2" />
              <p>Loading staff roster...</p>
            </div>
          ) : filteredRoster.length === 0 ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              <Building className="h-10 w-10 text-slate-300 mx-auto mb-2" />
              <p>No staff members found matching criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <th className="p-3 pl-4">Staff Member</th>
                    <th className="p-3">Department</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Check In</th>
                    <th className="p-3">Check Out</th>
                    <th className="p-3">Remarks</th>
                    {canManage && <th className="p-3 text-right pr-4">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRoster.map((s) => {
                    return (
                      <tr key={s.staffId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3 pl-4">
                          <div>
                            <span className="font-semibold text-slate-900 text-sm">{s.fullName}</span>
                            <div className="flex items-center gap-1.5 text-slate-500 mt-0.5">
                              <span className="font-mono text-[11px]">{s.employeeId}</span> &bull;
                              <span>{s.designation}</span>
                            </div>
                            {s.approvedLeave && (
                              <Badge variant="outline" className="text-[10px] bg-amber-50 text-amber-800 border-amber-200 mt-1">
                                On Leave: {s.approvedLeave.leaveType}
                              </Badge>
                            )}
                          </div>
                        </td>

                        <td className="p-3 text-slate-600 font-medium">
                          {s.departmentName}
                        </td>

                        <td className="p-3">
                          {canManage ? (
                            <select
                              value={s.status}
                              onChange={(e) => handleStatusChange(s.staffId, e.target.value as StaffAttendanceStatus)}
                              className={`text-xs font-semibold rounded-md border p-1.5 ${
                                s.status === 'present'
                                  ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                  : s.status === 'absent'
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : s.status === 'late'
                                  ? 'bg-amber-50 text-amber-800 border-amber-300'
                                  : 'bg-purple-50 text-purple-800 border-purple-300'
                              }`}
                            >
                              <option value="present">Present</option>
                              <option value="absent">Absent</option>
                              <option value="late">Late</option>
                              <option value="half_day">Half Day</option>
                              <option value="on_leave">On Leave</option>
                              <option value="excused">Excused</option>
                            </select>
                          ) : (
                            <span className="font-semibold capitalize text-slate-800">{s.status}</span>
                          )}
                        </td>

                        <td className="p-3">
                          {canManage ? (
                            <Input
                              type="time"
                              value={s.checkInTime}
                              onChange={(e) => handleTimeChange(s.staffId, 'checkInTime', e.target.value)}
                              className="text-xs h-7 w-28 bg-white"
                            />
                          ) : (
                            <span>{s.checkInTime || '-'}</span>
                          )}
                        </td>

                        <td className="p-3">
                          {canManage ? (
                            <Input
                              type="time"
                              value={s.checkOutTime}
                              onChange={(e) => handleTimeChange(s.staffId, 'checkOutTime', e.target.value)}
                              className="text-xs h-7 w-28 bg-white"
                            />
                          ) : (
                            <span>{s.checkOutTime || '-'}</span>
                          )}
                        </td>

                        <td className="p-3">
                          {canManage ? (
                            <Input
                              type="text"
                              placeholder="Notes..."
                              value={s.remarks}
                              onChange={(e) => handleRemarkChange(s.staffId, e.target.value)}
                              className="text-xs h-7 w-36 bg-white"
                            />
                          ) : (
                            <span>{s.remarks || '-'}</span>
                          )}
                        </td>

                        {canManage && (
                          <td className="p-3 text-right pr-4">
                            {s.recordId && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleOpenCorrection(s)}
                                className="h-7 text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 ml-auto"
                              >
                                <History className="h-3 w-3" />
                                <span>Correct</span>
                              </Button>
                            )}
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

      {/* Staff Correction Modal */}
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <Card className="w-full max-w-md bg-white shadow-2xl border-slate-200 animate-in fade-in-50 zoom-in-95">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                <History className="h-4 w-4 text-indigo-600" />
                <span>Correct Staff Attendance</span>
              </CardTitle>
              <button
                onClick={() => setEditingStaff(null)}
                className="text-slate-400 hover:text-slate-600 font-bold"
              >
                <X className="h-4 w-4" />
              </button>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs space-y-1">
                <p>
                  <strong className="text-slate-700">Staff:</strong> {editingStaff.fullName} ({editingStaff.employeeId})
                </p>
                <p>
                  <strong className="text-slate-700">Date:</strong> {selectedDate}
                </p>
                <p>
                  <strong className="text-slate-700">Current Status:</strong>{' '}
                  <span className="capitalize font-semibold">{editingStaff.status}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">New Status *</label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as StaffAttendanceStatus)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2 bg-white focus:ring-1 focus:ring-indigo-500"
                >
                  <option value="present">Present</option>
                  <option value="absent">Absent</option>
                  <option value="late">Late</option>
                  <option value="half_day">Half Day</option>
                  <option value="on_leave">On Leave</option>
                  <option value="excused">Excused</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Reason for Adjustment (Audited) *
                </label>
                <textarea
                  rows={3}
                  placeholder="Explain why this status is being changed (e.g. Approved duty leave, biometric scan failed)..."
                  value={correctionReason}
                  onChange={(e) => setCorrectionReason(e.target.value)}
                  className="w-full text-xs border border-slate-300 rounded-md p-2.5 focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <Button variant="outline" size="sm" onClick={() => setEditingStaff(null)}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleSaveCorrection}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium"
                >
                  Save Correction
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
