import { describe, expect, it } from 'vitest';

import { createApiClient } from '@/lib/api';
import { compareResultSchema } from '@/lib/api/schemas/compare';

import { jsonResponse, scriptedFetch } from './helpers';

const NO_RETRY = { retry: false } as const;
const ID = 'AbCdEfGhIjKlMnOpQrSt12';
const pathOf = (url: string) => new URL(url, 'https://app.test').pathname;
const client = (fetch: ReturnType<typeof scriptedFetch>['fetch']) =>
  createApiClient({ fetch, getAccessToken: () => 'token-1' });

const RESULT = {
  success: true,
  shareId: ID,
  prompt: 'Why is the sky blue?',
  a: {
    modelName: 'groq/compound-mini',
    displayName: 'Compound Mini',
    provider: 'groq',
    answer: 'Rayleigh scattering.',
    timeMs: 1200,
  },
  b: {
    modelName: 'llama',
    displayName: 'Llama',
    provider: 'meta',
    answer: 'Short waves scatter more.',
    timeMs: 900,
  },
  createdAt: '2026-11-22T10:00:00Z',
  shared: false,
  expiresAt: '2026-12-22T10:00:00Z',
  replayed: false,
  warnings: [],
};

describe('compare result schema', () => {
  it('reads the documented camelCase shape', () => {
    const result = compareResultSchema.parse(RESULT);
    expect(result).toMatchObject({ shareId: ID, shared: false, replayed: false, warnings: [] });
    expect(result.a.timeMs).toBe(1200);
    expect(result.b.displayName).toBe('Llama');
  });

  it('also reads PascalCase keys, which plain classes serialise with', () => {
    const result = compareResultSchema.parse({
      Success: true,
      ShareId: ID,
      Prompt: 'q',
      A: { ModelName: 'x', DisplayName: 'X', Provider: 'p', Answer: 'a', TimeMs: 5 },
      B: { ModelName: 'y', DisplayName: '', Provider: 'p', Answer: 'b', TimeMs: 6 },
      Shared: true,
      ExpiresAt: null,
      Warnings: null,
    });
    expect(result.shareId).toBe(ID);
    expect(result.shared).toBe(true);
    expect(result.expiresAt).toBeNull();
    expect(result.warnings).toEqual([]);
    expect(result.b.displayName).toBeNull();
  });

  it('keeps a result that was not stored (no share id)', () => {
    expect(
      compareResultSchema.parse({ ...RESULT, shareId: null, expiresAt: null }).shareId,
    ).toBeNull();
  });
});

describe('compare endpoints', () => {
  it('POST /api/compare sends names and the prompt, private by default, with no system prompt', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(RESULT));
    const result = await client(fetch).runCompare({
      prompt: 'Why is the sky blue?',
      modelA: 'groq/compound-mini',
      modelB: 'llama',
    });
    expect(result.shareId).toBe(ID);
    expect(pathOf(calls[0]?.url ?? '')).toBe('/api/compare');
    expect(calls[0]?.init.method).toBe('POST');
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer token-1');
    expect(calls[0]?.body).toEqual({
      prompt: 'Why is the sky blue?',
      modelA: 'groq/compound-mini',
      modelB: 'llama',
    });
  });

  it('sends share only when it is true', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ ...RESULT, shared: true }));
    await client(fetch).runCompare({ prompt: 'q', modelA: 'a', modelB: 'b', share: true });
    expect(calls[0]?.body).toMatchObject({ share: true });
  });

  it('is never retried, and refuses an empty prompt before any request', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse({ code: 'RATE_LIMITED' }, { status: 429 }));
    await expect(
      client(fetch).runCompare({ prompt: 'q', modelA: 'a', modelB: 'b' }),
    ).rejects.toMatchObject({ kind: 'rate_limited' });
    expect(calls).toHaveLength(1);
    await expect(
      client(fetch).runCompare({ prompt: '  ', modelA: 'a', modelB: 'b' }),
    ).rejects.toMatchObject({ kind: 'validation' });
    expect(calls).toHaveLength(1);
  });

  it('GET sends the owner token when there is one, and none when signed out', async () => {
    const { fetch, calls } = scriptedFetch(jsonResponse(RESULT));
    await client(fetch).getCompare(ID, NO_RETRY);
    expect(pathOf(calls[0]?.url ?? '')).toBe(`/api/compare/${ID}`);
    expect(calls[0]?.headers.get('authorization')).toBe('Bearer token-1');
    const anonymous = createApiClient({ fetch, getAccessToken: () => null });
    await anonymous.getCompare(ID, NO_RETRY);
    expect(calls[1]?.headers.has('authorization')).toBe(false);
  });

  it('PUT share and DELETE use the right verbs, and delete accepts an empty 204', async () => {
    const { fetch, calls } = scriptedFetch(
      jsonResponse({ shared: true }),
      new Response(null, { status: 204 }),
    );
    const api = client(fetch);
    await expect(api.setCompareShared(ID, true)).resolves.toEqual({ shared: true });
    expect(calls[0]?.init.method).toBe('PUT');
    expect(pathOf(calls[0]?.url ?? '')).toBe(`/api/compare/${ID}/share`);
    expect(calls[0]?.body).toEqual({ shared: true });
    await expect(api.deleteCompare(ID)).resolves.toBeUndefined();
    expect(calls[1]?.init.method).toBe('DELETE');
  });
});

describe('feature detection', () => {
  const off = jsonResponse(
    { code: 'FEATURE_DISABLED', message: 'Compare mode is not available.' },
    { status: 404 },
  );
  const on = jsonResponse(
    { code: 'COMPARE_NOT_FOUND', message: 'No such compare result.' },
    { status: 404 },
  );

  it('is off on 404 FEATURE_DISABLED, on 404 COMPARE_NOT_FOUND, and probes without a token', async () => {
    const a = scriptedFetch(off);
    await expect(client(a.fetch).isCompareAvailable(NO_RETRY)).resolves.toBe(false);
    expect(a.calls[0]?.headers.has('authorization')).toBe(false);
    const b = scriptedFetch(on);
    await expect(client(b.fetch).isCompareAvailable(NO_RETRY)).resolves.toBe(true);
  });

  it('treats an older backend (404 or 501 with no compare code) as off', async () => {
    await expect(
      client(scriptedFetch(jsonResponse({}, { status: 404 })).fetch).isCompareAvailable(NO_RETRY),
    ).resolves.toBe(false);
    await expect(
      client(scriptedFetch(jsonResponse({}, { status: 501 })).fetch).isCompareAvailable(NO_RETRY),
    ).resolves.toBe(false);
  });

  it('does not hide the page on a rate limit or an unreachable API', async () => {
    await expect(
      client(scriptedFetch(jsonResponse({}, { status: 429 })).fetch).isCompareAvailable(NO_RETRY),
    ).resolves.toBe(true);
    await expect(
      client(scriptedFetch(new TypeError('failed')).fetch).isCompareAvailable(NO_RETRY),
    ).resolves.toBe(true);
  });
});
