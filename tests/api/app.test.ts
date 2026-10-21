import { SELF, env } from 'cloudflare:test';
import { describe, expect, it, vi } from 'vitest';
import worker from '../../worker.js';
import { createApp } from '../../server/v2/app.ts';
import { guard } from '../../server/v2/guard.ts';
import { ProblemError } from '../../server/v2/problems.ts';
import { createRoute, z } from '@hono/zod-openapi';

const PROD = 'https://arena.dualmindlab.tech';
const PREVIEW = 'https://feat-x-dualmind-arena.creharsh.workers.dev';
const cookie = { Cookie: 'dm_preview=1' };

function get(base: string, path: string, init: RequestInit = {}) {
  return SELF.fetch(`${base}${path}`, { ...init, headers: { ...cookie, ...(init.headers as Record<string, string> | undefined) } });
}

describe('mounting', () => {
  it('serves /api/v2/health through the real worker with the API security headers', async () => {
    const response = await get(PROD, '/api/v2/health');
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(response.headers.get('x-request-id')).toBeTruthy();
    expect(response.headers.get('x-content-type-options')).toBe('nosniff');
    expect(response.headers.get('strict-transport-security')).toBeTruthy();
    expect(await response.json()).toMatchObject({ status: 'ok', apiVersion: '2.0.0' });
  });

  it('still redirects to the waitlist without the preview cookie', async () => {
    const response = await SELF.fetch(`${PROD}/api/v2/health`, { redirect: 'manual' });
    expect(response.status).toBe(302);
    expect(response.headers.get('location')).toContain('early.dualmindlab.tech');
  });

  it('answers unknown v2 paths with a 404 problem and never calls the v1 upstream', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('upstream'));
    const response = await worker.fetch(
      new Request(`${PROD}/api/v2/nope`, { headers: cookie }),
      { ...env, BACKEND_URL: 'https://backend.test' },
      undefined,
    );
    expect(response.status).toBe(404);
    expect(response.headers.get('content-type')).toBe('application/problem+json; charset=utf-8');
    expect(await response.json()).toMatchObject({ status: 404, instance: '/api/v2/nope', type: expect.stringContaining('/problems/not_found') });
    expect(upstream).not.toHaveBeenCalled();
    const bare = await worker.fetch(new Request(`${PROD}/api/v2`, { headers: cookie }), { ...env, BACKEND_URL: 'https://backend.test' }, undefined);
    expect(bare.status).toBe(404);
    expect(upstream).not.toHaveBeenCalled();
  });

  it('keeps proxying v1 unchanged', async () => {
    const upstream = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('{"ok":true}', { headers: { 'content-type': 'application/json' } }));
    const response = await worker.fetch(
      new Request(`${PROD}/api/health`, { headers: { ...cookie, 'x-request-id': 'v1-request-id-123' } }),
      { ...env, BACKEND_URL: 'https://backend.test' },
      undefined,
    );
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('{"ok":true}');
    expect(response.headers.get('x-request-id')).toBe('v1-request-id-123');
    expect(upstream).toHaveBeenCalledTimes(1);
    expect(String((upstream.mock.calls[0]![0] as Request).url ?? upstream.mock.calls[0]![0])).toBe('https://backend.test/health');
  });
});

