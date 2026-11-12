// The share page, /share/<id> (redesign slice S11; fixes KNOWN_ISSUES.md #3).
//
// - Every form of a share link answers 200 with the web app's SPA fallback page, never a redirect:
//   /share/<id>, and the old /share/?id=<id>, ?thread=<id>, ?threadId=<id> (also under
//   /share/index.html). The page reads the id in the browser (web/src/lib/site/share.ts, which
//   follows the same rules; a test keeps the two in step). Never cached: Cache-Control no-store.
// - Link previews: chat apps and search engines do not run JavaScript, so the Worker writes the
//   page's title, description, canonical URL, Open Graph and Twitter tags into the HTML with
//   HTMLRewriter. For a thread the API returns WITHOUT a token (public or unlisted, while the
//   API's `public_sharing` flag is on), the title is the first prompt; anything else (private,
//   unknown, an API error or a slow API) gets the generic share tags. No visitor credential is
//   ever sent upstream, so a private thread can never leak into a preview.
// - The upstream lookup has a short timeout and is kept in the edge cache (Cache API) for a
//   couple of minutes, so a link pasted in a busy chat does not hit the API for every preview.
// - Model names are never written into the tags: a battle stays blind in its preview.

import { DEFAULT_BACKEND_URL } from './api-proxy.js';
import { SHARE_NO_STORE } from './caching.js';
import { matchesOneSegment, serveSpaFallback } from './routing.js';

/** Thread ids: the API's UUIDs, kept loose (letters, digits, - and _) for other id formats. */
export const SHARE_ID_RE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/;

/** Query parameters of old share links, in the order the legacy page read them. */
export const SHARE_QUERY_KEYS = Object.freeze(['threadId', 'thread', 'id']);

/** How long the Worker waits for the API before it falls back to the generic tags. */
export const SHARE_META_TIMEOUT_MS = 1500;
/** Edge cache lifetimes, in seconds: a shared thread, and an answer that it is not shared. */
export const SHARE_META_TTL_SECONDS = 120;
export const SHARE_META_MISS_TTL_SECONDS = 30;

const PROMPT_MAX = 90;
const SITE = 'DualMind Arena';
export const SHARE_IMAGE = Object.freeze({
  path: '/og/share.png',
  width: 1200,
  height: 630,
  alt: 'DualMind Arena: two anonymous AI models answer one prompt, and people pick the better answer.',
});

/** @param {string} pathname */
export function isShareRoute(pathname) {
  return pathname === '/share' || matchesOneSegment(pathname, '/share/');
}

/** @param {unknown} value */
export function isShareId(value) {
  return typeof value === 'string' && SHARE_ID_RE.test(value);
}

/**
 * The thread id of a share link: the path segment after /share/ when it is an id, else the first
 * id in ?threadId=, ?thread= or ?id=. Null when there is none.
 * @param {URL} url
 * @returns {string | null}
 */
export function shareIdFromUrl(url) {
  const segments = url.pathname.split('/').filter(Boolean);
  if (segments[0] === 'share' && segments[1] !== undefined) {
    let candidate = '';
    try {
      candidate = decodeURIComponent(segments[1]);
    } catch {
      candidate = '';
    }
    if (isShareId(candidate)) return candidate;
  }
  for (const key of SHARE_QUERY_KEYS) {
    const value = url.searchParams.get(key)?.trim();
    if (isShareId(value)) return /** @type {string} */ (value);
  }
  return null;
}

