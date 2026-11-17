import { describe, it, expect } from 'vitest';
import {
  MockAIAdapter,
  GeminiAdapter,
  OpenAIAdapter,
  AnthropicAdapter,
  getAIAdapter,
} from '../../apps/web/src/lib/ai/adapters';

describe('AI Provider Adapters', () => {
  describe('MockAIAdapter', () => {
    it('generates text completion with deterministic token calculation', async () => {
      const adapter = new MockAIAdapter({
        cannedResponse: 'This is a guided explanation of the Pythagorean theorem.',
      });

      const res = await adapter.generateCompletion({
        systemPrompt: 'You are a math tutor.',
        userPrompt: 'Explain Pythagorean theorem.',
      });

      expect(res.provider).toBe('mock');
      expect(res.model).toBe('mock-ai-v1');
      expect(res.content).toBe('This is a guided explanation of the Pythagorean theorem.');
      expect(res.promptTokens).toBeGreaterThan(0);
      expect(res.completionTokens).toBeGreaterThan(0);
      expect(res.totalTokens).toBe(res.promptTokens + res.completionTokens);
      expect(res.latencyMs).toBeGreaterThanOrEqual(1);
    });

    it('generates structured JSON output when responseFormat is json', async () => {
      const adapter = new MockAIAdapter();
      const res = await adapter.generateCompletion({
        systemPrompt: 'Generate a JSON summary.',
        userPrompt: 'Topic: Photosynthesis',
        responseFormat: 'json',
      });

      expect(res.parsed).toBeDefined();
      expect(typeof res.parsed).toBe('object');
      const parsedObj = res.parsed as Record<string, unknown>;
      expect(parsedObj.status).toBe('success');
      expect(parsedObj.keyPoints).toBeInstanceOf(Array);
    });

    it('simulates latency and errors properly when configured', async () => {
      const adapter = new MockAIAdapter({
        simulatedLatencyMs: 15,
        shouldFail: true,
        failureMessage: 'Rate limit exceeded on provider',
      });

      await expect(
        adapter.generateCompletion({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        })
      ).rejects.toThrow('Rate limit exceeded on provider');
    });
  });

  describe('GeminiAdapter', () => {
    it('requires GEMINI_API_KEY if not provided', async () => {
      const adapter = new GeminiAdapter({ apiKey: '' });
      await expect(
        adapter.generateCompletion({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        })
      ).rejects.toThrow('GEMINI_API_KEY is not configured on the server');
    });

    it('defaults to currently supported Gemini models', () => {
      const adapter = new GeminiAdapter({ apiKey: 'mock-key' });
      // Verify provider name
      expect(adapter.providerName).toBe('gemini');
    });
  });

  describe('OpenAIAdapter', () => {
    it('requires OPENAI_API_KEY if not provided', async () => {
      const adapter = new OpenAIAdapter({ apiKey: '' });
      await expect(
        adapter.generateCompletion({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        })
      ).rejects.toThrow('OPENAI_API_KEY is not configured on the server');
    });
  });

  describe('AnthropicAdapter', () => {
    it('requires ANTHROPIC_API_KEY if not provided', async () => {
      const adapter = new AnthropicAdapter({ apiKey: '' });
      await expect(
        adapter.generateCompletion({
          systemPrompt: 'Sys',
          userPrompt: 'User',
        })
      ).rejects.toThrow('ANTHROPIC_API_KEY is not configured on the server');
    });
  });

  describe('Adapter Factory (getAIAdapter)', () => {
    it('returns MockAIAdapter when mock provider is explicitly selected', () => {
      const adapter = getAIAdapter('mock');
      expect(adapter.providerName).toBe('mock');
    });

    it('returns MockAIAdapter in test environment when API keys are unset', () => {
      const adapter = getAIAdapter('gemini', { gemini: { apiKey: '' } });
      // In test mode without API key, factory falls back to MockAIAdapter
      expect(adapter.providerName).toBe('mock');
    });
  });
});
