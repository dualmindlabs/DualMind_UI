import { describe, expect, it } from 'vitest';

import { cn } from '@/lib/utils/cn';

describe('cn', () => {
  it('joins clsx-style inputs', () => {
    expect(cn('a', false, null, undefined, ['b', { c: true, d: false }])).toBe('a b c');
  });

  it('lets the last conflicting Tailwind class win', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('keeps a custom font size next to a text colour', () => {
    expect(cn('text-ui text-fg')).toBe('text-ui text-fg');
    expect(cn('text-ui', 'text-h3')).toBe('text-h3');
    expect(cn('text-fg', 'text-muted')).toBe('text-muted');
  });
});
