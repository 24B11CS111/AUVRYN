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

// ==========================================
// 9. Attendance & Leave Management Schemas (Milestone 5)
// ==========================================

export const attendanceStatusEnum = z.enum([
  'present',
  'absent',
  'late',
  'half_day',
  'excused',
  'on_leave',
]);

export const attendanceSessionTypeEnum = z.enum([
  'daily',
  'lecture',
  'lab',
  'practical',
  'tutorial',
]);

export const attendanceSessionStatusEnum = z.enum([
  'draft',
  'submitted',
  'locked',
]);

export const staffAttendanceStatusEnum = z.enum([
  'present',
  'absent',
  'late',
  'half_day',
  'on_leave',
  'excused',
]);

export const leaveApplicantTypeEnum = z.enum([
  'student',
  'staff',
]);

export const leaveTypeEnum = z.enum([
  'casual',
  'sick',
  'medical',
  'academic',
  'bereavement',
  'maternity',
  'emergency',
  'other',
]);

export const leaveStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const notificationDeliveryStatusEnum = z.enum([
  'pending',
  'queued',
  'delivered',
  'failed',
]);

export const attendanceSessionCreateSchema = z.object({
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  classId: z.string().uuid('Valid Class ID is required'),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable().or(z.literal('')),
  subjectId: z.string().uuid('Invalid Subject ID').optional().nullable().or(z.literal('')),
  sessionDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Session Date (YYYY-MM-DD) is required')
    .refine((val) => {
      // Validate date is not in the future beyond today (UTC)
      const now = new Date();
      const todayStr = now.toISOString().slice(0, 10);
      return val <= todayStr;
    }, 'Attendance session date cannot be in the future'),
  sessionType: attendanceSessionTypeEnum.default('daily'),
  periodNumber: z.coerce.number().int().min(1).max(20).optional().nullable(),
  startTime: z.string().trim().max(10).optional().or(z.literal('')),
  endTime: z.string().trim().max(10).optional().or(z.literal('')),
  topicCovered: z.string().trim().max(300).optional().or(z.literal('')),
  markedByStaffId: z.string().uuid('Invalid Staff ID').optional().nullable().or(z.literal('')),
});

export type AttendanceSessionCreateInput = z.input<typeof attendanceSessionCreateSchema>;

export const studentAttendanceItemSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  enrollmentId: z.string().uuid('Invalid Enrollment ID').optional().nullable().or(z.literal('')),
  status: attendanceStatusEnum.default('present'),
  remarks: z.string().trim().max(250).optional().or(z.literal('')),
  isExcused: z.boolean().default(false),
});

export const studentAttendanceBatchSchema = z.object({
  sessionId: z.string().uuid('Valid Session ID is required'),
  records: z.array(studentAttendanceItemSchema).min(1, 'At least one student record is required to submit attendance'),
});

export type StudentAttendanceBatchInput = z.input<typeof studentAttendanceBatchSchema>;

export const studentAttendanceCorrectionSchema = z.object({
  recordId: z.string().uuid('Valid Record ID is required'),
  newStatus: attendanceStatusEnum,
  reason: z
    .string()
    .trim()
    .min(3, 'Correction reason must be at least 3 characters')
    .max(300, 'Correction reason cannot exceed 300 characters'),
});

export type StudentAttendanceCorrectionInput = z.input<typeof studentAttendanceCorrectionSchema>;

export const staffAttendanceItemSchema = z.object({
  staffId: z.string().uuid('Valid Staff ID is required'),
  status: staffAttendanceStatusEnum.default('present'),
  checkInTime: z.string().trim().max(10).optional().or(z.literal('')),
  checkOutTime: z.string().trim().max(10).optional().or(z.literal('')),
  remarks: z.string().trim().max(250).optional().or(z.literal('')),
});

export const staffAttendanceBatchSchema = z.object({
  attendanceDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Date (YYYY-MM-DD) is required')
    .refine((val) => {
      const todayStr = new Date().toISOString().slice(0, 10);
      return val <= todayStr;
    }, 'Staff attendance date cannot be in the future'),
  records: z.array(staffAttendanceItemSchema).min(1, 'At least one staff record is required'),
});

export type StaffAttendanceBatchInput = z.input<typeof staffAttendanceBatchSchema>;

