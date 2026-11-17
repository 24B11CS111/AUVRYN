import type {
  AIProviderType,
  AICompletionOptions,
  AICompletionResult,
} from '@edu-platform/types';
import { BaseAIAdapter } from './base';

export interface GeminiAdapterConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
}

export class GeminiAdapter extends BaseAIAdapter {
  readonly providerName: AIProviderType = 'gemini';
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: GeminiAdapterConfig = {}) {
    super();
    this.apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
    // Use currently supported models: gemini-3.8-flash (primary), gemini-4-argon (heavy reasoning)
    this.defaultModel = config.defaultModel || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    this.baseUrl = config.baseUrl || 'https://generativelanguage.googleapis.com/v1beta';
  }

  async generateCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.apiKey) {
      throw new Error('GEMINI_API_KEY is not configured on the server');
    }

    const startTime = Date.now();
    const model = this.defaultModel;
    const url = `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`;

    const generationConfig: Record<string, unknown> = {
      temperature: options.temperature ?? 0.2,
      maxOutputTokens: options.maxTokens ?? 2048,
    };

    if (options.responseFormat === 'json') {
      generationConfig.responseMimeType = 'application/json';
      if (options.schema) {
        generationConfig.responseSchema = options.schema;
      }
    }

    if (options.stopSequences && options.stopSequences.length > 0) {
      generationConfig.stopSequences = options.stopSequences;
    }

    const body = {
      system_instruction: {
        parts: [{ text: options.systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: options.userPrompt }],
        },
      ],
      generationConfig,
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
      throw new Error(`Gemini API error (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    const candidate = data.candidates?.[0];

    if (!candidate || !candidate.content?.parts?.[0]?.text) {
      const finishReason = candidate?.finishReason || 'NO_CANDIDATE';
      throw new Error(`Gemini returned empty completion (finishReason: ${finishReason})`);
    }

    const textContent = candidate.content.parts[0].text;
    let parsed: unknown = undefined;

    if (options.responseFormat === 'json') {
      parsed = this.parseJsonContent(textContent);
    }

    const promptTokens = data.usageMetadata?.promptTokenCount || this.estimateTokens(options.systemPrompt + options.userPrompt);
    const completionTokens = data.usageMetadata?.candidatesTokenCount || this.estimateTokens(textContent);
    const totalTokens = data.usageMetadata?.totalTokenCount || (promptTokens + completionTokens);

    return {
      content: textContent,
      parsed,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      provider: 'gemini',
      latencyMs,
    };
  }
}
