import { describe, expect, it } from 'vitest';

import {
  type ApiClient,
  type CallOptions,
  createApiClient,
  MOCK_SCENARIO_HEADER,
  MOCK_SCENARIOS,
  type MockScenario,
  type ResponseEvent,
} from '@/lib/api';
import {
  DEMO_NOTICE,
  demoChatAnswer,
  MOCK_MODEL_STATS,
  MOCK_MODELS,
  toWireModelStat,
} from '@/lib/api/mock/fixtures';
import { createMockFetch } from '@/lib/api/mock/mock-fetch';
import { leaderboardSchema } from '@/lib/api/schemas/leaderboard';

import modelStats from '../../../fixtures/api/model-stats.recorded.json';
import { collect, rejectionOf, UUID_V4 } from './helpers';

const scenario = (name: MockScenario): CallOptions => ({
  headers: { [MOCK_SCENARIO_HEADER]: name },
  retry: false,
});

/** A fresh client on a fresh mock, as the app builds it in demo mode. */
const mockClient = (): ApiClient => createApiClient({ mock: true });

describe('mock fixtures', () => {
  it('serve the leaderboard exactly in the recorded live wire format', () => {
    expect(MOCK_MODEL_STATS.map(toWireModelStat)).toEqual(modelStats.items);
  });
});

