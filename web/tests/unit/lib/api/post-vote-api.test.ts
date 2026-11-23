import { describe, expect, it, vi } from 'vitest';

import { createApiClient, createVoteQueue } from '@/lib/api';
import { voteResultSchema } from '@/lib/api/schemas/arena';

import { jsonResponse, scriptedFetch } from './helpers';

const NO_RETRY = { retry: false } as const;
const CMP = '5b2f7a0e-1111-4222-8333-444455556666';
const pathOf = (url: string) => new URL(url, 'https://app.test').pathname;
const client = (fetch: ReturnType<typeof scriptedFetch>['fetch']) =>
  createApiClient({ fetch, getAccessToken: () => 'token-1' });

const KEY = {
  Question: 'What is 17 x 23?',
  Answer: '391',
  Grader: 'numeric',
  Sample: false,
  Sides: [
    { Slot: 1, Correct: true, Extracted: '391' },
    { Slot: 2, Correct: false, Extracted: null },
  ],
};

describe('the vote response and the answer key (Truth vs Taste)', () => {
  it('reads the key whether its fields are PascalCase or camelCase', () => {
    const pascal = voteResultSchema.parse({ success: true, answerKey: KEY });
    expect(pascal).toMatchObject({ answerKey: { answer: '391', sample: false } });
    expect('answerKey' in pascal && pascal.answerKey?.sides).toEqual([
      { slot: 1, correct: true, extracted: '391' },
      { slot: 2, correct: false, extracted: null },
    ]);
    const camel = voteResultSchema.parse({
      success: true,
      answerKey: { question: 'q', answer: '5', grader: 'exact', sample: true, sides: [] },
    });
    expect(camel).toMatchObject({ answerKey: { answer: '5', sample: true } });
  });

  it('has no answerKey field when the response carries none, or a broken one', () => {
    expect(voteResultSchema.parse({ success: true })).not.toHaveProperty('answerKey');
    expect(voteResultSchema.parse({ success: true, answerKey: null })).not.toHaveProperty(
      'answerKey',
    );
    // A malformed key never fails the vote.
    const broken = voteResultSchema.parse({ success: true, answerKey: { Question: 'q' } });
    expect(broken).not.toHaveProperty('answerKey');
    expect(broken.success).toBe(true);
  });

  it('passes the key through the vote queue', async () => {
    const send = vi.fn(async () => voteResultSchema.parse({ success: true, answerKey: KEY }));
    const queue = createVoteQueue({ send, storage: null });
    const result = await queue.submit({ comparisonId: CMP, voteChoice: 'left' });
    expect(result).toMatchObject({ status: 'sent', answerKey: { answer: '391' } });
  });
});

describe('dualchat and allowEvalItem', () => {
  const battleBody = {
    comparisonId: CMP,
    agent1: { message: 'a', prompt: 'What is 17 x 23?', model: { name: 'model-a' } },
    agent2: { message: 'b', prompt: 'What is 17 x 23?', model: { name: 'model-b' } },
  };

  it('sends allowEvalItem only when asked, and reads the echoed prompt', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(battleBody));
    const api = client(fetch);
    const battle = await api.startBattle({ prompt: 'Hi', allowEvalItem: true });
    expect(calls[0]?.body).toMatchObject({ allowEvalItem: true });
    expect(battle.agent1.prompt).toBe('What is 17 x 23?');
    await api.startBattle({ prompt: 'Hi' });
    expect(calls[1]?.body).not.toHaveProperty('allowEvalItem');
  });
});

describe('cross-examine endpoints', () => {
  it('POST critique goes to the comparison, with no body, and reads PascalCase rebuttals', async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse({
        success: true,
        comparisonId: CMP,
        created: true,
        critiques: [
          { Slot: 1, ModelName: 'm1', DisplayName: 'One', Rebuttal: 'It is wrong.', Words: 3 },
          { Slot: 2, ModelName: 'm2', DisplayName: null, Rebuttal: 'Fair.', Words: 1 },
        ],
      }),
    );
    const result = await client(fetch).requestCritique(CMP);
    expect(pathOf(calls[0]?.url ?? '')).toBe(`/api/arena/comparisons/${CMP}/critique`);
    expect(calls[0]?.init.method).toBe('POST');
    expect(result.created).toBe(true);
    expect(result.critiques.map(item => [item.slot, item.rebuttal, item.displayName])).toEqual([
      [1, 'It is wrong.', 'One'],
      [2, 'Fair.', null],
    ]);
  });

  it('POST round2 sends the comparison and the choice, and says whether it flipped', async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse({
        success: true,
        round: 2,
        round1Choice: 'left',
        round2Choice: 'tie',
        flipped: true,
      }),
    );
    const result = await client(fetch).submitRound2Vote({
      comparisonId: CMP,
      voteChoice: 'tie',
      voteDurationMs: 1234.6,
    });
    expect(pathOf(calls[0]?.url ?? '')).toBe('/api/arena/model-vote/round2');
    expect(calls[0]?.body).toEqual({ comparisonId: CMP, voteChoice: 'tie', voteDurationMs: 1235 });
    expect(result).toEqual({ round1Choice: 'left', round2Choice: 'tie', flipped: true });
  });

  it('refuses a vote choice the API would reject, before any request', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({}));
    await expect(
      // @ts-expect-error not a vote choice
      client(fetch).submitRound2Vote({ comparisonId: CMP, voteChoice: 'maybe' }),
    ).rejects.toMatchObject({ kind: 'validation' });
    expect(calls).toHaveLength(0);
  });

  it('stats: null while cross-examine is off (404, 501, 503), data when on, errors surface', async () => {
    for (const status of [404, 501, 503]) {
      const { fetch } = scriptedFetch(jsonResponse({ code: 'FEATURE_DISABLED' }, { status }));
      await expect(client(fetch).getCrossExamineStats(NO_RETRY)).resolves.toBeNull();
    }
    const on = scriptedFetch(
      jsonResponse({
        Enabled: true,
        Method: 'x',
        Overall: { Rounds: 40, Flips: 8, FlipRate: 0.2 },
      }),
    );
    await expect(client(on.fetch).getCrossExamineStats(NO_RETRY)).resolves.toEqual({
      enabled: true,
      overall: { rounds: 40, flips: 8, flipRate: 0.2 },
    });
    const disabled = scriptedFetch(jsonResponse({ Enabled: false, Overall: {} }));
    await expect(client(disabled.fetch).getCrossExamineStats(NO_RETRY)).resolves.toBeNull();
    const broken = scriptedFetch(jsonResponse({ code: 'X' }, { status: 401 }));
    await expect(client(broken.fetch).getCrossExamineStats(NO_RETRY)).rejects.toMatchObject({
      kind: 'auth',
    });
  });
});
