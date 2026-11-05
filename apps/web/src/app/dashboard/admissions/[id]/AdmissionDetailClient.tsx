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
import {
  updateAdmissionStatusAction,
  convertAdmissionToStudentAction,
} from '../actions';
import {
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  UserCheck,
  User,
  Users,
  School,
  FileText,
  History,
  ShieldCheck,
  ArrowRight,
} from 'lucide-react';
import type {
  AdmissionApplicationRow,
  AdmissionStatusHistoryRow,
  StudentDocumentRow,
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
} from '@edu-platform/database';

interface AdmissionDetailClientProps {
  application: AdmissionApplicationRow;
  history: AdmissionStatusHistoryRow[];
  documents: StudentDocumentRow[];
  academicYear?: AcademicYearRow;
  program?: AcademicProgramRow;
  targetClass?: AcademicClassRow;
  availableSections: AcademicSectionRow[];
  canManage: boolean;
}

export function AdmissionDetailClient({
  application,
  history,
  documents,
  academicYear,
  program,
  targetClass,
  availableSections,
  canManage,
}: AdmissionDetailClientProps) {
  const router = useRouter();

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(application.status);
  const [statusRemarks, setStatusRemarks] = useState('');

  // Conversion Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [admissionNumber, setAdmissionNumber] = useState(
    `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [targetSectionId, setTargetSectionId] = useState(availableSections[0]?.id || '');
  const [rollNumber, setRollNumber] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleStatusUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await updateAdmissionStatusAction(application.id, {
        status: newStatus as any,
        remarks: statusRemarks || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to update application status.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Application status updated to ${newStatus}.`);
      setIsStatusModalOpen(false);
      setStatusRemarks('');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConvertSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await convertAdmissionToStudentAction({
        applicationId: application.id,
        admissionNumber: admissionNumber.trim(),
        sectionId: targetSectionId || undefined,
        rollNumber: rollNumber.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to convert application to student.');
        setIsSubmitting(false);
        return;
      }

      const resultData = res.data as any;
      setSuccessMsg(
        `Successfully converted applicant to enrolled student! Generated Student ID: ${resultData.student_id}`
      );
      setIsConvertModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="default"><Clock className="w-3.5 h-3.5 mr-1 inline" /> Submitted</Badge>;
      case 'received':
        return <Badge variant="outline"><Clock className="w-3.5 h-3.5 mr-1 inline" /> Received</Badge>;
      case 'documents_pending':
        return <Badge variant="warning"><AlertCircle className="w-3.5 h-3.5 mr-1 inline" /> Documents Pending</Badge>;
      case 'under_verification':
        return <Badge variant="warning"><Clock className="w-3.5 h-3.5 mr-1 inline" /> Under Verification</Badge>;
      case 'approved':
        return <Badge variant="success"><CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Approved</Badge>;
      case 'confirmed':
        return <Badge variant="success"><CheckCircle2 className="w-3.5 h-3.5 mr-1 inline" /> Confirmed</Badge>;
      case 'enrolled':
        return <Badge variant="info"><UserCheck className="w-3.5 h-3.5 mr-1 inline" /> Enrolled</Badge>;
      case 'rejected':
        return <Badge variant="danger"><XCircle className="w-3.5 h-3.5 mr-1 inline" /> Rejected</Badge>;
      case 'waitlisted':
        return <Badge variant="outline">Waitlisted</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const isEnrolled = application.status === 'enrolled' || Boolean(application.converted_student_id);

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      {/* Top Breadcrumb & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Link
            href="/dashboard/admissions"
            className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Admissions List
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {application.first_name} {application.middle_name ? `${application.middle_name} ` : ''}{application.last_name}
            </h1>
            <div>{getStatusBadge(application.status)}</div>
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Application #: {application.application_number} • Submitted: {new Date(application.created_at).toLocaleString()}
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            {!isEnrolled && (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setNewStatus(application.status);
                    setIsStatusModalOpen(true);
                  }}
                  className="flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-4 h-4" />
                  Update Status
                </Button>

                {['approved', 'confirmed'].includes(application.status) && (
                  <Button
                    onClick={() => setIsConvertModalOpen(true)}
                    className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                  >
                    <UserCheck className="w-4 h-4" />
                    Convert to Enrolled Student
                  </Button>
                )}
              </>
            )}

            {isEnrolled && application.converted_student_id && (
              <Link href={`/dashboard/students/${application.converted_student_id}`}>
                <Button className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4" />
                  View Enrolled Student Profile
                </Button>
              </Link>
            )}
          </div>
        )}
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

      {/* Conversion Banner if Enrolled */}
      {isEnrolled && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-semibold text-emerald-900">Application Converted & Enrolled</p>
              <p className="text-xs text-emerald-700">
                This prospective applicant has been officially admitted and converted into a student.
              </p>
            </div>
          </div>
          {application.converted_student_id && (
            <Link href={`/dashboard/students/${application.converted_student_id}`}>
              <Button size="sm" variant="outline" className="border-emerald-300 text-emerald-800 hover:bg-emerald-100">
                Open Student Profile
                <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          )}
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Target Academic Preference */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <School className="w-4 h-4 text-indigo-600" />
              Academic Target & Program Placement
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Academic Year</span>
                <span className="font-medium text-slate-900">{academicYear?.name || 'Unspecified'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Target Program</span>
                <span className="font-medium text-slate-900">
                  {program ? `${program.name} (${program.code})` : 'Unspecified'}
                </span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Applied Class / Grade</span>
                <span className="font-medium text-slate-900">{targetClass?.name || 'General Admission'}</span>
              </div>
            </div>
          </Card>

          {/* Applicant Demographics */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <User className="w-4 h-4 text-indigo-600" />
              Applicant Personal & Contact Information
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Date of Birth</span>
                <span className="font-medium text-slate-900">{application.date_of_birth}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Gender</span>
                <span className="font-medium text-slate-900 capitalize">{application.gender}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Blood Group</span>
                <span className="font-medium text-slate-900">{application.blood_group || 'N/A'}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Nationality</span>
                <span className="font-medium text-slate-900">{application.nationality || 'Domestic'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-3 border-t border-slate-100 text-sm">
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Phone Number</span>
                <span className="font-mono font-medium text-slate-900">{application.phone}</span>
              </div>
              <div>
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Email Address</span>
                <span className="font-medium text-slate-900">{application.email || 'None provided'}</span>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-sm">
              <span className="text-xs text-slate-500 uppercase tracking-wider block">Residential Address</span>
              <p className="font-medium text-slate-900 mt-0.5">
                {[
                  application.address,
                  application.city,
                  application.state,
                  application.postal_code,
                  application.country,
                ]
                  .filter(Boolean)
                  .join(', ') || 'No residential address recorded.'}
              </p>
            </div>
          </Card>

          {/* Guardian Information */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <Users className="w-4 h-4 text-indigo-600" />
              Guardian Details
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                  Primary Guardian ({application.primary_guardian_relationship})
                </span>
                <p className="font-bold text-slate-900 text-base">{application.primary_guardian_name}</p>
                <div className="mt-2 text-xs space-y-1 text-slate-600">
                  <p>Phone: <span className="font-mono text-slate-900">{application.primary_guardian_phone}</span></p>
                  {application.primary_guardian_email && (
                    <p>Email: <span className="text-slate-900">{application.primary_guardian_email}</span></p>
                  )}
                  {application.primary_guardian_occupation && (
                    <p>Occupation: <span className="text-slate-900">{application.primary_guardian_occupation}</span></p>
                  )}
                </div>
              </div>

              {application.secondary_guardian_name ? (
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-1">
                    Secondary Guardian ({application.secondary_guardian_relationship || 'Relation'})
                  </span>
                  <p className="font-bold text-slate-900 text-base">{application.secondary_guardian_name}</p>
                  <div className="mt-2 text-xs space-y-1 text-slate-600">
                    {application.secondary_guardian_phone && (
                      <p>Phone: <span className="font-mono text-slate-900">{application.secondary_guardian_phone}</span></p>
                    )}
                    {application.secondary_guardian_email && (
                      <p>Email: <span className="text-slate-900">{application.secondary_guardian_email}</span></p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 rounded-lg border border-dashed border-slate-200 flex items-center justify-center text-xs text-slate-400">
                  No secondary guardian registered
                </div>
              )}
            </div>
          </Card>

          {/* Previous Education Details */}
          {(application.previous_school_name || application.previous_grade_or_score) && (
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3 border-b pb-2">
                <School className="w-4 h-4 text-indigo-600" />
                Previous Educational Record
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Institute / School</span>
                  <span className="font-medium text-slate-900">{application.previous_school_name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wider block">Previous Score / GPA</span>
                  <span className="font-medium text-slate-900">{application.previous_grade_or_score || 'N/A'}</span>
                </div>
              </div>
            </Card>
          )}

          {/* Attached Documents */}
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-3 border-b pb-2">
              <FileText className="w-4 h-4 text-indigo-600" />
              Attached Application Documents ({documents.length})
            </h3>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs"
                >
                  <div>
                    <p className="font-semibold text-slate-900">{doc.title}</p>
                    <p className="text-slate-500 font-mono mt-0.5">{doc.file_name} • {doc.document_type}</p>
                  </div>
                  <Badge variant={doc.verification_status === 'verified' ? 'success' : 'warning'}>
                    {doc.verification_status}
                  </Badge>
                </div>
              ))}

              {documents.length === 0 && (
                <p className="text-xs text-slate-500 py-3 text-center">
                  No uploaded compliance documents linked to this application.
                </p>
              )}
            </div>
          </Card>
        </div>

        {/* Right 1 Col: Status Progression History Trail */}
        <div className="space-y-6">
          <Card className="p-5">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
              <History className="w-4 h-4 text-indigo-600" />
              Status Progression History
            </h3>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {history.map((h, idx) => (
                <div key={h.id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-indigo-600 ring-4 ring-white" />
                  <div className="text-xs">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {h.from_status && (
                        <>
                          <span className="font-semibold text-slate-600">{h.from_status}</span>
                          <span className="text-slate-400">→</span>
                        </>
                      )}
                      <span className="font-bold text-slate-900 uppercase tracking-wider">{h.to_status}</span>
                    </div>
                    {h.remarks && (
                      <p className="text-slate-600 mt-1 italic bg-slate-50 p-2 rounded border border-slate-100">
                        {h.remarks}
                      </p>
                    )}
                    <span className="text-[11px] text-slate-400 block mt-1">
                      {new Date(h.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}

              {history.length === 0 && (
                <p className="text-xs text-slate-400">No status transitions logged yet.</p>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Update Status Modal */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Application Lifecycle Status"
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4">
          <Select
            label="New Status *"
            value={newStatus}
            onChange={(e) => setNewStatus(e.target.value)}
            options={[
              { value: 'submitted', label: 'Submitted' },
              { value: 'received', label: 'Received' },
              { value: 'documents_pending', label: 'Documents Pending' },
              { value: 'under_verification', label: 'Under Verification' },
              { value: 'approved', label: 'Approved' },
              { value: 'waitlisted', label: 'Waitlisted' },
              { value: 'confirmed', label: 'Confirmed (Ready to enroll)' },
              { value: 'rejected', label: 'Rejected' },
            ]}
          />

          <Input
            label="Internal Remarks / Notes"
            placeholder="e.g. Verified previous school marksheets, approved for enrollment"
            value={statusRemarks}
            onChange={(e) => setStatusRemarks(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsStatusModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Updating...' : 'Save Status'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Convert to Student Modal */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Convert Application to Enrolled Student"
      >
        <form onSubmit={handleConvertSubmit} className="space-y-4">
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-lg text-xs text-emerald-900">
            This will atomically create a new <strong>Student Identity</strong> record, migrate primary guardian details, and establish an active <strong>Academic Enrollment</strong> in the target program.
          </div>

          <Input
            label="Official Student Admission Number *"
            placeholder="e.g. ADM-2026-0042"
            value={admissionNumber}
            onChange={(e) => setAdmissionNumber(e.target.value)}
            required
          />

          {availableSections.length > 0 && (
            <Select
              label="Assign Section (Optional)"
              value={targetSectionId}
              onChange={(e) => setTargetSectionId(e.target.value)}
              options={[
                { value: '', label: 'Select Section (Optional)' },
                ...availableSections.map((s) => ({ value: s.id, label: `Section ${s.name}` })),
              ]}
            />
          )}

          <Input
            label="Initial Roll Number (Optional)"
            placeholder="e.g. 101"
            value={rollNumber}
            onChange={(e) => setRollNumber(e.target.value)}
          />

          <div className="flex justify-end gap-3 pt-3">
            <Button variant="outline" type="button" onClick={() => setIsConvertModalOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              className="bg-emerald-600 hover:bg-emerald-700"
              disabled={isSubmitting || !admissionNumber.trim()}
            >
              {isSubmitting ? 'Converting...' : 'Confirm Enrollment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
