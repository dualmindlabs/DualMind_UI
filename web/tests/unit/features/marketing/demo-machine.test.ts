import { describe, expect, it } from 'vitest';

import { DEMO_BATTLES, DEMO_LABEL, RESULT_MESSAGES } from '@/features/marketing/content/demo';
import {
  announcementFor,
  answerFor,
  battleAt,
  demoReducer,
  type DemoState,
  findBattleIndex,
  initialDemoState,
  resultFor,
  revealLabelFor,
  revealPace,
  visibleWordCount,
  VOTE_OPTIONS,
  voteForKey,
} from '@/features/marketing/lib/demo-machine';

const play = (
  state: DemoState = initialDemoState,
  extra: Partial<{ index: number; asked: string | null; instant: boolean }> = {},
) => demoReducer(state, { type: 'play', ...extra });

describe('demo battle state machine', () => {
  it('starts ready to vote, with both answers on screen and nothing to announce', () => {
    expect(initialDemoState).toEqual({
      index: 0,
      phase: 'voting',
      vote: null,
      asked: null,
      run: 0,
    });
    expect(announcementFor(initialDemoState)).toBe('');
  });

  it('plays: streaming, then voting when the answers are in (or skipped)', () => {
    const streaming = play();
    expect(streaming).toMatchObject({ phase: 'streaming', run: 1, vote: null });
    expect(demoReducer(streaming, { type: 'streamed' }).phase).toBe('voting');
    expect(demoReducer(streaming, { type: 'skip' }).phase).toBe('voting');
    // Already voting: nothing to finish.
    const voting = demoReducer(streaming, { type: 'skip' });
    expect(demoReducer(voting, { type: 'streamed' })).toBe(voting);
  });

  it('plays instantly under reduced motion', () => {
    expect(play(initialDemoState, { instant: true })).toMatchObject({ phase: 'voting', run: 1 });
  });

  it('only takes a vote once both answers are in, and only one vote', () => {
    const streaming = play();
    expect(demoReducer(streaming, { type: 'vote', choice: 'a' })).toBe(streaming);
    const voting = demoReducer(streaming, { type: 'streamed' });
    const revealed = demoReducer(voting, { type: 'vote', choice: 'b' });
    expect(revealed).toMatchObject({ phase: 'revealed', vote: 'b' });
    expect(demoReducer(revealed, { type: 'vote', choice: 'a' })).toBe(revealed);
  });

  it('moves to the next battle, wraps around and forgets the visitor’s prompt', () => {
    let state = play(initialDemoState, { asked: 'Write me a poem' });
    expect(state.asked).toBe('Write me a poem');
    for (let step = 1; step <= DEMO_BATTLES.length; step += 1) {
      state = demoReducer(state, { type: 'next' });
      expect(state.index).toBe(step % DEMO_BATTLES.length);
      expect(state.asked).toBeNull();
      expect(state.phase).toBe('streaming');
    }
    expect(state.run).toBe(DEMO_BATTLES.length + 1);
    expect(demoReducer(state, { type: 'next', instant: true }).phase).toBe('voting');
  });

  it('plays a chosen battle and keeps the index in range', () => {
    expect(play(initialDemoState, { index: 2 }).index).toBe(2);
    expect(play(initialDemoState, { index: DEMO_BATTLES.length + 1 }).index).toBe(1);
    expect(play(initialDemoState, { index: -1 }).index).toBe(DEMO_BATTLES.length - 1);
    expect(battleAt(-1)).toBe(DEMO_BATTLES[DEMO_BATTLES.length - 1]);
  });

  it('maps keys 1 to 4 to A, B, tie and both bad', () => {
    expect(voteForKey('1')).toBe('a');
    expect(voteForKey('2')).toBe('b');
    expect(voteForKey('3')).toBe('tie');
    expect(voteForKey('4')).toBe('bad');
    expect(voteForKey('5')).toBeNull();
    expect(voteForKey('a')).toBeNull();
    expect(VOTE_OPTIONS.map(option => option.label)).toEqual([
      'A is better',
      'Tie',
      'Both are bad',
      'B is better',
    ]);
    for (const option of VOTE_OPTIONS) expect(voteForKey(option.shortcut)).toBe(option.id);
  });

  it('reveals what each answer was doing, never a model name', () => {
    for (const battle of DEMO_BATTLES) {
      const crisp = battle.crispSide;
      const padded = crisp === 'a' ? 'b' : 'a';
      expect(answerFor(battle, crisp)).toBe(battle.crisp);
      expect(answerFor(battle, padded)).toBe(battle.padded);
      expect(revealLabelFor(battle, crisp)).toBe('Answered the question');
      expect(revealLabelFor(battle, padded)).toBe('Sounded good, said little');
      expect(resultFor(battle, crisp)).toBe(RESULT_MESSAGES.crisp);
      expect(resultFor(battle, padded)).toBe(RESULT_MESSAGES.padded);
      expect(resultFor(battle, 'tie')).toBe(RESULT_MESSAGES.tie);
      expect(resultFor(battle, 'bad')).toBe(RESULT_MESSAGES.bad);
    }
    expect(DEMO_LABEL).toBe('Recorded demo, answers written for illustration');
  });

  it('announces each change once, in plain words', () => {
    const streaming = play();
    expect(announcementFor(streaming)).toBe(
      `Recorded demo. Prompt 1 of ${DEMO_BATTLES.length}: ${DEMO_BATTLES[0]?.prompt}. Two answers are appearing.`,
    );
    const voting = demoReducer(streaming, { type: 'streamed' });
    expect(announcementFor(voting)).toMatch(/^Both answers are ready\. .*press 1 to 4/);
    const revealed = demoReducer(voting, { type: 'vote', choice: 'tie' });
    expect(announcementFor(revealed)).toBe(
      `You voted: Tie. Answer A: Sounded good, said little. Answer B: Answered the question. ${RESULT_MESSAGES.tie}`,
    );
  });

  it('matches a typed prompt to its recorded battle, ignoring case, spacing and the final mark', () => {
    expect(findBattleIndex('why do AI benchmarks   stop being useful')).toBe(0);
    expect(findBattleIndex('  Explain quantum entanglement simply!  ')).toBe(1);
    expect(findBattleIndex('Give me a one-line definition of an API?')).toBe(2);
    expect(findBattleIndex('Write a haiku about merge conflicts')).toBeNull();
  });

  it('reveals words at a reading pace: both panes in parallel, about 1.4 s for the longer one', () => {
    const pace = revealPace(70);
    expect(pace).toBe(50);
    expect(visibleWordCount(70, 0, pace)).toBe(0);
    expect(visibleWordCount(70, 700, pace)).toBe(35);
    expect(visibleWordCount(70, 1400, pace)).toBe(70);
    expect(visibleWordCount(20, 1400, pace)).toBe(20);
    expect(visibleWordCount(70, 99_999, pace)).toBe(70);
  });
});
