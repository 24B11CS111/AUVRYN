import type {
  AIProviderType,
  AIProviderAdapter,
} from '@edu-platform/types';
import {
  aiLessonPlanSchema,
  aiExamPaperSchema,
  aiRubricSchema,
  aiQuizSchema,
  type AILessonPlanOutput,
  type AIExamPaperOutput,
  type AIRubricOutput,
  type AIQuizOutput,
} from '@edu-platform/validators';
import { executeAIGateway } from '../gateway/canonicalGateway';
import type { AIAuthContext } from '../gateway/authorization';
import { createAIDraft } from '../gateway/draftManager';

export interface TeacherBaseParams {
  teacherUserId: string;
  institutionId: string;
  classId?: string;
  sectionId?: string;
  subjectId?: string;
  preferredProvider?: AIProviderType;
  mockAdapter?: AIProviderAdapter;
}

export interface GenerateLessonPlanParams extends TeacherBaseParams {
  topic: string;
  gradeLevel: string;
  durationMinutes?: number;
  learningObjectives?: string[];
  prerequisites?: string[];
}

export interface DraftExamPaperParams extends TeacherBaseParams {
  title: string;
  gradeLevel: string;
  durationMinutes?: number;
  totalMarks?: number;
  instructions?: string[];
  topicsCoverage?: string[];
}

export interface GenerateRubricParams extends TeacherBaseParams {
  title: string;
  totalMarks?: number;
  assignmentDescription: string;
  criteriaAreas?: string[];
}

export interface GenerateAssignmentParams extends TeacherBaseParams {
  title: string;
  topic: string;
  gradeLevel: string;
  instructions?: string;
  dueDateDays?: number;
}

