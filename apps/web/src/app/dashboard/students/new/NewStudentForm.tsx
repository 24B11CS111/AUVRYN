'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { createStudentAction, enrollStudentAction } from '../actions';
import { ArrowLeft, UserPlus, UserCheck, GraduationCap, ShieldAlert } from 'lucide-react';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
  AcademicSectionRow,
} from '@edu-platform/database';
import type { StudentGender } from '@edu-platform/types';

interface NewStudentFormProps {
  academicYears: AcademicYearRow[];
  programs: AcademicProgramRow[];
  classes: AcademicClassRow[];
  sections: AcademicSectionRow[];
}

export function NewStudentForm({
  academicYears,
  programs,
  classes,
  sections,
}: NewStudentFormProps) {
  const router = useRouter();
  const currentYear = academicYears.find((y) => y.is_current) || academicYears[0];

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    admissionNumber: '',
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say' as StudentGender,
    bloodGroup: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
    nationality: 'Domestic',
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: 'Parent',
    dateOfJoining: new Date().toISOString().split('T')[0],
    // Enrollment fields
    shouldEnroll: true,
    academicYearId: currentYear?.id || '',
    programId: programs[0]?.id || '',
    classId: classes[0]?.id || '',
    sectionId: '',
    rollNumber: '',
  });

  const availableClasses = classes.filter((c) =>
    formData.programId ? c.program_id === formData.programId : true
  );

  const availableSections = sections.filter((s) =>
    formData.classId ? s.class_id === formData.classId : true
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const studentRes = await createStudentAction({
        admissionNumber: formData.admissionNumber,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup || undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postalCode: formData.postalCode || undefined,
        nationality: formData.nationality,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
        dateOfJoining: formData.dateOfJoining,
      });

      if (!studentRes.success || !studentRes.data) {
        setFormError(studentRes.error || 'Failed to create student record.');
        setIsSubmitting(false);
        return;
      }

      const newStudent = studentRes.data as any;

      // Initial academic enrollment if selected
      if (formData.shouldEnroll && formData.academicYearId && formData.programId && formData.classId) {
        await enrollStudentAction({
          studentId: newStudent.id,
          academicYearId: formData.academicYearId,
          programId: formData.programId,
          classId: formData.classId,
          sectionId: formData.sectionId || undefined,
          rollNumber: formData.rollNumber || undefined,
          status: 'enrolled',
          enrollmentDate: formData.dateOfJoining,
        });
      }

      router.push(`/dashboard/students/${newStudent.id}`);
      router.refresh();
    } catch (err: any) {
      setFormError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/students"
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Students Directory
        </Link>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      {/* 1. Personal & Identity Details */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Student Identity & Demographics</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Admission / Student ID Number"
            placeholder="e.g. ADM-2026-0042"
            value={formData.admissionNumber}
            onChange={(e) => setFormData({ ...formData, admissionNumber: e.target.value.toUpperCase() })}
            required
          />

          <Input
            type="date"
            label="Date of Joining"
            value={formData.dateOfJoining}
            onChange={(e) => setFormData({ ...formData, dateOfJoining: e.target.value })}
            required
          />

          <Input
            type="date"
            label="Date of Birth"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Input
            label="First Name"
            placeholder="First name"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />

          <Input
            label="Middle Name (Optional)"
            placeholder="Middle name"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
          />

          <Input
            label="Last Name"
            placeholder="Last name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as StudentGender })}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            ]}
          />

          <Input
            label="Blood Group (Optional)"
            placeholder="e.g. O+, A+, B-"
            value={formData.bloodGroup}
            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value.toUpperCase() })}
          />

          <Input
            label="Nationality"
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
          />
        </div>
      </Card>

      {/* 2. Contact & Address */}
      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          Contact & Residential Address
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email Address (Optional)"
            type="email"
            placeholder="student@example.edu"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Phone Number (Optional)"
            type="tel"
            placeholder="+1 555-0100"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="mt-4">
          <Input
            label="Street Address (Optional)"
            placeholder="123 Academic Way"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
          <Input
            label="City"
            value={formData.city}
            onChange={(e) => setFormData({ ...formData, city: e.target.value })}
          />
          <Input
            label="State / Province"
            value={formData.state}
            onChange={(e) => setFormData({ ...formData, state: e.target.value })}
          />
          <Input
            label="Country"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          />
          <Input
            label="Postal Code"
            value={formData.postalCode}
            onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
          />
        </div>
      </Card>

      {/* 3. Emergency Contact */}
      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-bold text-slate-900">Mandatory Emergency Contact</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Emergency Contact Name"
            placeholder="Full name of contact"
            value={formData.emergencyContactName}
            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
            required
          />

          <Input
            label="Emergency Contact Phone"
            type="tel"
            placeholder="+1 555-0199"
            value={formData.emergencyContactPhone}
            onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
            required
          />

          <Input
            label="Relationship to Student"
            placeholder="e.g. Mother, Father, Uncle"
            value={formData.emergencyContactRelationship}
            onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
            required
          />
        </div>
      </Card>

      {/* 4. Initial Academic Enrollment (Optional) */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold text-slate-900">Initial Academic Enrollment</h2>
          </div>

          <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.shouldEnroll}
              onChange={(e) => setFormData({ ...formData, shouldEnroll: e.target.checked })}
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Enroll in Academic Cohort Now
          </label>
        </div>

        {formData.shouldEnroll && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Academic Year Session"
                value={formData.academicYearId}
                onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
                options={academicYears.map((y) => ({
                  value: y.id,
                  label: `${y.name} (${y.code}) ${y.is_current ? '• Current' : ''}`,
                }))}
                required={formData.shouldEnroll}
              />

              <Select
                label="Curriculum / Program Track"
                value={formData.programId}
                onChange={(e) => setFormData({ ...formData, programId: e.target.value })}
                options={programs.map((p) => ({
                  value: p.id,
                  label: `${p.name} (${p.code})`,
                }))}
                required={formData.shouldEnroll}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select
                label="Class / Grade / Batch"
                value={formData.classId}
                onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
                options={availableClasses.map((c) => ({
                  value: c.id,
                  label: `${c.name} (${c.code})`,
                }))}
                required={formData.shouldEnroll}
              />

              <Select
                label="Section / Division (Optional)"
                value={formData.sectionId}
                onChange={(e) => setFormData({ ...formData, sectionId: e.target.value })}
                options={[
                  { value: '', label: 'Unassigned Section' },
                  ...availableSections.map((s) => ({
                    value: s.id,
                    label: `${s.name} (${s.code})`,
                  })),
                ]}
              />

              <Input
                label="Roll / Index Number (Optional)"
                placeholder="e.g. 01, R-102"
                value={formData.rollNumber}
                onChange={(e) => setFormData({ ...formData, rollNumber: e.target.value })}
              />
            </div>
          </div>
        )}
      </Card>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href="/dashboard/students">
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          <UserPlus className="w-4 h-4 mr-1.5" />
          Complete Registration
        </Button>
      </div>
    </form>
  );
}
