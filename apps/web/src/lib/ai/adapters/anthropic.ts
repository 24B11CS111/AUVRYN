import type {
  AIProviderType,
  AICompletionOptions,
  AICompletionResult,
} from '@edu-platform/types';
import { BaseAIAdapter } from './base';

export interface AnthropicAdapterConfig {
  apiKey?: string;
  defaultModel?: string;
  baseUrl?: string;
}

export class AnthropicAdapter extends BaseAIAdapter {
  readonly providerName: AIProviderType = 'anthropic';
  private apiKey: string;
  private defaultModel: string;
  private baseUrl: string;

  constructor(config: AnthropicAdapterConfig = {}) {
    super();
    this.apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || '';
    this.defaultModel = config.defaultModel || process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    this.baseUrl = config.baseUrl || 'https://api.anthropic.com/v1';
  }

  async generateCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    if (!this.apiKey) {
      throw new Error('ANTHROPIC_API_KEY is not configured on the server');
    }

    const startTime = Date.now();
    const model = this.defaultModel;
    const url = `${this.baseUrl}/messages`;

    let system = options.systemPrompt;
    if (options.responseFormat === 'json') {
      system += '\nIMPORTANT: You must respond ONLY with valid JSON. Do not wrap in markdown or include conversational text.';
    }

    const body: Record<string, unknown> = {
      model,
      max_tokens: options.maxTokens ?? 2048,
      temperature: options.temperature ?? 0.2,
      system,
      messages: [
        { role: 'user', content: options.userPrompt },
      ],
    };

    if (options.stopSequences && options.stopSequences.length > 0) {
      body.stop_sequences = options.stopSequences;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
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
      throw new Error(`Anthropic API error (${response.status}): ${errMsg}`);
    }

    const data = await response.json();
    const textBlock = data.content?.find((block: any) => block.type === 'text');

    if (!textBlock || !textBlock.text) {
      throw new Error('Anthropic returned empty completion');
    }

    const textContent = textBlock.text;
    let parsed: unknown = undefined;

    if (options.responseFormat === 'json') {
      parsed = this.parseJsonContent(textContent);
    }

    const promptTokens = data.usage?.input_tokens || this.estimateTokens(options.systemPrompt + options.userPrompt);
    const completionTokens = data.usage?.output_tokens || this.estimateTokens(textContent);
    const totalTokens = promptTokens + completionTokens;

    return {
      content: textContent,
      parsed,
      promptTokens,
      completionTokens,
      totalTokens,
      model,
      provider: 'anthropic',
      latencyMs,
    };
  }
}
