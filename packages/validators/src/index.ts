import { z } from 'zod';
import type {
  InstitutionType,
  Role,
  MembershipStatus,
  AcademicRecordStatus,
  AcademicLevelType,
  SubjectCategoryType,
  StudentStatus,
  StudentGender,
  EnrollmentStatus,
  DocumentType,
  DocumentVerificationStatus,
  AdmissionStatus,
} from '@edu-platform/types';

// ==========================================
// 1. Authentication Schemas
// ==========================================

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  password: z
    .string()
    .min(1, 'Password is required')
    .min(8, 'Password must be at least 8 characters long'),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, 'Full name must be at least 2 characters')
      .max(100, 'Full name cannot exceed 100 characters'),
    email: z
      .string()
      .trim()
      .min(1, 'Email address is required')
      .email('Please enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Password must contain at least one number'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name cannot exceed 100 characters'),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional()
    .or(z.literal('')),
  avatarUrl: z.string().url('Invalid avatar URL').optional().or(z.literal('')),
});

export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

// ==========================================
// 2. Institution & Onboarding Schemas
// ==========================================

export const institutionTypeEnum = z.enum([
  'school',
  'junior_college',
  'degree_college',
  'engineering_college',
  'university',
]) satisfies z.ZodType<InstitutionType>;

export const institutionCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(3, 'Institution name must be at least 3 characters')
    .max(150, 'Institution name cannot exceed 150 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Institution code must be 2-10 characters')
    .max(10, 'Institution code cannot exceed 10 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .min(3, 'URL slug must be at least 3 characters')
    .max(50, 'URL slug cannot exceed 50 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  type: institutionTypeEnum,
  email: z
    .string()
    .trim()
    .email('Please enter a valid official email')
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .trim()
    .max(20, 'Phone number cannot exceed 20 characters')
    .optional()
    .or(z.literal('')),
  website: z
    .string()
    .trim()
    .url('Please enter a valid website URL (including https://)')
    .optional()
    .or(z.literal('')),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State / Province is required').max(100),
  country: z.string().trim().min(2, 'Country is required').max(100),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
});

export type InstitutionCreateInput = z.infer<typeof institutionCreateSchema>;

export const campusCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Campus name must be at least 2 characters')
    .max(100, 'Campus name cannot exceed 100 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Campus code must be 2-10 characters')
    .max(10, 'Campus code cannot exceed 10 characters'),
  isPrimary: z.boolean().default(true),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  city: z.string().trim().min(2, 'City is required').max(100),
  state: z.string().trim().min(2, 'State / Province is required').max(100),
  country: z.string().trim().min(2, 'Country is required').max(100),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
});

export type CampusCreateInput = z.infer<typeof campusCreateSchema>;

export const academicYearCreateSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(4, 'Academic year name required (e.g. 2026-2027)')
      .max(50),
    code: z
      .string()
      .trim()
      .toUpperCase()
      .min(2, 'Code required (e.g. AY-2026-27)')
      .max(20),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid start date (YYYY-MM-DD) is required'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid end date (YYYY-MM-DD) is required'),
    termSystem: z.enum(['semester', 'trimester', 'annual']).default('annual'),
    isCurrent: z.boolean().default(true),
  })
  .refine((data) => new Date(data.startDate) < new Date(data.endDate), {
    message: 'End date must be after start date',
    path: ['endDate'],
  });

export type AcademicYearCreateInput = z.infer<typeof academicYearCreateSchema>;

export const onboardingFlowSchema = z.object({
  institution: institutionCreateSchema,
  campus: campusCreateSchema,
  academicYear: academicYearCreateSchema,
});

export type OnboardingFlowInput = z.infer<typeof onboardingFlowSchema>;

// ==========================================
// 3. Membership & Role Schemas
// ==========================================

export const roleEnum = z.enum([
  'owner',
  'admin',
  'academic_admin',
  'admissions_officer',
  'faculty',
  'staff',
  'accountant',
  'student',
  'parent',
]) satisfies z.ZodType<Role>;

export const membershipStatusEnum = z.enum([
  'active',
  'invited',
  'suspended',
  'revoked',
]) satisfies z.ZodType<MembershipStatus>;

