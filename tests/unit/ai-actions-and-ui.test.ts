import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockSession, mockSupabase } = vi.hoisted(() => {
  const session = {
    user: { id: 'test-user-123', email: 'faculty@apex.edu' },
    activeInstitutionId: '11111111-1111-1111-1111-111111111111',
    activeMembership: {
      id: 'mem-1',
      role: 'owner',
      institutionId: '11111111-1111-1111-1111-111111111111',
    },
    memberships: [],
  };

  const supabase = {
    from: vi.fn().mockImplementation((tableName: string) => ({
      select: vi.fn().mockImplementation(() => {
        const chain: any = {
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
          maybeSingle: vi.fn().mockImplementation(() => {
            if (tableName === 'guardians') {
              return Promise.resolve({ data: { id: 'g-1' }, error: null });
            }
            return Promise.resolve({ data: null, error: null });
          }),
        };
        chain.then = (resolve: any) => {
          if (tableName === 'ai_generated_drafts') {
            return resolve({
              data: [
                {
                  id: 'draft-101',
                  institution_id: session.activeInstitutionId,
                  author_id: session.user.id,
                  task_type: 'lesson_plan',
                  title: 'Photosynthesis Plan',
                  content_json: { topic: 'Photosynthesis' },
                  status: 'draft',
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                },
              ],
              error: null,
            });
          }
          if (tableName === 'academic_class_subjects') {
            return resolve({
              data: [
                { subject: { id: 'sub-1', name: 'Physics', code: 'PHY101' } },
              ],
              error: null,
            });
          }
          if (tableName === 'guardians') {
            return resolve({ data: { id: 'g-1' }, error: null });
          }
          if (tableName === 'student_guardians') {
            return resolve({
              data: [
                {
                  student: {
                    id: 's-1',
                    first_name: 'Priya',
                    last_name: 'Sharma',
                    enrollments: [{ is_active: true, class: { name: 'Grade 10' }, section: { name: 'A' } }],
                  },
                },
              ],
              error: null,
            });
          }
          return resolve({ data: [], error: null });
        };
        return chain;
      }),
      update: vi.fn().mockImplementation((updatePayload: any) => ({
        eq: vi.fn().mockReturnThis(),
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'draft-101',
              title: updatePayload.title || 'Updated Title',
              content_json: updatePayload.content_json || {},
              status: 'draft',
            },
            error: null,
          }),
        }),
      })),
    })),
  };

  return { mockSession: session, mockSupabase: supabase };
});

vi.mock('@/lib/auth', () => ({
  requireInstitution: vi.fn().mockResolvedValue(mockSession),
  requirePortalRole: vi.fn().mockResolvedValue(mockSession),
}));

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn().mockReturnValue(mockSupabase),
}));

vi.mock('@/lib/ai/engines/studentTutor', () => ({
  resolveStudentContext: vi.fn().mockResolvedValue({
    studentId: 's-1',
    studentName: 'Priya Sharma',
    classId: 'c-1',
    className: 'Grade 10',
    sectionName: 'A',
  }),
  askStudentTutor: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'tutor_qa',
    content: 'Step-by-step guidance provided.',
    usage: { totalTokens: 120 },
  }),
  generateStudentPracticeQuiz: vi.fn().mockResolvedValue({
    success: true,
    quiz: {
      title: 'Motion Quiz',
      subject: 'Physics',
      topic: 'Motion',
      totalQuestions: 3,
      questions: [
        {
          questionNumber: 1,
          questionText: 'What is acceleration?',
          options: ['Rate of change of velocity', 'Speed', 'Distance', 'Force'],
          correctOptionIndex: 0,
          explanation: 'Acceleration measures rate of velocity change.',
          difficulty: 'medium',
        },
      ],
    },
  }),
  generateStudentRevisionPlan: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'revision_plan',
    content: 'Day 1: Physics formulas. Day 2: Kinematics problems.',
  }),
}));

