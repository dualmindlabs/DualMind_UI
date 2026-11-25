/**
 * POST /api/signup: adds an email to the waitlist, stored in Cloudflare D1 (binding `DB`, table
 * `signups`, see migrations/0001_signups.sql).
 *
 * Request: a same-origin POST from the page, `Content-Type: application/json`, at most 2 KB:
 *   { "email": "ada@example.com", "ref": "arena" }      ref is optional
 *
 * Responses (always JSON, never cached):
 *   201 { "status": "created" }   added, or already on the list: the answer is the same, so the
 *                                 form cannot be used to find out who has signed up (emails are
 *                                 compared case-insensitively)
 *   400 { "error": "invalid_email" | "invalid_body" }
 *   403 { "error": "forbidden_origin" }          not a same-origin request, or a host that is not ours
 *   405 { "error": "method_not_allowed" }        anything but POST (with Allow: POST)
 *   413 { "error": "too_large" }
 *   415 { "error": "unsupported_media_type" }
 *   429 { "error": "rate_limited" }              with Retry-After
 *   500 { "error": "server_error" }
 *
 * Abuse guards: the hostname check (only early.dualmindlab.tech, plus localhost for development;
 * wrangler.jsonc also sets workers_dev false, so the workers.dev copy does not exist), the
 * same-origin check, the body size cap, a honeypot field (`website`, hidden on
 * the page: if it has a value the request gets a normal-looking 201 and nothing is stored) and a
 * per-client limit of RATE_LIMIT.max requests per RATE_LIMIT.windowSeconds, counted in the Cache API
 * (an IPv6 client is counted by its /64, so one subscriber cannot rotate through its addresses).
 * That limit is per Cloudflare data centre and not atomic, so it slows a script down rather than
 * stopping a determined one.
 */

export const MAX_BODY_BYTES = 2048;
export const MAX_EMAIL_LENGTH = 254;
export const MAX_USER_AGENT_LENGTH = 256;
export const HONEYPOT_FIELD = 'website';
export const RATE_LIMIT = { max: 10, windowSeconds: 600 };
/** The hosts that may serve the signup. Anything else (a workers.dev copy, a proxy) is refused. */
export const ALLOWED_HOSTS = Object.freeze(['early.dualmindlab.tech', 'localhost', '127.0.0.1']);

// The rule browsers use for <input type="email"> (WHATWG HTML), but the domain needs a dot.
const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;
// Same as the page's src/lib/ref.ts: a short slug such as the Arena's `ref=arena`.
const REF_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/;

const INSERT_SQL =
  'INSERT INTO signups (email, ref, country, user_agent) VALUES (?, ?, ?, ?) ON CONFLICT(email) DO NOTHING';

/** Trimmed and lower-cased, or null if it isn't a plausible address. */
export function normaliseEmail(value) {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > MAX_EMAIL_LENGTH) return null;
  const at = email.indexOf('@');
  // The local part (before the @) is 1 to 64 characters.
  if (at < 1 || at > 64) return null;
  return EMAIL_PATTERN.test(email) ? email : null;
}

/** A lower-cased short slug, or null. */
export function sanitiseRef(value) {
  if (typeof value !== 'string') return null;
  const ref = value.trim().toLowerCase();
  return REF_PATTERN.test(ref) ? ref : null;
}

