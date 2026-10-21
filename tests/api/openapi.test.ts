import { SELF } from 'cloudflare:test';
import { describe, expect, it } from 'vitest';
import committed from '../../docs/api/openapi.v2.json';
import { createApp, openapiConfig } from '../../server/v2/app.ts';

type Operation = { responses: Record<string, { content?: Record<string, unknown> }> };
type Doc = { openapi: string; info: { version: string }; paths: Record<string, Record<string, Operation>> };
const doc = committed as unknown as Doc;

/** Checks status and content type of a response against its operation in the committed document. */
function expectMatchesOpenApi(response: Response, method: string, path: string) {
  const operation = doc.paths[path]?.[method.toLowerCase()];
  expect(operation, `${method} ${path} is in docs/api/openapi.v2.json`).toBeDefined();
  const declared = operation!.responses[String(response.status)];
  expect(declared, `status ${response.status} is declared for ${method} ${path}`).toBeDefined();
  const type = (response.headers.get('content-type') ?? '').split(';')[0]!;
  expect(Object.keys(declared!.content ?? {}), `content type ${type}`).toContain(type);
}

describe('OpenAPI document', () => {
  it('is up to date with the routes (run `npm run api:openapi` when this fails)', () => {
    const generated = JSON.parse(JSON.stringify(createApp().getOpenAPI31Document(openapiConfig)));
    expect(committed).toEqual(generated);
  });

  it('is OpenAPI 3.1 with the API version', () => {
    expect(doc.openapi).toBe('3.1.0');
    expect(doc.info.version).toBe('2.0.0');
  });

  it('lists every registered route', () => {
    const app = createApp();
    const registered = app.routes.filter(route => route.method !== 'ALL' && route.path !== '/api/v2/openapi.json');
    const unique = new Set(registered.map(route => `${route.method.toLowerCase()} ${route.path}`));
    for (const key of unique) {
      const [method, path] = key.split(' ') as [string, string];
      expect(doc.paths[path]?.[method], key).toBeDefined();
    }
  });

  it('is served at /api/v2/openapi.json', async () => {
    const response = await SELF.fetch('https://arena.dualmindlab.tech/api/v2/openapi.json', { headers: { Cookie: 'dm_preview=1' } });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual(committed);
  });

  it('describes the responses the routes really send', async () => {
    const headers = { Cookie: 'dm_preview=1' };
    const base = 'https://arena.dualmindlab.tech';
    expectMatchesOpenApi(await SELF.fetch(`${base}/api/v2/health`, { headers }), 'GET', '/api/v2/health');
    expectMatchesOpenApi(await SELF.fetch(`${base}/api/v2/me`, { headers }), 'GET', '/api/v2/me');
    const notEnabled = await createApp({ verifier: () => null }).request(`${base}/api/v2/me`, {}, {});
    expectMatchesOpenApi(notEnabled, 'GET', '/api/v2/me');
  });
});
