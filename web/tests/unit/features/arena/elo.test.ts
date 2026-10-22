import { describe, expect, it } from 'vitest';

import { projectElo, whyItMatters } from '@/features/arena/lib/elo';

describe('projectElo', () => {
  it('moves the two ratings by equal and opposite amounts', () => {
    const move = projectElo(1150, 1051, 'left');
    expect(move.a).toBe(-move.b);
    expect(move.kind).toBe('expected');
    expect(move.a).toBeGreaterThan(0);
  });

  it('calls a win over a higher rated model an upset worth more points', () => {
    const upset = projectElo(1000, 1200, 'left');
    const expected = projectElo(1200, 1000, 'left');
    expect(upset.kind).toBe('upset');
    expect(upset.a).toBeGreaterThan(expected.a);
  });

  it('moves a tie toward the middle and "both bad" nowhere', () => {
    expect(projectElo(1200, 1000, 'tie').a).toBeLessThan(0);
    expect(projectElo(1200, 1000, 'both-bad')).toEqual({ a: 0, b: 0, kind: 'none' });
    expect(whyItMatters(projectElo(1, 1, 'both-bad'))).toMatch(/no rating moves/);
  });
});
