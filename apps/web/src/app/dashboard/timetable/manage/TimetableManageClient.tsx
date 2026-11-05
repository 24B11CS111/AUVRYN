'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Plus,
  Filter,
  Layers,
  Building,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ArrowLeft,
} from 'lucide-react';
import {
  saveTimetableEntryAction,
  deleteTimetableEntryAction,
  checkTimetableConflictsAction,
  createTimetableStructureAction,
} from '../actions';

interface TimetableManageClientProps {
  institution: {
    id: string;
    name: string;
  };
  academicYears: any[];
  activeYearId: string;
  campuses: any[];
  classes: any[];
  sections: any[];
  subjects: any[];
  faculty: any[];
  rooms: any[];
  structures: any[];
  initialEntries: any[];
  userRole: string;
}

export function TimetableManageClient({
  institution: _institution,
  academicYears: _academicYears,
  activeYearId,
  campuses: _campuses,
  classes,
  sections,
  subjects,
  faculty,
  rooms,
  structures,
  initialEntries,
  userRole: _userRole,
}: TimetableManageClientProps) {
  const [selectedStructureId, setSelectedStructureId] = useState<string>(
    structures[0]?.id || ''
  );
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSectionId, setSelectedSectionId] = useState<string>('');
  const [entries, setEntries] = useState<any[]>(initialEntries);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal states
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [isStructureModalOpen, setIsStructureModalOpen] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  // Form states for Entry Modal
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [entryClassId, setEntryClassId] = useState<string>(classes[0]?.id || '');
  const [entrySectionId, setEntrySectionId] = useState<string>('');
  const [entrySubjectId, setEntrySubjectId] = useState<string>(subjects[0]?.id || '');
  const [entryFacultyId, setEntryFacultyId] = useState<string>(faculty[0]?.id || '');
  const [entryRoomId, setEntryRoomId] = useState<string>('');
  const [entryDayOfWeek, setEntryDayOfWeek] = useState<string>('monday');
  const [entryPeriodNumber, setEntryPeriodNumber] = useState<number>(1);
  const [entryStartTime, setEntryStartTime] = useState<string>('08:30');
  const [entryEndTime, setEntryEndTime] = useState<string>('09:20');
  const [entrySessionType, setEntrySessionType] = useState<string>('theory');
  const [entryColorCode, setEntryColorCode] = useState<string>('#3b82f6');
  const [entryNotes, setEntryNotes] = useState<string>('');

  // Form states for Structure Modal
  const [structName, setStructName] = useState<string>('');
  const [structDays, setStructDays] = useState<string[]>([
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ]);
  const [structStartTime, setStructStartTime] = useState<string>('08:30');
  const [structEndTime, setStructEndTime] = useState<string>('15:30');
  const [structPeriods, setStructPeriods] = useState<number>(7);

  // Active structure object
  const currentStructure =
    structures.find((s) => s.id === selectedStructureId) || structures[0];
  const workingDays: string[] = currentStructure?.working_days || [
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
  ];
  const structurePeriods: any[] = currentStructure?.periods || [];

  // Filtered sections for current class
  const classSections = sections.filter((s) => s.class_id === (editingEntryId ? entryClassId : selectedClassId));

  // Filter entries based on cohort selection
  const filteredEntries = entries.filter((entry) => {
    if (selectedClassId && entry.class_id !== selectedClassId) return false;
    if (selectedSectionId && entry.section_id !== selectedSectionId) return false;
    return true;
  });

  const handleOpenNewEntry = (day?: string, period?: any) => {
    setEditingEntryId(null);
    setConflictWarning(null);
    if (selectedClassId) setEntryClassId(selectedClassId);
    if (selectedSectionId) setEntrySectionId(selectedSectionId);
    if (day) setEntryDayOfWeek(day);
    if (period) {
      setEntryPeriodNumber(period.period_number);
      setEntryStartTime(period.start_time?.slice(0, 5) || '08:30');
      setEntryEndTime(period.end_time?.slice(0, 5) || '09:20');
    }
    setIsEntryModalOpen(true);
  };

  const handleOpenEditEntry = (entry: any) => {
    setEditingEntryId(entry.id);
    setConflictWarning(null);
    setEntryClassId(entry.class_id);
    setEntrySectionId(entry.section_id || '');
    setEntrySubjectId(entry.subject_id);
    setEntryFacultyId(entry.faculty_id);
    setEntryRoomId(entry.room_id || '');
    setEntryDayOfWeek(entry.day_of_week);
    setEntryPeriodNumber(entry.period_number);
    setEntryStartTime(entry.start_time?.slice(0, 5) || '08:30');
    setEntryEndTime(entry.end_time?.slice(0, 5) || '09:20');
    setEntrySessionType(entry.session_type || 'theory');
    setEntryColorCode(entry.color_code || '#3b82f6');
    setEntryNotes(entry.notes || '');
    setIsEntryModalOpen(true);
  };

  const handleCheckConflict = async () => {
    setConflictWarning(null);
    const res = await checkTimetableConflictsAction({
      academicYearId: activeYearId,
      dayOfWeek: entryDayOfWeek as any,
      periodNumber: entryPeriodNumber,
      startTime: entryStartTime,
      endTime: entryEndTime,
      facultyId: entryFacultyId,
      roomId: entryRoomId || null,
      classId: entryClassId,
      sectionId: entrySectionId || null,
      excludeEntryId: editingEntryId || null,
    });

    if (res.success && res.data?.hasConflict) {
      const conflictMsg = res.data.conflicts.map((c: any) => c.message).join('; ');
      setConflictWarning(conflictMsg);
    } else if (res.success && !res.data?.hasConflict) {
      setSuccessMsg('No conflicts detected! Time slot is completely available.');
      setTimeout(() => setSuccessMsg(null), 3000);
    } else if (!res.success) {
      setErrorMsg(res.error || 'Failed to check conflicts');
    }
  };

  const handleSaveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setConflictWarning(null);

    const res = await saveTimetableEntryAction({
      id: editingEntryId || undefined,
      academicYearId: activeYearId,
      structureId: selectedStructureId || null,
      classId: entryClassId,
      sectionId: entrySectionId || null,
      subjectId: entrySubjectId,
      facultyId: entryFacultyId,
      roomId: entryRoomId || null,
      dayOfWeek: entryDayOfWeek as any,
      periodNumber: Number(entryPeriodNumber),
      startTime: entryStartTime,
      endTime: entryEndTime,
      sessionType: entrySessionType as any,
      effectiveStartDate: new Date().toISOString().slice(0, 10),
      colorCode: entryColorCode,
      notes: entryNotes,
    });

    setLoading(false);
    if (!res.success) {
      if (res.error?.includes('TIMETABLE_CONFLICT') || res.error?.includes('duplicate key')) {
        setConflictWarning(res.error);
      } else {
        setErrorMsg(res.error || 'Failed to save timetable entry');
      }
      return;
    }

    // Refresh state
    setSuccessMsg('Timetable entry saved successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
    setIsEntryModalOpen(false);

    // Update in-memory entry list
    const updatedClass = classes.find((c) => c.id === entryClassId);
    const updatedSection = sections.find((s) => s.id === entrySectionId);
    const updatedSubject = subjects.find((s) => s.id === entrySubjectId);
    const updatedFaculty = faculty.find((f) => f.id === entryFacultyId);
    const updatedRoom = rooms.find((r) => r.id === entryRoomId);

    const savedEntry = {
      id: res.data?.id || editingEntryId || String(Date.now()),
      academic_year_id: activeYearId,
      class_id: entryClassId,
      section_id: entrySectionId || null,
      subject_id: entrySubjectId,
      faculty_id: entryFacultyId,
      room_id: entryRoomId || null,
      day_of_week: entryDayOfWeek,
      period_number: entryPeriodNumber,
      start_time: entryStartTime,
      end_time: entryEndTime,
      session_type: entrySessionType,
      color_code: entryColorCode,
      notes: entryNotes,
      academic_class: updatedClass,
      academic_section: updatedSection,
      subject: updatedSubject,
      faculty: updatedFaculty,
      room: updatedRoom,
    };

    if (editingEntryId) {
      setEntries((prev) => prev.map((item) => (item.id === editingEntryId ? savedEntry : item)));
    } else {
      setEntries((prev) => [...prev, savedEntry]);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!confirm('Are you sure you want to remove this timetable entry?')) return;
    setLoading(true);
    const res = await deleteTimetableEntryAction(id);
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to delete entry');
      return;
    }
    setEntries((prev) => prev.filter((item) => item.id !== id));
    setSuccessMsg('Entry removed successfully');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleCreateStructure = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createTimetableStructureAction({
      academicYearId: activeYearId,
      name: structName,
      workingDays: structDays as any,
      startTime: structStartTime,
      endTime: structEndTime,
      periodsPerDay: Number(structPeriods),
      isDefault: structures.length === 0,
      isActive: true,
    });
    setLoading(false);
    if (!res.success) {
      setErrorMsg(res.error || 'Failed to create structure');
      return;
    }
    setSuccessMsg('Schedule structure created successfully! Please reload to view generated periods.');
    setIsStructureModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/timetable" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Timetable Editor & Grid</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Build and manage recurring weekly schedules with database-enforced conflict prevention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsStructureModalOpen(true)}
            className="flex items-center gap-1.5"
          >
            <Layers className="w-4 h-4" />
            New Structure
          </Button>
          <Button
            size="sm"
            onClick={() => handleOpenNewEntry()}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Add Scheduled Slot
          </Button>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between border border-destructive/20">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
      {successMsg && (
        <div className="p-4 rounded-md bg-emerald-500/10 text-emerald-600 text-sm flex items-center justify-between border border-emerald-500/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <Card className="border-border">
        <CardContent className="p-4 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-muted-foreground" />
              <select
                aria-label="Structure"
                value={selectedStructureId}
                onChange={(e) => setSelectedStructureId(e.target.value)}
                className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 font-medium"
              >
                {structures.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.periods_per_day} Periods)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-muted-foreground" />
              <select
                aria-label="Class Filter"
                value={selectedClassId}
                onChange={(e) => {
                  setSelectedClassId(e.target.value);
                  setSelectedSectionId('');
                }}
                className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 font-medium"
              >
                <option value="">All Classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>

              {selectedClassId && classSections.length > 0 && (
                <select
                  aria-label="Section Filter"
                  value={selectedSectionId}
                  onChange={(e) => setSelectedSectionId(e.target.value)}
                  className="text-xs bg-background border border-input rounded-md px-2.5 py-1.5 font-medium"
                >
                  <option value="">All Sections</option>
                  {classSections.map((s) => (
                    <option key={s.id} value={s.id}>
                      Section {s.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Showing <span className="font-semibold text-foreground">{filteredEntries.length}</span> scheduled slots
          </div>
        </CardContent>
      </Card>

      {/* Timetable Weekly Grid */}
      <Card className="border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <th className="p-3 border-r border-border w-28 text-center">Period / Day</th>
                {workingDays.map((day) => (
                  <th key={day} className="p-3 border-r border-border min-w-[180px] text-center capitalize">
                    {day}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {structurePeriods.length === 0 ? (
                <tr>
                  <td colSpan={workingDays.length + 1} className="p-8 text-center text-muted-foreground">
                    No periods configured for this structure. Please configure periods or select another structure.
                  </td>
                </tr>
              ) : (
                structurePeriods.map((period) => (
                  <tr key={period.id} className={period.is_break ? 'bg-muted/30' : ''}>
                    {/* Period Row Header */}
                    <td className="p-3 border-r border-border text-center bg-muted/20 font-medium text-xs">
                      <div className="font-bold text-foreground">{period.name}</div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5">
                        {period.start_time?.slice(0, 5)} - {period.end_time?.slice(0, 5)}
                      </div>
                      {period.is_break && (
                        <Badge variant="outline" className="text-[9px] uppercase mt-1">
                          {period.break_type}
                        </Badge>
                      )}
                    </td>

                    {/* Day Cells */}
                    {workingDays.map((day) => {
                      if (period.is_break) {
                        return (
                          <td
                            key={day}
                            className="p-3 border-r border-border text-center text-xs text-muted-foreground italic bg-muted/20"
                          >
                            {period.name}
                          </td>
                        );
                      }

                      // Find entries matching this day and period
                      const slotEntries = filteredEntries.filter(
                        (e) => e.day_of_week === day && e.period_number === period.period_number
                      );

                      return (
                        <td
                          key={day}
                          className="p-2 border-r border-border align-top min-h-[90px] hover:bg-muted/10 transition-colors group relative"
                        >
                          {slotEntries.length === 0 ? (
                            <div
                              onClick={() => handleOpenNewEntry(day, period)}
                              className="w-full h-16 border border-dashed border-transparent group-hover:border-border rounded flex items-center justify-center cursor-pointer transition-colors"
                            >
                              <span className="text-xs text-muted-foreground/0 group-hover:text-muted-foreground flex items-center gap-1">
                                <Plus className="w-3.5 h-3.5" /> Add
                              </span>
                            </div>
                          ) : (
                            <div className="space-y-2">
                              {slotEntries.map((ent) => (
                                <div
                                  key={ent.id}
                                  style={{ borderLeftColor: ent.color_code || '#3b82f6' }}
                                  className="p-2.5 rounded bg-card border border-border border-l-4 shadow-xs relative group/card"
                                >
                                  <div className="flex items-start justify-between gap-1">
                                    <span className="font-semibold text-xs text-foreground line-clamp-1">
                                      {ent.subject?.name || 'Class Session'}
                                    </span>
                                    <div className="opacity-0 group-hover/card:opacity-100 flex items-center gap-1 transition-opacity">
                                      <button
                                        onClick={() => handleOpenEditEntry(ent)}
                                        className="text-muted-foreground hover:text-foreground p-0.5"
                                        title="Edit"
                                      >
                                        <Edit2 className="w-3 h-3" />
                                      </button>
                                      <button
                                        onClick={() => handleDeleteEntry(ent.id)}
                                        className="text-destructive hover:text-destructive/80 p-0.5"
                                        title="Delete"
                                      >
                                        <Trash2 className="w-3 h-3" />
                                      </button>
                                    </div>
                                  </div>

                                  <div className="text-[11px] text-muted-foreground mt-1 flex flex-col gap-0.5">
                                    <span className="font-medium text-foreground">
                                      {ent.academic_class?.name}
                                      {ent.academic_section?.name ? ` (${ent.academic_section.name})` : ''}
                                    </span>
                                    <span>
                                      {ent.faculty?.first_name} {ent.faculty?.last_name}
                                    </span>
                                    {ent.room && (
                                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                                        <Building className="w-2.5 h-2.5" />
                                        Room {ent.room.room_number}
                                      </span>
                                    )}
                                  </div>

                                  {ent.session_type !== 'theory' && (
                                    <Badge variant="info" className="text-[9px] uppercase mt-1 px-1 py-0">
                                      {ent.session_type}
                                    </Badge>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ============================================================================== */}
      {/* Entry Modal: Add / Edit Scheduled Slot */}
      {/* ============================================================================== */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">
                {editingEntryId ? 'Edit Timetable Entry' : 'Schedule Timetable Slot'}
              </h2>
              <button
                onClick={() => setIsEntryModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEntry} className="p-5 space-y-4">
              {conflictWarning && (
                <div className="p-3 rounded-md bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold">Conflict Warning:</span>
                    <p className="mt-0.5">{conflictWarning}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Academic Class *</label>
                  <select
                    value={entryClassId}
                    onChange={(e) => {
                      setEntryClassId(e.target.value);
                      setEntrySectionId('');
                    }}
                    required
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Section / Division</label>
                  <select
                    value={entrySectionId}
                    onChange={(e) => setEntrySectionId(e.target.value)}
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    <option value="">All / Entire Class</option>
                    {sections
                      .filter((s) => s.class_id === entryClassId)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          Section {s.name}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Subject *</label>
                  <select
                    value={entrySubjectId}
                    onChange={(e) => setEntrySubjectId(e.target.value)}
                    required
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Faculty Member *</label>
                  <select
                    value={entryFacultyId}
                    onChange={(e) => setEntryFacultyId(e.target.value)}
                    required
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    {faculty.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.first_name} {f.last_name} ({f.employee_id})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Room / Lab</label>
                  <select
                    value={entryRoomId}
                    onChange={(e) => setEntryRoomId(e.target.value)}
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    <option value="">Unassigned</option>
                    {rooms.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.room_number} - {r.building} ({r.room_type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Session Type</label>
                  <select
                    value={entrySessionType}
                    onChange={(e) => setEntrySessionType(e.target.value)}
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                  >
                    <option value="theory">Theory Lecture</option>
                    <option value="practical">Practical</option>
                    <option value="laboratory">Laboratory</option>
                    <option value="tutorial">Tutorial</option>
                    <option value="seminar">Seminar</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Day of Week *</label>
                  <select
                    value={entryDayOfWeek}
                    onChange={(e) => setEntryDayOfWeek(e.target.value)}
                    className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2 capitalize"
                  >
                    {workingDays.map((d) => (
                      <option key={d} value={d}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Period # *</label>
                  <Input
                    type="number"
                    min={1}
                    max={15}
                    value={entryPeriodNumber}
                    onChange={(e) => setEntryPeriodNumber(Number(e.target.value))}
                    required
                    className="mt-1 text-xs"
                  />
                </div>

                <div>
                  <label className="text-xs font-medium text-foreground">Timings (HH:MM)</label>
                  <div className="grid grid-cols-2 gap-1 mt-1">
                    <Input
                      type="text"
                      placeholder="08:30"
                      value={entryStartTime}
                      onChange={(e) => setEntryStartTime(e.target.value)}
                      required
                      className="text-xs p-1"
                    />
                    <Input
                      type="text"
                      placeholder="09:20"
                      value={entryEndTime}
                      onChange={(e) => setEntryEndTime(e.target.value)}
                      required
                      className="text-xs p-1"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Color Code</label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    type="color"
                    value={entryColorCode}
                    onChange={(e) => setEntryColorCode(e.target.value)}
                    className="w-10 h-8 p-0 cursor-pointer"
                  />
                  <span className="text-xs text-muted-foreground font-mono">{entryColorCode}</span>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between border-t border-border">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleCheckConflict}
                  className="text-xs"
                >
                  Verify Conflict
                </Button>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEntryModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Slot'}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================================== */}
      {/* Structure Modal: Create Timetable Structure */}
      {/* ============================================================================== */}
      {isStructureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">New Timetable Structure</h2>
              <button
                onClick={() => setIsStructureModalOpen(false)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateStructure} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Structure Name *</label>
                <Input
                  type="text"
                  placeholder="e.g. Senior Secondary Morning Shift"
                  value={structName}
                  onChange={(e) => setStructName(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-foreground">Start Time</label>
                  <Input
                    type="text"
                    value={structStartTime}
                    onChange={(e) => setStructStartTime(e.target.value)}
                    required
                    className="mt-1 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-foreground">End Time</label>
                  <Input
                    type="text"
                    value={structEndTime}
                    onChange={(e) => setStructEndTime(e.target.value)}
                    required
                    className="mt-1 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Working Days</label>
                <div className="flex flex-wrap gap-2 mt-1.5">
                  {['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].map((day) => {
                    const isChecked = structDays.includes(day);
                    return (
                      <button
                        key={day}
                        type="button"
                        onClick={() => {
                          if (isChecked && structDays.length > 1) {
                            setStructDays(structDays.filter((d) => d !== day));
                          } else if (!isChecked) {
                            setStructDays([...structDays, day]);
                          }
                        }}
                        className={`text-xs px-2.5 py-1 rounded border capitalize transition-colors ${
                          isChecked
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-muted/40 text-muted-foreground border-border hover:bg-muted'
                        }`}
                      >
                        {day.slice(0, 3)}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Periods Per Day</label>
                <Input
                  type="number"
                  min={1}
                  max={15}
                  value={structPeriods}
                  onChange={(e) => setStructPeriods(Number(e.target.value))}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsStructureModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Structure'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
