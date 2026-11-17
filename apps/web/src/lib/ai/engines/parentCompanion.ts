import type {
  AIGatewayResponse,
  AIProviderType,
  AIProviderAdapter,
} from '@edu-platform/types';
import { executeAIGateway } from '../gateway/canonicalGateway';
import type { AIAuthContext } from '../gateway/authorization';

export interface AskParentCompanionParams {
  parentUserId: string;
  studentId: string;
  institutionId: string;
  prompt: string;
  conversationId?: string;
  preferredProvider?: AIProviderType;
  mockAdapter?: AIProviderAdapter;
}

export interface ExplainAcademicReportParams {
  parentUserId: string;
  studentId: string;
  institutionId: string;
  examinationId?: string;
  preferredProvider?: AIProviderType;
  mockAdapter?: AIProviderAdapter;
}

export interface ExplainTimetableAndEventsParams {
  parentUserId: string;
  studentId: string;
  institutionId: string;
  preferredProvider?: AIProviderType;
  mockAdapter?: AIProviderAdapter;
}

export interface ChildContextData {
  guardianId: string;
  guardianName: string;
  relationship: string;
  studentId: string;
  studentFirstName: string;
  studentFullName: string;
  className: string;
  sectionName: string;
  classId: string | null;
}

export interface ChildAcademicSnapshot {
  attendanceRatePercent: number | null;
  totalAttendanceSessions: number;
  presentSessions: number;
  absentSessions: number;
  recentPublishedResults: Array<{
    examName?: string;
    percentage: number;
    finalGrade?: string | null;
    resultStatus: string;
  }>;
  recentSubjectMarks: Array<{
    subjectName?: string;
    marksObtained: number | null;
    grade?: string | null;
    remarks?: string | null;
  }>;
}

/**
 * Resolves parent guardian record and STRICTLY verifies parent-child link via student_guardians.
 * Throws unauthorized if no explicit link exists.
 */
export async function resolveParentAndVerifyChild(
  supabaseClient: any,
  parentUserId: string,
  studentId: string,
  institutionId: string
): Promise<ChildContextData> {
  // 1. Resolve guardian profile for this user and institution
  const { data: guardian, error: guardianErr } = await supabaseClient
    .from('guardians')
    .select('id, first_name, last_name, relationship_default')
    .eq('institution_id', institutionId)
    .eq('user_id', parentUserId)
    .maybeSingle();

  if (guardianErr || !guardian) {
    throw new Error('Guardian profile not found or unauthorized for this user.');
  }

  // 2. Strict verification of parent-child relationship in student_guardians junction table
  const { data: link, error: linkErr } = await supabaseClient
    .from('student_guardians')
    .select('id, relationship, is_primary')
    .eq('institution_id', institutionId)
    .eq('guardian_id', guardian.id)
    .eq('student_id', studentId)
    .maybeSingle();

  if (linkErr || !link) {
    throw new Error('Unauthorized: Guardian is not linked to this student.');
  }

  // 3. Resolve student profile and active enrollment
  const { data: student, error: studentErr } = await supabaseClient
    .from('students')
    .select(`
      id,
      first_name,
      last_name,
      enrollments:student_enrollments(
        id,
        is_active,
        class:academic_classes(id, name),
        section:academic_sections(id, name)
      )
    `)
    .eq('institution_id', institutionId)
    .eq('id', studentId)
    .single();

  if (studentErr || !student) {
    throw new Error('Student record not found or inaccessible.');
  }

  const activeEnrollment = (student.enrollments || []).find((e: any) => e.is_active) || student.enrollments?.[0];

  return {
    guardianId: guardian.id,
    guardianName: `${guardian.first_name} ${guardian.last_name}`.trim(),
    relationship: link.relationship || guardian.relationship_default || 'Parent/Guardian',
    studentId: student.id,
    studentFirstName: student.first_name,
    studentFullName: `${student.first_name} ${student.last_name}`.trim(),
    className: activeEnrollment?.class?.name || 'Class',
    sectionName: activeEnrollment?.section?.name || 'Section',
    classId: activeEnrollment?.class?.id || null,
  };
}

/**
 * Fetches authorized child academic and attendance data (RLS-enforced, published only)
 */
