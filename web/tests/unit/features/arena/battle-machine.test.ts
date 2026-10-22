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
      {
        type: 'answers',
        id: 't1',
        comparisonId: 'c1',
        a: answer('A', 'a'),
        b: answer('B', 'b'),
        at: 1,
      },
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
    expect(direct.turns[0]).toMatchObject({
      phase: 'done',
      a: { text: 'Hello', responseTimeMs: 50 },
    });
    expect(namesShown({ mode: 'direct', phase: 'answering' })).toBe(true);
  });

  it('keeps the thread, and resets for a new battle', () => {
    const withThread = run(submitted, { type: 'thread', threadId: 'th' });
    expect(withThread.threadId).toBe('th');
    expect(run(withThread, { type: 'reset' })).toEqual(INITIAL_BATTLE);
    expect(run(withThread, { type: 'reset', threadId: 'x' })).toEqual({ threadId: 'x', turns: [] });
  });
});

describe('a battle that cannot be voted on', () => {
  const submitted = run(INITIAL_BATTLE, {
    type: 'submit',
    id: 't1',
    prompt: 'Hi',
    mode: 'battle',
    at: 0,
  });
  const noVote = (fallbackUsed?: boolean) =>
    run(submitted, {
      type: 'answers',
      id: 't1',
      comparisonId: null,
      ...(fallbackUsed === undefined ? {} : { fallbackUsed }),
      a: answer('A', 'alpha'),
      b: answer('B', 'beta'),
      at: 10,
    });

  it('a backup answer (no comparisonId) is unrated and never waits for a vote', () => {
    const answered = noVote(true);
    expect(answered.turns[0]).toMatchObject({ comparisonId: null, unrated: 'fallback' });
    const shown = run(answered, { type: 'shown', id: 't1', at: 20 });
    expect(shown.turns[0]?.phase).toBe('done');
    expect(turnAwaitingVote(shown)).toBeUndefined();
    expect(isBusy(shown)).toBe(false);
    // Names stay hidden: nothing was rated, and the label would name the wrong model.
    expect(namesShown({ mode: 'battle', phase: shown.turns[0]?.phase ?? 'done' })).toBe(false);
  });

  it('Show all on an unrated battle also ends without a vote', () => {
    const stopped = run(noVote(true), { type: 'stop', id: 't1' });
    expect(stopped.turns[0]?.phase).toBe('done');
  });

  it('a missing id without the fallback flag is unrated as unknown', () => {
    expect(noVote().turns[0]?.unrated).toBe('unknown');
  });

  it('a rated battle is unchanged', () => {
    const answered = run(submitted, {
      type: 'answers',
      id: 't1',
      comparisonId: 'c1',
      a: answer('A', 'alpha'),
      b: answer('B', 'beta'),
      at: 10,
    });
    expect(answered.turns[0]?.unrated).toBeNull();
    expect(run(answered, { type: 'shown', id: 't1', at: 20 }).turns[0]?.phase).toBe('awaiting_vote');
  });

  it('a vote refused for good (403, 404) closes voting instead of reopening it', () => {
    const voting = run(
      submitted,
      {
        type: 'answers',
        id: 't1',
        comparisonId: 'c1',
        a: answer('A', 'alpha'),
        b: answer('B', 'beta'),
        at: 10,
      },
      { type: 'shown', id: 't1', at: 20 },
      { type: 'vote', id: 't1', choice: 'left' },
    );
    const closed = run(voting, { type: 'vote-closed', id: 't1' });
    expect(closed.turns[0]).toMatchObject({ phase: 'done', unrated: 'closed', vote: null });
    expect(turnAwaitingVote(closed)).toBeUndefined();
    // A transient failure still reopens the bar.
    expect(run(voting, { type: 'vote-failed', id: 't1', message: 'x' }).turns[0]?.phase).toBe(
      'awaiting_vote',
    );
  });

  it('a failure can carry a kind for the screen', () => {
    const failed = run(submitted, { type: 'fail', id: 't1', message: 'm', kind: 'forbidden' });
    expect(failed.turns[0]).toMatchObject({ phase: 'error', errorKind: 'forbidden' });
    expect(run(submitted, { type: 'fail', id: 't1', message: 'm' }).turns[0]?.errorKind).toBeNull();
  });
});
