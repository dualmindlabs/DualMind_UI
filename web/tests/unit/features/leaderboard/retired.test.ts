import { describe, expect, it } from 'vitest';

import { isRetiredModel } from '@/features/leaderboard/lib/retired';

describe('isRetiredModel', () => {
  it('follows the API flag when it is there', () => {
    expect(isRetiredModel('groq/compound-mini', false)).toBe(true);
    expect(isRetiredModel('groq/compound-mini', true)).toBe(false);
    expect(isRetiredModel('qwq-32b', false)).toBe(true);
    expect(isRetiredModel('@cf/meta/llama-3.1-70b-instruct', true)).toBe(false);
  });

  it('falls back to the named list, ignoring the platform prefix and case', () => {
    expect(isRetiredModel('groq/compound-mini')).toBe(true);
    expect(isRetiredModel('Llama-3.3-70B-Versatile')).toBe(true);
    expect(isRetiredModel('moonshotai/kimi-k2-instruct-0905')).toBe(true);
    // Shut down per the cycle 2 back red-team (Groq and Google deprecation pages).
    expect(isRetiredModel('groq/compound')).toBe(true);
    expect(isRetiredModel('qwen/qwen3-32b')).toBe(true);
    expect(isRetiredModel('meta-llama/llama-4-scout-17b-16e-instruct')).toBe(true);
    expect(isRetiredModel('gemini-2.0-flash')).toBe(true);
    expect(isRetiredModel('gemini-2.0-flash-lite')).toBe(true);
    // Models that are still served.
    expect(isRetiredModel('gemini-2.5-flash')).toBe(false);
    expect(isRetiredModel('openai/gpt-oss-120b')).toBe(false);
    expect(isRetiredModel('@cf/qwen/qwen3-30b-a3b-fp8')).toBe(false);
  });

  it('names the 15 Cloudflare models that are gone from its catalogue', () => {
    for (const name of [
      '@cf/meta/llama-3.1-70b-instruct',
      '@cf/meta/llama-3.1-8b-instruct-fast',
      '@hf/meta-llama/meta-llama-3-8b-instruct',
      '@hf/mistral/mistral-7b-instruct-v0.2',
      '@hf/nousresearch/hermes-2-pro-mistral-7b',
      '@cf/meta/llama-3.1-8b-instruct-awq',
      '@cf/meta/llama-3.1-8b-instruct',
      '@cf/mistral/mistral-7b-instruct-v0.1',
      '@cf/meta/llama-3-8b-instruct',
      '@cf/meta/llama-3-8b-instruct-awq',
      '@hf/google/gemma-7b-it',
      '@cf/defog/sqlcoder-7b-2',
      '@cf/meta/llama-2-7b-chat-fp16',
      '@cf/meta/llama-2-7b-chat-int8',
      '@cf/microsoft/phi-2',
    ]) {
      expect(isRetiredModel(name), name).toBe(true);
    }
    // Same family, still in the catalogue.
    expect(isRetiredModel('@cf/meta/llama-3.1-8b-instruct-fp8')).toBe(false);
    expect(isRetiredModel('@cf/meta/llama-3.2-3b-instruct')).toBe(false);
  });
});
