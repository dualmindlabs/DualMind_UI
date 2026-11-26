import { modelAvailability } from '@contract/availability';
import { describe, expect, it } from 'vitest';

import { type Availability, toLeaderboard } from '@/features/leaderboard';
import { leaderboardSchema } from '@/lib/api/schemas/leaderboard';

import board from '../../../fixtures/api/model-stats.board.recorded.json';
import { fullBoard } from './helpers';

// Which models a visitor can meet in a blind battle (cycle 5 P1-1), on the recorded 53-model board.

const availabilityOf = (modelName: string): Availability | undefined =>
  fullBoard.entries.find(entry => entry.modelName === modelName)?.availability;

describe('modelAvailability', () => {
  it('lets the API flags decide when they are sent', () => {
    const base = {
      modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
      providerName: 'cloudflare',
    };
    expect(modelAvailability(base)).toBe('pick-only');
    expect(modelAvailability({ ...base, blindEligible: true })).toBe('blind');
    expect(modelAvailability({ modelName: 'gemma-3-27b-it', providerName: 'google' })).toBe(
      'blind',
    );
    expect(
      modelAvailability({
        modelName: 'gemma-3-27b-it',
        providerName: 'google',
        blindEligible: false,
      }),
    ).toBe('pick-only');
    expect(
      modelAvailability({ modelName: 'gemma-3-27b-it', providerName: 'google', active: false }),
    ).toBe('retired');
    expect(modelAvailability({ ...base, active: false, blindEligible: true })).toBe('retired');
    expect(modelAvailability({ ...base, active: true })).toBe('pick-only');
  });

  it('marks safety classifiers and adapter bases as not chat models', () => {
    for (const modelName of [
      '@cf/meta/llama-guard-3-8b',
      '@cf/google/gemma-7b-it-lora',
      '@cf/mistral/mistral-7b-instruct-v0.2-lora',
      '@cf/meta-llama/llama-2-7b-chat-hf-lora',
      '@cf/google/gemma-2b-it-lora',
    ]) {
      expect(modelAvailability({ modelName, providerName: 'cloudflare' }), modelName).toBe(
        'not-chat',
      );
    }
  });
});

describe('the recorded board, by what a visitor can do with each model', () => {
  const count = (kind: Availability) =>
    fullBoard.entries.filter(entry => entry.availability === kind).length;

  it('has 53 models: 34 Cloudflare ones are never drawn blind, and the retired ones are marked', () => {
    expect(fullBoard.entries).toHaveLength(53);
    // Retired: 15 Cloudflare ids, 4 Groq ids already known, 3 more Groq ones, 2 Google ones.
    expect(count('retired')).toBe(24);
    expect(count('not-chat')).toBe(5);
    // 34 Cloudflare models, minus 15 retired and 5 not-chat: 14 pick-only.
    expect(count('pick-only')).toBe(14);
    expect(count('blind')).toBe(10);
    expect(fullBoard.entries.filter(entry => entry.retired)).toHaveLength(24);
  });

  it('labels the rows the red-team named', () => {
    expect(availabilityOf('@cf/meta/llama-3.1-70b-instruct')).toBe('retired');
    expect(availabilityOf('@cf/meta/llama-3.3-70b-instruct-fp8-fast')).toBe('pick-only');
    expect(availabilityOf('@cf/meta/llama-guard-3-8b')).toBe('not-chat');
    expect(availabilityOf('groq/compound')).toBe('retired');
    expect(availabilityOf('qwen/qwen3-32b')).toBe('retired');
    expect(availabilityOf('gemini-2.0-flash')).toBe('retired');
    expect(availabilityOf('openai/gpt-oss-120b')).toBe('blind');
    expect(availabilityOf('gemma-3-27b-it')).toBe('blind');
  });

  it('the blind slice holds only blind models, ranked among themselves', () => {
    const { blind } = fullBoard;
    expect(blind.entries.every(entry => entry.availability === 'blind')).toBe(true);
    expect(blind.summary.models).toBe(count('blind'));
    expect(blind.rated.map(entry => entry.rank).slice(0, 3)).toEqual([1, 2, 3]);
    expect(blind.rated.every(entry => entry.platform !== 'cloudflare')).toBe(true);
    // The whole board is untouched, and the usable slice adds the pick-only models.
    expect(fullBoard.summary.models).toBe(53);
    expect(fullBoard.usable.summary.models).toBe(count('blind') + count('pick-only'));
    expect(fullBoard.usable.entries.some(entry => entry.availability === 'retired')).toBe(false);
    expect(fullBoard.usable.entries.some(entry => entry.availability === 'not-chat')).toBe(false);
  });

  it('never crowns a pick-only model in the default view', () => {
    const leader = fullBoard.blind.rated[0];
    expect(leader?.availability).toBe('blind');
    expect(fullBoard.entries[0]?.availability).toBe('pick-only');
  });

  it('moves with the API flags when they arrive: blindEligible: true brings a Cloudflare model in', () => {
    const stats = leaderboardSchema
      .parse(board)
      .map(stat =>
        stat.modelName === '@cf/meta/llama-3.3-70b-instruct-fp8-fast'
          ? { ...stat, blindEligible: true }
          : stat,
      );
    const flagged = toLeaderboard(stats);
    expect(flagged.blind.entries.map(entry => entry.modelName)).toContain(
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    );
    expect(flagged.blind.entries).toHaveLength(fullBoard.blind.entries.length + 1);
  });
});
