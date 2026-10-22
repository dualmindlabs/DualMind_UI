/**
 * Data the mock adapter serves, in the API's raw wire format (not the normalised one), so demo
 * mode and tests go through the same schemas as production. Model ids and stats come from the
 * live `GET /api/arena/model-stats` recorded on 2026-10-20 (web/tests/fixtures/api/); answers are
 * canned and say so, because mock content must never pass for a real model answer.
 */

import { LEADERBOARD_SOURCE, PROVISIONAL_BELOW } from '@contract/leaderboard';

export interface MockModelStat {
  modelId: string;
  modelName: string;
  displayName: string;
  providerName: string;
  eloScore: number;
  eloRank: number;
  totalWins: number;
  totalLosses: number;
  totalTies: number;
  totalResponses: number;
  winRate: number;
}

/** Seven rows of the recorded leaderboard (ranks 1, 2, 9, 16, 18, 18 and 36). */
export const MOCK_MODEL_STATS: readonly MockModelStat[] = [
  {
    modelId: 'fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5',
    modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    displayName: 'llama-3.3-70b-instruct-fp8-fast',
    providerName: 'cloudflare',
    eloScore: 1150,
    eloRank: 1,
    totalWins: 62,
    totalLosses: 27,
    totalTies: 9,
    totalResponses: 96,
    winRate: 64.58,
  },
  {
    modelId: '2f2219b0-d1ce-402d-b6d0-29d1e67ef04b',
    modelName: '@cf/meta/llama-3.1-70b-instruct',
    displayName: 'llama-3.1-70b-instruct',
    providerName: 'cloudflare',
    eloScore: 1140,
    eloRank: 2,
    totalWins: 154,
    totalLosses: 55,
    totalTies: 36,
    totalResponses: 250,
    winRate: 61.6,
  },
  {
    modelId: '69a22e49-21bf-4388-88e3-46794e7cbac2',
    modelName: 'groq/compound-mini',
    displayName: 'Compound Mini',
    providerName: 'groq',
    eloScore: 1051,
    eloRank: 9,
    totalWins: 38,
    totalLosses: 43,
    totalTies: 19,
    totalResponses: 101,
    winRate: 38,
  },
  {
    modelId: '1fe310c7-24d1-49a5-a042-2e409e009524',
    modelName: 'gemma-3n-e2b-it',
    displayName: 'Gemma 3n E2B IT',
    providerName: 'google',
    eloScore: 1033,
    eloRank: 16,
    totalWins: 1,
    totalLosses: 2,
    totalTies: 2,
    totalResponses: 6,
    winRate: 20,
  },
  {
    modelId: '3f4c1552-4a43-4540-a18f-5fe825fdcbc2',
    modelName: '@cf/meta/llama-3.2-11b-vision-instruct',
    displayName: 'llama-3.2-11b-vision-instruct',
    providerName: 'cloudflare',
    eloScore: 1030,
    eloRank: 18,
    totalWins: 73,
    totalLosses: 80,
    totalTies: 23,
    totalResponses: 167,
    winRate: 43.71,
  },
  {
    modelId: 'c864b5f3-df07-408b-87b1-bbd6256c6d2f',
    modelName: '@hf/nousresearch/hermes-2-pro-mistral-7b',
    displayName: 'hermes-2-pro-mistral-7b',
    providerName: 'cloudflare',
    eloScore: 1030,
    eloRank: 18,
    totalWins: 98,
    totalLosses: 104,
    totalTies: 18,
    totalResponses: 217,
    winRate: 45.16,
  },
  {
    modelId: 'ca1b0aa7-529f-48a9-8f10-7927f75404b3',
    modelName: 'gemma-3-1b-it',
    displayName: 'Gemma 3 1B IT',
    providerName: 'google',
    eloScore: 1000,
    eloRank: 36,
    totalWins: 0,
    totalLosses: 7,
    totalTies: 0,
    totalResponses: 8,
    winRate: 0,
  },
];

/**
 * A leaderboard row exactly as the live API sends it: every field again in snake_case, plus the
 * aliases `elo_rating`, `elo`, `total_matches`, `matches` and `wins`.
 */
export function toWireModelStat(stat: MockModelStat): Record<string, unknown> {
  return {
    ...stat,
    model_id: stat.modelId,
    model_name: stat.modelName,
    display_name: stat.displayName,
    provider_name: stat.providerName,
    elo_rating: stat.eloScore,
    elo: stat.eloScore,
    total_matches: stat.totalResponses,
    matches: stat.totalResponses,
    wins: stat.totalWins,
    win_rate: stat.winRate,
  };
}

/** `GET /api/models` items (same models as the leaderboard rows). */
export const MOCK_MODELS = MOCK_MODEL_STATS.map(stat => ({
  modelId: stat.modelId,
  modelName: stat.modelName,
  displayName: stat.displayName,
  providerName: stat.providerName,
  isFree: true,
  status: 'active',
}));

export const MOCK_FEATURE_FLAGS: Readonly<Record<string, boolean>> = {
  public_sharing: true,
};

export const MOCK_USER = {
  user_id: '00000000-0000-4000-8000-000000000001',
  email: 'demo@dualmindlab.tech',
  name: 'Demo visitor',
  avatar_url: null,
  role: 'user',
  energy_balance: 100,
};

export const DEMO_NOTICE = 'Demo mode: this answer is canned, no model was called.';

function quote(prompt: string): string {
  const line = prompt.replace(/\s+/g, ' ').trim();
  return line.length > 120 ? `${line.slice(0, 120)}...` : line;
}

/** The two canned battle answers: different lengths and styles, like two real models. */
export function demoAnswers(prompt: string): [string, string] {
  return [
    `${DEMO_NOTICE}\n\nYou asked: "${quote(prompt)}"\n\nIn a real battle two models answer this in parallel, without their names, and you pick the better answer.`,
    `${DEMO_NOTICE}\n\n1. Your prompt arrived: "${quote(prompt)}"\n2. Two anonymous models would answer it side by side.\n3. You vote, then both names are revealed and the leaderboard moves.`,
  ];
}

export function demoChatAnswer(prompt: string): string {
  return `${DEMO_NOTICE}\n\nYou asked: "${quote(prompt)}". In Direct Chat one model answers, streamed as it writes.`;
}

/** The v2 leaderboard body (`GET /api/v2/leaderboard`, contract/leaderboard.ts) for the same rows. */
export function toV2Leaderboard(stats: readonly MockModelStat[]) {
  return {
    items: stats.map(stat => ({
      ...stat,
      provisional: stat.totalResponses < PROVISIONAL_BELOW,
    })),
    meta: {
      generatedAt: '2026-10-20T18:00:00.000Z',
      count: stats.length,
      provisionalBelow: PROVISIONAL_BELOW,
      source: LEADERBOARD_SOURCE,
    },
  };
}
