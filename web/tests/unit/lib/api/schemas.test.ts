import { describe, expect, it } from 'vitest';

import {
  answerSchema,
  battleSchema,
  streamEventSchema,
  voteResultSchema,
} from '@/lib/api/schemas/arena';
import { listOf, mutationResultSchema, numeric, toSnakeCase } from '@/lib/api/schemas/common';
import { featureFlagSchema } from '@/lib/api/schemas/flags';
import { healthSchema } from '@/lib/api/schemas/health';
import { leaderboardSchema, modelStatSchema } from '@/lib/api/schemas/leaderboard';
import { modelListSchema } from '@/lib/api/schemas/models';
import {
  threadListSchema,
  threadMessageListSchema,
  threadSchema,
  visibilityResultSchema,
} from '@/lib/api/schemas/threads';
import { userProfileSchema } from '@/lib/api/schemas/users';

import chat from '../../../fixtures/api/chat.json';
import dualchat from '../../../fixtures/api/dualchat.json';
import featureFlag from '../../../fixtures/api/feature-flag.recorded.json';
import health from '../../../fixtures/api/health.recorded.json';
import modelStats from '../../../fixtures/api/model-stats.recorded.json';
import models from '../../../fixtures/api/models.json';
import mutation from '../../../fixtures/api/mutation.json';
import thread from '../../../fixtures/api/thread.json';
import threadMessages from '../../../fixtures/api/thread-messages.json';
import threads from '../../../fixtures/api/threads.json';
import usersSync from '../../../fixtures/api/users-sync.json';
import visibility from '../../../fixtures/api/visibility.json';
import vote from '../../../fixtures/api/vote.json';

const MODEL_STAT_KEYS = [
  'displayName',
  'eloRank',
  'eloScore',
  'modelId',
  'modelName',
  'providerName',
  'totalLosses',
  'totalResponses',
  'totalTies',
  'totalWins',
  'winRate',
];

describe('common helpers', () => {
  it('converts camelCase to snake_case', () => {
    expect(toSnakeCase('eloScore')).toBe('elo_score');
    expect(toSnakeCase('agent1MessageLength')).toBe('agent1_message_length');
  });

  it('accepts numbers and numeric strings only', () => {
    expect(numeric.parse(64.58)).toBe(64.58);
    expect(numeric.parse(' 12 ')).toBe(12);
    expect(numeric.parse('-1.5e2')).toBe(-150);
    for (const bad of ['', 'abc', '12px', NaN, Infinity, null, true]) {
      expect(numeric.safeParse(bad).success, String(bad)).toBe(false);
    }
  });

  it('unwraps { items }, { data } and bare arrays', () => {
    const schema = listOf(numeric);
    expect(schema.parse({ items: [1, '2'] })).toEqual([1, 2]);
    expect(schema.parse({ data: [3] })).toEqual([3]);
    expect(schema.parse([4])).toEqual([4]);
    expect(schema.safeParse({ items: 'nope' }).success).toBe(false);
    expect(schema.safeParse(null).success).toBe(false);
  });

  it('reads an empty mutation body as success', () => {
    expect(mutationResultSchema.parse(null)).toEqual({ success: true, message: null });
    expect(mutationResultSchema.parse('')).toEqual({ success: true, message: null });
    expect(mutationResultSchema.parse(mutation)).toEqual({
      success: true,
      message: 'Thread updated',
    });
    expect(mutationResultSchema.parse({ success: 'false', message: '' })).toEqual({
      success: false,
      message: null,
    });
  });
});

describe('health (recorded)', () => {
  it('parses the live response', () => {
    expect(healthSchema.parse(health)).toEqual({
      status: 'healthy',
      healthy: true,
      message: 'DualMind API is running',
      timestamp: health.timestamp,
      version: '1.0.0',
      instanceId: health.instanceId,
    });
  });

  it('reports anything but "healthy" as not healthy', () => {
    expect(healthSchema.parse({ status: 'degraded' })).toMatchObject({
      healthy: false,
      version: null,
    });
    expect(healthSchema.safeParse({}).success).toBe(false);
  });
});