export const inviteMemberSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, 'Email is required')
    .email('Please enter a valid email address'),
  role: roleEnum,
  title: z.string().trim().max(100).optional().or(z.literal('')),
  department: z.string().trim().max(100).optional().or(z.literal('')),
});

export type InviteMemberInput = z.infer<typeof inviteMemberSchema>;

export const updateMemberRoleSchema = z.object({
  role: roleEnum,
  status: membershipStatusEnum,
});

export type UpdateMemberRoleInput = z.infer<typeof updateMemberRoleSchema>;

// ==========================================
// 4. Academic Hierarchy Schemas (Milestone 2)
// ==========================================

export const academicRecordStatusEnum = z.enum([
  'active',
  'inactive',
  'archived',
]) satisfies z.ZodType<AcademicRecordStatus>;

export const academicLevelTypeEnum = z.enum([
  'primary',
  'middle_school',
  'secondary',
  'higher_secondary',
  'diploma',
  'undergraduate',
  'postgraduate',
  'doctoral',
]) satisfies z.ZodType<AcademicLevelType>;

export const subjectCategoryTypeEnum = z.enum([
  'theory',
  'practical',
  'lab',
  'elective',
  'vocational',
  'project',
]) satisfies z.ZodType<SubjectCategoryType>;

// --- Department Schemas ---
export const departmentCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Department name must be at least 2 characters')
    .max(100, 'Department name cannot exceed 100 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Department code must be 2-20 characters')
    .max(20, 'Department code cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  campusId: z.string().uuid('Invalid campus ID').optional().nullable().or(z.literal('')),
  parentDepartmentId: z.string().uuid('Invalid parent department ID').optional().nullable().or(z.literal('')),
  headProfileId: z.string().uuid('Invalid head profile ID').optional().nullable().or(z.literal('')),
  status: academicRecordStatusEnum.optional().default('active'),
});

export type DepartmentCreateInput = z.input<typeof departmentCreateSchema>;

export const departmentUpdateSchema = departmentCreateSchema.partial();
export type DepartmentUpdateInput = z.input<typeof departmentUpdateSchema>;

// --- Program Schemas ---
export const programCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Program name must be at least 2 characters')
    .max(120, 'Program name cannot exceed 120 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Program code must be 2-20 characters')
    .max(20, 'Program code cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable().or(z.literal('')),
  campusId: z.string().uuid('Invalid campus ID').optional().nullable().or(z.literal('')),
  level: academicLevelTypeEnum.default('undergraduate'),
  durationYears: z.coerce.number().int().min(1, 'Duration must be at least 1 year').max(10, 'Duration cannot exceed 10 years').default(4),
  termSystem: z.enum(['semester', 'trimester', 'annual']).default('semester'),
  totalTerms: z.coerce.number().int().min(1, 'Total terms must be at least 1').max(20, 'Total terms cannot exceed 20').default(8),
  status: academicRecordStatusEnum.optional().default('active'),
});

export type ProgramCreateInput = z.input<typeof programCreateSchema>;

export const programUpdateSchema = programCreateSchema.partial();
export type ProgramUpdateInput = z.input<typeof programUpdateSchema>;

// --- Class / Batch Schemas ---
export const classCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Class name must be at least 2 characters')
    .max(100, 'Class name cannot exceed 100 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Class code must be 2-20 characters')
    .max(20, 'Class code cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
  programId: z.string().uuid('Valid Program ID is required'),
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  campusId: z.string().uuid('Invalid campus ID').optional().nullable().or(z.literal('')),
  levelNumber: z.coerce.number().int().min(1, 'Level number must be at least 1').max(20).default(1),
  status: academicRecordStatusEnum.optional().default('active'),
});

export type ClassCreateInput = z.input<typeof classCreateSchema>;

export const classUpdateSchema = classCreateSchema.partial();
export type ClassUpdateInput = z.input<typeof classUpdateSchema>;

