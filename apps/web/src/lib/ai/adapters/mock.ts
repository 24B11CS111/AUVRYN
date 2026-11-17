import type {
  AIProviderType,
  AICompletionOptions,
  AICompletionResult,
} from '@edu-platform/types';
import { BaseAIAdapter } from './base';

export interface MockAdapterOptions {
  cannedResponse?: string;
  simulatedLatencyMs?: number;
  shouldFail?: boolean;
  failureMessage?: string;
}

export class MockAIAdapter extends BaseAIAdapter {
  readonly providerName: AIProviderType = 'mock';
  private options: MockAdapterOptions;

  constructor(options: MockAdapterOptions = {}) {
    super();
    this.options = options;
  }

  setOptions(options: MockAdapterOptions) {
    this.options = { ...this.options, ...options };
  }

  async generateCompletion(options: AICompletionOptions): Promise<AICompletionResult> {
    const startTime = Date.now();

    if (this.options.simulatedLatencyMs) {
      await new Promise((resolve) => setTimeout(resolve, this.options.simulatedLatencyMs));
    }

    if (this.options.shouldFail) {
      throw new Error(this.options.failureMessage || 'Mock provider simulated failure');
    }

    let content = this.options.cannedResponse;
    if (!content) {
      if (options.responseFormat === 'json') {
        content = JSON.stringify({
          status: 'success',
          summary: 'Mock educational response',
          topic: 'Sample Concept',
          keyPoints: ['Point 1: Introduction', 'Point 2: Core Analysis', 'Point 3: Next Steps'],
        });
      } else {
        content = `[Mock AI Response for task]: Concept explanation based on context.\n1. Core principle.\n2. Guided practice steps.`;
      }
    }

    let parsed: unknown = undefined;
    if (options.responseFormat === 'json') {
      parsed = this.parseJsonContent(content);
    }

    const promptTokens = this.estimateTokens(options.systemPrompt + options.userPrompt);
    const completionTokens = this.estimateTokens(content);
    const latencyMs = Math.max(1, Date.now() - startTime);

    return {
      content,
      parsed,
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      model: 'mock-ai-v1',
      provider: 'mock',
      latencyMs,
    };
  }
}
