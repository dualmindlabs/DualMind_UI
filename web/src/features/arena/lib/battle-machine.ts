import type { Answer, AnswerModel, Usage, VoteChoice } from '@/lib/api';

import type { ArenaMode } from './modes';

/**
 * The battle state machine (design-direction.md section 10), pure and unit-tested. One turn moves
 *
 *   submitting -> answering -> awaiting_vote -> voting -> revealed
 *        \-> error            \-> (a follow-up turn starts on the same pair)
 *
 * Side by side skips the blind part (names are known; the vote is optional), and Direct streams
 * one answer: submitting -> answering (deltas) -> done. Any turn in flight can be stopped.
 * The battle endpoint returns both answers at once, so `answering` is the readable progressive
 * reveal of finished text (about 1.2 s per pane, both in parallel), skipped under reduced motion
 * or with "Show all".
 */

export type TurnPhase =
  | 'submitting'
  | 'answering'
  | 'awaiting_vote'
  | 'voting'
  | 'revealed'
  | 'done'
  | 'stopped'
  | 'error';

export interface LiveAnswer {
  text: string;
  model: AnswerModel | null;
  responseTimeMs: number | null;
  usage: Usage | null;
}

export interface LiveTurn {
  id: string;
  prompt: string;
  mode: ArenaMode;
  phase: TurnPhase;
  a: LiveAnswer | null;
  /** Null in Direct mode. */
  b: LiveAnswer | null;
  comparisonId: string | null;
  vote: VoteChoice | null;
  /** The vote is stored in the offline queue and will be sent on reconnect (F-18). */
  votePending: boolean;
  error: string | null;
  /** Epoch ms: sent, answers arrived (or the stream started), text fully shown. */
  sentAt: number;
  answeredAt: number | null;
  shownAt: number | null;
}

export interface BattleState {
  /** The thread the live turns belong to (created on the first send). */
  threadId: string | null;
  turns: LiveTurn[];
}

export type BattleAction =
  | { type: 'submit'; id: string; prompt: string; mode: ArenaMode; at: number }
  | { type: 'thread'; threadId: string }
  | {
      type: 'answers';
      id: string;
      comparisonId: string;
      a: Answer;
      b: Answer;
      at: number;
    }
  | { type: 'stream-start'; id: string; at: number }
  | { type: 'delta'; id: string; text: string }
  | { type: 'stream-done'; id: string; usage: Usage | null; at: number; model?: AnswerModel | null }
  | { type: 'shown'; id: string; at: number }
  | { type: 'vote'; id: string; choice: VoteChoice }
  | { type: 'voted'; id: string; queued: boolean }
  | { type: 'vote-failed'; id: string; message: string }
  | { type: 'fail'; id: string; message: string }
  | { type: 'stop'; id: string }
  | { type: 'reset'; threadId?: string | null };

export const INITIAL_BATTLE: BattleState = { threadId: null, turns: [] };

function toLive(answer: Answer): LiveAnswer {
  return {
    text: answer.text,
    model: answer.model,
    responseTimeMs: answer.responseTimeMs,
    usage: answer.usage,
  };
}

function update(
  state: BattleState,
  id: string,
  change: (turn: LiveTurn) => LiveTurn | null,
): BattleState {
  let changed = false;
  const turns = state.turns.map(turn => {
    if (turn.id !== id) return turn;
    const next = change(turn);
    if (next === null || next === turn) return turn;
    changed = true;
    return next;
  });
  return changed ? { ...state, turns } : state;
}

const IN_FLIGHT: readonly TurnPhase[] = ['submitting', 'answering'];

/** True while a turn is being answered: the composer shows Stop instead of Send. */
export function isBusy(state: BattleState): boolean {
  return state.turns.some(turn => IN_FLIGHT.includes(turn.phase));
}

/** The turn waiting for the visitor's vote, if any (the newest one). */
export function turnAwaitingVote(state: BattleState): LiveTurn | undefined {
  return [...state.turns].reverse().find(turn => turn.phase === 'awaiting_vote');
}

export function battleReducer(state: BattleState, action: BattleAction): BattleState {
  switch (action.type) {
    case 'reset':
      return { threadId: action.threadId ?? null, turns: [] };
    case 'thread':
      return state.threadId === action.threadId ? state : { ...state, threadId: action.threadId };
    case 'submit':
      if (isBusy(state)) return state;
      return {
        ...state,
        turns: [
          ...state.turns,
          {
            id: action.id,
            prompt: action.prompt,
            mode: action.mode,
            phase: 'submitting',
            a: null,
            b: null,
            comparisonId: null,
            vote: null,
            votePending: false,
            error: null,
            sentAt: action.at,
            answeredAt: null,
            shownAt: null,
          },
        ],
      };
    case 'answers':
      return update(state, action.id, turn =>
        turn.phase !== 'submitting'
          ? null
          : {
              ...turn,
              phase: 'answering',
              a: toLive(action.a),
              b: toLive(action.b),
              comparisonId: action.comparisonId,
              answeredAt: action.at,
            },
      );
    case 'stream-start':
      return update(state, action.id, turn =>
        turn.phase !== 'submitting'
          ? null
          : {
              ...turn,
              phase: 'answering',
              a: { text: '', model: null, responseTimeMs: null, usage: null },
              answeredAt: action.at,
            },
      );
    case 'delta':
      return update(state, action.id, turn =>
        turn.phase !== 'answering' || turn.a === null
          ? null
          : { ...turn, a: { ...turn.a, text: turn.a.text + action.text } },
      );
    case 'stream-done':
      return update(state, action.id, turn =>
        turn.phase !== 'answering' || turn.a === null
          ? null
          : {
              ...turn,
              phase: 'done',
              a: {
                ...turn.a,
                usage: action.usage,
                model: action.model ?? turn.a.model,
                responseTimeMs: action.at - turn.sentAt,
              },
              shownAt: action.at,
            },
      );
    case 'shown':
      return update(state, action.id, turn =>
        turn.phase !== 'answering' || turn.mode === 'direct'
          ? null
          : { ...turn, phase: 'awaiting_vote', shownAt: action.at },
      );
    case 'vote':
      return update(state, action.id, turn =>
        turn.phase !== 'awaiting_vote' || turn.comparisonId === null
          ? null
          : { ...turn, phase: 'voting', vote: action.choice, error: null },
      );
    case 'voted':
      return update(state, action.id, turn =>
        turn.phase !== 'voting' ? null : { ...turn, phase: 'revealed', votePending: action.queued },
      );
    case 'vote-failed':
      return update(state, action.id, turn =>
        turn.phase !== 'voting'
          ? null
          : { ...turn, phase: 'awaiting_vote', vote: null, error: action.message },
      );
    case 'fail':
      return update(state, action.id, turn =>
        !IN_FLIGHT.includes(turn.phase) ? null : { ...turn, phase: 'error', error: action.message },
      );
    case 'stop':
      return update(state, action.id, turn => {
        if (turn.phase === 'submitting') return { ...turn, phase: 'stopped' };
        if (turn.phase !== 'answering') return null;
        // A finished battle answer is shown at once; a stream keeps what arrived.
        if (turn.mode === 'direct') return { ...turn, phase: 'stopped' };
        return { ...turn, phase: 'awaiting_vote', shownAt: turn.answeredAt };
      });
  }
}

/** Names may be shown: always in Side by side and Direct, after the vote in a battle. */
export function namesShown(turn: Pick<LiveTurn, 'mode' | 'phase'>): boolean {
  if (turn.mode !== 'battle') return true;
  return turn.phase === 'revealed';
}
