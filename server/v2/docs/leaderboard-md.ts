// /leaderboard.md (BE-5 design): the leaderboard as a Markdown table. Pure.

import type { LeaderboardResponse } from '../../../contract/leaderboard.ts';

/** Escapes what would break a table cell; newlines and tabs become spaces. */
export function escapeMarkdownCell(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\\|`*_[\]<>]/g, character => `\\${character}`)
    .trim();
}

export function renderLeaderboardMarkdown(data: LeaderboardResponse, origin: string): string {
  const { items, meta } = data;
  const lines = [
    '# DualMind Arena leaderboard',
    '',
    `Updated: ${meta.generatedAt}. Ratings are Elo scores from blind head-to-head votes. Models marked "preliminary" have fewer than ${meta.provisionalBelow} battles.`,
    '',
    '| Rank | Model | Provider | Elo | Win rate | Battles | Status |',
    '| ---: | --- | --- | ---: | ---: | ---: | --- |',
    ...items.map(
      item =>
        `| ${item.eloRank} | ${escapeMarkdownCell(item.displayName)} | ${escapeMarkdownCell(item.providerName)} | ${item.eloScore.toFixed(1)} | ${item.winRate.toFixed(2)}% | ${item.totalResponses} | ${item.provisional ? 'preliminary' : ''} |`,
    ),
    '',
    `Data as JSON: ${origin}/api/v2/leaderboard`,
    `API description: ${origin}/api/v2/openapi.json`,
    'Win rate counts ties as non-wins.',
    '',
  ];
  return lines.join('\n');
}
