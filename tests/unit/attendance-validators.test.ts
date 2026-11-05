import { describe, it, expect } from 'vitest';
import {
  attendanceSessionCreateSchema,
  studentAttendanceBatchSchema,
  studentAttendanceCorrectionSchema,
  staffAttendanceBatchSchema,
  staffAttendanceCorrectionSchema,
  leaveRequestCreateSchema,
  leaveRequestReviewSchema,
} from '../../packages/validators/src';

describe('Unit: Attendance & Leave Validators', () => {
  const todayStr = new Date().toISOString().slice(0, 10);

  // 1. Attendance Session Creation Schema
  describe('attendanceSessionCreateSchema', () => {
    it('accepts valid daily attendance session for schools and junior colleges', () => {
      const valid = attendanceSessionCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        sectionId: '33333333-3333-3333-3333-333333333333',
        sessionDate: todayStr,
        sessionType: 'daily',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.sessionType).toBe('daily');
        expect(valid.data.sessionDate).toBe(todayStr);
      }
    });

    it('accepts lecture / lab session with subject and period for colleges and universities', () => {
      const valid = attendanceSessionCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        sectionId: '33333333-3333-3333-3333-333333333333',
        subjectId: '44444444-4444-4444-4444-444444444444',
        sessionDate: todayStr,
        sessionType: 'lab',
        periodNumber: 3,
        startTime: '10:00',
        endTime: '12:00',
        topicCovered: 'Data Structures Binary Trees Lab',
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.sessionType).toBe('lab');
        expect(valid.data.periodNumber).toBe(3);
        expect(valid.data.topicCovered).toBe('Data Structures Binary Trees Lab');
      }
    });

    it('rejects future session dates', () => {
      // Create a date in the future (tomorrow)
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const futureDateStr = tomorrow.toISOString().slice(0, 10);

      const invalid = attendanceSessionCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        sessionDate: futureDateStr,
      });

      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.errors[0]?.message).toContain('future');
      }
    });

    it('rejects invalid UUIDs or invalid date format', () => {
      const invalidUuid = attendanceSessionCreateSchema.safeParse({
        academicYearId: 'bad-uuid',
        classId: '22222222-2222-2222-2222-222222222222',
        sessionDate: todayStr,
      });
      expect(invalidUuid.success).toBe(false);

      const invalidDate = attendanceSessionCreateSchema.safeParse({
        academicYearId: '11111111-1111-1111-1111-111111111111',
        classId: '22222222-2222-2222-2222-222222222222',
        sessionDate: '2026/05/10', // Invalid format
      });
      expect(invalidDate.success).toBe(false);
    });
  });

  // 2. Student Attendance Batch Schema
  describe('studentAttendanceBatchSchema', () => {
    it('accepts valid attendance roster batch', () => {
      const valid = studentAttendanceBatchSchema.safeParse({
        sessionId: '55555555-5555-5555-5555-555555555555',
        records: [
          {
            studentId: '11111111-1111-1111-1111-111111111111',
            status: 'present',
          },
          {
            studentId: '22222222-2222-2222-2222-222222222222',
            status: 'absent',
            remarks: 'Uninformed absence',
          },
          {
            studentId: '33333333-3333-3333-3333-333333333333',
            status: 'late',
            remarks: 'School bus delay',
          },
          {
            studentId: '44444444-4444-4444-4444-444444444444',
            status: 'on_leave',
            isExcused: true,
          },
        ],
      });

      expect(valid.success).toBe(true);
      if (valid.success) {
        expect(valid.data.records.length).toBe(4);
      }
    });

    it('rejects empty records list', () => {
      const empty = studentAttendanceBatchSchema.safeParse({
        sessionId: '55555555-5555-5555-5555-555555555555',
        records: [],
      });
      expect(empty.success).toBe(false);
    });

    it('rejects invalid attendance status', () => {
      const invalid = studentAttendanceBatchSchema.safeParse({
        sessionId: '55555555-5555-5555-5555-555555555555',
        records: [
          {
            studentId: '11111111-1111-1111-1111-111111111111',
            status: 'holiday' as any,
          },
        ],
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 3. Student Attendance Correction Schema
  describe('studentAttendanceCorrectionSchema', () => {
    it('accepts valid correction with reason', () => {
      const valid = studentAttendanceCorrectionSchema.safeParse({
        recordId: '11111111-1111-1111-1111-111111111111',
        newStatus: 'excused',
        reason: 'Parent submitted doctor certificate regarding fever',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects missing or too short correction reason', () => {
      const shortReason = studentAttendanceCorrectionSchema.safeParse({
        recordId: '11111111-1111-1111-1111-111111111111',
        newStatus: 'present',
        reason: 'ok',
      });
      expect(shortReason.success).toBe(false);
    });
  });

  // 4. Staff Attendance Batch Schema
  describe('staffAttendanceBatchSchema', () => {
    it('accepts valid daily staff attendance roster', () => {
      const valid = staffAttendanceBatchSchema.safeParse({
        attendanceDate: todayStr,
        records: [
          {
            staffId: '11111111-1111-1111-1111-111111111111',
            status: 'present',
            checkInTime: '08:45',
            checkOutTime: '16:30',
          },
          {
            staffId: '22222222-2222-2222-2222-222222222222',
            status: 'on_leave',
            remarks: 'Casual leave approved',
          },
        ],
      });
      expect(valid.success).toBe(true);
    });

    it('rejects future staff attendance date', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 2);
      const futureDate = tomorrow.toISOString().slice(0, 10);

      const invalid = staffAttendanceBatchSchema.safeParse({
        attendanceDate: futureDate,
        records: [
          {
            staffId: '11111111-1111-1111-1111-111111111111',
            status: 'present',
          },
        ],
      });
      expect(invalid.success).toBe(false);
    });
  });

  // 5. Staff Attendance Correction Schema
  describe('staffAttendanceCorrectionSchema', () => {
    it('accepts valid staff attendance adjustment', () => {
      const valid = staffAttendanceCorrectionSchema.safeParse({
        recordId: '11111111-1111-1111-1111-111111111111',
        newStatus: 'present',
        reason: 'Biometric fingerprint reader was offline at entry gate',
      });
      expect(valid.success).toBe(true);
    });
  });

  // 6. Leave Request Creation Schema
  describe('leaveRequestCreateSchema', () => {
    it('accepts valid student medical leave request with document', () => {
      const valid = leaveRequestCreateSchema.safeParse({
        applicantType: 'student',
        studentId: '11111111-1111-1111-1111-111111111111',
        leaveType: 'medical',
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        reason: 'Recovery from wisdom tooth surgery',
        supportingDocumentUrl: 'https://storage.institution.edu/medical/doc1.pdf',
      });
      expect(valid.success).toBe(true);
    });

    it('accepts valid staff casual leave request', () => {
      const valid = leaveRequestCreateSchema.safeParse({
        applicantType: 'staff',
        staffId: '22222222-2222-2222-2222-222222222222',
        leaveType: 'casual',
        startDate: '2026-11-15',
        endDate: '2026-11-15',
        reason: 'Attending family wedding ceremony',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects leave when end date precedes start date', () => {
      const invalid = leaveRequestCreateSchema.safeParse({
        applicantType: 'student',
        studentId: '11111111-1111-1111-1111-111111111111',
        leaveType: 'sick',
        startDate: '2026-11-15',
        endDate: '2026-11-10',
        reason: 'Fever and cold symptoms',
      });
      expect(invalid.success).toBe(false);
      if (!invalid.success) {
        expect(invalid.error.errors[0]?.message).toContain('End date must be on or after start date');
      }
    });

    it('rejects applicant without corresponding student or staff ID', () => {
      const missingStudentId = leaveRequestCreateSchema.safeParse({
        applicantType: 'student',
        leaveType: 'casual',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: 'Doctor appointment',
      });
      expect(missingStudentId.success).toBe(false);

      const missingStaffId = leaveRequestCreateSchema.safeParse({
        applicantType: 'staff',
        leaveType: 'casual',
        startDate: '2026-11-10',
        endDate: '2026-11-10',
        reason: 'Personal engagement',
      });
      expect(missingStaffId.success).toBe(false);
    });
  });

  // 7. Leave Request Review Schema
  describe('leaveRequestReviewSchema', () => {
    it('accepts valid approval decision with remarks', () => {
      const valid = leaveRequestReviewSchema.safeParse({
        leaveRequestId: '11111111-1111-1111-1111-111111111111',
        status: 'approved',
        reviewRemarks: 'Approved as per institutional medical guidelines.',
      });
      expect(valid.success).toBe(true);
    });

    it('accepts rejection decision', () => {
      const valid = leaveRequestReviewSchema.safeParse({
        leaveRequestId: '11111111-1111-1111-1111-111111111111',
        status: 'rejected',
        reviewRemarks: 'Exam scheduled on the requested date.',
      });
      expect(valid.success).toBe(true);
    });

    it('rejects invalid review status', () => {
      const invalid = leaveRequestReviewSchema.safeParse({
        leaveRequestId: '11111111-1111-1111-1111-111111111111',
        status: 'pending' as any,
      });
      expect(invalid.success).toBe(false);
    });
  });
});
