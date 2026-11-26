import { describe, expect, it } from 'vitest';

import { formatDay } from '@/features/compare/lib/format';
import { formatShareDate } from '@/features/share/lib/summary';
import { DATE_LOCALE } from '@/lib/utils/locale';

// One date locale for the whole site (cycle 2): en-US, so screens next to each other agree.
describe('one date locale', () => {
  it('is en-US', () => {
    expect(DATE_LOCALE).toBe('en-US');
  });

  it('writes share and compare dates the same way', () => {
    const date = new Date('2026-10-21T12:00:00Z');
    expect(formatShareDate(date)).toBe('Oct 21, 2026');
    expect(formatDay(date.toISOString())).toBe('Oct 21, 2026');
  });
});