describe('leaderboard (recorded model-stats with duplicate casing)', () => {
  const rows = leaderboardSchema.parse(modelStats);

  it('keeps every row, in rank order, with camelCase keys only', () => {
    expect(rows).toHaveLength(modelStats.items.length);
    expect(rows.map(row => row.eloRank)).toEqual([1, 2, 9, 16, 18, 18, 36]);
    for (const row of rows) expect(Object.keys(row).sort()).toEqual(MODEL_STAT_KEYS);
  });

  it('keeps the values the API sent', () => {
    expect(rows[0]).toEqual({
      modelId: 'fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5',
      modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      displayName: 'Llama 3.3 70B Instruct (FP8, fast)',
      providerName: 'cloudflare',
      eloScore: 1150,
      eloRank: 1,
      totalWins: 62,
      totalLosses: 27,
      totalTies: 9,
      totalResponses: 96,
      winRate: 64.58,
    });
    expect(new Set(rows.map(row => row.providerName))).toEqual(
      new Set(['cloudflare', 'groq', 'google']),
    );
  });

  it('reads the snake_case duplicates and aliases when the camelCase fields are gone', () => {
    // Every camelCase field the live API also sends in snake_case or as an alias.
    const duplicated = new Set([
      'modelId',
      'modelName',
      'displayName',
      'providerName',
      'eloScore',
      'totalResponses',
      'totalWins',
      'winRate',
    ]);
    const withoutCamel = modelStats.items.map(item =>
      Object.fromEntries(Object.entries(item).filter(([key]) => !duplicated.has(key))),
    );
    expect(leaderboardSchema.parse({ items: withoutCamel })).toEqual(rows);
    expect(leaderboardSchema.parse(withoutCamel)).toEqual(rows);
  });

  it('accepts numeric strings, derives a missing display name and win rate', () => {
    const row = modelStatSchema.parse({
      model_id: 'id-1',
      model_name: '@cf/meta/llama-3-8b-instruct',
      provider: 'cloudflare',
      elo: '1001.5',
      rank: '7',
      wins: '3',
      total_matches: '4',
    });
    expect(row).toMatchObject({
      displayName: 'Llama 3 8B Instruct',
      eloScore: 1001.5,
      eloRank: 7,
      totalWins: 3,
      totalLosses: 0,
      totalResponses: 4,
      winRate: 75,
    });
  });

  it('rejects rows without the fields a ranking needs', () => {
    expect(
      modelStatSchema.safeParse({ modelName: 'x', providerName: 'y', eloScore: 1, eloRank: 1 })
        .success,
    ).toBe(false);
    expect(
      modelStatSchema.safeParse({ ...modelStats.items[0], eloRank: 0, elo_rank: 0 }).success,
    ).toBe(false);
    expect(
      modelStatSchema.safeParse({ ...modelStats.items[0], winRate: 140, win_rate: 140 }).success,
    ).toBe(false);
  });
});

describe('models', () => {
  it('normalises the list, including snake_case and string flags', () => {
    const list = modelListSchema.parse(models);
    expect(list).toHaveLength(3);
    expect(list[0]).toEqual({
      modelId: 'fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5',
      modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      displayName: 'Llama 3.3 70B Instruct (FP8, fast)',
      providerName: 'cloudflare',
      isFree: true,
      status: 'active',
    });
    expect(list[2]).toEqual({
      modelId: '1fe310c7-24d1-49a5-a042-2e409e009524',
      modelName: 'gemma-3n-e2b-it',
      displayName: 'Gemma 3n E2B IT',
      providerName: 'google',
      isFree: false,
      status: 'active',
    });
  });
});

describe('arena', () => {
  it('normalises a battle and both answers', () => {
    const battle = battleSchema.parse(dualchat);
    expect(battle.comparisonId).toBe(dualchat.comparisonId);
    expect(battle.agent1).toEqual({
      text: dualchat.agent1.message,
      model: {
        id: null,
        name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
        displayName: 'llama-3.3-70b-instruct-fp8-fast',
        provider: 'cloudflare',
      },
      usage: { promptTokens: 9, completionTokens: 15, totalTokens: 24 },
      finishReason: null,
      responseTimeMs: 1834,
      timestamp: '2026-10-20T20:41:38.000Z',
    });
    // agent2 sends snake_case usage and a numeric string time, and no output.content.
    expect(battle.agent2).toMatchObject({
      text: dualchat.agent2.message,
      usage: { promptTokens: 9, completionTokens: 14, totalTokens: 23 },
      responseTimeMs: 2210,
    });
    expect(battle.comparison).toMatchObject({ winnerByLength: 'agent1', agent1Tokens: 15 });
    expect(battle.totalResponseTimeMs).toBe(2210);
    expect(Object.keys(battle)).not.toContain('arena');
  });

  it('drops a broken comparison block instead of failing the battle', () => {
    const battle = battleSchema.parse({ ...dualchat, arena: { comparison: 'oops' } });
    expect(battle.comparison).toBeNull();
    expect(battleSchema.parse({ ...dualchat, arena: undefined }).comparison).toBeNull();
  });

  it('fails a battle without a comparisonId or an answer', () => {
    expect(battleSchema.safeParse({ ...dualchat, comparisonId: '' }).success).toBe(false);
    expect(battleSchema.safeParse({ ...dualchat, agent2: null }).success).toBe(false);
  });

  it('reads the answer text from output_text parts, then message, then text', () => {
    expect(answerSchema.parse(chat)).toMatchObject({
      text: 'Recursion is a function calling itself.',
      finishReason: 'stop',
      usage: { totalTokens: 12 },
    });
    expect(answerSchema.parse({ message: 'from message' }).text).toBe('from message');
    expect(answerSchema.parse({ text: 'from text' }).text).toBe('from text');
    expect(answerSchema.parse({ output: { content: [] }, message: '' }).text).toBe('');
  });

  it('accepts a model sent as a plain name, and drops a malformed one', () => {
    expect(answerSchema.parse({ message: 'x', model: 'groq/compound' }).model).toEqual({
      id: null,
      name: 'groq/compound',
      displayName: null,
      provider: null,
    });
    expect(answerSchema.parse({ message: 'x', model: 42, usage: 'n/a' })).toMatchObject({
      model: null,
      usage: null,
    });
  });

  it('parses the vote answer', () => {
    expect(voteResultSchema.parse(vote)).toEqual({ success: true, message: 'Vote recorded' });
  });

  it('parses stream events', () => {
    expect(
      streamEventSchema.parse({ object: 'ai.stream.delta', delta: { type: 'text', text: 'Hi' } }),
    ).toEqual({ object: 'ai.stream.delta', delta: 'Hi' });
    expect(
      streamEventSchema.parse({ object: 'ai.stream.done', finish_reason: 'length', usage: null }),
    ).toEqual({ object: 'ai.stream.done', finishReason: 'length', usage: null });
    expect(streamEventSchema.parse({ object: 'ai.error', code: 'STREAM_ERROR' })).toEqual({
      object: 'ai.error',
      code: 'STREAM_ERROR',
      message: null,
      timestamp: null,
    });
    expect(streamEventSchema.safeParse({ object: 'ai.stream.delta' }).success).toBe(false);
  });
});