export const staffAttendanceCorrectionSchema = z.object({
  recordId: z.string().uuid('Valid Record ID is required'),
  newStatus: staffAttendanceStatusEnum,
  reason: z
    .string()
    .trim()
    .min(3, 'Correction reason must be at least 3 characters')
    .max(300, 'Correction reason cannot exceed 300 characters'),
});

export type StaffAttendanceCorrectionInput = z.input<typeof staffAttendanceCorrectionSchema>;

export const leaveRequestCreateSchema = z.object({
  applicantType: leaveApplicantTypeEnum,
  studentId: z.string().uuid('Invalid Student ID').optional().nullable().or(z.literal('')),
  staffId: z.string().uuid('Invalid Staff ID').optional().nullable().or(z.literal('')),
  leaveType: leaveTypeEnum.default('casual'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Start Date (YYYY-MM-DD) is required'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid End Date (YYYY-MM-DD) is required'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
  supportingDocumentUrl: z.string().url('Invalid supporting document URL').optional().or(z.literal('')),
}).refine((data) => {
  return data.endDate >= data.startDate;
}, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
}).refine((data) => {
  if (data.applicantType === 'student') {
    return !!data.studentId;
  }
  return !!data.staffId;
}, {
  message: 'Valid applicant identifier required for the chosen applicant type',
  path: ['applicantType'],
});

export type LeaveRequestCreateInput = z.input<typeof leaveRequestCreateSchema>;

export const leaveRequestReviewSchema = z.object({
  leaveRequestId: z.string().uuid('Valid Leave Request ID is required'),
  status: z.enum(['approved', 'rejected']),
  reviewRemarks: z.string().trim().max(400).optional().or(z.literal('')),
});

export type LeaveRequestReviewInput = z.input<typeof leaveRequestReviewSchema>;

// ==========================================
// 8. Timetable & Scheduling Schemas (Milestone 6)
// ==========================================

export const roomTypeEnum = z.enum([
  'classroom',
  'laboratory',
  'seminar_hall',
  'auditorium',
  'computer_lab',
  'library',
  'workshop',
  'other',
]);

export const dayOfWeekEnum = z.enum([
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
  'sunday',
]);

export const timetableSessionTypeEnum = z.enum([
  'theory',
  'practical',
  'laboratory',
  'tutorial',
  'seminar',
]);

export const timetableBreakTypeEnum = z.enum([
  'none',
  'short_break',
  'lunch',
  'assembly',
  'recess',
]);

export const sessionSlotEnum = z.enum([
  'morning',
  'afternoon',
  'evening',
]);

export const substitutionStatusEnum = z.enum([
  'pending',
  'approved',
  'rejected',
  'cancelled',
]);

export const roomCreateSchema = z.object({
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  roomNumber: z.string().trim().min(1, 'Room number is required').max(50, 'Room number cannot exceed 50 characters'),
  name: z.string().trim().max(100, 'Room name cannot exceed 100 characters').optional().or(z.literal('')),
  building: z.string().trim().min(1, 'Building name is required').max(100, 'Building cannot exceed 100 characters'),
  floor: z.string().trim().max(50, 'Floor cannot exceed 50 characters').optional().or(z.literal('')),
  roomType: roomTypeEnum.default('classroom'),
  capacity: z.coerce.number().int().min(1, 'Capacity must be at least 1').max(2000, 'Capacity cannot exceed 2000').default(40),
  facilities: z.array(z.string().trim().min(1)).default([]),
  isActive: z.boolean().default(true),
});

export type RoomCreateInput = z.input<typeof roomCreateSchema>;

export const roomUpdateSchema = roomCreateSchema.partial().extend({
  id: z.string().uuid('Valid Room ID is required'),
});

export type RoomUpdateInput = z.input<typeof roomUpdateSchema>;

