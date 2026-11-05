'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { updateStaffAction } from '../../actions';
import { ArrowLeft, UserCheck, Briefcase, MapPin } from 'lucide-react';
import type {
  StaffProfileRow,
  AcademicDepartmentRow,
  CampusRow,
} from '@edu-platform/database';

interface EditStaffFormProps {
  staff: StaffProfileRow;
  departments: AcademicDepartmentRow[];
  campuses: CampusRow[];
}

export function EditStaffForm({ staff, departments, campuses }: EditStaffFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: staff.first_name,
    middleName: staff.middle_name || '',
    lastName: staff.last_name,
    phone: staff.phone,
    staffCategory: staff.staff_category as any,
    designation: staff.designation,
    departmentId: staff.department_id || '',
    campusId: staff.campus_id || '',
    employmentType: staff.employment_type as any,
    employmentStatus: staff.employment_status as any,
    qualification: staff.qualification || '',
    yearsOfExperience: staff.years_of_experience || 0,
    address: staff.address || '',
    city: staff.city || '',
    state: staff.state || '',
    country: staff.country || '',
    postalCode: staff.postal_code || '',
    emergencyContactName: staff.emergency_contact_name || '',
    emergencyContactPhone: staff.emergency_contact_phone || '',
    emergencyContactRelationship: staff.emergency_contact_relationship || '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const res = await updateStaffAction(staff.id, {
        firstName: formData.firstName.trim(),
        middleName: formData.middleName.trim() || undefined,
        lastName: formData.lastName.trim(),
        phone: formData.phone.trim(),
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
        setErrorMsg(res.error || 'Failed to update staff record.');
        setIsSubmitting(false);
        return;
      }

      router.push(`/dashboard/staff/${staff.id}`);
    } catch (err: any) {
      setErrorMsg(err.message || 'An unexpected error occurred.');
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl pb-12">
      <div>
        <Link
          href={`/dashboard/staff/${staff.id}`}
          className="inline-flex items-center text-sm font-medium text-slate-500 hover:text-slate-800 mb-2 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Back to Staff Profile
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Edit Staff Profile: {staff.first_name} {staff.last_name}
        </h1>
        <p className="text-sm text-slate-600 mt-1 font-mono">
          Employee ID: {staff.employee_id} • Email: {staff.email}
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
          <UserCheck className="w-5 h-5 text-indigo-600" />
          Personal Demographics
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="First Name *"
            value={formData.firstName}
            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            required
          />
          <Input
            label="Middle Name"
            value={formData.middleName}
            onChange={(e) => setFormData({ ...formData, middleName: e.target.value })}
          />
          <Input
            label="Last Name *"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
          <Input
            label="Phone Number *"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            required
          />
          <Input
            label="Highest Academic Qualification"
            value={formData.qualification}
            onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
          />
        </div>
      </Card>

      {/* Professional Placement & Status */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          Role, Department & Employment Status
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Select
            label="Staff Category *"
            value={formData.staffCategory}
            onChange={(e) => setFormData({ ...formData, staffCategory: e.target.value as any })}
            options={[
              { value: 'teaching', label: 'Teaching Faculty' },
              { value: 'administrative', label: 'Administrative' },
              { value: 'technical', label: 'Technical / IT' },
              { value: 'transport', label: 'Transport' },
              { value: 'support', label: 'Support' },
              { value: 'non_teaching', label: 'Non-Teaching' },
            ]}
          />

          <Input
            label="Designation / Job Title *"
            value={formData.designation}
            onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
            required
          />

          <Select
            label="Employment Status *"
            value={formData.employmentStatus}
            onChange={(e) => setFormData({ ...formData, employmentStatus: e.target.value as any })}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'probation', label: 'Probation' },
              { value: 'notice_period', label: 'Notice Period' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'resigned', label: 'Resigned' },
              { value: 'retired', label: 'Retired' },
              { value: 'terminated', label: 'Terminated' },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
          <Select
            label="Department"
            value={formData.departmentId}
            onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
            options={[
              { value: '', label: 'General / Unassigned' },
              ...departments.map((d) => ({ value: d.id, label: `${d.name} (${d.code})` })),
            ]}
          />

          <Select
            label="Campus Location"
            value={formData.campusId}
            onChange={(e) => setFormData({ ...formData, campusId: e.target.value })}
            options={[
              { value: '', label: 'Central / All Campuses' },
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
              { value: 'contract', label: 'Contract' },
              { value: 'adjunct', label: 'Adjunct' },
              { value: 'visiting', label: 'Visiting' },
            ]}
          />
        </div>
      </Card>

      {/* Address & Emergency Contact */}
      <Card className="p-6">
        <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 mb-4 border-b pb-2">
          <MapPin className="w-5 h-5 text-indigo-600" />
          Residential Address & Emergency Contact
        </h3>

        <div className="space-y-4">
          <Input
            label="Residential Address"
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
          />

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <Input
              label="City"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
            />
            <Input
              label="State"
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

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-3 border-t border-slate-100">
            <Input
              label="Emergency Contact Name"
              value={formData.emergencyContactName}
              onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
            />
            <Input
              label="Relationship"
              value={formData.emergencyContactRelationship}
              onChange={(e) => setFormData({ ...formData, emergencyContactRelationship: e.target.value })}
            />
            <Input
              label="Emergency Phone"
              value={formData.emergencyContactPhone}
              onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
            />
          </div>
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href={`/dashboard/staff/${staff.id}`}>
          <Button variant="outline" type="button">
            Cancel
          </Button>
        </Link>
        <Button type="submit" disabled={isSubmitting || !formData.firstName || !formData.lastName || !formData.phone}>
          {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
