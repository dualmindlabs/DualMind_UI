import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useBattle } from '@/features/arena/hooks/use-battle';
import { ApiClientContext } from '@/hooks/use-api-client';
import { type ApiClient, ApiError, type Battle } from '@/lib/api';

// Idempotency-Key on dualchat (BE-6): one UUID per battle attempt, reused by the retry of the
// same prompt, new when the prompt changes, and gone once a battle has arrived.

const answer = (text: string) => ({
  text,
  model: { id: null, name: 'alpha', displayName: 'Alpha', provider: 'x' },
  usage: null,
  finishReason: null,
  responseTimeMs: 10,
  timestamp: null,
});

const battle = (overrides: Partial<Battle> = {}): Battle => ({
  comparisonId: 'c-1',
  agent1: answer('A'),
  agent2: answer('B'),
  totalResponseTimeMs: null,
  timestamp: null,
  comparison: null,
  fallbackUsed: false,
  ...overrides,
});

function setup() {
  const startBattle = vi.fn<ApiClient['startBattle']>();
  const vote = vi.fn<ApiClient['vote']>();
  const api = {
    createThread: vi.fn(() => Promise.resolve({ threadId: 't-1' })),
    startBattle,
    vote,
  } as unknown as ApiClient;
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient()}>
      <ApiClientContext.Provider value={api}>{children}</ApiClientContext.Provider>
    </QueryClientProvider>
  );
  const hook = renderHook(
    () => useBattle({ threadId: null, onThreadCreated: vi.fn(), announce: vi.fn() }),
    { wrapper },
  );
  const keys = () => startBattle.mock.calls.map(([input]) => input.idempotencyKey);
  const send = async (prompt: string) => {
    act(() => hook.result.current.send(prompt, { mode: 'battle' }));
    // The reveal of a finished battle takes about 1.2 s before the turn is no longer busy.
    await waitFor(() => expect(hook.result.current.busy).toBe(false), { timeout: 4000 });
  };
  return { hook, startBattle, vote, keys, send };
}

const serverError = () => new ApiError({ kind: 'server', status: 503, message: 'down' });

describe('useBattle and the Idempotency-Key', () => {
  it('reuses the key when the same prompt is sent again after a failure', async () => {
    const { startBattle, keys, send } = setup();
    startBattle.mockRejectedValueOnce(serverError()).mockResolvedValueOnce(battle());
    await send('Which is bigger?');
    await send('Which is bigger?');
    const [first, second] = keys();
    expect(first).toMatch(/^[0-9a-f-]{36}$/);
    expect(second).toBe(first);
  });

  it('uses a new key when the prompt changed', async () => {
    const { startBattle, keys, send } = setup();
    startBattle.mockRejectedValueOnce(serverError()).mockRejectedValueOnce(serverError());
    await send('Which is bigger?');
    await send('Which is smaller?');
    const [first, second] = keys();
    expect(second).not.toBe(first);
  });

  it('uses a new key for the same text once a battle has arrived', async () => {
    const { startBattle, keys, send } = setup();
    startBattle.mockResolvedValue(battle());
    await send('Same words');
    await send('Same words');
    const [first, second] = keys();
    expect(second).not.toBe(first);
  });

  it('starts over with a new key after a 409 (key refused)', async () => {
    const { startBattle, keys, send } = setup();
    startBattle
      .mockRejectedValueOnce(new ApiError({ kind: 'validation', status: 409, message: 'reused' }))
      .mockResolvedValueOnce(battle());
    await send('Hello');
    await send('Hello');
    const [first, second] = keys();
    expect(second).not.toBe(first);
  });
});

describe('useBattle and battles that cannot be voted on', () => {
  it('a backup answer (no comparisonId) is unrated and sends no vote', async () => {
    const { hook, startBattle, vote, send } = setup();
    startBattle.mockResolvedValue(battle({ comparisonId: null, fallbackUsed: true }));
    await send('Hello');
    await waitFor(() => expect(hook.result.current.state.turns[0]?.phase).toBe('done'));
    const turn = hook.result.current.state.turns[0];
    expect(turn).toMatchObject({ comparisonId: null, unrated: 'fallback' });
    act(() => hook.result.current.vote(turn?.id ?? '', 'left'));
    expect(vote).not.toHaveBeenCalled();
  });

  it('a 409 on a direct vote shows as counted, not as an error', async () => {
    const { hook, startBattle, vote, send } = setup();
    startBattle.mockResolvedValue(battle());
    await send('Hello');
    await waitFor(() => expect(hook.result.current.state.turns[0]?.phase).toBe('awaiting_vote'));
    const id = hook.result.current.state.turns[0]?.id ?? '';
    vote.mockRejectedValueOnce(new ApiError({ kind: 'validation', status: 409, message: 'dup' }));
    act(() => hook.result.current.vote(id, 'left'));
    await waitFor(() => expect(hook.result.current.state.turns[0]?.phase).toBe('revealed'));
    expect(hook.result.current.state.turns[0]?.error).toBeNull();
    expect(hook.result.current.pendingVotes).toBe(0);
  });

  it('a 404 vote closes voting with a short note and queues nothing', async () => {
    const { hook, startBattle, vote, send } = setup();
    startBattle.mockResolvedValue(battle());
    await send('Hello');
    await waitFor(() => expect(hook.result.current.state.turns[0]?.phase).toBe('awaiting_vote'));
    const id = hook.result.current.state.turns[0]?.id ?? '';
    vote.mockRejectedValue(new ApiError({ kind: 'not_found', status: 404, message: 'gone' }));
    act(() => hook.result.current.vote(id, 'left'));
    await waitFor(() => expect(hook.result.current.state.turns[0]?.phase).toBe('done'));
    expect(hook.result.current.state.turns[0]).toMatchObject({ unrated: 'closed' });
    expect(hook.result.current.pendingVotes).toBe(0);
    expect(vote).toHaveBeenCalledOnce();
  });
});