export const timetableStructureCreateSchema = z.object({
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  programId: z.string().uuid('Invalid Program ID').optional().nullable().or(z.literal('')),
  name: z.string().trim().min(2, 'Schedule name must be at least 2 characters').max(100),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  workingDays: z.array(dayOfWeekEnum).min(1, 'At least one working day must be selected').default(['monday', 'tuesday', 'wednesday', 'thursday', 'friday']),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Start time must be HH:MM or HH:MM:SS'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'End time must be HH:MM or HH:MM:SS'),
  periodsPerDay: z.coerce.number().int().min(1, 'At least 1 period per day required').max(15, 'Maximum 15 periods per day allowed').default(7),
  isDefault: z.boolean().default(false),
  isActive: z.boolean().default(true),
}).refine((data) => {
  return data.endTime > data.startTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export type TimetableStructureCreateInput = z.input<typeof timetableStructureCreateSchema>;

export const timetablePeriodItemSchema = z.object({
  periodNumber: z.coerce.number().int().min(1, 'Period number must be positive'),
  name: z.string().trim().min(1, 'Period name is required').max(50),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Start time must be HH:MM or HH:MM:SS'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'End time must be HH:MM or HH:MM:SS'),
  isBreak: z.boolean().default(false),
  breakType: timetableBreakTypeEnum.default('none'),
  sessionSlot: sessionSlotEnum.default('morning'),
}).refine((data) => {
  return data.endTime > data.startTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const timetablePeriodsBatchSchema = z.object({
  structureId: z.string().uuid('Valid Structure ID is required'),
  periods: z.array(timetablePeriodItemSchema).min(1, 'At least one period is required'),
});

export type TimetablePeriodsBatchInput = z.input<typeof timetablePeriodsBatchSchema>;

export const timetableEntryCreateSchema = z.object({
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  structureId: z.string().uuid('Invalid Structure ID').optional().nullable().or(z.literal('')),
  classId: z.string().uuid('Valid Class ID is required'),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable().or(z.literal('')),
  subjectId: z.string().uuid('Valid Subject ID is required'),
  facultyId: z.string().uuid('Valid Faculty ID is required'),
  roomId: z.string().uuid('Invalid Room ID').optional().nullable().or(z.literal('')),
  dayOfWeek: dayOfWeekEnum,
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'Start time must be HH:MM or HH:MM:SS'),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/, 'End time must be HH:MM or HH:MM:SS'),
  periodNumber: z.coerce.number().int().min(1, 'Period number must be positive'),
  sessionType: timetableSessionTypeEnum.default('theory'),
  effectiveStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Start Date (YYYY-MM-DD) is required'),
  effectiveEndDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid End Date (YYYY-MM-DD) is required').optional().nullable().or(z.literal('')),
  colorCode: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, 'Color must be a valid hex code').default('#3b82f6'),
  notes: z.string().trim().max(300).optional().or(z.literal('')),
}).refine((data) => {
  return data.endTime > data.startTime;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
}).refine((data) => {
  if (data.effectiveEndDate && data.effectiveEndDate.trim() !== '') {
    return data.effectiveEndDate >= data.effectiveStartDate;
  }
  return true;
}, {
  message: 'Effective end date must be on or after effective start date',
  path: ['effectiveEndDate'],
});

export type TimetableEntryCreateInput = z.input<typeof timetableEntryCreateSchema>;

export const timetableEntryUpdateSchema = timetableEntryCreateSchema.and(
  z.object({
    id: z.string().uuid('Valid Entry ID is required'),
  })
);

export type TimetableEntryUpdateInput = z.input<typeof timetableEntryUpdateSchema>;

export const timetableConflictCheckSchema = z.object({
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  dayOfWeek: dayOfWeekEnum,
  periodNumber: z.coerce.number().int().min(1),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/),
  facultyId: z.string().uuid('Valid Faculty ID is required'),
  roomId: z.string().uuid('Invalid Room ID').optional().nullable().or(z.literal('')),
  classId: z.string().uuid('Valid Class ID is required'),
  sectionId: z.string().uuid('Invalid Section ID').optional().nullable().or(z.literal('')),
  excludeEntryId: z.string().uuid('Invalid Exclude Entry ID').optional().nullable().or(z.literal('')),
});

export type TimetableConflictCheckInput = z.input<typeof timetableConflictCheckSchema>;

export const timetableSubstitutionCreateSchema = z.object({
  timetableEntryId: z.string().uuid('Valid Timetable Entry ID is required'),
  substitutionDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Substitution Date (YYYY-MM-DD) is required'),
  originalFacultyId: z.string().uuid('Valid Original Faculty ID is required'),
  substituteFacultyId: z.string().uuid('Valid Substitute Faculty ID is required'),
  reason: z.string().trim().min(5, 'Substitution reason must be at least 5 characters').max(300),
}).refine((data) => {
  return data.originalFacultyId !== data.substituteFacultyId;
}, {
  message: 'Substitute faculty must be different from original faculty',
  path: ['substituteFacultyId'],
});

export type TimetableSubstitutionCreateInput = z.input<typeof timetableSubstitutionCreateSchema>;

