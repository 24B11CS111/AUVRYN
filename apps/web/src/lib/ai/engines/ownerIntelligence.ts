import type {
  AIGatewayResponse,
  AIProviderType,
  AIProviderAdapter,
  Role,
} from '@edu-platform/types';
import { executeAIGateway } from '../gateway/canonicalGateway';
import type { AIAuthContext } from '../gateway/authorization';
import { createAIDraft } from '../gateway/draftManager';

export interface AskOwnerIntelligenceParams {
  userId: string;
  institutionId: string;
  prompt: string;
  conversationId?: string;
  preferredProvider?: AIProviderType;
  mockAdapter?: AIProviderAdapter;
}

export interface GenerateExecutiveReportParams {
  userId: string;
  institutionId: string;
  reportType: 'monthly_operations' | 'fee_collection_analysis' | 'attendance_retention_review' | 'term_performance';
  reportingPeriod?: string;
  preferredProvider?: AIProviderType;
  mockAdapter?: AIProviderAdapter;
}

export interface InstitutionalMetricsSummary {
  institutionName: string;
  totalStudents: number;
  totalStaff: number;
  totalClasses: number;
  attendanceRatePercent: number | null;
  totalAttendanceRecords: number;
  totalFeeAssigned: number;
  totalFeeCollected: number;
  feeCollectionRatePercent: number | null;
  pendingFeeAmount: number;
}

/**
 * Resolves owner/admin context and verifies institutional executive privileges
 */
export async function resolveOwnerContext(
  supabaseClient: any,
  userId: string,
  institutionId: string
) {
  // 1. Verify active membership with executive permissions
  const { data: membership, error: memberErr } = await supabaseClient
    .from('institution_memberships')
    .select('id, role, permissions, status')
    .eq('institution_id', institutionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (memberErr || !membership) {
    throw new Error('Institutional membership not found or unauthorized for this user.');
  }

  if (membership.status !== 'active') {
    throw new Error(`Institutional membership status is "${membership.status}". Only active members can access intelligence.`);
  }

  const role = membership.role as Role;
  const isExecutive = ['owner', 'admin', 'academic_admin'].includes(role) ||
    (membership.permissions || []).includes('ai:analytics');

  if (!isExecutive) {
    throw new Error(`Unauthorized: Role "${role}" does not have executive institutional analytics privileges.`);
  }

  // 2. Fetch institution name
  const { data: inst } = await supabaseClient
    .from('institutions')
    .select('name')
    .eq('id', institutionId)
    .maybeSingle();

  return {
    membershipId: membership.id,
    role,
    institutionName: inst?.name || 'Educational Institution',
  };
}

/**
 * Gathers aggregate operational metrics across departments, students, staff, attendance, and fees
 * without exposing individual student or staff personal identities.
 */
export async function fetchAggregatedInstitutionalMetrics(
  supabaseClient: any,
  institutionId: string,
  institutionName: string
): Promise<InstitutionalMetricsSummary> {
  // 1. Total Active Students
  let totalStudents = 0;
  try {
    const { count } = await supabaseClient
      .from('students')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('status', 'active');
    totalStudents = count || 0;
  } catch {
    totalStudents = 0;
  }

  // 2. Total Active Staff
  let totalStaff = 0;
  try {
    const { count } = await supabaseClient
      .from('staff_profiles')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId)
      .eq('employment_status', 'active');
    totalStaff = count || 0;
  } catch {
    totalStaff = 0;
  }

  // 3. Total Academic Classes
  let totalClasses = 0;
  try {
    const { count } = await supabaseClient
      .from('academic_classes')
      .select('id', { count: 'exact', head: true })
      .eq('institution_id', institutionId);
    totalClasses = count || 0;
  } catch {
    totalClasses = 0;
  }

  // 4. Attendance Summary
  let attendanceRatePercent: number | null = null;
  let totalAttendanceRecords = 0;
  try {
    const { data: attendanceData } = await supabaseClient
      .from('student_attendance_records')
      .select('status')
      .eq('institution_id', institutionId)
      .limit(500);

    if (attendanceData && attendanceData.length > 0) {
      totalAttendanceRecords = attendanceData.length;
      const presentCount = attendanceData.filter((r: any) => r.status === 'present' || r.status === 'late').length;
      attendanceRatePercent = Math.round((presentCount / totalAttendanceRecords) * 100);
    }
  } catch {
    attendanceRatePercent = null;
  }

  // 5. Fee Summary
  let totalFeeAssigned = 0;
  let totalFeeCollected = 0;
  let pendingFeeAmount = 0;
  let feeCollectionRatePercent: number | null = null;
  try {
    const { data: feeData } = await supabaseClient
      .from('student_fee_assignments')
      .select('amount, paid_amount')
      .eq('institution_id', institutionId)
      .limit(500);

    if (feeData && feeData.length > 0) {
      for (const row of feeData) {
        const amt = Number(row.amount) || 0;
        const paid = Number(row.paid_amount) || 0;
        totalFeeAssigned += amt;
        totalFeeCollected += paid;
      }
      pendingFeeAmount = Math.max(0, totalFeeAssigned - totalFeeCollected);
      if (totalFeeAssigned > 0) {
        feeCollectionRatePercent = Math.round((totalFeeCollected / totalFeeAssigned) * 100);
      }
    }
  } catch {
    // Graceful fallback if table is empty or unpopulated
  }

  return {
    institutionName,
    totalStudents,
    totalStaff,
    totalClasses,
    attendanceRatePercent,
    totalAttendanceRecords,
    totalFeeAssigned,
    totalFeeCollected,
    feeCollectionRatePercent,
    pendingFeeAmount,
  };
}

