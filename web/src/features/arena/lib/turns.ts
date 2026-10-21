import type { ThreadMessage, VoteChoice } from '@/lib/api';

import type { ArenaMode } from './modes';

/** One answer of a past turn, as the panes show it. */
export interface PaneData {
  text: string;
  /** The model's `modelName` from the thread, or null when the thread does not say. */
  modelName: string | null;
  timeMs: number | null;
}

/** One prompt and its answers, rebuilt from a stored thread message. */
export interface TurnData {
  id: string;
  /** 1-based position in the thread. */
  number: number;
  prompt: string;
  a: PaneData;
  /** Null for a Direct chat turn (one answer). */
  b: PaneData | null;
  comparisonId: string | null;
  /** The visitor's own vote on this battle, if any. */
  vote: VoteChoice | null;
  /** Model names are shown: always in Side by side and Direct, after the vote in a battle. */
  revealed: boolean;
}

function pane(text: string, modelName: string | null, timeMs: number | null): PaneData {
  return { text, modelName: modelName?.trim() || null, timeMs };
}

/**
 * Turns from `GET /api/threads/{id}/messages` (oldest first; endpoints.md section 3.9). Rows are
 * battle-shaped in every mode: a Direct thread's rows carry the answer in the first slot, so a
 * row with no second answer is shown as a single pane.
 */
export function toTurns(messages: readonly ThreadMessage[], mode: ArenaMode): TurnData[] {
  return [...messages]
    .sort((x, y) => x.position - y.position)
    .map((message, index) => {
      const single =
        mode === 'direct' || (message.model2Response === '' && !message.model2Name?.trim());
      return {
        id: message.messageId,
        number: index + 1,
        prompt: message.promptText,
        a: pane(message.model1Response, message.model1Name, message.model1TimeMs),
        b: single ? null : pane(message.model2Response, message.model2Name, message.model2TimeMs),
        comparisonId: message.comparisonId,
        vote: message.voteChoice,
        revealed: mode !== 'battle' || message.hasVoted,
      };
    });
}

/** The words a reader sees for a vote. */
export const VOTE_LABELS: Record<VoteChoice, string> = {
  left: 'A is better',
  right: 'B is better',
  tie: 'Tie',
  'both-bad': 'Both are bad',
};

/** "1.8 s", "640 ms", or null. */
export function formatDuration(ms: number | null | undefined): string | null {
  if (ms === null || ms === undefined || !Number.isFinite(ms) || ms < 0) return null;
  if (ms < 1000) return `${Math.round(ms)} ms`;
  const seconds = ms / 1000;
  return `${seconds < 10 ? seconds.toFixed(1) : Math.round(seconds).toString()} s`;
}

/** Words in a text, for the "312 words" meta (Markdown syntax is not counted as words). */
export function countWords(text: string): number {
  const words = text
    .replace(/```[\s\S]*?```/g, ' code ')
    .replace(/[#>*_`~|[\]()-]/g, ' ')
    .split(/\s+/)
    .filter(word => /[\p{L}\p{N}]/u.test(word));
  return words.length;
}
