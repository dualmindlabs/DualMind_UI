import { describe, expect, it } from 'vitest';

import { nextPromptIndex, parsePrompts, validateArenaName } from '@/features/private-arena/lib/prompts';

describe('parsePrompts', () => {
  it('takes one prompt per line and ignores blank lines and spaces', () => {
    expect(parsePrompts('  First \n\n Second\r\nThird\n   \n')).toEqual({
      prompts: ['First', 'Second', 'Third'],
      error: null,
    });
  });

  it('needs at least one prompt', () => {
    expect(parsePrompts('  \n \n').error).toMatch(/at least one/);
  });

  it('allows at most 50 prompts of at most 2,000 characters', () => {
    const fifty = Array.from({ length: 50 }, (_, index) => `p${index}`).join('\n');
    expect(parsePrompts(fifty).error).toBeNull();
    expect(parsePrompts(`${fifty}\nextra`).error).toMatch(/at most 50/);
    expect(parsePrompts(`ok\n${'x'.repeat(2001)}`).error).toMatch(/Prompt 2 is longer/);
    expect(parsePrompts('x'.repeat(2000)).error).toBeNull();
  });
});

describe('validateArenaName', () => {
  it('needs a name of at most 80 characters', () => {
    expect(validateArenaName('  ')).toMatch(/name/);
    expect(validateArenaName('x'.repeat(81))).toMatch(/80/);
    expect(validateArenaName('Support replies')).toBeNull();
  });
});

describe('nextPromptIndex', () => {
  it('walks the prompts in order and stops after the last', () => {
    expect(nextPromptIndex(0, 3)).toBe(0);
    expect(nextPromptIndex(2, 3)).toBe(2);
    expect(nextPromptIndex(3, 3)).toBeNull();
    expect(nextPromptIndex(5, 3)).toBeNull();
    expect(nextPromptIndex(-1, 3)).toBe(0);
  });
});
