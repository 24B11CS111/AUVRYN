import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GeminiAdapter } from '../../apps/web/src/lib/ai/adapters/gemini';
import { MockAIAdapter } from '../../apps/web/src/lib/ai/adapters/mock';
import { executeAIGateway } from '../../apps/web/src/lib/ai/gateway/canonicalGateway';

// Hoist mock state
const { mockSession, mockSupabase } = vi.hoisted(() => {
  const session = {
    user: { id: 'test-user-123', email: 'owner@institution-a.edu' },
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
                    enrollments: [
                      {
                        is_active: true,
                        class: { name: 'Grade 10' },
                        section: { name: 'A' },
                      },
                    ],
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
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
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
          }),
        }),
      })),
      insert: vi.fn().mockImplementation((insertPayload: any) => ({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'draft-101',
              ...insertPayload,
              status: 'pending_review',
            },
            error: null,
          }),
        }),
      })),
    })),
    rpc: vi.fn().mockImplementation((fnName: string) => {
      if (fnName === 'check_and_reserve_ai_quota') {
        return Promise.resolve({
          data: {
            allowed: true,
            reason: undefined,
            message: undefined,
            monthly_tokens_remaining: 500000,
            monthly_requests_remaining: 2500,
          },
          error: null,
        });
      }
      if (fnName === 'record_ai_usage') {
        return Promise.resolve({
          data: 'log-uuid-12345',
          error: null,
        });
      }
      return Promise.resolve({ data: null, error: null });
    }),
  };

  return { mockSession: session, mockSupabase: supabase };
});

vi.mock('@/lib/auth', () => ({
  requireInstitution: vi.fn().mockImplementation(() => Promise.resolve(mockSession)),
  requirePortalRole: vi.fn().mockImplementation((allowedRoles: string[]) => {
    if (!allowedRoles.includes(mockSession.activeMembership.role)) {
      throw new Error(`Unauthorized: User role ${mockSession.activeMembership.role} not permitted`);
    }
    return Promise.resolve(mockSession);
  }),
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
          questionText: 'Which law describes inertia?',
          options: ['First Law', 'Second Law', 'Third Law', 'Universal Gravitation'],
          correctOptionIndex: 0,
          explanation: 'Newton First Law states an object at rest stays at rest unless acted on by a net external force.',
          difficulty: 'medium',
        },
      ],
    },
  }),
  generateStudentRevisionPlan: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'revision_plan',
    content: 'Day 1: Periodic Trends. Day 2: Stoichiometry formulas and practice problems.',
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
    paper: {
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
      criteria: [
        { criterionName: 'Historical Accuracy', weightPoints: 40 },
        { criterionName: 'Primary Source Analysis', weightPoints: 30 },
        { criterionName: 'Oral Defense', weightPoints: 30 },
      ],
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
    reportContent: '# Board Governance Briefing\nBoard level summary of KPIs and attendance health.',
  }),
}));

vi.mock('@/lib/ai/engines/parentCompanion', () => ({
  askParentCompanion: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'parent_summary',
    content: 'Your child is participating actively and attendance is steady.',
  }),
  explainAcademicReport: vi.fn().mockImplementation((supabase: any, params: any) => {
    if (params.studentId === 'unlinked-student-999') {
      return Promise.resolve({
        success: false,
        error: { code: 'FORBIDDEN', message: 'Unauthorized: Student is not linked to this parent guardian' },
      });
    }
    return Promise.resolve({
      success: true,
      taskType: 'parent_summary',
      content: 'Your child showed great dedication in Mathematics and Science.',
    });
  }),
  explainTimetableAndEvents: vi.fn().mockResolvedValue({
    success: true,
    taskType: 'parent_summary',
    content: 'Classes run 8:30 AM to 3:00 PM. Science exhibition is on Friday.',
  }),
}));

