import { BRAND_PRIMARY_LEAD, BRAND_PRIMARY_VOICE } from '@/content/brand';
import type { ThreadMode } from '@/lib/api';

/**
 * The arena's three modes (design-direction.md section 12): a blind Battle, a named Side by side
 * comparison, and Direct chat with one model. Threads store them as `battle`, `arena` and
 * `direct` (docs/api/endpoints.md section 3.9).
 */
export const ARENA_MODES = ['battle', 'side', 'direct'] as const;

export type ArenaMode = (typeof ARENA_MODES)[number];

export interface ModeDetails {
  label: string;
  /** One line for the palette and the mode switch's description. */
  description: string;
  /** The thread mode the API stores. */
  threadMode: ThreadMode;
  /** The empty state: an eyebrow, a heading with one human-voice phrase, and a line under it. */
  eyebrow: string;
  heading: { plain: string; human: string };
  lead: string;
  placeholder: string;
}

export const MODE_DETAILS: Record<ArenaMode, ModeDetails> = {
  battle: {
    label: 'Battle',
    description: 'Two anonymous models answer; names appear after your vote',
    threadMode: 'battle',
    eyebrow: 'Blind battle',
    heading: { plain: BRAND_PRIMARY_LEAD, human: BRAND_PRIMARY_VOICE },
    lead: 'Ask anything. Two anonymous models answer side by side, and their names stay hidden until you vote.',
    placeholder: 'Ask both models anything',
  },
  side: {
    label: 'Side by side',
    description: 'Pick two models and compare their answers by name',
    threadMode: 'arena',
    eyebrow: 'Side by side',
    heading: { plain: 'Pick two.', human: 'Compare closely.' },
    lead: 'Choose the two models yourself, or leave a side on random. Both answer the same prompt, named from the start.',
    placeholder: 'Ask the two models you picked',
  },
  direct: {
    label: 'Direct',
    description: 'Chat with one model of your choice',
    threadMode: 'direct',
    eyebrow: 'Direct chat',
    heading: { plain: 'One model.', human: 'Your questions.' },
    lead: 'Talk to a single model, picked by you or at random. No vote, just the conversation.',
    placeholder: 'Ask the model anything',
  },
};

/** The arena mode for a stored thread (`arena` is the API's name for side by side). */
export function modeFromThread(mode: ThreadMode): ArenaMode {
  switch (mode) {
    case 'arena':
      return 'side';
    case 'direct':
      return 'direct';
    default:
      return 'battle';
  }
}

export function isArenaMode(value: unknown): value is ArenaMode {
  return typeof value === 'string' && (ARENA_MODES as readonly string[]).includes(value);
}
