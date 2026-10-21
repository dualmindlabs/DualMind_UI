import {
  DEMO_BATTLES,
  type DemoBattle,
  type DemoSide,
  RESULT_MESSAGES,
  REVEAL_LABELS,
} from '../content/demo';

/**
 * The recorded demo battle as a small state machine, the same shape as the arena's battle flow
 * (design-direction.md section 10) without the network:
 *
 *   voting --play--> streaming --streamed | skip--> voting --vote--> revealed --next--> streaming
 *
 * The prerendered page starts in `voting` with both answers on screen (readable without
 * JavaScript); the demo plays the first time it scrolls into view, or when the hero sends a
 * prompt. Pure functions only: the timing lives in hooks/use-demo-battle.ts.
 */

/** The four verdicts, in their on-screen order. */
export type DemoVote = 'a' | 'tie' | 'bad' | 'b';

export type DemoPhase = 'streaming' | 'voting' | 'revealed';

export interface DemoState {
  /** Which recorded battle is on screen (index into DEMO_BATTLES). */
  index: number;
  phase: DemoPhase;
  vote: DemoVote | null;
  /**
   * The prompt the visitor typed in the hero. Only real models can answer it (after sign-in), so
   * the demo shows it next to a recorded battle and never pretends to answer it.
   */
  asked: string | null;
  /** Counts plays, so a replay of the same battle restarts the reveal; 0 until the first play. */
  run: number;
}

export type DemoEvent =
  | { type: 'play'; index?: number; asked?: string | null; instant?: boolean }
  | { type: 'streamed' }
  | { type: 'skip' }
  | { type: 'vote'; choice: DemoVote }
  | { type: 'next'; instant?: boolean };

export const initialDemoState: DemoState = {
  index: 0,
  phase: 'voting',
  vote: null,
  asked: null,
  run: 0,
};

export const VOTE_OPTIONS: ReadonlyArray<{ id: DemoVote; label: string; shortcut: string }> = [
  { id: 'a', label: 'A is better', shortcut: '1' },
  { id: 'tie', label: 'Tie', shortcut: '3' },
  { id: 'bad', label: 'Both are bad', shortcut: '4' },
  { id: 'b', label: 'B is better', shortcut: '2' },
];

const KEY_TO_VOTE: Readonly<Record<string, DemoVote>> = {
  '1': 'a',
  '2': 'b',
  '3': 'tie',
  '4': 'bad',
};

export function battleAt(index: number, battles: readonly DemoBattle[] = DEMO_BATTLES): DemoBattle {
  const count = battles.length;
  const battle = battles[((index % count) + count) % count];
  if (!battle) throw new Error('The demo needs at least one recorded battle.');
  return battle;
}

export function demoReducer(state: DemoState, event: DemoEvent): DemoState {
  switch (event.type) {
    case 'play': {
      const index = event.index ?? state.index;
      return {
        index: ((index % DEMO_BATTLES.length) + DEMO_BATTLES.length) % DEMO_BATTLES.length,
        phase: event.instant ? 'voting' : 'streaming',
        vote: null,
        asked: event.asked === undefined ? state.asked : event.asked,
        run: state.run + 1,
      };
    }
    case 'streamed':
    case 'skip':
      return state.phase === 'streaming' ? { ...state, phase: 'voting' } : state;
    case 'vote':
      return state.phase === 'voting' ? { ...state, phase: 'revealed', vote: event.choice } : state;
    case 'next':
      return demoReducer(
        { ...state, asked: null },
        { type: 'play', index: state.index + 1, instant: event.instant ?? false },
      );
    default:
      return state;
  }
}

/** The vote a key stands for inside the demo (1 A, 2 B, 3 tie, 4 both bad), or null. */
export function voteForKey(key: string): DemoVote | null {
  return KEY_TO_VOTE[key] ?? null;
}

export function voteLabel(vote: DemoVote): string {
  return VOTE_OPTIONS.find(option => option.id === vote)?.label ?? vote;
}

export function answerFor(battle: DemoBattle, side: DemoSide): string {
  return battle.crispSide === side ? battle.crisp : battle.padded;
}

/** What the reveal shows in a pane header: what the answer was doing (never a model name). */
export function revealLabelFor(battle: DemoBattle, side: DemoSide): string {
  return battle.crispSide === side ? REVEAL_LABELS.crisp : REVEAL_LABELS.padded;
}

export function resultFor(battle: DemoBattle, vote: DemoVote): string {
  if (vote === 'tie') return RESULT_MESSAGES.tie;
  if (vote === 'bad') return RESULT_MESSAGES.bad;
  return vote === battle.crispSide ? RESULT_MESSAGES.crisp : RESULT_MESSAGES.padded;
}

/** The recorded battle whose prompt the visitor typed (ignoring case and spacing), or null. */
export function findBattleIndex(prompt: string): number | null {
  const normalise = (text: string) =>
    text
      .trim()
      .replace(/\s+/g, ' ')
      .replace(/[?.!]+$/, '')
      .toLowerCase();
  const wanted = normalise(prompt);
  const index = DEMO_BATTLES.findIndex(battle => normalise(battle.prompt) === wanted);
  return index === -1 ? null : index;
}

/**
 * The polite live-region message for a state: what changed, said once. Empty before the first
 * play, so nothing is announced while the page loads.
 */
export function announcementFor(state: DemoState): string {
  const battle = battleAt(state.index);
  const position = `Prompt ${state.index + 1} of ${DEMO_BATTLES.length}`;
  if (state.phase === 'streaming') {
    return `Recorded demo. ${position}: ${battle.prompt}. Two answers are appearing.`;
  }
  if (state.phase === 'voting') {
    return state.run === 0
      ? ''
      : 'Both answers are ready. Vote with the buttons, or press 1 to 4: 1 for A, 2 for B, 3 for a tie, 4 if both are bad.';
  }
  if (state.vote === null) return '';
  return [
    `You voted: ${voteLabel(state.vote)}.`,
    `Answer A: ${revealLabelFor(battle, 'a')}.`,
    `Answer B: ${revealLabelFor(battle, 'b')}.`,
    resultFor(battle, state.vote),
  ].join(' ');
}

/** How many words of an answer are on screen after `elapsed` ms at `wordsPerSecond`. */
export function visibleWordCount(total: number, elapsed: number, wordsPerSecond: number): number {
  if (elapsed <= 0) return 0;
  return Math.min(total, Math.floor((elapsed / 1000) * wordsPerSecond));
}

/**
 * The reading pace: both panes appear in parallel and the longer one finishes in about 1.4 s
 * (design-direction.md section 6, rule 5: a quick progressive reveal, no fake typing).
 */
export function revealPace(longestWordCount: number, targetMs = 1400): number {
  return Math.max(1, longestWordCount) / (targetMs / 1000);
}
