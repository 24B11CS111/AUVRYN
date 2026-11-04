import { z } from 'zod';
import type { InstitutionType, Role, MembershipStatus } from '@edu-platform/types';

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
