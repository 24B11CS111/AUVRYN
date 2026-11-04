import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  institutionCreateSchema,
  campusCreateSchema,
  academicYearCreateSchema,
  onboardingFlowSchema,
} from '../packages/validators/src';

describe('Authentication Schemas', () => {
  it('validates correct login credentials', () => {
    const result = loginSchema.safeParse({
      email: 'admin@school.edu',
      password: 'StrongPassword123!',
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email formats', () => {
    const result = loginSchema.safeParse({
      email: 'not-an-email',
      password: 'StrongPassword123!',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.errors[0]?.message).toContain('valid email');
    }
  });

  it('rejects short passwords', () => {
    const result = loginSchema.safeParse({
      email: 'admin@school.edu',
      password: 'short',
    });
    expect(result.success).toBe(false);
  });

  it('validates registration with password confirmation and complexity', () => {
    const valid = registerSchema.safeParse({
      fullName: 'Dr. Jane Doe',
      email: 'jane@university.edu',
      password: 'Password123',
      confirmPassword: 'Password123',
    });
    expect(valid.success).toBe(true);

    const mismatch = registerSchema.safeParse({
      fullName: 'Dr. Jane Doe',
      email: 'jane@university.edu',
      password: 'Password123',
      confirmPassword: 'MismatchPassword123',
    });
    expect(mismatch.success).toBe(false);

    const noNumber = registerSchema.safeParse({
      fullName: 'Dr. Jane Doe',
      email: 'jane@university.edu',
      password: 'PasswordNoNumber',
      confirmPassword: 'PasswordNoNumber',
    });
    expect(noNumber.success).toBe(false);
  });
});

describe('Institution & Onboarding Schemas', () => {
  it('validates all supported institution types', () => {
    const types = [
      'school',
      'junior_college',
      'degree_college',
      'engineering_college',
      'university',
    ] as const;

    for (const type of types) {
      const res = institutionCreateSchema.safeParse({
        name: `Sample ${type}`,
        code: 'SAMP01',
        slug: `sample-${type.replace('_', '-')}`,
        type,
        city: 'Metropolis',
        state: 'Central',
        country: 'India',
      });
      expect(res.success).toBe(true);
    }
  });

  it('enforces slug formatting (lowercase, alphanumeric, hyphens)', () => {
    const validSlug = institutionCreateSchema.safeParse({
      name: 'St. Xavier High School',
      code: 'STXAV01',
      slug: 'st-xavier-high-school',
      type: 'school',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
    });
    expect(validSlug.success).toBe(true);

    const invalidSlug = institutionCreateSchema.safeParse({
      name: 'St. Xavier High School',
      code: 'STXAV01',
      slug: 'ST XAVIER HIGH SCHOOL!!',
      type: 'school',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
    });
    expect(invalidSlug.success).toBe(false);
  });

  it('validates academic year chronology (start before end date)', () => {
    const validYear = academicYearCreateSchema.safeParse({
      name: '2026-2027',
      code: 'AY26-27',
      startDate: '2026-06-01',
      endDate: '2027-05-31',
      termSystem: 'semester',
      isCurrent: true,
    });
    expect(validYear.success).toBe(true);

    const invalidYear = academicYearCreateSchema.safeParse({
      name: '2026-2027',
      code: 'AY26-27',
      startDate: '2027-06-01',
      endDate: '2026-05-31', // inverted dates
      termSystem: 'semester',
      isCurrent: true,
    });
    expect(invalidYear.success).toBe(false);
  });

  it('validates compound onboarding flow schema', () => {
    const payload = {
      institution: {
        name: 'Apex Institute of Technology',
        code: 'AIT001',
        slug: 'apex-institute',
        type: 'engineering_college' as const,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
      },
      campus: {
        name: 'North Campus',
        code: 'NC01',
        isPrimary: true,
        city: 'Bangalore',
        state: 'Karnataka',
        country: 'India',
      },
      academicYear: {
        name: 'Academic Year 2026-2027',
        code: 'AY26-27',
        startDate: '2026-07-01',
        endDate: '2027-06-30',
        termSystem: 'semester' as const,
        isCurrent: true,
      },
    };

    const res = onboardingFlowSchema.safeParse(payload);
    expect(res.success).toBe(true);
  });
});
