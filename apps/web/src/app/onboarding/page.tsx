'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  type InstitutionType,
  INSTITUTION_TYPE_DEFINITIONS,
} from '@edu-platform/types';
import {
  institutionCreateSchema,
  campusCreateSchema,
  academicYearCreateSchema,
  type OnboardingFlowInput,
} from '@edu-platform/validators';
import { submitOnboarding } from './actions';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import {
  GraduationCap,
  Building2,
  BookOpen,
  Cpu,
  Landmark,
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
} from 'lucide-react';

const typeIcons: Record<InstitutionType, React.ReactNode> = {
  school: <GraduationCap className="w-6 h-6 text-indigo-600" />,
  junior_college: <BookOpen className="w-6 h-6 text-sky-600" />,
  degree_college: <Building2 className="w-6 h-6 text-emerald-600" />,
  engineering_college: <Cpu className="w-6 h-6 text-violet-600" />,
  university: <Landmark className="w-6 h-6 text-amber-600" />,
};

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<OnboardingFlowInput>({
    institution: {
      name: '',
      code: '',
      slug: '',
      type: 'school',
      city: '',
      state: '',
      country: 'India',
      email: '',
      phone: '',
      website: '',
      address: '',
      postalCode: '',
    },
    campus: {
      name: 'Main Campus',
      code: 'MAIN',
      isPrimary: true,
      city: '',
      state: '',
      country: 'India',
      address: '',
      postalCode: '',
      phone: '',
      email: '',
    },
    academicYear: {
      name: 'Academic Year 2026-2027',
      code: 'AY26-27',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      termSystem: 'annual',
      isCurrent: true,
    },
  });

  const [stepErrors, setStepErrors] = useState<Record<string, string>>({});

  // Type change handler
  const handleSelectType = (type: InstitutionType) => {
    const typeDef = INSTITUTION_TYPE_DEFINITIONS[type];
    setFormData((prev) => ({
      ...prev,
      institution: {
        ...prev.institution,
        type,
      },
      academicYear: {
        ...prev.academicYear,
        termSystem: typeDef.defaultTermType,
      },
    }));
  };

  // Helper to generate slug from name
  const handleNameChange = (name: string) => {
    const slug = name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-');

    const code = name
      .split(/\s+/)
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 6);

    setFormData((prev) => ({
      ...prev,
      institution: {
        ...prev.institution,
        name,
        slug: prev.institution.slug ? prev.institution.slug : slug,
        code: prev.institution.code ? prev.institution.code : code,
      },
    }));
  };

  // Validate current step
  const validateCurrentStep = (): boolean => {
    setStepErrors({});
    setErrorMessage(null);

    if (step === 1) {
      if (!formData.institution.type) {
        setErrorMessage('Please choose an institution classification');
        return false;
      }
      return true;
    }

    if (step === 2) {
      const result = institutionCreateSchema.safeParse(formData.institution);
      if (!result.success) {
        const errMap: Record<string, string> = {};
        for (const err of result.error.errors) {
          const field = err.path[0]?.toString() || 'general';
          errMap[field] = err.message;
        }
        setStepErrors(errMap);
        return false;
      }
      // Sync campus city & state with institution if not set
      setFormData((prev) => ({
        ...prev,
        campus: {
          ...prev.campus,
          city: prev.campus.city || prev.institution.city,
          state: prev.campus.state || prev.institution.state,
          country: prev.campus.country || prev.institution.country,
          address: prev.campus.address || prev.institution.address,
        },
      }));
      return true;
    }

    if (step === 3) {
      const result = campusCreateSchema.safeParse(formData.campus);
      if (!result.success) {
        const errMap: Record<string, string> = {};
        for (const err of result.error.errors) {
          const field = err.path[0]?.toString() || 'general';
          errMap[field] = err.message;
        }
        setStepErrors(errMap);
        return false;
      }
      return true;
    }

    if (step === 4) {
      const result = academicYearCreateSchema.safeParse(formData.academicYear);
      if (!result.success) {
        const errMap: Record<string, string> = {};
        for (const err of result.error.errors) {
          const field = err.path[0]?.toString() || 'general';
          errMap[field] = err.message;
        }
        setStepErrors(errMap);
        return false;
      }
      return true;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setStep((prev) => Math.min(prev + 1, 5));
    }
  };

  const handleBack = () => {
    setErrorMessage(null);
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await submitOnboarding(formData);
      if (!res.success) {
        setErrorMessage(res.error || 'Failed to initialize institution');
        setIsSubmitting(false);
        return;
      }

      router.push('/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMessage(err.message || 'An unexpected error occurred');
      setIsSubmitting(false);
    }
  };

  const currentTypeDef = INSTITUTION_TYPE_DEFINITIONS[formData.institution.type];

  const steps = [
    { num: 1, label: 'Institution Type' },
    { num: 2, label: 'Identity & Details' },
    { num: 3, label: 'Primary Campus' },
    { num: 4, label: 'Academic Term' },
    { num: 5, label: 'Provisioning' },
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-between">
      <div className="max-w-3xl mx-auto w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-sm">
            E
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Institution Onboarding & Setup
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Configure your institutional workspace and multi-tenant security boundaries
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between relative">
            <div className="absolute left-0 top-1/2 -translate-y-1/2 h-0.5 bg-slate-200 w-full -z-0" />
            {steps.map((s) => (
              <div key={s.num} className="relative z-10 flex flex-col items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold transition-colors ${
                    step > s.num
                      ? 'bg-emerald-600 text-white'
                      : step === s.num
                      ? 'bg-slate-900 text-white ring-4 ring-slate-100'
                      : 'bg-white border border-slate-300 text-slate-500'
                  }`}
                >
                  {step > s.num ? <Check className="w-4 h-4" /> : s.num}
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-600 hidden sm:block">
                  {s.label}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="mb-6">
            <Alert variant="error" title="Setup Incomplete">
              {errorMessage}
            </Alert>
          </div>
        )}

        {/* Form Container */}
        <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-6 sm:p-8">
          {/* STEP 1: Institution Classification */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Select Institution Type</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Choose the educational tier. This automatically customizes terminology, department hierarchy, and term defaults.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {(
                  Object.keys(
                    INSTITUTION_TYPE_DEFINITIONS
                  ) as InstitutionType[]
                ).map((t) => {
                  const def = INSTITUTION_TYPE_DEFINITIONS[t];
                  const isSelected = formData.institution.type === t;
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() => handleSelectType(t)}
                      className={`text-left p-4 rounded-xl border-2 transition-all flex items-start gap-4 ${
                        isSelected
                          ? 'border-slate-900 bg-slate-50/60 shadow-sm'
                          : 'border-slate-200 hover:border-slate-300 bg-white'
                      }`}
                    >
                      <div className="p-2.5 rounded-lg bg-white border border-slate-200 shrink-0">
                        {typeIcons[t]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h3 className="font-semibold text-slate-900 text-sm">{def.label}</h3>
                          {isSelected && (
                            <Badge variant="success">Selected</Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1">{def.description}</p>
                        <div className="mt-2 flex items-center gap-4 text-xs text-slate-600">
                          <span>
                            <strong className="text-slate-800">Unit:</strong> {def.departmentLabel}
                          </span>
                          <span>
                            <strong className="text-slate-800">Cohort:</strong> {def.cohortLabel}
                          </span>
                          <span>
                            <strong className="text-slate-800">Calendar:</strong> {def.defaultTermType}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 2: Institution Details */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-lg font-bold text-slate-900">Institution Details</h2>
                  <Badge variant="info">{currentTypeDef.label}</Badge>
                </div>
                <p className="text-xs text-slate-500">
                  Establish the legal identity and public web presence of your institution.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Institution Legal Name"
                    placeholder="e.g. Cambridge Academy of Sciences"
                    value={formData.institution.name}
                    error={stepErrors.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleNameChange(val);
                    }}
                  />
                </div>

                <div>
                  <Input
                    label="Institution Code (2-10 chars)"
                    placeholder="e.g. CAS01"
                    value={formData.institution.code}
                    error={stepErrors.code}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        institution: { ...p.institution, code: e.target.value.toUpperCase() },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="URL Slug / Subdomain"
                    placeholder="e.g. cambridge-academy"
                    value={formData.institution.slug}
                    error={stepErrors.slug}
                    helperText={`URL: https://platform.edu/${formData.institution.slug || 'slug'}`}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        institution: { ...p.institution, slug: e.target.value.toLowerCase() },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="City"
                    placeholder="City"
                    value={formData.institution.city}
                    error={stepErrors.city}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        institution: { ...p.institution, city: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="State / Province"
                    placeholder="State"
                    value={formData.institution.state}
                    error={stepErrors.state}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        institution: { ...p.institution, state: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="Country"
                    placeholder="Country"
                    value={formData.institution.country}
                    error={stepErrors.country}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        institution: { ...p.institution, country: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="Official Email (Optional)"
                    type="email"
                    placeholder="contact@institution.edu"
                    value={formData.institution.email || ''}
                    error={stepErrors.email}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        institution: { ...p.institution, email: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: Primary Campus Details */}
          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Primary Campus Configuration</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Every institution starts with a primary central campus. Additional branch campuses can be added later.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Campus Name"
                    placeholder="e.g. Main Campus / Central Campus"
                    value={formData.campus.name}
                    error={stepErrors.name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        campus: { ...p.campus, name: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="Campus Code"
                    placeholder="e.g. MAIN"
                    value={formData.campus.code}
                    error={stepErrors.code}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        campus: { ...p.campus, code: e.target.value.toUpperCase() },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="City"
                    placeholder="City"
                    value={formData.campus.city}
                    error={stepErrors.city}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        campus: { ...p.campus, city: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Input
                    label="Campus Street Address (Optional)"
                    placeholder="e.g. 100 University Avenue"
                    value={formData.campus.address || ''}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        campus: { ...p.campus, address: e.target.value },
                      }))
                    }
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 4: Academic Year Configuration */}
          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Academic Year Setup</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Define your initial active academic session and calendar division system.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Input
                    label="Academic Year Name"
                    placeholder="e.g. Academic Year 2026-2027"
                    value={formData.academicYear.name}
                    error={stepErrors.name}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        academicYear: { ...p.academicYear, name: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="Academic Code"
                    placeholder="e.g. AY26-27"
                    value={formData.academicYear.code}
                    error={stepErrors.code}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        academicYear: { ...p.academicYear, code: e.target.value.toUpperCase() },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="Start Date"
                    type="date"
                    value={formData.academicYear.startDate}
                    error={stepErrors.startDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        academicYear: { ...p.academicYear, startDate: e.target.value },
                      }))
                    }
                  />
                </div>

                <div>
                  <Input
                    label="End Date"
                    type="date"
                    value={formData.academicYear.endDate}
                    error={stepErrors.endDate}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        academicYear: { ...p.academicYear, endDate: e.target.value },
                      }))
                    }
                  />
                </div>

                <div className="sm:col-span-2">
                  <Select
                    label="Term Division Structure"
                    value={formData.academicYear.termSystem}
                    onChange={(e) =>
                      setFormData((p) => ({
                        ...p,
                        academicYear: {
                          ...p.academicYear,
                          termSystem: e.target.value as any,
                        },
                      }))
                    }
                    options={[
                      { value: 'annual', label: 'Annual (Single Year-round Term)' },
                      { value: 'semester', label: 'Semester System (2 Terms / Year)' },
                      { value: 'trimester', label: 'Trimester System (3 Terms / Year)' },
                    ]}
                  />
                </div>
              </div>
            </div>
          )}

          {/* STEP 5: Review & Provisioning */}
          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Review & Launch Workspace</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please review the configuration. Upon confirmation, the multi-tenant database records and administrator ownership will be provisioned.
                </p>
              </div>

              <div className="bg-slate-50 rounded-xl p-5 border border-slate-200/80 space-y-4">
                <div className="flex items-start justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-white rounded-lg border border-slate-200">
                      {typeIcons[formData.institution.type]}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">
                        {formData.institution.name}
                      </h4>
                      <p className="text-xs text-slate-500">
                        {currentTypeDef.label} &bull; Code: {formData.institution.code}
                      </p>
                    </div>
                  </div>
                  <Badge variant="purple">{formData.institution.type}</Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-slate-500 block mb-0.5">Location</span>
                    <span className="font-semibold text-slate-800">
                      {formData.institution.city}, {formData.institution.state}, {formData.institution.country}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">URL Identifier</span>
                    <span className="font-semibold text-slate-800 font-mono">
                      /{formData.institution.slug}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Primary Campus</span>
                    <span className="font-semibold text-slate-800">
                      {formData.campus.name} ({formData.campus.code})
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block mb-0.5">Academic Session</span>
                    <span className="font-semibold text-slate-800">
                      {formData.academicYear.name} ({formData.academicYear.termSystem})
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 p-3.5 rounded-lg bg-emerald-50/70 border border-emerald-200 text-emerald-900 text-xs">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Your account will automatically be granted the <strong>Owner</strong> role with complete administrative, governance, and audit authority.
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="mt-8 pt-6 border-t border-slate-200 flex items-center justify-between">
            {step > 1 ? (
              <Button
                type="button"
                variant="outline"
                onClick={handleBack}
                disabled={isSubmitting}
                leftIcon={<ArrowLeft className="w-4 h-4" />}
              >
                Back
              </Button>
            ) : (
              <div />
            )}

            {step < 5 ? (
              <Button
                type="button"
                variant="primary"
                onClick={handleNext}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                Continue
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                onClick={handleSubmit}
                isLoading={isSubmitting}
                rightIcon={<CheckCircle2 className="w-4 h-4" />}
              >
                Initialize Institution
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
