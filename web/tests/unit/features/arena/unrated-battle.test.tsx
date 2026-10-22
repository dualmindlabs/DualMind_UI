import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { LiveTurnView } from '@/features/arena/components/live-turn-view';
import type { LiveTurn } from '@/features/arena/lib/battle-machine';
import { UNRATED_NOTES, voteFailure } from '@/features/arena/lib/battle-notes';
import { ApiError } from '@/lib/api';

import { FakeArena, fakeBattle } from './arena-context';

const model = (name: string) => ({ id: null, name, displayName: name, provider: 'x' });

const turn = (overrides: Partial<LiveTurn> = {}): LiveTurn => ({
  id: 'turn-1',
  prompt: 'Explain recursion',
  mode: 'battle',
  phase: 'done',
  a: {
    text: 'A function that calls itself.',
    model: model('secret-llama'),
    responseTimeMs: 1840,
    usage: null,
  },
  b: {
    text: 'Nesting dolls.',
    model: model('secret-compound'),
    responseTimeMs: 2310,
    usage: null,
  },
  comparisonId: null,
  unrated: 'fallback',
  vote: null,
  votePending: false,
  error: null,
  errorKind: null,
  sentAt: 1_000,
  answeredAt: 2_000,
  shownAt: 3_000,
  ...overrides,
});

function view(live: LiveTurn, newBattle = vi.fn()) {
  return render(
    <FakeArena overrides={{ battle: fakeBattle([live]), newBattle }}>
      <LiveTurnView turn={live} number={1} />
    </FakeArena>,
  );
}

describe('a battle a backup model answered', () => {
  it('says why in one calm line, offers no vote and shows no model name', () => {
    const { container } = view(turn());
    expect(screen.getByTestId('unrated-note')).toHaveTextContent(
      'One model was unavailable, so a backup answered. This battle is not rated.',
    );
    expect(screen.queryByTestId('vote-bar')).toBeNull();
    expect(screen.queryAllByTestId('pane-model')).toHaveLength(0);
    expect(screen.queryAllByTestId('pane-meta')).toHaveLength(0);
    expect(container.textContent).not.toMatch(/secret-llama|secret-compound|1840|2310/);
    // The header does not promise a reveal that will never come.
    expect(container).not.toHaveTextContent('Hidden until you vote');
  });

  it('keeps the vote bar for a rated battle', () => {
    view(turn({ phase: 'awaiting_vote', comparisonId: 'c-1', unrated: null }));
    expect(screen.getByTestId('vote-bar')).toBeInTheDocument();
    expect(screen.queryByTestId('unrated-note')).toBeNull();
  });

  it('says a closed vote is closed (403 or 404 on the vote)', () => {
    view(turn({ unrated: 'closed' }));
    expect(screen.getByTestId('unrated-note')).toHaveTextContent(UNRATED_NOTES.closed);
  });
});

describe('a thread that belongs to another account (403)', () => {
  it('shows the message and a New battle action instead of Try again', async () => {
    const newBattle = vi.fn();
    view(
      turn({
        phase: 'error',
        a: null,
        b: null,
        unrated: null,
        error: 'This conversation belongs to another account.',
        errorKind: 'forbidden',
      }),
      newBattle,
    );
    expect(screen.getByRole('alert')).toHaveTextContent(
      'This conversation belongs to another account.',
    );
    expect(screen.queryByRole('button', { name: /Try again/ })).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /New battle/ }));
    expect(newBattle).toHaveBeenCalledOnce();
  });

  it('keeps Try again for other failures', () => {
    view(turn({ phase: 'error', a: null, b: null, unrated: null, error: 'Down.' }));
    expect(screen.getByRole('button', { name: /Try again/ })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /New battle/ })).toBeNull();
  });
});

describe('voteFailure', () => {
  it('stops for 403 and 404, and leaves the bar open for anything else', () => {
    expect(voteFailure(new ApiError({ kind: 'forbidden', status: 403, message: 'x' }))).toEqual({
      closed: true,
      message: UNRATED_NOTES.closed,
    });
    expect(voteFailure(new ApiError({ kind: 'not_found', status: 404, message: 'x' })).closed).toBe(
      true,
    );
    expect(voteFailure(new ApiError({ kind: 'server', status: 500, message: 'x' })).closed).toBe(
      false,
    );
    expect(voteFailure(new Error('boom')).closed).toBe(false);
  });
});
