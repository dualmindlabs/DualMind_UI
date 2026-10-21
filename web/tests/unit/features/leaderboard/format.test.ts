import { describe, expect, it } from 'vitest';

import {
  formatClock,
  formatCount,
  formatElo,
  formatEloDelta,
  formatOrdinal,
  formatPercent,
  formatRank,
  pluralize,
  providerLabel,
} from '@/features/leaderboard';

describe('leaderboard formatters', () => {
  it('writes Elo as a whole number without a thousands separator', () => {
    expect(formatElo(1150)).toBe('1150');
    expect(formatElo(1149.6)).toBe('1150');
    expect(formatElo(909.4)).toBe('909');
    expect(formatElo(12_345)).toBe('12345');
  });

  it('signs rating differences, except zero', () => {
    expect(formatEloDelta(-10)).toBe('-10');
    expect(formatEloDelta(12.4)).toBe('+12');
    expect(formatEloDelta(0)).toBe('0');
  });

  it('reads win rates as 0-100 percentages with one decimal', () => {
    expect(formatPercent(64.58)).toBe('64.6%');
    expect(formatPercent(0)).toBe('0.0%');
    expect(formatPercent(100)).toBe('100.0%');
    expect(formatPercent(33.333)).toBe('33.3%');
  });

  it('groups counts and pads ranks to two digits', () => {
    expect(formatCount(7152)).toBe('7,152');
    expect(formatCount(96)).toBe('96');
    expect(formatRank(1)).toBe('01');
    expect(formatRank(18)).toBe('18');
    expect(formatRank(120)).toBe('120');
  });

  it('pluralizes nouns with grouped counts', () => {
    expect(pluralize(1, 'battle')).toBe('1 battle');
    expect(pluralize(0, 'battle')).toBe('0 battles');
    expect(pluralize(1200, 'battle')).toBe('1,200 battles');
    expect(pluralize(2, 'other model')).toBe('2 other models');
  });

  it('writes English ordinals', () => {
    expect([1, 2, 3, 4, 11, 12, 13, 21, 22, 23, 53].map(formatOrdinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
      '23rd',
      '53rd',
    ]);
  });

  it('formats a time of day', () => {
    expect(formatClock(Date.UTC(2026, 9, 21, 12, 4))).toMatch(/\d{1,2}:04/);
  });

  it('names providers for people', () => {
    expect(providerLabel('cloudflare')).toBe('Cloudflare');
    expect(providerLabel(' GROQ ')).toBe('Groq');
    expect(providerLabel('google')).toBe('Google');
    expect(providerLabel('openai')).toBe('OpenAI');
    expect(providerLabel('together')).toBe('Together');
    expect(providerLabel('')).toBe('Unknown');
  });
});
