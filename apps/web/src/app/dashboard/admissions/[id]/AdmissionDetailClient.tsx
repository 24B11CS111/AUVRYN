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
  verifyStudentIdentityDocumentAction,
  requestMissingDocumentsAction,
  recordIdentityDocumentAccessAuditAction,
} from '../actions';
import {
  ArrowLeft,
  Clock,
  UserCheck,
  User,
  Users,
  FileText,
  History,
  ShieldCheck,
  ArrowRight,
  ExternalLink,
  HeartPulse,
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
  documents?: StudentDocumentRow[];
  identityDocuments: Array<{
    id: string;
    document_type: string;
    masked_reference: string;
    document_file_path: string;
    file_name: string;
    file_size: number;
    mime_type: string;
    issuing_authority?: string | null;
    verification_status: string;
    verification_notes?: string | null;
    verified_at?: string | null;
    signedUrl?: string | null;
  }>;
  emergencyContacts: any[];
  consentRecords: any[];
  academicYear?: AcademicYearRow;
  program?: AcademicProgramRow;
  targetClass?: AcademicClassRow;
  availableSections: AcademicSectionRow[];
  canManage: boolean;
  canVerifyIdentity: boolean;
}

export function AdmissionDetailClient({
  application,
  history,
  identityDocuments,
  emergencyContacts,
  consentRecords,
  academicYear,
  program,
  targetClass,
  availableSections,
  canManage,
  canVerifyIdentity,
}: AdmissionDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'overview' | 'identity' | 'parents' | 'emergency' | 'consents' | 'history'>('overview');

  // Status Modal State
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
  const [newStatus, setNewStatus] = useState<string>(application.status);
  const [statusRemarks, setStatusRemarks] = useState('');

  // Missing Docs Modal
  const [isMissingDocsModalOpen, setIsMissingDocsModalOpen] = useState(false);
  const [missingDocsNotes, setMissingDocsNotes] = useState('');

  // Conversion Modal State
  const [isConvertModalOpen, setIsConvertModalOpen] = useState(false);
  const [admissionNumber, setAdmissionNumber] = useState(
    `ADM-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
  );
  const [targetSectionId, setTargetSectionId] = useState(availableSections[0]?.id || '');
  const [rollNumber, setRollNumber] = useState('');

  // Verify Document Modal
  const [selectedDocForVerification, setSelectedDocForVerification] = useState<any | null>(null);
  const [docVerifStatus, setDocVerifStatus] = useState<'verified' | 'rejected'>('verified');
  const [docVerifNotes, setDocVerifNotes] = useState('');

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
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestMissingDocs = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await requestMissingDocumentsAction(application.id, missingDocsNotes);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to request missing documents.');
      } else {
        setSuccessMsg('Application status updated to Documents Pending.');
        setIsMissingDocsModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error updating status.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDocForVerification) return;

    setErrorMsg(null);
    setSuccessMsg(null);
    setIsSubmitting(true);

    try {
      const res = await verifyStudentIdentityDocumentAction({
        documentId: selectedDocForVerification.id,
        verificationStatus: docVerifStatus,
        verificationNotes: docVerifNotes || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to verify identity document.');
      } else {
        setSuccessMsg(`Document marked as ${docVerifStatus}.`);
        setSelectedDocForVerification(null);
        router.refresh();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error verifying document.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConversion = async (e: React.FormEvent) => {
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
        setErrorMsg(res.error || 'Failed to convert admission application.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMsg(`Application converted successfully! Student Admission No: ${admissionNumber}`);
      setIsConvertModalOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Error converting application.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge variant="info">Submitted</Badge>;
      case 'documents_pending':
        return <Badge variant="warning">Documents Pending</Badge>;
      case 'under_verification':
        return <Badge variant="warning">Under Verification</Badge>;
      case 'approved':
        return <Badge variant="success">Approved</Badge>;
      case 'rejected':
        return <Badge variant="danger">Rejected</Badge>;
      case 'enrolled':
        return <Badge variant="purple">Enrolled</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admissions"
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900 font-mono">
                {application.application_number}
              </h1>
              {getStatusBadge(application.status)}
              {application.education_type && (
                <Badge variant="info" className="capitalize">
                  {application.education_type.replace('_', ' ')}
                </Badge>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Applicant: <span className="font-semibold text-gray-800">{application.first_name} {application.last_name}</span> • Applied on {new Date(application.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        {canManage && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMissingDocsNotes(application.internal_remarks || '');
                setIsMissingDocsModalOpen(true);
              }}
            >
              Request Missing Docs
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setNewStatus(application.status);
                setStatusRemarks('');
                setIsStatusModalOpen(true);
              }}
            >
              Update Status
            </Button>

            {application.status === 'approved' && !application.converted_student_id && (
              <Button
                size="sm"
                className="bg-emerald-600 hover:bg-emerald-700 text-white flex items-center gap-1.5"
                onClick={() => setIsConvertModalOpen(true)}
              >
                <UserCheck className="w-4 h-4" />
                Complete Admission
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Alerts */}
      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {errorMsg && <Alert variant="error">{errorMsg}</Alert>}

      {/* Navigation Tabs */}
      <div className="flex border-b border-gray-200 gap-1 overflow-x-auto text-sm font-medium">
        {[
          { id: 'overview', label: 'Overview & Profile', icon: User },
          { id: 'identity', label: `Identity Documents (${identityDocuments.length})`, icon: ShieldCheck },
          { id: 'parents', label: 'Parents & Guardians', icon: Users },
          { id: 'emergency', label: `Emergency (${emergencyContacts.length})`, icon: HeartPulse },
          { id: 'consents', label: `DPDP Consents (${consentRecords.length})`, icon: FileText },
          { id: 'history', label: 'Timeline & History', icon: History },
        ].map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex items-center gap-2 px-4 py-2.5 border-b-2 font-medium transition whitespace-nowrap ${
                activeTab === t.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon className="w-4 h-4" />
              {t.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: OVERVIEW & PROFILE */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
                Student Personal Information
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Legal Full Name</span>
                  <span className="font-semibold text-gray-800 text-sm">
                    {application.first_name} {application.middle_name ? `${application.middle_name} ` : ''}{application.last_name}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Preferred Name</span>
                  <span className="font-medium text-gray-800">{application.preferred_name || '—'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Date of Birth</span>
                  <span className="font-medium text-gray-800">{application.date_of_birth}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Gender</span>
                  <span className="font-medium text-gray-800 capitalize">{application.gender}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Blood Group</span>
                  <span className="font-medium text-gray-800">{application.blood_group || 'Not provided'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Admission Category</span>
                  <span className="font-semibold text-blue-700 capitalize">{application.admission_category || 'General'}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100">
                <span className="text-gray-400 block text-[10px] uppercase mb-1">Residential Address</span>
                <p className="text-xs text-gray-700">
                  {application.address}, {application.city}, {application.state} - {application.postal_code}, {application.country}
                </p>
              </div>

              {(application.mother_tongue || application.second_language) && (
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-gray-100 text-xs">
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Mother Tongue</span>
                    <span className="font-medium text-gray-800">{application.mother_tongue || '—'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px] uppercase">Second Language</span>
                    <span className="font-medium text-gray-800">{application.second_language || '—'}</span>
                  </div>
                </div>
              )}
            </Card>

            {/* Academic Placement */}
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
                Academic Placement & Facilities
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Academic Year</span>
                  <span className="font-semibold text-gray-800">{academicYear?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Program / Stream</span>
                  <span className="font-semibold text-gray-800">{program?.name || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Target Grade / Class</span>
                  <span className="font-semibold text-gray-800">{targetClass?.name || 'Unassigned'}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Bus Transport</span>
                  <span className="font-medium text-gray-800">
                    {application.transport_required ? `Yes (${application.transport_pickup_stop || 'Stop TBD'})` : 'No'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Hostel Accommodation</span>
                  <span className="font-medium text-gray-800">
                    {application.hostel_required ? `Yes (${application.hostel_room_preference || 'Standard'})` : 'No'}
                  </span>
                </div>
              </div>
            </Card>
          </div>

          {/* Quick Actions & Converted Student Card */}
          <div className="space-y-6">
            {application.converted_student_id && (
              <Card className="p-5 border-l-4 border-emerald-500 bg-emerald-50/50 space-y-2">
                <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                  Enrolled Student Record
                </span>
                <p className="text-xs text-gray-700">
                  This application has been successfully converted into an active student record.
                </p>
                <Link
                  href={`/dashboard/students/${application.converted_student_id}`}
                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 underline flex items-center gap-1 mt-2"
                >
                  View Student Profile <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </Card>
            )}

            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                Internal Remarks
              </h3>
              <p className="text-xs text-gray-600 bg-gray-50 p-3 rounded border border-gray-200 min-h-[60px]">
                {application.internal_remarks || 'No internal remarks logged.'}
              </p>
            </Card>
          </div>
        </div>
      )}

      {/* TAB 2: IDENTITY DOCUMENTS & VERIFICATION */}
      {activeTab === 'identity' && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-base font-semibold text-gray-900">
                Identity Documents & Verification Review
              </h2>
              <p className="text-xs text-gray-500">
                Restricted to authorized admission personnel ({canVerifyIdentity ? 'Permission Granted' : 'View Restricted'}). Raw Aadhaar numbers are never stored.
              </p>
            </div>
            <Badge variant="info">{identityDocuments.length} Attachments</Badge>
          </div>

          <div className="space-y-4">
            {identityDocuments.map((doc) => (
              <div
                key={doc.id}
                className="p-4 border border-gray-200 rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gray-50/40"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-gray-900 capitalize">
                      {doc.document_type.replace('_', ' ')}
                    </span>
                    <Badge
                      variant={
                        doc.verification_status === 'verified'
                          ? 'success'
                          : doc.verification_status === 'rejected'
                          ? 'danger'
                          : 'warning'
                      }
                    >
                      {doc.verification_status}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-3">
                    <span>
                      Masked Identifier: <strong className="font-mono text-gray-800">{doc.masked_reference}</strong>
                    </span>
                    {doc.issuing_authority && (
                      <span className="text-gray-400">• Authority: {doc.issuing_authority}</span>
                    )}
                  </div>
                  {doc.verification_notes && (
                    <p className="text-[11px] text-gray-500 italic mt-1">
                      Notes: {doc.verification_notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {doc.signedUrl ? (
                    <a
                      href={doc.signedUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => recordIdentityDocumentAccessAuditAction(doc.id, 'download')}
                      className="px-3 py-1.5 bg-white border border-gray-300 rounded text-xs font-medium text-gray-700 hover:bg-gray-50 flex items-center gap-1.5 shadow-sm"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      View Document Copy
                    </a>
                  ) : (
                    <span className="text-xs text-gray-400 italic">No direct file preview</span>
                  )}

                  {canVerifyIdentity && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        setSelectedDocForVerification(doc);
                        setDocVerifStatus(doc.verification_status === 'verified' ? 'verified' : 'verified');
                        setDocVerifNotes(doc.verification_notes || '');
                      }}
                      className="text-xs"
                    >
                      Verify / Reject
                    </Button>
                  )}
                </div>
              </div>
            ))}

            {identityDocuments.length === 0 && (
              <p className="text-xs text-gray-500 italic text-center py-6">
                No dedicated identity documents attached to this application.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 3: PARENTS & GUARDIANS */}
      {activeTab === 'parents' && (
        <div className="space-y-6">
          <Card className="p-6 space-y-4">
            <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
              Primary Guardian
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Full Name</span>
                <span className="font-semibold text-gray-800">{application.primary_guardian_name}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Relationship</span>
                <span className="font-medium text-gray-800">{application.primary_guardian_relationship}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Primary Mobile</span>
                <span className="font-medium text-gray-800">{application.primary_guardian_phone}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Email Address</span>
                <span className="font-medium text-gray-800">{application.primary_guardian_email || '—'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px] uppercase">Occupation</span>
                <span className="font-medium text-gray-800">{application.primary_guardian_occupation || '—'}</span>
              </div>
            </div>
          </Card>

          {application.secondary_guardian_name && (
            <Card className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
                Secondary Guardian
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Full Name</span>
                  <span className="font-semibold text-gray-800">{application.secondary_guardian_name}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Relationship</span>
                  <span className="font-medium text-gray-800">{application.secondary_guardian_relationship}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Mobile</span>
                  <span className="font-medium text-gray-800">{application.secondary_guardian_phone}</span>
                </div>
                <div>
                  <span className="text-gray-400 block text-[10px] uppercase">Email</span>
                  <span className="font-medium text-gray-800">{application.secondary_guardian_email || '—'}</span>
                </div>
              </div>
            </Card>
          )}
        </div>
      )}

      {/* TAB 4: EMERGENCY CONTACTS & PICKUPS */}
      {activeTab === 'emergency' && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Emergency Contacts & Authorized Pickups
            </h2>
            <p className="text-xs text-gray-500">
              Designated responders in case of student illness or emergency dismissal.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {emergencyContacts.map((c) => (
              <div
                key={c.id}
                className={`p-4 border rounded-lg space-y-2 ${
                  c.priority === 'primary' ? 'border-rose-200 bg-rose-50/30' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-gray-900">{c.name}</span>
                  <Badge variant={c.priority === 'primary' ? 'danger' : 'default'}>
                    {c.priority}
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p>Relationship: <strong>{c.relationship}</strong></p>
                  <p>Phone: <strong>{c.phone_primary}</strong></p>
                  {c.is_authorized_pickup && (
                    <Badge variant="success" className="mt-1">Authorized for Pickup</Badge>
                  )}
                  {c.pickup_id_masked_ref && (
                    <p className="text-[11px] text-gray-500">ID Proof: {c.pickup_id_masked_ref}</p>
                  )}
                </div>
              </div>
            ))}

            {emergencyContacts.length === 0 && (
              <p className="text-xs text-gray-500 italic col-span-2 py-4">
                No separate emergency records stored.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 5: DPDP CONSENT RECORDS */}
      {activeTab === 'consents' && (
        <Card className="p-6 space-y-6">
          <div className="border-b pb-3">
            <h2 className="text-base font-semibold text-gray-900">
              Digital Personal Data Protection (DPDP) Consents
            </h2>
            <p className="text-xs text-gray-500">
              Immutable audit log of legal declarations, privacy notice acknowledgements, and unbundled optional consents.
            </p>
          </div>

          <div className="space-y-3">
            {consentRecords.map((cr) => (
              <div
                key={cr.id}
                className="p-4 border border-gray-200 rounded-lg flex items-center justify-between text-xs bg-gray-50/50"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-gray-900 uppercase">
                      {cr.consent_type.replace(/_/g, ' ')}
                    </span>
                    <Badge variant={cr.granted ? 'success' : 'default'}>
                      {cr.granted ? 'Granted' : 'Not Granted'}
                    </Badge>
                    {cr.withdrawn && <Badge variant="danger">Withdrawn</Badge>}
                  </div>
                  <p className="text-gray-500">
                    Granted by: <strong>{cr.granted_by_name}</strong> ({cr.granted_by_relationship}) • {new Date(cr.granted_at).toLocaleString()}
                  </p>
                  {cr.withdrawn && (
                    <p className="text-red-600 text-[11px]">
                      Withdrawn at {new Date(cr.withdrawn_at).toLocaleString()} • Reason: {cr.withdrawal_reason}
                    </p>
                  )}
                </div>
                <span className="text-[10px] font-mono text-gray-400">{cr.consent_version}</span>
              </div>
            ))}

            {consentRecords.length === 0 && (
              <p className="text-xs text-gray-500 italic text-center py-4">
                No consent records found for this application.
              </p>
            )}
          </div>
        </Card>
      )}

      {/* TAB 6: TIMELINE & HISTORY */}
      {activeTab === 'history' && (
        <Card className="p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">
            Status Transition History
          </h2>
          <div className="space-y-4">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="flex items-start gap-3 text-xs">
                <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5" />
                </div>
                <div className="space-y-0.5">
                  <p className="font-medium text-gray-800">
                    Status changed to <strong className="uppercase">{h.to_status}</strong>
                  </p>
                  <p className="text-gray-500">{h.remarks || 'No remarks logged.'}</p>
                  <span className="text-[10px] text-gray-400">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* MODAL: Verify Identity Document */}
      <Modal
        isOpen={!!selectedDocForVerification}
        onClose={() => setSelectedDocForVerification(null)}
        title="Verify Identity Document"
      >
        <form onSubmit={handleVerifyDocument} className="space-y-4 text-xs">
          <div>
            <span className="text-gray-500 block mb-1">Document:</span>
            <span className="font-bold text-gray-900 capitalize">
              {selectedDocForVerification?.document_type?.replace('_', ' ')}
            </span>
            <p className="font-mono text-gray-700 mt-1">
              Ref: {selectedDocForVerification?.masked_reference}
            </p>
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Verification Decision *</label>
            <Select
              value={docVerifStatus}
              onChange={(e) => setDocVerifStatus(e.target.value as any)}
              options={[
                { value: 'verified', label: 'Verify (Document Approved)' },
                { value: 'rejected', label: 'Reject (Document Invalid / Incomplete)' },
              ]}
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Verification Notes / Remarks</label>
            <Input
              placeholder="e.g. Verified with original municipal record"
              value={docVerifNotes}
              onChange={(e) => setDocVerifNotes(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setSelectedDocForVerification(null)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 text-white"
            >
              {isSubmitting ? 'Saving...' : 'Save Decision'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Request Missing Documents */}
      <Modal
        isOpen={isMissingDocsModalOpen}
        onClose={() => setIsMissingDocsModalOpen(false)}
        title="Request Missing Documents"
      >
        <form onSubmit={handleRequestMissingDocs} className="space-y-4 text-xs">
          <p className="text-gray-600">
            Specify the required documents or corrections needed from the parent/applicant. Application status will be updated to <strong>Documents Pending</strong>.
          </p>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Missing Document Notes *</label>
            <Input
              placeholder="e.g. Please upload clear copy of Transfer Certificate"
              value={missingDocsNotes}
              onChange={(e) => setMissingDocsNotes(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsMissingDocsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !missingDocsNotes.trim()}
              className="bg-yellow-600 hover:bg-yellow-700 text-white"
            >
              {isSubmitting ? 'Sending...' : 'Send Request'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Update Status */}
      <Modal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
        title="Update Application Status"
      >
        <form onSubmit={handleStatusUpdate} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Status *</label>
            <Select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              options={[
                { value: 'submitted', label: 'Submitted' },
                { value: 'under_verification', label: 'Under Verification' },
                { value: 'documents_pending', label: 'Documents Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
              ]}
            />
          </div>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Remarks</label>
            <Input
              placeholder="Internal status remarks"
              value={statusRemarks}
              onChange={(e) => setStatusRemarks(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsStatusModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-blue-600 text-white"
            >
              {isSubmitting ? 'Updating...' : 'Update Status'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: Complete Admission & Convert to Student */}
      <Modal
        isOpen={isConvertModalOpen}
        onClose={() => setIsConvertModalOpen(false)}
        title="Complete Admission & Enroll Student"
      >
        <form onSubmit={handleConversion} className="space-y-4 text-xs">
          <p className="text-gray-600">
            Converting this approved application creates an official student profile, establishes verified guardian linkages, and activates enrollment.
          </p>

          <div>
            <label className="block font-medium text-gray-700 mb-1">Official Admission Number *</label>
            <Input
              value={admissionNumber}
              onChange={(e) => setAdmissionNumber(e.target.value)}
              required
            />
          </div>

          {availableSections.length > 0 && (
            <div>
              <label className="block font-medium text-gray-700 mb-1">Assign Section</label>
              <Select
                value={targetSectionId}
                onChange={(e) => setTargetSectionId(e.target.value)}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...availableSections.map((s) => ({ value: s.id, label: s.name })),
                ]}
              />
            </div>
          )}

          <div>
            <label className="block font-medium text-gray-700 mb-1">Roll Number</label>
            <Input
              placeholder="e.g. 101"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsConvertModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting || !admissionNumber.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {isSubmitting ? 'Enrolling...' : 'Confirm Enrollment'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