export async function handleSignup(request, env, { rateLimit = cacheRateLimit } = {}) {
  const url = new URL(request.url);

  if (request.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405, { Allow: 'POST' });
  }
  if (!ALLOWED_HOSTS.includes(url.hostname) || !isSameOrigin(request, url)) {
    return json({ error: 'forbidden_origin' }, 403);
  }
  const type = (request.headers.get('Content-Type') || '').split(';')[0].trim().toLowerCase();
  if (type !== 'application/json') {
    return json({ error: 'unsupported_media_type' }, 415);
  }
  if (Number(request.headers.get('Content-Length')) > MAX_BODY_BYTES) {
    return json({ error: 'too_large' }, 413);
  }

  let allowed = true;
  try {
    allowed = await rateLimit(request, url);
  } catch (error) {
    // A broken limiter must not block signups.
    console.error('signup rate limit check failed', error);
  }
  if (!allowed) {
    return json({ error: 'rate_limited' }, 429, { 'Retry-After': String(RATE_LIMIT.windowSeconds) });
  }

  const text = await readBody(request, MAX_BODY_BYTES);
  if (text === null) {
    return json({ error: 'too_large' }, 413);
  }
  let body;
  try {
    body = JSON.parse(text);
  } catch {
    return json({ error: 'invalid_body' }, 400);
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return json({ error: 'invalid_body' }, 400);
  }

  // A person never sees the honeypot field, so a value means a bot. Answer as if it worked.
  const honeypot = body[HONEYPOT_FIELD];
  if (typeof honeypot === 'string' && honeypot.trim() !== '') {
    return json({ status: 'created' }, 201);
  }

  const email = normaliseEmail(body.email);
  if (!email) {
    return json({ error: 'invalid_email' }, 400);
  }
  const ref = sanitiseRef(body.ref);
  const rawCountry = request.cf?.country;
  const country = typeof rawCountry === 'string' && /^[A-Z0-9]{2}$/i.test(rawCountry) ? rawCountry.toUpperCase() : null;
  const userAgent = (request.headers.get('User-Agent') || '').slice(0, MAX_USER_AGENT_LENGTH) || null;

  if (!env?.DB) {
    console.error('signup: the DB (D1) binding is missing');
    return json({ error: 'server_error' }, 500);
  }
  try {
    await env.DB.prepare(INSERT_SQL).bind(email, ref, country, userAgent).run();
    // The same answer for a new and a known address: no email enumeration.
    return json({ status: 'created' }, 201);
  } catch (error) {
    console.error('signup: D1 insert failed', error);
    return json({ error: 'server_error' }, 500);
  }
}

/**
 * Browsers send Origin on every POST. A request from the page itself has our own origin (and, in
 * browsers that send it, Sec-Fetch-Site: same-origin). Anything else, or no Origin at all, is
 * refused, so other sites can't post signups through visitors' browsers.
 */
function isSameOrigin(request, url) {
  if (request.headers.get('Origin') !== url.origin) return false;
  const site = request.headers.get('Sec-Fetch-Site');
  return !site || site === 'same-origin';
}

/** The body as text, or null once it passes `limit` bytes (requests without Content-Length). */
async function readBody(request, limit) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

/**
 * Counts requests per IP in the Cache API (caches.default). Returns false once an IP has made
 * RATE_LIMIT.max requests and none has expired yet; each allowed request restarts the window.
 * Allows everything where the Cache API isn't available (workers.dev, local tests).
 */
export async function cacheRateLimit(request, url) {
  const cache = globalThis.caches?.default;
  const ip = request.headers.get('CF-Connecting-IP');
  if (!cache || !ip) return true;
  const key = new Request(`${url.origin}/__rate-limit/signup/${encodeURIComponent(clientKey(ip))}`);
  const hit = await cache.match(key);
  const count = hit ? Number(await hit.text()) || 0 : 0;
  if (count >= RATE_LIMIT.max) return false;
  await cache.put(
    key,
    new Response(String(count + 1), { headers: { 'Cache-Control': `max-age=${RATE_LIMIT.windowSeconds}` } }),
  );
  return true;
}

/**
 * The counter key of a client address: an IPv4 address as it is, an IPv6 address reduced to its
 * /64 (the first four groups), because one subscriber owns a whole /64 and could otherwise use a
 * fresh address for every request.
 */
export function clientKey(ip) {
  const address = String(ip).trim().toLowerCase();
  if (!address.includes(':')) return address;
  // IPv4-mapped (::ffff:1.2.3.4): the client is the IPv4 address.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(address);
  if (mapped) return mapped[1];
  const [head, tail] = address.split('::');
  const headGroups = head ? head.split(':') : [];
  const tailGroups = tail === undefined ? [] : tail ? tail.split(':') : [];
  const missing = tail === undefined ? 0 : Math.max(0, 8 - headGroups.length - tailGroups.length);
  const groups = [...headGroups, ...Array(missing).fill('0'), ...tailGroups];
  const prefix = groups.slice(0, 4).map(group => group.padStart(4, '0'));
  while (prefix.length < 4) prefix.push('0000');
  return `${prefix.join(':')}::/64`;
}

function json(data, status, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      ...headers,
    },
  });
}