// --- Section Schemas ---
export const sectionCreateSchema = z.object({
  classId: z.string().uuid('Valid Class ID is required'),
  name: z
    .string()
    .trim()
    .min(1, 'Section name must be at least 1 character')
    .max(50, 'Section name cannot exceed 50 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(1, 'Section code must be 1-10 characters')
    .max(10, 'Section code cannot exceed 10 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(500, 'Capacity cannot exceed 500').default(40),
  roomNumber: z.string().trim().max(50).optional().or(z.literal('')),
  classTeacherProfileId: z.string().uuid('Invalid teacher profile ID').optional().nullable().or(z.literal('')),
  campusId: z.string().uuid('Invalid campus ID').optional().nullable().or(z.literal('')),
  status: academicRecordStatusEnum.optional().default('active'),
});

export type SectionCreateInput = z.input<typeof sectionCreateSchema>;

export const sectionUpdateSchema = sectionCreateSchema.partial();
export type SectionUpdateInput = z.input<typeof sectionUpdateSchema>;

// --- Subject Schemas ---
export const subjectCreateSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, 'Subject name must be at least 2 characters')
    .max(120, 'Subject name cannot exceed 120 characters'),
  code: z
    .string()
    .trim()
    .toUpperCase()
    .min(2, 'Subject code must be 2-20 characters')
    .max(20, 'Subject code cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Code can only contain letters, numbers, hyphens and underscores'),
  departmentId: z.string().uuid('Invalid department ID').optional().nullable().or(z.literal('')),
  subjectType: subjectCategoryTypeEnum.default('theory'),
  creditHours: z.coerce.number().min(0, 'Credit hours must be positive').max(20, 'Credits cannot exceed 20').default(3),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  status: academicRecordStatusEnum.optional().default('active'),
});

export type SubjectCreateInput = z.input<typeof subjectCreateSchema>;

export const subjectUpdateSchema = subjectCreateSchema.partial();
export type SubjectUpdateInput = z.input<typeof subjectUpdateSchema>;

// --- Class Subject / Faculty Assignment Schema ---
export const classSubjectAssignSchema = z.object({
  classId: z.string().uuid('Valid Class ID is required'),
  sectionId: z.string().uuid('Invalid section ID').optional().nullable().or(z.literal('')),
  subjectId: z.string().uuid('Valid Subject ID is required'),
  termId: z.string().uuid('Invalid term ID').optional().nullable().or(z.literal('')),
  facultyProfileId: z.string().uuid('Invalid faculty ID').optional().nullable().or(z.literal('')),
  status: academicRecordStatusEnum.optional().default('active'),
});

export type ClassSubjectAssignInput = z.input<typeof classSubjectAssignSchema>;

// ==========================================
// 5. Student & Admissions Schemas (Milestone 3)
// ==========================================

export const studentStatusEnum = z.enum([
  'active',
  'inactive',
  'suspended',
  'alumni',
  'withdrawn',
  'transferred',
]) satisfies z.ZodType<StudentStatus>;

export const studentGenderEnum = z.enum([
  'male',
  'female',
  'other',
  'prefer_not_to_say',
]) satisfies z.ZodType<StudentGender>;

export const enrollmentStatusEnum = z.enum([
  'enrolled',
  'promoted',
  'retained',
  'transferred',
  'graduated',
  'dropped',
]) satisfies z.ZodType<EnrollmentStatus>;

export const documentTypeEnum = z.enum([
  'photo',
  'birth_certificate',
  'previous_record',
  'transfer_certificate',
  'national_id',
  'medical_record',
  'other',
]) satisfies z.ZodType<DocumentType>;

export const documentVerificationStatusEnum = z.enum([
  'pending',
  'verified',
  'rejected',
]) satisfies z.ZodType<DocumentVerificationStatus>;

export const admissionStatusEnum = z.enum([
  'submitted',
  'received',
  'documents_pending',
  'under_verification',
  'approved',
  'rejected',
  'waitlisted',
  'confirmed',
  'enrolled',
]) satisfies z.ZodType<AdmissionStatus>;

// --- Student Schemas ---
export const studentCreateSchema = z.object({
  admissionNumber: z
    .string()
    .trim()
    .min(2, 'Admission number is required')
    .max(30, 'Admission number cannot exceed 30 characters'),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(60, 'First name cannot exceed 60 characters'),
  middleName: z.string().trim().max(60).optional().or(z.literal('')),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(60, 'Last name cannot exceed 60 characters'),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Date of Birth (YYYY-MM-DD) is required'),
  gender: studentGenderEnum.default('prefer_not_to_say'),
  bloodGroup: z.string().trim().max(10).optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z.string().trim().max(20).optional().or(z.literal('')),
  photoUrl: z.string().url('Invalid photo URL').optional().or(z.literal('')),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  country: z.string().trim().max(100).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  nationality: z.string().trim().max(60).default('Domestic'),
  emergencyContactName: z
    .string()
    .trim()
    .min(2, 'Emergency contact name is required')
    .max(100),
  emergencyContactPhone: z
    .string()
    .trim()
    .min(5, 'Emergency contact phone is required')
    .max(20),
  emergencyContactRelationship: z
    .string()
    .trim()
    .min(2, 'Emergency contact relationship is required')
    .max(50),
  dateOfJoining: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid date of joining is required')
    .optional(),
  status: studentStatusEnum.optional().default('active'),
});

