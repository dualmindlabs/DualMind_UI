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
    expect(isRetiredModel('groq/compound')).toBe(false);
    expect(isRetiredModel('qwen/qwen3-32b')).toBe(false);
  });
});
