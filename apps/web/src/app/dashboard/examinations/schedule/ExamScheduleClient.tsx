'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  ArrowLeft,
  Search,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { checkExamConflictAction } from '../actions';

interface ExamScheduleClientProps {
  initialSchedule: any[];
  rooms: any[];
  staff: any[];
  userRole: string;
}

export function ExamScheduleClient({
  initialSchedule,
  rooms,
  staff,
}: ExamScheduleClientProps) {
  const [schedule] = useState<any[]>(initialSchedule);
  const [selectedRoom, setSelectedRoom] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>('');

  // Conflict Testing Widget state
  const [isConflictTesterOpen, setIsConflictTesterOpen] = useState(false);
  const [testDate, setTestDate] = useState(new Date().toISOString().slice(0, 10));
  const [testStart, setTestStart] = useState('09:30');
  const [testEnd, setTestEnd] = useState('12:30');
  const [testRoomId, setTestRoomId] = useState('');
  const [testInvigilatorId, setTestInvigilatorId] = useState('');
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<{ has_conflict: boolean; conflicts: any[] } | null>(null);

  const filtered = useMemo(() => {
    return schedule.filter((s) => {
      if (selectedRoom !== 'all' && s.room_id !== selectedRoom) {
        return false;
      }
      if (selectedDate && s.exam_date !== selectedDate) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const examName = s.examination?.name?.toLowerCase() || '';
        const subName = s.subject?.name?.toLowerCase() || '';
        const roomNum = s.room?.room_number?.toLowerCase() || '';
        const invName = `${s.invigilator?.first_name || ''} ${s.invigilator?.last_name || ''}`.toLowerCase();
        if (!examName.includes(query) && !subName.includes(query) && !roomNum.includes(query) && !invName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [schedule, selectedRoom, selectedDate, searchQuery]);

  const handleRunConflictTest = async (e: React.FormEvent) => {
    e.preventDefault();
    setTestLoading(true);
    setTestResult(null);
    try {
      const res = await checkExamConflictAction({
        examDate: testDate,
        startTime: testStart,
        endTime: testEnd,
        roomId: testRoomId || null,
        invigilatorStaffId: testInvigilatorId || null,
      });
      if (res.success && res.data) {
        setTestResult(res.data);
      }
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/examinations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Examination Timetable & Venue Schedule
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Dedicated examination dates, room allocations, invigilator rosters, and conflict detection.
            </p>
          </div>
        </div>

        <Button
          variant="outline"
          onClick={() => {
            setIsConflictTesterOpen(true);
            setTestResult(null);
          }}
        >
          <ShieldAlert className="w-4 h-4 mr-1.5 text-blue-600" />
          Conflict Verification Tool
        </Button>
      </div>

      {/* Filter Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
            <Input
              placeholder="Search by exam, subject, room or invigilator..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="w-full md:w-56">
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="h-9 text-xs"
              placeholder="Filter by Date"
            />
          </div>

          <div className="w-full md:w-60">
            <Select
              value={selectedRoom}
              onChange={(e) => setSelectedRoom(e.target.value)}
              options={[
                { value: 'all', label: 'All Rooms / Venues' },
                ...rooms.map((r) => ({
                  value: r.id,
                  label: `Room ${r.room_number} (${r.building})`,
                })),
              ]}
            />
          </div>

          {(selectedDate || selectedRoom !== 'all' || searchQuery) && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedDate('');
                setSelectedRoom('all');
                setSearchQuery('');
              }}
            >
              Clear Filters
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Schedule Table */}
      <Card>
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Scheduled Sessions ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <Calendar className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mt-2">No scheduled examinations found</p>
              <p className="text-xs text-gray-400">
                Allocate subjects with dates, times, and rooms from the examination details page.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Date & Time</th>
                    <th className="px-4 py-3">Examination</th>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Assessment Type</th>
                    <th className="px-4 py-3">Room / Venue</th>
                    <th className="px-4 py-3">Invigilator</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5 text-xs">
                        <div className="flex items-center gap-1.5 font-semibold text-gray-900">
                          <Calendar className="w-3.5 h-3.5 text-blue-600" />
                          {item.exam_date || 'Unscheduled'}
                        </div>
                        {item.start_time && (
                          <div className="flex items-center gap-1.5 text-gray-500 mt-0.5">
                            <Clock className="w-3 h-3 text-gray-400" />
                            {item.start_time} - {item.end_time}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/dashboard/examinations/${item.examination_id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {item.examination?.name}
                        </Link>
                        <p className="text-xs text-gray-400">
                          {item.examination?.academic_class?.name || 'All Classes'}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <p className="font-semibold text-gray-900">{item.subject?.name}</p>
                        <p className="text-gray-400">{item.subject?.code}</p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded capitalize">
                          {item.assessment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {item.room ? (
                          <div className="flex items-center gap-1 text-gray-800">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>
                              Room {item.room.room_number} ({item.room.building})
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No room allocated</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        {item.invigilator ? (
                          <div className="flex items-center gap-1 text-gray-800">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>
                              {item.invigilator.first_name} {item.invigilator.last_name}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">No invigilator assigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <Link href={`/dashboard/examinations/${item.examination_id}`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">
                            Manage
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Conflict Verification Tool Modal */}
      <Modal
        isOpen={isConflictTesterOpen}
        onClose={() => setIsConflictTesterOpen(false)}
        title="Examination Schedule Conflict Checker"
      >
        <form onSubmit={handleRunConflictTest} className="space-y-4">
          <p className="text-xs text-gray-600">
            Verify whether a room or invigilator is already allocated on the designated exam date and time slot to prevent double-booking.
          </p>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Exam Date
              </label>
              <Input
                type="date"
                value={testDate}
                onChange={(e) => setTestDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={testStart}
                onChange={(e) => setTestStart(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Time
              </label>
              <Input
                type="time"
                value={testEnd}
                onChange={(e) => setTestEnd(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Room to Verify
              </label>
              <Select
                value={testRoomId}
                onChange={(e) => setTestRoomId(e.target.value)}
                options={[
                  { value: '', label: 'None selected' },
                  ...rooms.map((r) => ({
                    value: r.id,
                    label: `Room ${r.room_number} - ${r.building} (Cap: ${r.capacity})`,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Invigilator to Verify
              </label>
              <Select
                value={testInvigilatorId}
                onChange={(e) => setTestInvigilatorId(e.target.value)}
                options={[
                  { value: '', label: 'None selected' },
                  ...staff.map((s) => ({
                    value: s.id,
                    label: `${s.first_name} ${s.last_name}`,
                  })),
                ]}
              />
            </div>
          </div>

          {testResult && (
            <div
              className={`p-3 rounded-md border text-xs ${
                testResult.has_conflict
                  ? 'bg-red-50 border-red-200 text-red-800'
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}
            >
              {testResult.has_conflict ? (
                <div>
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertCircle className="w-4 h-4 text-red-600" />
                    <span>Scheduling Conflicts Detected:</span>
                  </div>
                  <ul className="list-disc list-inside mt-1 space-y-0.5">
                    {testResult.conflicts.map((c, i) => (
                      <li key={i}>{c.message}</li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No conflicts detected! The venue and invigilator are free for this slot.</span>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={() => setIsConflictTesterOpen(false)}>
              Close
            </Button>
            <Button variant="primary" type="submit" disabled={testLoading}>
              {testLoading ? 'Checking...' : 'Check Availability'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
