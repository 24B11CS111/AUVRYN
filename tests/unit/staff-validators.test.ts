import { describe, it, expect } from 'vitest';
import {
  staffCreateSchema,
  staffUpdateSchema,
  staffEmploymentCreateSchema,
  facultyAllocationCreateSchema,
  staffDocumentUploadSchema,
  staffDocumentVerifySchema,
  staffInvitationCreateSchema,
  staffInvitationAcceptSchema,
} from '../../packages/validators/src';

describe('Unit: Staff & Faculty Validators', () => {
  // 1. Staff Information System Schema
  describe('staffCreateSchema', () => {
    it('accepts valid teaching staff registration input', () => {
      const valid = staffCreateSchema.safeParse({
        employeeId: 'EMP-2026-001',
        firstName: 'Rajesh',
        middleName: 'Kumar',
        lastName: 'Verma',
        dateOfBirth: '1985-04-12',
        gender: 'male',
        email: 'rajesh.verma@example.edu',
        phone: '+91 9876543210',
        address: 'Faculty Quarters, Block B',
        city: 'Hyderabad',
        state: 'Telangana',
        country: 'India',
        postalCode: '500032',
        emergencyContactName: 'Sunita Verma',
        emergencyContactPhone: '+91 9876543211',
        emergencyContactRelationship: 'Spouse',
        joiningDate: '2026-01-15',
        staffCategory: 'teaching',
        designation: 'Senior Lecturer in Mathematics',
        employmentType: 'full_time',
        employmentStatus: 'active',
        qualification: 'M.Sc., Ph.D. in Applied Mathematics',
        yearsOfExperience: 12,
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.employeeId).toBe('EMP-2026-001');
        expect(valid.data.staffCategory).toBe('teaching');
        expect(valid.data.employmentStatus).toBe('active');
        expect(valid.data.yearsOfExperience).toBe(12);
      }
    });

    it('accepts non-teaching and administrative staff with defaults', () => {
      const valid = staffCreateSchema.safeParse({
        employeeId: 'EMP-ADM-042',
        firstName: 'Priya',
        lastName: 'Sundaram',
        dateOfBirth: '1992-08-20',
        email: 'priya.sundaram@example.edu',
        phone: '+91 9123456780',
        joiningDate: '2026-02-01',
        staffCategory: 'administrative',
        designation: 'Admissions & Records Officer',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.staffCategory).toBe('administrative');
        expect(valid.data.employmentType).toBe('full_time');
        expect(valid.data.employmentStatus).toBe('active');
        expect(valid.data.yearsOfExperience).toBe(0);
        expect(valid.data.gender).toBe('prefer_not_to_say');
      }
    });

    it('rejects staff registration missing mandatory fields', () => {
      const missingEmployeeId = staffCreateSchema.safeParse({
        employeeId: '',
        firstName: 'Rajesh',
        lastName: 'Verma',
        dateOfBirth: '1985-04-12',
        email: 'rajesh@example.edu',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: 'Lecturer',
      });
      expect(missingEmployeeId.success).toBe(false);

      const missingName = staffCreateSchema.safeParse({
        employeeId: 'EMP-001',
        firstName: '',
        lastName: '',
        dateOfBirth: '1985-04-12',
        email: 'rajesh@example.edu',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: 'Lecturer',
      });
      expect(missingName.success).toBe(false);

      const missingDesignation = staffCreateSchema.safeParse({
        employeeId: 'EMP-001',
        firstName: 'Rajesh',
        lastName: 'Verma',
        dateOfBirth: '1985-04-12',
        email: 'rajesh@example.edu',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: '',
      });
      expect(missingDesignation.success).toBe(false);
    });

    it('rejects invalid date format and invalid email', () => {
      const invalidDateFormat = staffCreateSchema.safeParse({
        employeeId: 'EMP-001',
        firstName: 'Rajesh',
        lastName: 'Verma',
        dateOfBirth: '12/04/1985', // Invalid format
        email: 'rajesh@example.edu',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: 'Lecturer',
      });
      expect(invalidDateFormat.success).toBe(false);

      const invalidEmail = staffCreateSchema.safeParse({
        employeeId: 'EMP-001',
        firstName: 'Rajesh',
        lastName: 'Verma',
        dateOfBirth: '1985-04-12',
        email: 'not-a-valid-email',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: 'Lecturer',
      });
      expect(invalidEmail.success).toBe(false);
    });

    it('enforces experience bounds (0 to 60 years)', () => {
      const negativeExp = staffCreateSchema.safeParse({
        employeeId: 'EMP-001',
        firstName: 'Rajesh',
        lastName: 'Verma',
        dateOfBirth: '1985-04-12',
        email: 'rajesh@example.edu',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: 'Lecturer',
        yearsOfExperience: -2,
      });
      expect(negativeExp.success).toBe(false);

      const excessiveExp = staffCreateSchema.safeParse({
        employeeId: 'EMP-001',
        firstName: 'Rajesh',
        lastName: 'Verma',
        dateOfBirth: '1985-04-12',
        email: 'rajesh@example.edu',
        phone: '+91 9876543210',
        joiningDate: '2026-01-15',
        designation: 'Lecturer',
        yearsOfExperience: 75,
      });
      expect(excessiveExp.success).toBe(false);
    });
  });

  // 2. Staff Update Schema
  describe('staffUpdateSchema', () => {
    it('allows partial profile updates', () => {
      const validPartial = staffUpdateSchema.safeParse({
        designation: 'Professor & Department Chair',
        yearsOfExperience: 15,
        qualification: 'M.Sc., Ph.D., Postdoc',
      });
      expect(validPartial.success).toBe(true);
    });

    it('rejects invalid fields in partial updates', () => {
      const invalidEmail = staffUpdateSchema.safeParse({
        email: 'bad-email-format',
      });
      expect(invalidEmail.success).toBe(false);
    });
  });

  // 3. Employment History Schema
  describe('staffEmploymentCreateSchema', () => {
    it('accepts valid employment timeline record', () => {
      const valid = staffEmploymentCreateSchema.safeParse({
        staffId: '11111111-1111-1111-1111-111111111111',
        designation: 'Assistant Professor',
        employmentType: 'full_time',
        employmentStatus: 'active',
        startDate: '2026-01-01',
        endDate: null,
        remarks: 'Promoted from Senior Lecturer',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects invalid UUIDs or missing required dates', () => {
      const invalidStaffId = staffEmploymentCreateSchema.safeParse({
        staffId: 'invalid-uuid-format',
        designation: 'Assistant Professor',
        startDate: '2026-01-01',
      });
      expect(invalidStaffId.success).toBe(false);

      const invalidDate = staffEmploymentCreateSchema.safeParse({
        staffId: '11111111-1111-1111-1111-111111111111',
        designation: 'Assistant Professor',
        startDate: '01/01/2026',
      });
      expect(invalidDate.success).toBe(false);
    });
  });

  // 4. Faculty Allocation Schema
  describe('facultyAllocationCreateSchema', () => {
    it('accepts valid faculty allocation to section with class teacher flag', () => {
      const valid = facultyAllocationCreateSchema.safeParse({
        staffId: '11111111-1111-1111-1111-111111111111',
        academicYearId: '22222222-2222-2222-2222-222222222222',
        programId: '33333333-3333-3333-3333-333333333333',
        classId: '44444444-4444-4444-4444-444444444444',
        sectionId: '55555555-5555-5555-5555-555555555555',
        subjectId: '66666666-6666-6666-6666-666666666666',
        isClassTeacher: true,
        isCoordinator: false,
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.isClassTeacher).toBe(true);
        expect(valid.data.status).toBe('active');
      }
    });

    it('rejects missing core academic identifiers', () => {
      const missingStaff = facultyAllocationCreateSchema.safeParse({
        academicYearId: '22222222-2222-2222-2222-222222222222',
        programId: '33333333-3333-3333-3333-333333333333',
      });
      expect(missingStaff.success).toBe(false);

      const invalidYear = facultyAllocationCreateSchema.safeParse({
        staffId: '11111111-1111-1111-1111-111111111111',
        academicYearId: 'invalid-id',
        programId: '33333333-3333-3333-3333-333333333333',
      });
      expect(invalidYear.success).toBe(false);
    });
  });

  // 5. Staff Document Schemas
  describe('staffDocumentUploadSchema & staffDocumentVerifySchema', () => {
    it('accepts valid document upload metadata for qualification certificate', () => {
      const valid = staffDocumentUploadSchema.safeParse({
        staffId: '11111111-1111-1111-1111-111111111111',
        documentType: 'qualification',
        title: 'Doctoral Degree Certificate',
        fileName: 'phd_certificate.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storagePath: 'tenants/inst-1/staff/doc-1.pdf',
      });

      expect(valid.success).toBe(true);
    });

    it('rejects zero or negative file sizes', () => {
      const zeroSize = staffDocumentUploadSchema.safeParse({
        staffId: '11111111-1111-1111-1111-111111111111',
        documentType: 'identity',
        title: 'Passport Copy',
        fileName: 'passport.jpg',
        fileSize: 0,
        mimeType: 'image/jpeg',
        storagePath: 'path/to/file',
      });
      expect(zeroSize.success).toBe(false);
    });

    it('validates document verification status updates', () => {
      const validVerify = staffDocumentVerifySchema.safeParse({
        verificationStatus: 'verified',
        verificationNotes: 'Original verified against university transcript',
      });
      expect(validVerify.success).toBe(true);

      const invalidStatus = staffDocumentVerifySchema.safeParse({
        verificationStatus: 'unknown' as any,
      });
      expect(invalidStatus.success).toBe(false);
    });
  });

  // 6. Staff Onboarding Invitation Schemas
  describe('staffInvitationCreateSchema & staffInvitationAcceptSchema', () => {
    it('accepts valid staff onboarding invitation', () => {
      const valid = staffInvitationCreateSchema.safeParse({
        email: 'new.faculty@institution.edu',
        firstName: 'Ananya',
        lastName: 'Deshmukh',
        role: 'faculty',
        departmentId: '77777777-7777-7777-7777-777777777777',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.role).toBe('faculty');
        expect(valid.data.email).toBe('new.faculty@institution.edu');
      }
    });

    it('accepts HR administrator and department head roles in invitation', () => {
      const hrInv = staffInvitationCreateSchema.safeParse({
        email: 'hr.lead@institution.edu',
        firstName: 'Karan',
        lastName: 'Johar',
        role: 'hr_administrator',
      });
      expect(hrInv.success).toBe(true);

      const deptHeadInv = staffInvitationCreateSchema.safeParse({
        email: 'hod.cse@institution.edu',
        firstName: 'Vikram',
        lastName: 'Sarabhai',
        role: 'department_head',
      });
      expect(deptHeadInv.success).toBe(true);
    });

    it('rejects invalid email or empty names for invitation', () => {
      const invalid = staffInvitationCreateSchema.safeParse({
        email: 'not-an-email',
        firstName: '',
        lastName: 'Deshmukh',
        role: 'faculty',
      });
      expect(invalid.success).toBe(false);
    });

    it('accepts valid invitation token for acceptance', () => {
      const valid = staffInvitationAcceptSchema.safeParse({
        invitationToken: 'sec-inv-tok-9876543210abcdef',
      });
      expect(valid.success).toBe(true);

      const shortToken = staffInvitationAcceptSchema.safeParse({
        invitationToken: 'short',
      });
      expect(shortToken.success).toBe(false);
    });
  });
});
