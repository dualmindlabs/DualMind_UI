import { describe, expect, it } from 'vitest';

import {
  battleReducer,
  type BattleState,
  INITIAL_BATTLE,
  isBusy,
  namesShown,
  turnAwaitingVote,
} from '@/features/arena/lib/battle-machine';
import type { Answer } from '@/lib/api';

const answer = (text: string, name: string): Answer => ({
  text,
  model: { id: null, name, displayName: name, provider: 'groq' },
  usage: { promptTokens: 1, completionTokens: 2, totalTokens: 3 },
  finishReason: null,
  responseTimeMs: 1200,
  timestamp: null,
});

function run(state: BattleState, ...actions: Parameters<typeof battleReducer>[1][]) {
  return actions.reduce(battleReducer, state);
}

describe('battle state machine', () => {
  const submitted = run(INITIAL_BATTLE, {
    type: 'submit',
    id: 't1',
    prompt: 'Hi',
    mode: 'battle',
    at: 0,
  });

  it('submitting -> answering -> awaiting_vote -> voting -> revealed', () => {
    expect(submitted.turns[0]?.phase).toBe('submitting');
    expect(isBusy(submitted)).toBe(true);
    const answered = run(submitted, {
      type: 'answers',
      id: 't1',
      comparisonId: 'c1',
      a: answer('A', 'alpha'),
      b: answer('B', 'beta'),
      at: 10,
    });
    expect(answered.turns[0]?.phase).toBe('answering');
    const shown = run(answered, { type: 'shown', id: 't1', at: 20 });
    expect(shown.turns[0]?.phase).toBe('awaiting_vote');
    expect(isBusy(shown)).toBe(false);
    expect(turnAwaitingVote(shown)?.id).toBe('t1');
    expect(namesShown(shown.turns[0] ?? { mode: 'battle', phase: 'idle' as never })).toBe(false);
    const voting = run(shown, { type: 'vote', id: 't1', choice: 'left' });
    expect(voting.turns[0]?.phase).toBe('voting');
    const revealed = run(voting, { type: 'voted', id: 't1', queued: true });
    expect(revealed.turns[0]).toMatchObject({ phase: 'revealed', vote: 'left', votePending: true });
    expect(namesShown(revealed.turns[0] ?? { mode: 'battle', phase: 'idle' as never })).toBe(true);
  });

  it('a failed vote goes back to awaiting the vote, with the message', () => {
    const state = run(
      submitted,
      { type: 'answers', id: 't1', comparisonId: 'c1', a: answer('A', 'a'), b: answer('B', 'b'), at: 1 },
      { type: 'shown', id: 't1', at: 2 },
      { type: 'vote', id: 't1', choice: 'tie' },
      { type: 'vote-failed', id: 't1', message: 'Nope' },
    );
    expect(state.turns[0]).toMatchObject({ phase: 'awaiting_vote', vote: null, error: 'Nope' });
  });

  it('ignores a second submit while busy, and errors end the turn', () => {
    const twice = run(submitted, {
      type: 'submit',
      id: 't2',
      prompt: 'Again',
      mode: 'battle',
      at: 1,
    });
    expect(twice.turns).toHaveLength(1);
    const failed = run(submitted, { type: 'fail', id: 't1', message: 'Offline' });
    expect(failed.turns[0]).toMatchObject({ phase: 'error', error: 'Offline' });
    expect(isBusy(failed)).toBe(false);
  });

  it('stop: aborts a request, or shows a battle at once', () => {
    expect(run(submitted, { type: 'stop', id: 't1' }).turns[0]?.phase).toBe('stopped');
    const answering = run(submitted, {
      type: 'answers',
      id: 't1',
      comparisonId: 'c1',
      a: answer('A', 'a'),
      b: answer('B', 'b'),
      at: 5,
    });
    expect(run(answering, { type: 'stop', id: 't1' }).turns[0]?.phase).toBe('awaiting_vote');
  });

  it('streams Direct answers and ends them', () => {
    const direct = run(
      INITIAL_BATTLE,
      { type: 'submit', id: 'd1', prompt: 'Hi', mode: 'direct', at: 0 },
      { type: 'stream-start', id: 'd1', at: 5 },
      { type: 'delta', id: 'd1', text: 'Hel' },
      { type: 'delta', id: 'd1', text: 'lo' },
      { type: 'stream-done', id: 'd1', usage: null, at: 50 },
    );
    expect(direct.turns[0]).toMatchObject({ phase: 'done', a: { text: 'Hello', responseTimeMs: 50 } });
    expect(namesShown({ mode: 'direct', phase: 'answering' })).toBe(true);
  });

  it('keeps the thread, and resets for a new battle', () => {
    const withThread = run(submitted, { type: 'thread', threadId: 'th' });
    expect(withThread.threadId).toBe('th');
    expect(run(withThread, { type: 'reset' })).toEqual(INITIAL_BATTLE);
    expect(run(withThread, { type: 'reset', threadId: 'x' })).toEqual({ threadId: 'x', turns: [] });
  });
});
