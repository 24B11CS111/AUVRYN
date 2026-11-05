'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { createAdmissionApplicationAction } from '../actions';
import { ArrowLeft, UserPlus, Users, School, MapPin } from 'lucide-react';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
} from '@edu-platform/database';

interface NewAdmissionFormProps {
  years: AcademicYearRow[];
  programs: AcademicProgramRow[];
  classes: AcademicClassRow[];
}

export function NewAdmissionForm({ years, programs, classes }: NewAdmissionFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Academic choice
    academicYearId: years[0]?.id || '',
    programId: programs[0]?.id || '',
    classId: '',

    // Applicant Demographics
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'male' as 'male' | 'female' | 'other',
    bloodGroup: '',
    email: '',
    phone: '',
    nationality: 'Domestic',

    // Address
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',

    // Previous Academic History
    previousSchoolName: '',
    previousGradeOrScore: '',

    // Primary Guardian
    primaryGuardianName: '',
    primaryGuardianRelationship: 'Father',
    primaryGuardianPhone: '',
    primaryGuardianEmail: '',
    primaryGuardianOccupation: '',

    // Secondary Guardian (optional)
    secondaryGuardianName: '',
    secondaryGuardianRelationship: '',
    secondaryGuardianPhone: '',
    secondaryGuardianEmail: '',
  });

  // Filter classes by selected program if possible
  const availableClasses = classes.filter((c) =>
    formData.programId ? c.program_id === formData.programId : true
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await createAdmissionApplicationAction({
        academicYearId: formData.academicYearId,
        programId: formData.programId,
        classId: formData.classId || undefined,
        firstName: formData.firstName,
        middleName: formData.middleName || undefined,
        lastName: formData.lastName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        bloodGroup: formData.bloodGroup ? (formData.bloodGroup as any) : undefined,
        email: formData.email || undefined,
        phone: formData.phone,
        nationality: formData.nationality || undefined,
        address: formData.address || undefined,
        city: formData.city || undefined,
        state: formData.state || undefined,
        country: formData.country || undefined,
        postalCode: formData.postalCode || undefined,
        previousSchoolName: formData.previousSchoolName || undefined,
        previousGradeOrScore: formData.previousGradeOrScore || undefined,
        primaryGuardianName: formData.primaryGuardianName,
        primaryGuardianRelationship: formData.primaryGuardianRelationship,
        primaryGuardianPhone: formData.primaryGuardianPhone,
        primaryGuardianEmail: formData.primaryGuardianEmail || undefined,
        primaryGuardianOccupation: formData.primaryGuardianOccupation || undefined,
        secondaryGuardianName: formData.secondaryGuardianName || undefined,
        secondaryGuardianRelationship: formData.secondaryGuardianRelationship || undefined,
        secondaryGuardianPhone: formData.secondaryGuardianPhone || undefined,
        secondaryGuardianEmail: formData.secondaryGuardianEmail || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to submit admission application.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/dashboard/admissions/${(res.data as any).id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-12">
      {/* Back button */}
      <div>
        <Link
          href="/dashboard/admissions"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Applications List
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          New Admission Application
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Record a new prospective student application for review, verification, and eventual enrollment.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="error">
          {errorMsg}
        </Alert>
      )}

      {/* Academic Target */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <School className="w-5 h-5 text-indigo-600" />
          Academic Target & Preferences
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Academic Year *"
            value={formData.academicYearId}
            onChange={(e) => setFormData({ ...formData, academicYearId: e.target.value })}
            options={years.map((y) => ({ value: y.id, label: y.name }))}
            required
          />

          <Select
            label="Target Program *"
            value={formData.programId}
            onChange={(e) => setFormData({ ...formData, programId: e.target.value, classId: '' })}
            options={programs.map((p) => ({ value: p.id, label: `${p.name} (${p.code})` }))}
            required
          />

          <Select
            label="Target Class / Grade (Optional)"
            value={formData.classId}
            onChange={(e) => setFormData({ ...formData, classId: e.target.value })}
            options={[
              { value: '', label: 'Select Target Class (Optional)' },
              ...availableClasses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
        </div>
      </Card>

      {/* Applicant Personal Information */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          Applicant Personal Information
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="First Name *"
            placeholder="e.g. Rahul"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
          <Input
            label="Middle Name"
            placeholder="Optional"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
          />
          <Input
            label="Last Name *"
            placeholder="e.g. Sharma"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Input
            label="Date of Birth *"
            type="date"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
            required
          />

          <Select
            label="Gender *"
            value={formData.gender}
            onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
            ]}
            required
          />

          <Select
            label="Blood Group"
            value={formData.bloodGroup}
            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
            options={[
              { value: '', label: 'Not specified' },
              { value: 'A+', label: 'A+' },
              { value: 'A-', label: 'A-' },
              { value: 'B+', label: 'B+' },
              { value: 'B-', label: 'B-' },
              { value: 'AB+', label: 'AB+' },
              { value: 'AB-', label: 'AB-' },
              { value: 'O+', label: 'O+' },
              { value: 'O-', label: 'O-' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Input
            label="Applicant Phone Number *"
            placeholder="e.g. +91 9876543210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Applicant Email Address"
            type="email"
            placeholder="applicant@example.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          <Input
            label="Nationality"
            placeholder="e.g. Indian, American"
            value={formData.nationality}
            onChange={(e) => setFormData({ ...formData, nationality: e.target.value })}
          />
        </div>
      </Card>

      {/* Address & Prior Education */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Address & Prior Education
        </h3>
        <div className="space-y-4">
          <Input
            label="Residential Address"
            placeholder="Street address, apartment or house number"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="City"
              placeholder="e.g. Hyderabad"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State / Province"
              placeholder="e.g. Telangana"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
            />
            <Input
              label="Country"
              placeholder="e.g. India"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
            />
            <Input
              label="Postal Code"
              placeholder="e.g. 500001"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <Input
              label="Previous School / Institute Attended"
              placeholder="e.g. St. Mary High School"
              value={formData.previousSchoolName}
              onChange={(e) => setFormData({ ...formData, previousSchoolName: e.target.value })}
            />
            <Input
              label="Previous Score / Grade / GPA"
              placeholder="e.g. 9.4 CGPA or 88%"
              value={formData.previousGradeOrScore}
              onChange={(e) => setFormData({ ...formData, previousGradeOrScore: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Guardian Information */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <Users className="w-5 h-5 text-indigo-600" />
          Primary Guardian Details
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Primary Guardian Full Name *"
            placeholder="e.g. Ramesh Sharma"
            value={formData.primaryGuardianName}
            onChange={(e) => setFormData({ ...formData, primaryGuardianName: e.target.value })}
            required
          />
          <Input
            label="Relationship to Applicant *"
            placeholder="e.g. Father, Mother, Guardian"
            value={formData.primaryGuardianRelationship}
            onChange={(e) => setFormData({ ...formData, primaryGuardianRelationship: e.target.value })}
            required
          />
          <Input
            label="Guardian Primary Phone *"
            placeholder="e.g. +91 9876543211"
            value={formData.primaryGuardianPhone}
            onChange={(e) => setFormData({ ...formData, primaryGuardianPhone: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Input
            label="Guardian Email Address"
            type="email"
            placeholder="guardian@example.com"
            value={formData.primaryGuardianEmail}
            onChange={(e) => setFormData({ ...formData, primaryGuardianEmail: e.target.value })}
          />
          <Input
            label="Guardian Occupation"
            placeholder="e.g. Software Engineer, Doctor, Business"
            value={formData.primaryGuardianOccupation}
            onChange={(e) => setFormData({ ...formData, primaryGuardianOccupation: e.target.value })}
          />
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100">
          <h4 className="text-sm font-semibold text-slate-800 mb-3">Secondary Guardian (Optional)</h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Secondary Guardian Name"
              placeholder="e.g. Sunita Sharma"
              value={formData.secondaryGuardianName}
              onChange={(e) => setFormData({ ...formData, secondaryGuardianName: e.target.value })}
            />
            <Input
              label="Relationship"
              placeholder="e.g. Mother"
              value={formData.secondaryGuardianRelationship}
              onChange={(e) => setFormData({ ...formData, secondaryGuardianRelationship: e.target.value })}
            />
            <Input
              label="Phone Number"
              placeholder="e.g. +91 9876543212"
              value={formData.secondaryGuardianPhone}
              onChange={(e) => setFormData({ ...formData, secondaryGuardianPhone: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href="/dashboard/admissions">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !formData.firstName ||
            !formData.lastName ||
            !formData.dateOfBirth ||
            !formData.phone ||
            !formData.primaryGuardianName ||
            !formData.primaryGuardianPhone
          }
        >
          {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
        </Button>
      </div>
    </form>
  );
}
