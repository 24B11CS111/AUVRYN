'use client';

import React from 'react';
import Link from 'next/link';
import { StudentRegistrationWizard } from '@/components/admissions/StudentRegistrationWizard';
import { ArrowLeft } from 'lucide-react';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
} from '@edu-platform/database';

interface NewAdmissionFormProps {
  institutionId?: string;
  institutionName?: string;
  years: AcademicYearRow[];
  programs: AcademicProgramRow[];
  classes: AcademicClassRow[];
}

export function NewAdmissionForm({
  institutionId = '00000000-0000-0000-0000-000000000000',
  institutionName,
  years,
  programs,
  classes,
}: NewAdmissionFormProps) {
  return (
    <div className="space-y-6">
      {/* Header Breadcrumb */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/admissions"
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">New Student Admission</h1>
            <p className="text-sm text-gray-500">
              Multi-step registration workflow with verified identity, parent details, and DPDP consent.
            </p>
          </div>
        </div>
      </div>

      <StudentRegistrationWizard
        institutionId={institutionId}
        institutionName={institutionName}
        years={years}
        programs={programs}
        classes={classes}
        onSuccessRedirectUrl="/dashboard/admissions"
      />
    </div>
  );
}
