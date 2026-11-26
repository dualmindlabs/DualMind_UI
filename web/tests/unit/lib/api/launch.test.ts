import { describe, expect, it } from 'vitest';

import { guestBattleMessage } from '@/features/marketing/components/guest-battle';
import { ApiError, createApiClient, NO_PUBLIC_CONFIG, quotaQuery } from '@/lib/api';

import { jsonResponse, scriptedFetch } from './helpers';

// Cycle 2: the endpoints behind the guest battle and the private arena (contract with the
// backend, tmp/contract.md), and what the UI says for each failure.

const battle = {
  comparisonId: 'c1',
  agent1: { message: 'Answer one' },
  agent2: { message: 'Answer two' },
};

function client(...replies: Parameters<typeof scriptedFetch>) {
  const { fetch, calls } = scriptedFetch(...replies);
  return { api: createApiClient({ baseUrl: '', fetch, getAccessToken: () => 'token-1' }), calls };
}

describe('getPublicConfig', () => {
  it('reads the three fields, off when missing', async () => {
    const { api, calls } = client(
      jsonResponse({ guestBattle: true, privateArena: false, turnstileSiteKey: '0x4AAA' }),
    );
    await expect(api.getPublicConfig()).resolves.toEqual({
      guestBattle: true,
      privateArena: false,
      turnstileSiteKey: '0x4AAA',
    });
    expect(calls[0]?.url).toBe('/api/config/public');
    expect(calls[0]?.headers.get('authorization')).toBeNull();
    const empty = client(jsonResponse({}));
    await expect(empty.api.getPublicConfig()).resolves.toEqual(NO_PUBLIC_CONFIG);
  });
});

describe('getQuota', () => {
  it('reads the counters, and treats a missing part as absent', async () => {
    const { api, calls } = client(
      jsonResponse({
        signedIn: true,
        guest: { enabled: true, limit: 3, remaining: 2 },
        privateArena: { enabled: false, limit: 10, remaining: 0 },
      }),
    );
    await expect(api.getQuota()).resolves.toEqual({
      signedIn: true,
      guest: { enabled: true, limit: 3, remaining: 2 },
      privateArena: { enabled: false, limit: 10, remaining: 0 },
    });
    expect(calls[0]?.url).toBe('/api/arena/quota');
    const guestOnly = client(jsonResponse({ signedIn: false, guest: { limit: 3, remaining: 1 } }));
    await expect(guestOnly.api.getQuota()).resolves.toEqual({
      signedIn: false,
      guest: { enabled: false, limit: 3, remaining: 1 },
    });
  });

  it('quotaQuery answers null when the endpoint is absent (404)', async () => {
    const { api } = client(jsonResponse({ code: 'NOT_FOUND' }, { status: 404 }));
    const options = quotaQuery(api);
    const queryFn = options.queryFn as (context: { signal: AbortSignal }) => Promise<unknown>;
    await expect(queryFn({ signal: new AbortController().signal })).resolves.toBeNull();
  });
});