describe('mock adapter parity: every endpoint function works against it', () => {
  it('health', async () => {
    const api = mockClient();
    expect(api.isMock).toBe(true);
    await expect(api.getHealth()).resolves.toMatchObject({ healthy: true, version: '1.0.0-mock' });
  });

  it('models', async () => {
    const api = mockClient();
    const models = await api.listModels();
    expect(models.map(model => model.modelId)).toEqual(MOCK_MODELS.map(model => model.modelId));
    await expect(api.getModel(MOCK_MODELS[2]?.modelId ?? '')).resolves.toMatchObject({
      displayName: 'Compound Mini',
      providerName: 'groq',
    });
    await expect(api.getModel('unknown')).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('leaderboard, normalised like the recorded live response', async () => {
    await expect(mockClient().getLeaderboard()).resolves.toEqual(
      leaderboardSchema.parse(modelStats),
    );
  });

  it('battle: two labelled demo answers from two different models, then one vote', async () => {
    const api = mockClient();
    const battle = await api.startBattle({ prompt: 'Which is faster, a cheetah or a falcon?' });
    expect(battle.comparisonId).toMatch(UUID_V4);
    expect(battle.agent1.text).toContain(DEMO_NOTICE);
    expect(battle.agent2.text).toContain(DEMO_NOTICE);
    expect(battle.agent1.text).not.toBe(battle.agent2.text);
    expect(battle.agent1.model?.name).not.toBe(battle.agent2.model?.name);
    expect(battle.comparison?.verdict).toBe('Pending user vote');

    await expect(
      api.vote({ comparisonId: battle.comparisonId, voteChoice: 'right', voteDurationMs: 3200.4 }),
    ).resolves.toEqual({ success: true, message: 'Vote recorded' });
    await expect(
      api.vote({ comparisonId: battle.comparisonId, voteChoice: 'left' }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'DUPLICATE_VOTE' });
  });

  it('battle: side by side with chosen models, and unknown models rejected', async () => {
    const api = mockClient();
    const [first, second] = MOCK_MODELS;
    const battle = await api.startBattle({
      prompt: 'Hi',
      model1: first?.modelId,
      model2: second?.modelId,
      selectionMode: 'topper',
      maxTokens: 512,
    });
    expect(battle.agent1.model?.displayName).toBe(first?.displayName);
    expect(battle.agent2.model?.displayName).toBe(second?.displayName);
    await expect(api.startBattle({ prompt: 'Hi', model1: 'x', model2: 'y' })).rejects.toMatchObject(
      {
        kind: 'validation',
        code: 'INVALID_REQUEST',
        message: 'Unknown model id',
      },
    );
  });

  it('chat and streamed chat', async () => {
    const api = mockClient();
    const answer = await api.sendChat({ prompt: 'Explain recursion', model: 'auto' });
    expect(answer.text).toBe(demoChatAnswer('Explain recursion'));
    expect(answer.usage?.totalTokens).toBeGreaterThan(0);

    const events = await collect(api.streamChat({ prompt: 'Explain recursion' }));
    const text = events.flatMap(event => (event.type === 'delta' ? [event.text] : [])).join('');
    expect(text).toBe(demoChatAnswer('Explain recursion'));
    expect(events.at(-1)).toMatchObject({ type: 'done', finishReason: 'stop' });
    expect(events.filter(event => event.type === 'done')).toHaveLength(1);
  });

  it('threads: list, create, read, rename, share, read shared, delete', async () => {
    const api = mockClient();
    const seeded = await api.listThreads();
    expect(seeded).toHaveLength(2);

    const created = await api.createThread({ title: '  Cheetah vs falcon  ', mode: 'battle' });
    expect(created).toMatchObject({
      title: 'Cheetah vs falcon',
      visibility: 'private',
      messageCount: 0,
    });
    expect((await api.listThreads({ limit: 1 })).map(thread => thread.threadId)).toEqual([
      created.threadId,
    ]);

    const battle = await api.startBattle({ prompt: 'Fastest animal?', threadId: created.threadId });
    await api.vote({ comparisonId: battle.comparisonId, voteChoice: 'tie' });
    const messages = await api.listThreadMessages(created.threadId);
    expect(messages).toMatchObject([
      { promptText: 'Fastest animal?', voteChoice: 'tie', hasVoted: true, position: 0 },
    ]);

    await expect(
      api.renameThread({ threadId: created.threadId, title: 'Renamed' }),
    ).resolves.toEqual({
      success: true,
      message: 'Thread updated',
    });
    expect((await api.getThread(created.threadId)).title).toBe('Renamed');

    // Private: the public share view is refused.
    await expect(api.getSharedThread(created.threadId)).rejects.toMatchObject({
      kind: 'forbidden',
    });
    await expect(
      api.setThreadVisibility({ threadId: created.threadId, visibility: 'unlisted' }),
    ).resolves.toEqual({ success: true, message: 'Visibility updated', visibility: 'unlisted' });
    const shared = await api.getSharedThread(created.threadId);
    expect(shared.thread.visibility).toBe('unlisted');
    // A visitor sees the battle but not the owner's vote.
    expect(shared.messages).toMatchObject([{ voteChoice: null, hasVoted: false }]);

    await expect(api.deleteThread(created.threadId)).resolves.toMatchObject({ success: true });
    await expect(api.getThread(created.threadId)).rejects.toMatchObject({ kind: 'not_found' });
    await expect(api.deleteThread(created.threadId)).rejects.toMatchObject({ kind: 'not_found' });
  });

  it('users', async () => {
    const api = mockClient();
    await expect(
      api.syncUser({
        id: 'user-1',
        email: 'ada@example.com',
        name: 'Ada',
        provider: 'google',
        avatarUrl: 'https://example.com/a.png',
      }),
    ).resolves.toEqual({
      userId: 'user-1',
      email: 'ada@example.com',
      name: 'Ada',
      avatarUrl: 'https://example.com/a.png',
      role: 'user',
      energyBalance: 100,
    });
    await expect(api.getMe()).resolves.toMatchObject({ role: 'user', energyBalance: 100 });
  });

  it('text to speech returns a WAV blob', async () => {
    const blob = await mockClient().textToSpeech({ text: 'Hello', voice: 'alloy' });
    expect(blob.type).toBe('audio/wav');
    expect(blob.size).toBe(44 + 800);
    const header = new TextDecoder().decode(new Uint8Array(await blob.arrayBuffer()).slice(0, 4));
    expect(header).toBe('RIFF');
  });

  it('feature flags', async () => {
    const api = mockClient();
    await expect(api.getFeatureFlag('public_sharing')).resolves.toEqual({
      key: 'public_sharing',
      enabled: true,
    });
    await expect(api.getFeatureFlag('nope')).resolves.toEqual({ key: 'nope', enabled: false });
  });
});

describe('mock scenarios (x-mock-scenario header)', () => {
  it('lists every scenario', () => {
    expect(MOCK_SCENARIOS).toContain('ok');
    expect(new Set(MOCK_SCENARIOS).size).toBe(MOCK_SCENARIOS.length);
  });

  it.each([
    ['unauthorized', { kind: 'auth', status: 401 }],
    ['forbidden', { kind: 'forbidden', status: 403, code: 'FORBIDDEN' }],
    ['not-found', { kind: 'not_found', status: 404 }],
    ['validation', { kind: 'validation', status: 400, code: 'VALIDATION_ERROR' }],
    ['rate-limited', { kind: 'rate_limited', status: 429, retryAfterMs: 2000 }],
    ['server-error', { kind: 'server', status: 500, code: 'INTERNAL_ERROR' }],
    ['bad-gateway', { kind: 'server', status: 502, code: 'BAD_GATEWAY' }],
    ['gateway-timeout', { kind: 'timeout', status: 504, code: 'GATEWAY_TIMEOUT' }],
    [
      'problem',
      { kind: 'validation', status: 400, code: 'INVALID_REQUEST', message: 'Prompt is required' },
    ],
    ['malformed', { kind: 'bad_response', status: 200, code: 'INVALID_JSON' }],
    ['network-error', { kind: 'network', status: 0 }],
  ] as const)('%s', async (name, expected) => {
    await expect(mockClient().listThreads({}, scenario(name))).rejects.toMatchObject(expected);
  });

  it('answers arena routes with ai.error bodies', async () => {
    const api = mockClient();
    await expect(api.startBattle({ prompt: 'x' }, scenario('validation'))).rejects.toMatchObject({
      kind: 'validation',
      code: 'INVALID_REQUEST',
      message: 'Prompt is required',
    });
    await expect(api.sendChat({ prompt: 'x' }, scenario('server-error'))).rejects.toMatchObject({
      kind: 'server',
      code: 'API_ERROR',
    });
  });

  it('lets the client time out', async () => {
    await expect(
      mockClient().getLeaderboard({ ...scenario('timeout'), timeoutMs: 20 }),
    ).rejects.toMatchObject({ kind: 'timeout', code: 'TIMEOUT' });
  });

  it('returns empty lists', async () => {
    const api = mockClient();
    await expect(api.getLeaderboard(scenario('empty'))).resolves.toEqual([]);
    await expect(api.listThreads({}, scenario('empty'))).resolves.toEqual([]);
    await expect(api.listModels(scenario('empty'))).resolves.toEqual([]);
  });

  it('breaks a stream with an ai.error event after a few deltas', async () => {
    const seen: string[] = [];
    const error = await rejectionOf(
      (async () => {
        for await (const event of mockClient().streamChat(
          { prompt: 'x' },
          scenario('stream-error'),
        )) {
          if (event.type === 'delta') seen.push(event.text);
        }
      })(),
    );
    expect(seen).toHaveLength(3);
    expect(error).toMatchObject({ kind: 'server', code: 'STREAM_ERROR' });
  });

  it('rejects an unknown scenario name loudly', async () => {
    await expect(
      mockClient().getHealth({ headers: { [MOCK_SCENARIO_HEADER]: 'typo' } }),
    ).rejects.toMatchObject({ kind: 'validation', code: 'MOCK_UNKNOWN_SCENARIO' });
  });

  it('takes a default scenario from the options', async () => {
    let current: MockScenario | undefined = 'forbidden';
    const api = createApiClient({ mock: { getScenario: () => current, scenario: 'not-found' } });
    await expect(api.getHealth()).rejects.toMatchObject({ kind: 'forbidden' });
    current = undefined;
    await expect(api.getHealth()).rejects.toMatchObject({ kind: 'not_found' });
  });
});

describe('mock transport behaviour', () => {
  it('answers 401 like the live API when no token is sent', async () => {
    const fetch = createMockFetch();
    const response = await fetch('/api/models', { method: 'GET' });
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
    expect(await response.text()).toBe('');
    expect((await fetch('/api/nope', { method: 'GET' })).status).toBe(404);
    expect((await fetch('/health', { method: 'GET' })).status).toBe(200);
  });

  it('rejects a body that is not JSON', async () => {
    const response = await createMockFetch()('/api/threads', {
      method: 'POST',
      headers: { authorization: 'Bearer t' },
      body: '{oops',
    });
    expect(response.status).toBe(400);
  });

  it('echoes the request id and sends a correlation id, like the Worker and the API', async () => {
    const events: ResponseEvent[] = [];
    const api = createApiClient({ mock: true, onResponse: event => events.push(event) });
    await api.getHealth();
    expect(events[0]?.requestId).toMatch(UUID_V4);
    expect(events[0]?.correlationId).toMatch(/^[0-9a-f]{8}$/);
  });

  it('uses the app token when one is given, instead of the demo token', async () => {
    const api = createApiClient({ mock: true, getAccessToken: () => null });
    await expect(api.listModels()).rejects.toMatchObject({ kind: 'auth', code: 'NO_ACCESS_TOKEN' });
    await expect(api.getLeaderboard()).resolves.toHaveLength(MOCK_MODEL_STATS.length);
  });

  it('honours latency and aborts during it', async () => {
    const api = createApiClient({ mock: { latencyMs: 5_000 } });
    const controller = new AbortController();
    const pending = api.getHealth({ signal: controller.signal });
    setTimeout(() => controller.abort(), 10);
    await expect(pending).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('streams with a chunk delay and stops when the caller leaves the loop', async () => {
    const api = createApiClient({ mock: { streamChunkDelayMs: 1 } });
    for await (const event of api.streamChat({ prompt: 'x' })) {
      expect(event.type).toBe('delta');
      break;
    }
  });
});
