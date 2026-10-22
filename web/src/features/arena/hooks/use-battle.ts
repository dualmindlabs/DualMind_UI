import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from 'react';

import { useApiClient } from '@/hooks/use-api-client';
import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import {
  ApiError,
  apiKeys,
  createVoteQueue,
  getUserMessage,
  isAbortError,
  isApiErrorKind,
  type QueuedVote,
  toThreadTitle,
  type VoteChoice,
  type VoteQueue,
} from '@/lib/api';
import { resolveDisplayName } from '@/lib/models/display-name';

import { createAttemptTracker } from '../lib/battle-attempt';
import {
  battleReducer,
  type BattleState,
  INITIAL_BATTLE,
  isBusy,
  type LiveTurn,
} from '../lib/battle-machine';
import { FORBIDDEN_THREAD_MESSAGE, UNRATED_NOTES, voteFailure } from '../lib/battle-notes';
import { type ArenaMode, MODE_DETAILS } from '../lib/modes';

/** How long the progressive reveal of a finished answer takes (both panes in parallel). */
export const REVEAL_MS = 1200;

export interface SendOptions {
  mode: ArenaMode;
  /** Model ids (or names) for model1 and model2; null sides are random. */
  pair?: { a: string | null; b: string | null } | null;
  /** The Direct model id, or null for `auto`. */
  directModel?: string | null;
}

export interface BattleApi {
  state: BattleState;
  busy: boolean;
  send: (prompt: string, options: SendOptions) => void;
  vote: (turnId: string, choice: VoteChoice) => void;
  /** Stops the turn in flight: aborts the request, or shows a battle's text at once. */
  stop: () => void;
  /** Shows the progressive reveal's text at once ("Show all"). */
  showAll: (turnId: string) => void;
  /** Leaves the live turns (a new battle, another thread). */
  reset: (threadId?: string | null) => void;
  /** Votes waiting in the offline queue (F-18). */
  pendingVotes: number;
}

let sequence = 0;
const nextId = () => `turn-${Date.now().toString(36)}-${(sequence += 1)}`;

/**
 * Runs battles, Side by side comparisons and Direct chats for the open thread: creates the thread
 * on the first prompt, calls the API (never retried: each call stores a comparison), plays the
 * progressive reveal, sends votes through the offline queue, and announces each state politely.
 */