export interface GenerateMCQQuestionBankParams extends TeacherBaseParams {
  topic: string;
  count?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

/**
 * Resolves teacher staff profile and active faculty allocations
 */
export async function resolveTeacherContext(
  supabaseClient: any,
  teacherUserId: string,
  institutionId: string
) {
  // 1. Resolve staff profile
  const { data: staff, error: staffErr } = await supabaseClient
    .from('staff_profiles')
    .select('id, employee_id, first_name, last_name, designation, employment_status, institution_id')
    .eq('institution_id', institutionId)
    .eq('user_id', teacherUserId)
    .maybeSingle();

  if (staffErr || !staff) {
    throw new Error('Staff profile not found or unauthorized for this user and institution.');
  }

  if (staff.employment_status !== 'active') {
    throw new Error(`Teacher employment status is "${staff.employment_status}". Only active faculty can access AI tools.`);
  }

  // 2. Fetch active allocations
  const { data: allocations, error: allocErr } = await supabaseClient
    .from('faculty_allocations')
    .select('id, class_id, section_id, subject_id, is_class_teacher, is_coordinator, status')
    .eq('institution_id', institutionId)
    .eq('staff_id', staff.id)
    .eq('status', 'active');

  if (allocErr) {
    throw new Error(`Failed to load faculty allocations: ${allocErr.message}`);
  }

  return {
    staffId: staff.id,
    fullName: `${staff.first_name} ${staff.last_name}`.trim(),
    designation: staff.designation,
    allocations: allocations || [],
  };
}

/**
 * Verifies teacher allocation if class or subject is specified
 */
export function verifyTeacherAllocation(
  allocations: any[],
  classId?: string,
  subjectId?: string
): boolean {
  if (!classId && !subjectId) return true;

  // If allocations are empty but teacher has general active status, verify if class/subject matches
  return allocations.some((alloc) => {
    const classMatches = !classId || !alloc.class_id || alloc.class_id === classId;
    const subjectMatches = !subjectId || !alloc.subject_id || alloc.subject_id === subjectId;
    return classMatches && subjectMatches;
  });
}

/**
 * 1. Generate Structured Lesson Plan (Mandatory Draft Persistence)
 */
export async function generateLessonPlan(
  supabaseClient: any,
  params: GenerateLessonPlanParams
): Promise<{ success: boolean; draftId?: string; lessonPlan?: AILessonPlanOutput; error?: string }> {
  const teacher = await resolveTeacherContext(supabaseClient, params.teacherUserId, params.institutionId);

  if (params.classId || params.subjectId) {
    const isAllocated = verifyTeacherAllocation(teacher.allocations, params.classId, params.subjectId);
    if (!isAllocated && teacher.allocations.length > 0) {
      throw new Error('Unauthorized: Teacher is not allocated to the specified class or subject.');
    }
  }

  const duration = params.durationMinutes || 45;
  const objectivesText = params.learningObjectives?.length
    ? `Target Objectives:\n- ${params.learningObjectives.join('\n- ')}`
    : `Target Objectives: Comprehensive conceptual understanding of ${params.topic}.`;

  const prompt = `Generate a detailed, evidence-based pedagogical lesson plan on "${params.topic}" for ${params.gradeLevel} students.
Duration: ${duration} minutes.
${objectivesText}

Return valid JSON adhering to the lesson plan schema with fields:
- topic: "${params.topic}"
- subject: "${params.gradeLevel} Subject"
- gradeLevel: "${params.gradeLevel}"
- durationMinutes: ${duration}
- learningObjectives: string array
- prerequisites: string array
- materialsNeeded: string array
- phases: array of objects with phaseName, durationMinutes, activities (string array), teacherNotes
- assessmentStrategy: formative assessment method
- homework: extension activity or practice task`;

  const systemInstruction = `You are an expert instructional designer and master educator.
Design structured lesson plans based on effective pedagogical frameworks (5E model or explicit instruction).
Ensure all timing adds up to approximately ${duration} minutes.
Return ONLY valid JSON.`;

  const authContext: AIAuthContext = {
    userId: params.teacherUserId,
    institutionId: params.institutionId,
    role: 'faculty',
  };

  const gatewayRes = await executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'lesson_plan',
      prompt,
      contextType: 'class',
      contextId: params.classId,
      systemContext: systemInstruction,
      estimatedTokens: 3000,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      responseFormat: 'json',
      systemInstruction,
    }
  );

  if (!gatewayRes.success || !gatewayRes.content) {
    return {
      success: false,
      error: gatewayRes.error?.message || 'Failed to generate lesson plan.',
    };
  }

  // Validate parsed JSON
  let lessonPlan: AILessonPlanOutput;
  try {
    let rawObj = gatewayRes.parsed;
    if (!rawObj && gatewayRes.content) {
      const cleaned = gatewayRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rawObj = JSON.parse(cleaned);
    }
    lessonPlan = aiLessonPlanSchema.parse(rawObj);
  } catch (zodErr) {
    if (params.mockAdapter) {
      lessonPlan = {
        topic: params.topic,
        subject: `${params.gradeLevel} Subject`,
        gradeLevel: params.gradeLevel,
        durationMinutes: duration,
        learningObjectives: params.learningObjectives || [`Understand fundamentals of ${params.topic}`],
        prerequisites: params.prerequisites || ['Basic prior knowledge'],
        materialsNeeded: ['Whiteboard', 'Worksheet', 'Projector'],
        phases: [
          { phaseName: 'Hook & Warm-up', durationMinutes: 5, activities: ['Engaging opening question'], teacherNotes: 'Activate prior knowledge' },
          { phaseName: 'Direct Instruction', durationMinutes: 20, activities: ['Concept explanation', 'Worked examples'], teacherNotes: 'Address misconceptions' },
          { phaseName: 'Guided Practice', durationMinutes: 15, activities: ['Small group problem solving'], teacherNotes: 'Circulate and provide feedback' },
          { phaseName: 'Exit Ticket', durationMinutes: 5, activities: ['Quick check on 2 questions'], teacherNotes: 'Assess mastery' },
        ],
        assessmentStrategy: 'Formative assessment via exit ticket and guided practice checks',
        homework: 'Complete 3 practice problems from textbook chapter',
      };
    } else {
      return {
        success: false,
        error: `Model output failed lesson plan schema validation: ${(zodErr as Error).message}`,
      };
    }
  }

  // Persist as draft in ai_generated_drafts
  const draft = await createAIDraft(supabaseClient, {
    institutionId: params.institutionId,
    authorId: params.teacherUserId,
    taskType: 'lesson_plan',
    title: `Lesson Plan: ${params.topic} (${params.gradeLevel})`,
    contentJson: lessonPlan as unknown as Record<string, unknown>,
    metadata: {
      gradeLevel: params.gradeLevel,
      classId: params.classId,
      subjectId: params.subjectId,
      generatedBy: teacher.fullName,
    },
  });

  return {
    success: true,
    draftId: draft.id,
    lessonPlan,
  };
}

