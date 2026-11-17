'use client';

import React, { useState, useEffect } from 'react';
import {
  listAIDraftsAction,
  reviewAIDraftAction,
  updateDraftContentAction,
} from '@/app/actions/aiActions';
import type { AIDraftStatus, AITaskType } from '@edu-platform/types';
import {
  CheckCircle2,
  XCircle,
  Clock,
  Edit3,
  Save,
  Loader2,
  AlertCircle,
  FileText,
  RotateCcw,
} from 'lucide-react';

export function AIDraftReviewHub() {
  const [drafts, setDrafts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDraft, setSelectedDraft] = useState<any | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Edit State
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState('');
  const [editedJsonString, setEditedJsonString] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Action State
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchDrafts = async () => {
    setLoading(true);
    const res = await listAIDraftsAction({
      status: statusFilter !== 'all' ? (statusFilter as AIDraftStatus) : undefined,
      taskType: typeFilter !== 'all' ? (typeFilter as AITaskType) : undefined,
    });
    setLoading(false);
    if (res.success && res.data) {
      setDrafts(res.data);
      if (res.data.length > 0 && !selectedDraft) {
        selectDraftItem(res.data[0]);
      } else if (res.data.length === 0) {
        setSelectedDraft(null);
      }
    }
  };

  useEffect(() => {
    fetchDrafts();
  }, [statusFilter, typeFilter]);

  const selectDraftItem = (item: any) => {
    setSelectedDraft(item);
    setIsEditing(false);
    setShowRejectBox(false);
    setEditedTitle(item.title);
    setEditedJsonString(JSON.stringify(item.content_json, null, 2));
  };

  const handleSaveEdit = async () => {
    if (!selectedDraft) return;
    try {
      const parsed = JSON.parse(editedJsonString);
      setIsSaving(true);
      const res = await updateDraftContentAction({
        draftId: selectedDraft.id,
        title: editedTitle,
        contentJson: parsed,
      });
      setIsSaving(false);
      if (res.success && res.data) {
        setSelectedDraft(res.data);
        setIsEditing(false);
        setNotification({ type: 'success', message: 'Draft content updated successfully.' });
        fetchDrafts();
      } else {
        setNotification({ type: 'error', message: res.error || 'Failed to update draft.' });
      }
    } catch {
      setNotification({ type: 'error', message: 'Invalid JSON syntax. Please verify before saving.' });
    }
  };

  const handleReview = async (status: 'approved' | 'rejected') => {
    if (!selectedDraft) return;
    if (status === 'rejected' && !rejectionReason.trim()) {
      setShowRejectBox(true);
      return;
    }

    setActionLoading(true);
    const res = await reviewAIDraftAction({
      draftId: selectedDraft.id,
      status,
      rejectionReason: status === 'rejected' ? rejectionReason : undefined,
    });
    setActionLoading(false);

    if (res.success && res.data) {
      setSelectedDraft(res.data);
      setShowRejectBox(false);
      setRejectionReason('');
      setNotification({
        type: 'success',
        message: `Draft marked as ${status.toUpperCase()} successfully.`,
      });
      fetchDrafts();
    } else {
      setNotification({ type: 'error', message: res.error || `Failed to mark as ${status}.` });
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold text-indigo-300 uppercase tracking-wider">
            Governance & Compliance
          </div>
          <h1 className="text-2xl font-bold tracking-tight">AI Drafts & Review Hub</h1>
          <p className="text-xs text-slate-300 mt-1">
            Review, edit, approve, and audit all AI-generated educational materials and exams.
          </p>
        </div>

        <button
          type="button"
          onClick={() => fetchDrafts()}
          className="px-3.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition border border-white/20 self-start sm:self-auto"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>Refresh</span>
        </button>
      </div>

      {/* Safety Notice */}
      <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/70 text-xs text-amber-900 flex items-start gap-2.5">
        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <strong className="font-semibold">Review Guardrail: </strong>
          No AI-generated draft is ever automatically published as an official school record.
          Educators must verify factual accuracy, age-appropriateness, and curriculum compliance.
        </div>
      </div>

      {/* Notification Toast */}
      {notification && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-center justify-between ${
            notification.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-red-50 border-red-200 text-red-900'
          }`}
        >
          <span>{notification.message}</span>
          <button type="button" onClick={() => setNotification(null)} className="font-bold ml-2">✕</button>
        </div>
      )}

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-white border border-slate-200 rounded-xl text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="all">All Statuses</option>
            <option value="draft">Pending Review (Draft)</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-600">Task Type:</span>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-slate-800"
          >
            <option value="all">All Content Types</option>
            <option value="lesson_plan">Lesson Plans</option>
            <option value="exam_paper_draft">Exam Papers</option>
            <option value="rubric_generation">Rubrics</option>
            <option value="assignment_draft">Assignments</option>
            <option value="mcq_generation">Question Banks</option>
            <option value="report_generation">Executive Reports</option>
          </select>
        </div>
      </div>

      {/* Two Column Layout: Drafts List & Preview/Review Pane */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Drafts List */}
        <div className="lg:col-span-5 space-y-3">
          <div className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center justify-between">
            <span>Generated Items ({drafts.length})</span>
            {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-600" />}
          </div>

          <div className="space-y-2 max-h-[640px] overflow-y-auto pr-1">
            {drafts.length === 0 && !loading && (
              <div className="p-8 text-center bg-white border border-slate-200 rounded-xl text-xs text-slate-500">
                No generated drafts found matching the selected filters.
              </div>
            )}

            {drafts.map((d) => {
              const isSelected = selectedDraft?.id === d.id;
              let badgeColor = 'bg-amber-100 text-amber-800 border-amber-200';
              if (d.status === 'approved') badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200';
              if (d.status === 'rejected') badgeColor = 'bg-red-100 text-red-800 border-red-200';

              return (
                <div
                  key={d.id}
                  onClick={() => selectDraftItem(d)}
                  className={`p-3.5 rounded-xl border text-left cursor-pointer transition ${
                    isSelected
                      ? 'border-indigo-600 bg-indigo-50/50 shadow-xs ring-1 ring-indigo-500/30'
                      : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 text-slate-600">
                      {d.task_type.replace(/_/g, ' ')}
                    </span>
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${badgeColor}`}>
                      {d.status}
                    </span>
                  </div>

                  <h4 className="text-xs font-bold text-slate-900 line-clamp-1">{d.title}</h4>
                  <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(d.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Selected Draft Preview & Action Pane */}
        <div className="lg:col-span-7">
          {selectedDraft ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 shadow-xs">
              {/* Header */}
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-3 border-b border-slate-200 gap-2">
                <div>
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {selectedDraft.task_type.replace(/_/g, ' ')}
                  </div>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      className="px-2 py-1 text-sm font-bold text-slate-900 border border-slate-300 rounded-lg w-full mt-1"
                    />
                  ) : (
                    <h3 className="text-base font-bold text-slate-900">{selectedDraft.title}</h3>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {isEditing ? (
                    <button
                      type="button"
                      onClick={handleSaveEdit}
                      disabled={isSaving}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 flex items-center gap-1 transition disabled:opacity-50"
                    >
                      {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                      Save Edits
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="px-3 py-1.5 border border-slate-300 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 flex items-center gap-1 transition"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                      Edit Content
                    </button>
                  )}
                </div>
              </div>

              {/* Status & Review Metadata */}
              <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
                <div className="flex items-center justify-between">
                  <span>Current Review Status: <strong className="uppercase">{selectedDraft.status}</strong></span>
                  <span>Created: {new Date(selectedDraft.created_at).toLocaleString()}</span>
                </div>
                {selectedDraft.rejection_reason && (
                  <div className="text-red-700 font-medium">
                    Rejection Reason: {selectedDraft.rejection_reason}
                  </div>
                )}
              </div>

              {/* Content Preview / Editor */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Draft Payload (Structured JSON)
                </label>
                {isEditing ? (
                  <textarea
                    value={editedJsonString}
                    onChange={(e) => setEditedJsonString(e.target.value)}
                    className="w-full h-80 p-3 font-mono text-[11px] bg-slate-900 text-emerald-400 rounded-xl border border-slate-700 focus:outline-hidden"
                  />
                ) : (
                  <div className="w-full h-80 overflow-y-auto p-3 font-mono text-[11px] bg-slate-50 border border-slate-200 rounded-xl text-slate-800 whitespace-pre-wrap">
                    {JSON.stringify(selectedDraft.content_json, null, 2)}
                  </div>
                )}
              </div>

              {/* Action Buttons: Approve / Reject */}
              <div className="pt-3 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div className="text-xs text-slate-500">
                  Reviewed materials will be flagged as verified in the institutional repository.
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleReview('approved')}
                    disabled={actionLoading || selectedDraft.status === 'approved'}
                    className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-1.5 transition"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Approve Material</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      if (showRejectBox) {
                        handleReview('rejected');
                      } else {
                        setShowRejectBox(true);
                      }
                    }}
                    disabled={actionLoading || selectedDraft.status === 'rejected'}
                    className="px-4 py-2 bg-red-600 text-white rounded-xl text-xs font-semibold hover:bg-red-700 disabled:opacity-50 flex items-center gap-1.5 transition"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>{showRejectBox ? 'Confirm Rejection' : 'Reject Draft'}</span>
                  </button>
                </div>
              </div>

              {/* Rejection Reason Prompt */}
              {showRejectBox && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-xl space-y-2 text-xs">
                  <label className="block font-semibold text-red-900">
                    Reason for Rejection (Required for audit trail)
                  </label>
                  <input
                    type="text"
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="e.g. Factual error in kinematic derivation; needs review"
                    className="w-full px-3 py-1.5 bg-white border border-red-300 rounded-lg text-slate-800"
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center text-slate-400 text-xs">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              Select a draft from the list to preview, edit, or approve.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