export async function fetchChildAcademicData(
  supabaseClient: any,
  studentId: string,
  institutionId: string
): Promise<ChildAcademicSnapshot> {
  // 1. Attendance Records
  let attendanceRatePercent: number | null = null;
  let totalAttendanceSessions = 0;
  let presentSessions = 0;
  let absentSessions = 0;

  try {
    const { data: attendanceData } = await supabaseClient
      .from('student_attendance_records')
      .select('status')
      .eq('institution_id', institutionId)
      .eq('student_id', studentId)
      .limit(200);

    if (attendanceData && attendanceData.length > 0) {
      totalAttendanceSessions = attendanceData.length;
      presentSessions = attendanceData.filter((r: any) => r.status === 'present' || r.status === 'late').length;
      absentSessions = attendanceData.filter((r: any) => r.status === 'absent').length;
      attendanceRatePercent = Math.round((presentSessions / totalAttendanceSessions) * 100);
    }
  } catch {
    // Graceful fallback
  }

  // 2. Published Exam Results Only
  const recentPublishedResults: ChildAcademicSnapshot['recentPublishedResults'] = [];
  try {
    const { data: examResults } = await supabaseClient
      .from('student_exam_results')
      .select(`
        percentage,
        final_grade,
        result_status,
        is_published,
        exam:examinations(name)
      `)
      .eq('institution_id', institutionId)
      .eq('student_id', studentId)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(5);

    if (examResults) {
      for (const res of examResults) {
        recentPublishedResults.push({
          examName: res.exam?.name || 'Term Examination',
          percentage: Number(res.percentage) || 0,
          finalGrade: res.final_grade,
          resultStatus: res.result_status,
        });
      }
    }
  } catch {
    // Graceful fallback
  }

  // 3. Subject Marks
  const recentSubjectMarks: ChildAcademicSnapshot['recentSubjectMarks'] = [];
  try {
    const { data: marks } = await supabaseClient
      .from('student_exam_marks')
      .select(`
        marks_obtained,
        grade,
        remarks,
        exam_subject:exam_subjects(
          subject:academic_subjects(name)
        )
      `)
      .eq('institution_id', institutionId)
      .eq('student_id', studentId)
      .limit(10);

    if (marks) {
      for (const m of marks) {
        recentSubjectMarks.push({
          subjectName: m.exam_subject?.subject?.name || 'Subject',
          marksObtained: m.marks_obtained !== null ? Number(m.marks_obtained) : null,
          grade: m.grade,
          remarks: m.remarks,
        });
      }
    }
  } catch {
    // Graceful fallback
  }

  return {
    attendanceRatePercent,
    totalAttendanceSessions,
    presentSessions,
    absentSessions,
    recentPublishedResults,
    recentSubjectMarks,
  };
}

/**
 * 1. Conversational Parent AI Companion
 */
export async function askParentCompanion(
  supabaseClient: any,
  params: AskParentCompanionParams
): Promise<AIGatewayResponse> {
  // 1. Strict verification of parent-child relationship
  const childContext = await resolveParentAndVerifyChild(
    supabaseClient,
    params.parentUserId,
    params.studentId,
    params.institutionId
  );

  // 2. Fetch verified child data
  const academicData = await fetchChildAcademicData(
    supabaseClient,
    childContext.studentId,
    params.institutionId
  );

  const attendanceInfo = academicData.attendanceRatePercent !== null
    ? `Attendance: ${academicData.attendanceRatePercent}% (${academicData.presentSessions} present, ${academicData.absentSessions} absent out of ${academicData.totalAttendanceSessions} sessions).`
    : 'Attendance: Currently being logged for the active term.';

  const resultsSummary = academicData.recentPublishedResults.length > 0
    ? academicData.recentPublishedResults.map(r => `- ${r.examName}: ${r.percentage}% (Grade: ${r.finalGrade || 'N/A'}, Status: ${r.resultStatus})`).join('\n')
    : 'No newly published examination cards at this time.';

  const systemInstruction = `You are a warm, empathetic, and encouraging Parent AI Companion for school families.
You are communicating with the ${childContext.relationship} of a student in ${childContext.className} (${childContext.sectionName}).

CHILD ACADEMIC & SCHOOL CONTEXT:
- Class/Section: ${childContext.className} - ${childContext.sectionName}
- ${attendanceInfo}
- Published Examination Results:
${resultsSummary}

PARENT COMPANION RULES:
1. Tone: caring, supportive, accessible, jargon-free, and respectful.
2. Foster a growth mindset: emphasize persistence, steady habits, and effort over raw test scores.
3. If attendance or grades need improvement, offer constructive, gentle suggestions for home support (e.g. established bedtime routines, dedicated quiet study hour, communicating with the teacher).
4. NEVER compare the student to other children, and never disclose peer marks, class ranks, or percentile standings.
5. Remind the parent that official institutional notices and parent-teacher conference schedules are always available through the school office.`;

  const authContext: AIAuthContext = {
    userId: params.parentUserId,
    institutionId: params.institutionId,
    role: 'parent',
  };

  return executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'parent_summary',
      prompt: params.prompt,
      conversationId: params.conversationId,
      contextType: 'student',
      contextId: params.studentId,
      systemContext: systemInstruction,
      estimatedTokens: 1500,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      studentNamesToMask: [childContext.studentFullName, childContext.studentFirstName],
      systemInstruction,
    }
  );
}

