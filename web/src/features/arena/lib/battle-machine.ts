import type {
  Answer,
  AnswerKey,
  AnswerModel,
  Rebuttal,
  Usage,
  VoteChoice,
  VoteModels,
  VoteReceipt,
} from '@/lib/api';

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

/**
 * Cross-examine after a vote (backend PR 71): ask for the critique round, read each model's
 * rebuttal under the other's answer, optionally vote a second time. `rebuttals` is keyed by the
 * critic's slot (1 behind answer A, 2 behind answer B). The second vote never touches the board.
 */
export interface CrossExamineTurn {
  critique: 'idle' | 'loading' | 'ready' | 'failed';
  rebuttals: Partial<Record<1 | 2, Rebuttal>>;
  /** Why the critique round failed; null otherwise. */
  critiqueMessage: string | null;
  round2: 'idle' | 'voting' | 'done' | 'failed';
  round2Choice: VoteChoice | null;
  /** The second vote differs from the first; null until it is cast. */
  flipped: boolean | null;
  round2Message: string | null;
}

export const NO_CROSS_EXAMINE: CrossExamineTurn = {
  critique: 'idle',
  rebuttals: {},
  critiqueMessage: null,
  round2: 'idle',
  round2Choice: null,
  flipped: null,
  round2Message: null,
};

