import { describe, expect, it } from 'vitest';

import { howItWorksContent } from '@/features/info';
import { ARENA_HREF, RATINGS_HELP_HREF } from '@/features/leaderboard';

describe('leaderboard links', () => {
  it('points "How ratings work" at a section that exists on the How it works page', () => {
    const [path, anchor] = RATINGS_HELP_HREF.split('#');
    expect(path).toBe(`/${howItWorksContent.slug}/`);
    expect(howItWorksContent.sections.map(section => section.id)).toContain(anchor);
  });

  it('starts battles in the Arena', () => {
    expect(ARENA_HREF).toBe('/');
  });
});