export function useBattle({
  threadId,
  onThreadCreated,
  announce,
}: {
  threadId: string | null;
  onThreadCreated: (threadId: string) => void;
  announce: (message: string) => void;
}): BattleApi {
  const api = useApiClient();
  const queryClient = useQueryClient();
  const reduce = useShouldReduceMotion();
  const [state, dispatch] = useReducer(battleReducer, INITIAL_BATTLE);
  const controller = useRef<AbortController | null>(null);
  const stateRef = useRef(state);
  // One Idempotency-Key per battle attempt; a retry of the same request reuses it.
  const [attempts] = useState(() => createAttemptTracker());
  const [queue] = useState<VoteQueue>(() => createVoteQueue({ send: vote => api.vote(vote) }));
  const [pending, setPending] = useState<readonly QueuedVote[]>(() => queue.list());

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const unsubscribe = queue.subscribe(setPending);
    const stop = queue.start();
    return () => {
      unsubscribe();
      stop();
    };
  }, [queue]);

  // The reveal of a finished battle: about 1.2 s, instant under reduced motion.
  useEffect(() => {
    const answering = state.turns.filter(
      turn => turn.phase === 'answering' && turn.mode !== 'direct',
    );
    if (answering.length === 0) return;
    const timers = answering.map(turn =>
      window.setTimeout(
        () => {
          dispatch({ type: 'shown', id: turn.id, at: Date.now() });
          announce(
            turn.comparisonId === null
              ? `Both answers are ready. ${UNRATED_NOTES[turn.unrated ?? 'unknown']}`
              : turn.mode === 'battle'
                ? 'Both answers are ready. Vote with 1 for A, 2 for B, 3 for a tie or 4 if both are bad.'
                : 'Both answers are ready.',
          );
        },
        reduce ? 0 : REVEAL_MS,
      ),
    );
    return () => timers.forEach(timer => window.clearTimeout(timer));
  }, [state.turns, reduce, announce]);

  const ensureThread = useCallback(
    async (prompt: string, mode: ArenaMode): Promise<string | null> => {
      const current = stateRef.current.threadId ?? threadId;
      if (current) return current;
      try {
        const thread = await api.createThread({
          title: toThreadTitle(prompt),
          mode: MODE_DETAILS[mode].threadMode,
        });
        // The live turns are the thread's content for now: no fetch that would duplicate them.
        queryClient.setQueryData(apiKeys.threads.messages(thread.threadId), []);
        queryClient.setQueryData(apiKeys.threads.detail(thread.threadId), thread);
        void queryClient.invalidateQueries({ queryKey: apiKeys.threads.lists() });
        dispatch({ type: 'thread', threadId: thread.threadId });
        onThreadCreated(thread.threadId);
        return thread.threadId;
      } catch {
        // Not fatal: the battle still runs, it just is not saved to the history.
        announce('This battle could not be saved to your history.');
        return null;
      }
    },
    [api, queryClient, threadId, onThreadCreated, announce],
  );

  const send = useCallback(
    (prompt: string, options: SendOptions) => {
      if (isBusy(stateRef.current)) return;
      const id = nextId();
      const started = Date.now();
      dispatch({ type: 'submit', id, prompt, mode: options.mode, at: started });
      announce(options.mode === 'direct' ? 'Asking the model.' : 'Asking both models.');
      const abort = new AbortController();
      controller.current = abort;

      void (async () => {
        let thread: string | null = null;
        try {
          thread = await ensureThread(prompt, options.mode);
          if (abort.signal.aborted) return;
          if (options.mode === 'direct') {
            let opened = false;
            for await (const event of api.streamChat(
              {
                prompt,
                model: options.directModel ?? 'auto',
                threadId: thread ?? undefined,
              },
              { signal: abort.signal },
            )) {
              if (!opened) {
                opened = true;
                dispatch({ type: 'stream-start', id, at: Date.now() });
              }
              if (event.type === 'delta') dispatch({ type: 'delta', id, text: event.text });
              else dispatch({ type: 'stream-done', id, usage: event.usage, at: Date.now() });
            }
            if (!opened) dispatch({ type: 'stream-start', id, at: Date.now() });
            dispatch({ type: 'stream-done', id, usage: null, at: Date.now() });
            announce('The answer is complete.');
          } else {
            const request = {
              prompt,
              threadId: thread ?? undefined,
              model1: options.pair?.a ?? undefined,
              model2: options.pair?.b ?? undefined,
            };
            const battle = await api
              .startBattle(
                { ...request, idempotencyKey: attempts.keyFor(request) },
                { signal: abort.signal },
              )
              .catch((error: unknown) => {
                // A stopped call or a refused key (409) starts over with a new key; any other
                // failure keeps it, so Try again with the same prompt cannot make a second battle.
                if (isAbortError(error) || abort.signal.aborted || isConflict(error)) {
                  attempts.settle();
                }
                throw error;
              });
            attempts.settle();
            dispatch({
              type: 'answers',
              id,
              comparisonId: battle.comparisonId,
              fallbackUsed: battle.fallbackUsed,
              a: battle.agent1,
              b: battle.agent2,
              at: Date.now(),
            });
          }
        } catch (error) {
          if (isAbortError(error) || abort.signal.aborted) {
            dispatch({ type: 'stop', id });
            announce('Stopped.');
            return;
          }
          if (isApiErrorKind(error, 'forbidden') && thread !== null) {
            // A stale link to someone else's thread: Try again cannot help, a new battle can.
            dispatch({ type: 'fail', id, message: FORBIDDEN_THREAD_MESSAGE, kind: 'forbidden' });
            announce(FORBIDDEN_THREAD_MESSAGE);
            return;
          }
          dispatch({ type: 'fail', id, message: getUserMessage(error) });
          announce(`The answers did not arrive. ${getUserMessage(error)}`);
        } finally {
          if (controller.current === abort) controller.current = null;
        }
      })();
    },
    [api, ensureThread, announce, attempts],
  );

  const stop = useCallback(() => {
    const turn = stateRef.current.turns.find(
      item => item.phase === 'submitting' || item.phase === 'answering',
    );
    if (!turn) return;
    if (turn.phase === 'submitting' || turn.mode === 'direct') controller.current?.abort();
    else dispatch({ type: 'stop', id: turn.id });
  }, []);

  const showAll = useCallback((turnId: string) => dispatch({ type: 'stop', id: turnId }), []);

  const vote = useCallback(
    (turnId: string, choice: VoteChoice) => {
      const turn = stateRef.current.turns.find(item => item.id === turnId);
      if (!turn || turn.phase !== 'awaiting_vote' || turn.comparisonId === null) return;
      dispatch({ type: 'vote', id: turnId, choice });
      const voteDurationMs = turn.shownAt === null ? undefined : Date.now() - turn.shownAt;
      queue
        .submit({ comparisonId: turn.comparisonId, voteChoice: choice, voteDurationMs })
        .then(result => {
          dispatch({ type: 'voted', id: turnId, queued: result.status === 'queued' });
          announce(revealMessage(turn, choice, result.status === 'queued'));
        })
        .catch((error: unknown) => {
          const failure = voteFailure(error);
          // 403 and 404 are final: close the vote instead of offering the same call again.
          dispatch(
            failure.closed
              ? { type: 'vote-closed', id: turnId }
              : { type: 'vote-failed', id: turnId, message: failure.message },
          );
          announce(failure.closed ? failure.message : `The vote was not saved. ${failure.message}`);
        });
    },
    [queue, announce],
  );

  const reset = useCallback(
    (next: string | null = null) => {
      controller.current?.abort();
      // The live turns are on the server now: the next visit of that thread reads them there.
      const left = stateRef.current.threadId;
      if (left !== null && stateRef.current.turns.length > 0) {
        void queryClient.invalidateQueries({ queryKey: apiKeys.threads.messages(left) });
        void queryClient.invalidateQueries({ queryKey: apiKeys.threads.detail(left) });
      }
      dispatch({ type: 'reset', threadId: next });
    },
    [queryClient],
  );

  const busy = isBusy(state);
  return useMemo(
    () => ({ state, busy, send, vote, stop, showAll, reset, pendingVotes: pending.length }),
    [state, busy, send, vote, stop, showAll, reset, pending.length],
  );
}

const isConflict = (error: unknown) => error instanceof ApiError && error.status === 409;

const CHOICE_WORDS: Record<VoteChoice, string> = {
  left: 'You voted A',
  right: 'You voted B',
  tie: 'You called it a tie',
  'both-bad': 'You said both are bad',
};

function modelTitle(
  model: { name: string; displayName?: string | null | undefined } | null | undefined,
) {
  return model ? resolveDisplayName(model.name, model.displayName) : 'unknown';
}

function revealMessage(turn: LiveTurn, choice: VoteChoice, queued: boolean): string {
  const a = modelTitle(turn.a?.model);
  const b = modelTitle(turn.b?.model);
  const saved = queued
    ? ' Your vote is saved on this device and will be sent when you are back online.'
    : '';
  return `${CHOICE_WORDS[choice]}. Model A was ${a}. Model B was ${b}.${saved}`;
}