/**
 * 1. Ask Owner Intelligence: Natural-language queries over verified institutional metrics
 */
export async function askOwnerIntelligence(
  supabaseClient: any,
  params: AskOwnerIntelligenceParams
): Promise<AIGatewayResponse> {
  // 1. Verify owner authorization
  const ownerContext = await resolveOwnerContext(
    supabaseClient,
    params.userId,
    params.institutionId
  );

  // 2. Fetch live aggregate metrics
  const metrics = await fetchAggregatedInstitutionalMetrics(
    supabaseClient,
    params.institutionId,
    ownerContext.institutionName
  );

  const metricsBlock = `
INSTITUTION OPERATIONAL METRICS (AGGREGATED & VERIFIED):
- Institution Name: ${metrics.institutionName}
- Total Active Students: ${metrics.totalStudents}
- Total Active Faculty & Staff: ${metrics.totalStaff}
- Total Classes: ${metrics.totalClasses}
- Overall Attendance Rate: ${metrics.attendanceRatePercent !== null ? `${metrics.attendanceRatePercent}% (based on ${metrics.totalAttendanceRecords} records)` : 'No recent attendance logged'}
- Total Fees Assigned: \$${metrics.totalFeeAssigned.toLocaleString()}
- Total Fees Collected: \$${metrics.totalFeeCollected.toLocaleString()}
- Collection Rate: ${metrics.feeCollectionRatePercent !== null ? `${metrics.feeCollectionRatePercent}%` : 'N/A'}
- Outstanding Fee Balance: \$${metrics.pendingFeeAmount.toLocaleString()}`;

  const systemInstruction = `You are an elite educational executive advisor and CFO/COO intelligence assistant to the institution owner and leadership board.
${metricsBlock}

ANALYTICS & GOVERNANCE RULES:
1. Base all quantitative observations on the verified operational telemetry provided above.
2. Structure your insights for executive leadership:
   - Executive Summary
   - Operational Health & Attendance Trends
   - Financial & Revenue Risk Analysis
   - Strategic & Resource Allocation Recommendations
3. Tone: professional, authoritative, objective, strategic, and constructive.
4. Protect privacy: Never hypothesize or invent individual student/staff personal details.`;

  const authContext: AIAuthContext = {
    userId: params.userId,
    institutionId: params.institutionId,
    role: ownerContext.role,
  };

  return executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'owner_analytics',
      prompt: params.prompt,
      conversationId: params.conversationId,
      systemContext: systemInstruction,
      estimatedTokens: 2500,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      systemInstruction,
    }
  );
}

