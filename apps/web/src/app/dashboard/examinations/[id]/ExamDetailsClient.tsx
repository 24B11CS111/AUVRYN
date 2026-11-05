'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Award,
  Calendar,
  Clock,
  MapPin,
  UserCheck,
  AlertCircle,
  Plus,
  ArrowLeft,
  FileText,
  CheckSquare,
  QrCode,
  Trash2,
  Share2,
} from 'lucide-react';
import {
  addExamSubjectAction,
  deleteExamSubjectAction,
  checkExamConflictAction,
  publishExaminationResultsAction,
  generateHallTicketsAction,
  updateExaminationAction,
} from '../actions';
import type { AssessmentType, ExamStatus } from '@edu-platform/types';

interface ExamDetailsClientProps {
  examination: any;
  availableSubjects: any[];
  availableRooms: any[];
  availableStaff: any[];
  resultsCount: number;
  hallTicketsCount: number;
  userRole: string;
}

export function ExamDetailsClient({
  examination,
  availableSubjects,
  availableRooms,
  availableStaff,
  resultsCount,
  hallTicketsCount,
  userRole,
}: ExamDetailsClientProps) {
  const router = useRouter();
  const [exam, setExam] = useState<any>(examination);
  const [subjects, setSubjects] = useState<any[]>(examination.subjects || []);
  const [isAddSubjectOpen, setIsAddSubjectOpen] = useState(false);
  const [isHallTicketModalOpen, setIsHallTicketModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);

  const canManage = ['owner', 'admin', 'academic_admin', 'department_head'].includes(userRole);
  const canPublish = ['owner', 'admin', 'academic_admin'].includes(userRole);

  // Subject Allocation Form state
  const [subjectForm, setSubjectForm] = useState({
    subjectId: availableSubjects[0]?.id || '',
    assessmentType: 'theory' as AssessmentType,
    maxMarks: exam.max_marks || 100,
    passingMarks: exam.passing_marks || 40,
    credits: 3.0,
    examDate: exam.start_date || '',
    startTime: '09:30',
    endTime: '12:30',
    roomId: '',
    invigilatorStaffId: '',
  });

  const handleSubjectFormChange = async (field: string, value: any) => {
    const updated = { ...subjectForm, [field]: value };
    setSubjectForm(updated);

    // Dynamic conflict pre-check
    if (updated.examDate && updated.startTime && updated.endTime && (updated.roomId || updated.invigilatorStaffId)) {
      try {
        const check = await checkExamConflictAction({
          examDate: updated.examDate,
          startTime: updated.startTime,
          endTime: updated.endTime,
          roomId: updated.roomId || null,
          invigilatorStaffId: updated.invigilatorStaffId || null,
        });

        if (check.success && check.data?.has_conflict) {
          const warn = check.data.conflicts.map((c: any) => c.message).join(' | ');
          setConflictWarning(warn);
        } else {
          setConflictWarning(null);
        }
      } catch (e) {
        // Ignore live check errors
      }
    } else {
      setConflictWarning(null);
    }
  };

  const handleAddSubject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subjectForm.subjectId) {
      setErrorMsg('Please select a subject');
      return;
    }
    if (Number(subjectForm.passingMarks) > Number(subjectForm.maxMarks)) {
      setErrorMsg('Passing marks cannot exceed maximum marks');
      return;
    }

    setActionLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await addExamSubjectAction({
        examinationId: exam.id,
        subjectId: subjectForm.subjectId,
        assessmentType: subjectForm.assessmentType,
        maxMarks: Number(subjectForm.maxMarks),
        passingMarks: Number(subjectForm.passingMarks),
        credits: Number(subjectForm.credits),
        examDate: subjectForm.examDate || null,
        startTime: subjectForm.startTime || null,
        endTime: subjectForm.endTime || null,
        roomId: subjectForm.roomId || null,
        invigilatorStaffId: subjectForm.invigilatorStaffId || null,
        status: 'scheduled',
      });

      if (res.success && res.data) {
        setSubjects((prev) => [...prev, res.data]);
        setIsAddSubjectOpen(false);
        setSuccessMsg('Subject allocated to examination successfully');
      } else {
        setErrorMsg(res.error || 'Failed to allocate subject');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteSubject = async (subjectAllocationId: string, subjectName: string) => {
    if (!confirm(`Are you sure you want to remove "${subjectName}" from this examination?`)) {
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await deleteExamSubjectAction(subjectAllocationId, exam.id);
      if (res.success) {
        setSubjects((prev) => prev.filter((s) => s.id !== subjectAllocationId));
        setSuccessMsg('Subject removed from examination');
      } else {
        setErrorMsg(res.error || 'Failed to remove subject');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handlePublishResults = async () => {
    if (!confirm('Are you sure you want to publish results for this examination? Results will be aggregated, GPA computed according to the grading scale, and made visible to students.')) {
      return;
    }
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await publishExaminationResultsAction({ examinationId: exam.id });
      if (res.success) {
        setExam((prev: any) => ({
          ...prev,
          publication_status: 'published',
          status: 'completed',
        }));
        setSuccessMsg(`Results published successfully! Consolidated transcripts are now available.`);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to publish results');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleGenerateHallTickets = async () => {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await generateHallTicketsAction({
        examinationId: exam.id,
        classId: exam.class_id || undefined,
      });

      if (res.success) {
        setIsHallTicketModalOpen(false);
        setSuccessMsg(`Generated ${res.data?.count || 0} hall tickets with unique QR security verification tokens.`);
        router.refresh();
      } else {
        setErrorMsg(res.error || 'Failed to generate hall tickets');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: ExamStatus) => {
    setActionLoading(true);
    try {
      const res = await updateExaminationAction(exam.id, { status: newStatus });
      if (res.success) {
        setExam((prev: any) => ({ ...prev, status: newStatus }));
        setSuccessMsg(`Examination status changed to ${newStatus}`);
      } else {
        setErrorMsg(res.error || 'Failed to update status');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setActionLoading(false);
    }
  };

  const formatExamType = (type: string) => {
    return (type || '')
      .split('_')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  };

  return (
    <div className="space-y-6">
      {/* Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/examinations">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-gray-900">
                {exam.name}
              </h1>
              <Badge variant={exam.status === 'completed' ? 'success' : exam.status === 'in_progress' ? 'warning' : 'info'}>
                {exam.status}
              </Badge>
              <Badge variant={exam.publication_status === 'published' ? 'purple' : 'outline'}>
                {exam.publication_status}
              </Badge>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              {formatExamType(exam.exam_type)} • {exam.academic_year?.name} • {exam.academic_class?.name || 'All Classes'}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2">
          {subjects.length > 0 && (
            <Link href={`/dashboard/examinations/${exam.id}/marks`}>
              <Button variant="primary">
                <CheckSquare className="w-4 h-4 mr-1.5" />
                Enter Marks
              </Button>
            </Link>
          )}

          {canManage && (
            <Button
              variant="outline"
              onClick={() => setIsHallTicketModalOpen(true)}
              disabled={actionLoading}
            >
              <QrCode className="w-4 h-4 mr-1.5" />
              Hall Tickets ({hallTicketsCount})
            </Button>
          )}

          {canPublish && exam.publication_status !== 'published' && (
            <Button
              variant="outline"
              className="text-purple-700 border-purple-200 hover:bg-purple-50"
              onClick={handlePublishResults}
              disabled={actionLoading}
            >
              <Share2 className="w-4 h-4 mr-1.5" />
              Publish Results
            </Button>
          )}

          {exam.publication_status === 'published' && (
            <Link href={`/dashboard/examinations/results?examId=${exam.id}`}>
              <Button variant="outline" className="text-emerald-700 border-emerald-200 hover:bg-emerald-50">
                <FileText className="w-4 h-4 mr-1.5" />
                View Ledger ({resultsCount})
              </Button>
            </Link>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-md bg-red-50 border border-red-200 flex items-center justify-between text-red-800 text-sm">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-red-500 font-bold ml-4">✕</button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 rounded-md bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm">
          <span>{successMsg}</span>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-500 font-bold ml-4">✕</button>
        </div>
      )}

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Evaluation Window</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {exam.start_date} to {exam.end_date}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Weightage: {exam.weightage_percentage}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Marks Scheme</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              Max: {exam.max_marks} | Pass: {exam.passing_marks}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Passing: {((Number(exam.passing_marks) / Number(exam.max_marks)) * 100).toFixed(0)}%
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Grading System</p>
            <p className="text-sm font-semibold text-gray-900 mt-1">
              {exam.grading_scale?.name || 'Standard Percentage'}
            </p>
            <p className="text-[11px] text-gray-400 mt-0.5">
              Type: {exam.grading_scale?.calculation_type || 'percentage'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Lifecycle Status</p>
            <div className="mt-1 flex items-center gap-2">
              {canManage ? (
                <select
                  value={exam.status}
                  onChange={(e) => handleStatusChange(e.target.value as ExamStatus)}
                  className="text-xs font-semibold rounded border border-gray-300 py-1 px-2 focus:outline-none"
                  disabled={actionLoading}
                >
                  <option value="draft">Draft</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              ) : (
                <span className="text-sm font-semibold capitalize">{exam.status}</span>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {exam.instructions && (
        <Card className="bg-gray-50/50">
          <CardContent className="p-4 text-xs text-gray-600">
            <strong className="text-gray-900 font-semibold block mb-1">Instructions:</strong>
            {exam.instructions}
          </CardContent>
        </Card>
      )}

      {/* Allocated Subjects Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between border-b pb-4">
          <div>
            <CardTitle className="text-base font-semibold">
              Subject Allocations & Schedule ({subjects.length})
            </CardTitle>
            <p className="text-xs text-gray-500 mt-0.5">
              Theory, practical, and lab examinations with room & invigilator assignments.
            </p>
          </div>
          {canManage && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsAddSubjectOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Allocate Subject
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {subjects.length === 0 ? (
            <div className="text-center py-10">
              <Award className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mt-2">No subjects allocated yet</p>
              <p className="text-xs text-gray-400 mt-0.5">
                Allocate subjects to schedule dates, rooms, and assign invigilators.
              </p>
              {canManage && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={() => setIsAddSubjectOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" />
                  Add First Subject
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Subject</th>
                    <th className="px-4 py-3">Assessment Type</th>
                    <th className="px-4 py-3">Marks / Credits</th>
                    <th className="px-4 py-3">Schedule</th>
                    <th className="px-4 py-3">Room / Venue</th>
                    <th className="px-4 py-3">Invigilator</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {subjects.map((sub) => (
                    <tr key={sub.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900">
                          {sub.subject?.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          Code: {sub.subject?.code}
                        </p>
                      </td>
                      <td className="px-4 py-3.5">
                        <span className="inline-flex text-xs font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded capitalize">
                          {sub.assessment_type}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <span className="font-semibold text-gray-900">Max: {sub.max_marks}</span>
                        <span className="text-gray-400"> (Pass: {sub.passing_marks})</span>
                        <p className="text-[11px] text-gray-500 mt-0.5">Credits: {sub.credits}</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-700">
                        {sub.exam_date ? (
                          <>
                            <div className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              {sub.exam_date}
                            </div>
                            {sub.start_time && (
                              <div className="flex items-center gap-1 text-[11px] text-gray-500 mt-0.5">
                                <Clock className="w-3 h-3 text-gray-400" />
                                {sub.start_time} - {sub.end_time}
                              </div>
                            )}
                          </>
                        ) : (
                          <span className="text-gray-400 italic">Not scheduled</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-700">
                        {sub.room ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-gray-400" />
                            <span>Room {sub.room.room_number} ({sub.room.building})</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-700">
                        {sub.invigilator ? (
                          <div className="flex items-center gap-1">
                            <UserCheck className="w-3.5 h-3.5 text-emerald-500" />
                            <span>{sub.invigilator.first_name} {sub.invigilator.last_name}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/dashboard/examinations/${exam.id}/marks?subjectId=${sub.id}`}>
                            <Button variant="outline" className="h-8 px-2.5 text-xs">
                              <CheckSquare className="w-3.5 h-3.5 mr-1" />
                              Marks
                            </Button>
                          </Link>
                          {canManage && exam.publication_status !== 'published' && (
                            <Button
                              variant="ghost"
                              className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                              onClick={() => handleDeleteSubject(sub.id, sub.subject?.name)}
                              title="Remove Subject"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Allocate Subject Modal */}
      <Modal
        isOpen={isAddSubjectOpen}
        onClose={() => setIsAddSubjectOpen(false)}
        title="Allocate Subject to Examination"
      >
        <form onSubmit={handleAddSubject} className="space-y-4">
          {conflictWarning && (
            <div className="p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>{conflictWarning}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Select Subject <span className="text-red-500">*</span>
            </label>
            <Select
              value={subjectForm.subjectId}
              onChange={(e) => handleSubjectFormChange('subjectId', e.target.value)}
              options={availableSubjects.map((s) => ({
                value: s.id,
                label: `${s.name} (${s.code}) - ${s.category}`,
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Assessment Type <span className="text-red-500">*</span>
              </label>
              <Select
                value={subjectForm.assessmentType}
                onChange={(e) => handleSubjectFormChange('assessmentType', e.target.value)}
                options={[
                  { value: 'theory', label: 'Theory' },
                  { value: 'practical', label: 'Practical' },
                  { value: 'laboratory', label: 'Laboratory' },
                  { value: 'internal_assessment', label: 'Internal Assessment' },
                  { value: 'external_assessment', label: 'External Assessment' },
                  { value: 'viva', label: 'Viva Voce' },
                  { value: 'project', label: 'Project' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Credits
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={subjectForm.credits}
                onChange={(e) => handleSubjectFormChange('credits', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Max Marks <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.5"
                min="1"
                value={subjectForm.maxMarks}
                onChange={(e) => handleSubjectFormChange('maxMarks', e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Passing Marks <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                max={subjectForm.maxMarks}
                value={subjectForm.passingMarks}
                onChange={(e) => handleSubjectFormChange('passingMarks', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Exam Date
              </label>
              <Input
                type="date"
                value={subjectForm.examDate}
                onChange={(e) => handleSubjectFormChange('examDate', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Start Time
              </label>
              <Input
                type="time"
                value={subjectForm.startTime}
                onChange={(e) => handleSubjectFormChange('startTime', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                End Time
              </label>
              <Input
                type="time"
                value={subjectForm.endTime}
                onChange={(e) => handleSubjectFormChange('endTime', e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Room / Venue (Conflict Checked)
              </label>
              <Select
                value={subjectForm.roomId}
                onChange={(e) => handleSubjectFormChange('roomId', e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...availableRooms.map((r) => ({
                    value: r.id,
                    label: `Room ${r.room_number} - ${r.building} (Cap: ${r.capacity})`,
                  })),
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Invigilator (Conflict Checked)
              </label>
              <Select
                value={subjectForm.invigilatorStaffId}
                onChange={(e) => handleSubjectFormChange('invigilatorStaffId', e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...availableStaff.map((s) => ({
                    value: s.id,
                    label: `${s.first_name} ${s.last_name} (${s.designation || 'Faculty'})`,
                  })),
                ]}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" type="button" onClick={() => setIsAddSubjectOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={actionLoading}>
              {actionLoading ? 'Allocating...' : 'Allocate Subject'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Hall Ticket Generation Modal */}
      <Modal
        isOpen={isHallTicketModalOpen}
        onClose={() => setIsHallTicketModalOpen(false)}
        title="Generate Hall Tickets / Admit Cards"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Generate digital hall tickets for all enrolled students targeting this examination. Each hall ticket includes the scheduled timetable, assigned room, and a tamper-proof QR code verification token.
          </p>

          <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-800 space-y-1">
            <p className="font-semibold">Generation Scope:</p>
            <p>• Examination: {exam.name}</p>
            <p>• Target: {exam.academic_class?.name || 'All Enrolled Students'}</p>
            <p>• Allocated Subjects: {subjects.length} subjects with scheduled dates & rooms</p>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" onClick={() => setIsHallTicketModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleGenerateHallTickets} disabled={actionLoading}>
              {actionLoading ? 'Generating...' : 'Generate Hall Tickets'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