export const timetableSubstitutionReviewSchema = z.object({
  substitutionId: z.string().uuid('Valid Substitution ID is required'),
  status: z.enum(['approved', 'rejected']),
  remarks: z.string().trim().max(300).optional().or(z.literal('')),
});

export type TimetableSubstitutionReviewInput = z.input<typeof timetableSubstitutionReviewSchema>;

// ==========================================
// 9. Examination & Results Schemas (Milestone 7)
// ==========================================

export const examTypeEnum = z.enum([
  'internal_assessment',
  'unit_test',
  'midterm',
  'semester_exam',
  'annual_exam',
  'practical_exam',
  'laboratory_exam',
  'assignment',
  'project',
  'viva',
  'final_exam',
]);

export const examStatusEnum = z.enum([
  'draft',
  'scheduled',
  'in_progress',
  'completed',
  'published',
  'cancelled',
]);

export const examPublicationStatusEnum = z.enum([
  'unpublished',
  'under_review',
  'published',
  'withdrawn',
]);

export const assessmentTypeEnum = z.enum([
  'theory',
  'practical',
  'laboratory',
  'internal_assessment',
  'external_assessment',
  'viva',
  'project',
]);

export const examSubjectStatusEnum = z.enum([
  'scheduled',
  'completed',
  'cancelled',
]);

export const gradingCalculationTypeEnum = z.enum([
  'gpa_10_point',
  'gpa_4_point',
  'letter_grade_percentage',
  'marks_based',
  'pass_fail',
]);

export const marksEntryStatusEnum = z.enum([
  'draft',
  'submitted',
  'verified',
  'locked',
]);

export const examResultStatusEnum = z.enum([
  'pass',
  'fail',
  'distinction',
  'promoted_with_backlog',
  'withheld',
]);

export const revaluationStatusEnum = z.enum([
  'applied',
  'assigned',
  'under_review',
  'completed',
  'rejected',
]);

export const gradingScaleRuleSchema = z.object({
  grade: z.string().trim().min(1, 'Grade symbol required').max(10),
  gradePoint: z.coerce.number().min(0).max(10).default(0),
  minPercentage: z.coerce.number().min(0).max(100),
  maxPercentage: z.coerce.number().min(0).max(100),
  description: z.string().trim().max(100).optional().or(z.literal('')),
  isPassing: z.boolean().default(true),
}).refine((data) => data.maxPercentage >= data.minPercentage, {
  message: 'Max percentage must be greater than or equal to min percentage',
  path: ['maxPercentage'],
});

export const gradingScaleCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  description: z.string().trim().max(300).optional().or(z.literal('')),
  calculationType: gradingCalculationTypeEnum.default('letter_grade_percentage'),
  isCreditBased: z.boolean().default(false),
  isDefault: z.boolean().default(false),
  rules: z.array(gradingScaleRuleSchema).min(1, 'At least one grade tier rule required'),
});

export type GradingScaleCreateInput = z.input<typeof gradingScaleCreateSchema>;

export const examinationCreateSchema = z.object({
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  termId: z.string().uuid('Invalid Term ID').optional().nullable().or(z.literal('')),
  programId: z.string().uuid('Invalid Program ID').optional().nullable().or(z.literal('')),
  classId: z.string().uuid('Invalid Class ID').optional().nullable().or(z.literal('')),
  name: z.string().trim().min(2, 'Examination name must be at least 2 characters').max(100),
  examType: examTypeEnum.default('midterm'),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Start Date (YYYY-MM-DD) is required'),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid End Date (YYYY-MM-DD) is required'),
  maxMarks: z.coerce.number().min(1, 'Maximum marks must be at least 1').max(1000).default(100),
  passingMarks: z.coerce.number().min(0).max(1000).default(40),
  weightagePercentage: z.coerce.number().min(1).max(100).default(100),
  gradingScaleId: z.string().uuid('Invalid Grading Scale ID').optional().nullable().or(z.literal('')),
  status: examStatusEnum.optional().default('scheduled'),
  instructions: z.string().trim().max(1000).optional().or(z.literal('')),
}).refine((data) => data.endDate >= data.startDate, {
  message: 'End date must be on or after start date',
  path: ['endDate'],
}).refine((data) => data.passingMarks <= data.maxMarks, {
  message: 'Passing marks cannot exceed maximum marks',
  path: ['passingMarks'],
});

