'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  Award,
  ArrowLeft,
  Save,
  CheckCircle2,
  History,
  FileSpreadsheet,
  Edit3,
} from 'lucide-react';
import {
  getExamRosterForMarksAction,
  recordMarksBatchAction,
  correctStudentMarkAction,
  getMarksHistoryAction,
} from '../../actions';

interface ExamMarksClientProps {
  examination: any;
  subjects: any[];
  activeSubjectId: string | null;
  initialRosterData: any | null;
  userRole: string;
}

export function ExamMarksClient({
  examination,
  subjects,
  activeSubjectId,
  initialRosterData,
}: ExamMarksClientProps) {
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(activeSubjectId || '');
  const [roster, setRoster] = useState<any[]>(initialRosterData?.roster || []);
  const [examSubject, setExamSubject] = useState<any>(initialRosterData?.examSubject || null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Correction Modal
  const [correctionTarget, setCorrectionTarget] = useState<any | null>(null);
  const [correctionMarks, setCorrectionMarks] = useState<string>('');
  const [correctionReason, setCorrectionReason] = useState<string>('');
  const [correctionLoading, setCorrectionLoading] = useState(false);

  // History Modal
  const [historyTarget, setHistoryTarget] = useState<any | null>(null);
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Bulk Paste Modal
  const [isBulkPasteOpen, setIsBulkPasteOpen] = useState(false);
  const [pasteData, setPasteData] = useState('');

  // Switch subject
  const handleSubjectChange = async (newSubjectId: string) => {
    setSelectedSubjectId(newSubjectId);
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await getExamRosterForMarksAction(newSubjectId);
      if (res.success && res.data) {
        setRoster(res.data.roster);
        setExamSubject(res.data.examSubject);
      } else {
        setErrorMsg(res.error || 'Failed to load roster');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error switching subject');
    } finally {
      setLoading(false);
    }
  };

  const handleRowChange = (index: number, field: string, value: any) => {
    setRoster((prev) => {
      const updated = [...prev];
      const row = { ...updated[index] };

      if (field === 'marksObtained') {
        const num = value === '' ? null : Number(value);
        if (num !== null && examSubject && num > Number(examSubject.max_marks)) {
          setErrorMsg(`Marks cannot exceed maximum marks (${examSubject.max_marks})`);
          return prev;
        }
        row.marksObtained = num;
        if (num !== null) {
          row.isAbsent = false;
        }
      } else if (field === 'isAbsent') {
        row.isAbsent = Boolean(value);
        if (value) {
          row.marksObtained = null;
        }
      } else if (field === 'isExempted') {
        row.isExempted = Boolean(value);
      } else if (field === 'remarks') {
        row.remarks = value;
      }

      updated[index] = row;
      return updated;
    });
  };

  const handleSaveMarks = async (submitStatus: 'draft' | 'submitted') => {
    if (!selectedSubjectId) {
      setErrorMsg('No subject selected');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const payloadRecords = roster.map((r) => ({
        studentId: r.studentId,
        enrollmentId: r.enrollmentId || null,
        marksObtained: r.marksObtained !== null && r.marksObtained !== undefined ? Number(r.marksObtained) : null,
        isAbsent: Boolean(r.isAbsent),
        isExempted: Boolean(r.isExempted),
        remarks: r.remarks || null,
      }));

      const res = await recordMarksBatchAction({
        examSubjectId: selectedSubjectId,
        records: payloadRecords,
        status: submitStatus,
      });

      if (res.success) {
        setSuccessMsg(
          submitStatus === 'submitted'
            ? 'Marks submitted successfully!'
            : 'Marks draft saved successfully.'
        );
        // Refresh roster
        const reload = await getExamRosterForMarksAction(selectedSubjectId);
        if (reload.success && reload.data) {
          setRoster(reload.data.roster);
        }
      } else {
        setErrorMsg(res.error || 'Failed to save marks');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred while saving marks');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenCorrection = (row: any) => {
    setCorrectionTarget(row);
    setCorrectionMarks(row.marksObtained !== null ? String(row.marksObtained) : '');
    setCorrectionReason('');
  };

  const handleSubmitCorrection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!correctionTarget?.markId) {
      setErrorMsg('No mark record found to correct');
      return;
    }
    if (!correctionReason.trim()) {
      setErrorMsg('Please specify a valid audit reason for correcting previously submitted marks');
      return;
    }
    const newMarksNum = Number(correctionMarks);
    if (isNaN(newMarksNum) || newMarksNum < 0 || (examSubject && newMarksNum > Number(examSubject.max_marks))) {
      setErrorMsg(`Marks must be between 0 and ${examSubject?.max_marks || 100}`);
      return;
    }

    setCorrectionLoading(true);
    setErrorMsg(null);
    try {
      const res = await correctStudentMarkAction({
        studentExamMarkId: correctionTarget.markId,
        newMarks: newMarksNum,
        isAbsent: false,
        reason: correctionReason.trim(),
      });

      if (res.success) {
        setCorrectionTarget(null);
        setSuccessMsg('Mark revision recorded with immutable audit log');
        // Refresh roster
        const reload = await getExamRosterForMarksAction(selectedSubjectId);
        if (reload.success && reload.data) {
          setRoster(reload.data.roster);
        }
      } else {
        setErrorMsg(res.error || 'Failed to record mark correction');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error correcting mark');
    } finally {
      setCorrectionLoading(false);
    }
  };

  const handleViewHistory = async (row: any) => {
    if (!row.markId) return;
    setHistoryTarget(row);
    setHistoryLoading(true);
    try {
      const res = await getMarksHistoryAction(row.markId);
      if (res.success) {
        setHistoryRecords(res.data || []);
      }
    } catch (err) {
      // Ignore
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleApplyBulkPaste = () => {
    if (!pasteData.trim()) return;

    // Splits lines by newline, columns by tab or comma
    const lines = pasteData.trim().split('\n');
    const updatedRoster = [...roster];
    let matchedCount = 0;

    lines.forEach((line) => {
      const parts = line.split(/[\t,]+/).map((p) => p.trim());
      if (parts.length >= 2 && parts[0] && parts[1]) {
        const idOrAdm = parts[0];
        const markVal = parseFloat(parts[1]);

        const targetIndex = updatedRoster.findIndex(
          (r) =>
            r.admissionNumber?.toLowerCase() === idOrAdm.toLowerCase() ||
            r.rollNumber?.toLowerCase() === idOrAdm.toLowerCase() ||
            r.studentName?.toLowerCase().includes(idOrAdm.toLowerCase())
        );

        if (targetIndex !== -1 && !isNaN(markVal)) {
          if (!examSubject || markVal <= Number(examSubject.max_marks)) {
            updatedRoster[targetIndex].marksObtained = markVal;
            updatedRoster[targetIndex].isAbsent = false;
            matchedCount++;
          }
        }
      }
    });

    setRoster(updatedRoster);
    setIsBulkPasteOpen(false);
    setPasteData('');
    setSuccessMsg(`Pasted and mapped ${matchedCount} student marks.`);
  };

  const maxMarks = examSubject?.max_marks || examination.max_marks || 100;
  const passingMarks = examSubject?.passing_marks || examination.passing_marks || 40;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/examinations/${examination.id}`}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-gray-900">
              Faculty Marks Entry Roster
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              {examination.name} • {examination.academic_class?.name || 'All Classes'}
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsBulkPasteOpen(true)}
          >
            <FileSpreadsheet className="w-4 h-4 mr-1.5" />
            Quick Paste
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleSaveMarks('draft')}
            disabled={saving || roster.length === 0}
          >
            <Save className="w-4 h-4 mr-1.5" />
            Save Draft
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSaveMarks('submitted')}
            disabled={saving || roster.length === 0}
          >
            <CheckCircle2 className="w-4 h-4 mr-1.5" />
            {saving ? 'Saving...' : 'Submit Marks'}
          </Button>
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

      {/* Subject Selector Bar */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-gray-700">Subject:</span>
            <div className="w-72">
              <Select
                value={selectedSubjectId}
                onChange={(e) => handleSubjectChange(e.target.value)}
                options={subjects.map((s) => ({
                  value: s.id,
                  label: `${s.subject?.name} (${s.subject?.code}) - ${s.assessment_type}`,
                }))}
              />
            </div>
          </div>

          {examSubject && (
            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div>
                <span className="font-semibold text-gray-900">Max Marks:</span> {maxMarks}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Passing Marks:</span> {passingMarks}
              </div>
              <div>
                <span className="font-semibold text-gray-900">Assessment:</span>{' '}
                <span className="capitalize">{examSubject.assessment_type}</span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Marks Roster Table */}
      <Card>
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Students Enrolled ({roster.length})
          </CardTitle>
          <span className="text-xs text-gray-400">
            Passing threshold: {passingMarks} / {maxMarks}
          </span>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="text-center py-12 text-sm text-gray-500">Loading roster...</div>
          ) : roster.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mt-2">No students enrolled</p>
              <p className="text-xs text-gray-400">
                Ensure students are enrolled in this academic class for the current academic year.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Adm No.</th>
                    <th className="px-4 py-3">Student Name</th>
                    <th className="px-4 py-3">Roll No.</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3 w-32">Marks Obtained</th>
                    <th className="px-4 py-3 text-center">Absent</th>
                    <th className="px-4 py-3 text-center">Exempt</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Remarks</th>
                    <th className="px-4 py-3 text-right">Audit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {roster.map((row, index) => {
                    const isSubmitted = ['submitted', 'verified', 'locked'].includes(row.status);
                    const isPassing = row.marksObtained !== null && row.marksObtained >= passingMarks;

                    return (
                      <tr key={row.studentId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 font-mono text-xs text-gray-700">
                          {row.admissionNumber}
                        </td>
                        <td className="px-4 py-3 font-medium text-gray-900">
                          {row.studentName}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {row.rollNumber || '—'}
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-600">
                          {row.sectionName}
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            type="number"
                            step="0.5"
                            min="0"
                            max={maxMarks}
                            disabled={row.isAbsent || isSubmitted}
                            placeholder={row.isAbsent ? 'ABS' : '0.0'}
                            value={row.marksObtained !== null && row.marksObtained !== undefined ? row.marksObtained : ''}
                            onChange={(e) => handleRowChange(index, 'marksObtained', e.target.value)}
                            className={`h-8 text-xs font-semibold ${
                              row.marksObtained !== null
                                ? isPassing
                                  ? 'text-emerald-700'
                                  : 'text-red-700'
                                : ''
                            }`}
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isAbsent}
                            disabled={isSubmitted}
                            onChange={(e) => handleRowChange(index, 'isAbsent', e.target.checked)}
                            className="rounded border-gray-300 text-red-600 focus:ring-red-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={row.isExempted}
                            disabled={isSubmitted}
                            onChange={(e) => handleRowChange(index, 'isExempted', e.target.checked)}
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4 cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <Badge
                            variant={
                              row.status === 'verified'
                                ? 'success'
                                : row.status === 'submitted'
                                ? 'info'
                                : 'default'
                            }
                          >
                            {row.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <Input
                            placeholder="Optional note"
                            disabled={isSubmitted}
                            value={row.remarks || ''}
                            onChange={(e) => handleRowChange(index, 'remarks', e.target.value)}
                            className="h-8 text-xs w-36"
                          />
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isSubmitted && (
                              <Button
                                variant="outline"
                                className="h-7 px-2 text-[11px]"
                                onClick={() => handleOpenCorrection(row)}
                                title="Audit Correct Mark"
                              >
                                <Edit3 className="w-3 h-3 mr-1 text-amber-600" />
                                Correct
                              </Button>
                            )}
                            {row.markId && (
                              <Button
                                variant="ghost"
                                className="h-7 w-7 p-0 text-gray-400 hover:text-gray-700"
                                onClick={() => handleViewHistory(row)}
                                title="View History"
                              >
                                <History className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Mark Correction Modal */}
      <Modal
        isOpen={Boolean(correctionTarget)}
        onClose={() => setCorrectionTarget(null)}
        title="Correct Previously Submitted Marks"
      >
        <form onSubmit={handleSubmitCorrection} className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded p-3 text-xs text-amber-800">
            <p className="font-semibold">Audited Correction Policy:</p>
            <p>
              Submitted marks cannot be silently overwritten. Every change is permanently recorded in the revision history with your identity, timestamp, and audit justification.
            </p>
          </div>

          <div>
            <p className="text-xs text-gray-500">Student:</p>
            <p className="text-sm font-semibold text-gray-900">
              {correctionTarget?.studentName} ({correctionTarget?.admissionNumber})
            </p>
            <p className="text-xs text-gray-400">
              Current Recorded Marks: {correctionTarget?.marksObtained ?? 'None'} / {maxMarks}
            </p>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              New Revised Marks <span className="text-red-500">*</span>
            </label>
            <Input
              type="number"
              step="0.5"
              min="0"
              max={maxMarks}
              value={correctionMarks}
              onChange={(e) => setCorrectionMarks(e.target.value)}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Audit Reason / Justification <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              className="w-full text-sm rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Recounting verified; answer sheet re-evaluated as per academic board review..."
              value={correctionReason}
              onChange={(e) => setCorrectionReason(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t">
            <Button variant="outline" type="button" onClick={() => setCorrectionTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={correctionLoading}>
              {correctionLoading ? 'Recording Revision...' : 'Save Correction'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Marks Revision History Modal */}
      <Modal
        isOpen={Boolean(historyTarget)}
        onClose={() => setHistoryTarget(null)}
        title={`Revision History - ${historyTarget?.studentName || ''}`}
      >
        <div className="space-y-4">
          {historyLoading ? (
            <p className="text-xs text-gray-500 text-center py-4">Loading revision trail...</p>
          ) : historyRecords.length === 0 ? (
            <p className="text-xs text-gray-500 text-center py-4">No revisions recorded for this entry.</p>
          ) : (
            <div className="space-y-2">
              {historyRecords.map((rec) => (
                <div key={rec.id} className="p-3 bg-gray-50 rounded border text-xs space-y-1">
                  <div className="flex items-center justify-between font-semibold text-gray-800">
                    <span>
                      {rec.previous_marks ?? '—'} ➔ {rec.new_marks} marks
                    </span>
                    <span className="text-[11px] text-gray-400 font-normal">
                      {new Date(rec.corrected_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="text-gray-600">
                    <strong className="text-gray-700">Reason:</strong> {rec.reason}
                  </p>
                  <p className="text-[11px] text-gray-400">
                    Corrected by: {rec.corrector?.full_name || rec.corrector?.email || 'Administrator'}
                  </p>
                </div>
              ))}
            </div>
          )}
          <div className="flex justify-end pt-2">
            <Button variant="outline" size="sm" onClick={() => setHistoryTarget(null)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Bulk Paste Modal */}
      <Modal
        isOpen={isBulkPasteOpen}
        onClose={() => setIsBulkPasteOpen(false)}
        title="Quick Paste Marks (Spreadsheet / CSV)"
      >
        <div className="space-y-4">
          <p className="text-xs text-gray-600">
            Paste tabular data copied from Excel, Sheets, or CSV. Each row should contain:
            <br />
            <code className="text-blue-600 font-mono">AdmissionNumber [TAB or COMMA] Marks</code>
          </p>

          <textarea
            rows={8}
            className="w-full text-xs font-mono rounded border border-gray-300 p-2.5 focus:border-blue-500 focus:outline-none"
            placeholder={`ADM001\t85\nADM002\t92\nADM003\t74`}
            value={pasteData}
            onChange={(e) => setPasteData(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" onClick={() => setIsBulkPasteOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleApplyBulkPaste}>
              Apply to Roster
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
