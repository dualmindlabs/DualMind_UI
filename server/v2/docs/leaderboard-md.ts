// /leaderboard.md (BE-5 design): the leaderboard as a Markdown table. Pure.

import { AVAILABILITY_LABEL, modelAvailability } from '../../../contract/availability.ts';
import type { LeaderboardResponse } from '../../../contract/leaderboard.ts';

/** Escapes what would break a table cell; newlines and tabs become spaces. */
export function escapeMarkdownCell(text: string): string {
  return text
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/[\\|`*_[\]<>]/g, character => `\\${character}`)
    .trim();
}

/** "preliminary", and what a visitor can do with the model: retired, pick-only, not a chat model. */
function statusOf(item: LeaderboardResponse['items'][number]): string {
  const availability = modelAvailability(item);
  return [item.provisional ? 'preliminary' : '', availability === 'blind' ? '' : AVAILABILITY_LABEL[availability]]
    .filter(Boolean)
    .join(', ');
}

export function renderLeaderboardMarkdown(data: LeaderboardResponse, origin: string): string {
  const { items, meta } = data;
  const lines = [
    '# DualMind Arena leaderboard',
    '',
    `Updated: ${meta.generatedAt}. Ratings are Elo scores computed by the leaderboard service. They are under audit: we are checking that they follow from the recorded blind votes. Models marked "preliminary" have fewer than ${meta.provisionalBelow} battles and have no rank. "retired" models are no longer served, "pick-only" models can be chosen in Side by side but are never drawn for a blind battle, and "not a chat model" marks safety classifiers and adapter bases.`,
    '',
    '| Rank | Model | Provider | Elo | Win rate | Battles | Status |',
    '| ---: | --- | --- | ---: | ---: | ---: | --- |',
    ...items.map(
      item =>
        `| ${item.provisional ? '' : item.eloRank} | ${escapeMarkdownCell(item.displayName)} | ${escapeMarkdownCell(item.providerName)} | ${item.eloScore.toFixed(1)} | ${item.winRate.toFixed(2)}% | ${item.totalResponses} | ${statusOf(item)} |`,
    ),
    '',
    `Data as JSON: ${origin}/api/v2/leaderboard`,
    `API description: ${origin}/api/v2/openapi.json`,
    'Win rate counts ties as non-wins.',
    '',
  ];
  return lines.join('\n');
}
