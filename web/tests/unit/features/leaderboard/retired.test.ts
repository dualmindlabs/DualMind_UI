import { describe, expect, it } from 'vitest';

import { isRetiredModel } from '@/features/leaderboard/lib/retired';

describe('isRetiredModel', () => {
  it('follows the API flag when it is there', () => {
    expect(isRetiredModel('groq/compound-mini', false)).toBe(true);
    expect(isRetiredModel('groq/compound-mini', true)).toBe(false);
    expect(isRetiredModel('qwq-32b', false)).toBe(true);
  });

  it('falls back to the named list, ignoring the platform prefix and case', () => {
    expect(isRetiredModel('groq/compound-mini')).toBe(true);
    expect(isRetiredModel('Llama-3.3-70B-Versatile')).toBe(true);
    expect(isRetiredModel('moonshotai/kimi-k2-instruct-0905')).toBe(true);
    expect(isRetiredModel('groq/compound')).toBe(true);
    expect(isRetiredModel('qwen/qwen3-32b')).toBe(true);
    expect(isRetiredModel('openai/gpt-oss-120b')).toBe(false);
  });

  it('retires the Gemini 2.5 pair from 1 Dec 2026 and keeps flash-lite', () => {
    const before = new Date('2026-11-30T23:59:59Z');
    const after = new Date('2026-12-01T00:00:00Z');
    expect(isRetiredModel('gemini-2.5-pro', undefined, before)).toBe(false);
    expect(isRetiredModel('google/gemini-2.5-pro', undefined, after)).toBe(true);
    expect(isRetiredModel('gemini-2.5-flash', undefined, after)).toBe(true);
    expect(isRetiredModel('gemini-2.5-flash-lite', undefined, after)).toBe(false);
  });
});
