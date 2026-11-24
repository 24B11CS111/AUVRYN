import { describe, it, expect } from 'vitest';
import {
  studentRegistrationSchema,
  identityDocumentSchema,
  emergencyContactSchema,
  guardianRegistrationSchema,
  verifyIdentityDocumentSchema,
  withdrawConsentSchema,
  parentEmergencyContactsUpdateSchema,
  MAX_DOCUMENT_FILE_SIZE_BYTES,
} from '../../packages/validators/src';

const VALID_INSTITUTION_ID = '11111111-1111-1111-1111-111111111111';
const VALID_ACADEMIC_YEAR_ID = '22222222-2222-2222-2222-222222222222';
const VALID_PROGRAM_ID = '33333333-3333-3333-3333-333333333333';
const VALID_CLASS_ID = '44444444-4444-4444-4444-444444444444';

const baseValidStudentDetails = {
  institutionId: VALID_INSTITUTION_ID,
  educationType: 'primary_school' as const,
  academicYearId: VALID_ACADEMIC_YEAR_ID,
  programId: VALID_PROGRAM_ID,
  classId: VALID_CLASS_ID,
  admissionCategory: 'general' as const,
  firstName: 'Aarav',
  middleName: 'Kumar',
  lastName: 'Sharma',
  preferredName: 'Aaru',
  dateOfBirth: '2018-06-15',
  gender: 'male' as const,
  bloodGroup: 'B+',
  email: 'aarav.sharma@example.com',
  phone: '+91 9876543210',
  address: '42, MG Road, Indiranagar',
  city: 'Bengaluru',
  state: 'Karnataka',
  country: 'India',
  postalCode: '560038',
  nationality: 'Indian',
  motherTongue: 'Kannada',
  secondLanguage: 'Hindi',
  religion: 'Hindu',
  casteCategory: 'General',
  birthplaceCity: 'Bengaluru',
  birthplaceState: 'Karnataka',
  birthplaceCountry: 'India',
  identificationMark1: 'Mole on right cheek',
  identificationMark2: '',
  previousSchoolName: 'Little Angels Pre-Primary',
  previousGradeOrScore: 'Grade 1',
  transportRequired: false,
  hostelRequired: false,
  siblingInfo: [],
  medicalAlerts: {
    allergies: ['Peanuts'],
    bloodGroupConfirmed: true,
    emergencyHospital: 'Manipal Hospital, Indiranagar',
    familyDoctorName: 'Dr. Ramesh Rao',
    familyDoctorPhone: '+91 9845012345',
    notes: 'Mild asthma during winter seasons',
  },
  specialNeeds: {
    hasSpecialNeeds: false,
  },
  registrationTermsAccepted: true as const,
  privacyNoticeAccepted: true as const,
  photoMediaConsent: false,
  nonEssentialCommunicationsConsent: false,
  emergencyMedicalTreatmentAccepted: true as const,
  consentedByName: 'Sunita Sharma',
  consentedByRelationship: 'Mother',
};

const validMotherGuardian = {
  relationship: 'mother' as const,
  firstName: 'Sunita',
  lastName: 'Sharma',
  phone: '+91 9876543220',
  email: 'sunita.sharma@example.com',
  occupation: 'Software Engineer',
  employer: 'Infosys Ltd',
  annualIncomeRange: '10-25 LPA',
  educationQualification: 'B.Tech Computer Science',
  address: '42, MG Road, Indiranagar, Bengaluru',
  preferredCommunicationChannel: 'whatsapp' as const,
  preferredLanguage: 'en',
  portalAccessRequired: true,
};

const validFatherGuardian = {
  relationship: 'father' as const,
  firstName: 'Rajesh',
  lastName: 'Sharma',
  phone: '+91 9876543221',
  email: 'rajesh.sharma@example.com',
  occupation: 'Architect',
  employer: 'Design Studios',
  annualIncomeRange: '15-30 LPA',
  educationQualification: 'B.Arch',
  address: '42, MG Road, Indiranagar, Bengaluru',
  preferredCommunicationChannel: 'whatsapp' as const,
  preferredLanguage: 'en',
  portalAccessRequired: true,
};

