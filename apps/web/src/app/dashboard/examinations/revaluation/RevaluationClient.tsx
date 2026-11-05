'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import {
  RotateCcw,
  ArrowLeft,
  Edit3,
} from 'lucide-react';
import { reviewRevaluationAction } from '../actions';

interface RevaluationClientProps {
  initialRevaluations: any[];
  staff: any[];
  userRole: string;
}

export function RevaluationClient({
  initialRevaluations,
  userRole,
}: RevaluationClientProps) {
  const [revaluations, setRevaluations] = useState<any[]>(initialRevaluations);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [reviewTarget, setReviewTarget] = useState<any | null>(null);

  // Review Form state
  const [reviewForm, setReviewForm] = useState<{
    status: 'completed' | 'rejected' | 'under_review' | 'assigned';
    revisedMarks: string;
    reviewNotes: string;
    reviewerStaffId: string;
  }>({
    status: 'completed',
    revisedMarks: '',
    reviewNotes: '',
    reviewerStaffId: '',
  });

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const canReview = ['owner', 'admin', 'academic_admin', 'department_head', 'faculty'].includes(userRole);

  const filtered = useMemo(() => {
    return revaluations.filter((r) => {
      if (selectedStatus !== 'all' && r.status !== selectedStatus) {
        return false;
      }
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const studentName = `${r.student?.first_name || ''} ${r.student?.last_name || ''}`.toLowerCase();
        const admNo = r.student?.admission_number?.toLowerCase() || '';
        const examName = r.examination?.name?.toLowerCase() || '';
        const subName = r.subject?.name?.toLowerCase() || '';
        if (!studentName.includes(query) && !admNo.includes(query) && !examName.includes(query) && !subName.includes(query)) {
          return false;
        }
      }
      return true;
    });
  }, [revaluations, selectedStatus, searchQuery]);

  const stats = useMemo(() => {
    const total = revaluations.length;
    const pending = revaluations.filter((r) => ['applied', 'assigned', 'under_review'].includes(r.status)).length;
    const completed = revaluations.filter((r) => r.status === 'completed').length;
    const rejected = revaluations.filter((r) => r.status === 'rejected').length;
    return { total, pending, completed, rejected };
  }, [revaluations]);

  const handleOpenReview = (item: any) => {
    setReviewTarget(item);
    setReviewForm({
      status: 'completed',
      revisedMarks: item.revised_marks !== null && item.revised_marks !== undefined ? String(item.revised_marks) : String(item.original_marks),
      reviewNotes: item.review_notes || '',
      reviewerStaffId: item.reviewer?.id || '',
    });
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewTarget) return;

    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const revisedVal = reviewForm.revisedMarks !== '' ? Number(reviewForm.revisedMarks) : undefined;

      const res = await reviewRevaluationAction({
        revaluationId: reviewTarget.id,
        status: reviewForm.status,
        revisedMarks: revisedVal,
        reviewNotes: reviewForm.reviewNotes || undefined,
      });

      if (res.success && res.data) {
        setRevaluations((prev) =>
          prev.map((r) => (r.id === reviewTarget.id ? { ...r, ...res.data } : r))
        );
        setReviewTarget(null);
        setSuccessMsg('Revaluation review recorded successfully. Marks ledger updated.');
      } else {
        setErrorMsg(res.error || 'Failed to submit review');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'applied':
        return <Badge variant="info">Applied</Badge>;
      case 'assigned':
        return <Badge variant="warning">Assigned</Badge>;
      case 'under_review':
        return <Badge variant="purple">Under Review</Badge>;
      case 'completed':
        return <Badge variant="success">Completed</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
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
              Examination Revaluations & Retotalling
            </h1>
            <p className="text-xs text-gray-500 mt-0.5">
              Review re-evaluation requests, re-score answer sheets, and record audited marks revisions.
            </p>
          </div>
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

      {/* Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Total Applications</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Pending Review</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Completed / Revised</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">{stats.completed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-xs font-medium text-gray-500">Rejected</p>
            <p className="text-2xl font-bold text-red-600 mt-1">{stats.rejected}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search */}
      <Card>
        <CardContent className="p-4 flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Input
              placeholder="Search by student name, admission number, exam or subject..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs"
            />
          </div>
          <div className="w-full md:w-56">
            <Select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              options={[
                { value: 'all', label: 'All Statuses' },
                { value: 'applied', label: 'Applied' },
                { value: 'assigned', label: 'Assigned' },
                { value: 'under_review', label: 'Under Review' },
                { value: 'completed', label: 'Completed' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Revaluations List */}
      <Card>
        <CardHeader className="border-b pb-4 flex flex-row items-center justify-between">
          <CardTitle className="text-base font-semibold">
            Revaluation Applications ({filtered.length})
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <RotateCcw className="w-10 h-10 mx-auto text-gray-300" />
              <p className="text-sm font-medium text-gray-700 mt-2">No revaluation requests found</p>
              <p className="text-xs text-gray-400">
                Students can apply for revaluation after examination results are published.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-gray-600">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Examination & Subject</th>
                    <th className="px-4 py-3">Original Marks</th>
                    <th className="px-4 py-3">Revised Marks</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Reason</th>
                    <th className="px-4 py-3">Reviewer</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filtered.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3.5">
                        <p className="font-semibold text-gray-900">
                          {item.student?.first_name} {item.student?.last_name}
                        </p>
                        <p className="text-xs font-mono text-gray-400">
                          {item.student?.admission_number}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-xs">
                        <p className="font-medium text-gray-800">{item.examination?.name}</p>
                        <p className="text-gray-500">{item.subject?.name} ({item.subject?.code})</p>
                      </td>
                      <td className="px-4 py-3.5 text-xs font-semibold text-gray-700">
                        {item.original_marks}
                      </td>
                      <td className="px-4 py-3.5 text-xs font-bold text-gray-900">
                        {item.revised_marks !== null && item.revised_marks !== undefined ? (
                          <span className={item.revised_marks > item.original_marks ? 'text-emerald-600' : 'text-gray-900'}>
                            {item.revised_marks}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-4 py-3.5">
                        {getStatusBadge(item.status)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600 max-w-xs truncate" title={item.reason}>
                        {item.reason}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-gray-600">
                        {item.reviewer ? (
                          <span>{item.reviewer.first_name} {item.reviewer.last_name}</span>
                        ) : (
                          <span className="text-gray-400 italic">Unassigned</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        {canReview && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs"
                            onClick={() => handleOpenReview(item)}
                          >
                            <Edit3 className="w-3 h-3 mr-1" />
                            Review
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Review Modal */}
      <Modal
        isOpen={Boolean(reviewTarget)}
        onClose={() => setReviewTarget(null)}
        title="Review Revaluation Request"
      >
        <form onSubmit={handleSubmitReview} className="space-y-4">
          <div className="bg-gray-50 p-3 rounded text-xs space-y-1">
            <p>
              <strong className="text-gray-700">Candidate:</strong>{' '}
              {reviewTarget?.student?.first_name} {reviewTarget?.student?.last_name} ({reviewTarget?.student?.admission_number})
            </p>
            <p>
              <strong className="text-gray-700">Exam & Subject:</strong>{' '}
              {reviewTarget?.examination?.name} - {reviewTarget?.subject?.name}
            </p>
            <p>
              <strong className="text-gray-700">Original Marks:</strong> {reviewTarget?.original_marks}
            </p>
            <p>
              <strong className="text-gray-700">Student Reason:</strong> {reviewTarget?.reason}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Outcome Status <span className="text-red-500">*</span>
              </label>
              <Select
                value={reviewForm.status}
                onChange={(e) => setReviewForm({ ...reviewForm, status: e.target.value as any })}
                options={[
                  { value: 'completed', label: 'Completed (Marks Updated)' },
                  { value: 'under_review', label: 'Under Review' },
                  { value: 'rejected', label: 'Rejected (No Change)' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Revised Marks
              </label>
              <Input
                type="number"
                step="0.5"
                min="0"
                value={reviewForm.revisedMarks}
                onChange={(e) => setReviewForm({ ...reviewForm, revisedMarks: e.target.value })}
                disabled={reviewForm.status === 'rejected'}
                placeholder="Leave as original or update"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Reviewer Notes / Findings
            </label>
            <textarea
              rows={3}
              className="w-full text-xs rounded border border-gray-300 p-2 focus:border-blue-500 focus:outline-none"
              placeholder="e.g. Question 4(b) recount verified; 4 marks awarded..."
              value={reviewForm.reviewNotes}
              onChange={(e) => setReviewForm({ ...reviewForm, reviewNotes: e.target.value })}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <Button variant="outline" type="button" onClick={() => setReviewTarget(null)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Submitting...' : 'Complete Review'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
