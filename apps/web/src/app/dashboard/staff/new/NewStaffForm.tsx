'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { createStaffAction } from '../actions';
import {
  ArrowLeft,
  UserPlus,
  Briefcase,
  MapPin,
} from 'lucide-react';
import type {
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface NewStaffFormProps {
  departments: AcademicDepartmentRow[];
  campuses: CampusRow[];
}

export function NewStaffForm({ departments, campuses }: NewStaffFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    // Primary Identity
    employeeId: `EMP-${Math.floor(1000 + Math.random() * 9000)}`,
    firstName: '',
    middleName: '',
    lastName: '',
    dateOfBirth: '',
    gender: 'prefer_not_to_say' as 'male' | 'female' | 'other' | 'prefer_not_to_say',
    email: '',
    phone: '',

    // Professional & Placement
    joiningDate: new Date().toISOString().split('T')[0],
    staffCategory: 'teaching' as 'teaching' | 'non_teaching' | 'administrative' | 'technical' | 'transport' | 'support',
    designation: '',
    departmentId: departments[0]?.id || '',
    campusId: campuses[0]?.id || '',
    employmentType: 'full_time' as 'full_time' | 'part_time' | 'contract' | 'adjunct' | 'visiting',
    employmentStatus: 'active' as 'active' | 'probation' | 'notice_period',
    qualification: '',
    yearsOfExperience: 0,

    // Address
    address: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',

    // Emergency Contact
    emergencyContactName: '',
    emergencyContactPhone: '',
    emergencyContactRelationship: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await createStaffAction({
        employeeId: formData.employeeId.trim(),
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        email: formData.email.trim(),
        phone: formData.phone.trim(),
        joiningDate: formData.joiningDate || new Date().toISOString().slice(0, 10),
        staffCategory: formData.staffCategory,
        designation: formData.designation.trim(),
        departmentId: formData.departmentId || undefined,
        campusId: formData.campusId || undefined,
        employmentType: formData.employmentType,
        employmentStatus: formData.employmentStatus,
        qualification: formData.qualification.trim() || undefined,
        yearsOfExperience: Number(formData.yearsOfExperience) || 0,
        address: formData.address.trim() || undefined,
        city: formData.city.trim() || undefined,
        state: formData.state.trim() || undefined,
        country: formData.country.trim() || undefined,
        postalCode: formData.postalCode.trim() || undefined,
        emergencyContactName: formData.emergencyContactName.trim() || undefined,
        emergencyContactPhone: formData.emergencyContactPhone.trim() || undefined,
        emergencyContactRelationship: formData.emergencyContactRelationship.trim() || undefined,
      });

      if (!res.success) {
        setErrorMsg(res.error || 'Failed to create staff record.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/dashboard/staff/${(res.data as any).id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-12">
      <div>
        <Link
          href="/dashboard/staff"
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Staff Directory
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Register New Staff / Faculty Member
        </h1>
        <p className="text-sm text-slate-600 mt-1">
          Create an institutional staff profile, assign role category, and establish initial employment records.
        </p>
      </div>

      {errorMsg && (
        <Alert variant="error">
          {errorMsg}
        </Alert>
      )}

      {/* Identity & Personal Info */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <UserPlus className="w-5 h-5 text-indigo-600" />
          Personal Demographics & Identification
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Input
            label="Employee ID *"
            placeholder="e.g. EMP-1001"
            value={formData.employeeId}
            onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
            required
          />
          <Input
            label="First Name *"
            placeholder="e.g. Anand"
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
            placeholder="e.g. Iyer"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mt-4">
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
              { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            ]}
          />
          <Input
            label="Official / Contact Email *"
            type="email"
            placeholder="e.g. anand.iyer@institution.edu"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />
          <Input
            label="Phone Number *"
            placeholder="e.g. +91 9876543210"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
        </div>
      </Card>

      {/* Professional Placement & Employment */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          Professional Placement & Designation
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Staff Category *"
            value={formData.staffCategory}
            onChange={(e) => setFormData({ ...formData, staffCategory: e.target.value as any })}
            options={[
              { value: 'teaching', label: 'Teaching Faculty' },
              { value: 'administrative', label: 'Administrative Staff' },
              { value: 'technical', label: 'Technical / IT' },
              { value: 'transport', label: 'Transport Personnel' },
              { value: 'support', label: 'Support / Facility Staff' },
              { value: 'non_teaching', label: 'Other Non-Teaching' },
            ]}
          />

          <Input
            label="Designation / Title *"
            placeholder="e.g. Assistant Professor, Lab Technician"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            required
          />

          <Input
            label="Date of Joining *"
            type="date"
            value={formData.joiningDate}
            onChange={(e) => setFormData({ ...formData, joiningDate: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Select
            label="Assigned Department"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            options={[
              { value: '', label: 'Unassigned / General' },
              ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
            ]}
          />

          <Select
            label="Campus Location"
            value={formData.campusId}
            onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
            options={[
              { value: '', label: 'All Campuses / Central' },
              ...campuses.map((c) => ({ value: c.id, label: c.name })),
            ]}
          />

          <Select
            label="Employment Type *"
            value={formData.employmentType}
            onChange={(e) => setFormData({ ...formData, employmentType: e.target.value as any })}
            options={[
              { value: 'full_time', label: 'Full Time' },
              { value: 'part_time', label: 'Part Time' },
              { value: 'contract', label: 'Contractual' },
              { value: 'adjunct', label: 'Adjunct' },
              { value: 'visiting', label: 'Visiting Lecturer' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Input
            label="Highest Academic Qualification"
            placeholder="e.g. Ph.D. in Computer Science, M.Tech, M.Ed"
            value={formData.qualification}
            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
          />

          <Input
            label="Years of Experience"
            type="number"
            min="0"
            step="0.5"
            value={formData.yearsOfExperience}
            onChange={(e) => setFormData({ ...formData, yearsOfExperience: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </Card>

      {/* Residential & Emergency Contact */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Residential Address & Emergency Contact
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
              placeholder="e.g. Bangalore"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
              placeholder="e.g. Karnataka"
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
              placeholder="e.g. 560001"
              value={formData.postalCode}
              onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            <Input
              label="Emergency Contact Name"
              placeholder="e.g. Lakshmi Iyer"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
            />
            <Input
              label="Relationship"
              placeholder="e.g. Spouse, Parent"
              value={formData.emergencyContactRelationship}
              onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
            />
            <Input
              label="Emergency Phone"
              placeholder="e.g. +91 9876543211"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
            />
          </div>
        </div>
      </Card>

      {/* Form Submission Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href="/dashboard/staff">
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button
          type="submit"
          disabled={
            isSubmitting ||
            !formData.employeeId ||
            !formData.firstName ||
            !formData.lastName ||
            !formData.dateOfBirth ||
            !formData.email ||
            !formData.phone ||
            !formData.designation
          }
        >
          {isSubmitting ? 'Registering Staff Member...' : 'Register Staff Member'}
        </Button>
      </div>
    </form>
  );
}
