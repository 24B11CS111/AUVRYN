import type { AIProviderType, AIProviderAdapter } from '@edu-platform/types';
import { GeminiAdapter, type GeminiAdapterConfig } from './gemini';
import { OpenAIAdapter, type OpenAIAdapterConfig } from './openai';
import { AnthropicAdapter, type AnthropicAdapterConfig } from './anthropic';
import { MockAIAdapter, type MockAdapterOptions } from './mock';

export * from './base';
export * from './gemini';
export * from './openai';
export * from './anthropic';
export * from './mock';

export interface AdapterFactoryOptions {
  gemini?: GeminiAdapterConfig;
  openai?: OpenAIAdapterConfig;
  anthropic?: AnthropicAdapterConfig;
  mock?: MockAdapterOptions;
}

/**
 * Returns an instance of the requested AI provider adapter, defaulting to the server's configured primary provider.
 * If running in testing or offline mode without an API key, falls back cleanly to the deterministic MockAIAdapter.
 */
export function getAIAdapter(
  preferredProvider?: AIProviderType,
  options: AdapterFactoryOptions = {}
): AIProviderAdapter {
  const provider =
    preferredProvider ||
    (process.env.AI_DEFAULT_PROVIDER as AIProviderType) ||
    'gemini';

  switch (provider) {
    case 'gemini': {
      const apiKey = options.gemini?.apiKey || process.env.GEMINI_API_KEY;
      if (!apiKey && process.env.NODE_ENV === 'test') {
        return new MockAIAdapter(options.mock);
      }
      return new GeminiAdapter({ ...options.gemini, apiKey });
    }

    case 'openai': {
      const apiKey = options.openai?.apiKey || process.env.OPENAI_API_KEY;
      if (!apiKey && process.env.NODE_ENV === 'test') {
        return new MockAIAdapter(options.mock);
      }
      return new OpenAIAdapter({ ...options.openai, apiKey });
    }

    case 'anthropic': {
      const apiKey = options.anthropic?.apiKey || process.env.ANTHROPIC_API_KEY;
      if (!apiKey && process.env.NODE_ENV === 'test') {
        return new MockAIAdapter(options.mock);
      }
      return new AnthropicAdapter({ ...options.anthropic, apiKey });
    }

    case 'mock':
    default:
      return new MockAIAdapter(options.mock);
  }
}
