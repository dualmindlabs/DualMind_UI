import { describe, expect, it } from 'vitest';

import { RATE_LIMIT_GROUPS } from '../../../server/rate-limit.js';
import { pricingContent } from '../../src/features/info/content/pricing';

// The pricing page states the real limits. They are typed in the page's content, so this test
// keeps them equal to the ones the Worker enforces (RATE_LIMIT_GROUPS, mirrored in wrangler.jsonc).

const TERM_OF_GROUP: Record<keyof typeof RATE_LIMIT_GROUPS, string> = {
  battle: 'Battles and chat',
  vote: 'Votes',
  speech: 'Read aloud',
  write: 'Other changes (renaming, sharing, deleting)',
  read: 'Reading the leaderboard, models and your history',
};

function descriptions(): Map<string, string> {
  const section = pricingContent.sections.find(candidate => candidate.id === 'limits');
  const definitions = section?.blocks.find(block => block.type === 'definitions');
  if (definitions?.type !== 'definitions') throw new Error('the limits section has no list');
  return new Map(definitions.items.map(item => [item.term, item.description]));
}

describe('pricing page limits', () => {
  it('lists exactly the groups the Worker limits', () => {
    expect([...descriptions().keys()].sort()).toEqual(Object.values(TERM_OF_GROUP).sort());
  });

  it.each(Object.entries(RATE_LIMIT_GROUPS))(
    'states the %s limit as the Worker enforces it',
    (name, group) => {
      const text = descriptions().get(TERM_OF_GROUP[name as keyof typeof TERM_OF_GROUP]) ?? '';
      const period = group.period === 60 ? 'minute' : `${group.period} seconds`;
      expect(text).toMatch(new RegExp(`\\b${group.limit}\\b[^.]*\\b${period}\\b`));
    },
  );
});
