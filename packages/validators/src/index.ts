import { z } from 'zod';
import type {
  InstitutionType,
  Role,
  MembershipStatus,
  AcademicRecordStatus,
  AcademicLevelType,
  SubjectCategoryType,
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
  'faculty',
  'staff',
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
