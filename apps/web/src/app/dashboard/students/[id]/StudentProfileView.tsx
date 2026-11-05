'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Select';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { Alert } from '@/components/ui/Alert';
import { enrollStudentAction } from '../actions';
import {
  UserCheck,
  Calendar,
  Phone,
  Mail,
  MapPin,
  ShieldAlert,
  Users,
  GraduationCap,
  FileText,
  Edit3,
  Plus,
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import type {
  StudentRow,
  GuardianRow,
  StudentGuardianRow,
  StudentEnrollmentRow,
  StudentDocumentRow,
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
} from '@edu-platform/database';
import type { StudentStatus, EnrollmentStatus, DocumentVerificationStatus } from '@edu-platform/types';

interface GuardianWithLink extends GuardianRow {
  link: StudentGuardianRow;
}

interface EnrollmentWithJoins extends StudentEnrollmentRow {
  academicYear?: AcademicYearRow | null;
  program?: AcademicProgramRow | null;
  class?: AcademicClassRow | null;
  section?: AcademicSectionRow | null;
}

interface StudentProfileViewProps {
  student: StudentRow;
  guardians: GuardianWithLink[];
  enrollments: EnrollmentWithJoins[];
  documents: StudentDocumentRow[];
  academicYears: AcademicYearRow[];
  programs: AcademicProgramRow[];
  classes: AcademicClassRow[];
  sections: AcademicSectionRow[];
  canManage: boolean;
}

export function StudentProfileView({
  student,
  guardians,
  enrollments,
  documents,
  academicYears,
  programs,
  classes,
  sections,
  canManage,
}: StudentProfileViewProps) {
  const router = useRouter();
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [enrollError, setEnrollError] = useState<string | null>(null);

  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];

  const [enrollData, setEnrollData] = useState({
    academicYearId: currentYear?.id || '',
    programId: programs[0]?.id || '',
    classId: classes[0]?.id || '',
    sectionId: '',
    rollNumber: '',
    status: 'enrolled' as EnrollmentStatus,
    enrollmentDate: new Date().toISOString().split('T')[0],
  });

  const availableClasses = classes.filter((c) =>
    enrollData.programId ? c.program_id === enrollData.programId : true
  );

  const availableSections = sections.filter((s) =>
    enrollData.classId ? s.class_id === enrollData.classId : true
  );

  const handleEnroll = async (e: React.FormEvent) => {
    e.preventDefault();
    setEnrollError(null);
    setIsSubmitting(true);

    try {
      const res = await enrollStudentAction({
        studentId: student.id,
        academicYearId: enrollData.academicYearId,
        programId: enrollData.programId,
        classId: enrollData.classId,
        sectionId: enrollData.sectionId || undefined,
        rollNumber: enrollData.rollNumber || undefined,
        status: enrollData.status,
        enrollmentDate: enrollData.enrollmentDate,
      });

      if (!res.success) {
        setEnrollError(res.error || 'Failed to create enrollment.');
      } else {
        setIsEnrollModalOpen(false);
        router.refresh();
      }
    } catch (err: any) {
      setEnrollError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusBadge = (status: StudentStatus) => {
    switch (status) {
      case 'active':
        return <Badge variant="success">Active</Badge>;
      case 'inactive':
        return <Badge variant="default">Inactive</Badge>;
      case 'suspended':
        return <Badge variant="danger">Suspended</Badge>;
      case 'alumni':
        return <Badge variant="purple">Alumni</Badge>;
      case 'withdrawn':
      case 'transferred':
        return <Badge variant="warning">{status}</Badge>;
      default:
        return <Badge variant="default">{status}</Badge>;
    }
  };

  const getDocStatusBadge = (status: DocumentVerificationStatus) => {
    switch (status) {
      case 'verified':
        return (
          <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold text-xs">
            <CheckCircle className="w-3.5 h-3.5" /> Verified
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 text-rose-600 font-semibold text-xs">
            <XCircle className="w-3.5 h-3.5" /> Rejected
          </span>
        );
      case 'pending':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-amber-600 font-semibold text-xs">
            <Clock className="w-3.5 h-3.5" /> Pending Verification
          </span>
        );
    }
  };

  const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
  const currentEnrollment = enrollments[0];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard/students"
            className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Students Directory
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{fullName}</h1>
            {getStatusBadge(student.status)}
          </div>
          <p className="text-xs font-mono text-slate-500 mt-1">
            Admission No: <span className="font-semibold text-slate-800">{student.admission_number}</span> • Joined:{' '}
            <span>{student.date_of_joining}</span>
          </p>
        </div>

        {canManage && (
          <div className="flex items-center gap-2">
            <Link href={`/dashboard/students/${student.id}/edit`}>
              <Button size="sm" variant="outline">
                <Edit3 className="w-4 h-4 mr-1.5" />
                Edit Profile
              </Button>
            </Link>
            <Button size="sm" onClick={() => setIsEnrollModalOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              New Enrollment
            </Button>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Student Details */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <UserCheck className="w-5 h-5 text-indigo-600" />
              <h2 className="text-sm font-bold text-slate-900">Demographic Details</h2>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Gender:</span>
                <span className="font-semibold text-slate-800 capitalize">
                  {student.gender.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Date of Birth:</span>
                <span className="font-semibold text-slate-800">{student.date_of_birth}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Blood Group:</span>
                <span className="font-semibold text-slate-800">{student.blood_group || 'Not Specified'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Nationality:</span>
                <span className="font-semibold text-slate-800">{student.nationality}</span>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-100 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-slate-400">Phone</div>
                  <div className="font-semibold text-slate-800">{student.phone || 'No Phone Recorded'}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-slate-400">Email</div>
                  <div className="font-semibold text-slate-800">{student.email || 'No Email Recorded'}</div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <div className="text-[11px] text-slate-400">Address</div>
                  <div className="font-medium text-slate-800 leading-snug">
                    {[student.address, student.city, student.state, student.country, student.postal_code]
                      .filter(Boolean)
                      .join(', ') || 'No Address Recorded'}
                  </div>
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="mt-5 pt-4 border-t border-slate-100">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-rose-700 mb-2">
                <ShieldAlert className="w-4 h-4" /> Emergency Contact
              </div>
              <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-3 text-xs space-y-1">
                <div className="font-bold text-slate-900">{student.emergency_contact_name}</div>
                <div className="text-slate-600">Relationship: {student.emergency_contact_relationship}</div>
                <div className="font-mono text-slate-800">{student.emergency_contact_phone}</div>
              </div>
            </div>
          </Card>

          {/* Linked Guardians Box */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Parents & Guardians</h2>
              </div>
              {canManage && (
                <Link
                  href={`/dashboard/students/${student.id}/guardians`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Manage
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {guardians.length > 0 ? (
                guardians.map((g) => (
                  <div key={g.id} className="p-3 rounded-lg border border-slate-200/80 bg-slate-50/50 space-y-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900">
                        {g.first_name} {g.last_name}
                      </span>
                      {g.link.is_primary && <Badge variant="success">Primary</Badge>}
                    </div>
                    <div className="text-slate-500 font-medium">{g.link.relationship}</div>
                    <div className="font-mono text-slate-700">{g.phone}</div>
                    {g.email && <div className="text-slate-500 truncate">{g.email}</div>}
                    <div className="pt-1 flex items-center gap-2 text-[11px] text-slate-500">
                      {g.link.can_pickup && <span className="text-emerald-700 font-medium">• Authorized Pickup</span>}
                      {g.link.is_emergency_contact && <span className="text-rose-700 font-medium">• Emergency Contact</span>}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No guardians linked yet.{' '}
                  {canManage && (
                    <Link
                      href={`/dashboard/students/${student.id}/guardians`}
                      className="text-indigo-600 font-semibold underline block mt-1"
                    >
                      Link a parent or guardian
                    </Link>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column: Academic Enrollments & Documents */}
        <div className="lg:col-span-2 space-y-6">
          {/* Current Academic Session Callout */}
          <Card className="p-5 bg-gradient-to-r from-slate-50 to-indigo-50/30 border-indigo-100">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-lg bg-indigo-600 text-white shadow-xs">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-700">
                    Current Academic Placement
                  </span>
                  <h3 className="text-base font-bold text-slate-900 mt-0.5">
                    {currentEnrollment?.class ? currentEnrollment.class.name : 'No Current Active Enrollment'}
                  </h3>
                  <p className="text-xs text-slate-600 mt-0.5">
                    {currentEnrollment ? (
                      <>
                        Session: <span className="font-semibold text-slate-800">{currentEnrollment.academicYear?.name}</span> •{' '}
                        Section: <span className="font-semibold text-slate-800">{currentEnrollment.section?.name || 'Unassigned'}</span> •{' '}
                        Roll No: <span className="font-mono font-semibold">{currentEnrollment.roll_number || 'N/A'}</span>
                      </>
                    ) : (
                      'Student is not enrolled in any academic class for the current session.'
                    )}
                  </p>
                </div>
              </div>

              {canManage && (
                <Button size="sm" variant="outline" onClick={() => setIsEnrollModalOpen(true)}>
                  New Placement
                </Button>
              )}
            </div>
          </Card>

          {/* Complete Enrollment Progression History */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Academic Progression & History</h2>
              </div>
              <Badge variant="outline">{enrollments.length} Recorded Sessions</Badge>
            </div>

            <div className="space-y-3">
              {enrollments.length > 0 ? (
                enrollments.map((enr) => (
                  <div
                    key={enr.id}
                    className="p-4 rounded-xl border border-slate-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">
                          {enr.class?.name || 'Class Record'}
                        </span>
                        <Badge variant="default" className="capitalize">
                          {enr.status}
                        </Badge>
                      </div>
                      <p className="text-slate-500 mt-0.5">
                        Program: <span className="font-medium text-slate-700">{enr.program?.name}</span> • Academic Year:{' '}
                        <span className="font-medium text-slate-700">{enr.academicYear?.name}</span>
                      </p>
                      <div className="flex items-center gap-3 mt-2 text-slate-600">
                        <span>Section: {enr.section?.name || 'General'}</span>
                        <span>Roll No: {enr.roll_number || 'N/A'}</span>
                        <span>Enrolled on: {enr.enrollment_date}</span>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No academic enrollment records found.
                </div>
              )}
            </div>
          </Card>

          {/* Student Documents */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h2 className="text-sm font-bold text-slate-900">Student Documents</h2>
              </div>
              {canManage && (
                <Link
                  href={`/dashboard/students/${student.id}/documents`}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700"
                >
                  Upload & Verify
                </Link>
              )}
            </div>

            <div className="space-y-3">
              {documents.length > 0 ? (
                documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3.5 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{doc.title}</div>
                      <div className="text-slate-500 capitalize">
                        Type: {doc.document_type.replace('_', ' ')} • {doc.file_name}
                      </div>
                    </div>
                    <div>{getDocStatusBadge(doc.verification_status)}</div>
                  </div>
                ))
              ) : (
                <div className="text-center py-6 text-slate-400 text-xs">
                  No documents uploaded for this student yet.{' '}
                  {canManage && (
                    <Link
                      href={`/dashboard/students/${student.id}/documents`}
                      className="text-indigo-600 font-semibold underline block mt-1"
                    >
                      Upload verification documents
                    </Link>
                  )}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* New Enrollment Modal */}
      <Modal
        isOpen={isEnrollModalOpen}
        onClose={() => setIsEnrollModalOpen(false)}
        title="Promote or Enroll Student in Class"
        description="Assign student to an academic session, cohort, and section."
      >
        <form onSubmit={handleEnroll} className="space-y-4">
          {enrollError && <Alert variant="error">{enrollError}</Alert>}

          <Select
            label="Academic Year"
            value={enrollData.academicYearId}
            onChange={(e) => setEnrollData({ ...enrollData, academicYearId: e.target.value })}
            options={academicYears.map((y) => ({
              value: y.id,
              label: `${y.name} (${y.code}) ${y.is_current ? '• Current' : ''}`,
            }))}
            required
          />

          <Select
            label="Curriculum / Program Track"
            value={enrollData.programId}
            onChange={(e) => setEnrollData({ ...enrollData, programId: e.target.value })}
            options={programs.map((p) => ({
              value: p.id,
              label: `${p.name} (${p.code})`,
            }))}
            required
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Class / Grade"
              value={enrollData.classId}
              onChange={(e) => setEnrollData({ ...enrollData, classId: e.target.value })}
              options={availableClasses.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.code})`,
              }))}
              required
            />

            <Select
              label="Section (Optional)"
              value={enrollData.sectionId}
              onChange={(e) => setEnrollData({ ...enrollData, sectionId: e.target.value })}
              options={[
                { value: '', label: 'Unassigned Section' },
                ...availableSections.map((s) => ({
                  value: s.id,
                  label: `${s.name} (${s.code})`,
                })),
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Roll / Index Number (Optional)"
              placeholder="e.g. 01, R-102"
              value={enrollData.rollNumber}
              onChange={(e) => setEnrollData({ ...enrollData, rollNumber: e.target.value })}
            />

            <Select
              label="Enrollment Status"
              value={enrollData.status}
              onChange={(e) =>
                setEnrollData({ ...enrollData, status: e.target.value as EnrollmentStatus })
              }
              options={[
                { value: 'enrolled', label: 'Enrolled (Regular)' },
                { value: 'promoted', label: 'Promoted from Previous Class' },
                { value: 'retained', label: 'Retained / Repeating' },
                { value: 'transferred', label: 'Lateral / Transfer Entry' },
              ]}
            />
          </div>

          <Input
            type="date"
            label="Effective Enrollment Date"
            value={enrollData.enrollmentDate}
            onChange={(e) => setEnrollData({ ...enrollData, enrollmentDate: e.target.value })}
            required
          />

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsEnrollModalOpen(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" isLoading={isSubmitting}>
              Record Enrollment
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