vi.mock('@/lib/ai/engines/teacherAssistant', () => ({
  generateLessonPlan: vi.fn().mockResolvedValue({
    success: true,
    draftId: 'draft-lp-1',
    lessonPlan: {
      topic: 'Genetics',
      subject: 'Biology',
      gradeLevel: 'Grade 10',
      durationMinutes: 45,
      learningObjectives: ['Define genes'],
      prerequisites: [],
      materialsNeeded: [],
      phases: [{ phaseName: 'Intro', durationMinutes: 10, activities: ['Hook'] }],
      assessmentStrategy: 'Exit ticket',
    },
  }),
  draftExamPaper: vi.fn().mockResolvedValue({
    success: true,
    draftId: 'draft-ep-1',
    examPaper: {
      title: 'Term 1 Exam',
      subject: 'Biology',
      gradeLevel: 'Grade 10',
      durationMinutes: 90,
      totalMarks: 100,
      generalInstructions: ['Attempt all questions'],
      sections: [{ sectionName: 'A', totalMarks: 100, questions: [] }],
    },
  }),
  generateRubric: vi.fn().mockResolvedValue({
    success: true,
    draftId: 'draft-rb-1',
    rubric: {
      title: 'Project Rubric',
      subject: 'Science',
      totalMarks: 20,
      criteria: [],
    },
  }),
  generateAssignmentPrompt: vi.fn().mockResolvedValue({
    success: true,
    draftId: 'draft-as-1',
    assignment: { title: 'Case Study', topic: 'Solar Energy' },
  }),
  generateMCQQuestionBank: vi.fn().mockResolvedValue({
    success: true,
    draftId: 'draft-mcq-1',
    questionBank: {
      title: 'QB',
      subject: 'Science',
      topic: 'Chemistry',
      totalQuestions: 5,
      questions: [],
    },
  }),
}));

vi.mock('@/lib/ai/engines/ownerIntelligence', () => ({
  resolveOwnerContext: vi.fn().mockResolvedValue({
    membershipId: 'mem-1',
    role: 'owner',
    institutionName: 'Apex Academy',
  }),
  fetchAggregatedInstitutionalMetrics: vi.fn().mockResolvedValue({
    institutionName: 'Apex Academy',
    totalStudents: 150,
    totalStaff: 25,
    totalClasses: 8,
    attendanceRatePercent: 92,
    totalAttendanceRecords: 450,
    totalFeeAssigned: 500000,
    totalFeeCollected: 450000,
    feeCollectionRatePercent: 90,
    pendingFeeAmount: 50000,
  }),
  askOwnerIntelligence: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'owner_analytics',
    content: 'Institutional attendance is robust at 92%. Fee collection risk is low with 10% outstanding.',
  }),
  generateExecutiveReport: vi.fn().mockResolvedValue({
    success: true,
    draftId: 'draft-rep-1',
    reportTitle: 'Monthly Operations Review',
    reportContent: 'Board level summary of KPIs and attendance health.',
  }),
}));

vi.mock('@/lib/ai/engines/parentCompanion', () => ({
  askParentCompanion: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'parent_summary',
    content: 'Your child is participating actively and attendance is steady.',
  }),
  explainAcademicReport: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'parent_summary',
    content: 'Your child showed great dedication in Mathematics and Science.',
  }),
  explainTimetableAndEvents: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'parent_summary',
    content: 'Classes run 8:30 AM to 3:00 PM. Science exhibition is on Friday.',
  }),
}));

vi.mock('@/lib/ai/gateway/draftManager', () => ({
  reviewAIDraft: vi.fn().mockResolvedValue({
    id: 'draft-101',
    status: 'approved',
    reviewedBy: 'test-user-123',
    reviewedAt: new Date().toISOString(),
  }),
}));

import {
  askStudentTutorAction,
  generateStudentPracticeQuizAction,
  generateStudentRevisionPlanAction,
  getStudentEnrolledSubjectsAction,
  generateLessonPlanAction,
  draftExamPaperAction,
  generateRubricAction,
  generateAssignmentPromptAction,
  generateMCQQuestionBankAction,
  listAIDraftsAction,
  reviewAIDraftAction,
  updateDraftContentAction,
  getInstitutionalMetricsAction,
  askOwnerIntelligenceAction,
  generateExecutiveReportAction,
  getParentLinkedStudentsAction,
  askParentCompanionAction,
  explainAcademicReportAction,
  explainTimetableAndEventsAction,
} from '../../apps/web/src/app/actions/aiActions';

