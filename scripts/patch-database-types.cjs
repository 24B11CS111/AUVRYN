const fs = require('fs');
const path = require('path');

const targetFile = path.resolve(__dirname, '../packages/database/src/index.ts');
let content = fs.readFileSync(targetFile, 'utf8');

// 1. Add to DATABASE_TABLES
const tableTarget = "  EVENT_CERTIFICATES: 'event_certificates',";
const tableReplacement = `  EVENT_CERTIFICATES: 'event_certificates',
  AI_INSTITUTION_QUOTAS: 'ai_institution_quotas',
  AI_USAGE_LOGS: 'ai_usage_logs',
  AI_CONVERSATIONS: 'ai_conversations',
  AI_MESSAGES: 'ai_messages',
  AI_GENERATED_DRAFTS: 'ai_generated_drafts',`;

if (!content.includes('AI_INSTITUTION_QUOTAS')) {
  content = content.replace(tableTarget, tableReplacement);
}

// 2. Add to Tables
const tablesEndTarget = `        Relationships: [];
      };
    };
    Views: Record<string, never>;`;

const tablesEndReplacement = `        Relationships: [];
      };
      ai_institution_quotas: {
        Row: {
          institution_id: string;
          monthly_token_budget: number;
          monthly_tokens_consumed: number;
          monthly_request_budget: number;
          monthly_requests_consumed: number;
          is_ai_enabled: boolean;
          allowed_task_types: AITaskType[];
          reset_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          institution_id: string;
          monthly_token_budget?: number;
          monthly_tokens_consumed?: number;
          monthly_request_budget?: number;
          monthly_requests_consumed?: number;
          is_ai_enabled?: boolean;
          allowed_task_types?: AITaskType[];
          reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          institution_id?: string;
          monthly_token_budget?: number;
          monthly_tokens_consumed?: number;
          monthly_request_budget?: number;
          monthly_requests_consumed?: number;
          is_ai_enabled?: boolean;
          allowed_task_types?: AITaskType[];
          reset_at?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_usage_logs: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string | null;
          role: string;
          task_type: AITaskType;
          provider: AIProviderType;
          model_name: string;
          prompt_tokens: number;
          completion_tokens: number;
          total_tokens: number;
          estimated_cost_usd: number | null;
          latency_ms: number;
          status: 'success' | 'rate_limited' | 'quota_exceeded' | 'error';
          error_message: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id?: string | null;
          role: string;
          task_type: AITaskType;
          provider: AIProviderType;
          model_name: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost_usd?: number | null;
          latency_ms?: number;
          status?: 'success' | 'rate_limited' | 'quota_exceeded' | 'error';
          error_message?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string | null;
          role?: string;
          task_type?: AITaskType;
          provider?: AIProviderType;
          model_name?: string;
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
          estimated_cost_usd?: number | null;
          latency_ms?: number;
          status?: 'success' | 'rate_limited' | 'quota_exceeded' | 'error';
          error_message?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_conversations: {
        Row: {
          id: string;
          institution_id: string;
          user_id: string;
          role: string;
          task_type: AITaskType;
          title: string;
          context_type: string | null;
          context_id: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          user_id: string;
          role: string;
          task_type: AITaskType;
          title?: string;
          context_type?: string | null;
          context_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          user_id?: string;
          role?: string;
          task_type?: AITaskType;
          title?: string;
          context_type?: string | null;
          context_id?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      ai_messages: {
        Row: {
          id: string;
          conversation_id: string;
          institution_id: string;
          sender_role: AIMessageRole;
          content: string;
          tokens_used: number;
          metadata: Record<string, unknown>;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          institution_id: string;
          sender_role: AIMessageRole;
          content: string;
          tokens_used?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          institution_id?: string;
          sender_role?: AIMessageRole;
          content?: string;
          tokens_used?: number;
          metadata?: Record<string, unknown>;
          created_at?: string;
        };
        Relationships: [];
      };
      ai_generated_drafts: {
        Row: {
          id: string;
          institution_id: string;
          author_id: string;
          task_type: AITaskType;
          title: string;
          content_json: Record<string, unknown>;
          status: AIDraftStatus;
          reviewed_by: string | null;
          reviewed_at: string | null;
          rejection_reason: string | null;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          institution_id: string;
          author_id: string;
          task_type: AITaskType;
          title: string;
          content_json: Record<string, unknown>;
          status?: AIDraftStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          institution_id?: string;
          author_id?: string;
          task_type?: AITaskType;
          title?: string;
          content_json?: Record<string, unknown>;
          status?: AIDraftStatus;
          reviewed_by?: string | null;
          reviewed_at?: string | null;
          rejection_reason?: string | null;
          metadata?: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;`;

if (!content.includes('ai_institution_quotas:')) {
  // Normalize CRLF
  const normContent = content.replace(/\r\n/g, '\n');
  const normTarget = tablesEndTarget.replace(/\r\n/g, '\n');
  if (normContent.includes(normTarget)) {
    content = normContent.replace(normTarget, tablesEndReplacement.replace(/\r\n/g, '\n'));
  }
}

// 3. Add Row types to end of file
const rowTypes = `
export type AIInstitutionQuotaRow = Database['public']['Tables']['ai_institution_quotas']['Row'];
export type AIUsageLogRow = Database['public']['Tables']['ai_usage_logs']['Row'];
export type AIConversationRow = Database['public']['Tables']['ai_conversations']['Row'];
export type AIMessageRow = Database['public']['Tables']['ai_messages']['Row'];
export type AIGeneratedDraftRow = Database['public']['Tables']['ai_generated_drafts']['Row'];
`;

if (!content.includes('export type AIInstitutionQuotaRow')) {
  content += rowTypes;
}

fs.writeFileSync(targetFile, content, 'utf8');
console.log('Successfully patched packages/database/src/index.ts with AI tables and types.');
