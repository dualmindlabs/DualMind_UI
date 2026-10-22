import { describe, expect, it } from 'vitest';

import {
  eloMargin,
  MAX_ELO_MARGIN,
  rangeDomain,
  ratingRange,
  wilsonInterval,
} from '@/features/leaderboard/lib/confidence';

import { entry, fullBoard } from './helpers';

describe('wilsonInterval', () => {
  it('is the whole range without trials', () => {
    expect(wilsonInterval(0.5, 0)).toEqual({ low: 0, high: 1 });
  });

  it('brackets the observed share and narrows with more trials', () => {
    const few = wilsonInterval(0.6, 10);
    const many = wilsonInterval(0.6, 1000);
    expect(few.low).toBeLessThan(0.6);
    expect(few.high).toBeGreaterThan(0.6);
    expect(many.high - many.low).toBeLessThan(few.high - few.low);
  });

  it('stays inside 0 and 1 at the edges', () => {
    const perfect = wilsonInterval(1, 5);
    expect(perfect.high).toBeLessThanOrEqual(1);
    expect(perfect.low).toBeGreaterThan(0);
    expect(wilsonInterval(0, 5).low).toBe(0);
  });
});

describe('eloMargin', () => {
  it('is wider for a model with few battles than for one with many', () => {
    const few = eloMargin(entry({ wins: 3, losses: 2, ties: 0, battles: 5 }));
    const many = eloMargin(entry({ wins: 62, losses: 27, ties: 9, battles: 98 }));
    expect(few).toBeGreaterThan(many);
    expect(many).toBeGreaterThan(20);
    expect(many).toBeLessThan(150);
  });

  it('is capped for a model without a record', () => {
    expect(eloMargin(entry({ wins: 0, losses: 0, ties: 0, battles: 0 }))).toBe(MAX_ELO_MARGIN);
  });

  it('centres the range on the rating', () => {
    const range = ratingRange(entry({ elo: 1100, wins: 10, losses: 8, ties: 2, battles: 20 }));
    expect(range.elo).toBe(1100);
    expect((range.low + range.high) / 2).toBeCloseTo(1100, 5);
  });
});

describe('rangeDomain', () => {
  it('covers every rating with a margin, rounded to tens', () => {
    const domain = rangeDomain(fullBoard.rated);
    expect(domain.min % 10).toBe(0);
    expect(domain.max % 10).toBe(0);
    for (const item of fullBoard.rated) {
      expect(item.elo).toBeGreaterThan(domain.min);
      expect(item.elo).toBeLessThan(domain.max);
    }
  });

  it('has a safe default when empty', () => {
    expect(rangeDomain([])).toEqual({ min: 0, max: 1 });
  });
});
