import { describe, expect, it } from 'vitest';

import {
  battleReducer,
  type BattleState,
  INITIAL_BATTLE,
  type LiveTurn,
} from '@/features/arena/lib/battle-machine';
import type { Answer, AnswerKey, Rebuttal } from '@/lib/api';

const answer = (name: string): Answer => ({
  text: 'x',
  model: { id: null, name, displayName: name, provider: 'hidden' },
  usage: null,
  finishReason: null,
  responseTimeMs: 10,
  timestamp: null,
});

const KEY: AnswerKey = {
  question: 'q',
  answer: '391',
  grader: 'numeric',
  sample: false,
  sides: [{ slot: 1, correct: true, extracted: '391' }],
};

const rebuttal = (slot: number): Rebuttal => ({
  slot,
  modelName: `m${slot}`,
  displayName: `Model ${slot}`,
  rebuttal: `reply ${slot}`,
  words: 2,
});

function run(state: BattleState, ...actions: Parameters<typeof battleReducer>[1][]) {
  return actions.reduce(battleReducer, state);
}

const turnOf = (state: BattleState): LiveTurn => {
  const turn = state.turns[0];
  if (!turn) throw new Error('no turn');
  return turn;
};

const answered = (askedPrompt?: string | null) =>
  run(
    INITIAL_BATTLE,
    { type: 'submit', id: 't', prompt: 'My own question', mode: 'battle', at: 0 },
    {
      type: 'answers',
      id: 't',
      comparisonId: 'c-1',
      askedPrompt,
      a: answer('model-a'),
      b: answer('model-b'),
      at: 1,
    },
    { type: 'shown', id: 't', at: 2 },
  );

const voted = (key: AnswerKey | null = null) =>
  run(
    answered(),
    { type: 'vote', id: 't', choice: 'left' },
    { type: 'voted', id: 't', queued: false, answerKey: key },
  );

describe('Truth vs Taste in the battle state', () => {
  it('keeps the typed prompt when the API echoes the same one, or none', () => {
    expect(turnOf(answered()).evalQuestion).toBe(false);
    expect(turnOf(answered(null)).prompt).toBe('My own question');
    expect(turnOf(answered('  My own question ')).evalQuestion).toBe(false);
  });

  it('shows the question that was really asked when the API ran its own', () => {
    const turn = turnOf(answered('What is 17 x 23?'));
    expect(turn.prompt).toBe('What is 17 x 23?');
    expect(turn.evalQuestion).toBe(true);
  });

  it('stores the answer key from the vote, and none for an ordinary vote', () => {
    expect(turnOf(voted(KEY)).answerKey).toEqual(KEY);
    expect(turnOf(voted()).answerKey).toBeNull();
  });

  it('never has a key before the vote', () => {
    expect(turnOf(answered('What is 17 x 23?')).answerKey).toBeNull();
  });
});

describe('cross-examine in the battle state', () => {
  it('goes idle -> loading -> ready, with the rebuttals by critic slot', () => {
    const state = run(
      voted(),
      { type: 'critique-start', id: 't' },
      { type: 'critique-done', id: 't', rebuttals: [rebuttal(2), rebuttal(1)] },
    );
    const cross = turnOf(state).crossExamine;
    expect(cross.critique).toBe('ready');
    expect(cross.rebuttals[1]?.rebuttal).toBe('reply 1');
    expect(cross.rebuttals[2]?.rebuttal).toBe('reply 2');
  });

  it('ignores a critique before the vote is in', () => {
    const state = run(answered(), { type: 'critique-start', id: 't' });
    expect(turnOf(state).crossExamine.critique).toBe('idle');
  });

  it('does not start a second critique while one is running', () => {
    const once = run(voted(), { type: 'critique-start', id: 't' });
    expect(run(once, { type: 'critique-start', id: 't' })).toBe(once);
  });

  it('a failed critique can be asked again', () => {
    const failed = run(
      voted(),
      { type: 'critique-start', id: 't' },
      { type: 'critique-failed', id: 't', message: 'Try again.' },
    );
    expect(turnOf(failed).crossExamine).toMatchObject({
      critique: 'failed',
      critiqueMessage: 'Try again.',
    });
    expect(turnOf(run(failed, { type: 'critique-start', id: 't' })).crossExamine.critique).toBe(
      'loading',
    );
  });

  it('the second vote needs the critique, is cast once, and records whether it flipped', () => {
    const ready = run(
      voted(),
      { type: 'critique-start', id: 't' },
      { type: 'critique-done', id: 't', rebuttals: [rebuttal(1), rebuttal(2)] },
    );
    expect(
      turnOf(run(voted(), { type: 'round2-start', id: 't', choice: 'right' })).crossExamine.round2,
    ).toBe('idle');
    const casting = run(ready, { type: 'round2-start', id: 't', choice: 'right' });
    expect(turnOf(casting).crossExamine).toMatchObject({ round2: 'voting', round2Choice: 'right' });
    // A double click is not a second vote.
    expect(run(casting, { type: 'round2-start', id: 't', choice: 'tie' })).toBe(casting);
    const done = run(casting, { type: 'round2-done', id: 't', flipped: true });
    expect(turnOf(done).crossExamine).toMatchObject({ round2: 'done', flipped: true });
    expect(run(done, { type: 'round2-start', id: 't', choice: 'tie' })).toBe(done);
  });

  it('a failed second vote can be tried again, and the first vote is untouched', () => {
    const failed = run(
      voted(),
      { type: 'critique-start', id: 't' },
      { type: 'critique-done', id: 't', rebuttals: [rebuttal(1), rebuttal(2)] },
      { type: 'round2-start', id: 't', choice: 'tie' },
      { type: 'round2-failed', id: 't', message: 'Nope.' },
    );
    const turn = turnOf(failed);
    expect(turn.crossExamine).toMatchObject({ round2: 'failed', round2Choice: null });
    expect(turn.vote).toBe('left');
    expect(
      turnOf(run(failed, { type: 'round2-start', id: 't', choice: 'tie' })).crossExamine.round2,
    ).toBe('voting');
  });
});
