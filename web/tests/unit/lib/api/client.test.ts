import { describe, expect, it, vi } from 'vitest';

import {
  type ChatStreamEvent,
  createApiClient,
  createApiClientFromEnv,
  toThreadTitle,
} from '@/lib/api';

import { jsonResponse, rejectionOf, scriptedFetch } from './helpers';

/** The function surface from docs/redesign/migration-plan.md section 5, plus getFeatureFlag. */
const ENDPOINT_FUNCTIONS = [
  'createThread',
  'deleteThread',
  'getFeatureFlag',
  'getHealth',
  'getLeaderboard',
  'getMe',
  'getModel',
  'getSharedThread',
  'getThread',
  'listModels',
  'listThreadMessages',
  'listThreads',
  'renameThread',
  'sendChat',
  'setThreadVisibility',
  'startBattle',
  'streamChat',
  'syncUser',
  'textToSpeech',
  'vote',
];

describe('createApiClient', () => {
  it('exposes one function per endpoint and nothing mutable', () => {
    const api = createApiClient();
    const functions = Object.entries(api)
      .filter(([, value]) => typeof value === 'function')
      .map(([name]) => name)
      .sort();
    expect(functions).toEqual(ENDPOINT_FUNCTIONS);
    expect(Object.isFrozen(api)).toBe(true);
    expect(api.baseUrl).toBe('');
    expect(api.isMock).toBe(false);
  });

  it('calls same-origin /api paths by default', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ status: 'healthy' }));
    await createApiClient({ fetch }).getHealth();
    expect(calls[0]?.url).toBe('/api/health');
  });

  it('prefers the mock over a given fetch', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}));
    const api = createApiClient({ mock: true, fetch });
    await expect(api.getHealth()).resolves.toMatchObject({ healthy: true });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('builds the app client from the env config (same-origin, no mock in tests)', async () => {
    const stub = vi.fn(() => Promise.resolve(jsonResponse({ status: 'healthy' })));
    vi.stubGlobal('fetch', stub);
    const api = createApiClientFromEnv({ getAccessToken: () => null });
    expect(api.baseUrl).toBe('');
    expect(api.isMock).toBe(false);
    await expect(api.getHealth()).resolves.toMatchObject({ healthy: true });
    expect(stub).toHaveBeenCalledWith('/api/health', expect.objectContaining({ method: 'GET' }));
  });
});