export interface LiveTurn {
  id: string;
  prompt: string;
  mode: ArenaMode;
  phase: TurnPhase;
  a: LiveAnswer | null;
  /** Null in Direct mode. */
  b: LiveAnswer | null;
  comparisonId: string | null;
  /**
   * Why this battle cannot be voted on, when it cannot: a backup model answered (`fallback`, the
   * API stored no comparison), the answer came without a comparison id (`unknown`), or the API
   * refused the vote for good (`closed`). Null while voting is open or in Direct mode.
   */
  unrated: Unrated | null;
  vote: VoteChoice | null;
  /** The vote is stored in the offline queue and will be sent on reconnect (F-18). */
  votePending: boolean;
  /** The vote's receipt (hash-chain handle) while the API's receipts flag is on, else null. */
  receipt: VoteReceipt | null;
  /** Truth vs Taste: the answer key the vote response carried for an eval battle, else null. */
  answerKey: AnswerKey | null;
  /**
   * Truth vs Taste: the backend asked a question with a known answer in place of `prompt`
   * (`prompt` is then that question). False for an ordinary battle.
   */
  evalQuestion: boolean;
  crossExamine: CrossExamineTurn;
  error: string | null;
  /** What kind of failure `error` is, when the screen offers more than Try again. */
  errorKind: TurnErrorKind | null;
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

export type Unrated = 'fallback' | 'unknown' | 'closed';

export type BattleAction =
  | { type: 'submit'; id: string; prompt: string; mode: ArenaMode; at: number }
  | { type: 'thread'; threadId: string }
  | {
      type: 'answers';
      id: string;
      comparisonId: string | null;
      /** A backup model answered for a side; the battle is not rated. */
      fallbackUsed?: boolean;
      /** The prompt the models were really asked, when the API says (an eval question). */
      askedPrompt?: string | null | undefined;
      a: Answer;
      b: Answer;
      at: number;
    }
  | { type: 'stream-start'; id: string; at: number }
  | { type: 'delta'; id: string; text: string }
  | { type: 'stream-done'; id: string; usage: Usage | null; at: number; model?: AnswerModel | null }
  | { type: 'shown'; id: string; at: number }
  | { type: 'vote'; id: string; choice: VoteChoice }
  | {
      type: 'voted';
      id: string;
      queued: boolean;
      receipt?: VoteReceipt | null;
      answerKey?: AnswerKey | null;
      /** The model names from the vote response, when the backend masks them until then. */
      models?: VoteModels | null;
    }
  | { type: 'critique-start'; id: string }
  | { type: 'critique-done'; id: string; rebuttals: readonly Rebuttal[] }
  | { type: 'critique-failed'; id: string; message: string }
  | { type: 'round2-start'; id: string; choice: VoteChoice }
  | { type: 'round2-done'; id: string; flipped: boolean }
  | { type: 'round2-failed'; id: string; message: string }
  | { type: 'vote-failed'; id: string; message: string }
  /** The API refused the vote for good (403, 404): voting closes, the answers stay. */
  | { type: 'vote-closed'; id: string }
  | { type: 'fail'; id: string; message: string; kind?: TurnErrorKind }
  | { type: 'stop'; id: string }
  | { type: 'reset'; threadId?: string | null };

/**
 * What sort of failure a turn ended with, when the screen offers more than Try again: a thread that
 * belongs to someone else, a rate limit (wait), or a prompt the API will not take (edit it).
 */
export type TurnErrorKind = 'forbidden' | 'rate_limited' | 'validation';

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

/** After the text is shown: a rated battle waits for the vote, an unrated one is simply done. */
function afterReveal(turn: LiveTurn): TurnPhase {
  return turn.comparisonId === null ? 'done' : 'awaiting_vote';
}

/**
 * An eval battle (Truth vs Taste) asks a question the API chose, and says which in each answer's
 * `prompt`. When that differs from what was typed, the turn shows the question that was asked.
 */
function askedInstead(typed: string, asked: string | null | undefined) {
  const real = asked?.trim();
  if (!real || real === typed.trim()) return {};
  return { prompt: real, evalQuestion: true };
}

function rebuttalsBySlot(rebuttals: readonly Rebuttal[]): CrossExamineTurn['rebuttals'] {
  const bySlot: CrossExamineTurn['rebuttals'] = {};
  for (const rebuttal of rebuttals) {
    if (rebuttal.slot === 1 || rebuttal.slot === 2) bySlot[rebuttal.slot] = rebuttal;
  }
  return bySlot;
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
            unrated: null,
            vote: null,
            votePending: false,
            receipt: null,
            answerKey: null,
            evalQuestion: false,
            crossExamine: NO_CROSS_EXAMINE,
            error: null,
            errorKind: null,
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
              ...askedInstead(turn.prompt, action.askedPrompt),
              a: toLive(action.a),
              b: toLive(action.b),
              comparisonId: action.comparisonId,
              unrated:
                action.comparisonId === null
                  ? action.fallbackUsed
                    ? 'fallback'
                    : 'unknown'
                  : null,
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
          : { ...turn, phase: afterReveal(turn), shownAt: action.at },
      );
    case 'vote':
      return update(state, action.id, turn =>
        turn.phase !== 'awaiting_vote' || turn.comparisonId === null
          ? null
          : { ...turn, phase: 'voting', vote: action.choice, error: null },
      );
    case 'voted':
      return update(state, action.id, turn =>
        turn.phase !== 'voting'
          ? null
          : {
              ...turn,
              phase: 'revealed',
              votePending: action.queued,
              receipt: action.receipt ?? null,
              answerKey: action.answerKey ?? null,
              // A masked battle names its models only here; an unmasked one keeps its own.
              a: withModel(turn.a, action.models?.left),
              b: withModel(turn.b, action.models?.right),
            },
      );
    case 'critique-start':
      return update(state, action.id, turn =>
        turn.phase !== 'revealed' || turn.crossExamine.critique === 'loading'
          ? null
          : {
              ...turn,
              crossExamine: { ...turn.crossExamine, critique: 'loading', critiqueMessage: null },
            },
      );
    case 'critique-done':
      return update(state, action.id, turn =>
        turn.phase !== 'revealed'
          ? null
          : {
              ...turn,
              crossExamine: {
                ...turn.crossExamine,
                critique: 'ready',
                critiqueMessage: null,
                rebuttals: rebuttalsBySlot(action.rebuttals),
              },
            },
      );
    case 'critique-failed':
      return update(state, action.id, turn =>
        turn.phase !== 'revealed'
          ? null
          : {
              ...turn,
              crossExamine: {
                ...turn.crossExamine,
                critique: 'failed',
                critiqueMessage: action.message,
              },
            },
      );
    case 'round2-start':
      return update(state, action.id, turn =>
        turn.phase !== 'revealed' ||
        turn.crossExamine.critique !== 'ready' ||
        turn.crossExamine.round2 === 'voting' ||
        turn.crossExamine.round2 === 'done'
          ? null
          : {
              ...turn,
              crossExamine: {
                ...turn.crossExamine,
                round2: 'voting',
                round2Choice: action.choice,
                round2Message: null,
              },
            },
      );
    case 'round2-done':
      return update(state, action.id, turn =>
        turn.crossExamine.round2 !== 'voting'
          ? null
          : {
              ...turn,
              crossExamine: { ...turn.crossExamine, round2: 'done', flipped: action.flipped },
            },
      );
    case 'round2-failed':
      return update(state, action.id, turn =>
        turn.crossExamine.round2 !== 'voting'
          ? null
          : {
              ...turn,
              crossExamine: {
                ...turn.crossExamine,
                round2: 'failed',
                round2Choice: null,
                round2Message: action.message,
              },
            },
      );
    case 'vote-failed':
      return update(state, action.id, turn =>
        turn.phase !== 'voting'
          ? null
          : { ...turn, phase: 'awaiting_vote', vote: null, error: action.message },
      );
    case 'vote-closed':
      return update(state, action.id, turn =>
        turn.phase !== 'voting'
          ? null
          : {
              ...turn,
              phase: 'done',
              vote: null,
              unrated: 'closed',
              comparisonId: null,
              error: null,
            },
      );
    case 'fail':
      return update(state, action.id, turn =>
        !IN_FLIGHT.includes(turn.phase)
          ? null
          : { ...turn, phase: 'error', error: action.message, errorKind: action.kind ?? null },
      );
    case 'stop':
      return update(state, action.id, turn => {
        if (turn.phase === 'submitting') return { ...turn, phase: 'stopped' };
        if (turn.phase !== 'answering') return null;
        // A finished battle answer is shown at once; a stream keeps what arrived.
        if (turn.mode === 'direct') return { ...turn, phase: 'stopped' };
        return { ...turn, phase: afterReveal(turn), shownAt: turn.answeredAt };
      });
  }
}

/** The answer with the vote response's name filled in where the battle response had none. */
function withModel(answer: LiveAnswer | null, model: AnswerModel | undefined): LiveAnswer | null {
  if (!answer || !model || answer.model) return answer;
  return { ...answer, model };
}

/** Names may be shown: always in Side by side and Direct, after the vote in a battle. */
export function namesShown(turn: Pick<LiveTurn, 'mode' | 'phase'>): boolean {
  if (turn.mode !== 'battle') return true;
  return turn.phase === 'revealed';
}
