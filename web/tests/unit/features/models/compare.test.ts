import { describe, expect, it } from 'vitest';

import {
  chancePercent,
  expectedScore,
  headToHead,
  togglePinned,
} from '@/features/models/lib/compare';

describe('head to head', () => {
  it('gives equal ratings an even chance', () => {
    expect(expectedScore(1000, 1000)).toBeCloseTo(0.5, 6);
  });

  it('gives the stronger model about 64% at 100 points ahead', () => {
    const result = headToHead(1100, 1000);
    expect(result.first).toBeCloseTo(0.6401, 3);
    expect(result.first + result.second).toBeCloseTo(1, 10);
    expect(result.gap).toBe(100);
  });

  it('never reads as certain', () => {
    expect(chancePercent(headToHead(2000, 800).first)).toBe(99);
    expect(chancePercent(headToHead(800, 2000).first)).toBe(1);
  });
});

describe('togglePinned', () => {
  it('pins up to two and replaces the oldest', () => {
    expect(togglePinned([], 'a')).toEqual(['a']);
    expect(togglePinned(['a'], 'b')).toEqual(['a', 'b']);
    expect(togglePinned(['a', 'b'], 'c')).toEqual(['b', 'c']);
  });

  it('unpins a pinned model', () => {
    expect(togglePinned(['a', 'b'], 'a')).toEqual(['b']);
  });
});
