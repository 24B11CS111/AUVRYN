'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import {
  CalendarDays,
  Printer,
  CalendarCheck,
  Building,
  User,
  Clock,
  ArrowLeft,
  Filter,
} from 'lucide-react';
import { startAttendanceFromTimetableAction } from '../actions';

interface ClassTimetableClientProps {
  institution: {
    id: string;
    name: string;
  };
  academicYearName: string;
  classes: any[];
  sections: any[];
  initialEntries: any[];
  todayDate: string;
  userRole: string;
}

export function ClassTimetableClient({
  institution,
  academicYearName,
  classes,
  sections,
  initialEntries,
  todayDate,
  userRole: _userRole,
}: ClassTimetableClientProps) {
  const router = useRouter();
  const [selectedClassId, setSelectedClassId] = useState<string>(classes[0]?.id || '');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [loadingAttendanceId, setLoadingAttendanceId] = useState<string | null>(null);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const todayDayOfWeek = dayNames[new Date().getDay()] || 'monday';

  // Filter sections for chosen class
  const classSections = sections.filter((s) => s.class_id === selectedClassId);

  // Filter entries
  const classEntries = initialEntries.filter((e) => {
    if (e.class_id !== selectedClassId) return false;
    if (selectedSectionId && e.section_id !== selectedSectionId) return false;
    return true;
  });

  const selectedClass = classes.find((c) => c.id === selectedClassId);
  const selectedSection = sections.find((s) => s.id === selectedSectionId);

  // Get distinct period numbers present in the entries
  const periodNumbers = Array.from(
    new Set(classEntries.map((e) => e.period_number))
  ).sort((a, b) => a - b);

  const handlePrint = () => {
    window.print();
  };

  const handleStartAttendance = async (entry: any) => {
    setLoadingAttendanceId(entry.id);
    const res = await startAttendanceFromTimetableAction(entry.id, todayDate);
    setLoadingAttendanceId(null);
    if (res.success && res.data?.sessionId) {
      router.push(`/dashboard/attendance/mark?sessionId=${res.data.sessionId}`);
    } else {
      alert(res.error || 'Failed to initialize attendance session');
    }
  };

  return (
    <div className="space-y-6">
      {/* Non-print toolbar & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/timetable" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Class Timetables</h1>
            <Badge variant="outline" className="text-xs uppercase font-semibold">
              {academicYearName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly class schedule view with direct attendance session initialization.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print Timetable
          </Button>
          <Link href="/dashboard/timetable/manage">
            <Button size="sm" variant="primary">
              Edit Schedule
            </Button>
          </Link>
        </div>
      </div>

      {/* Cohort Selector (Hidden in Print) */}
      <Card className="border-border print:hidden">
        <CardContent className="p-4 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-muted-foreground" />
            <label className="text-xs font-semibold text-foreground">Select Class:</label>
            <select
              aria-label="Class Selection"
              value={selectedClassId}
              onChange={(e) => {
                setSelectedClassId(e.target.value);
                setSelectedSectionId('');
              }}
              className="text-xs bg-background border border-input rounded-md px-3 py-1.5 font-medium"
            >
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {classSections.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-foreground">Section:</label>
              <select
                aria-label="Section Selection"
                value={selectedSectionId}
                onChange={(e) => setSelectedSectionId(e.target.value)}
                className="text-xs bg-background border border-input rounded-md px-3 py-1.5 font-medium"
              >
                <option value="">All Sections</option>
                {classSections.map((s) => (
                  <option key={s.id} value={s.id}>
                    Section {s.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Printable Timetable Document Header */}
      <div className="hidden print:block text-center border-b border-black pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase">{institution.name}</h1>
        <h2 className="text-sm font-semibold mt-1">
          Academic Class Timetable — {selectedClass?.name || 'All Classes'}
          {selectedSection?.name ? ` (Section ${selectedSection.name})` : ''}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Academic Session: {academicYearName}</p>
      </div>

      {/* Weekly Grid */}
      <Card className="border-border overflow-hidden print:border-none print:shadow-none">
        <CardHeader className="flex flex-row items-center justify-between pb-3 print:hidden">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <CalendarDays className="w-4 h-4 text-primary" />
            Weekly Schedule: {selectedClass?.name || 'Class'}
            {selectedSection?.name ? ` (Section ${selectedSection.name})` : ''}
          </CardTitle>
          <div className="text-xs text-muted-foreground">
            {classEntries.length} weekly periods scheduled
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm print:text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground print:bg-gray-100 print:text-black">
                  <th className="p-3 border-r border-border w-28 text-center print:border-black">Day / Period</th>
                  {periodNumbers.length === 0 ? (
                    <th className="p-3 text-center">Periods</th>
                  ) : (
                    periodNumbers.map((pNum) => {
                      const sample = classEntries.find((e) => e.period_number === pNum);
                      return (
                        <th key={pNum} className="p-3 border-r border-border min-w-[170px] text-center print:border-black">
                          <div>Period {pNum}</div>
                          {sample && (
                            <div className="text-[10px] text-muted-foreground font-mono font-normal mt-0.5">
                              {sample.start_time?.slice(0, 5)} - {sample.end_time?.slice(0, 5)}
                            </div>
                          )}
                        </th>
                      );
                    })
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border print:divide-black">
                {classEntries.length === 0 ? (
                  <tr>
                    <td colSpan={periodNumbers.length + 1 || 2} className="p-12 text-center text-muted-foreground">
                      No timetable slots scheduled for this class. Use the Timetable Editor to add entries.
                    </td>
                  </tr>
                ) : (
                  days.map((day) => {
                    const dayEntries = classEntries.filter((e) => e.day_of_week === day);
                    if (dayEntries.length === 0) return null; // skip days with no classes

                    const isToday = day === todayDayOfWeek;

                    return (
                      <tr key={day} className={isToday ? 'bg-primary/5 print:bg-transparent' : ''}>
                        {/* Day Row Header */}
                        <td className="p-3 border-r border-border text-center bg-muted/20 font-bold text-xs uppercase print:border-black print:bg-transparent">
                          <div className="flex items-center justify-center gap-1">
                            <span>{day}</span>
                            {isToday && (
                              <Badge variant="default" className="text-[9px] px-1 py-0 print:hidden">
                                Today
                              </Badge>
                            )}
                          </div>
                        </td>

                        {/* Period Cells */}
                        {periodNumbers.map((pNum) => {
                          const slot = dayEntries.find((e) => e.period_number === pNum);
                          if (!slot) {
                            return (
                              <td key={pNum} className="p-2 border-r border-border text-center text-muted-foreground text-xs italic bg-muted/5 print:border-black">
                                —
                              </td>
                            );
                          }

                          return (
                            <td
                              key={pNum}
                              className="p-3 border-r border-border align-top min-h-[90px] print:border-black"
                              style={{ borderLeftColor: slot.color_code || '#3b82f6' }}
                            >
                              <div className="flex flex-col justify-between h-full space-y-2">
                                <div>
                                  <div className="flex items-center justify-between">
                                    <span className="font-bold text-xs text-foreground line-clamp-1">
                                      {slot.subject?.name}
                                    </span>
                                    {slot.session_type !== 'theory' && (
                                      <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">
                                        {slot.session_type}
                                      </Badge>
                                    )}
                                  </div>

                                  <div className="text-[11px] text-muted-foreground mt-1 space-y-0.5">
                                    <div className="flex items-center gap-1 text-foreground">
                                      <User className="w-3 h-3 text-muted-foreground" />
                                      <span>
                                        {slot.faculty?.first_name} {slot.faculty?.last_name}
                                      </span>
                                    </div>
                                    {slot.room && (
                                      <div className="flex items-center gap-1">
                                        <Building className="w-3 h-3 text-muted-foreground" />
                                        <span>
                                          Room {slot.room.room_number} ({slot.room.building})
                                        </span>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1 text-muted-foreground font-mono text-[10px]">
                                      <Clock className="w-3 h-3" />
                                      <span>
                                        {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Attendance Bridge Button for Today */}
                                {isToday && (
                                  <div className="pt-1 print:hidden">
                                    <Button
                                      size="sm"
                                      variant="secondary"
                                      onClick={() => handleStartAttendance(slot)}
                                      disabled={loadingAttendanceId === slot.id}
                                      className="w-full text-[10px] h-7 flex items-center justify-center gap-1"
                                    >
                                      <CalendarCheck className="w-3 h-3 text-primary" />
                                      {loadingAttendanceId === slot.id ? 'Loading...' : 'Mark Attendance'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
