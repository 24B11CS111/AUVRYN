'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { updateStudentAction } from '../../actions';
import { ArrowLeft, Save, UserCheck, ShieldAlert } from 'lucide-react';
import type { StudentRow } from '@edu-platform/database';
import type { StudentGender, StudentStatus } from '@edu-platform/types';

interface EditStudentFormProps {
  student: StudentRow;
}

export function EditStudentForm({ student }: EditStudentFormProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    firstName: student.first_name,
    middleName: student.middle_name || '',
    lastName: student.last_name,
    dateOfBirth: student.date_of_birth,
    gender: student.gender,
    bloodGroup: student.blood_group || '',
    email: student.email || '',
    phone: student.phone || '',
    address: student.address || '',
    city: student.city || '',
    state: student.state || '',
    country: student.country || '',
    postalCode: student.postal_code || '',
    nationality: student.nationality || 'Domestic',
    status: student.status,
    emergencyContactName: student.emergency_contact_name,
    emergencyContactPhone: student.emergency_contact_phone,
    emergencyContactRelationship: student.emergency_contact_relationship,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await updateStudentAction(student.id, {
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
        status: formData.status,
        emergencyContactName: formData.emergencyContactName,
        emergencyContactPhone: formData.emergencyContactPhone,
        emergencyContactRelationship: formData.emergencyContactRelationship,
      });

      if (!res.success) {
        setFormError(res.error || 'Failed to update student profile.');
      } else {
        router.push(`/dashboard/students/${student.id}`);
        router.refresh();
      }
    } catch (err: any) {
      setFormError(err.message || 'An error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href={`/dashboard/students/${student.id}`}
          className="inline-flex items-center text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-1" />
          Cancel and Return to Profile
        </Link>
      </div>

      {formError && <Alert variant="error">{formError}</Alert>}

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <UserCheck className="w-5 h-5 text-indigo-600" />
          <h2 className="text-base font-bold text-slate-900">Student Identity</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="Admission Number" value={student.admission_number} disabled />

          <Select
            label="Enrollment Status"
            value={formData.status}
            onChange={(e) =>
              setFormData({ ...formData, status: e.target.value as StudentStatus })
            }
            options={[
              { value: 'active', label: 'Active' },
              { value: 'inactive', label: 'Inactive' },
              { value: 'suspended', label: 'Suspended' },
              { value: 'alumni', label: 'Alumni' },
              { value: 'transferred', label: 'Transferred' },
              { value: 'withdrawn', label: 'Withdrawn' },
            ]}
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
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <Select
            label="Gender"
            value={formData.gender}
            onChange={(e) =>
              setFormData({ ...formData, gender: e.target.value as StudentGender })
            }
            options={[
              { value: 'male', label: 'Male' },
              { value: 'female', label: 'Female' },
              { value: 'other', label: 'Other' },
              { value: 'prefer_not_to_say', label: 'Prefer not to say' },
            ]}
          />

          <Input
            label="Blood Group"
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

      <Card className="p-6">
        <h2 className="text-base font-bold text-slate-900 mb-4 pb-3 border-b border-slate-100">
          Contact Details & Address
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Email Address"
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />

          <Input
            label="Phone Number"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          />
        </div>

        <div className="mt-4">
          <Input
            label="Street Address"
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

      <Card className="p-6">
        <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
          <ShieldAlert className="w-5 h-5 text-rose-600" />
          <h2 className="text-base font-bold text-slate-900">Emergency Contact</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Contact Name"
            value={formData.emergencyContactName}
            onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
            required
          />

          <Input
            label="Contact Phone"
            value={formData.emergencyContactPhone}
            onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
            required
          />

          <Input
            label="Relationship"
            value={formData.emergencyContactRelationship}
            onChange={(e) =>
              setFormData({ ...formData, emergencyContactRelationship: e.target.value })
            }
            required
          />
        </div>
      </Card>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
        <Link href={`/dashboard/students/${student.id}`}>
          <Button type="button" variant="outline" disabled={isSubmitting}>
            Cancel
          </Button>
        </Link>
        <Button type="submit" isLoading={isSubmitting}>
          <Save className="w-4 h-4 mr-1.5" />
          Save Profile Changes
        </Button>
      </div>
    </form>
  );
}
