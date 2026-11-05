import { describe, it, expect } from 'vitest';
import {
  studentCreateSchema,
  studentUpdateSchema,
  guardianCreateSchema,
  guardianUpdateSchema,
  linkGuardianSchema,
  studentEnrollmentCreateSchema,
  studentDocumentUploadSchema,
  studentDocumentVerifySchema,
  admissionApplicationCreateSchema,
  admissionStatusUpdateSchema,
  admissionConversionSchema,
} from '../../packages/validators/src';

describe('Unit: Student & Admissions Validators', () => {
  // 1. Student Identity Validators
  describe('studentCreateSchema', () => {
    it('accepts valid student registration input', () => {
      const valid = studentCreateSchema.safeParse({
        admissionNumber: 'ADM-2026-0001',
        firstName: 'Aarav',
        middleName: 'Kumar',
        lastName: 'Sharma',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        bloodGroup: 'B+',
        email: 'aarav.sharma@example.com',
        phone: '+91 9876543210',
        address: 'Flat 402, Lotus Apartments',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        postalCode: '500081',
        nationality: 'Indian',
        emergencyContactName: 'Ramesh Sharma',
        emergencyContactPhone: '+91 9876543211',
        emergencyContactRelationship: 'Father',
        dateOfJoining: '2026-06-01',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.status).toBe('active');
        expect(valid.data.nationality).toBe('Indian');
      }
    });

    it('rejects student registration missing required fields', () => {
      const missingName = studentCreateSchema.safeParse({
        admissionNumber: 'ADM-001',
        firstName: '',
        lastName: 'Sharma',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        emergencyContactName: 'Father',
        emergencyContactPhone: '9876543210',
        emergencyContactRelationship: 'Father',
      });
      expect(missingName.success).toBe(false);

      const invalidDob = studentCreateSchema.safeParse({
        admissionNumber: 'ADM-001',
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '15/05/2010', // Invalid format (must be YYYY-MM-DD)
        gender: 'male',
        emergencyContactName: 'Father',
        emergencyContactPhone: '9876543210',
        emergencyContactRelationship: 'Father',
      });
      expect(invalidDob.success).toBe(false);
    });

    it('rejects invalid email and invalid gender', () => {
      const invalidGender = studentCreateSchema.safeParse({
        admissionNumber: 'ADM-001',
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '2010-05-15',
        gender: 'unspecified' as any,
        emergencyContactName: 'Father',
        emergencyContactPhone: '9876543210',
        emergencyContactRelationship: 'Father',
      });
      expect(invalidGender.success).toBe(false);

      const invalidEmail = studentCreateSchema.safeParse({
        admissionNumber: 'ADM-001',
        firstName: 'Aarav',
        lastName: 'Sharma',
        dateOfBirth: '2010-05-15',
        gender: 'male',
        email: 'not-an-email',
        emergencyContactName: 'Father',
        emergencyContactPhone: '9876543210',
        emergencyContactRelationship: 'Father',
      });
      expect(invalidEmail.success).toBe(false);
    });
  });

  describe('studentUpdateSchema', () => {
    it('accepts partial student updates', () => {
      const valid = studentUpdateSchema.safeParse({
        firstName: 'Aarav Updated',
        status: 'suspended',
        bloodGroup: 'O+',
      });
      expect(valid.success).toBe(true);
    });
  });

  // 2. Guardian Validators
  describe('guardianCreateSchema & linkGuardianSchema', () => {
    it('validates guardian creation payload', () => {
      const valid = guardianCreateSchema.safeParse({
        firstName: 'Sunita',
        lastName: 'Sharma',
        email: 'sunita.sharma@example.com',
        phone: '+91 9876543212',
        relationshipDefault: 'Mother',
        occupation: 'Architect',
        city: 'Hyderabad',
      });
      expect(valid.success).toBe(true);

      const invalid = guardianCreateSchema.safeParse({
        firstName: '',
        lastName: '',
        phone: '',
      });
      expect(invalid.success).toBe(false);
    });

    it('validates guardian linking with student', () => {
      const valid = linkGuardianSchema.safeParse({
        studentId: '11111111-1111-1111-1111-111111111111',
        guardianId: '22222222-2222-2222-2222-222222222222',
        relationship: 'Mother',
        isPrimary: true,
        isEmergencyContact: true,
        canPickup: true,
      });
      expect(valid.success).toBe(true);

      const invalid = linkGuardianSchema.safeParse({
        studentId: 'invalid-uuid',
        guardianId: '',
        relationship: '',
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 3. Academic Enrollment Validators
  describe('studentEnrollmentCreateSchema', () => {
    it('accepts valid academic enrollment linking student to hierarchy', () => {
      const valid = studentEnrollmentCreateSchema.safeParse({
        studentId: '11111111-1111-1111-1111-111111111111',
        academicYearId: '22222222-2222-2222-2222-222222222222',
        programId: '33333333-3333-3333-3333-333333333333',
        classId: '44444444-4444-4444-4444-444444444444',
        sectionId: '55555555-5555-5555-5555-555555555555',
        rollNumber: '101',
        enrollmentDate: '2026-06-01',
      });
      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.status).toBe('enrolled');
      }
    });

    it('rejects enrollment with missing academic year or program', () => {
      const invalid = studentEnrollmentCreateSchema.safeParse({
        studentId: '11111111-1111-1111-1111-111111111111',
        classId: '44444444-4444-4444-4444-444444444444',
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 4. Student Documents Validators
  describe('studentDocumentUploadSchema & verifySchema', () => {
    it('accepts valid document upload metadata', () => {
      const valid = studentDocumentUploadSchema.safeParse({
        studentId: '11111111-1111-1111-1111-111111111111',
        documentType: 'birth_certificate',
        title: 'Original Birth Certificate',
        storagePath: 'students/1111/birth_cert.pdf',
        fileName: 'birth_cert.pdf',
        fileSize: 204800,
        mimeType: 'application/pdf',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects document upload without title or valid document type', () => {
      const invalid = studentDocumentUploadSchema.safeParse({
        documentType: 'unsupported_type' as any,
        title: '',
        storagePath: '',
        fileName: '',
        fileSize: -10,
        mimeType: '',
      });
      expect(invalid.success).toBe(false);
    });

    it('accepts document verification approval and rejection', () => {
      const verified = studentDocumentVerifySchema.safeParse({
        verificationStatus: 'verified',
        verificationNotes: 'Verified against government registry',
      });
      expect(verified.success).toBe(true);

      const rejected = studentDocumentVerifySchema.safeParse({
        verificationStatus: 'rejected',
        verificationNotes: 'Illegible photocopy',
      });
      expect(rejected.success).toBe(true);
    });
  });

  // 5. Admission Lifecycle Validators
  describe('admissionApplicationCreateSchema, statusUpdate & conversion', () => {
    it('accepts complete admission application', () => {
      const valid = admissionApplicationCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        programId: '22222222-2222-2222-2222-222222222222',
        classId: '33333333-3333-3333-3333-333333333333',
        firstName: 'Diya',
        lastName: 'Reddy',
        dateOfBirth: '2012-08-20',
        gender: 'female',
        phone: '+91 9849012345',
        primaryGuardianName: 'Venkat Reddy',
        primaryGuardianRelationship: 'Father',
        primaryGuardianPhone: '+91 9849012345',
        previousSchoolName: 'Oakridge International',
        previousGradeOrScore: '9.8 GPA',
      });
      expect(valid.success).toBe(true);
    });

    it('validates lifecycle status progression payload', () => {
      const valid = admissionStatusUpdateSchema.safeParse({
        status: 'under_verification',
        remarks: 'Documents forwarded to admissions board',
      });
      expect(valid.success).toBe(true);

      const invalid = admissionStatusUpdateSchema.safeParse({
        status: 'invalid_status_value' as any,
      });
      expect(invalid.success).toBe(false);
    });

    it('validates atomic conversion schema to enrolled student', () => {
      const valid = admissionConversionSchema.safeParse({
        applicationId: '11111111-1111-1111-1111-111111111111',
        admissionNumber: 'ADM-2026-099',
        sectionId: '22222222-2222-2222-2222-222222222222',
        rollNumber: '42',
      });
      expect(valid.success).toBe(true);

      const missingAdmissionNo = admissionConversionSchema.safeParse({
        applicationId: '11111111-1111-1111-1111-111111111111',
        admissionNumber: '',
      });
      expect(missingAdmissionNo.success).toBe(false);
    });
  });
});
