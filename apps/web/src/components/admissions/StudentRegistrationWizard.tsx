'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Alert } from '@/components/ui/Alert';
import {
  submitStudentRegistrationAction,
  saveAdmissionApplicationDraftAction,
} from '@/app/dashboard/admissions/actions';
import {
  EDUCATION_TYPE_DEFINITIONS,
  type EducationType,
  type AdmissionCategory,
  type GuardianRelationshipType,
  type IdentityDocumentType,
} from '@edu-platform/types';
import {
  CheckCircle2,
  AlertCircle,
  FileText,
  ShieldCheck,
  User,
  Users,
  HeartPulse,
  Save,
  ArrowRight,
  ArrowLeft,
  Trash2,
  Plus,
  Lock,
} from 'lucide-react';
import type {
  AcademicYearRow,
  AcademicProgramRow,
  AcademicClassRow,
} from '@edu-platform/database';

interface StudentRegistrationWizardProps {
  institutionId: string;
  institutionName?: string;
  years: AcademicYearRow[];
  programs: AcademicProgramRow[];
  classes: AcademicClassRow[];
  initialDraftData?: any;
  onSuccessRedirectUrl?: string;
}

export function StudentRegistrationWizard({
  institutionId,
  institutionName,
  years,
  programs,
  classes,
  initialDraftData,
  onSuccessRedirectUrl = '/dashboard/admissions',
}: StudentRegistrationWizardProps) {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isSavingDraft, setIsSavingDraft] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draftSavedMsg, setDraftSavedMsg] = useState<string | null>(null);
  const [submittedRefNumber, setSubmittedRefNumber] = useState<string | null>(null);

  // Form State
  const [educationType, setEducationType] = useState<EducationType>(
    initialDraftData?.educationType || 'primary_school'
  );
  const [academicYearId, setAcademicYearId] = useState<string>(
    initialDraftData?.academicYearId || years[0]?.id || ''
  );
  const [programId, setProgramId] = useState<string>(
    initialDraftData?.programId || programs[0]?.id || ''
  );
  const [classId, setClassId] = useState<string>(initialDraftData?.classId || '');
  const [admissionCategory, setAdmissionCategory] = useState<AdmissionCategory>(
    initialDraftData?.admissionCategory || 'general'
  );

  // Step 1: Personal Details
  const [firstName, setFirstName] = useState(initialDraftData?.firstName || '');
  const [middleName, setMiddleName] = useState(initialDraftData?.middleName || '');
  const [lastName, setLastName] = useState(initialDraftData?.lastName || '');
  const [preferredName, setPreferredName] = useState(initialDraftData?.preferredName || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialDraftData?.dateOfBirth || '');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say'>(
    initialDraftData?.gender || 'male'
  );
  const [bloodGroup, setBloodGroup] = useState(initialDraftData?.bloodGroup || '');
  const [email, setEmail] = useState(initialDraftData?.email || '');
  const [phone, setPhone] = useState(initialDraftData?.phone || '');
  const [address, setAddress] = useState(initialDraftData?.address || '');
  const [city, setCity] = useState(initialDraftData?.city || '');
  const [state, setState] = useState(initialDraftData?.state || '');
  const [country, setCountry] = useState(initialDraftData?.country || 'India');
  const [postalCode, setPostalCode] = useState(initialDraftData?.postalCode || '');
  const [motherTongue, setMotherTongue] = useState(initialDraftData?.motherTongue || '');
  const [secondLanguage, setSecondLanguage] = useState(initialDraftData?.secondLanguage || '');
  const [transportRequired, setTransportRequired] = useState<boolean>(
    initialDraftData?.transportRequired || false
  );
  const [transportPickupStop, setTransportPickupStop] = useState(
    initialDraftData?.transportPickupStop || ''
  );
  const [transportDropStop, setTransportDropStop] = useState(
    initialDraftData?.transportDropStop || ''
  );
  const [hostelRequired, setHostelRequired] = useState<boolean>(
    initialDraftData?.hostelRequired || false
  );
  const [hostelRoomPreference, setHostelRoomPreference] = useState(
    initialDraftData?.hostelRoomPreference || ''
  );

  // Step 2: Identity Documents (Aadhaar Opt-in & Alternative ID)
  const [aadhaarProvided, setAadhaarProvided] = useState<boolean>(
    initialDraftData?.aadhaarProvided || false
  );
  const [identityDocs, setIdentityDocs] = useState<Array<{
    documentType: IdentityDocumentType;
    maskedReference: string;
    documentFilePath: string;
    fileName: string;
    fileSize: number;
    mimeType: 'application/pdf' | 'image/jpeg' | 'image/png' | 'image/webp';
    issuingAuthority?: string;
  }>>(
    initialDraftData?.identityDocuments || [
      {
        documentType: 'birth_certificate',
        maskedReference: 'REG-BC-001',
        documentFilePath: `${institutionId}/admissions/initial_doc.pdf`,
        fileName: 'birth_certificate.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        issuingAuthority: 'Municipal Corporation',
      },
    ]
  );

  // Step 3: Parents & Guardians
  const [parentStructure, setParentStructure] = useState<'both' | 'single_mother' | 'single_father' | 'legal_guardian'>('both');
  const [p1Relationship, setP1Relationship] = useState<GuardianRelationshipType>('father');
  const [p1FirstName, setP1FirstName] = useState(initialDraftData?.p1FirstName || '');
  const [p1LastName, setP1LastName] = useState(initialDraftData?.p1LastName || '');
  const [p1Phone, setP1Phone] = useState(initialDraftData?.p1Phone || '');
  const [p1PhoneSecondary, setP1PhoneSecondary] = useState(initialDraftData?.p1PhoneSecondary || '');
  const [p1Email, setP1Email] = useState(initialDraftData?.p1Email || '');
  const [p1Occupation, setP1Occupation] = useState(initialDraftData?.p1Occupation || '');
  const [p1Employer, setP1Employer] = useState(initialDraftData?.p1Employer || '');
  const [p1Address, setP1Address] = useState(initialDraftData?.p1Address || '');
  const [p1SameAddress, setP1SameAddress] = useState<boolean>(true);

  // Parent 2 (if applicable)
  const [p2Relationship, setP2Relationship] = useState<GuardianRelationshipType>('mother');
  const [p2FirstName, setP2FirstName] = useState(initialDraftData?.p2FirstName || '');
  const [p2LastName, setP2LastName] = useState(initialDraftData?.p2LastName || '');
  const [p2Phone, setP2Phone] = useState(initialDraftData?.p2Phone || '');
  const [p2Email, setP2Email] = useState(initialDraftData?.p2Email || '');
  const [p2Occupation, setP2Occupation] = useState(initialDraftData?.p2Occupation || '');

  // Legal Guardian (if applicable)
  const [guardianRelationship, setGuardianRelationship] = useState<GuardianRelationshipType>('legal_guardian');
  const [guardianFirstName, setGuardianFirstName] = useState('');
  const [guardianLastName, setGuardianLastName] = useState('');
  const [guardianPhone, setGuardianPhone] = useState('');
  const [guardianEmail, setGuardianEmail] = useState('');

  // Step 4: Emergency Contacts & Authorized Pickups
  const [primaryEmergName, setPrimaryEmergName] = useState(initialDraftData?.primaryEmergName || '');
  const [primaryEmergRel, setPrimaryEmergRel] = useState(initialDraftData?.primaryEmergRel || 'Father');
  const [primaryEmergPhone, setPrimaryEmergPhone] = useState(initialDraftData?.primaryEmergPhone || '');
  const [secondaryEmergName, setSecondaryEmergName] = useState(initialDraftData?.secondaryEmergName || '');
  const [secondaryEmergRel, setSecondaryEmergRel] = useState(initialDraftData?.secondaryEmergRel || 'Mother');
  const [secondaryEmergPhone, setSecondaryEmergPhone] = useState(initialDraftData?.secondaryEmergPhone || '');
  
  // Pickups
  const [pickups, setPickups] = useState<Array<{ name: string; relationship: string; phone: string; idMaskedRef: string }>>([
    { name: '', relationship: '', phone: '', idMaskedRef: '' },
  ]);

  // Medical Confidential Alerts
  const [criticalAllergies, setCriticalAllergies] = useState<string>('');
  const [regularMedications, setRegularMedications] = useState<string>('');
  const [emergencyHospital, setEmergencyHospital] = useState<string>('');
  const [familyDoctor, setFamilyDoctor] = useState<string>('');

  // Step 5: Consents (DPDP Act Compliance)
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [privacyAccepted, setPrivacyAccepted] = useState<boolean>(false);
  const [medicalEmergencyAccepted, setMedicalEmergencyAccepted] = useState<boolean>(false);
  const [photoMediaConsent, setPhotoMediaConsent] = useState<boolean>(false);
  const [nonEssentialCommunicationsConsent, setNonEssentialCommunicationsConsent] = useState<boolean>(false);
  const [consentingPersonName, setConsentingPersonName] = useState<string>('');
  const [consentingPersonRel, setConsentingPersonRel] = useState<string>('Parent');

  // Education Definition for Dynamic UI
  const eduConfig = EDUCATION_TYPE_DEFINITIONS[educationType];

  const handleAddDocument = () => {
    setIdentityDocs([
      ...identityDocs,
      {
        documentType: 'other',
        maskedReference: '',
        documentFilePath: `${institutionId}/admissions/doc_${Date.now()}.pdf`,
        fileName: 'document.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
      },
    ]);
  };

  const handleRemoveDocument = (index: number) => {
    if (identityDocs.length <= 1) return;
    setIdentityDocs(identityDocs.filter((_, i) => i !== index));
  };

  // Step 1 Validation
  const validateStep1 = () => {
    if (!firstName.trim() || !lastName.trim()) {
      setErrorMsg('Student full legal name is required.');
      return false;
    }
    if (!dateOfBirth) {
      setErrorMsg('Date of birth is required.');
      return false;
    }
    if (!address.trim() || !city.trim() || !state.trim() || !postalCode.trim()) {
      setErrorMsg('Complete residential address with PIN code is required.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  // Step 2 Validation
  const validateStep2 = () => {
    if (identityDocs.length === 0) {
      setErrorMsg('At least one identity document must be attached.');
      return false;
    }
    for (const doc of identityDocs) {
      if (!doc.maskedReference.trim()) {
        setErrorMsg('Every document requires an identifier or masked reference number.');
        return false;
      }
      // Compliance check: STRICTLY reject raw 12-digit Aadhaar
      if (/^\d{12}$/.test(doc.maskedReference.replace(/\s+/g, ''))) {
        setErrorMsg('Raw 12-digit Aadhaar numbers are prohibited by UIDAI guidelines. Please enter a masked reference showing only the last 4 digits (e.g. XXXX-XXXX-1234 or 1234).');
        return false;
      }
    }
    if (!aadhaarProvided) {
      const hasAlternative = identityDocs.some((d) => d.documentType !== 'masked_aadhaar');
      if (!hasAlternative) {
        setErrorMsg('If Aadhaar is not provided, you must attach an alternative document (Birth Certificate, Passport, etc.).');
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  // Step 3 Validation
  const validateStep3 = () => {
    if (parentStructure === 'legal_guardian') {
      if (!guardianFirstName.trim() || !guardianLastName.trim() || !guardianPhone.trim()) {
        setErrorMsg('Legal guardian full name and contact number are required.');
        return false;
      }
    } else {
      if (!p1FirstName.trim() || !p1LastName.trim() || !p1Phone.trim()) {
        setErrorMsg('Primary parent / guardian name and phone number are required.');
        return false;
      }
    }
    setErrorMsg(null);
    return true;
  };

  // Step 4 Validation
  const validateStep4 = () => {
    if (!primaryEmergName.trim() || !primaryEmergPhone.trim()) {
      setErrorMsg('Primary emergency contact name and phone number are required.');
      return false;
    }
    setErrorMsg(null);
    return true;
  };

  const handleNext = () => {
    setErrorMsg(null);
    if (currentStep === 1 && !validateStep1()) return;
    if (currentStep === 2 && !validateStep2()) return;
    if (currentStep === 3 && !validateStep3()) return;
    if (currentStep === 4 && !validateStep4()) return;
    setCurrentStep((prev) => Math.min(5, prev + 1));
  };

  const handlePrev = () => {
    setErrorMsg(null);
    setCurrentStep((prev) => Math.max(1, prev - 1));
  };

  // Save Draft Action
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    setDraftSavedMsg(null);
    setErrorMsg(null);
    try {
      const draftPayload = {
        institutionId,
        educationType,
        academicYearId,
        programId,
        classId: classId || null,
        formData: {
          firstName,
          middleName,
          lastName,
          dateOfBirth,
          gender,
          bloodGroup,
          email,
          phone,
          address,
          city,
          state,
          postalCode,
          primaryGuardianName: `${p1FirstName} ${p1LastName}`,
          primaryGuardianPhone: p1Phone,
        },
      };

      const res = await saveAdmissionApplicationDraftAction(draftPayload);
      if (!res.success) {
        setErrorMsg(res.error || 'Failed to save draft.');
      } else {
        const data = res.data as any;
        setDraftSavedMsg(`Application draft saved successfully! Reference Code: ${data?.draftAccessToken || data?.applicationNumber}`);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error saving draft.');
    } finally {
      setIsSavingDraft(false);
    }
  };

  // Final Submit Action
  const handleSubmitApplication = async () => {
    if (!termsAccepted) {
      setErrorMsg('You must certify that all submitted information is accurate.');
      return;
    }
    if (!privacyAccepted) {
      setErrorMsg('You must acknowledge the Data Protection and Privacy Notice.');
      return;
    }
    if (!medicalEmergencyAccepted) {
      setErrorMsg('Emergency medical treatment authorization is required.');
      return;
    }
    if (!consentingPersonName.trim()) {
      setErrorMsg('Consenting parent / guardian name is required.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const isLegal = parentStructure === 'legal_guardian';
      const primaryGuardian = {
        relationship: isLegal ? guardianRelationship : p1Relationship,
        firstName: isLegal ? guardianFirstName : p1FirstName,
        lastName: isLegal ? guardianLastName : p1LastName,
        phone: isLegal ? guardianPhone : p1Phone,
        phoneSecondary: isLegal ? undefined : p1PhoneSecondary,
        email: isLegal ? (guardianEmail || undefined) : (p1Email || undefined),
        occupation: isLegal ? undefined : (p1Occupation || undefined),
        employer: isLegal ? undefined : (p1Employer || undefined),
        address: p1SameAddress ? address : (p1Address || undefined),
        preferredCommunicationChannel: 'whatsapp' as const,
        preferredLanguage: 'en',
        portalAccessRequired: true,
      };

      let secondaryGuardian = undefined;
      if (parentStructure === 'both' && p2FirstName.trim() && p2Phone.trim()) {
        secondaryGuardian = {
          relationship: p2Relationship,
          firstName: p2FirstName,
          lastName: p2LastName,
          phone: p2Phone,
          email: p2Email || undefined,
          occupation: p2Occupation || undefined,
          preferredCommunicationChannel: 'whatsapp' as const,
          preferredLanguage: 'en',
          portalAccessRequired: true,
        };
      }

      const validPickups = pickups
        .filter((p) => p.name.trim() && p.phone.trim())
        .map((p) => ({
          priority: 'secondary' as const,
          name: p.name,
          relationship: p.relationship || 'Authorized Person',
          phonePrimary: p.phone,
          isAuthorizedPickup: true,
          pickupIdType: 'National ID',
          pickupIdMaskedRef: p.idMaskedRef || undefined,
        }));

      const fullRegistrationPayload = {
        institutionId,
        educationType,
        academicYearId,
        programId,
        classId: classId || undefined,
        admissionCategory,
        firstName,
        middleName: middleName || undefined,
        lastName,
        preferredName: preferredName || undefined,
        dateOfBirth,
        gender,
        bloodGroup: bloodGroup || undefined,
        email: email || undefined,
        phone: phone || undefined,
        address,
        city,
        state,
        country,
        postalCode,
        nationality: 'Indian',
        motherTongue: motherTongue || undefined,
        secondLanguage: secondLanguage || undefined,
        transportRequired,
        transportPickupStop: transportPickupStop || undefined,
        transportDropStop: transportDropStop || undefined,
        hostelRequired,
        hostelRoomPreference: hostelRoomPreference || undefined,
        siblingInfo: [],
        medicalAlerts: {
          allergies: criticalAllergies ? [criticalAllergies] : [],
          medications: regularMedications ? [regularMedications] : [],
          emergencyHospital: emergencyHospital || undefined,
          familyDoctorName: familyDoctor || undefined,
        },
        specialNeeds: {
          hasSpecialNeeds: false,
        },
        aadhaarProvided,
        identityDocuments: identityDocs,
        primaryGuardian,
        secondaryGuardian,
        hasLegalGuardian: isLegal,
        primaryEmergencyContact: {
          priority: 'primary' as const,
          name: primaryEmergName,
          relationship: primaryEmergRel,
          phonePrimary: primaryEmergPhone,
          isAuthorizedPickup: true,
        },
        secondaryEmergencyContact: secondaryEmergName.trim()
          ? {
              priority: 'secondary' as const,
              name: secondaryEmergName,
              relationship: secondaryEmergRel,
              phonePrimary: secondaryEmergPhone,
              isAuthorizedPickup: false,
            }
          : undefined,
        authorizedPickups: validPickups,
        registrationTermsAccepted: true as const,
        privacyNoticeAccepted: true as const,
        emergencyMedicalTreatmentAccepted: true as const,
        photoMediaConsent,
        nonEssentialCommunicationsConsent,
        consentedByName: consentingPersonName,
        consentedByRelationship: consentingPersonRel,
      };

      const result = await submitStudentRegistrationAction(fullRegistrationPayload);

      if (!result.success) {
        setErrorMsg(result.error || 'Failed to submit registration application.');
      } else {
        const resData = result.data as any;
        setSubmittedRefNumber(resData?.applicationNumber || 'APP-COMPLETED');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Submission failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submittedRefNumber) {
    return (
      <Card className="p-8 max-w-2xl mx-auto my-12 text-center border-t-4 border-emerald-600 shadow-xl">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4 text-emerald-600">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Registration Application Submitted!</h2>
        <p className="text-gray-600 mb-6">
          Thank you for applying to <span className="font-semibold">{institutionName || 'the Institution'}</span>. Your admission application has been registered securely in compliance with the Digital Personal Data Protection (DPDP) Act.
        </p>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-5 mb-6 max-w-md mx-auto">
          <span className="text-xs uppercase tracking-wider text-gray-500 font-semibold block mb-1">
            Application Reference Number
          </span>
          <span className="text-2xl font-mono font-bold text-blue-700 select-all">
            {submittedRefNumber}
          </span>
          <p className="text-xs text-gray-500 mt-2">
            Save this reference number to check application status or connect via the mobile app.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            onClick={() => router.push(onSuccessRedirectUrl)}
            className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-medium px-8"
          >
            Go to Admissions Dashboard
          </Button>
          <div className="block">
            <button
              onClick={() => {
                setSubmittedRefNumber(null);
                setCurrentStep(1);
              }}
              className="text-sm text-gray-500 hover:text-gray-800 underline mt-2"
            >
              Submit Another Application
            </button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto my-6 space-y-6">
      {/* Header & Adaptive Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-gray-900">Student Registration & Admission</h1>
            <Badge variant="info">{eduConfig.label}</Badge>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            {eduConfig.tagline} • Multi-Step Verification & DPDP-Compliant Record
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSaveDraft}
            disabled={isSavingDraft || isSubmitting}
            className="flex items-center gap-1.5 text-xs text-gray-700"
          >
            <Save className="w-3.5 h-3.5" />
            {isSavingDraft ? 'Saving Draft...' : 'Save Draft'}
          </Button>
        </div>
      </div>

      {/* Progress Stepper */}
      <div className="grid grid-cols-5 gap-2 text-center text-xs font-medium">
        {[
          { step: 1, label: 'Student Details', icon: User },
          { step: 2, label: 'Identity Docs', icon: ShieldCheck },
          { step: 3, label: 'Parent / Guardian', icon: Users },
          { step: 4, label: 'Emergency & Medical', icon: HeartPulse },
          { step: 5, label: 'Consent & Submit', icon: FileText },
        ].map((item) => {
          const Icon = item.icon;
          const isActive = currentStep === item.step;
          const isDone = currentStep > item.step;
          return (
            <div
              key={item.step}
              onClick={() => {
                if (item.step < currentStep) setCurrentStep(item.step);
              }}
              className={`p-2.5 rounded-lg border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                isActive
                  ? 'border-blue-600 bg-blue-50/70 text-blue-800 font-semibold shadow-sm'
                  : isDone
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                  : 'border-gray-200 bg-white text-gray-400'
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : isDone
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-500'
                }`}
              >
                {isDone ? '✓' : item.step}
              </div>
              <span className="hidden sm:inline flex items-center gap-1">
                <Icon className="w-3 h-3 hidden md:inline" />
                {item.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Notifications */}
      {draftSavedMsg && (
        <Alert variant="success" className="animate-in fade-in duration-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mr-2 inline" />
          {draftSavedMsg}
        </Alert>
      )}

      {errorMsg && (
        <Alert variant="error" className="animate-in fade-in duration-300">
          <AlertCircle className="w-4 h-4 text-red-600 mr-2 inline" />
          {errorMsg}
        </Alert>
      )}

      {/* STEP 1: Student Personal Details */}
      {currentStep === 1 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Step 1: Student Details & Academic Cohort</h2>
              <p className="text-xs text-gray-500">Provide legal identification and academic cohort details.</p>
            </div>
            <span className="text-xs text-gray-400 font-mono">1 / 5</span>
          </div>

          {/* Education Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Education Level / Institution Tier
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['preschool', 'primary_school', 'intermediate', 'university'] as EducationType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setEducationType(type)}
                  className={`p-3 rounded-lg border text-left text-xs transition-all ${
                    educationType === type
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold ring-1 ring-blue-600'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="block font-medium">{EDUCATION_TYPE_DEFINITIONS[type].label}</span>
                  <span className="text-[10px] text-gray-500">{EDUCATION_TYPE_DEFINITIONS[type].categoryName}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Academic Year, Program & Class */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Academic Year *</label>
              <Select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                options={years.map((y) => ({ value: y.id, label: y.name }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Program / Stream *</label>
              <Select
                value={programId}
                onChange={(e) => setProgramId(e.target.value)}
                options={programs.map((p) => ({ value: p.id, label: p.name }))}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">{eduConfig.cohortLabel}</label>
              <Select
                value={classId}
                onChange={(e) => setClassId(e.target.value)}
                options={[
                  { value: '', label: 'Select Grade / Class' },
                  ...classes.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>
          </div>

          {/* Admission Category */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Admission Category</label>
              <Select
                value={admissionCategory}
                onChange={(e) => setAdmissionCategory(e.target.value as AdmissionCategory)}
                options={[
                  { value: 'general', label: 'General / Open' },
                  { value: 'merit', label: 'Merit Quota' },
                  { value: 'management', label: 'Management Quota' },
                  { value: 'sports', label: 'Sports / Extracurricular' },
                  { value: 'sibling', label: 'Sibling Concession' },
                  { value: 'staff_ward', label: 'Staff Ward' },
                  { value: 'ews_rte', label: 'EWS / RTE Scheme' },
                  { value: 'international', label: 'International Student' },
                ]}
              />
            </div>
          </div>

          {/* Student Legal Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
              <Input
                placeholder="Legal first name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Middle Name</label>
              <Input
                placeholder="Middle name (optional)"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
              <Input
                placeholder="Surname / Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Preferred Name</label>
              <Input
                placeholder="Nickname / Call name"
                value={preferredName}
                onChange={(e) => setPreferredName(e.target.value)}
              />
            </div>
          </div>

          {/* Demographics & Communication */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Date of Birth *</label>
              <Input
                type="date"
                value={dateOfBirth}
                onChange={(e) => setDateOfBirth(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Gender *</label>
              <Select
                value={gender}
                onChange={(e) => setGender(e.target.value as any)}
                options={[
                  { value: 'male', label: 'Male' },
                  { value: 'female', label: 'Female' },
                  { value: 'other', label: 'Other' },
                  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Blood Group (Optional)</label>
              <Select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                options={[
                  { value: '', label: 'Select Blood Group' },
                  { value: 'A+', label: 'A+' },
                  { value: 'A-', label: 'A-' },
                  { value: 'B+', label: 'B+' },
                  { value: 'B-', label: 'B-' },
                  { value: 'O+', label: 'O+' },
                  { value: 'O-', label: 'O-' },
                  { value: 'AB+', label: 'AB+' },
                  { value: 'AB-', label: 'AB-' },
                ]}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Mother Tongue</label>
              <Input
                placeholder="e.g. Hindi, Telugu, English"
                value={motherTongue}
                onChange={(e) => setMotherTongue(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Second Language Preference</label>
              <Input
                placeholder="e.g. Sanskrit, French, Hindi"
                value={secondLanguage}
                onChange={(e) => setSecondLanguage(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Student Email (Optional)</label>
              <Input
                placeholder="student@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Student Phone (Optional)</label>
              <Input
                placeholder="Mobile number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          {/* Residential Address */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
              Residential Address
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-gray-700 mb-1">Street Address *</label>
                <Input
                  placeholder="House/Flat number, building, street area"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">City *</label>
                <Input
                  placeholder="City / District"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">State *</label>
                <Input
                  placeholder="State / Province"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Postal / PIN Code *</label>
                <Input
                  placeholder="6-digit PIN"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Country</label>
                <Input
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Facilities (Transport & Hostel) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-gray-100">
            <div className="p-3 border border-gray-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-gray-800">
                <input
                  type="checkbox"
                  checked={transportRequired}
                  onChange={(e) => setTransportRequired(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Requires Institution Bus Transport
              </label>
              {transportRequired && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <Input
                    placeholder="Pickup Stop"
                    value={transportPickupStop}
                    onChange={(e) => setTransportPickupStop(e.target.value)}
                  />
                  <Input
                    placeholder="Drop-off Stop"
                    value={transportDropStop}
                    onChange={(e) => setTransportDropStop(e.target.value)}
                  />
                </div>
              )}
            </div>

            <div className="p-3 border border-gray-200 rounded-lg">
              <label className="flex items-center gap-2 cursor-pointer font-medium text-xs text-gray-800">
                <input
                  type="checkbox"
                  checked={hostelRequired}
                  onChange={(e) => setHostelRequired(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500"
                />
                Requires Hostel Accommodation
              </label>
              {hostelRequired && (
                <div className="mt-3">
                  <Input
                    placeholder="Room preference (e.g. 2-sharing, AC)"
                    value={hostelRoomPreference}
                    onChange={(e) => setHostelRoomPreference(e.target.value)}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* STEP 2: Identity Documents (Aadhaar & Alternative ID) */}
      {currentStep === 2 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Step 2: Identity Documents & Verification</h2>
              <p className="text-xs text-gray-500">
                Compliance with UIDAI and DPDP Act: Submission of Aadhaar is strictly voluntary.
              </p>
            </div>
            <span className="text-xs text-gray-400 font-mono">2 / 5</span>
          </div>

          {/* Legal Notice Alert */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <Lock className="w-5 h-5 text-amber-700 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-amber-800 space-y-1">
              <span className="font-semibold block">Aadhaar Privacy & Legal Safeguard Notice</span>
              <p>
                Providing Aadhaar is completely optional. If provided, you must upload a <strong>masked Aadhaar copy</strong> where only the last 4 digits are visible (e.g., <code className="bg-amber-100 px-1 py-0.5 rounded">XXXX-XXXX-1234</code>).
              </p>
              <p>
                Never enter or upload unmasked 12-digit Aadhaar numbers. Alternative government IDs (Birth Certificate, Passport, School Leaving Certificate) are fully recognized and given equal validity.
              </p>
            </div>
          </div>

          {/* Aadhaar Opt-in Radio */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-gray-700">
              Does the applicant wish to voluntarily provide a Masked Aadhaar document?
            </label>
            <div className="flex items-center gap-6 text-xs text-gray-700">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aadhaarOpt"
                  checked={aadhaarProvided}
                  onChange={() => setAadhaarProvided(true)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                Yes (Voluntary Masked Aadhaar)
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="aadhaarOpt"
                  checked={!aadhaarProvided}
                  onChange={() => setAadhaarProvided(false)}
                  className="text-blue-600 focus:ring-blue-500"
                />
                No (Provide Alternative Identity Document)
              </label>
            </div>
          </div>

          {/* Attached Documents List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Identity Documents for Verification
              </h3>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddDocument}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Document
              </Button>
            </div>

            {identityDocs.map((doc, idx) => (
              <div key={idx} className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold text-gray-700">Document #{idx + 1}</span>
                  {identityDocs.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveDocument(idx)}
                      className="text-red-600 hover:text-red-800 text-xs flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Document Type *</label>
                    <Select
                      value={doc.documentType}
                      onChange={(e) => {
                        const updated = identityDocs.map((item, i) =>
                          i === idx ? { ...item, documentType: e.target.value as IdentityDocumentType } : item
                        );
                        setIdentityDocs(updated);
                      }}
                      options={[
                        { value: 'birth_certificate', label: 'Birth Certificate' },
                        { value: 'masked_aadhaar', label: 'Masked Aadhaar (Last 4 digits)' },
                        { value: 'passport', label: 'Passport' },
                        { value: 'school_leaving_certificate', label: 'School Leaving Certificate' },
                        { value: 'transfer_certificate', label: 'Transfer Certificate' },
                        { value: 'ration_card', label: 'Ration Card' },
                        { value: 'national_id', label: 'National Identity Card' },
                        { value: 'other', label: 'Other Government ID' },
                      ]}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">
                      {doc.documentType === 'masked_aadhaar'
                        ? 'Masked Reference (Last 4 Digits) *'
                        : 'Document Reference / Certificate No. *'}
                    </label>
                    <Input
                      placeholder={
                        doc.documentType === 'masked_aadhaar'
                          ? 'XXXX-XXXX-1234'
                          : 'e.g. BC-2024-8971'
                      }
                      value={doc.maskedReference}
                      onChange={(e) => {
                        const updated = identityDocs.map((item, i) =>
                          i === idx ? { ...item, maskedReference: e.target.value } : item
                        );
                        setIdentityDocs(updated);
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Issuing Authority</label>
                    <Input
                      placeholder="e.g. Municipal Corp / Govt of India"
                      value={doc.issuingAuthority || ''}
                      onChange={(e) => {
                        const updated = identityDocs.map((item, i) =>
                          i === idx ? { ...item, issuingAuthority: e.target.value } : item
                        );
                        setIdentityDocs(updated);
                      }}
                    />
                  </div>
                </div>

                {/* Upload Status Card */}
                <div className="flex items-center justify-between p-3 bg-white border border-dashed border-gray-300 rounded text-xs text-gray-600">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-600" />
                    <span>{doc.fileName}</span>
                    <span className="text-[10px] text-gray-400">({(doc.fileSize / 1024).toFixed(0)} KB)</span>
                  </div>
                  <Badge variant="info">Encrypted Storage Ready</Badge>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* STEP 3: Parents & Guardians */}
      {currentStep === 3 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Step 3: Parent & Legal Guardian Details</h2>
              <p className="text-xs text-gray-500">
                Single-parent, two-parent, and authorized legal guardian arrangements supported.
              </p>
            </div>
            <span className="text-xs text-gray-400 font-mono">3 / 5</span>
          </div>

          {/* Guardian Arrangement Selector */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Family / Guardianship Arrangement
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: 'both', label: 'Both Parents' },
                { id: 'single_mother', label: 'Single Parent (Mother)' },
                { id: 'single_father', label: 'Single Parent (Father)' },
                { id: 'legal_guardian', label: 'Legal Guardian' },
              ].map((arr) => (
                <button
                  key={arr.id}
                  type="button"
                  onClick={() => {
                    setParentStructure(arr.id as any);
                    if (arr.id === 'single_mother') setP1Relationship('mother');
                    if (arr.id === 'single_father') setP1Relationship('father');
                  }}
                  className={`p-3 rounded-lg border text-xs text-center transition-all ${
                    parentStructure === arr.id
                      ? 'border-blue-600 bg-blue-50 text-blue-900 font-semibold'
                      : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  {arr.label}
                </button>
              ))}
            </div>
          </div>

          {/* Legal Guardian Section if selected */}
          {parentStructure === 'legal_guardian' ? (
            <div className="p-4 border border-blue-200 bg-blue-50/40 rounded-lg space-y-4">
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                Legal Guardian Information
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship to Student *</label>
                  <Select
                    value={guardianRelationship}
                    onChange={(e) => setGuardianRelationship(e.target.value as any)}
                    options={[
                      { value: 'legal_guardian', label: 'Appointed Legal Guardian' },
                      { value: 'grandparent', label: 'Grandparent' },
                      { value: 'foster_parent', label: 'Foster Parent' },
                      { value: 'sibling', label: 'Adult Sibling' },
                      { value: 'other', label: 'Other Authorized Custodian' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian First Name *</label>
                  <Input
                    value={guardianFirstName}
                    onChange={(e) => setGuardianFirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Guardian Last Name *</label>
                  <Input
                    value={guardianLastName}
                    onChange={(e) => setGuardianLastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Primary Mobile *</label>
                  <Input
                    placeholder="10-digit mobile"
                    value={guardianPhone}
                    onChange={(e) => setGuardianPhone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <Input
                    placeholder="guardian@example.com"
                    value={guardianEmail}
                    onChange={(e) => setGuardianEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* Parent 1 (Primary Guardian) */
            <div className="p-4 border border-gray-200 rounded-lg space-y-4 bg-gray-50/40">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-blue-600" />
                Primary Parent / Guardian ({p1Relationship === 'mother' ? 'Mother' : 'Father'})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship *</label>
                  <Select
                    value={p1Relationship}
                    onChange={(e) => setP1Relationship(e.target.value as any)}
                    options={[
                      { value: 'father', label: 'Father' },
                      { value: 'mother', label: 'Mother' },
                      { value: 'legal_guardian', label: 'Legal Guardian' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name *</label>
                  <Input
                    value={p1FirstName}
                    onChange={(e) => setP1FirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name *</label>
                  <Input
                    value={p1LastName}
                    onChange={(e) => setP1LastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number *</label>
                  <Input
                    placeholder="Mobile number"
                    value={p1Phone}
                    onChange={(e) => setP1Phone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Alternate Phone</label>
                  <Input
                    placeholder="Alternate mobile"
                    value={p1PhoneSecondary}
                    onChange={(e) => setP1PhoneSecondary(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <Input
                    placeholder="parent@example.com"
                    value={p1Email}
                    onChange={(e) => setP1Email(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Occupation / Profession</label>
                  <Input
                    placeholder="e.g. Software Engineer, Doctor, Business"
                    value={p1Occupation}
                    onChange={(e) => setP1Occupation(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Employer / Organization</label>
                  <Input
                    placeholder="Employer name"
                    value={p1Employer}
                    onChange={(e) => setP1Employer(e.target.value)}
                  />
                </div>
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-gray-700">
                  <input
                    type="checkbox"
                    checked={p1SameAddress}
                    onChange={(e) => setP1SameAddress(e.target.checked)}
                    className="rounded text-blue-600 focus:ring-blue-500"
                  />
                  Residential address same as student address
                </label>
                {!p1SameAddress && (
                  <div className="mt-2">
                    <Input
                      placeholder="Parent residential address"
                      value={p1Address}
                      onChange={(e) => setP1Address(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Parent 2 (Secondary Guardian) if Both Parents selected */}
          {parentStructure === 'both' && (
            <div className="p-4 border border-gray-200 rounded-lg space-y-4 bg-gray-50/40">
              <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-4 h-4 text-purple-600" />
                Secondary Parent ({p2Relationship === 'mother' ? 'Mother' : 'Father'})
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Relationship</label>
                  <Select
                    value={p2Relationship}
                    onChange={(e) => setP2Relationship(e.target.value as any)}
                    options={[
                      { value: 'mother', label: 'Mother' },
                      { value: 'father', label: 'Father' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">First Name</label>
                  <Input
                    value={p2FirstName}
                    onChange={(e) => setP2FirstName(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Last Name</label>
                  <Input
                    value={p2LastName}
                    onChange={(e) => setP2LastName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Mobile Number</label>
                  <Input
                    placeholder="Mobile number"
                    value={p2Phone}
                    onChange={(e) => setP2Phone(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Email Address</label>
                  <Input
                    placeholder="email@example.com"
                    value={p2Email}
                    onChange={(e) => setP2Email(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Occupation</label>
                  <Input
                    placeholder="Occupation"
                    value={p2Occupation}
                    onChange={(e) => setP2Occupation(e.target.value)}
                  />
                </div>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* STEP 4: Emergency Contacts & Pickups */}
      {currentStep === 4 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Step 4: Emergency Contacts & Pickups</h2>
              <p className="text-xs text-gray-500">
                Designate who to call in an urgent event and who is authorized to pick up the student.
              </p>
            </div>
            <span className="text-xs text-gray-400 font-mono">4 / 5</span>
          </div>

          {/* Emergency Contacts */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 border border-rose-200 bg-rose-50/30 rounded-lg space-y-3">
              <span className="text-xs font-bold text-rose-800 uppercase tracking-wider block">
                Primary Emergency Contact *
              </span>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <Input
                  value={primaryEmergName}
                  onChange={(e) => setPrimaryEmergName(e.target.value)}
                  placeholder="Primary contact name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Relationship *</label>
                  <Input
                    value={primaryEmergRel}
                    onChange={(e) => setPrimaryEmergRel(e.target.value)}
                    placeholder="e.g. Father"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number *</label>
                  <Input
                    value={primaryEmergPhone}
                    onChange={(e) => setPrimaryEmergPhone(e.target.value)}
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border border-gray-200 rounded-lg space-y-3 bg-gray-50/50">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wider block">
                Secondary Emergency Contact (Optional)
              </span>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name</label>
                <Input
                  value={secondaryEmergName}
                  onChange={(e) => setSecondaryEmergName(e.target.value)}
                  placeholder="Secondary contact name"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Relationship</label>
                  <Input
                    value={secondaryEmergRel}
                    onChange={(e) => setSecondaryEmergRel(e.target.value)}
                    placeholder="e.g. Mother / Uncle"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Phone Number</label>
                  <Input
                    value={secondaryEmergPhone}
                    onChange={(e) => setSecondaryEmergPhone(e.target.value)}
                    placeholder="Phone"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Authorized Pickups */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
                  Authorized Pickup Individuals
                </h3>
                <p className="text-[11px] text-gray-500">
                  Persons authorized to safely pick up the student from school premises.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPickups([...pickups, { name: '', relationship: '', phone: '', idMaskedRef: '' }])}
                className="text-xs flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add Pickup Person
              </Button>
            </div>

            {pickups.map((p, idx) => (
              <div key={idx} className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end p-3 border border-gray-200 rounded-lg bg-gray-50">
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Full Name</label>
                  <Input
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => {
                      const updated = pickups.map((pickItem, i) =>
                        i === idx ? { ...pickItem, name: e.target.value } : pickItem
                      );
                      setPickups(updated);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Relationship</label>
                  <Input
                    placeholder="e.g. Grandfather / Driver"
                    value={p.relationship}
                    onChange={(e) => {
                      const updated = pickups.map((pickItem, i) =>
                        i === idx ? { ...pickItem, relationship: e.target.value } : pickItem
                      );
                      setPickups(updated);
                    }}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-gray-600 mb-1">Contact Phone</label>
                  <Input
                    placeholder="Phone"
                    value={p.phone}
                    onChange={(e) => {
                      const updated = pickups.map((pickItem, i) =>
                        i === idx ? { ...pickItem, phone: e.target.value } : pickItem
                      );
                      setPickups(updated);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1">
                    <label className="block text-[11px] font-medium text-gray-600 mb-1">Masked ID Proof Ref</label>
                    <Input
                      placeholder="e.g. DL-XXXX-5541"
                      value={p.idMaskedRef}
                      onChange={(e) => {
                        const updated = pickups.map((pickItem, i) =>
                          i === idx ? { ...pickItem, idMaskedRef: e.target.value } : pickItem
                        );
                        setPickups(updated);
                      }}
                    />
                  </div>
                  {pickups.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setPickups(pickups.filter((_, i) => i !== idx))}
                      className="text-red-500 hover:text-red-700 p-2"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Medical Emergencies (Restricted) */}
          <div className="p-4 border border-blue-200 bg-blue-50/30 rounded-lg space-y-3">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-blue-700" />
              <h3 className="text-xs font-semibold text-blue-900 uppercase tracking-wider">
                Emergency Medical Guidance (Restricted Access)
              </h3>
            </div>
            <p className="text-[11px] text-gray-600">
              This information is protected under privacy rules and visible only to medical responders, administrators, and designated teachers.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Critical Allergies / Food Alerts</label>
                <Input
                  placeholder="e.g. Severe peanut allergy, Penicillin"
                  value={criticalAllergies}
                  onChange={(e) => setCriticalAllergies(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Regular Medications</label>
                <Input
                  placeholder="e.g. Inhaler for asthma"
                  value={regularMedications}
                  onChange={(e) => setRegularMedications(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Emergency Hospital</label>
                <Input
                  placeholder="e.g. City Apollo Hospital"
                  value={emergencyHospital}
                  onChange={(e) => setEmergencyHospital(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Family Doctor Contact</label>
                <Input
                  placeholder="Doctor Name & Contact"
                  value={familyDoctor}
                  onChange={(e) => setFamilyDoctor(e.target.value)}
                />
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* STEP 5: Consents & Final Review */}
      {currentStep === 5 && (
        <Card className="p-6 space-y-6">
          <div className="border-b border-gray-100 pb-3 flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Step 5: Consent Management & Review</h2>
              <p className="text-xs text-gray-500">
                Digital Personal Data Protection (DPDP) Act Compliance: Consents must be explicit and unbundled.
              </p>
            </div>
            <span className="text-xs text-gray-400 font-mono">5 / 5</span>
          </div>

          {/* Application Summary Box */}
          <div className="p-4 border border-gray-200 rounded-lg bg-gray-50/60 text-xs text-gray-700 space-y-2">
            <span className="font-semibold block text-gray-900 uppercase tracking-wider text-[11px]">
              Submission Summary
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div>
                <span className="text-gray-400 block text-[10px]">Student Name</span>
                <span className="font-medium text-gray-800">{firstName} {lastName}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Education Tier</span>
                <span className="font-medium text-gray-800">{eduConfig.label}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Date of Birth</span>
                <span className="font-medium text-gray-800">{dateOfBirth}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Category</span>
                <span className="font-medium text-gray-800 capitalize">{admissionCategory}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 border-t border-gray-200">
              <div>
                <span className="text-gray-400 block text-[10px]">Primary Contact</span>
                <span className="font-medium text-gray-800">{p1FirstName || guardianFirstName} ({p1Phone || guardianPhone})</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Identity Docs</span>
                <span className="font-medium text-gray-800">{identityDocs.length} Verified Attachments</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Transport</span>
                <span className="font-medium text-gray-800">{transportRequired ? 'Yes (Opted)' : 'No'}</span>
              </div>
              <div>
                <span className="text-gray-400 block text-[10px]">Hostel</span>
                <span className="font-medium text-gray-800">{hostelRequired ? 'Yes (Opted)' : 'No'}</span>
              </div>
            </div>
          </div>

          {/* Mandatory Consents */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider">
              Mandatory Legal Declarations
            </h3>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block text-gray-900">
                  1. Declaration of Accuracy & Terms of Admission *
                </span>
                <span className="text-gray-600">
                  I certify that all information provided in this registration is true, accurate, and complete. I understand that misrepresentation of identity or documents may invalidate the admission.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800">
              <input
                type="checkbox"
                checked={privacyAccepted}
                onChange={(e) => setPrivacyAccepted(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block text-gray-900">
                  2. Privacy Notice & Data Processing Acknowledgement (DPDP Act) *
                </span>
                <span className="text-gray-600">
                  I acknowledge having read the institution&apos;s Privacy Policy regarding the processing of personal and identity data solely for educational, administrative, safety, and regulatory purposes.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800">
              <input
                type="checkbox"
                checked={medicalEmergencyAccepted}
                onChange={(e) => setMedicalEmergencyAccepted(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block text-gray-900">
                  3. Emergency Medical Treatment Authorization *
                </span>
                <span className="text-gray-600">
                  In case of urgent medical emergency or severe injury when parents cannot be immediately contacted, I authorize the institution to administer first aid and arrange medical evaluation.
                </span>
              </div>
            </label>
          </div>

          {/* Optional Consents (Unbundled) */}
          <div className="space-y-3 pt-2 border-t border-gray-100">
            <h3 className="text-xs font-semibold text-gray-800 uppercase tracking-wider flex items-center justify-between">
              <span>Optional Consents (Freely Given & Separately Revocable)</span>
              <Badge variant="info">Unbundled DPDP</Badge>
            </h3>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800">
              <input
                type="checkbox"
                checked={photoMediaConsent}
                onChange={(e) => setPhotoMediaConsent(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block text-gray-900">
                  Student Photograph & School Media Publications (Optional)
                </span>
                <span className="text-gray-600">
                  I consent to the inclusion of student photographs/group video clips in school newsletters, annual magazines, and official academic media. You may withdraw this consent at any time via the parent portal.
                </span>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer text-xs text-gray-800">
              <input
                type="checkbox"
                checked={nonEssentialCommunicationsConsent}
                onChange={(e) => setNonEssentialCommunicationsConsent(e.target.checked)}
                className="mt-0.5 rounded text-blue-600 focus:ring-blue-500"
              />
              <div>
                <span className="font-semibold block text-gray-900">
                  Extracurricular Seminars & Optional Academic Programs (Optional)
                </span>
                <span className="text-gray-600">
                  I consent to receiving informational invitations regarding external Olympiads, career guidance symposiums, and optional workshops.
                </span>
              </div>
            </label>
          </div>

          {/* Consenting Person Signature */}
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg space-y-3">
            <span className="text-xs font-semibold text-gray-800 uppercase tracking-wider block">
              Consent Signatory Declaration
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Full Legal Name of Consenting Parent / Guardian *
                </label>
                <Input
                  placeholder="Full name as signature"
                  value={consentingPersonName}
                  onChange={(e) => setConsentingPersonName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Relationship to Student *</label>
                <Input
                  placeholder="e.g. Father, Mother, Legal Guardian"
                  value={consentingPersonRel}
                  onChange={(e) => setConsentingPersonRel(e.target.value)}
                />
              </div>
            </div>
            <p className="text-[11px] text-gray-500">
              By submitting, an immutable, timestamped consent record will be created with your client IP and user metadata.
            </p>
          </div>
        </Card>
      )}

      {/* Navigation & Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <div>
          {currentStep > 1 && (
            <Button
              variant="outline"
              onClick={handlePrev}
              disabled={isSubmitting}
              className="flex items-center gap-1.5"
            >
              <ArrowLeft className="w-4 h-4" />
              Previous
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3">
          {currentStep < 5 ? (
            <Button
              onClick={handleNext}
              className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-1.5"
            >
              Continue to Step {currentStep + 1}
              <ArrowRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={handleSubmitApplication}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium px-8 flex items-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isSubmitting ? 'Submitting Application...' : 'Confirm & Submit Application'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