export type StudentCreateInput = z.input<typeof studentCreateSchema>;

export const studentUpdateSchema = studentCreateSchema.partial();
export type StudentUpdateInput = z.input<typeof studentUpdateSchema>;

// --- Guardian Schemas ---
export const guardianCreateSchema = z.object({
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(60),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(60),
  email: z.string().trim().email('Invalid email address').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(5, 'Phone number is required')
    .max(20),
  relationshipDefault: z.string().trim().max(50).optional().or(z.literal('')),
  occupation: z.string().trim().max(100).optional().or(z.literal('')),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  country: z.string().trim().max(100).optional().or(z.literal('')),
});

export type GuardianCreateInput = z.input<typeof guardianCreateSchema>;

export const guardianUpdateSchema = guardianCreateSchema.partial();
export type GuardianUpdateInput = z.input<typeof guardianUpdateSchema>;

export const linkGuardianSchema = z.object({
  studentId: z.string().uuid('Valid Student ID required'),
  guardianId: z.string().uuid('Valid Guardian ID required'),
  relationship: z.string().trim().min(2, 'Relationship is required').max(50),
  isPrimary: z.boolean().default(false),
  isEmergencyContact: z.boolean().default(false),
  canPickup: z.boolean().default(true),
});

export type LinkGuardianInput = z.input<typeof linkGuardianSchema>;

// --- Student Enrollment Schemas ---
export const studentEnrollmentCreateSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  programId: z.string().uuid('Valid Program ID is required'),
  classId: z.string().uuid('Valid Class ID is required'),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable().or(z.literal('')),
  rollNumber: z.string().trim().max(30).optional().or(z.literal('')),
  status: enrollmentStatusEnum.default('enrolled'),
  enrollmentDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid enrollment date required')
    .optional(),
  remarks: z.string().trim().max(300).optional().or(z.literal('')),
});

export type StudentEnrollmentCreateInput = z.input<typeof studentEnrollmentCreateSchema>;

// --- Student Document Schemas ---
export const studentDocumentUploadSchema = z.object({
  studentId: z.string().uuid('Invalid Student ID').optional().nullable().or(z.literal('')),
  applicationId: z.string().uuid('Invalid Application ID').optional().nullable().or(z.literal('')),
  documentType: documentTypeEnum.default('other'),
  title: z
    .string()
    .trim()
    .min(2, 'Document title is required')
    .max(120),
  storagePath: z.string().min(3, 'Storage path is required'),
  fileName: z.string().min(1, 'File name is required'),
  fileSize: z.coerce.number().min(1, 'File size must be positive'),
  mimeType: z.string().min(3, 'Valid MIME type required'),
});

export type StudentDocumentUploadInput = z.input<typeof studentDocumentUploadSchema>;

export const studentDocumentVerifySchema = z.object({
  verificationStatus: documentVerificationStatusEnum,
  verificationNotes: z.string().trim().max(300).optional().or(z.literal('')),
});

export type StudentDocumentVerifyInput = z.input<typeof studentDocumentVerifySchema>;