describe('startGuestBattle', () => {
  it('posts the prompt and the Turnstile token without any credential', async () => {
    const { api, calls } = client(jsonResponse(battle));
    const result = await api.startGuestBattle({ prompt: '  Hello  ', turnstileToken: 'tok' });
    expect(result.agent1.text).toBe('Answer one');
    expect(calls[0]?.url).toBe('/api/arena/guest-battle');
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.body).toEqual({ prompt: 'Hello', turnstileToken: 'tok' });
    expect(calls[0]?.headers.get('authorization')).toBeNull();
  });

  it('refuses an empty prompt, a prompt over 500 characters or a missing token locally', async () => {
    const { api, calls } = client(jsonResponse(battle));
    await expect(
      api.startGuestBattle({ prompt: ' ', turnstileToken: 'tok' }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(
      api.startGuestBattle({ prompt: 'x'.repeat(501), turnstileToken: 'tok' }),
    ).rejects.toBeInstanceOf(ApiError);
    await expect(api.startGuestBattle({ prompt: 'ok', turnstileToken: '' })).rejects.toBeInstanceOf(
      ApiError,
    );
    expect(calls).toHaveLength(0);
  });
});

describe('private arena endpoints', () => {
  it('creates, lists and reads', async () => {
    const created = client(jsonResponse({ id: 'a1' }));
    await expect(
      created.api.createPrivateArena({ name: ' Support ', prompts: [' one ', '', 'two'] }),
    ).resolves.toEqual({ id: 'a1' });
    expect(created.calls[0]?.url).toBe('/api/private-arenas');
    expect(created.calls[0]?.body).toEqual({ name: 'Support', prompts: ['one', 'two'] });
    expect(created.calls[0]?.headers.get('authorization')).toBe('Bearer token-1');

    const listed = client(
      jsonResponse([{ id: 'a1', name: 'Support', promptCount: 2, battlesDone: 1 }]),
    );
    await expect(listed.api.listPrivateArenas()).resolves.toEqual([
      { id: 'a1', name: 'Support', promptCount: 2, battlesDone: 1 },
    ]);
    const one = client(jsonResponse({ id: 'a 1', name: 'S', promptCount: 2, battlesDone: 0 }));
    await one.api.getPrivateArena('a 1');
    expect(one.calls[0]?.url).toBe('/api/private-arenas/a%201');
  });

  it('runs a battle, votes with both_bad spelled the backend way, and reads the board', async () => {
    const run = client(
      jsonResponse({ battleId: 'b1', agent1: { text: 'A' }, agent2: { text: 'B' } }),
    );
    const result = await run.api.startPrivateBattle('a1', 2);
    expect(result.battleId).toBe('b1');
    expect(run.calls[0]?.url).toBe('/api/private-arenas/a1/battle');
    expect(run.calls[0]?.body).toEqual({ promptIndex: 2 });
    await expect(run.api.startPrivateBattle('a1', -1)).rejects.toBeInstanceOf(ApiError);

    const voted = client(
      jsonResponse({ models: { left: { name: 'vendor/alpha' }, right: { name: 'vendor/beta' } } }),
    );
    const models = await voted.api.votePrivateBattle('a1', { battleId: 'b1', choice: 'both_bad' });
    expect(models?.left.name).toBe('vendor/alpha');
    expect(voted.calls[0]?.url).toBe('/api/private-arenas/a1/vote');
    expect(voted.calls[0]?.body).toEqual({ battleId: 'b1', choice: 'both_bad' });
    await expect(
      voted.api.votePrivateBattle('a1', { battleId: 'b1', choice: 'both-bad' as never }),
    ).rejects.toBeInstanceOf(ApiError);

    const unnamed = client(jsonResponse({}));
    await expect(
      unnamed.api.votePrivateBattle('a1', { battleId: 'b1', choice: 'tie' }),
    ).resolves.toBeNull();

    const board = client(
      jsonResponse([{ model: 'vendor/alpha', wins: 3, losses: 1, ties: 0, battles: 4 }]),
    );
    await expect(board.api.getPrivateBoard('a1')).resolves.toEqual([
      { model: 'vendor/alpha', wins: 3, losses: 1, ties: 0, battles: 4 },
    ]);
    expect(board.calls[0]?.url).toBe('/api/private-arenas/a1/board');
  });

  it('deletes an arena', async () => {
    const { api, calls } = client(jsonResponse(undefined, { status: 204 }));
    await api.deletePrivateArena('a1');
    expect(calls[0]?.init.method).toBe('DELETE');
    expect(calls[0]?.url).toBe('/api/private-arenas/a1');
  });
});

describe('guestBattleMessage', () => {
  const error = (kind: ConstructorParameters<typeof ApiError>[0]['kind'], code = 'X') =>
    new ApiError({ kind, code, message: 'm', status: 400 });

  it('says what to do for each failure', () => {
    expect(guestBattleMessage(error('forbidden', 'TURNSTILE_FAILED'))).toMatch(
      /check did not pass/,
    );
    expect(guestBattleMessage(error('rate_limited', 'RATE'))).toMatch(/today/);
    expect(guestBattleMessage(error('not_found', 'NOT_FOUND'))).toMatch(/not available/);
    expect(guestBattleMessage(error('server', 'BOOM')).length).toBeGreaterThan(0);
  });
});