const validLegalGuardian = {
  relationship: 'legal_guardian' as const,
  firstName: 'Vikram',
  lastName: 'Mehta',
  phone: '+91 9876543230',
  email: 'vikram.mehta@example.com',
  occupation: 'Advocate',
  employer: 'High Court',
  annualIncomeRange: '20-50 LPA',
  educationQualification: 'LL.B',
  address: '101, Richmond Road, Bengaluru',
  preferredCommunicationChannel: 'email' as const,
  preferredLanguage: 'en',
  portalAccessRequired: true,
};

const validPrimaryEmergency = {
  priority: 'primary' as const,
  name: 'Sunita Sharma',
  relationship: 'Mother',
  phonePrimary: '+91 9876543220',
  phoneSecondary: '+91 9876543221',
  email: 'sunita.sharma@example.com',
  isAuthorizedPickup: true,
  pickupIdType: 'Aadhaar (Masked)',
  pickupIdMaskedRef: 'XXXX-XXXX-9901',
};

const validMaskedAadhaarDoc = {
  documentType: 'masked_aadhaar' as const,
  maskedReference: 'XXXX-XXXX-1234',
  documentFilePath: 'institutions/test/students/aadhaar_masked.pdf',
  fileName: 'aadhaar_masked.pdf',
  fileSize: 1024 * 500, // 500 KB
  mimeType: 'application/pdf' as const,
  issuingAuthority: 'UIDAI',
  issueDate: '2020-01-10',
};

const validBirthCertDoc = {
  documentType: 'birth_certificate' as const,
  maskedReference: 'BC-2018-98765',
  documentFilePath: 'institutions/test/students/birth_certificate.pdf',
  fileName: 'birth_certificate.pdf',
  fileSize: 1024 * 750, // 750 KB
  mimeType: 'application/pdf' as const,
  issuingAuthority: 'BBMP Bengaluru',
  issueDate: '2018-07-01',
};