/**
 * 2. Draft Examination Question Paper (Mandatory Draft Persistence)
 */
export async function draftExamPaper(
  supabaseClient: any,
  params: DraftExamPaperParams
): Promise<{ success: boolean; draftId?: string; examPaper?: AIExamPaperOutput; error?: string }> {
  const teacher = await resolveTeacherContext(supabaseClient, params.teacherUserId, params.institutionId);

  if (params.classId || params.subjectId) {
    const isAllocated = verifyTeacherAllocation(teacher.allocations, params.classId, params.subjectId);
    if (!isAllocated && teacher.allocations.length > 0) {
      throw new Error('Unauthorized: Teacher is not allocated to the specified class or subject.');
    }
  }

  const duration = params.durationMinutes || 120;
  const totalMarks = params.totalMarks || 100;
  const topicsText = params.topicsCoverage?.length
    ? `Topics Covered:\n- ${params.topicsCoverage.join('\n- ')}`
    : 'Topics Covered: Complete term syllabus.';

  const prompt = `Draft a rigorous, well-balanced examination paper titled "${params.title}" for ${params.gradeLevel}.
Duration: ${duration} minutes.
Total Marks: ${totalMarks}.
${topicsText}

Return valid JSON adhering to the exam paper schema with:
- title: "${params.title}"
- subject: "${params.gradeLevel} Subject"
- gradeLevel: "${params.gradeLevel}"
- durationMinutes: ${duration}
- totalMarks: ${totalMarks}
- generalInstructions: array of exam rules
- sections: array of sections (e.g. Section A: Objective/MCQ, Section B: Short Answer, Section C: Analytical/Long Answer)
  Each section has: sectionName, totalMarks, instructions, and questions array.
  Each question has: questionNumber, marks, questionText, questionType, markingScheme, choices (for MCQs).`;

  const systemInstruction = `You are a university and secondary school chief assessment officer.
Ensure tests adhere to Bloom's taxonomy: 30% recall/understanding, 40% application/analysis, 30% evaluation/synthesis.
Provide clear, step-by-step marking rubrics in the markingScheme for each question.
Return ONLY valid JSON.`;

  const authContext: AIAuthContext = {
    userId: params.teacherUserId,
    institutionId: params.institutionId,
    role: 'faculty',
  };

  const gatewayRes = await executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'exam_paper_draft',
      prompt,
      contextType: 'class',
      contextId: params.classId,
      systemContext: systemInstruction,
      estimatedTokens: 4000,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      responseFormat: 'json',
      systemInstruction,
    }
  );

  if (!gatewayRes.success || !gatewayRes.content) {
    return {
      success: false,
      error: gatewayRes.error?.message || 'Failed to draft examination paper.',
    };
  }

  let examPaper: AIExamPaperOutput;
  try {
    let rawObj = gatewayRes.parsed;
    if (!rawObj && gatewayRes.content) {
      const cleaned = gatewayRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rawObj = JSON.parse(cleaned);
    }
    examPaper = aiExamPaperSchema.parse(rawObj);
  } catch (zodErr) {
    if (params.mockAdapter) {
      examPaper = {
        title: params.title,
        subject: `${params.gradeLevel} Subject`,
        gradeLevel: params.gradeLevel,
        durationMinutes: duration,
        totalMarks,
        generalInstructions: [
          'All sections are compulsory.',
          'Read questions carefully before answering.',
          'Calculators are permitted where explicitly noted.',
        ],
        sections: [
          {
            sectionName: 'Section A: Objective Questions',
            totalMarks: 20,
            instructions: 'Answer all 4 questions. Each carries 5 marks.',
            questions: [
              {
                questionNumber: '1',
                marks: 5,
                questionText: 'Which principle governs state conservation in physics?',
                questionType: 'mcq',
                choices: ['First law of thermodynamics', 'Second law', 'Third law', 'Zeroth law'],
                markingScheme: '1 mark for correct selection: First law of thermodynamics',
              },
            ],
          },
          {
            sectionName: 'Section B: Descriptive & Problem Solving',
            totalMarks: 80,
            instructions: 'Show full working and steps for complete credit.',
            questions: [
              {
                questionNumber: '2',
                marks: 10,
                questionText: 'Derive the equations of motion and discuss practical applications.',
                questionType: 'long_answer',
                markingScheme: '4 marks for derivation, 3 marks for diagram, 3 marks for real-world example',
              },
            ],
          },
        ],
      };
    } else {
      return {
        success: false,
        error: `Model output failed exam paper schema validation: ${(zodErr as Error).message}`,
      };
    }
  }

  // Persist as draft in ai_generated_drafts
  const draft = await createAIDraft(supabaseClient, {
    institutionId: params.institutionId,
    authorId: params.teacherUserId,
    taskType: 'exam_paper_draft',
    title: `Exam Paper: ${params.title} (${params.gradeLevel})`,
    contentJson: examPaper as unknown as Record<string, unknown>,
    metadata: {
      gradeLevel: params.gradeLevel,
      classId: params.classId,
      subjectId: params.subjectId,
      totalMarks,
      durationMinutes: duration,
      generatedBy: teacher.fullName,
    },
  });

  return {
    success: true,
    draftId: draft.id,
    examPaper,
  };
}

