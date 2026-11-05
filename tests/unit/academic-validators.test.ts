import { describe, it, expect } from 'vitest';
import {
  departmentCreateSchema,
  departmentUpdateSchema,
  programCreateSchema,
  programUpdateSchema,
  classCreateSchema,
  classUpdateSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
  subjectCreateSchema,
  subjectUpdateSchema,
  classSubjectAssignSchema,
} from '../../packages/validators/src';
import { getAcademicTerminology } from '../../packages/types/src';

describe('Unit: Academic Hierarchy Validators', () => {
  // 1. Department Validators
  describe('departmentCreateSchema', () => {
    it('accepts valid department configuration', () => {
      const valid = departmentCreateSchema.safeParse({
        name: 'Computer Science & Engineering',
        code: 'CSE',
        description: 'Department of Computer Science and Software Engineering',
        status: 'active',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects lowercase department code and invalid characters', () => {
      const invalid = departmentCreateSchema.safeParse({
        name: 'Science Stream',
        code: 'sci stream!', // spaces and exclamation marks invalid
      });
      expect(invalid.success).toBe(false);
    });

    it('rejects empty department name', () => {
      const invalid = departmentCreateSchema.safeParse({
        name: '',
        code: 'ENG',
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 2. Program Validators
  describe('programCreateSchema', () => {
    it('accepts valid academic degree/curriculum program', () => {
      const valid = programCreateSchema.safeParse({
        name: 'Bachelor of Technology in AI',
        code: 'BTECH-AI',
        level: 'undergraduate',
        durationYears: 4,
        termSystem: 'semester',
        totalTerms: 8,
        status: 'active',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects invalid duration or total terms', () => {
      const invalid = programCreateSchema.safeParse({
        name: 'Primary Curriculum',
        code: 'CBSE-PRI',
        durationYears: 0, // must be at least 1
        totalTerms: 25, // max 20
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 3. Class Validators
  describe('classCreateSchema', () => {
    const validUuid = '11111111-1111-1111-1111-111111111111';

    it('accepts valid class/cohort definition', () => {
      const valid = classCreateSchema.safeParse({
        name: 'Grade 10',
        code: 'G10-2026',
        programId: validUuid,
        academicYearId: validUuid,
        levelNumber: 10,
        status: 'active',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects missing or invalid program/academic year UUIDs', () => {
      const invalid = classCreateSchema.safeParse({
        name: 'Grade 10',
        code: 'G10-2026',
        programId: 'not-a-uuid',
        academicYearId: validUuid,
        levelNumber: 10,
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 4. Section Validators
  describe('sectionCreateSchema', () => {
    const validUuid = '11111111-1111-1111-1111-111111111111';

    it('accepts valid section with room and capacity', () => {
      const valid = sectionCreateSchema.safeParse({
        classId: validUuid,
        name: 'Section A',
        code: 'SEC-A',
        capacity: 45,
        roomNumber: 'Room 302',
        status: 'active',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects zero or negative capacity', () => {
      const invalid = sectionCreateSchema.safeParse({
        classId: validUuid,
        name: 'Section B',
        code: 'SEC-B',
        capacity: 0,
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 5. Subject Validators
  describe('subjectCreateSchema', () => {
    it('accepts theory, lab, and elective subjects', () => {
      const theory = subjectCreateSchema.safeParse({
        name: 'Operating Systems',
        code: 'CS401',
        subjectType: 'theory',
        creditHours: 3.5,
      });
      expect(theory.success).toBe(true);

      const lab = subjectCreateSchema.safeParse({
        name: 'Computer Networks Lab',
        code: 'CS402L',
        subjectType: 'lab',
        creditHours: 1.5,
      });
      expect(lab.success).toBe(true);

      const elective = subjectCreateSchema.safeParse({
        name: 'Machine Learning Elective',
        code: 'CS403E',
        subjectType: 'elective',
        creditHours: 3.0,
      });
      expect(elective.success).toBe(true);
    });

    it('rejects invalid subject category or negative credits', () => {
      const invalid = subjectCreateSchema.safeParse({
        name: 'Invalid Subject',
        code: 'INV101',
        subjectType: 'invalid_category' as any,
        creditHours: -1,
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 6. Terminology Adaptation Helper
  describe('getAcademicTerminology', () => {
    it('returns appropriate terminology for Schools', () => {
      const terms = getAcademicTerminology('school');
      expect(terms.departmentTitle).toContain('Wings');
      expect(terms.programTitle).toContain('Curriculum');
      expect(terms.classTitle).toContain('Grades');
      expect(terms.teacherTitle).toBe('Class Teacher');
    });

    it('returns appropriate terminology for Junior Colleges', () => {
      const terms = getAcademicTerminology('junior_college');
      expect(terms.departmentTitle).toBe('Academic Streams');
      expect(terms.programTitle).toBe('Stream Groups');
      expect(terms.classTitle).toBe('Year Batches');
    });

    it('returns appropriate terminology for Engineering Colleges', () => {
      const terms = getAcademicTerminology('engineering_college');
      expect(terms.departmentTitle).toBe('Engineering Departments');
      expect(terms.programTitle).toBe('Branches & Degrees');
      expect(terms.classTitle).toBe('Batches & Semesters');
    });

    it('returns appropriate terminology for Universities', () => {
      const terms = getAcademicTerminology('university');
      expect(terms.departmentTitle).toBe('Schools & Faculties');
      expect(terms.programTitle).toBe('Academic Programs');
      expect(terms.classTitle).toBe('Degree Cohorts');
    });
  });
});