describe('Unit: Student Registration & Identity Validators (Phases 1-5, 11)', () => {
  // Scenario 1: Complete registration with Aadhaar provided (masked ref, last 4 digits valid)
  it('Scenario 1: allows registration with voluntary masked Aadhaar and valid document', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: true,
      identityDocuments: [validMaskedAadhaarDoc],
      primaryGuardian: validMotherGuardian,
      primaryEmergencyContact: validPrimaryEmergency,
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.aadhaarProvided).toBe(true);
      expect(res.data.identityDocuments[0].maskedReference).toBe('XXXX-XXXX-1234');
    }
  });

  // Scenario 2: Complete registration with Aadhaar NOT provided (Aadhaar opt-out, Birth Certificate provided instead)
  it('Scenario 2: allows registration when Aadhaar is opted-out and alternative document is provided', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: false,
      identityDocuments: [validBirthCertDoc],
      primaryGuardian: validMotherGuardian,
      primaryEmergencyContact: validPrimaryEmergency,
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.aadhaarProvided).toBe(false);
      expect(res.data.identityDocuments[0].documentType).toBe('birth_certificate');
    }
  });

  it('Scenario 2b: rejects registration when Aadhaar is opted-out but NO alternative document is provided', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: false,
      identityDocuments: [
        {
          ...validMaskedAadhaarDoc,
          documentType: 'masked_aadhaar' as const,
        },
      ],
      primaryGuardian: validMotherGuardian,
      primaryEmergencyContact: validPrimaryEmergency,
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(false);
    if (!res.success) {
      const errorMsg = res.error.issues.map((i) => i.message).join('; ');
      expect(errorMsg).toContain(
        'If Aadhaar is not provided, an alternative document (Birth Certificate, Passport, etc.) is required.'
      );
    }
  });

  // Scenario 3: Attempt registration with full 12-digit unmasked Aadhaar number -> Must be REJECTED
  it('Scenario 3: strictly rejects raw 12-digit unmasked Aadhaar numbers', () => {
    const raw12DigitDoc = {
      documentType: 'masked_aadhaar' as const,
      maskedReference: '123456789012', // Prohibited!
      documentFilePath: 'institutions/test/students/aadhaar.pdf',
      fileName: 'aadhaar.pdf',
      fileSize: 1024 * 300,
      mimeType: 'application/pdf' as const,
    };

    const docRes = identityDocumentSchema.safeParse(raw12DigitDoc);
    expect(docRes.success).toBe(false);
    if (!docRes.success) {
      expect(docRes.error.issues[0].message).toContain(
        'Full unmasked 12-digit Aadhaar number is prohibited'
      );
    }

    const spaceSeparated12DigitDoc = {
      ...raw12DigitDoc,
      maskedReference: '1234 5678 9012', // Also prohibited!
    };
    const spaceRes = identityDocumentSchema.safeParse(spaceSeparated12DigitDoc);
    expect(spaceRes.success).toBe(false);
  });

  // Scenario 4: Attempt upload with non-permitted document type -> Must be REJECTED
  it('Scenario 4: rejects non-permitted mime types (e.g., text/plain, application/zip, exe)', () => {
    const invalidMimeDoc = {
      documentType: 'birth_certificate' as const,
      maskedReference: 'BC-1234',
      documentFilePath: 'institutions/test/students/script.sh',
      fileName: 'script.sh',
      fileSize: 1024 * 10,
      mimeType: 'text/plain' as any,
    };

    const res = identityDocumentSchema.safeParse(invalidMimeDoc);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('Invalid file format');
    }
  });

  // Scenario 5: Attempt upload with file exceeding 5MB -> Must be REJECTED
  it('Scenario 5: rejects file uploads exceeding 5MB limit', () => {
    const oversizedDoc = {
      documentType: 'birth_certificate' as const,
      maskedReference: 'BC-1234',
      documentFilePath: 'institutions/test/students/large_scan.pdf',
      fileName: 'large_scan.pdf',
      fileSize: MAX_DOCUMENT_FILE_SIZE_BYTES + 1, // 5MB + 1 byte
      mimeType: 'application/pdf' as const,
    };

    const res = identityDocumentSchema.safeParse(oversizedDoc);
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].message).toContain('File size exceeds 5MB limit');
    }
  });

  // Scenario 6: Single parent registration (only Mother) -> Must SUCCEED
  it('Scenario 6: allows single parent registration with only Mother provided', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: false,
      identityDocuments: [validBirthCertDoc],
      primaryGuardian: validMotherGuardian, // Only Mother
      secondaryGuardian: undefined,
      hasLegalGuardian: false,
      legalGuardian: undefined,
      primaryEmergencyContact: validPrimaryEmergency,
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.primaryGuardian.relationship).toBe('mother');
      expect(res.data.secondaryGuardian).toBeUndefined();
    }
  });

  // Scenario 7: Single parent registration (only Father) -> Must SUCCEED
  it('Scenario 7: allows single parent registration with only Father provided', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: false,
      identityDocuments: [validBirthCertDoc],
      primaryGuardian: validFatherGuardian, // Only Father
      secondaryGuardian: undefined,
      hasLegalGuardian: false,
      legalGuardian: undefined,
      primaryEmergencyContact: {
        ...validPrimaryEmergency,
        name: 'Rajesh Sharma',
        relationship: 'Father',
        phonePrimary: '+91 9876543221',
      },
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.primaryGuardian.relationship).toBe('father');
      expect(res.data.secondaryGuardian).toBeUndefined();
    }
  });

  // Scenario 8: Legal guardian registration (non-parent) -> Must SUCCEED
  it('Scenario 8: allows legal guardian registration (non-parent court-appointed guardian)', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: false,
      identityDocuments: [validBirthCertDoc],
      primaryGuardian: validLegalGuardian,
      secondaryGuardian: undefined,
      hasLegalGuardian: true,
      legalGuardian: validLegalGuardian,
      primaryEmergencyContact: {
        priority: 'primary' as const,
        name: 'Vikram Mehta',
        relationship: 'Legal Guardian',
        phonePrimary: '+91 9876543230',
        isAuthorizedPickup: true,
      },
      consentedByName: 'Vikram Mehta',
      consentedByRelationship: 'Legal Guardian',
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.primaryGuardian.relationship).toBe('legal_guardian');
      expect(res.data.hasLegalGuardian).toBe(true);
    }
  });

  // Scenario 9: Both parents registration with primary and secondary designations -> Must SUCCEED
  it('Scenario 9: allows both parents registration with primary and secondary designations', () => {
    const input = {
      ...baseValidStudentDetails,
      aadhaarProvided: true,
      identityDocuments: [validMaskedAadhaarDoc, validBirthCertDoc],
      primaryGuardian: validFatherGuardian,
      secondaryGuardian: validMotherGuardian,
      hasLegalGuardian: false,
      primaryEmergencyContact: {
        priority: 'primary' as const,
        name: 'Rajesh Sharma',
        relationship: 'Father',
        phonePrimary: '+91 9876543221',
        isAuthorizedPickup: true,
      },
      secondaryEmergencyContact: {
        priority: 'secondary' as const,
        name: 'Sunita Sharma',
        relationship: 'Mother',
        phonePrimary: '+91 9876543220',
        isAuthorizedPickup: true,
      },
      authorizedPickups: [
        {
          priority: 'secondary' as const,
          name: 'Grandmother Shanti Sharma',
          relationship: 'Grandmother',
          phonePrimary: '+91 9876543299',
          isAuthorizedPickup: true,
          pickupIdType: 'Voter ID',
          pickupIdMaskedRef: 'ABC1234567',
        },
      ],
    };

    const res = studentRegistrationSchema.safeParse(input);
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.primaryGuardian.relationship).toBe('father');
      expect(res.data.secondaryGuardian?.relationship).toBe('mother');
      expect(res.data.authorizedPickups?.length).toBe(1);
    }
  });

  // Verification & Consent Schemas Tests
  describe('Document Verification & Consent Withdrawal Schemas', () => {
    it('validates identity document verification action payload', () => {
      const validVerify = verifyIdentityDocumentSchema.safeParse({
        documentId: '55555555-5555-5555-5555-555555555555',
        verificationStatus: 'verified',
        verificationNotes: 'Verified against municipal birth registry record.',
      });
      expect(validVerify.success).toBe(true);

      const invalidStatus = verifyIdentityDocumentSchema.safeParse({
        documentId: '55555555-5555-5555-5555-555555555555',
        verificationStatus: 'unknown_status' as any,
      });
      expect(invalidStatus.success).toBe(false);
    });

    it('validates consent withdrawal schema with reason', () => {
      const validWithdraw = withdrawConsentSchema.safeParse({
        studentId: '66666666-6666-6666-6666-666666666666',
        consentType: 'photo_media_publication',
        withdrawalReason: 'Parent prefers child not to be featured on school social media.',
      });
      expect(validWithdraw.success).toBe(true);
    });

    it('validates parent emergency contact update schema', () => {
      const validUpdate = parentEmergencyContactsUpdateSchema.safeParse({
        studentId: '66666666-6666-6666-6666-666666666666',
        primaryEmergencyContact: {
          priority: 'primary',
          name: 'Sunita Sharma',
          relationship: 'Mother',
          phonePrimary: '+91 9876543220',
          isAuthorizedPickup: true,
        },
      });
      expect(validUpdate.success).toBe(true);
    });
  });
});