// --- Admission Application Schemas ---
export const admissionApplicationCreateSchema = z.object({
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  programId: z.string().uuid('Valid Program ID is required'),
  classId: z.string().uuid('Invalid Class ID').optional().nullable().or(z.literal('')),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal('')),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(60),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Date of Birth is required'),
  gender: studentGenderEnum.default('prefer_not_to_say'),
  bloodGroup: z.string().trim().max(10).optional().or(z.literal('')),
  email: z.string().trim().email('Invalid email').optional().or(z.literal('')),
  phone: z
    .string()
    .trim()
    .min(5, 'Applicant phone is required')
    .max(20),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  country: z.string().trim().max(100).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  nationality: z.string().trim().max(60).default('Domestic'),
  previousSchoolName: z.string().trim().max(150).optional().or(z.literal('')),
  previousGradeOrScore: z.string().trim().max(50).optional().or(z.literal('')),
  primaryGuardianName: z
    .string()
    .trim()
    .min(2, 'Primary guardian name is required')
    .max(100),
  primaryGuardianRelationship: z
    .string()
    .trim()
    .min(2, 'Guardian relationship is required')
    .max(50),
  primaryGuardianPhone: z
    .string()
    .trim()
    .min(5, 'Primary guardian phone is required')
    .max(20),
  primaryGuardianEmail: z.string().trim().email('Invalid guardian email').optional().or(z.literal('')),
  primaryGuardianOccupation: z.string().trim().max(100).optional().or(z.literal('')),
  secondaryGuardianName: z.string().trim().max(100).optional().or(z.literal('')),
  secondaryGuardianRelationship: z.string().trim().max(50).optional().or(z.literal('')),
  secondaryGuardianPhone: z.string().trim().max(20).optional().or(z.literal('')),
  secondaryGuardianEmail: z.string().trim().email('Invalid email').optional().or(z.literal('')),
});

export type AdmissionApplicationCreateInput = z.input<typeof admissionApplicationCreateSchema>;

export const admissionStatusUpdateSchema = z.object({
  status: admissionStatusEnum,
  remarks: z.string().trim().max(400).optional().or(z.literal('')),
});

export type AdmissionStatusUpdateInput = z.input<typeof admissionStatusUpdateSchema>;

export const admissionConversionSchema = z.object({
  applicationId: z.string().uuid('Valid Application ID is required'),
  admissionNumber: z
    .string()
    .trim()
    .min(2, 'Admission number is required')
    .max(30),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable().or(z.literal('')),
  rollNumber: z.string().trim().max(30).optional().or(z.literal('')),
});

export type AdmissionConversionInput = z.input<typeof admissionConversionSchema>;

// ==========================================
// 8. Staff & Faculty Management Schemas (Milestone 4)
// ==========================================

export const staffCategoryEnum = z.enum([
  'teaching',
  'non_teaching',
  'administrative',
  'technical',
  'transport',
  'support',
]);

export const employmentTypeEnum = z.enum([
  'full_time',
  'part_time',
  'contract',
  'adjunct',
  'visiting',
]);

export const employmentStatusEnum = z.enum([
  'active',
  'probation',
  'notice_period',
  'suspended',
  'terminated',
  'resigned',
  'retired',
]);

export const staffDocumentTypeEnum = z.enum([
  'qualification',
  'experience',
  'identity',
  'contract',
  'appointment_letter',
  'other',
]);