describe('threads', () => {
  it('parses a thread', () => {
    expect(threadSchema.parse(thread)).toEqual(thread);
  });

  it('normalises aliases, nulls and unknown enum values on the safe side', () => {
    const [, legacy] = threadListSchema.parse(threads);
    expect(legacy).toEqual({
      threadId: 'a1b2c3d4-0000-4000-8000-000000000002',
      userId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
      title: 'Untitled',
      mode: 'battle',
      visibility: 'private',
      messageCount: 0,
      createdAt: '2026-10-18T09:00:00Z',
      updatedAt: null,
    });
  });

  it('normalises messages, including the caller vote', () => {
    const [first, second] = threadMessageListSchema.parse(threadMessages);
    expect(first).toMatchObject({
      messageId: 'm-1',
      position: 0,
      voteChoice: 'left',
      hasVoted: true,
    });
    expect(second).toEqual({
      messageId: 'm-2',
      threadId: thread.threadId,
      position: 1,
      promptText: 'And for tests?',
      model1Name: 'llama-3.3-70b-instruct-fp8-fast',
      model2Name: 'Compound Mini',
      model1Response: 'Test behaviour, not lines.',
      model2Response: '',
      model1TimeMs: 912,
      model2TimeMs: null,
      comparisonId: '9e8d7c6b-5a49-4382-9170-6f5e4d3c2b1a',
      voteChoice: null,
      hasVoted: false,
      createdAt: '2026-10-19T10:05:00Z',
    });
    // A vote choice implies hasVoted even when the flag is missing.
    expect(
      threadMessageListSchema.parse([{ messageId: 'm-3', voteChoice: 'tie' }])[0]?.hasVoted,
    ).toBe(true);
  });

  it('parses the visibility answer', () => {
    expect(visibilityResultSchema.parse(visibility)).toEqual({
      success: true,
      message: 'Visibility updated',
      visibility: 'public',
    });
    expect(visibilityResultSchema.parse(null)).toEqual({
      success: true,
      message: null,
      visibility: undefined,
    });
  });
});

describe('users', () => {
  const expected = {
    userId: '7c9e6679-7425-40de-944b-e07fc1f90ae7',
    email: 'ada@example.com',
    name: 'Ada Lovelace',
    avatarUrl: null,
    role: 'tester',
    energyBalance: 42,
  };

  it('reads the sync response wrapped in { user }', () => {
    expect(userProfileSchema.parse(usersSync)).toEqual(expected);
  });

  it('reads every wrapper the legacy client handled', () => {
    const user = usersSync.user;
    for (const shape of [user, [user], { items: [user] }, { data: [user] }, { data: user }]) {
      expect(userProfileSchema.parse(shape), JSON.stringify(shape).slice(0, 40)).toEqual(expected);
    }
    expect(userProfileSchema.parse({ id: 'u-1', credits: 'many' })).toMatchObject({
      userId: 'u-1',
      energyBalance: null,
    });
  });
});

describe('feature flags (recorded)', () => {
  it('parses the live flag and string booleans', () => {
    expect(featureFlagSchema.parse(featureFlag)).toEqual({ key: 'public_sharing', enabled: true });
    expect(featureFlagSchema.parse({ key: 'x', enabled: 'false' }).enabled).toBe(false);
    expect(featureFlagSchema.parse({ key: 'x' }).enabled).toBe(false);
    expect(featureFlagSchema.safeParse({ enabled: true }).success).toBe(false);
  });
});