/**
 * 2. Generate Executive Institutional Report (Mandatory Draft Persistence)
 */
export async function generateExecutiveReport(
  supabaseClient: any,
  params: GenerateExecutiveReportParams
): Promise<{ success: boolean; draftId?: string; reportTitle?: string; reportContent?: string; error?: string }> {
  const ownerContext = await resolveOwnerContext(
    supabaseClient,
    params.userId,
    params.institutionId
  );

  const metrics = await fetchAggregatedInstitutionalMetrics(
    supabaseClient,
    params.institutionId,
    ownerContext.institutionName
  );

  const period = params.reportingPeriod || 'Current Academic Cycle';
  const reportTitles: Record<string, string> = {
    monthly_operations: `Monthly Operational & Leadership Review (${period})`,
    fee_collection_analysis: `Comprehensive Fee Collection & Revenue Health Report (${period})`,
    attendance_retention_review: `Institutional Attendance, Absenteeism & Retention Analysis (${period})`,
    term_performance: `Term Academic Governance & Institutional Performance Review (${period})`,
  };

  const title = reportTitles[params.reportType] || `Executive Institutional Report (${period})`;

  const prompt = `Draft a formal, comprehensive executive report titled "${title}" for the Board of Trustees and Executive Leadership of ${ownerContext.institutionName}.
Reporting Period: ${period}

Include these sections:
1. Executive Summary & Core KPIs
2. Enrollment & Staffing Capacity Analysis
3. Academic Attendance & Student Engagement Review
4. Fee Realization, Cash Flow Risks & Receivables Aging
5. Key Operational Bottlenecks & Mitigations
6. Board-Level Strategic Action Items for Next Period.`;

  const systemInstruction = `You are a chief institutional strategist.
Generate an exhaustive, highly structured institutional governance report.
Use clear headings, bullet points, and percentage indicators based on:
- Active Students: ${metrics.totalStudents}
- Active Staff: ${metrics.totalStaff}
- Attendance Rate: ${metrics.attendanceRatePercent ?? 'N/A'}%
- Total Fees: \$${metrics.totalFeeAssigned} | Collected: \$${metrics.totalFeeCollected} | Balance: \$${metrics.pendingFeeAmount}`;

  const authContext: AIAuthContext = {
    userId: params.userId,
    institutionId: params.institutionId,
    role: ownerContext.role,
  };

  const gatewayRes = await executeAIGateway(
    supabaseClient,
    {
      institutionId: params.institutionId,
      taskType: 'report_generation',
      prompt,
      systemContext: systemInstruction,
      estimatedTokens: 3500,
    },
    authContext,
    {
      preferredProvider: params.preferredProvider,
      mockAdapter: params.mockAdapter,
      systemInstruction,
    }
  );

  if (!gatewayRes.success || !gatewayRes.content) {
    return {
      success: false,
      error: gatewayRes.error?.message || 'Failed to generate executive report.',
    };
  }

  const reportContent = gatewayRes.content;

  // Persist report as draft in ai_generated_drafts
  const draft = await createAIDraft(supabaseClient, {
    institutionId: params.institutionId,
    authorId: params.userId,
    taskType: 'report_generation',
    title,
    contentJson: {
      reportType: params.reportType,
      reportingPeriod: period,
      institutionName: ownerContext.institutionName,
      metricsSnapshot: metrics,
      contentMarkdown: reportContent,
    },
    metadata: {
      reportType: params.reportType,
      reportingPeriod: period,
      generatedByRole: ownerContext.role,
    },
  });

  return {
    success: true,
    draftId: draft.id,
    reportTitle: title,
    reportContent,
  };
}