describe('request ids', () => {
  it('reuses a sane id and generates one otherwise', async () => {
    const reused = await get(PROD, '/api/v2/health', { headers: { 'X-Request-Id': 'caller-id-12345' } });
    expect(reused.headers.get('x-request-id')).toBe('caller-id-12345');
    const generated = await get(PROD, '/api/v2/health', { headers: { 'X-Request-Id': 'bad id' } });
    expect(generated.headers.get('x-request-id')).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('puts the same id in the id header and the error body', async () => {
    const response = await get(PROD, '/api/v2/nope', { headers: { 'X-Request-Id': 'caller-id-12345' } });
    expect(response.headers.get('x-request-id')).toBe('caller-id-12345');
    expect(((await response.json()) as { requestId: string }).requestId).toBe('caller-id-12345');
  });
});

describe('methods, HEAD and OPTIONS', () => {
  it('answers 405 with Allow for a known path and another method', async () => {
    const response = await get(PROD, '/api/v2/health', { method: 'POST', body: '{}', headers: { 'Content-Type': 'application/json' } });
    expect(response.status).toBe(405);
    expect(response.headers.get('allow')).toBe('GET, HEAD');
    expect(await response.json()).toMatchObject({ status: 405, type: expect.stringContaining('/problems/method_not_allowed') });
    const options = await get(PROD, '/api/v2/health', { method: 'OPTIONS' });
    expect(options.status).toBe(405);
  });

  it('answers HEAD for a GET route without a body', async () => {
    const response = await get(PROD, '/api/v2/health', { method: 'HEAD' });
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('');
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('health', () => {
  it('reports the production bindings on the production host', async () => {
    const body = (await (await get(PROD, '/api/v2/health')).json()) as Record<string, unknown>;
    expect(body.environment).toBe('production');
    expect(body.bindings).toEqual({ DB: true, CACHE: true, EVENTS: true, PUBLIC_BUCKET: true });
    expect(new Date(body.time as string).toISOString()).toBe(body.time);
    expect(JSON.stringify(body)).not.toMatch(/secret|salt|token/i);
  });

  it('reports the preview bindings on every other host', async () => {
    const body = (await (await get(PREVIEW, '/api/v2/health')).json()) as Record<string, unknown>;
    expect(body.environment).toBe('preview');
    expect(body.bindings).toEqual({ DB: true, CACHE: true, EVENTS: true, PUBLIC_BUCKET: true });
  });

  it('shows a binding as missing when only the other set exists', async () => {
    const response = await createApp().request(`${PREVIEW}/api/v2/health`, {}, { DB: {} });
    expect(((await response.json()) as { bindings: Record<string, boolean> }).bindings.DB).toBe(false);
  });
});

describe('/me without a verifier', () => {
  it('answers 501 not_enabled when no Supabase URL is configured', async () => {
    const response = await createApp().request(`${PROD}/api/v2/me`, {}, {});
    expect(response.status).toBe(501);
  });

  it('answers 401 for a missing token through the real worker', async () => {
    const response = await get(PROD, '/api/v2/me');
    expect(response.status).toBe(401);
    expect(response.headers.get('www-authenticate')).toBe('Bearer');
  });
});

function testApp() {
  const echo = createRoute({
    method: 'post',
    path: '/api/v2/test/echo',
    request: { body: { content: { 'application/json': { schema: z.object({ limit: z.number().int().max(100) }) } } } },
    responses: { 200: { description: 'ok', content: { 'application/json': { schema: z.object({ limit: z.number() }) } } } },
  });
  return createApp({
    extend: app => {
      app.openapi(echo, c => c.json({ limit: c.req.valid('json').limit }, 200));
      app.get('/api/v2/test/guarded', guard({ feature: 'ledger', bindings: ['DB'] }), c => c.json({ ok: true }));
      app.get('/api/v2/test/secret', guard({ feature: 'salted', secrets: ['PRIVACY_SALT'] }), c => c.json({ ok: true }));
      app.get('/api/v2/test/boom', () => {
        throw new Error('database password is hunter2');
      });
      app.get('/api/v2/test/problem', () => {
        throw new ProblemError('conflict', { detail: 'taken' });
      });
    },
  });
}

describe('errors and limits', () => {
  const json = { 'Content-Type': 'application/json' };

  it('turns a failed zod parse into a validation_error with errors[]', async () => {
    const response = await testApp().request(`${PROD}/api/v2/test/echo`, { method: 'POST', headers: json, body: '{"limit":500}' }, {});
    expect(response.status).toBe(400);
    const body = (await response.json()) as { type: string; errors: { path: string; message: string }[] };
    expect(body.type).toContain('/problems/validation_error');
    expect(body.errors[0]!.path).toContain('limit');
  });

  it('answers 415 for a body that is not JSON', async () => {
    const response = await testApp().request(`${PROD}/api/v2/test/echo`, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: 'x' }, {});
    expect(response.status).toBe(415);
    expect(response.headers.get('content-type')).toContain('application/problem+json');
  });

  it('answers 413 for a body over 1 MiB', async () => {
    const big = JSON.stringify({ limit: 1, pad: 'x'.repeat(1024 * 1024 + 10) });
    const response = await testApp().request(`${PROD}/api/v2/test/echo`, { method: 'POST', headers: json, body: big }, {});
    expect(response.status).toBe(413);
    expect(await response.json()).toMatchObject({ status: 413 });
  });

  it('answers a thrown ProblemError as its problem', async () => {
    const response = await testApp().request(`${PROD}/api/v2/test/problem`, {}, {});
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ detail: 'taken' });
  });

  it('hides the message and stack of an unexpected error', async () => {
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const response = await testApp().request(`${PROD}/api/v2/test/boom`, {}, {});
    expect(response.status).toBe(500);
    const text = await response.text();
    expect(text).not.toContain('hunter2');
    expect(text).not.toContain('at ');
    expect(JSON.parse(text)).toMatchObject({ status: 500, type: expect.stringContaining('/problems/internal_error') });
    expect(response.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('not_enabled guard', () => {
  it('answers 501 with the feature when the binding is missing', async () => {
    const response = await testApp().request(`${PROD}/api/v2/test/guarded`, {}, {});
    expect(response.status).toBe(501);
    expect(await response.json()).toMatchObject({ status: 501, feature: 'ledger', type: expect.stringContaining('/problems/not_enabled') });
  });

  it('checks the binding this host uses, not the other one', async () => {
    expect((await testApp().request(`${PROD}/api/v2/test/guarded`, {}, { DB_PREVIEW: {} })).status).toBe(501);
    expect((await testApp().request(`${PREVIEW}/api/v2/test/guarded`, {}, { DB: {} })).status).toBe(501);
    expect((await testApp().request(`${PROD}/api/v2/test/guarded`, {}, { DB: {} })).status).toBe(200);
    expect((await testApp().request(`${PREVIEW}/api/v2/test/guarded`, {}, { DB_PREVIEW: {} })).status).toBe(200);
  });

  it('checks secrets by name', async () => {
    expect((await testApp().request(`${PROD}/api/v2/test/secret`, {}, {})).status).toBe(501);
    expect((await testApp().request(`${PROD}/api/v2/test/secret`, {}, { PRIVACY_SALT: 's' })).status).toBe(200);
  });
});
