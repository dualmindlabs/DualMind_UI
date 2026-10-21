import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LiveTurnView } from '@/features/arena/components/live-turn-view';
import type { LiveTurn } from '@/features/arena/lib/battle-machine';

import { fakeBattle, FakeArena } from './arena-context';

// UI audit P0-2: response time, answer length and token counts are fingerprints of a model (a
// small fast model against a large slow one), so a blind battle shows none of them, and no model
// name, anywhere in the DOM (text or attributes) until the vote is recorded.

const turn = (overrides: Partial<LiveTurn> = {}): LiveTurn => ({
  id: 'turn-1',
  prompt: 'Explain recursion to a ten-year-old',
  mode: 'battle',
  phase: 'awaiting_vote',
  a: {
    text: 'A function that calls itself on a smaller piece of the problem.',
    model: { name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', displayName: 'Llama 3.3 70B' },
    responseTimeMs: 1840,
    usage: { promptTokens: 12, completionTokens: 345, totalTokens: 357 },
  },
  b: {
    text: 'Like opening nesting dolls until one does not open.',
    model: { name: 'groq/compound-mini', displayName: 'Compound Mini' },
    responseTimeMs: 2310,
    usage: { promptTokens: 12, completionTokens: 678, totalTokens: 690 },
  },
  comparisonId: 'c-1',
  vote: null,
  votePending: false,
  error: null,
  sentAt: 1_000,
  answeredAt: 2_000,
  shownAt: 3_000,
  ...overrides,
});

/** What the visible text must not say before the vote. */
const TEXT_FINGERPRINTS = [
  /\b\d+(\.\d+)?\s?s\b/, // "1.8 s", "2s"
  /\b\d+(\.\d+)?\s?ms\b/,
  /\bwords?\b/i,
  /\btokens?\b/i,
  /llama/i,
  /compound/i,
  /1840|2310|1\.8|2\.3|345|678/,
];

/** What no attribute (labels, titles, data-*) may carry before the vote. */
const ATTRIBUTE_FINGERPRINTS = [
  /llama/i,
  /compound/i,
  /1840|2310|\b1\.8\b|\b2\.3\b|\b345\b|\b678\b/,
];

function view(live: LiveTurn) {
  return render(
    <FakeArena overrides={{ battle: fakeBattle([live]) }}>
      <LiveTurnView turn={live} number={1} />
    </FakeArena>,
  );
}

/** Every attribute value in the rendered turn. */
function attributes(container: HTMLElement): string[] {
  return [...container.querySelectorAll('*')].flatMap(element =>
    [...element.attributes].map(attribute => `${attribute.name}=${attribute.value}`),
  );
}

describe('blind battle integrity (P0-2)', () => {
  for (const phase of ['answering', 'awaiting_vote', 'voting'] as const) {
    it(`shows no timing, length, tokens or names while ${phase}`, () => {
      const { container } = view(turn({ phase, vote: phase === 'voting' ? 'left' : null }));
      expect(screen.queryAllByTestId('pane-meta')).toHaveLength(0);
      expect(screen.queryAllByTestId('pane-model')).toHaveLength(0);
      const text = container.textContent;
      for (const pattern of TEXT_FINGERPRINTS) expect(text, String(pattern)).not.toMatch(pattern);
      const values = attributes(container);
      for (const pattern of ATTRIBUTE_FINGERPRINTS) {
        expect(values.filter(value => pattern.test(value)), String(pattern)).toEqual([]);
      }
      expect(container).toHaveTextContent('Hidden until you vote');
    });
  }

  it('shows them after the vote, in the reveal (the test would see a leak)', () => {
    const { container } = view(turn({ phase: 'revealed', vote: 'right' }));
    expect(screen.getAllByTestId('pane-meta')).toHaveLength(2);
    expect(screen.getAllByTestId('pane-model')).toHaveLength(2);
    expect(container).toHaveTextContent('Tokens');
    expect(container).toHaveTextContent(/1\.8\s?s/);
  });

  it('Side by side is not blind: names and timing show at once', () => {
    view(turn({ mode: 'side', phase: 'awaiting_vote' }));
    expect(screen.getAllByTestId('pane-model')).toHaveLength(2);
    expect(screen.getAllByTestId('pane-meta')).toHaveLength(2);
  });
});
