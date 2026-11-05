import { describe, it, expect } from 'vitest';
import {
  examinationCreateSchema,
  examSubjectCreateSchema,
  gradingScaleCreateSchema,
  gradingScaleRuleSchema,
  studentMarksBatchSchema,
  markCorrectionSchema,
  publishResultsSchema,
  hallTicketGenerateSchema,
  revaluationRequestSchema,
  revaluationReviewSchema,
} from '../../packages/validators/src';

describe('Unit: Examination & Results Validators (Milestone 7)', () => {
  const dummyUUID1 = '11111111-1111-1111-1111-111111111111';
  const dummyUUID2 = '22222222-2222-2222-2222-222222222222';
  const dummyUUID3 = '33333333-3333-3333-3333-333333333333';

  describe('examinationCreateSchema', () => {
    it('validates a complete and correct examination configuration', () => {
      const validData = {
        name: 'Fall 2026 Midterm Examination',
        examType: 'midterm',
        academicYearId: dummyUUID1,
        startDate: '2026-10-10',
        endDate: '2026-10-20',
        maxMarks: 100,
        passingMarks: 40,
        weightagePercentage: 100,
        status: 'scheduled',
      };

      const result = examinationCreateSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('rejects an examination when end_date is earlier than start_date', () => {
      const invalidData = {
        name: 'Invalid Date Exam',
        examType: 'semester_exam',
        academicYearId: dummyUUID1,
        startDate: '2026-10-20',
        endDate: '2026-10-10', // Before start
        maxMarks: 100,
        passingMarks: 40,
        weightagePercentage: 100,
      };

      const result = examinationCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('End date must be on or after start date');
      }
    });

    it('rejects when passing marks exceed maximum marks', () => {
      const invalidData = {
        name: 'Passing Marks Error',
        examType: 'unit_test',
        academicYearId: dummyUUID1,
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        maxMarks: 50,
        passingMarks: 60, // Exceeds maxMarks
        weightagePercentage: 100,
      };

      const result = examinationCreateSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Passing marks cannot exceed maximum marks');
      }
    });

    it('rejects invalid weightage percentage outside 1..100 range', () => {
      const invalidWeightage = {
        name: 'Zero Weightage',
        examType: 'internal_assessment',
        academicYearId: dummyUUID1,
        startDate: '2026-10-10',
        endDate: '2026-10-10',
        maxMarks: 100,
        passingMarks: 40,
        weightagePercentage: 0, // Invalid: must be > 0
      };

      const result = examinationCreateSchema.safeParse(invalidWeightage);
      expect(result.success).toBe(false);
    });

    it('accepts all 11 supported exam types across schools, colleges and universities', () => {
      const examTypes = [
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
      ];

      for (const t of examTypes) {
        const data = {
          name: `Exam ${t}`,
          examType: t,
          academicYearId: dummyUUID1,
          startDate: '2026-11-01',
          endDate: '2026-11-05',
          maxMarks: 100,
          passingMarks: 40,
        };
        const parsed = examinationCreateSchema.safeParse(data);
        expect(parsed.success).toBe(true);
      }
    });
  });

  describe('examSubjectCreateSchema', () => {
    it('validates a scheduled subject with room and invigilator', () => {
      const validSubject = {
        examinationId: dummyUUID1,
        subjectId: dummyUUID2,
        assessmentType: 'theory',
        maxMarks: 100,
        passingMarks: 35,
        credits: 4,
        examDate: '2026-11-12',
        startTime: '09:30',
        endTime: '12:30',
        roomId: dummyUUID3,
      };

      const result = examSubjectCreateSchema.safeParse(validSubject);
      expect(result.success).toBe(true);
    });

    it('rejects exam subject when passing marks exceed maximum marks', () => {
      const invalidSubject = {
        examinationId: dummyUUID1,
        subjectId: dummyUUID2,
        assessmentType: 'practical',
        maxMarks: 25,
        passingMarks: 30, // Exceeds 25
      };

      const result = examSubjectCreateSchema.safeParse(invalidSubject);
      expect(result.success).toBe(false);
    });

    it('rejects exam subject when end_time is not after start_time', () => {
      const invalidTimes = {
        examinationId: dummyUUID1,
        subjectId: dummyUUID2,
        assessmentType: 'laboratory',
        maxMarks: 50,
        passingMarks: 20,
        startTime: '14:00',
        endTime: '13:00', // Before start
      };

      const result = examSubjectCreateSchema.safeParse(invalidTimes);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('End time must be after start time');
      }
    });
  });

  describe('studentMarksBatchSchema & markCorrectionSchema', () => {
    it('validates a batch marks payload with marks, absent, and exempted students', () => {
      const batch = {
        examSubjectId: dummyUUID1,
        status: 'submitted',
        records: [
          {
            studentId: dummyUUID2,
            marksObtained: 88.5,
            isAbsent: false,
            isExempted: false,
            remarks: 'Excellent work',
          },
          {
            studentId: dummyUUID3,
            marksObtained: null,
            isAbsent: true,
            isExempted: false,
          },
        ],
      };

      const result = studentMarksBatchSchema.safeParse(batch);
      expect(result.success).toBe(true);
    });

    it('validates audited mark correction with mandatory reason', () => {
      const correction = {
        studentExamMarkId: dummyUUID1,
        newMarks: 94.0,
        isAbsent: false,
        reason: 'Recounting error identified during department review',
      };

      const result = markCorrectionSchema.safeParse(correction);
      expect(result.success).toBe(true);
    });

    it('rejects mark correction when reason is blank', () => {
      const blankReason = {
        studentExamMarkId: dummyUUID1,
        newMarks: 94.0,
        isAbsent: false,
        reason: '', // Mandatory audit requirement
      };

      const result = markCorrectionSchema.safeParse(blankReason);
      expect(result.success).toBe(false);
    });
  });

  describe('gradingScaleCreateSchema & rules', () => {
    it('validates a grading scheme with ascending percentage rules', () => {
      const validScale = {
        name: 'UGC 10-Point Relative Grading',
        calculationType: 'gpa_10_point',
        isCreditBased: true,
        rules: [
          { grade: 'O', gradePoint: 10, minPercentage: 90, maxPercentage: 100, isPassing: true },
          { grade: 'A+', gradePoint: 9, minPercentage: 80, maxPercentage: 89.99, isPassing: true },
          { grade: 'F', gradePoint: 0, minPercentage: 0, maxPercentage: 39.99, isPassing: false },
        ],
      };

      const result = gradingScaleCreateSchema.safeParse(validScale);
      expect(result.success).toBe(true);
    });

    it('rejects grading rule when maxPercentage is less than minPercentage', () => {
      const invalidRule = {
        grade: 'Invalid',
        gradePoint: 5,
        minPercentage: 80,
        maxPercentage: 70, // Less than min
        isPassing: true,
      };

      const result = gradingScaleRuleSchema.safeParse(invalidRule);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Max percentage must be greater than or equal to min percentage');
      }
    });
  });

  describe('publishResultsSchema & hallTicketGenerateSchema', () => {
    it('validates publish results request with valid examination ID', () => {
      const result = publishResultsSchema.safeParse({ examinationId: dummyUUID1 });
      expect(result.success).toBe(true);
    });

    it('rejects publish results when examination ID is not a UUID', () => {
      const result = publishResultsSchema.safeParse({ examinationId: 'non-uuid' });
      expect(result.success).toBe(false);
    });

    it('validates hall ticket generation request', () => {
      const result = hallTicketGenerateSchema.safeParse({
        examinationId: dummyUUID1,
        classId: dummyUUID2,
      });
      expect(result.success).toBe(true);
    });
  });

  describe('revaluationRequestSchema & revaluationReviewSchema', () => {
    it('validates revaluation application from student/guardian', () => {
      const request = {
        studentExamMarkId: dummyUUID1,
        reason: 'Suspected paper retotalling omission on Question 3',
      };
      const result = revaluationRequestSchema.safeParse(request);
      expect(result.success).toBe(true);
    });

    it('rejects revaluation application with missing reason', () => {
      const result = revaluationRequestSchema.safeParse({
        studentExamMarkId: dummyUUID1,
        reason: '   ',
      });
      expect(result.success).toBe(false);
    });

    it('validates revaluation review outcome with revised marks', () => {
      const review = {
        revaluationId: dummyUUID1,
        status: 'completed',
        revisedMarks: 76.5,
        reviewNotes: 'Marks upgraded after recount confirmed missing 5 marks',
      };
      const result = revaluationReviewSchema.safeParse(review);
      expect(result.success).toBe(true);
    });
  });
});