export type ExaminationCreateInput = z.input<typeof examinationCreateSchema>;

export const examSubjectCreateSchema = z.object({
  examinationId: z.string().uuid('Valid Examination ID is required'),
  subjectId: z.string().uuid('Valid Subject ID is required'),
  assessmentType: assessmentTypeEnum.default('theory'),
  maxMarks: z.coerce.number().min(1, 'Maximum marks must be at least 1').max(1000).default(100),
  passingMarks: z.coerce.number().min(0).max(1000).default(40),
  credits: z.coerce.number().min(0).max(30).default(3),
  examDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Exam Date is required').optional().nullable().or(z.literal('')),
  startTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional().nullable().or(z.literal('')),
  endTime: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:([0-5]\d))?$/).optional().nullable().or(z.literal('')),
  roomId: z.string().uuid('Invalid Room ID').optional().nullable().or(z.literal('')),
  invigilatorStaffId: z.string().uuid('Invalid Staff ID').optional().nullable().or(z.literal('')),
  status: examSubjectStatusEnum.optional().default('scheduled'),
}).refine((data) => data.passingMarks <= data.maxMarks, {
  message: 'Passing marks cannot exceed maximum marks',
  path: ['passingMarks'],
}).refine((data) => {
  if (data.startTime && data.endTime && data.startTime.trim() !== '' && data.endTime.trim() !== '') {
    return data.endTime > data.startTime;
  }
  return true;
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export type ExamSubjectCreateInput = z.input<typeof examSubjectCreateSchema>;

export const studentMarkEntryItemSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  enrollmentId: z.string().uuid().optional().nullable(),
  marksObtained: z.coerce.number().min(0, 'Marks cannot be negative').optional().nullable(),
  isAbsent: z.boolean().default(false),
  isExempted: z.boolean().default(false),
  remarks: z.string().trim().max(250).optional().or(z.literal('')),
});

export const studentMarksBatchSchema = z.object({
  examinationId: z.string().uuid('Valid Examination ID is required').optional(),
  examSubjectId: z.string().uuid('Valid Exam Subject ID is required'),
  status: marksEntryStatusEnum.optional().default('submitted'),
  records: z.array(studentMarkEntryItemSchema).min(1, 'At least one student mark entry is required'),
});

export type StudentMarksBatchInput = z.input<typeof studentMarksBatchSchema>;

export const markCorrectionSchema = z.object({
  studentExamMarkId: z.string().uuid('Valid Mark ID is required').optional(),
  markId: z.string().uuid('Valid Mark ID is required').optional(),
  newMarks: z.coerce.number().min(0, 'Revised marks cannot be negative'),
  isAbsent: z.boolean().default(false).optional(),
  reason: z.string().trim().min(5, 'Correction reason must be at least 5 characters').max(300),
}).refine((data) => data.studentExamMarkId || data.markId, {
  message: 'Either studentExamMarkId or markId is required',
});

export type MarkCorrectionInput = z.input<typeof markCorrectionSchema>;

export const publishResultsSchema = z.object({
  examinationId: z.string().uuid('Valid Examination ID is required'),
});

export type PublishResultsInput = z.input<typeof publishResultsSchema>;

export const hallTicketGenerateSchema = z.object({
  examinationId: z.string().uuid('Valid Examination ID is required'),
  classId: z.string().uuid('Invalid Class ID').optional().nullable().or(z.literal('')),
  studentIds: z.array(z.string().uuid()).optional(),
});

export type HallTicketGenerateInput = z.input<typeof hallTicketGenerateSchema>;

export const revaluationRequestSchema = z.object({
  studentExamMarkId: z.string().uuid('Valid Mark ID is required'),
  reason: z.string().trim().min(10, 'Revaluation reason must be at least 10 characters').max(500),
});

export type RevaluationRequestInput = z.input<typeof revaluationRequestSchema>;

export const revaluationReviewSchema = z.object({
  revaluationId: z.string().uuid('Valid Revaluation ID is required'),
  status: z.enum(['completed', 'rejected', 'under_review', 'assigned']),
  revisedMarks: z.coerce.number().min(0).optional().nullable(),
  reviewNotes: z.string().trim().max(400).optional().or(z.literal('')),
});

export type RevaluationReviewInput = z.input<typeof revaluationReviewSchema>;

// ==============================================================================
// Milestone 8: Universal Fees & Payments Validators
// ==============================================================================