describe('request bodies', () => {
  const token = () => 'jwt';

  it('startBattle sends the documented body, never userId, and defaults', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({}, { status: 500 }));
    const api = createApiClient({ fetch, getAccessToken: token });
    await rejectionOf(api.startBattle({ prompt: '  Hi  ', model1: '', system: 'Be brief' }));
    expect(calls[0]?.url).toBe('/api/arena/dualchat');
    expect(calls[0]?.body).toEqual({
      prompt: '  Hi  ',
      maxTokens: 4096,
      selectionMode: 'random',
      system: 'Be brief',
    });
    expect(fetch).toHaveBeenCalledOnce();
  });

  it('startBattle sends Idempotency-Key when given, and nothing when not', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({}, { status: 500 }));
    const api = createApiClient({ fetch, getAccessToken: token });
    await rejectionOf(api.startBattle({ prompt: 'Hi', idempotencyKey: 'f3b1c0de-0001' }));
    await rejectionOf(api.startBattle({ prompt: 'Hi' }));
    expect(calls[0]?.headers.get('idempotency-key')).toBe('f3b1c0de-0001');
    expect(calls[1]?.headers.get('idempotency-key')).toBeNull();
    // The key is a header, never part of the body the API hashes.
    expect(calls[0]?.body).not.toHaveProperty('idempotencyKey');
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer jwt');
  });

  it('startBattle refuses a key the API would reject, before any request', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}));
    const api = createApiClient({ fetch, getAccessToken: token });
    for (const key of ['', 'has space', 'x'.repeat(129), 'caf\u00e9']) {
      await expect(api.startBattle({ prompt: 'Hi', idempotencyKey: key })).rejects.toMatchObject({
        kind: 'validation',
        code: 'INVALID_ARGUMENT',
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });

  it('sendChat defaults the model to auto', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ message: 'ok' }));
    const api = createApiClient({ fetch, getAccessToken: token });
    await api.sendChat({ prompt: 'Hi', temperature: 0.2, threadId: 't-1', model: ' ' });
    expect(calls[0]?.body).toEqual({
      prompt: 'Hi',
      model: 'auto',
      maxTokens: 4096,
      threadId: 't-1',
      temperature: 0.2,
    });
  });

  it('vote rounds the duration and validates the choice locally', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ success: true }));
    const api = createApiClient({ fetch, getAccessToken: token });
    await api.vote({ comparisonId: 'c-1', voteChoice: 'both-bad', voteDurationMs: -5.7 });
    expect(calls[0]?.body).toEqual({
      comparisonId: 'c-1',
      voteChoice: 'both-bad',
      voteDurationMs: 0,
    });
    await expect(
      api.vote({ comparisonId: 'c-1', voteChoice: 'maybe' as 'left' }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'INVALID_ARGUMENT' });
  });

  it('syncUser sends avatar_url in snake_case, as the API reads it', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ user_id: 'u-1', role: 'user' }));
    const api = createApiClient({ fetch, getAccessToken: token });
    await api.syncUser({ id: 'u-1', email: 'a@b.c', name: 'A', provider: 'email' });
    expect(calls[0]?.body).toEqual({
      id: 'u-1',
      email: 'a@b.c',
      phone: null,
      name: 'A',
      avatar_url: null,
      provider: 'email',
    });
  });

  it('thread calls encode ids and send only what changed', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ success: true }));
    const api = createApiClient({ fetch, getAccessToken: token });
    await api.renameThread({ threadId: 'a/b c', title: '  New  ' });
    await api.setThreadVisibility({ threadId: 't-1', visibility: 'public' });
    await api.deleteThread('t-1');
    expect(calls.map(call => [call.init.method, call.url, call.body])).toEqual([
      ['PATCH', '/api/threads/a%2Fb%20c', { title: 'New' }],
      ['PATCH', '/api/threads/t-1/visibility', { visibility: 'public' }],
      ['DELETE', '/api/threads/t-1', undefined],
    ]);
  });

  it('getSharedThread never sends the token, getThread does', async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse({ threadId: 't-1', visibility: 'public' }),
      jsonResponse({ items: [] }),
      jsonResponse({ threadId: 't-1' }),
    );
    const api = createApiClient({ fetch, getAccessToken: token });
    await api.getSharedThread('t-1');
    await api.getThread('t-1');
    expect(calls.map(call => call.headers.get('authorization'))).toEqual([
      null,
      null,
      'Bearer jwt',
    ]);
  });

  it('textToSpeech calls the real route, not /api/audio/tts', async () => {
    const { fetch, calls } = scriptedFetch(
      new Response(new Uint8Array([1, 2]), { headers: { 'content-type': 'audio/wav' } }),
    );
    await createApiClient({ fetch, getAccessToken: token }).textToSpeech({ text: 'Hi' });
    expect(calls[0]?.url).toBe('/api/speech/generate');
    expect(calls[0]?.body).toEqual({ text: 'Hi' });
  });

  it('rejects invalid input before any request, as a rejected promise', async () => {
    const { fetch } = scriptedFetch(jsonResponse({}));
    const api = createApiClient({ fetch, getAccessToken: token });
    // Functions, so each promise gets its handler as soon as it exists.
    const attempts: (() => Promise<unknown>)[] = [
      () => api.startBattle({ prompt: '   ' }),
      () => api.startBattle({ prompt: 'x', maxTokens: 0 }),
      () => api.startBattle({ prompt: 'x', selectionMode: 'best' as 'random' }),
      () => api.sendChat({ prompt: '' }),
      () => api.getThread(''),
      () => api.getModel(' '),
      () => api.getFeatureFlag(''),
      () => api.listThreads({ limit: 101 }),
      () => api.createThread({ mode: 'party' as 'battle' }),
      () => api.renameThread({ threadId: 't', title: ' ' }),
      () => api.setThreadVisibility({ threadId: 't', visibility: 'friends' as 'public' }),
      () => api.syncUser({ id: '', email: '', name: '', provider: '' }),
      () => api.textToSpeech({ text: '' }),
    ];
    for (const attempt of attempts) {
      await expect(attempt()).rejects.toMatchObject({
        kind: 'validation',
        code: 'INVALID_ARGUMENT',
      });
    }
    expect(fetch).not.toHaveBeenCalled();
  });
});

describe('streamChat edge cases', () => {
  const token = () => 'jwt';

  it('replays a plain JSON answer as one delta and done', async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse({ message: 'Whole answer', finishReason: 'stop' }),
    );
    const api = createApiClient({ fetch, getAccessToken: token });
    const events: ChatStreamEvent[] = [];
    for await (const event of api.streamChat({ prompt: 'Hi' })) events.push(event);
    expect(events).toEqual([
      { type: 'delta', text: 'Whole answer' },
      { type: 'done', finishReason: 'stop', usage: null },
    ]);
    expect(calls[0]?.headers.get('accept')).toBe(
      'text/event-stream, application/problem+json;q=0.9',
    );
  });

  it('rejects JSON that is not an answer, and an empty body', async () => {
    const { fetch } = scriptedFetch(jsonResponse([1, 2]), new Response(null, { status: 200 }));
    const api = createApiClient({ fetch, getAccessToken: token });
    const consume = async () => {
      for await (const event of api.streamChat({ prompt: 'Hi' })) void event;
    };
    await expect(consume()).rejects.toMatchObject({
      kind: 'bad_response',
      code: 'SCHEMA_MISMATCH',
    });
    await expect(consume()).rejects.toMatchObject({ kind: 'bad_response', code: 'EMPTY_STREAM' });
  });

  it('reports HTTP errors before the stream as normal errors, without retrying', async () => {
    const { fetch } = scriptedFetch(jsonResponse(undefined, { status: 401 }));
    const api = createApiClient({ fetch, getAccessToken: token });
    const consume = async () => {
      for await (const event of api.streamChat({ prompt: 'Hi' })) void event;
    };
    await expect(consume()).rejects.toMatchObject({ kind: 'auth', status: 401 });
    expect(fetch).toHaveBeenCalledOnce();
  });
});

describe('toThreadTitle', () => {
  it('uses the first prompt on one line, cut to 40 characters', () => {
    expect(toThreadTitle('  Hello\n  world  ')).toBe('Hello world');
    expect(toThreadTitle('x'.repeat(40))).toBe('x'.repeat(40));
    expect(toThreadTitle(`${'word '.repeat(10)}end`)).toBe(`${'word '.repeat(8).trimEnd()}...`);
  });
});