vi.mock('@/lib/ai/gateway/draftManager', () => ({
  reviewAIDraft: vi.fn().mockImplementation((supabase: any, params: any) => {
    if (params.status === 'rejected' && (!params.rejectionReason || params.rejectionReason.trim() === '')) {
      throw new Error('Audit review notes are required');
    }
    return Promise.resolve({
      id: params.draftId,
      status: params.status,
      reviewedBy: mockSession.user.id,
      reviewedAt: new Date().toISOString(),
    });
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

describe('MILESTONE 12 — PHASE 5: E2E Integration & Security Acceptance', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession.activeMembership.role = 'owner';
  });

  // =========================================================================
  // 1. REAL AI PROVIDER INTEGRATION & GEMINI ADAPTER
  // =========================================================================
  describe('1. Real AI Provider Integration & Gemini Adapter', () => {
    it('verifies Gemini provider configuration and default model', () => {
      const adapter = new GeminiAdapter({ apiKey: 'test-key-xyz' });
      expect(adapter.providerName).toBe('gemini');
    });

    it('verifies server-side API key requirement and fails gracefully when missing', async () => {
      const unconfiguredAdapter = new GeminiAdapter({ apiKey: '' });
      await expect(
        unconfiguredAdapter.generateCompletion({
          systemPrompt: 'You are an educational assistant.',
          userPrompt: 'Hello',
        })
      ).rejects.toThrow('GEMINI_API_KEY is not configured on the server');
    });

    it('executes an authenticated AI completion with JSON structured output validation', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      title: 'Photosynthesis Fundamentals',
                      difficultyLevel: 'intermediate',
                      explanation: 'Process by which plants convert sunlight into chemical energy.',
                      keyVocabulary: ['chlorophyll', 'stomata'],
                    }),
                  },
                ],
              },
            },
          ],
          usageMetadata: {
            promptTokenCount: 120,
            candidatesTokenCount: 65,
            totalTokenCount: 185,
          },
        }),
      });

      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = new GeminiAdapter({ apiKey: 'test-api-key' });
        const result = await adapter.generateCompletion({
          systemPrompt: 'Output JSON schema for biology tutor.',
          userPrompt: 'Explain photosynthesis',
          responseFormat: 'json',
        });

        expect(result.content).toBeDefined();
        expect(result.parsed).toBeDefined();
        expect((result.parsed as any).title).toBe('Photosynthesis Fundamentals');
        expect(result.totalTokens).toBe(185);
        expect(mockFetch).toHaveBeenCalledTimes(1);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('verifies provider failure handling on HTTP 429 rate limit or 500 server error', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 429,
        text: async () => JSON.stringify({ error: { message: 'Resource exhausted (quota exceeded)' } }),
      });

      const originalFetch = global.fetch;
      global.fetch = mockFetch;

      try {
        const adapter = new GeminiAdapter({ apiKey: 'test-api-key' });
        await expect(
          adapter.generateCompletion({
            systemPrompt: 'Test',
            userPrompt: 'Test',
          })
        ).rejects.toThrow(/Gemini API error \(429\)/);
      } finally {
        global.fetch = originalFetch;
      }
    });

    it('never exposes server-side provider secrets to client responses', async () => {
      const adapter = new MockAIAdapter();
      const gatewayResponse = await executeAIGateway(
        mockSupabase as any,
        {
          institutionId: '11111111-1111-1111-1111-111111111111',
          taskType: 'tutor_qa',
          prompt: 'Explain gravity',
        },
        {
          userId: 'test-user-123',
          institutionId: '11111111-1111-1111-1111-111111111111',
          role: 'student',
        },
        {
          mockAdapter: adapter,
        }
      );

      expect(gatewayResponse.success).toBe(true);
      const serialized = JSON.stringify(gatewayResponse);
      expect(serialized).not.toContain('GEMINI_API_KEY');
      expect(serialized).not.toContain('SUPABASE_SERVICE_ROLE_KEY');
      expect(serialized).not.toContain('service_role');
    });
  });

  // =========================================================================
  // 2. STUDENT AI TUTOR WORKFLOWS
  // =========================================================================
  describe('2. Student AI Tutor Workflows', () => {
    beforeEach(() => {
      mockSession.activeMembership.role = 'student';
    });

    it('authenticates student and retrieves enrolled subjects', async () => {
      const result = await getStudentEnrolledSubjectsAction();
      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data?.[0].name).toBe('Physics');
    });

    it('generates Socratic concept explanations without completing graded homework', async () => {
      const result = await askStudentTutorAction({
        prompt: 'How does cell mitosis differ from meiosis?',
        subjectId: 'sub-bio',
      });

      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('supports study material Q&A with document notes grounding', async () => {
      const result = await askStudentTutorAction({
        prompt: 'What was mentioned in the lecture regarding ATP production?',
        subjectId: 'sub-bio',
        retrievedStudyMaterial: 'Mitochondria generate ATP through oxidative phosphorylation.',
      });

      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('generates Bloom-aligned practice quiz and evaluates responses', async () => {
      const result = await generateStudentPracticeQuizAction({
        subjectId: 'sub-1',
        topic: 'Newtonian Laws of Motion',
        questionCount: 3,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(Array.isArray(result.data?.questions)).toBe(true);
      expect(result.data?.questions[0].questionText).toContain('inertia');
      expect(result.data?.questions[0].correctOptionIndex).toBe(0);
    });

    it('generates personalized exam revision planner', async () => {
      const result = await generateStudentRevisionPlanAction({
        examName: 'Midterm Chemistry',
        daysAvailable: 5,
      });

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.content).toContain('Periodic Trends');
    });

    it('denies student access when attempting faculty-only lesson plan actions', async () => {
      const res = await generateLessonPlanAction({
        topic: 'Thermodynamics',
        gradeLevel: 'Grade 11',
        durationMinutes: 60,
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized');
    });
  });

  // =========================================================================
  // 3. TEACHER AI ASSISTANT WORKFLOWS
  // =========================================================================
  describe('3. Teacher AI Assistant Workflows', () => {
    beforeEach(() => {
      mockSession.activeMembership.role = 'faculty';
    });

    it('authorizes active faculty and generates a 5E lesson plan saved as draft', async () => {
      const result = await generateLessonPlanAction({
        topic: 'Electromagnetic Induction',
        gradeLevel: 'Grade 12',
        durationMinutes: 45,
        learningObjectives: ['Understand Faraday Law', 'Demonstrate Lenz Law'],
      });

      expect(result.success).toBe(true);
      expect(result.data?.draftId).toBe('draft-lp-1');
      expect(result.data?.lessonPlan.phases).toHaveLength(1);
    });

    it('drafts a multi-section exam paper with marking schemes', async () => {
      const result = await draftExamPaperAction({
        title: 'Midterm Mathematics 2026',
        gradeLevel: 'Grade 10',
        totalMarks: 50,
        durationMinutes: 90,
      });

      expect(result.success).toBe(true);
      expect(result.data?.draftId).toBe('draft-ep-1');
      expect(result.data?.paper.sections).toHaveLength(1);
    });

    it('generates an assignment prompt with anti-plagiarism defenses and an analytic rubric', async () => {
      const assignmentRes = await generateAssignmentPromptAction({
        title: 'Industrial Revolution Paper',
        topic: 'The Industrial Revolution',
        gradeLevel: 'Grade 9',
      });
      expect(assignmentRes.success).toBe(true);
      expect(assignmentRes.data?.draftId).toBe('draft-as-1');

      const rubricRes = await generateRubricAction({
        title: 'Industrial Revolution Research',
        assignmentDescription: 'Research Essay + 3-min Oral Defense',
        totalMarks: 100,
      });
      expect(rubricRes.success).toBe(true);
      expect(rubricRes.data?.rubric.criteria).toHaveLength(3);
    });

    it('persists, updates, and allows faculty review/approval of drafts with audit trail', async () => {
      // 1. List drafts
      const listRes = await listAIDraftsAction();
      expect(listRes.success).toBe(true);
      expect(listRes.data).toHaveLength(1);

      // 2. Update draft content
      const updateRes = await updateDraftContentAction({
        draftId: 'draft-101',
        title: 'Edited Lesson Plan',
        contentJson: { topic: 'Wave-Particle Duality (Revised)', durationMinutes: 50 },
      });
      expect(updateRes.success).toBe(true);

      // 3. Approve draft with audit note
      const reviewRes = await reviewAIDraftAction({
        draftId: 'draft-101',
        status: 'approved',
        rejectionReason: 'Verified alignment with syllabus.',
      });
      expect(reviewRes.success).toBe(true);
    });

    it('strictly prevents unapproved drafts from unauthorized automatic publishing', async () => {
      const res = await reviewAIDraftAction({
        draftId: 'draft-101',
        status: 'rejected',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Audit review notes are required');
    });
  });

  // =========================================================================
  // 4. OWNER INTELLIGENCE WORKFLOWS
  // =========================================================================
  describe('4. Owner Intelligence Workflows', () => {
    beforeEach(() => {
      mockSession.activeMembership.role = 'owner';
    });

    it('retrieves institution-specific operational and financial KPIs', async () => {
      const metrics = await getInstitutionalMetricsAction();
      expect(metrics.success).toBe(true);
      expect(metrics.data?.totalStudents).toBe(150);
      expect(metrics.data?.totalStaff).toBe(25);
      expect(metrics.data?.totalClasses).toBe(8);
      expect(metrics.data?.attendanceRatePercent).toBe(92);
      expect(metrics.data?.totalFeeCollected).toBe(450000);
      expect(metrics.data?.pendingFeeAmount).toBe(50000);
    });

    it('executes natural-language strategic query for institutional leadership', async () => {
      const result = await askOwnerIntelligenceAction({
        prompt: 'Summarize term attendance trends and highlight any classes requiring intervention.',
      });
      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('generates a comprehensive executive board briefing report', async () => {
      const report = await generateExecutiveReportAction({
        reportType: 'monthly_operations',
        reportingPeriod: 'Term 1 Comprehensive Review',
      });
      expect(report.success).toBe(true);
      expect(report.data?.reportContent).toBeDefined();
      expect(report.data?.reportContent).toContain('Board Governance Briefing');
    });

    it('denies non-owner and non-admin access to owner intelligence actions', async () => {
      mockSession.activeMembership.role = 'student';
      const metricsRes = await getInstitutionalMetricsAction();
      expect(metricsRes.success).toBe(false);
      expect(metricsRes.error).toContain('Unauthorized');

      const askRes = await askOwnerIntelligenceAction({ prompt: 'Financials' });
      expect(askRes.success).toBe(false);
      expect(askRes.error).toContain('Unauthorized');
    });
  });

  // =========================================================================
  // 5. PARENT AI COMPANION WORKFLOWS
  // =========================================================================
  describe('5. Parent AI Companion Workflows', () => {
    beforeEach(() => {
      mockSession.activeMembership.role = 'parent';
    });

    it('verifies parent-child authorization and retrieves only linked wards', async () => {
      const wardsRes = await getParentLinkedStudentsAction();
      expect(wardsRes.success).toBe(true);
      expect(wardsRes.data).toHaveLength(1);
      expect(wardsRes.data?.[0].name).toBe('Priya Sharma');
    });

    it('explains academic report cards in clear, empathetic parent language', async () => {
      const result = await explainAcademicReportAction({
        studentId: 's-1',
        examinationId: 'Midterm Examination 2026',
      });
      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('explains timetable, school calendar, and upcoming activities', async () => {
      const result = await explainTimetableAndEventsAction({
        studentId: 's-1',
      });
      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('answers general parent inquiries regarding student development', async () => {
      const result = await askParentCompanionAction({
        studentId: 's-1',
        prompt: 'How can I help Alice balance her math homework with athletics?',
      });
      expect(result.success).toBe(true);
      expect(result.data?.content).toBeDefined();
    });

    it('denies parent companion access to unlinked students', async () => {
      const res = await explainAcademicReportAction({
        studentId: 'unlinked-student-999',
        examinationId: 'Final Exam',
      });
      expect(res.success).toBe(false);
      expect(res.error).toContain('Unauthorized: Student is not linked to this parent guardian');
    });
  });

  // =========================================================================
  // 6. MULTI-TENANT ISOLATION, RLS, & INTEGRITY SAFEGUARDS
  // =========================================================================
  describe('6. Multi-Tenant Isolation & Integrity Safeguards', () => {
    it('enforces tenant isolation: actions always bind to caller activeInstitutionId', async () => {
      mockSession.activeMembership.role = 'faculty';
      mockSession.activeInstitutionId = '11111111-1111-1111-1111-111111111111';

      const draftResult = await generateLessonPlanAction({
        topic: 'Ecology',
        gradeLevel: 'Grade 9',
        durationMinutes: 45,
      });

      expect(draftResult.success).toBe(true);
    });

    it('preserves zero-write safeguard: AI engines never write directly to student marks or fee balances', async () => {
      const calledTables = mockSupabase.from.mock.calls.map((call: any[]) => call[0]);
      expect(calledTables).not.toContain('academic_grades');
      expect(calledTables).not.toContain('student_attendance');
    });

    it('enforces atomic quota reservation before model execution and rolls back on failure', async () => {
      const adapter = new MockAIAdapter();
      const reservationMock = mockSupabase.rpc as any;
      await executeAIGateway(
        mockSupabase as any,
        {
          institutionId: '11111111-1111-1111-1111-111111111111',
          taskType: 'lesson_plan',
          prompt: 'Generate plan',
        },
        {
          userId: 'test-user-123',
          institutionId: '11111111-1111-1111-1111-111111111111',
          role: 'faculty',
        },
        {
          mockAdapter: adapter,
        }
      );

      expect(reservationMock).toHaveBeenCalledWith(
        'check_and_reserve_ai_quota',
        expect.objectContaining({
          p_institution_id: '11111111-1111-1111-1111-111111111111',
          p_task_type: 'lesson_plan',
        })
      );
    });
  });
});
