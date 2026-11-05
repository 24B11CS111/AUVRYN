'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { uploadStaffDocumentAction, verifyStaffDocumentAction } from '../../actions';
import {
  ArrowLeft,
  FileText,
  UploadCloud,
  CheckCircle2,
  XCircle,
  Clock,
  ShieldCheck,
  FileCheck,
} from 'lucide-react';
import type { StaffProfileRow, StaffDocumentRow } from '@edu-platform/database';

interface StaffDocumentsClientProps {
  staff: StaffProfileRow;
  documents: StaffDocumentRow[];
  canManage: boolean;
}

const DOCUMENT_TYPES = [
  { value: 'qualification', label: 'Academic Qualification Certificate / Degree' },
  { value: 'experience', label: 'Prior Experience / Relieving Letter' },
  { value: 'identity', label: 'Government Identity Proof / Passport' },
  { value: 'contract', label: 'Signed Employment Contract' },
  { value: 'appointment_letter', label: 'Official Appointment Letter' },
  { value: 'other', label: 'Other Document' },
];

export function StaffDocumentsClient({
  staff,
  documents,
  canManage,
}: StaffDocumentsClientProps) {
  const router = useRouter();
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [verifyTarget, setVerifyTarget] = useState<StaffDocumentRow | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Upload Form State
  const [uploadData, setUploadData] = useState({
    title: '',
    documentType: 'qualification',
    fileName: '',
    fileSize: 1048576, // 1MB default
    mimeType: 'application/pdf',
    storagePath: '',
  });

  // Verify Form State
  const [verifyData, setVerifyData] = useState({
    status: 'verified' as 'verified' | 'rejected',
    notes: '',
    rejectionReason: '',
  });

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const generatedPath =
        uploadData.storagePath ||
        `staff/${staff.id}/${Date.now()}-${uploadData.fileName || 'doc.pdf'}`;

      const res = await uploadStaffDocumentAction({
        staffId: staff.id,
        documentType: uploadData.documentType as any,
        title: uploadData.title.trim(),
        fileName: uploadData.fileName.trim() || `${uploadData.title.toLowerCase().replace(/\s+/g, '_')}.pdf`,
        fileSize: uploadData.fileSize,
        mimeType: uploadData.mimeType,
        storagePath: generatedPath,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to upload document.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg('Staff document uploaded successfully and pending verification.');
      setIsUploadOpen(false);
      setUploadData({
        title: '',
        documentType: 'qualification',
        fileName: '',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storagePath: '',
      });
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifyTarget) return;
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const notesToSubmit =
        verifyData.status === 'rejected'
          ? `Rejected: ${verifyData.rejectionReason || 'Requirements not met'}`
          : verifyData.notes || undefined;

      const res = await verifyStaffDocumentAction(verifyTarget.id, staff.id, {
        verificationStatus: verifyData.status,
        verificationNotes: notesToSubmit,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to verify staff document.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(
        `Document ${verifyData.status === 'verified' ? 'verified successfully' : 'marked as rejected'}.`
      );
      setVerifyTarget(null);
      setVerifyData({ status: 'verified', notes: '', rejectionReason: '' });
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'verified':
        return <Badge variant="success"><CheckCircle2 className="w-3 h-3 mr-1 inline" /> Verified</Badge>;
      case 'rejected':
        return <Badge variant="danger"><XCircle className="w-3 h-3 mr-1 inline" /> Rejected</Badge>;
      default:
        return <Badge variant="warning"><Clock className="w-3 h-3 mr-1 inline" /> Pending</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href={`/dashboard/staff/${staff.id}`}
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Staff Profile
          </Link>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Staff Qualification & Compliance Documents
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Institutional verification documents for <span className="font-semibold text-slate-900">{staff.first_name} {staff.last_name}</span> ({staff.employee_id}).
          </p>
        </div>

        <Button onClick={() => setIsUploadOpen(true)} className="flex items-center gap-2">
          <UploadCloud className="w-4 h-4" />
          Upload Document
        </Button>
      </div>

      {errorMsg && (
        <Alert variant="error">
          {errorMsg}
        </Alert>
      )}

      {successMsg && (
        <Alert variant="success">
          {successMsg}
        </Alert>
      )}

      {/* Documents Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {documents.map((doc) => {
          const typeLabel = DOCUMENT_TYPES.find((t) => t.value === doc.document_type)?.label || doc.document_type;
          return (
            <Card key={doc.id} className="p-5 flex flex-col justify-between hover:shadow-md transition-shadow">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900 line-clamp-1">{doc.title}</h4>
                      <p className="text-xs text-slate-500">{typeLabel}</p>
                    </div>
                  </div>
                  <div>{getStatusBadge(doc.verification_status)}</div>
                </div>

                <div className="bg-slate-50 p-3 rounded-lg text-xs space-y-1.5 border border-slate-100 font-mono">
                  <div className="flex justify-between text-slate-600">
                    <span>File:</span>
                    <span className="font-medium text-slate-900 truncate max-w-[160px]">{doc.file_name}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Size:</span>
                    <span className="text-slate-800">
                      {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Path:</span>
                    <span className="text-slate-500 truncate max-w-[160px]">{doc.storage_path}</span>
                  </div>
                </div>

                {doc.verification_notes && (
                  <p className="text-xs text-slate-600 italic bg-amber-50/50 p-2 rounded border border-amber-100">
                    Verification Note: {doc.verification_notes}
                  </p>
                )}

                <div className="text-[11px] text-slate-400">
                  Uploaded on {new Date(doc.created_at).toLocaleDateString()}
                  {doc.verified_at && ` • Verified on ${new Date(doc.verified_at).toLocaleDateString()}`}
                </div>
              </div>

              {canManage && (
                <div className="pt-4 mt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVerifyTarget(doc);
                      setVerifyData({
                        status: 'verified',
                        notes: doc.verification_notes || '',
                        rejectionReason: '',
                      });
                    }}
                    className="text-xs h-8"
                  >
                    <ShieldCheck className="w-3.5 h-3.5 mr-1" />
                    Review Status
                  </Button>
                </div>
              )}
            </Card>
          );
        })}

        {documents.length === 0 && (
          <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-xl">
            <FileCheck className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-slate-800">No documents uploaded</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto mt-1 mb-4">
              Upload compliance documents like qualification degrees, appointment letters, or identity proof for verification.
            </p>
            <Button size="sm" onClick={() => setIsUploadOpen(true)}>
              <UploadCloud className="w-4 h-4 mr-2" />
              Upload Document Now
            </Button>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      <Modal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        title="Upload Staff Compliance Document"
      >
        <form onSubmit={handleUploadSubmit} className="space-y-4">
          <Input
            label="Document Title *"
            placeholder="e.g. Master of Science Degree Certificate"
            value={uploadData.title}
            onChange={(e) => setUploadData({ ...uploadData, title: e.target.value })}
            required
          />

          <Select
            label="Document Type *"
            value={uploadData.documentType}
            onChange={(e) => setUploadData({ ...uploadData, documentType: e.target.value })}
            options={DOCUMENT_TYPES}
          />

          <Input
            label="File Name *"
            placeholder="e.g. msc_degree_certificate.pdf"
            value={uploadData.fileName}
            onChange={(e) => setUploadData({ ...uploadData, fileName: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="File Size (Bytes)"
              type="number"
              value={uploadData.fileSize}
              onChange={(e) => setUploadData({ ...uploadData, fileSize: parseInt(e.target.value) || 0 })}
            />
            <Input
              label="MIME Type"
              value={uploadData.mimeType}
              onChange={(e) => setUploadData({ ...uploadData, mimeType: e.target.value })}
            />
          </div>

          <Input
            label="Storage Path (Optional override)"
            placeholder="Auto-generated if empty"
            value={uploadData.storagePath}
            onChange={(e) => setUploadData({ ...uploadData, storagePath: e.target.value })}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsUploadOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !uploadData.title || !uploadData.fileName}>
              {isSubmitting ? 'Recording...' : 'Save Document Record'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Review / Verify Modal */}
      <Modal
        isOpen={Boolean(verifyTarget)}
        onClose={() => setVerifyTarget(null)}
        title="Staff Document Verification Review"
      >
        {verifyTarget && (
          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
              <p className="font-semibold text-slate-900">{verifyTarget.title}</p>
              <p className="text-xs text-slate-500 font-mono mt-0.5">{verifyTarget.file_name}</p>
            </div>

            <Select
              label="Verification Decision *"
              value={verifyData.status}
              onChange={(e) => setVerifyData({ ...verifyData, status: e.target.value as any })}
              options={[
                { value: 'verified', label: 'Approve & Mark Verified' },
                { value: 'rejected', label: 'Reject Document' },
              ]}
            />

            {verifyData.status === 'rejected' ? (
              <Input
                label="Rejection Reason *"
                placeholder="e.g. Incomplete scan or seal missing"
                value={verifyData.rejectionReason}
                onChange={(e) => setVerifyData({ ...verifyData, rejectionReason: e.target.value })}
                required
              />
            ) : (
              <Input
                label="Verification Notes"
                placeholder="Optional verification remarks or accreditation check"
                value={verifyData.notes}
                onChange={(e) => setVerifyData({ ...verifyData, notes: e.target.value })}
              />
            )}

            <div className="flex justify-end gap-3 pt-3">
              <Button variant="outline" type="button" onClick={() => setVerifyTarget(null)}>
                Cancel
              </Button>
              <Button
                type="submit"
                variant={verifyData.status === 'rejected' ? 'danger' : 'primary'}
                disabled={isSubmitting || (verifyData.status === 'rejected' && !verifyData.rejectionReason)}
              >
                {isSubmitting ? 'Saving...' : 'Confirm Decision'}
              </Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
