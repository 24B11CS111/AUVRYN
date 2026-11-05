import { describe, it, expect } from 'vitest';
import {
  announcementCreateSchema,
  announcementAcknowledgeSchema,
  homeworkAssignmentCreateSchema,
  homeworkSubmissionSchema,
  homeworkGradingSchema,
  communicationThreadCreateSchema,
  communicationMessageSendSchema,
  notificationDispatchSchema,
  notificationPreferencesUpdateSchema,
  pushTokenRegisterSchema,
  parentChildLeaveRequestSchema,
} from '../../packages/validators/src';

describe('Unit: Communication & Parent-Student Validators (Milestone 9)', () => {
  const dummyUUID = 'a0000000-0000-0000-0000-000000000001';
  const dummyUUID2 = 'b0000000-0000-0000-0000-000000000002';

  describe('Announcement Validators', () => {
    it('validates a correct announcement create payload', () => {
      const valid = {
        title: 'Midterm Examination Schedule 2026',
        content: 'Please find attached the finalized examination timetable for Term 1.',
        scope: 'institution' as const,
        priority: 'important' as const,
        status: 'published' as const,
        requiresAcknowledgement: true,
        attachments: [
          { name: 'Schedule.pdf', url: 'https://example.com/schedule.pdf', size: 1024 },
        ],
      };

      const result = announcementCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.title).toBe(valid.title);
        expect(result.data.requiresAcknowledgement).toBe(true);
      }
    });

    it('rejects an announcement with too short title or content', () => {
      const invalid = {
        title: 'Hi',
        content: 'Test',
      };
      const result = announcementCreateSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it('validates announcement acknowledgement schema with UUID', () => {
      const valid = { announcementId: dummyUUID };
      expect(announcementAcknowledgeSchema.safeParse(valid).success).toBe(true);

      const invalid = { announcementId: 'not-a-uuid' };
      expect(announcementAcknowledgeSchema.safeParse(invalid).success).toBe(false);
    });
  });

  describe('Homework & Assignment Validators', () => {
    it('validates a complete homework assignment payload', () => {
      const valid = {
        academicYearId: dummyUUID,
        classId: dummyUUID,
        subjectId: dummyUUID2,
        title: 'Physics Laboratory Experiment 3 Report',
        description: 'Complete the write-up for the pendulum experiment.',
        maxMarks: 50,
        dueDate: '2026-11-20',
        dueTime: '17:00:00',
        allowLateSubmissions: true,
        latePenaltyPercent: 15,
        status: 'published' as const,
      };

      const result = homeworkAssignmentCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.maxMarks).toBe(50);
        expect(result.data.latePenaltyPercent).toBe(15);
      }
    });

    it('rejects invalid due date format for homework', () => {
      const invalid = {
        academicYearId: dummyUUID,
        classId: dummyUUID,
        subjectId: dummyUUID2,
        title: 'Test Assignment',
        dueDate: '20-11-2026', // wrong format
      };
      expect(homeworkAssignmentCreateSchema.safeParse(invalid).success).toBe(false);
    });

    it('validates student homework submission', () => {
      const valid = {
        assignmentId: dummyUUID,
        studentId: dummyUUID2,
        submissionText: 'Here is my completed assignment submission.',
        attachments: [
          { name: 'report.pdf', url: 'https://example.com/report.pdf' },
        ],
      };
      expect(homeworkSubmissionSchema.safeParse(valid).success).toBe(true);
    });

    it('validates teacher homework grading rubric', () => {
      const valid = {
        submissionId: dummyUUID,
        marksObtained: 45,
        feedback: 'Excellent experimental error analysis.',
        status: 'graded' as const,
      };
      expect(homeworkGradingSchema.safeParse(valid).success).toBe(true);

      const negativeMarks = {
        submissionId: dummyUUID,
        marksObtained: -5,
      };
      expect(homeworkGradingSchema.safeParse(negativeMarks).success).toBe(false);
    });
  });

  describe('Communication Threads & Messaging Validators', () => {
    it('validates communication thread creation with initial message', () => {
      const valid = {
        threadType: 'parent_teacher' as const,
        subject: 'Progress discussion for Term 1',
        initialMessage: 'Dear Teacher, I would like to schedule a brief call regarding mathematics.',
        participantUserIds: [dummyUUID],
      };

      const result = communicationThreadCreateSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it('rejects thread creation with empty participants or empty initial message', () => {
      const noParticipants = {
        threadType: 'parent_teacher' as const,
        subject: 'Progress discussion',
        initialMessage: 'Hello',
        participantUserIds: [],
      };
      expect(communicationThreadCreateSchema.safeParse(noParticipants).success).toBe(false);

      const emptyMsg = {
        threadType: 'parent_teacher' as const,
        subject: 'Progress discussion',
        initialMessage: '',
        participantUserIds: [dummyUUID],
      };
      expect(communicationThreadCreateSchema.safeParse(emptyMsg).success).toBe(false);
    });

    it('validates sending a message into an existing thread', () => {
      const valid = {
        threadId: dummyUUID,
        body: 'Thank you for your response, see you tomorrow.',
      };
      expect(communicationMessageSendSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Notification Engine & Delivery Queue Validators', () => {
    it('validates notification dispatch payload with channels and category', () => {
      const valid = {
        recipientUserId: dummyUUID,
        category: 'attendance' as const,
        title: 'Absence Notification',
        body: 'Your ward was marked absent today.',
        priority: 'high' as const,
        channels: ['in_app' as const, 'sms' as const],
        data: { date: '2026-11-06', sessionId: 'sess-1' },
      };

      const result = notificationDispatchSchema.safeParse(valid);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.priority).toBe('high');
        expect(result.data.channels).toContain('sms');
      }
    });

    it('validates user notification preferences batch update', () => {
      const valid = {
        preferences: [
          { category: 'attendance' as const, channel: 'in_app' as const, isEnabled: true },
          { category: 'fees_payments' as const, channel: 'email' as const, isEnabled: true },
          { category: 'announcements' as const, channel: 'sms' as const, isEnabled: false },
        ],
      };
      expect(notificationPreferencesUpdateSchema.safeParse(valid).success).toBe(true);
    });

    it('validates push device token registration schema', () => {
      const valid = {
        token: 'fcm_token_abcdef123456',
        platform: 'android' as const,
        deviceModel: 'Pixel 8 Pro',
        appVersion: '1.0.0',
      };
      expect(pushTokenRegisterSchema.safeParse(valid).success).toBe(true);
    });
  });

  describe('Parent-Child Leave Integration Validators', () => {
    it('validates parent submitting leave for a child', () => {
      const valid = {
        studentId: dummyUUID,
        startDate: '2026-11-10',
        endDate: '2026-11-12',
        reason: 'Family medical emergency',
      };
      expect(parentChildLeaveRequestSchema.safeParse(valid).success).toBe(true);
    });

    it('rejects leave request with invalid date formats', () => {
      const invalid = {
        studentId: dummyUUID,
        startDate: '10/11/2026',
        endDate: '12/11/2026',
        reason: 'Absence',
      };
      expect(parentChildLeaveRequestSchema.safeParse(invalid).success).toBe(false);
    });
  });
});
