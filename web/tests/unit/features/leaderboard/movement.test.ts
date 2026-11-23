import { beforeEach, describe, expect, it } from 'vitest';

import {
  describeMovement,
  movementOf,
  SNAPSHOT_GAP_MS,
  takeBaseline,
} from '@/features/leaderboard/lib/movement';

const NOW = 1_800_000_000_000;

beforeEach(() => {
  window.localStorage.clear();
});

describe('takeBaseline', () => {
  it('has nothing to compare with on a first visit', () => {
    expect(takeBaseline({ a: 1, b: 2 }, NOW)).toBeNull();
  });

  it('keeps the same comparison across reloads inside the gap', () => {
    takeBaseline({ a: 1, b: 2 }, NOW);
    expect(takeBaseline({ a: 2, b: 1 }, NOW + 1000)).toBeNull();
  });

  it('compares with the last visit after a gap, and keeps doing so on a reload', () => {
    takeBaseline({ a: 1, b: 2 }, NOW);
    const later = NOW + SNAPSHOT_GAP_MS + 1;
    expect(takeBaseline({ a: 2, b: 1 }, later)).toEqual({ a: 1, b: 2 });
    expect(takeBaseline({ a: 2, b: 1 }, later + 5000)).toEqual({ a: 1, b: 2 });
  });

  it('survives unreadable storage', () => {
    window.localStorage.setItem('dm.leaderboard.ranks', '{not json');
    expect(takeBaseline({ a: 1 }, NOW)).toBeNull();
  });
});

describe('movementOf', () => {
  const baseline = { a: 3, b: 1, c: 2 };

  it('reads up, down, same and new', () => {
    expect(movementOf('a', 1, baseline)).toEqual({ kind: 'up', places: 2 });
    expect(movementOf('b', 4, baseline)).toEqual({ kind: 'down', places: 3 });
    expect(movementOf('c', 2, baseline)).toEqual({ kind: 'same' });
    expect(movementOf('z', 5, baseline)).toEqual({ kind: 'new' });
  });

  it('describes each in words', () => {
    expect(describeMovement({ kind: 'up', places: 1 })).toBe('Up 1 place since your last visit');
    expect(describeMovement({ kind: 'down', places: 2 })).toBe(
      'Down 2 places since your last visit',
    );
  });
});
