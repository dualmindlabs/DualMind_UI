import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LiveTurnView } from '@/features/arena/components/live-turn-view';
import { RevealPanel } from '@/features/arena/components/reveal-panel';
import type { ArenaState } from '@/features/arena/hooks/use-arena';
import type { LiveTurn } from '@/features/arena/lib/battle-machine';

import { FakeArena, fakeBattle } from './arena-context';

// The end of a vote (arena flow review): the verdict, both names in full, the next steps, and
// focus that lands on them when the vote bar leaves.

const LONG_NAME = 'Llama 3.3 70B Instruct (FP8, fast)';

const revealed = (overrides: Partial<LiveTurn> = {}): LiveTurn => ({
  id: 'turn-1',
  prompt: 'Explain recursion to a ten-year-old',
  mode: 'battle',
  phase: 'revealed',
  a: {
    text: 'A function that calls itself on a smaller piece of the problem.',
    model: {
      id: null,
      name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      displayName: LONG_NAME,
      provider: 'cloudflare',
    },
    responseTimeMs: 1840,
    usage: { promptTokens: 12, completionTokens: 345, totalTokens: 357 },
  },
  b: {
    text: 'Like opening nesting dolls until one does not open.',
    model: { id: null, name: 'groq/compound-mini', displayName: 'Compound Mini', provider: 'groq' },
    responseTimeMs: 2310,
    usage: { promptTokens: 12, completionTokens: 678, totalTokens: 690 },
  },
  comparisonId: 'c-1',
  vote: 'left',
  votePending: false,
  error: null,
  sentAt: 1_000,
  answeredAt: 2_000,
  shownAt: 3_000,
  ...overrides,
});

function panel(turn: LiveTurn, overrides: Partial<ArenaState> = {}) {
  return render(
    <FakeArena overrides={{ battle: fakeBattle([turn]), ...overrides }}>
      <RevealPanel turn={turn} />
    </FakeArena>,
  );
}

describe('RevealPanel', () => {
  it('names both models in full and marks the pick', () => {
    panel(revealed());
    const group = screen.getByRole('group', { name: 'Your verdict: A is better' });
    const names = within(group).getAllByTestId('reveal-name');
    expect(names[0]).toHaveTextContent(LONG_NAME);
    expect(names[0]).toHaveTextContent('Your pick');
    expect(names[1]).toHaveTextContent('Compound Mini');
    expect(names[1]).not.toHaveTextContent('Your pick');
  });

  it('takes focus when the vote left it on the page', () => {
    (document.activeElement as HTMLElement | null)?.blur();
    panel(revealed());
    expect(screen.getByTestId('reveal-panel')).toHaveFocus();
  });

  it('leaves focus where the visitor put it', () => {
    render(<input aria-label="Elsewhere" />);
    const elsewhere = screen.getByRole('textbox', { name: 'Elsewhere' });
    elsewhere.focus();
    panel(revealed());
    expect(elsewhere).toHaveFocus();
  });

  it('offers a follow-up, a rematch, sharing and a new battle, in that order', async () => {
    const user = userEvent.setup();
    const spies = {
      focusComposer: vi.fn(),
      rematch: vi.fn(),
      openShare: vi.fn(),
      newBattle: vi.fn(),
    };
    panel(revealed(), { ...spies, threadId: 't-1' });
    const buttons = within(screen.getByTestId('reveal-panel')).getAllByRole('button');
    expect(buttons.map(button => button.textContent)).toEqual([
      'Ask a follow-up/',
      'Rematch',
      'Share this battle',
      'New battleN',
    ]);
    await user.click(screen.getByRole('button', { name: /Ask a follow-up/ }));
    expect(spies.focusComposer).toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Rematch' }));
    expect(spies.rematch).toHaveBeenCalledWith('Explain recursion to a ten-year-old');
    await user.click(screen.getByRole('button', { name: 'Share this battle' }));
    expect(spies.openShare).toHaveBeenCalledWith('t-1');
    await user.click(screen.getByRole('button', { name: /New battle/ }));
    expect(spies.newBattle).toHaveBeenCalled();
  });

  it('drops rematch in Side by side, share without a thread, key hints with keys off', () => {
    panel(revealed({ mode: 'side' }), { shortcutsEnabled: false });
    const group = screen.getByTestId('reveal-panel');
    expect(within(group).queryByRole('button', { name: 'Rematch' })).toBeNull();
    expect(within(group).queryByRole('button', { name: 'Share this battle' })).toBeNull();
    expect(group.querySelector('kbd')).toBeNull();
  });

  it('shows the offline chip while the vote waits in the queue', () => {
    const turn = revealed({ votePending: true });
    render(
      <FakeArena overrides={{ battle: { ...fakeBattle([turn]), pendingVotes: 1 } }}>
        <RevealPanel turn={turn} />
      </FakeArena>,
    );
    expect(screen.getByTestId('vote-pending')).toHaveTextContent('Saved offline');
  });
});

describe('LiveTurnView after the vote', () => {
  it('shows the next steps on the newest turn only', () => {
    const turn = revealed();
    const { rerender } = render(
      <FakeArena overrides={{ battle: fakeBattle([turn]) }}>
        <LiveTurnView turn={turn} number={1} latest />
      </FakeArena>,
    );
    expect(screen.getByTestId('reveal-panel')).toBeInTheDocument();
    rerender(
      <FakeArena overrides={{ battle: fakeBattle([turn]) }}>
        <LiveTurnView turn={turn} number={1} />
      </FakeArena>,
    );
    expect(screen.queryByTestId('reveal-panel')).toBeNull();
    expect(screen.getByTestId('verdict')).toHaveTextContent('Your verdict: A is better');
  });

  it('keeps the metrics in the footer, not the header, and the full name in a tooltip', () => {
    render(
      <FakeArena overrides={{ battle: fakeBattle([revealed()]) }}>
        <LiveTurnView turn={revealed()} number={1} />
      </FakeArena>,
    );
    const answerA = screen.getByRole('region', { name: /Answer A/ });
    expect(answerA.querySelector('header')).not.toHaveTextContent(/1\.8\s?s/);
    expect(within(answerA).getByTestId('pane-meta')).toHaveTextContent('Time1.8 s');
    expect(within(answerA).getByTestId('pane-model')).toHaveAttribute('title', LONG_NAME);
    expect(within(answerA).getByTestId('pane-pick')).toHaveTextContent('Your pick');
  });

  it('shows no empty panes (and nothing to copy) when a battle failed before any answer', () => {
    const failed = revealed({ phase: 'error', a: null, b: null, vote: null, error: 'Boom.' });
    render(
      <FakeArena overrides={{ battle: fakeBattle([failed]) }}>
        <LiveTurnView turn={failed} number={1} latest />
      </FakeArena>,
    );
    expect(screen.queryByRole('region', { name: /Answer A/ })).toBeNull();
    expect(screen.queryByRole('button', { name: /^Copy/ })).toBeNull();
    expect(screen.getByRole('alert')).toHaveTextContent('The answers did not arrive. Boom.');
  });
});
