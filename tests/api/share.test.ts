import { env } from 'cloudflare:test';
import { afterEach, describe, expect, it, vi } from 'vitest';
import worker from '../../worker.js';

// Slice S11 in workerd: the share page through the real worker.js, with the real HTMLRewriter and
// Cache API (Miniflare). The fake API is a fetch spy; tests/api/assets/__spa-fallback.html stands
// in for the web build's fallback page (it has a stale title, description, og:title and canonical,
// which must be replaced, never duplicated).

const ORIGIN = 'https://arena.dualmindlab.tech';
const cookie = { Cookie: 'dm_preview=1' };
const backendEnv = { ...env, BACKEND_URL: 'https://backend.test' };

let counter = 0;
/** A fresh UUID-shaped id per test, so the edge cache never answers from an earlier test. */
function freshId() {
  counter += 1;
  return `5e1f0c3a-0000-4000-8000-${String(counter).padStart(12, '0')}`;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

function api(answer: { visibility?: string; mode?: string; prompt?: string; voted?: boolean; status?: number }) {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async input => {
    const url = String(input instanceof Request ? input.url : input);
    if (answer.status) return json({ success: false, code: 'X' }, answer.status);
    if (url.endsWith('/messages')) {
      return json({
        items: [
          {
            messageId: 'm1',
            position: 0,
            promptText: answer.prompt ?? 'Explain recursion to a ten-year-old',
            model1Name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
            model2Name: 'groq/compound-mini',
            model1Response: 'A',
            model2Response: 'B',
            comparisonId: 'c1',
            voteChoice: answer.voted ? 'right' : null,
            hasVoted: Boolean(answer.voted),
          },
        ],
      });
    }
    return json({
      threadId: 'x',
      userId: 'owner-id-never-shown',
      title: 'Explain recursion',
      mode: answer.mode ?? 'battle',
      visibility: answer.visibility ?? 'public',
      messageCount: 1,
    });
  });
}

async function share(path: string) {
  const response = await worker.fetch(new Request(`${ORIGIN}${path}`, { headers: cookie }), backendEnv, undefined);
  return { response, html: await response.text() };
}

const metaContent = (html: string, attribute: string, key: string) =>
  new RegExp(`<meta ${attribute}="${key}" content="([^"]*)"`).exec(html)?.[1];

afterEach(() => {
  vi.restoreAllMocks();
});

describe('the share page in workerd', () => {
  it('writes the first prompt into the title and the link-preview tags', async () => {
    const id = freshId();
    api({ voted: true });
    const { response, html } = await share(`/share/${id}`);
    expect(response.status).toBe(200);
    expect(response.headers.get('cache-control')).toBe('no-store, no-cache, must-revalidate');
    expect(response.headers.get('x-robots-tag')).toBeNull();
    expect(html.match(/<title>/g)).toHaveLength(1);
    expect(html).toContain('<title>Explain recursion to a ten-year-old · DualMind Arena</title>');
    expect(metaContent(html, 'property', 'og:title')).toBe('Explain recursion to a ten-year-old');
    expect(metaContent(html, 'property', 'og:description')).toBe('Two anonymous AI models answered. See which one won.');
    expect(metaContent(html, 'property', 'og:url')).toBe(`${ORIGIN}/share/${id}`);
    expect(metaContent(html, 'property', 'og:image')).toBe(`${ORIGIN}/og/share.png`);
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(metaContent(html, 'name', 'robots')).toBe('index, follow');
    expect(html).toContain(`<link rel="canonical" href="${ORIGIN}/share/${id}" data-share-meta>`);
    // The page's own stale tags are replaced, not duplicated.
    expect(html).not.toContain('stale');
    expect(html).not.toContain('https://example.test/');
    expect(html.match(/property="og:title"/g)).toHaveLength(1);
    // Blind and author-safe: no model names, no owner id.
    expect(html).not.toContain('llama');
    expect(html).not.toContain('owner-id-never-shown');
    // The body is untouched.
    expect(html).toContain('<div data-spa-fallback>Loading</div>');
  });

  it('uses the same tags for an old ?id= link, pointing at the canonical address', async () => {
    const id = freshId();
    api({ visibility: 'unlisted', prompt: 'Plan three days in Lisbon' });
    const { response, html } = await share(`/share/?id=${id}`);
    expect(response.status).toBe(200);
    expect(metaContent(html, 'property', 'og:title')).toBe('Plan three days in Lisbon');
    expect(metaContent(html, 'property', 'og:url')).toBe(`${ORIGIN}/share/${id}`);
    // Unlisted: anyone with the link, but not search engines.
    expect(metaContent(html, 'name', 'robots')).toBe('noindex, nofollow');
    expect(response.headers.get('x-robots-tag')).toBe('noindex, nofollow');
  });

  it('escapes the prompt', async () => {
    api({ prompt: '"><script>alert(1)</script> & more' });
    const { html } = await share(`/share/${freshId()}`);
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(metaContent(html, 'property', 'og:title')).toBe('&quot;&gt;&lt;script&gt;alert(1)&lt;/script&gt; &amp; more');
  });

  it.each([401, 403, 404, 500])('falls back to the generic tags when the API answers %i', async status => {
    api({ status });
    const { response, html } = await share(`/share/${freshId()}`);
    expect(response.status).toBe(200);
    expect(html).toContain('<title>Shared from DualMind Arena</title>');
    expect(metaContent(html, 'property', 'og:title')).toBe('Shared from DualMind Arena');
    expect(metaContent(html, 'name', 'robots')).toBe('noindex, nofollow');
    expect(html).not.toContain('Explain recursion');
  });

  it('never shows a private thread, even if the API returns it', async () => {
    api({ visibility: 'private', prompt: 'A private prompt' });
    const { html } = await share(`/share/${freshId()}`);
    expect(html).not.toContain('A private prompt');
    expect(metaContent(html, 'property', 'og:title')).toBe('Shared from DualMind Arena');
  });

  it('falls back after the timeout when the API hangs', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(
      (_input, init) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
        }),
    );
    const started = Date.now();
    const { response, html } = await share(`/share/${freshId()}`);
    expect(response.status).toBe(200);
    expect(Date.now() - started).toBeLessThan(5000);
    expect(metaContent(html, 'property', 'og:title')).toBe('Shared from DualMind Arena');
  });

  it('keeps the answer in the edge cache for the next preview', async () => {
    const id = freshId();
    const spy = api({ prompt: 'Cached in the edge' });
    await share(`/share/${id}`);
    expect(spy).toHaveBeenCalledTimes(2);
    const { html } = await share(`/share/${id}`);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(metaContent(html, 'property', 'og:title')).toBe('Cached in the edge');
  });

  it('gives a link without an id the generic tags and never calls the API', async () => {
    const spy = api({});
    const { response, html } = await share('/share/');
    expect(response.status).toBe(200);
    expect(spy).not.toHaveBeenCalled();
    expect(metaContent(html, 'property', 'og:url')).toBe(`${ORIGIN}/share/`);
  });
});