export const invitationStatusEnum = z.enum([
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const staffCreateSchema = z.object({
  employeeId: z
    .string()
    .trim()
    .min(2, 'Employee ID is required')
    .max(30, 'Employee ID cannot exceed 30 characters'),
  firstName: z
    .string()
    .trim()
    .min(2, 'First name must be at least 2 characters')
    .max(60),
  middleName: z.string().trim().max(60).optional().or(z.literal('')),
  lastName: z
    .string()
    .trim()
    .min(1, 'Last name is required')
    .max(60),
  photoUrl: z.string().url('Invalid photo URL').optional().or(z.literal('')),
  dateOfBirth: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Date of Birth (YYYY-MM-DD) is required'),
  gender: studentGenderEnum.default('prefer_not_to_say'),
  email: z
    .string()
    .trim()
    .min(1, 'Email address is required')
    .email('Please enter a valid email address'),
  phone: z
    .string()
    .trim()
    .min(5, 'Phone number is required')
    .max(20),
  address: z.string().trim().max(250).optional().or(z.literal('')),
  city: z.string().trim().max(100).optional().or(z.literal('')),
  state: z.string().trim().max(100).optional().or(z.literal('')),
  country: z.string().trim().max(100).optional().or(z.literal('')),
  postalCode: z.string().trim().max(20).optional().or(z.literal('')),
  emergencyContactName: z.string().trim().max(100).optional().or(z.literal('')),
  emergencyContactPhone: z.string().trim().max(20).optional().or(z.literal('')),
  emergencyContactRelationship: z.string().trim().max(50).optional().or(z.literal('')),
  joiningDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Joining Date (YYYY-MM-DD) is required'),
  staffCategory: staffCategoryEnum.default('teaching'),
  designation: z
    .string()
    .trim()
    .min(2, 'Designation is required')
    .max(100),
  departmentId: z.string().uuid('Invalid Department ID').optional().nullable().or(z.literal('')),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  employmentType: employmentTypeEnum.default('full_time'),
  employmentStatus: employmentStatusEnum.default('active'),
  qualification: z.string().trim().max(150).optional().or(z.literal('')),
  yearsOfExperience: z.number().min(0).max(60).default(0),
  userId: z.string().uuid('Invalid User Profile ID').optional().nullable().or(z.literal('')),
});

export type StaffCreateInput = z.input<typeof staffCreateSchema>;

export const staffUpdateSchema = staffCreateSchema.partial();
export type StaffUpdateInput = z.input<typeof staffUpdateSchema>;

export const staffEmploymentCreateSchema = z.object({
  staffId: z.string().uuid('Valid Staff ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  departmentId: z.string().uuid('Invalid Department ID').optional().nullable().or(z.literal('')),
  designation: z.string().trim().min(2, 'Designation is required').max(100),
  employmentType: employmentTypeEnum.default('full_time'),
  employmentStatus: employmentStatusEnum.default('active'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Start Date is required'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid End Date is required').optional().nullable().or(z.literal('')),
  reportingManagerId: z.string().uuid('Invalid Manager ID').optional().nullable().or(z.literal('')),
  remarks: z.string().trim().max(400).optional().or(z.literal('')),
});

export type StaffEmploymentCreateInput = z.input<typeof staffEmploymentCreateSchema>;

export const facultyAllocationCreateSchema = z.object({
  staffId: z.string().uuid('Valid Staff ID is required'),
  academicYearId: z.string().uuid('Academic Year is required'),
  programId: z.string().uuid('Academic Program is required'),
  classId: z.string().uuid('Invalid Class ID').optional().nullable().or(z.literal('')),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable().or(z.literal('')),
  subjectId: z.string().uuid('Invalid Subject ID').optional().nullable().or(z.literal('')),
  isClassTeacher: z.boolean().default(false),
  isCoordinator: z.boolean().default(false),
  status: academicRecordStatusEnum.default('active'),
});

export type FacultyAllocationCreateInput = z.input<typeof facultyAllocationCreateSchema>;

export const staffDocumentUploadSchema = z.object({
  staffId: z.string().uuid('Valid Staff ID is required'),
  documentType: staffDocumentTypeEnum,
  title: z.string().trim().min(2, 'Document title is required').max(150),
  fileName: z.string().trim().min(1, 'File name is required').max(200),
  fileSize: z.number().int().min(1, 'File cannot be empty'),
  mimeType: z.string().trim().min(1, 'MIME type is required'),
  storagePath: z.string().trim().min(1, 'Storage path is required'),
});

export type StaffDocumentUploadInput = z.input<typeof staffDocumentUploadSchema>;

export const staffDocumentVerifySchema = z.object({
  verificationStatus: documentVerificationStatusEnum,
  verificationNotes: z.string().trim().max(400).optional().or(z.literal('')),
});

export type StaffDocumentVerifyInput = z.input<typeof staffDocumentVerifySchema>;

export const staffInvitationCreateSchema = z.object({
  email: z.string().trim().min(1, 'Email is required').email('Invalid email address'),
  firstName: z.string().trim().min(2, 'First name is required').max(60),
  lastName: z.string().trim().min(1, 'Last name is required').max(60),
  role: z.enum([
    'owner',
    'admin',
    'hr_administrator',
    'academic_admin',
    'department_head',
    'admissions_officer',
    'faculty',
    'staff',
    'accountant',
  ]),
  departmentId: z.string().uuid('Invalid Department ID').optional().nullable().or(z.literal('')),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  staffId: z.string().uuid('Invalid Staff Profile ID').optional().nullable().or(z.literal('')),
});

export type StaffInvitationCreateInput = z.input<typeof staffInvitationCreateSchema>;

export const staffInvitationAcceptSchema = z.object({
  invitationToken: z.string().trim().min(8, 'Valid invitation token is required'),
});

export type StaffInvitationAcceptInput = z.input<typeof staffInvitationAcceptSchema>;
