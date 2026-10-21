// Turns the v1 model-stats rows into the v2 leaderboard items (BE-4 design, section 6.4).
// Pure: no I/O, no clock.

import { PROVISIONAL_BELOW, type LeaderboardItem } from '../../../contract/leaderboard.ts';
import { readCount, readNumber, readText, upstreamRowSchema } from '../../../contract/leaderboard-upstream.ts';

export type NormaliseResult = { items: LeaderboardItem[]; dropped: number };

const round1 = (value: number) => Math.round(value * 10) / 10;
const round2 = (value: number) => Math.round(value * 100) / 100;

/** Everything up to the last `/` is a provider prefix (`@cf/meta/llama` -> `llama`). */
function nameWithoutPrefix(modelName: string): string {
  const slash = modelName.lastIndexOf('/');
  return slash === -1 ? modelName : modelName.slice(slash + 1);
}

type Draft = Omit<LeaderboardItem, 'eloRank'> & { upstreamRank: number | undefined };

function toDraft(raw: unknown, provisionalBelow: number): Draft | null {
  const parsed = upstreamRowSchema.safeParse(raw);
  if (!parsed.success) return null;
  const row = parsed.data as Record<string, unknown>;

  const modelId = readText(row, 'modelId');
  const modelName = readText(row, 'modelName');
  const providerName = readText(row, 'providerName');
  const eloScore = readNumber(row, 'eloScore');
  const totalWins = readCount(row, 'totalWins');
  const totalLosses = readCount(row, 'totalLosses');
  const totalTies = readCount(row, 'totalTies');
  const totalResponses = readCount(row, 'totalResponses');
  if (
    modelId === undefined ||
    modelName === undefined ||
    providerName === undefined ||
    eloScore === undefined ||
    totalWins === undefined ||
    totalLosses === undefined ||
    totalTies === undefined ||
    totalResponses === undefined
  ) {
    return null;
  }

  const upstreamWinRate = readNumber(row, 'winRate');
  const winRate =
    upstreamWinRate !== undefined && upstreamWinRate >= 0 && upstreamWinRate <= 100
      ? round2(upstreamWinRate)
      : totalResponses === 0
        ? 0
        : Math.min(100, round2((totalWins / totalResponses) * 100));

  const upstreamRank = readCount(row, 'eloRank');
  return {
    modelId,
    modelName,
    displayName: readText(row, 'displayName') ?? nameWithoutPrefix(modelName),
    providerName,
    eloScore: round1(eloScore),
    totalWins,
    totalLosses,
    totalTies,
    totalResponses,
    winRate,
    provisional: totalResponses < provisionalBelow,
    upstreamRank: upstreamRank !== undefined && upstreamRank >= 1 ? upstreamRank : undefined,
  };
}

export function normaliseModelStats(rawRows: readonly unknown[], provisionalBelow: number = PROVISIONAL_BELOW): NormaliseResult {
  let dropped = 0;
  const byId = new Map<string, Draft>();
  for (const raw of rawRows) {
    const draft = toDraft(raw, provisionalBelow);
    if (!draft) {
      dropped += 1;
      continue;
    }
    const existing = byId.get(draft.modelId);
    if (!existing) {
      byId.set(draft.modelId, draft);
    } else {
      // A duplicate id: keep the row with more responses; the other one is not a valid extra row.
      dropped += 1;
      if (draft.totalResponses > existing.totalResponses) byId.set(draft.modelId, draft);
    }
  }
  const drafts = [...byId.values()];

  const upstreamRanksUsable = drafts.length > 0 && drafts.every(draft => draft.upstreamRank !== undefined);
  const scores = drafts.map(draft => draft.eloScore).sort((a, b) => b - a);
  const items: LeaderboardItem[] = drafts.map(draft => {
    const { upstreamRank, ...fields } = draft;
    // Competition ranking: one more than the number of models with a strictly higher score.
    const recomputed = scores.findIndex(score => score <= draft.eloScore) + 1;
    return { ...fields, eloRank: upstreamRanksUsable ? upstreamRank! : recomputed };
  });

  items.sort((a, b) => a.eloRank - b.eloRank || b.eloScore - a.eloScore || (a.displayName < b.displayName ? -1 : a.displayName > b.displayName ? 1 : 0));
  return { items, dropped };
}