/** One line, cut at a word boundary to `max` characters with an ellipsis. */
export function oneLine(text, max = PROMPT_MAX) {
  const line = String(text ?? '')
    .replace(/\s+/g, ' ')
    .trim();
  if (line.length <= max) return line;
  const cut = line.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trimEnd()}…`;
}

/**
 * @typedef {{ mode: 'battle' | 'arena' | 'direct', visibility: 'public' | 'unlisted', prompt: string, voted: boolean }} ShareFacts
 * @typedef {{ title: string, ogTitle: string, description: string, url: string, image: string, imageAlt: string, robots: string, shared: boolean }} ShareMeta
 */

/** The page address the tags point at: always the canonical /share/<id> form. */
function canonicalUrl(origin, id) {
  return id ? `${origin}/share/${encodeURIComponent(id)}` : `${origin}/share/`;
}

/**
 * The tags for a link whose thread could not be read publicly (or no id): generic, noindex.
 * @param {string} origin
 * @param {string | null} id
 * @returns {ShareMeta}
 */
export function genericShareMeta(origin, id) {
  return {
    title: `Shared from ${SITE}`,
    ogTitle: `Shared from ${SITE}`,
    description:
      'Two AI models, one prompt and a verdict. Open the shared answers, then run your own blind battle.',
    url: canonicalUrl(origin, id),
    image: `${origin}${SHARE_IMAGE.path}`,
    imageAlt: SHARE_IMAGE.alt,
    robots: 'noindex, nofollow',
    shared: false,
  };
}

/**
 * The tags for a thread the API shares publicly. Only the first prompt and the kind of thread are
 * used: never model names (a battle stays blind) and never anything about the account.
 * @param {ShareFacts} facts
 * @param {string} origin
 * @param {string} id
 * @returns {ShareMeta}
 */
export function shareMetaFor(facts, origin, id) {
  const prompt = oneLine(facts.prompt) || 'A shared battle';
  const description =
    facts.mode === 'direct'
      ? `One AI model answered this prompt on ${SITE}. Read the conversation, then ask your own.`
      : facts.mode === 'arena'
        ? `Two AI models answered side by side on ${SITE}. Compare them, then run your own battle.`
        : facts.voted
          ? 'Two anonymous AI models answered. See which one won.'
          : 'Two anonymous AI models answered. Read both blind, then run your own battle.';
  return {
    title: `${prompt} · ${SITE}`,
    ogTitle: prompt,
    description,
    url: canonicalUrl(origin, id),
    image: `${origin}${SHARE_IMAGE.path}`,
    imageAlt: SHARE_IMAGE.alt,
    // Unlisted means "anyone with the link", not "find it in a search engine".
    robots: facts.visibility === 'public' ? 'index, follow' : 'noindex, nofollow',
    shared: true,
  };
}

/** HTML-escapes text for an attribute or element content. */
export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * The <head> markup for the tags (the <title> too unless the page already has one, which the
 * rewriter fills instead).
 * @param {ShareMeta} meta
 * @param {{ withTitle?: boolean }} [options]
 */
export function shareMetaTags(meta, { withTitle = true } = {}) {
  const tag = (attribute, key, value) =>
    `<meta ${attribute}="${key}" content="${escapeHtml(value)}" data-share-meta>`;
  return [
    withTitle ? `<title>${escapeHtml(meta.title)}</title>` : '',
    tag('name', 'description', meta.description),
    tag('name', 'robots', meta.robots),
    `<link rel="canonical" href="${escapeHtml(meta.url)}" data-share-meta>`,
    tag('property', 'og:type', 'article'),
    tag('property', 'og:site_name', SITE),
    tag('property', 'og:title', meta.ogTitle),
    tag('property', 'og:description', meta.description),
    tag('property', 'og:url', meta.url),
    tag('property', 'og:image', meta.image),
    tag('property', 'og:image:width', String(SHARE_IMAGE.width)),
    tag('property', 'og:image:height', String(SHARE_IMAGE.height)),
    tag('property', 'og:image:alt', meta.imageAlt),
    tag('name', 'twitter:card', 'summary_large_image'),
    tag('name', 'twitter:title', meta.ogTitle),
    tag('name', 'twitter:description', meta.description),
    tag('name', 'twitter:image', meta.image),
    tag('name', 'twitter:image:alt', meta.imageAlt),
  ].join('');
}

const PAGE_TAGS =
  'meta[name="description"], meta[name="robots"], meta[property^="og:"], meta[name^="twitter:"], link[rel="canonical"]';

/**
 * Writes the tags into the page with HTMLRewriter (Workers runtime): the <title> is filled, any
 * existing description, robots, canonical, Open Graph or Twitter tag is removed, and the new tags
 * go at the end of <head>. Without HTMLRewriter (Node tests) the page is returned as it is.
 * @param {Response} response
 * @param {ShareMeta} meta
 * @returns {Response}
 */
export function injectShareMeta(response, meta) {
  const Rewriter = /** @type {any} */ (globalThis).HTMLRewriter;
  if (typeof Rewriter !== 'function') return response;
  let sawTitle = false;
  return new Rewriter()
    .on('title', {
      element(element) {
        sawTitle = true;
        element.setInnerContent(meta.title);
      },
    })
    .on(PAGE_TAGS, {
      element(element) {
        element.remove();
      },
    })
    .on('head', {
      element(element) {
        element.onEndTag(end => {
          end.before(shareMetaTags(meta, { withTitle: !sawTitle }), { html: true });
        });
      },
    })
    .transform(response);
}

const pick = (object, ...keys) => {
  for (const key of keys) {
    if (object && object[key] !== undefined && object[key] !== null) return object[key];
  }
  return undefined;
};

/**
 * The facts the tags need, from the API's thread and messages bodies, or null when the thread is
 * not shared publicly (or the bodies make no sense).
 * @returns {ShareFacts | null}
 */
export function shareFactsFrom(threadBody, messagesBody) {
  if (!threadBody || typeof threadBody !== 'object') return null;
  const visibility = pick(threadBody, 'visibility');
  if (visibility !== 'public' && visibility !== 'unlisted') return null;
  const rawMode = pick(threadBody, 'mode');
  const mode = rawMode === 'arena' || rawMode === 'direct' ? rawMode : 'battle';
  const items = Array.isArray(messagesBody)
    ? messagesBody
    : Array.isArray(messagesBody?.items)
      ? messagesBody.items
      : [];
  const rows = items
    .filter(item => item && typeof item === 'object')
    .map(item => ({
      position: Number(pick(item, 'position')) || 0,
      prompt: String(pick(item, 'promptText', 'prompt_text', 'prompt') ?? ''),
      voted:
        pick(item, 'hasVoted', 'has_voted') === true ||
        Boolean(pick(item, 'voteChoice', 'vote_choice')),
    }))
    .sort((a, b) => a.position - b.position);
  const first = rows.find(row => row.prompt.trim() !== '');
  const title = String(pick(threadBody, 'title') ?? '');
  return {
    mode,
    visibility,
    prompt: first?.prompt ?? title,
    voted: rows.some(row => row.voted),
  };
}

/**
 * The two Cache API methods used here (caches.default in the Workers runtime).
 * @typedef {{ match: (request: Request) => Promise<Response | undefined>, put: (request: Request, response: Response) => Promise<void> }} ShareMetaCache
 * @typedef {{ fetchImpl?: (input: string, init: RequestInit) => Promise<Response>, cache?: ShareMetaCache | null, timeoutMs?: number, waitUntil?: ((promise: Promise<unknown>) => void) | undefined, log?: (event: object) => void }} ShareMetaOptions
 */

function defaultCache() {
  try {
    return /** @type {any} */ (globalThis).caches?.default ?? null;
  } catch {
    return null;
  }
}

function cacheKey(origin, id) {
  return new Request(`${origin}/__share-meta/${encodeURIComponent(id)}`);
}

/**
 * Reads the thread the way any visitor would (no token, no cookie), with a timeout, through the
 * edge cache. Resolves to the facts for a public or unlisted thread, or null for everything else;
 * never rejects.
 * @param {string} id
 * @param {{ BACKEND_URL?: string }} env
 * @param {string} origin
 * @param {ShareMetaOptions} [options]
 * @returns {Promise<ShareFacts | null>}
 */
export async function loadShareFacts(id, env, origin, options = {}) {
  const {
    fetchImpl = (input, init) => globalThis.fetch(input, init),
    cache = defaultCache(),
    timeoutMs = SHARE_META_TIMEOUT_MS,
    waitUntil,
    log = event => console.log(JSON.stringify(event)),
  } = options;
  const key = cacheKey(origin, id);

  if (cache) {
    try {
      const hit = await cache.match(key);
      if (hit) {
        const stored = await hit.json();
        return stored && typeof stored === 'object' ? (stored.facts ?? null) : null;
      }
    } catch {
      // A broken cache entry is a miss.
    }
  }

  const backend = env?.BACKEND_URL || DEFAULT_BACKEND_URL;
  const base = `/api/threads/${encodeURIComponent(id)}`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = Date.now();
  /** @type {'shared' | 'not_shared' | 'upstream_error' | 'timeout'} */
  let outcome = 'upstream_error';
  /** @type {ShareFacts | null} */
  let facts = null;
  try {
    const call = path =>
      fetchImpl(new URL(path, backend).toString(), {
        method: 'GET',
        headers: { accept: 'application/json', 'x-request-id': crypto.randomUUID() },
        signal: controller.signal,
      });
    const [threadResponse, messagesResponse] = await Promise.all([
      call(base),
      call(`${base}/messages`),
    ]);
    if ([401, 403, 404].includes(threadResponse.status)) {
      outcome = 'not_shared';
    } else if (threadResponse.ok && messagesResponse.ok) {
      const [threadBody, messagesBody] = await Promise.all([
        threadResponse.json(),
        messagesResponse.json(),
      ]);
      facts = shareFactsFrom(threadBody, messagesBody);
      outcome = facts ? 'shared' : 'not_shared';
    }
  } catch {
    outcome = controller.signal.aborted ? 'timeout' : 'upstream_error';
  } finally {
    clearTimeout(timer);
  }

  if (outcome !== 'shared') {
    // The thread id is never logged: an unlisted link is the key to its thread.
    log({ event: 'share_meta_fallback', outcome, ms: Date.now() - startedAt });
  }

  // Only clear answers are cached; a slow or failing API is asked again next time.
  if (cache && (outcome === 'shared' || outcome === 'not_shared')) {
    const ttl = outcome === 'shared' ? SHARE_META_TTL_SECONDS : SHARE_META_MISS_TTL_SECONDS;
    const stored = new Response(JSON.stringify({ facts }), {
      headers: { 'content-type': 'application/json', 'cache-control': `max-age=${ttl}` },
    });
    const put = cache.put(key, stored).catch(() => undefined);
    if (waitUntil) waitUntil(put);
    else await put;
  }
  return facts;
}

/**
 * The share page for a GET or HEAD of /share or /share/...: the SPA fallback with status 200,
 * never cached, with the link-preview tags written in. Null when the fallback page is missing.
 * @param {Request} request
 * @param {{ ASSETS?: { fetch: (request: Request) => Promise<Response> }, BACKEND_URL?: string }} env
 * @param {{ waitUntil?: (promise: Promise<unknown>) => void } | undefined} ctx
 * @param {ShareMetaOptions} [options]
 * @returns {Promise<Response | null>}
 */
export async function serveSharePage(request, env, ctx, options = {}) {
  const page = await serveSpaFallback(request, env);
  if (!page) return null;

  const url = new URL(request.url);
  const id = shareIdFromUrl(url);
  const facts = id
    ? await loadShareFacts(id, env, url.origin, {
        waitUntil: ctx?.waitUntil ? promise => ctx.waitUntil(promise) : undefined,
        ...options,
      })
    : null;
  const meta =
    facts && id ? shareMetaFor(facts, url.origin, id) : genericShareMeta(url.origin, id);

  const response = new Response(page.body, page);
  response.headers.set('cache-control', SHARE_NO_STORE);
  response.headers.delete('etag');
  response.headers.delete('content-length');
  if (meta.robots.startsWith('noindex')) {
    response.headers.set('X-Robots-Tag', meta.robots);
  }
  return injectShareMeta(response, meta);
}
