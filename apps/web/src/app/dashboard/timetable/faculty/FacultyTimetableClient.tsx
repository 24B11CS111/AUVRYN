'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import {
  Calendar,
  Printer,
  Clock,
  Building,
  ArrowLeft,
  Filter,
  Plus,
  XCircle,
  X,
  AlertTriangle,
  CheckCircle2,
  Search,
} from 'lucide-react';
import {
  getAvailableSubstituteFacultyAction,
  createSubstitutionRequestAction,
  reviewSubstitutionAction,
} from '../actions';

interface FacultyTimetableClientProps {
  institution: {
    id: string;
    name: string;
  };
  academicYearName: string;
  facultyMembers: any[];
  initialEntries: any[];
  initialSubstitutions: any[];
  currentStaffId: string | null;
  todayDate: string;
  userRole: string;
}

export function FacultyTimetableClient({
  institution,
  academicYearName,
  facultyMembers,
  initialEntries,
  initialSubstitutions,
  currentStaffId,
  todayDate,
  userRole,
}: FacultyTimetableClientProps) {
  const [selectedFacultyId, setSelectedFacultyId] = useState<string>(
    currentStaffId || facultyMembers[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'schedule' | 'substitutions'>('schedule');
  const [substitutions, setSubstitutions] = useState<any[]>(initialSubstitutions);
  const [isSubModalOpen, setIsSubModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Substitution Request form states
  const [subEntryId, setSubEntryId] = useState<string>('');
  const [subDate, setSubDate] = useState<string>(todayDate);
  const [subReason, setSubReason] = useState<string>('');
  const [subCandidateId, setSubCandidateId] = useState<string>('');
  const [availableCandidates, setAvailableCandidates] = useState<any[]>([]);
  const [searchingCandidates, setSearchingCandidates] = useState(false);

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const canReview = ['owner', 'admin', 'academic_admin', 'department_head'].includes(userRole);

  const selectedFaculty = facultyMembers.find((f) => f.id === selectedFacultyId);

  // Filter entries for selected faculty
  const facultyEntries = initialEntries.filter((e) => e.faculty_id === selectedFacultyId);

  // Calculate distinct period numbers
  const periodNumbers = Array.from(
    new Set(facultyEntries.map((e) => e.period_number))
  ).sort((a, b) => a - b);

  // Workload metrics
  const totalWeeklyPeriods = facultyEntries.length;
  const uniqueClassesCount = new Set(facultyEntries.map((e) => e.class_id)).size;
  const uniqueSubjectsCount = new Set(facultyEntries.map((e) => e.subject_id)).size;

  const handlePrint = () => {
    window.print();
  };

  const handleOpenSubstitutionModal = () => {
    if (facultyEntries.length > 0) {
      setSubEntryId(facultyEntries[0].id);
    }
    setSubDate(todayDate);
    setSubReason('');
    setSubCandidateId('');
    setAvailableCandidates([]);
    setIsSubModalOpen(true);
  };

  const handleSearchAvailableFaculty = async () => {
    const entry = facultyEntries.find((e) => e.id === subEntryId);
    if (!entry) return;

    setSearchingCandidates(true);
    const res = await getAvailableSubstituteFacultyAction({
      date: subDate,
      dayOfWeek: entry.day_of_week,
      periodNumber: entry.period_number,
      startTime: entry.start_time,
      endTime: entry.end_time,
      excludeFacultyId: selectedFacultyId,
    });
    setSearchingCandidates(false);

    if (res.success) {
      setAvailableCandidates(res.data || []);
      if (res.data && res.data.length > 0) {
        setSubCandidateId(res.data[0].staff_id);
      }
    } else {
      setErrorMsg(res.error || 'Failed to search available faculty');
    }
  };

  const handleSubmitSubstitution = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subCandidateId) {
      setErrorMsg('Please select an available substitute faculty member');
      return;
    }

    setLoading(true);
    const res = await createSubstitutionRequestAction({
      timetableEntryId: subEntryId,
      substitutionDate: subDate,
      originalFacultyId: selectedFacultyId,
      substituteFacultyId: subCandidateId,
      reason: subReason,
    });
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to submit substitution request');
      return;
    }

    setSuccessMsg('Substitution request submitted successfully!');
    setTimeout(() => setSuccessMsg(null), 3000);
    setIsSubModalOpen(false);

    // Append to list
    const entry = facultyEntries.find((e) => e.id === subEntryId);
    const candidate = facultyMembers.find((f) => f.id === subCandidateId);

    setSubstitutions((prev) => [
      {
        id: res.data?.id || String(Date.now()),
        substitution_date: subDate,
        reason: subReason,
        status: 'pending',
        created_at: new Date().toISOString(),
        timetable_entry: entry,
        original_faculty: selectedFaculty,
        substitute_faculty: candidate,
      },
      ...prev,
    ]);
  };

  const handleReviewSubstitution = async (subId: string, status: 'approved' | 'rejected') => {
    setLoading(true);
    const res = await reviewSubstitutionAction({
      substitutionId: subId,
      status,
      remarks: status === 'approved' ? 'Approved by administration' : 'Rejected',
    });
    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to review substitution');
      return;
    }

    setSubstitutions((prev) =>
      prev.map((s) => (s.id === subId ? { ...s, status } : s))
    );
    setSuccessMsg(`Substitution request ${status}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Header (Hidden in Print) */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-border pb-5 print:hidden">
        <div>
          <div className="flex items-center gap-2">
            <Link href="/dashboard/timetable" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <h1 className="text-2xl font-bold tracking-tight text-foreground">Faculty Workload & Schedules</h1>
            <Badge variant="outline" className="text-xs uppercase font-semibold">
              {academicYearName}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Weekly teaching assignments, workload metrics, and conflict-free substitute coverage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-1.5">
            <Printer className="w-4 h-4" />
            Print Schedule
          </Button>
          <Button
            size="sm"
            onClick={handleOpenSubstitutionModal}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Request Substitution
          </Button>
        </div>
      </div>

      {/* Alert Banners */}
      {errorMsg && (
        <div className="p-4 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between border border-destructive/20 print:hidden">
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
        <div className="p-4 rounded-md bg-emerald-500/10 text-emerald-600 text-sm flex items-center justify-between border border-emerald-500/20 print:hidden">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Tabs & Controls (Hidden in Print) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
        <div className="flex items-center gap-2 border-b border-border sm:border-b-0">
          <button
            onClick={() => setActiveTab('schedule')}
            className={`pb-2 sm:pb-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
              activeTab === 'schedule'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Weekly Schedule
          </button>
          <button
            onClick={() => setActiveTab('substitutions')}
            className={`pb-2 sm:pb-0 px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'substitutions'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Substitutions
            {substitutions.filter((s) => s.status === 'pending').length > 0 && (
              <Badge variant="info" className="text-[10px] px-1 py-0">
                {substitutions.filter((s) => s.status === 'pending').length}
              </Badge>
            )}
          </button>
        </div>

        {/* Faculty Selector */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <label className="text-xs font-semibold text-foreground">Faculty:</label>
          <select
            aria-label="Faculty Member"
            value={selectedFacultyId}
            onChange={(e) => setSelectedFacultyId(e.target.value)}
            className="text-xs bg-background border border-input rounded-md px-3 py-1.5 font-medium"
          >
            {facultyMembers.map((f) => (
              <option key={f.id} value={f.id}>
                {f.first_name} {f.last_name} ({f.designation || 'Faculty'})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Printable Header */}
      <div className="hidden print:block text-center border-b border-black pb-4 mb-4">
        <h1 className="text-xl font-bold uppercase">{institution.name}</h1>
        <h2 className="text-sm font-semibold mt-1">
          Faculty Teaching Timetable — {selectedFaculty?.first_name} {selectedFaculty?.last_name} (
          {selectedFaculty?.designation || 'Faculty'})
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Academic Session: {academicYearName} | Weekly Workload: {totalWeeklyPeriods} Periods
        </p>
      </div>

      {activeTab === 'schedule' ? (
        <div className="space-y-6">
          {/* Workload Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
            <Card className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Weekly Teaching Load</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{totalWeeklyPeriods} Periods</p>
                </div>
                <Clock className="w-8 h-8 text-primary/20" />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Assigned Classes</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{uniqueClassesCount} Classes</p>
                </div>
                <Building className="w-8 h-8 text-blue-500/20" />
              </CardContent>
            </Card>

            <Card className="border-border">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Subjects Taught</p>
                  <p className="text-xl font-bold text-foreground mt-0.5">{uniqueSubjectsCount} Subjects</p>
                </div>
                <Calendar className="w-8 h-8 text-emerald-500/20" />
              </CardContent>
            </Card>
          </div>

          {/* Schedule Grid */}
          <Card className="border-border overflow-hidden print:border-none print:shadow-none">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm print:text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase text-muted-foreground print:bg-gray-100 print:text-black">
                    <th className="p-3 border-r border-border w-28 text-center print:border-black">Day / Period</th>
                    {periodNumbers.length === 0 ? (
                      <th className="p-3 text-center">Periods</th>
                    ) : (
                      periodNumbers.map((pNum) => (
                        <th key={pNum} className="p-3 border-r border-border min-w-[170px] text-center print:border-black">
                          Period {pNum}
                        </th>
                      ))
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border print:divide-black">
                  {facultyEntries.length === 0 ? (
                    <tr>
                      <td colSpan={periodNumbers.length + 1 || 2} className="p-12 text-center text-muted-foreground">
                        No teaching slots assigned to this faculty member.
                      </td>
                    </tr>
                  ) : (
                    days.map((day) => {
                      const dayEntries = facultyEntries.filter((e) => e.day_of_week === day);
                      if (dayEntries.length === 0) return null;

                      return (
                        <tr key={day}>
                          <td className="p-3 border-r border-border text-center bg-muted/20 font-bold text-xs uppercase print:border-black print:bg-transparent">
                            {day}
                          </td>
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
                                <div className="space-y-1">
                                  <div className="font-bold text-xs text-foreground line-clamp-1">
                                    {slot.subject?.name}
                                  </div>
                                  <div className="text-[11px] text-muted-foreground">
                                    <span className="font-semibold text-foreground">
                                      {slot.academic_class?.name}
                                      {slot.academic_section?.name ? ` (${slot.academic_section.name})` : ''}
                                    </span>
                                  </div>
                                  {slot.room && (
                                    <div className="text-[10px] text-muted-foreground flex items-center gap-1">
                                      <Building className="w-2.5 h-2.5" />
                                      Room {slot.room.room_number} ({slot.room.building})
                                    </div>
                                  )}
                                  <div className="text-[10px] text-muted-foreground font-mono">
                                    {slot.start_time?.slice(0, 5)} - {slot.end_time?.slice(0, 5)}
                                  </div>
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
          </Card>
        </div>
      ) : (
        /* Substitutions List */
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Faculty Substitution Records</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {substitutions.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">
                No faculty substitution records found.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {substitutions.map((sub) => (
                  <div key={sub.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-foreground">
                          {sub.timetable_entry?.subject?.name || 'Class Session'}
                        </span>
                        <Badge
                          variant={
                            sub.status === 'approved'
                              ? 'success'
                              : sub.status === 'rejected'
                              ? 'danger'
                              : 'warning'
                          }
                          className="text-[10px] uppercase font-semibold"
                        >
                          {sub.status}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Date: <span className="font-medium text-foreground">{sub.substitution_date}</span> • Class:{' '}
                        <span className="font-medium text-foreground">
                          {sub.timetable_entry?.academic_class?.name}
                        </span>{' '}
                        • Period {sub.timetable_entry?.period_number}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Original Faculty: {sub.original_faculty?.first_name} {sub.original_faculty?.last_name} ➔ Substitute:{' '}
                        <span className="font-semibold text-foreground">
                          {sub.substitute_faculty?.first_name} {sub.substitute_faculty?.last_name}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground italic mt-0.5">
                        &quot;{sub.reason}&quot;
                      </p>
                    </div>

                    {canReview && sub.status === 'pending' && (
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleReviewSubstitution(sub.id, 'rejected')}
                          disabled={loading}
                          className="text-destructive border-destructive/30 hover:bg-destructive/10 text-xs"
                        >
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleReviewSubstitution(sub.id, 'approved')}
                          disabled={loading}
                          className="text-xs"
                        >
                          Approve
                        </Button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ============================================================================== */}
      {/* Substitution Request Modal */}
      {/* ============================================================================== */}
      {isSubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-background border border-border rounded-lg shadow-xl w-full max-w-lg overflow-hidden animate-in fade-in-50">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground">Request Faculty Substitution</h2>
              <button onClick={() => setIsSubModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <XCircle className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitSubstitution} className="p-5 space-y-4">
              <div>
                <label className="text-xs font-medium text-foreground">Select Scheduled Class *</label>
                <select
                  value={subEntryId}
                  onChange={(e) => setSubEntryId(e.target.value)}
                  required
                  className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                >
                  {facultyEntries.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.day_of_week.toUpperCase()} P{e.period_number}: {e.subject?.name} ({e.academic_class?.name})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Substitution Date *</label>
                <Input
                  type="date"
                  value={subDate}
                  onChange={(e) => setSubDate(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-foreground">Reason for Absence / Substitution *</label>
                <Input
                  type="text"
                  placeholder="e.g. Attending academic conference / Medical appointment"
                  value={subReason}
                  onChange={(e) => setSubReason(e.target.value)}
                  required
                  className="mt-1 text-xs"
                />
              </div>

              <div className="p-3 bg-muted/40 rounded-md border border-border space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-foreground">Conflict-Free Substitute Finder</span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSearchAvailableFaculty}
                    disabled={searchingCandidates}
                    className="text-xs h-7"
                  >
                    <Search className="w-3 h-3 mr-1" />
                    {searchingCandidates ? 'Searching...' : 'Find Teachers'}
                  </Button>
                </div>

                {availableCandidates.length > 0 ? (
                  <div>
                    <label className="text-[11px] text-muted-foreground">Select from Available Faculty:</label>
                    <select
                      value={subCandidateId}
                      onChange={(e) => setSubCandidateId(e.target.value)}
                      required
                      className="mt-1 w-full text-xs bg-background border border-input rounded-md p-2"
                    >
                      {availableCandidates.map((c) => (
                        <option key={c.staff_id} value={c.staff_id}>
                          {c.first_name} {c.last_name} ({c.designation || 'Faculty'}) - {c.department_name || 'General'}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    Click &quot;Find Teachers&quot; to discover colleagues who have no class or leave conflicts during this period.
                  </p>
                )}
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-border">
                <Button type="button" variant="ghost" size="sm" onClick={() => setIsSubModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={loading}>
                  {loading ? 'Submitting...' : 'Submit Request'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
