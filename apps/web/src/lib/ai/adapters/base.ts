import type {
  AIProviderType,
  AICompletionOptions,
  AICompletionResult,
  AIProviderAdapter,
} from '@edu-platform/types';

export abstract class BaseAIAdapter implements AIProviderAdapter {
  abstract readonly providerName: AIProviderType;

  abstract generateCompletion(
    options: AICompletionOptions
  ): Promise<AICompletionResult>;

  /**
   * Helper to estimate token count from text using standard 4-chars/token heuristic
   */
  protected estimateTokens(text: string): number {
    if (!text) return 0;
    return Math.max(1, Math.ceil(text.length / 4));
  }

  /**
   * Helper to safely parse JSON from model completions with markdown code fence stripping
   */
  protected parseJsonContent<T = unknown>(content: string): T {
    try {
      // Strip ```json ... ``` or ``` ... ``` wrappers if present
      const cleaned = content
        .trim()
        .replace(/^```(?:json)?\s*/i, '')
        .replace(/\s*```$/, '')
        .trim();
      return JSON.parse(cleaned) as T;
    } catch (err) {
      throw new Error(`Failed to parse AI response as JSON: ${(err as Error).message}\nRaw content: ${content.substring(0, 300)}`);
    }
  }
}
