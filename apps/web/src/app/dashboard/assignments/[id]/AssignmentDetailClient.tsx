'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import type { HomeworkAssignment, HomeworkSubmission } from '@edu-platform/types';
import {
  submitHomeworkAction,
  gradeHomeworkSubmissionAction,
} from '../actions';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  AlertCircle,
  Send,
  Loader2,
  X,
} from 'lucide-react';

interface AssignmentDetailClientProps {
  assignment: HomeworkAssignment;
  submissions: HomeworkSubmission[];
  userRole?: string;
  currentStudentId?: string | null;
}

export function AssignmentDetailClient({
  assignment,
  submissions: initialSubmissions,
  userRole,
  currentStudentId,
}: AssignmentDetailClientProps) {
  const [submissions, setSubmissions] = useState<HomeworkSubmission[]>(initialSubmissions);
  const [submissionText, setSubmissionText] = useState('');
  const [attachmentUrl, setAttachmentUrl] = useState('');
  const [attachmentName, setAttachmentName] = useState('');
  const [isSubmitting, startSubmitting] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Teacher Grading Modal
  const [gradingSub, setGradingSub] = useState<HomeworkSubmission | null>(null);
  const [gradeMarks, setGradeMarks] = useState<number>(0);
  const [gradeFeedback, setGradeFeedback] = useState('');
  const [isGrading, startGrading] = useTransition();

  const isStudent = userRole === 'student';
  const isFacultyOrAdmin = ['owner', 'admin', 'academic_admin', 'faculty'].includes(userRole || '');

  // Student's own submission
  const mySubmission = currentStudentId
    ? submissions.find((s) => s.studentId === currentStudentId)
    : null;

  const handleStudentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentStudentId) return;
    setError(null);
    setSuccessMsg(null);

    const attachments = attachmentUrl.trim()
      ? [{ name: attachmentName.trim() || 'Submission File', url: attachmentUrl.trim() }]
      : [];

    startSubmitting(async () => {
      const res = await submitHomeworkAction({
        assignmentId: assignment.id,
        studentId: currentStudentId,
        submissionText: submissionText.trim() || undefined,
        attachments,
      });

      if (res.success && res.data) {
        setSuccessMsg(
          res.data.isLate
            ? 'Assignment submitted successfully (marked Late).'
            : 'Assignment submitted successfully on time!'
        );
        // Refresh local state
        setSubmissions((prev) => [
          ...prev.filter((s) => s.studentId !== currentStudentId),
          {
            id: res.data!.submissionId,
            assignmentId: assignment.id,
            studentId: currentStudentId,
            institutionId: assignment.institutionId,
            submissionText,
            attachments,
            submittedAt: new Date().toISOString(),
            isLate: res.data!.isLate,
            status: res.data!.isLate ? 'late' : 'submitted',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ]);
      } else {
        setError(res.error || 'Failed to submit assignment');
      }
    });
  };

  const handleGradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!gradingSub) return;

    startGrading(async () => {
      const res = await gradeHomeworkSubmissionAction({
        submissionId: gradingSub.id,
        marksObtained: gradeMarks,
        feedback: gradeFeedback.trim() || undefined,
        status: 'graded',
      });

      if (res.success) {
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === gradingSub.id
              ? {
                  ...s,
                  marksObtained: gradeMarks,
                  feedback: gradeFeedback.trim() || null,
                  status: 'graded',
                }
              : s
          )
        );
        setGradingSub(null);
      } else {
        setError(res.error || 'Failed to grade submission');
      }
    });
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/assignments"
            className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                {assignment.subject?.name || 'Subject'}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                {assignment.class?.name || 'Class'} {assignment.section?.name ? `(${assignment.section.name})` : ''}
              </span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
              {assignment.title}
            </h1>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-semibold text-slate-700">
            Max Score: {assignment.maxMarks}
          </div>
          <div className="text-[11px] text-slate-500 flex items-center gap-1 justify-end mt-0.5">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Due {assignment.dueDate} {assignment.dueTime ? `@ ${assignment.dueTime}` : ''}</span>
          </div>
        </div>
      </div>

      {error && (
        <div className="p-3 rounded-lg border border-rose-200 bg-rose-50 text-rose-700 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-700 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Assignment Overview Card */}
      <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
        {assignment.description && (
          <div className="text-xs text-slate-600 leading-relaxed font-medium">
            {assignment.description}
          </div>
        )}

        {assignment.instructions && (
          <div className="p-4 rounded-lg bg-slate-50 border border-slate-100 space-y-1.5">
            <h3 className="text-xs font-bold text-slate-800">Instructions</h3>
            <div className="text-xs text-slate-600 whitespace-pre-line leading-relaxed">
              {assignment.instructions}
            </div>
          </div>
        )}

        <div className="flex items-center gap-6 text-xs text-slate-500 pt-2 border-t border-slate-100">
          <div>Teacher: <strong className="text-slate-800">{assignment.teacher?.fullName || 'Faculty'}</strong></div>
          <div>Late Submissions: <strong className="text-slate-800">{assignment.allowLateSubmissions ? `Allowed (${assignment.latePenaltyPercent}% penalty)` : 'Disallowed'}</strong></div>
        </div>
      </div>

      {/* Student Section: Submit Coursework or View Result */}
      {isStudent && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <h2 className="text-base font-bold text-slate-900">Your Submission</h2>

          {mySubmission ? (
            <div className="space-y-3">
              <div className="p-4 rounded-lg border border-slate-200 bg-slate-50/50 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold text-slate-700">Status:</span>
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {mySubmission.status}
                    </span>
                    {mySubmission.isLate && (
                      <span className="text-[10px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                        Late
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-slate-400">
                    Submitted on {new Date(mySubmission.submittedAt).toLocaleString()}
                  </div>
                </div>

                {mySubmission.submissionText && (
                  <div className="text-xs text-slate-700 bg-white p-3 rounded border border-slate-100 mt-2">
                    {mySubmission.submissionText}
                  </div>
                )}

                {mySubmission.marksObtained !== null && mySubmission.marksObtained !== undefined && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-50/60 border border-emerald-100 text-xs text-emerald-900 space-y-1">
                    <div className="font-bold">
                      Grade: {mySubmission.marksObtained} / {assignment.maxMarks} marks
                    </div>
                    {mySubmission.feedback && (
                      <div className="text-emerald-800">Feedback: {mySubmission.feedback}</div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <form onSubmit={handleStudentSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Submission Notes / Text
                </label>
                <textarea
                  rows={5}
                  value={submissionText}
                  onChange={(e) => setSubmissionText(e.target.value)}
                  placeholder="Paste your solution or answers here..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">File Name</label>
                  <input
                    type="text"
                    placeholder="Solution.pdf"
                    value={attachmentName}
                    onChange={(e) => setAttachmentName(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">File URL</label>
                  <input
                    type="url"
                    placeholder="https://drive.google.com/..."
                    value={attachmentUrl}
                    onChange={(e) => setAttachmentUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || (!submissionText.trim() && !attachmentUrl.trim())}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Turn In Assignment</span>
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Teacher / Admin Section: Student Submissions Review Table */}
      {isFacultyOrAdmin && (
        <div className="p-6 rounded-xl border border-slate-200 bg-white shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-slate-900">Student Submissions</h2>
              <p className="text-xs text-slate-500">
                {submissions.length} total turned-in coursework files
              </p>
            </div>
          </div>

          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 font-semibold uppercase tracking-wider text-[10px] bg-slate-50/50">
                  <th className="py-2.5 px-4">Student</th>
                  <th className="py-2.5 px-4">Admission #</th>
                  <th className="py-2.5 px-4">Submitted At</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4">Marks</th>
                  <th className="py-2.5 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {submissions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      No submissions recorded for this assignment yet
                    </td>
                  </tr>
                ) : (
                  submissions.map((sub) => (
                    <tr key={sub.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-4 font-semibold text-slate-800">
                        {sub.student?.firstName} {sub.student?.lastName}
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-500">
                        {sub.student?.admissionNumber || '—'}
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(sub.submittedAt).toLocaleString()}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                            sub.status === 'graded'
                              ? 'bg-emerald-50 text-emerald-700'
                              : sub.status === 'late'
                              ? 'bg-rose-50 text-rose-700'
                              : 'bg-blue-50 text-blue-700'
                          }`}
                        >
                          {sub.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900">
                        {sub.marksObtained !== null && sub.marksObtained !== undefined
                          ? `${sub.marksObtained} / ${assignment.maxMarks}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setGradingSub(sub);
                            setGradeMarks(sub.marksObtained || 0);
                            setGradeFeedback(sub.feedback || '');
                          }}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 text-[11px] font-semibold transition"
                        >
                          {sub.status === 'graded' ? 'Update Grade' : 'Grade'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Grading Modal */}
      {gradingSub && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-slate-200 shadow-xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900">Grade Student Submission</h3>
                <div className="text-xs text-slate-500">
                  {gradingSub.student?.firstName} {gradingSub.student?.lastName}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGradingSub(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleGradeSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Marks Obtained (out of {assignment.maxMarks}) *
                </label>
                <input
                  type="number"
                  min={0}
                  max={assignment.maxMarks}
                  required
                  value={gradeMarks}
                  onChange={(e) => setGradeMarks(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Feedback & Comments
                </label>
                <textarea
                  rows={4}
                  value={gradeFeedback}
                  onChange={(e) => setGradeFeedback(e.target.value)}
                  placeholder="Provide constructive feedback for the student..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 bg-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setGradingSub(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isGrading}
                  className="px-4 py-1.5 rounded-lg bg-slate-900 text-white font-semibold hover:bg-slate-800 disabled:opacity-50"
                >
                  {isGrading ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