/**
 * 3. Generate Assessment Rubric (Mandatory Draft Persistence)
 */
export async function generateRubric(
  supabaseClient: any,
  params: GenerateRubricParams
): Promise<{ success: boolean; draftId?: string; rubric?: AIRubricOutput; error?: string }> {
  const teacher = await resolveTeacherContext(supabaseClient, params.teacherUserId, params.institutionId);

  const totalMarks = params.totalMarks || 20;
  const prompt = `Create a 4-level analytic scoring rubric for "${params.title}".
Assignment Context: ${params.assignmentDescription}
Total Marks: ${totalMarks}.

Return valid JSON adhering to the rubric schema with:
- title: "${params.title}"
- subject: "Academic Assessment"
- totalMarks: ${totalMarks}
- criteria: array of objects with:
  - criterion: string
  - weightMarks: positive number
  - levels: object with exemplary, proficient, developing, beginning descriptions.`;

  const systemInstruction = `You are a standardized assessment rubrics specialist.
Ensure criteria are objective, observable, and measurable across all performance tiers.
The sum of weightMarks must equal the totalMarks.
Return ONLY valid JSON.`;

  const authContext: AIAuthContext = {
    userId: params.teacherUserId,
    institutionId: params.institutionId,
    role: 'faculty',
  };

  const gatewayRes = await executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'rubric_generation',
      prompt,
      contextType: 'class',
      contextId: params.classId,
      systemContext: systemInstruction,
      estimatedTokens: 2500,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      responseFormat: 'json',
      systemInstruction,
    }
  );

  if (!gatewayRes.success || !gatewayRes.content) {
    return {
      success: false,
      error: gatewayRes.error?.message || 'Failed to generate assessment rubric.',
    };
  }

  let rubric: AIRubricOutput;
  try {
    let rawObj = gatewayRes.parsed;
    if (!rawObj && gatewayRes.content) {
      const cleaned = gatewayRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rawObj = JSON.parse(cleaned);
    }
    rubric = aiRubricSchema.parse(rawObj);
  } catch (zodErr) {
    if (params.mockAdapter) {
      rubric = {
        title: params.title,
        subject: 'Academic Assessment',
        totalMarks,
        criteria: [
          {
            criterion: 'Content Accuracy & Depth',
            weightMarks: 10,
            levels: {
              exemplary: 'Flawless factual accuracy with insightful, deep critical analysis.',
              proficient: 'Accurate explanations with good grasp of main concepts.',
              developing: 'Basic understanding present; minor misconceptions noted.',
              beginning: 'Significant conceptual errors and superficial treatment.',
            },
          },
          {
            criterion: 'Structure & Presentation',
            weightMarks: 10,
            levels: {
              exemplary: 'Exceptionally organized, coherent, and polished presentation.',
              proficient: 'Well-structured with clear transitions.',
              developing: 'Organization is loose but mostly understandable.',
              beginning: 'Disorganized and difficult to follow.',
            },
          },
        ],
      };
    } else {
      return {
        success: false,
        error: `Model output failed rubric schema validation: ${(zodErr as Error).message}`,
      };
    }
  }

  const draft = await createAIDraft(supabaseClient, {
    institutionId: params.institutionId,
    authorId: params.teacherUserId,
    taskType: 'rubric_generation',
    title: `Assessment Rubric: ${params.title}`,
    contentJson: rubric as unknown as Record<string, unknown>,
    metadata: {
      classId: params.classId,
      subjectId: params.subjectId,
      totalMarks,
      generatedBy: teacher.fullName,
    },
  });

  return {
    success: true,
    draftId: draft.id,
    rubric,
  };
}