export const feeCategoryEnum = z.enum([
  'tuition',
  'admission',
  'registration',
  'examination',
  'laboratory',
  'library',
  'transport',
  'hostel',
  'fine',
  'deposit',
  'other',
]);

export const feePaymentMethodEnum = z.enum([
  'cash',
  'upi',
  'bank_transfer',
  'card',
  'payment_gateway',
  'cheque',
  'demand_draft',
  'advance_wallet',
]);

export const feePaymentStatusEnum = z.enum([
  'pending',
  'completed',
  'reconciled',
  'reversed',
  'failed',
]);

export const feeAssignmentStatusEnum = z.enum([
  'pending',
  'partial',
  'paid',
  'overdue',
  'waived',
  'cancelled',
]);

export const feeInstallmentStatusEnum = z.enum([
  'pending',
  'partial',
  'paid',
  'overdue',
  'waived',
]);

export const concessionTypeEnum = z.enum([
  'merit_scholarship',
  'need_based',
  'sibling_discount',
  'staff_child',
  'sports_quota',
  'institutional_waiver',
  'custom',
]);

export const concessionCalculationTypeEnum = z.enum([
  'percentage',
  'fixed_amount',
]);

export const concessionStatusEnum = z.enum([
  'requested',
  'under_review',
  'approved',
  'rejected',
  'revoked',
]);

export const refundStatusEnum = z.enum([
  'requested',
  'under_review',
  'approved',
  'rejected',
  'processed',
]);

export const feeHeadCreateSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().trim().min(2, 'Code must be at least 2 characters').max(20).toUpperCase(),
  category: feeCategoryEnum.default('tuition'),
  description: z.string().trim().max(500).optional().or(z.literal('')),
  isRefundable: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export type FeeHeadCreateInput = z.input<typeof feeHeadCreateSchema>;

export const feeStructureItemSchema = z.object({
  feeHeadId: z.string().uuid('Valid Fee Head ID is required'),
  amount: z.coerce.number().min(0, 'Amount cannot be negative'),
  isMandatory: z.boolean().default(true),
  orderIndex: z.coerce.number().default(0),
});

export const feeStructureInstallmentSchema = z.object({
  installmentNumber: z.coerce.number().min(1, 'Installment number must be at least 1'),
  name: z.string().trim().min(2, 'Installment name is required'),
  percentage: z.coerce.number().min(0.01).max(100, 'Percentage must be between 0.01 and 100'),
  dueDaysOffset: z.coerce.number().min(0, 'Offset days cannot be negative').default(0),
});

export const feeStructureCreateSchema = z.object({
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  campusId: z.string().uuid('Invalid Campus ID').optional().nullable().or(z.literal('')),
  programId: z.string().uuid('Invalid Program ID').optional().nullable().or(z.literal('')),
  classId: z.string().uuid('Invalid Class ID').optional().nullable().or(z.literal('')),
  termId: z.string().uuid('Invalid Term ID').optional().nullable().or(z.literal('')),
  studentCategory: z.string().trim().max(50).default('general'),
  name: z.string().trim().min(3, 'Structure name must be at least 3 characters').max(100),
  code: z.string().trim().min(2, 'Structure code must be at least 2 characters').max(20).toUpperCase(),
  items: z.array(feeStructureItemSchema).min(1, 'At least one fee head item is required'),
  installments: z.array(feeStructureInstallmentSchema).optional(),
});

export type FeeStructureCreateInput = z.input<typeof feeStructureCreateSchema>;

export const studentFeeAssignmentCreateSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  enrollmentId: z.string().uuid('Valid Enrollment ID is required'),
  academicYearId: z.string().uuid('Valid Academic Year ID is required'),
  feeStructureId: z.string().uuid('Valid Fee Structure ID is required'),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Due Date (YYYY-MM-DD) is required'),
  customDiscounts: z.coerce.number().min(0).default(0),
});

export type StudentFeeAssignmentCreateInput = z.input<typeof studentFeeAssignmentCreateSchema>;

export const paymentAllocationItemSchema = z.object({
  feeHeadId: z.string().uuid('Valid Fee Head ID is required'),
  amount: z.coerce.number().min(0.01, 'Allocation amount must be positive'),
  installmentId: z.string().uuid().optional().nullable().or(z.literal('')),
});

