import { describe, expect, it } from 'vitest';

import { scrollEdges } from '@/features/arena/hooks/use-scroll-edges';

// The starter rows on phones (UI audit P2-9): which edge fades, and when the scroll cue shows.

const row = (scrollLeft: number, scrollWidth = 600, clientWidth = 358) => ({
  scrollLeft,
  scrollWidth,
  clientWidth,
});

describe('scrollEdges', () => {
  it('a row that fits has no edges (it wraps on wide screens)', () => {
    expect(scrollEdges(row(0, 358))).toEqual({ start: false, end: false });
    expect(scrollEdges(row(0, 359))).toEqual({ start: false, end: false });
  });

  it('at the start, only the end hides content', () => {
    expect(scrollEdges(row(0))).toEqual({ start: false, end: true });
  });

  it('in the middle, both edges hide content', () => {
    expect(scrollEdges(row(120))).toEqual({ start: true, end: true });
  });

  it('at the end, only the start does (subpixel slack included)', () => {
    expect(scrollEdges(row(242))).toEqual({ start: true, end: false });
    expect(scrollEdges(row(241.5))).toEqual({ start: true, end: false });
  });

  it('reads right-to-left scrollers too', () => {
    expect(scrollEdges(row(-120))).toEqual({ start: true, end: true });
  });
});
