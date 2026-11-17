import type {
  AIProviderType,
  AICompletionOptions,
  AICompletionResult,
} from '@edu-platform/types';
import { BaseAIAdapter } from './base';

export interface OpenAIAdapterConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
}

export class OpenAIAdapter extends BaseAIAdapter {
  readonly providerName: AIProviderType = 'openai';
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: OpenAIAdapterConfig = {}) {
    super();
    this.apiKey = config.apiKey || process.env.OPENAI_API_KEY || '';
    this.defaultModel = config.defaultModel || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async generateCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is not configured on the server');
    }

    const startTime = Date.now();
    const model = this.defaultModel;
    const url = `${this.baseUrl}/chat/completions`;

    const body: Record<string, unknown> = {
      model,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 2048,
      messages: [
        { role: 'system', content: options.systemPrompt },
        { role: 'user', content: options.userPrompt },
      ],
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    if (options.stopSequences && options.stopSequences.length > 0) {
      body.stop = options.stopSequences;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify(body),
    });

    const latencyMs = Math.max(1, Date.now() - startTime);

    if (!response.ok) {
      const errorText = await response.text();
      let parsedErr: any = null;
      try {
        parsedErr = JSON.parse(errorText);
      } catch {}
      const errMsg = parsedErr?.error?.message || errorText || `HTTP ${response.status}`;
      throw new Error(`OpenAI API error (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    if (!choice || !choice.message?.content) {
      throw new Error('OpenAI returned empty completion');
    }

    const textContent = choice.message.content;
    let parsed: unknown = undefined;

    if (options.responseFormat === 'json') {
      parsed = this.parseJsonContent(textContent);
    }

    const promptTokens = data.usage?.prompt_tokens || this.estimateTokens(options.systemPrompt + options.userPrompt);
    const completionTokens = data.usage?.completion_tokens || this.estimateTokens(textContent);
    const totalTokens = data.usage?.total_tokens || (promptTokens + completionTokens);

    return {
      content: textContent,
      parsed,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      provider: 'openai',
      latencyMs,
    };
  }
}