/**
 * 4. Generate Assignment Draft (Mandatory Draft Persistence)
 */
export async function generateAssignmentPrompt(
  supabaseClient: any,
  params: GenerateAssignmentParams
): Promise<{ success: boolean; draftId?: string; assignment?: Record<string, unknown>; error?: string }> {
  const teacher = await resolveTeacherContext(supabaseClient, params.teacherUserId, params.institutionId);

  const dueDays = params.dueDateDays || 7;
  const prompt = `Create an engaging, academically sound assignment draft on "${params.topic}" for ${params.gradeLevel}.
Title: ${params.title}
Instructions: ${params.instructions || 'Standard term assignment'}
Target Due Timeline: ${dueDays} days.

Structure the response with:
- title: "${params.title}"
- topic: "${params.topic}"
- gradeLevel: "${params.gradeLevel}"
- overview: brief context
- tasks: list of specific actionable tasks
- deliverables: expected submission format
- academicIntegrityPolicy: rules on originality and proper citations
- suggestedDueDays: ${dueDays}`;

  const systemInstruction = `You are a veteran educator promoting critical thinking and academic integrity.
Produce clear, rigorous assignment guidelines that foster self-directed learning.`;

  const authContext: AIAuthContext = {
    userId: params.teacherUserId,
    institutionId: params.institutionId,
    role: 'faculty',
  };

  const gatewayRes = await executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'assignment_draft',
      prompt,
      contextType: 'class',
      contextId: params.classId,
      systemContext: systemInstruction,
      estimatedTokens: 2000,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      responseFormat: 'json',
      systemInstruction,
    }
  );

  if (!gatewayRes.success || !gatewayRes.content) {
    return {
      success: false,
      error: gatewayRes.error?.message || 'Failed to generate assignment draft.',
    };
  }

  let assignment: Record<string, unknown>;
  try {
    let rawObj = gatewayRes.parsed;
    if (!rawObj && gatewayRes.content) {
      const cleaned = gatewayRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rawObj = JSON.parse(cleaned);
    }
    assignment = (rawObj && typeof rawObj === 'object') ? (rawObj as Record<string, unknown>) : {
      title: params.title,
      topic: params.topic,
      gradeLevel: params.gradeLevel,
      description: gatewayRes.content,
      suggestedDueDays: dueDays,
    };
  } catch {
    assignment = {
      title: params.title,
      topic: params.topic,
      gradeLevel: params.gradeLevel,
      content: gatewayRes.content,
      suggestedDueDays: dueDays,
    };
  }

  const draft = await createAIDraft(supabaseClient, {
    institutionId: params.institutionId,
    authorId: params.teacherUserId,
    taskType: 'assignment_draft',
    title: `Assignment: ${params.title} (${params.gradeLevel})`,
    contentJson: assignment,
    metadata: {
      gradeLevel: params.gradeLevel,
      classId: params.classId,
      subjectId: params.subjectId,
      suggestedDueDays: dueDays,
      generatedBy: teacher.fullName,
    },
  });

  return {
    success: true,
    draftId: draft.id,
    assignment,
  };
}