export const feePaymentRecordSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  enrollmentId: z.string().uuid().optional().nullable().or(z.literal('')),
  assignmentId: z.string().uuid().optional().nullable().or(z.literal('')),
  amountReceived: z.coerce.number().min(0.01, 'Payment amount must be greater than zero'),
  paymentMethod: feePaymentMethodEnum.default('cash'),
  paymentDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Valid Payment Date is required').default(() => new Date().toISOString().slice(0, 10)),
  externalTransactionId: z.string().trim().max(100).optional().or(z.literal('')),
  bankName: z.string().trim().max(100).optional().or(z.literal('')),
  chequeNumber: z.string().trim().max(50).optional().or(z.literal('')),
  chequeDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable().or(z.literal('')),
  notes: z.string().trim().max(500).optional().or(z.literal('')),
  allocations: z.array(paymentAllocationItemSchema).optional(),
});

export type FeePaymentRecordInput = z.input<typeof feePaymentRecordSchema>;

export const feeConcessionRequestSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  assignmentId: z.string().uuid('Valid Fee Assignment ID is required'),
  feeHeadId: z.string().uuid().optional().nullable().or(z.literal('')),
  concessionType: concessionTypeEnum.default('need_based'),
  calculationType: concessionCalculationTypeEnum.default('fixed_amount'),
  concessionValue: z.coerce.number().min(0.01, 'Concession value must be greater than zero'),
  reason: z.string().trim().min(5, 'Reason must be at least 5 characters').max(500),
});

export type FeeConcessionRequestInput = z.input<typeof feeConcessionRequestSchema>;

export const feeConcessionApprovalSchema = z.object({
  concessionId: z.string().uuid('Valid Concession ID is required'),
  status: z.enum(['approved', 'rejected']),
  rejectionReason: z.string().trim().max(300).optional().or(z.literal('')),
});

export type FeeConcessionApprovalInput = z.input<typeof feeConcessionApprovalSchema>;

export const feeRefundRequestSchema = z.object({
  paymentId: z.string().uuid('Valid Payment ID is required'),
  studentId: z.string().uuid('Valid Student ID is required'),
  assignmentId: z.string().uuid().optional().nullable().or(z.literal('')),
  refundAmount: z.coerce.number().min(0.01, 'Refund amount must be greater than zero'),
  reason: z.string().trim().min(5, 'Refund reason must be at least 5 characters').max(500),
});

export type FeeRefundRequestInput = z.input<typeof feeRefundRequestSchema>;

export const feeRefundProcessSchema = z.object({
  refundId: z.string().uuid('Valid Refund ID is required'),
  status: z.enum(['approved', 'rejected', 'processed']),
  disbursementMethod: feePaymentMethodEnum.optional().default('bank_transfer'),
  disbursementReference: z.string().trim().max(100).optional().or(z.literal('')),
  reviewNotes: z.string().trim().max(300).optional().or(z.literal('')),
});

export type FeeRefundProcessInput = z.input<typeof feeRefundProcessSchema>;

export const institutionFeeSettingsUpdateSchema = z.object({
  currency: z.string().trim().min(1).max(10).default('INR'),
  currencySymbol: z.string().trim().min(1).max(5).default('₹'),
  receiptPrefix: z.string().trim().min(1).max(10).default('RCP'),
  invoicePrefix: z.string().trim().min(1).max(10).default('INV'),
  lateFeeEnabled: z.boolean().default(false),
  lateFeeDailyAmount: z.coerce.number().min(0).default(0),
  gracePeriodDays: z.coerce.number().min(0).default(0),
  termsAndConditions: z.string().trim().max(2000).optional().or(z.literal('')),
  gatewayProvider: z.string().trim().default('razorpay'),
  gatewayKeyId: z.string().trim().optional().or(z.literal('')),
  gatewayWebhookSecret: z.string().trim().optional().or(z.literal('')),
  isGatewayEnabled: z.boolean().default(false),
});

export type InstitutionFeeSettingsUpdateInput = z.input<typeof institutionFeeSettingsUpdateSchema>;

export const gatewayOrderCreateSchema = z.object({
  studentId: z.string().uuid('Valid Student ID is required'),
  assignmentId: z.string().uuid().optional().nullable().or(z.literal('')),
  amount: z.coerce.number().min(1, 'Amount must be at least 1.00'),
  currency: z.string().default('INR'),
});

export type GatewayOrderCreateInput = z.input<typeof gatewayOrderCreateSchema>;