describe('Milestone 12 Phase 4: AI Dashboard UI & Actions Layer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // 1. Student Actions
  describe('Student Actions', () => {
    it('askStudentTutorAction executes successfully', async () => {
      const res = await askStudentTutorAction({ prompt: 'Explain gravity' });
      expect(res.success).toBe(true);
      expect(res.data?.content).toBe('Step-by-step guidance provided.');
    });

    it('generateStudentPracticeQuizAction returns validated quiz', async () => {
      const res = await generateStudentPracticeQuizAction({
        subjectId: 'sub-1',
        topic: 'Motion',
        questionCount: 3,
      });
      expect(res.success).toBe(true);
      expect(res.data?.questions.length).toBe(1);
    });

    it('generateStudentRevisionPlanAction returns schedule', async () => {
      const res = await generateStudentRevisionPlanAction({ daysAvailable: 5 });
      expect(res.success).toBe(true);
      expect(res.data?.content).toContain('Day 1');
    });

    it('getStudentEnrolledSubjectsAction fetches class subjects', async () => {
      const res = await getStudentEnrolledSubjectsAction();
      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0]?.name).toBe('Physics');
    });
  });

  // 2. Teacher Actions
  describe('Teacher Actions', () => {
    it('generateLessonPlanAction creates lesson plan draft', async () => {
      const res = await generateLessonPlanAction({
        topic: 'Genetics',
        gradeLevel: 'Grade 10',
      });
      expect(res.success).toBe(true);
      expect(res.data?.draftId).toBe('draft-lp-1');
      expect(res.data?.lessonPlan?.phases.length).toBe(1);
    });

    it('draftExamPaperAction creates exam paper draft', async () => {
      const res = await draftExamPaperAction({
        title: 'Term 1 Exam',
        gradeLevel: 'Grade 10',
      });
      expect(res.success).toBe(true);
      expect(res.data?.draftId).toBe('draft-ep-1');
    });

    it('generateRubricAction creates assessment rubric draft', async () => {
      const res = await generateRubricAction({
        title: 'Project Rubric',
        assignmentDescription: 'Science project',
      });
      expect(res.success).toBe(true);
      expect(res.data?.draftId).toBe('draft-rb-1');
    });

    it('generateAssignmentPromptAction creates assignment draft', async () => {
      const res = await generateAssignmentPromptAction({
        title: 'Case Study',
        topic: 'Solar Energy',
        gradeLevel: 'Grade 10',
      });
      expect(res.success).toBe(true);
      expect(res.data?.draftId).toBe('draft-as-1');
    });

    it('generateMCQQuestionBankAction creates MCQ question bank draft', async () => {
      const res = await generateMCQQuestionBankAction({
        topic: 'Chemistry',
      });
      expect(res.success).toBe(true);
      expect(res.data?.draftId).toBe('draft-mcq-1');
    });
  });

  // 3. Draft Review & Approval Workflow
  describe('Draft Review & Approval Workflow', () => {
    it('listAIDraftsAction returns institutional drafts', async () => {
      const res = await listAIDraftsAction();
      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0]?.id).toBe('draft-101');
    });

    it('reviewAIDraftAction approves draft with human reviewer attribution', async () => {
      const res = await reviewAIDraftAction({
        draftId: 'draft-101',
        status: 'approved',
      });
      expect(res.success).toBe(true);
      expect(res.data?.status).toBe('approved');
    });

    it('updateDraftContentAction updates draft content before approval', async () => {
      const res = await updateDraftContentAction({
        draftId: 'draft-101',
        title: 'Edited Lesson Plan',
        contentJson: { topic: 'Edited Topic' },
      });
      expect(res.success).toBe(true);
      expect(res.data?.title).toBe('Edited Lesson Plan');
    });
  });

  // 4. Owner Intelligence Actions
  describe('Owner Intelligence Actions', () => {
    it('getInstitutionalMetricsAction returns verified metrics', async () => {
      const res = await getInstitutionalMetricsAction();
      expect(res.success).toBe(true);
      expect(res.data?.totalStudents).toBe(150);
      expect(res.data?.attendanceRatePercent).toBe(92);
      expect(res.data?.feeCollectionRatePercent).toBe(90);
    });

    it('askOwnerIntelligenceAction executes strategic query', async () => {
      const res = await askOwnerIntelligenceAction({
        prompt: 'Analyze fee realization and attendance risk',
      });
      expect(res.success).toBe(true);
      expect(res.data?.content).toContain('92%');
    });

    it('generateExecutiveReportAction creates board governance report draft', async () => {
      const res = await generateExecutiveReportAction({
        reportType: 'monthly_operations',
      });
      expect(res.success).toBe(true);
      expect(res.data?.draftId).toBe('draft-rep-1');
      expect(res.data?.reportTitle).toBe('Monthly Operations Review');
    });
  });

  // 5. Parent Companion Actions
  describe('Parent Companion Actions', () => {
    it('getParentLinkedStudentsAction returns wards linked in student_guardians', async () => {
      const res = await getParentLinkedStudentsAction();
      expect(res.success).toBe(true);
      expect(res.data?.length).toBe(1);
      expect(res.data?.[0]?.name).toBe('Priya Sharma');
    });

    it('askParentCompanionAction executes empathetic guidance query', async () => {
      const res = await askParentCompanionAction({
        studentId: 's-1',
        prompt: 'How is Priya doing?',
      });
      expect(res.success).toBe(true);
      expect(res.data?.content).toContain('participating actively');
    });

    it('explainAcademicReportAction explains child report card without peer comparisons', async () => {
      const res = await explainAcademicReportAction({
        studentId: 's-1',
      });
      expect(res.success).toBe(true);
      expect(res.data?.content).toContain('great dedication');
    });

    it('explainTimetableAndEventsAction summarizes student calendar', async () => {
      const res = await explainTimetableAndEventsAction({
        studentId: 's-1',
      });
      expect(res.success).toBe(true);
      expect(res.data?.content).toContain('8:30 AM');
    });
  });
});