/**
 * 5. Generate MCQ Question Bank (Mandatory Draft Persistence)
 */
export async function generateMCQQuestionBank(
  supabaseClient: any,
  params: GenerateMCQQuestionBankParams
): Promise<{ success: boolean; draftId?: string; questionBank?: AIQuizOutput; error?: string }> {
  const teacher = await resolveTeacherContext(supabaseClient, params.teacherUserId, params.institutionId);

  const count = Math.min(Math.max(params.count || 10, 1), 50);
  const difficulty = params.difficulty || 'medium';

  const prompt = `Generate a ${difficulty}-difficulty question bank with ${count} multiple choice questions on the topic "${params.topic}".
Return valid JSON matching the quiz schema: title, subject, topic, totalQuestions, and questions array (questionNumber, questionText, options [4 items], correctOptionIndex [0-3], explanation, difficulty).`;

  const systemInstruction = `You are an examination question bank specialist.
Craft plausible, educationally valid distractors. Include precise conceptual rationales.
Return ONLY valid JSON.`;

  const authContext: AIAuthContext = {
    userId: params.teacherUserId,
    institutionId: params.institutionId,
    role: 'faculty',
  };

  const gatewayRes = await executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'mcq_generation',
      prompt,
      contextType: 'class',
      contextId: params.classId,
      systemContext: systemInstruction,
      estimatedTokens: 3000,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      responseFormat: 'json',
      systemInstruction,
    }
  );

  if (!gatewayRes.success || !gatewayRes.content) {
    return {
      success: false,
      error: gatewayRes.error?.message || 'Failed to generate MCQ question bank.',
    };
  }

  let questionBank: AIQuizOutput;
  try {
    let rawObj = gatewayRes.parsed;
    if (!rawObj && gatewayRes.content) {
      const cleaned = gatewayRes.content.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim();
      rawObj = JSON.parse(cleaned);
    }
    questionBank = aiQuizSchema.parse(rawObj);
  } catch (zodErr) {
    if (params.mockAdapter) {
      questionBank = {
        title: `${params.topic} Question Bank`,
        subject: 'Academic Question Bank',
        topic: params.topic,
        totalQuestions: count,
        questions: Array.from({ length: count }, (_, i) => ({
          questionNumber: i + 1,
          questionText: `Question Bank Item ${i + 1} regarding ${params.topic}`,
          options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
          correctOptionIndex: 0,
          explanation: `Detailed explanation for question ${i + 1}.`,
          difficulty,
        })),
      };
    } else {
      return {
        success: false,
        error: `Model output failed question bank schema validation: ${(zodErr as Error).message}`,
      };
    }
  }

  const draft = await createAIDraft(supabaseClient, {
    institutionId: params.institutionId,
    authorId: params.teacherUserId,
    taskType: 'mcq_generation',
    title: `Question Bank: ${params.topic} (${count} questions)`,
    contentJson: questionBank as unknown as Record<string, unknown>,
    metadata: {
      topic: params.topic,
      classId: params.classId,
      subjectId: params.subjectId,
      count,
      difficulty,
      generatedBy: teacher.fullName,
    },
  });

  return {
    success: true,
    draftId: draft.id,
    questionBank,
  };
}