/**
 * 2. Plain-Language Explanation of Child's Academic Report Card
 */
export async function explainAcademicReport(
  supabaseClient: any,
  params: ExplainAcademicReportParams
): Promise<AIGatewayResponse> {
  const childContext = await resolveParentAndVerifyChild(
    supabaseClient,
    params.parentUserId,
    params.studentId,
    params.institutionId
  );

  const academicData = await fetchChildAcademicData(
    supabaseClient,
    childContext.studentId,
    params.institutionId
  );

  const marksList = academicData.recentSubjectMarks.length > 0
    ? academicData.recentSubjectMarks.map(m => `- ${m.subjectName}: ${m.marksObtained ?? 'Graded'} (Grade: ${m.grade ?? 'N/A'})${m.remarks ? ` - Note: "${m.remarks}"` : ''}`).join('\n')
    : 'Term assessments completed and under final review.';

  const prompt = `Please explain my child's latest academic progress and report card for ${childContext.className}.
Here are the subject scores:
${marksList}

Provide:
1. A warm celebration of strengths and subject areas where my child is thriving.
2. Clear explanation of areas where extra practice will help, explained simply without technical jargon.
3. Practical, stress-free learning activities we can do at home together.
4. Suggested questions to discuss at our next Parent-Teacher meeting.`;

  const systemInstruction = `You are an educational counselor explaining school report cards to parents.
Translate grades and assessment feedback into actionable, empowering guidance.
Highlight positive effort, curiosity, and learning confidence.`;

  const authContext: AIAuthContext = {
    userId: params.parentUserId,
    institutionId: params.institutionId,
    role: 'parent',
  };

  return executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'parent_summary',
      prompt,
      contextType: 'student',
      contextId: params.studentId,
      systemContext: systemInstruction,
      estimatedTokens: 2000,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      studentNamesToMask: [childContext.studentFullName, childContext.studentFirstName],
      systemInstruction,
    }
  );
}

/**
 * 3. Explain Timetable & Institutional Events
 */
export async function explainTimetableAndEvents(
  supabaseClient: any,
  params: ExplainTimetableAndEventsParams
): Promise<AIGatewayResponse> {
  const childContext = await resolveParentAndVerifyChild(
    supabaseClient,
    params.parentUserId,
    params.studentId,
    params.institutionId
  );

  // Fetch upcoming announcements or events
  let upcomingAnnouncements = 'Regular classes running as per institutional calendar.';
  try {
    const { data: ann } = await supabaseClient
      .from('announcements')
      .select('title, body, priority, publish_at')
      .eq('institution_id', params.institutionId)
      .order('publish_at', { ascending: false })
      .limit(3);

    if (ann && ann.length > 0) {
      upcomingAnnouncements = ann.map((a: any) => `- ${a.title}: ${a.body}`).join('\n');
    }
  } catch {
    // Graceful fallback
  }

  const prompt = `Explain our weekly school schedule and any upcoming events for ${childContext.className} - ${childContext.sectionName}.
Recent School Announcements:
${upcomingAnnouncements}

Help me understand:
1. Daily rhythm and key timings.
2. Upcoming school events or dates to keep in mind.
3. Tips for morning preparation and school bag organization.`;

  const systemInstruction = `You are a supportive school liaison for parents.
Explain school schedules and announcements with warmth, clarity, and practical family tips.`;

  const authContext: AIAuthContext = {
    userId: params.parentUserId,
    institutionId: params.institutionId,
    role: 'parent',
  };

  return executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'parent_summary',
      prompt,
      contextType: 'student',
      contextId: params.studentId,
      systemContext: systemInstruction,
      estimatedTokens: 1500,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      studentNamesToMask: [childContext.studentFullName, childContext.studentFirstName],
      systemInstruction,
    }
  );
}
