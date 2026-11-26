// Per-user rate limits with standard headers (docs/backend/designs/BE-3-rate-limits.md).
//
// worker.js calls checkRateLimit() for every /api/* request (v1 proxy and /api/v2) before any
// upstream or router code runs. The request is classified into a route group, keyed (verified
// user id, else the client address), and counted with the Workers Rate Limiting binding of that
// group. Over the limit: 429 with Retry-After, before any model call. Allowed: the response gets
// a static `RateLimit-Policy` header.
//
// The limiter never blocks a good user because of its own fault: a missing binding, a binding
// that throws or one that takes longer than 50 ms lets the request through and says so with
// `X-RateLimit-Status: skipped` and a `ratelimit_unavailable` log line.
//
// Privacy: the client address is used only to build the counter key. With PRIVACY_SALT set the
// key holds an HMAC of it; without the secret the raw address is the key passed in memory to the
// binding, and it is never logged or stored by this code. Logs hold the group and a short key
// hash (only when the salt is set).

import { problemTypeUrl } from './problem-types.js';
import { sanitizeRequestId } from './request-id.js';

/** The limits. wrangler.jsonc `ratelimits` must match (a test checks it). */
export const RATE_LIMIT_GROUPS = Object.freeze({
  battle: { binding: 'RL_BATTLE', namespaceId: '1001', limit: 6, period: 60, noun: 'battles' },
  vote: { binding: 'RL_VOTE', namespaceId: '1002', limit: 10, period: 10, noun: 'votes' },
  speech: { binding: 'RL_SPEECH', namespaceId: '1003', limit: 10, period: 60, noun: 'speech requests' },
  write: { binding: 'RL_WRITE', namespaceId: '1004', limit: 30, period: 60, noun: 'changes' },
  read: { binding: 'RL_READ', namespaceId: '1005', limit: 30, period: 10, noun: 'requests' },
});

export const BINDING_TIMEOUT_MS = 50;

// Every path below makes at least one model call (compare and critique make two), so they share
// the battle group's 6 per minute. The guest battle and the private arena battle are the same.
const BATTLE_PATHS = new Set([
  '/api/arena/dualchat',
  '/api/arena/chat',
  '/api/arena/chat/stream',
  '/api/arena/guest-battle',
  '/api/compare',
]);
const VOTE_PATHS = new Set(['/api/arena/model-vote']);
const CRITIQUE_PATH_RE = /^\/api\/arena\/comparisons\/[^/]+\/critique$/;
const PRIVATE_BATTLE_PATH_RE = /^\/api\/private-arenas\/[^/]+\/battle$/;
const PRIVATE_VOTE_PATH_RE = /^\/api\/private-arenas\/[^/]+\/vote$/;
const SPEECH_PATHS = new Set(['/api/speech/generate', '/api/audio/tts']);
const EXEMPT_PATHS = new Set(['/api/health', '/api/v2/health']);

// The v2 leaderboard is served from the Worker's own Cache API entry (server/v2/leaderboard/
// cache.ts). A read that the cache can answer costs no upstream call, so it is not counted: a
// class or a hostel behind one NAT opening /leaderboard/ together must not get 429s. The key and
// the freshness window equal CACHE_KEY_PATH and STALE_SECONDS there (a test checks both).
export const LEADERBOARD_CACHE_KEY_PATH = '/__cache/leaderboard/v1';
export const LEADERBOARD_CACHE_MAX_AGE_MS = 600_000;
const LEADERBOARD_PATH = '/api/v2/leaderboard';

/**
 * True for an anonymous GET or HEAD of the v2 leaderboard that the Cache API entry can answer
 * (stored less than ten minutes ago). Never throws.
 * @param {Request} request
 * @param {{ cache?: { match: (request: Request) => Promise<Response | undefined> } | null, now?: () => number }} [options]
 * @returns {Promise<boolean>}
 */
export async function isPublicCacheHit(request, options = {}) {
  try {
    const verb = request.method.toUpperCase();
    if (verb !== 'GET' && verb !== 'HEAD') return false;
    const url = new URL(request.url);
    const path = url.pathname.length > 1 ? url.pathname.replace(/\/+$/, '') : url.pathname;
    if (path !== LEADERBOARD_PATH || request.headers.get('authorization')) return false;
    const cache = options.cache === undefined ? globalThis.caches?.default : options.cache;
    if (!cache) return false;
    const hit = await cache.match(new Request(new URL(LEADERBOARD_CACHE_KEY_PATH, url)));
    if (!hit) return false;
    const storedAt = Number(hit.headers.get('X-DM-Stored-At'));
    const now = (options.now ?? Date.now)();
    return Number.isFinite(storedAt) && now - storedAt < LEADERBOARD_CACHE_MAX_AGE_MS;
  } catch {
    return false;
  }
}

/**
 * The address a counter is keyed by. IPv4 stays as it is. An IPv6 address is cut to its /64
 * (the first four groups): one household or host controls a whole /64, so keying by the full
 * address would give it unlimited buckets. The backend does the same (ClientIp.Normalize).
 * @param {string} address
 * @returns {string}
 */
export function normaliseAddress(address) {
  if (!address.includes(':')) return address;
  let text = address.trim().toLowerCase();
  const zone = text.indexOf('%');
  if (zone !== -1) text = text.slice(0, zone);
  // An IPv4-mapped address (::ffff:1.2.3.4) is an IPv4 client.
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/.exec(text);
  if (mapped) return mapped[1];
  const halves = text.split('::');
  if (halves.length > 2) return address;
  const head = halves[0] ? halves[0].split(':') : [];
  const tail = halves.length === 2 && halves[1] ? halves[1].split(':') : [];
  if (halves.length === 1 && head.length !== 8) return address;
  const groups = halves.length === 2 ? [...head, ...Array(Math.max(0, 8 - head.length - tail.length)).fill('0'), ...tail] : head;
  if (groups.length !== 8 || groups.some(group => !/^[0-9a-f]{1,4}$/.test(group))) return address;
  return `${groups.slice(0, 4).map(group => group.replace(/^0+(?=.)/, '')).join(':')}::/64`;
}

const DEV_SALT = 'dualmind-unsalted-development-salt';
const PROBLEM_CONTENT_TYPE = 'application/problem+json; charset=utf-8';

/**
 * The route group of a request, or null when it is not limited (health checks, OPTIONS,
 * anything outside /api/).
 * @param {string} method
 * @param {string} pathname
 * @returns {keyof typeof RATE_LIMIT_GROUPS | null}
 */
export function classify(method, pathname) {
  const verb = method.toUpperCase();
  if (verb === 'OPTIONS') return null;
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  if (!path.startsWith('/api/') || EXEMPT_PATHS.has(path)) return null;
  if (verb === 'GET' || verb === 'HEAD') return 'read';
  if (verb === 'POST') {
    if (BATTLE_PATHS.has(path) || CRITIQUE_PATH_RE.test(path) || PRIVATE_BATTLE_PATH_RE.test(path)) {
      return 'battle';
    }
    if (VOTE_PATHS.has(path) || PRIVATE_VOTE_PATH_RE.test(path)) return 'vote';
    if (SPEECH_PATHS.has(path)) return 'speech';
  }
  return 'write';
}

/** `"battle";q=6;w=60` */
export function policyHeader(group) {
  const { limit, period } = RATE_LIMIT_GROUPS[group];
  return `"${group}";q=${limit};w=${period}`;
}

async function hmacHex(salt, message) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(salt), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(mac), byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * The counter key and what may be logged about it. `userId` must come from a verified token;
 * an unverified token is never decoded here.
 * @param {Request} request
 * @param {{ PRIVACY_SALT?: string }} env
 * @param {string | null} userId
 * @returns {Promise<{ key: string, kind: 'user' | 'ip', hash8: string | null }>}
 */
export async function limiterKey(request, env, userId) {
  const salt = env?.PRIVACY_SALT || null;
  if (userId) {
    return { key: `u:${userId}`, kind: 'user', hash8: salt ? (await hmacHex(salt, `user:${userId}`)).slice(0, 8) : null };
  }
  const address = normaliseAddress(request.headers.get('cf-connecting-ip') || 'unknown');
  if (!salt) {
    // No secret yet: the raw address is the in-memory key for the binding, never logged.
    return { key: `ip:${address}`, kind: 'ip', hash8: null };
  }
  const hex = await hmacHex(salt, `ip:${address}`);
  return { key: `ip:${hex.slice(0, 32)}`, kind: 'ip', hash8: hex.slice(0, 8) };
}

/** The binding's answer, or null when it is missing, throws or is too slow. */
async function askBinding(binding, key, timeoutMs) {
  if (!binding || typeof binding.limit !== 'function') return null;
  let timer;
  try {
    const result = await Promise.race([
      binding.limit({ key }),
      new Promise((_resolve, reject) => {
        timer = setTimeout(() => reject(new Error('timeout')), timeoutMs);
      }),
    ]);
    return typeof result?.success === 'boolean' ? result : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function wantsProblem(request, pathname) {
  if (pathname === '/api/v2' || pathname.startsWith('/api/v2/')) return true;
  const accept = request.headers.get('accept') || '';
  return accept.split(',').some(range => range.split(';')[0].trim().toLowerCase() === 'application/problem+json');
}

/** The 429 answer: problem+json for opted-in callers and /api/v2, the small v1 body otherwise. */
export function limitedResponse({ request, group, requestId }) {
  const { period, noun } = RATE_LIMIT_GROUPS[group];
  const { pathname } = new URL(request.url);
  const headers = {
    'Cache-Control': 'no-store',
    'X-Request-Id': requestId,
    'Retry-After': String(period),
    RateLimit: `"${group}";r=0;t=${period}`,
    'RateLimit-Policy': policyHeader(group),
    Vary: 'Accept',
  };
  if (wantsProblem(request, pathname)) {
    const body = {
      type: problemTypeUrl('rate_limited'),
      title: 'Too many requests',
      status: 429,
      detail: `Too many ${noun}. Try again in ${period} seconds.`,
      instance: pathname,
      requestId,
      retryAfter: period,
    };
    return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
      status: 429,
      headers: { ...headers, 'Content-Type': PROBLEM_CONTENT_TYPE },
    });
  }
  const body = { error: 'rate_limited', requestId, retryAfter: period };
  return new Response(request.method === 'HEAD' ? null : JSON.stringify(body), {
    status: 429,
    headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' },
  });
}

const defaultLog = event => console.log(JSON.stringify(event));
let warnedUnsalted = false;

/**
 * @param {Request} request
 * @param {Record<string, any>} env bindings RL_* and the optional PRIVACY_SALT
 * @param {{
 *   verifyUser?: (request: Request, env: object) => Promise<string | null>,
 *   log?: (event: object) => void,
 *   timeoutMs?: number,
 *   newId?: () => string,
 *   isCacheHit?: (request: Request) => Promise<boolean>,
 * }} [options] `verifyUser` returns the id of a verified user (BE-0 verifier), else null.
 * @returns {Promise<{ group: string | null, requestId: string | null, response: Response | null, decorate: (response: Response) => Response }>}
 */
export async function checkRateLimit(request, env, options = {}) {
  const {
    verifyUser,
    log = defaultLog,
    timeoutMs = BINDING_TIMEOUT_MS,
    newId = () => crypto.randomUUID(),
    isCacheHit,
  } = options;
  const none = { group: null, requestId: null, response: null, decorate: response => response };
  let group;
  try {
    group = classify(request.method, new URL(request.url).pathname);
  } catch {
    return none;
  }
  if (!group) return none;

  // Public reads the edge cache can answer are not counted (see isPublicCacheHit).
  if (group === 'read' && isCacheHit) {
    let hit = false;
    try {
      hit = await isCacheHit(request);
    } catch {
      hit = false;
    }
    if (hit) return none;
  }

  const requestId = sanitizeRequestId(request.headers.get('x-request-id')) ?? newId();
  const route = new URL(request.url).pathname;
  const config = RATE_LIMIT_GROUPS[group];

  let userId = null;
  if (verifyUser && /^Bearer\s+\S+/i.test(request.headers.get('authorization') || '')) {
    try {
      userId = (await verifyUser(request, env)) || null;
    } catch {
      userId = null; // a bad token falls back to the address key
    }
  }

  let identity;
  try {
    if (!env?.PRIVACY_SALT && !warnedUnsalted) {
      warnedUnsalted = true;
      log({ event: 'ratelimit_unsalted' });
    }
    identity = await limiterKey(request, env, userId);
  } catch {
    identity = null;
  }

  const answer = identity ? await askBinding(env?.[config.binding], identity.key, timeoutMs) : null;
  const policy = policyHeader(group);

  if (answer === null) {
    log({ event: 'ratelimit_unavailable', requestId, group, ratelimit_unavailable_total: 1 });
    return {
      group,
      requestId,
      response: null,
      decorate: response => withHeaders(response, { 'RateLimit-Policy': policy, 'X-RateLimit-Status': 'skipped' }),
    };
  }

  if (!answer.success) {
    log({
      event: 'rate_limited',
      requestId,
      group,
      keyKind: identity.kind,
      keyHash8: identity.hash8,
      route,
      ratelimit_checks_total: { group, outcome: 'limited' },
    });
    return { group, requestId, response: limitedResponse({ request, group, requestId }), decorate: response => response };
  }

  return {
    group,
    requestId,
    response: null,
    decorate: response => withHeaders(response, { 'RateLimit-Policy': policy }),
  };
}

function withHeaders(response, headers) {
  const next = new Response(response.body, response);
  for (const [name, value] of Object.entries(headers)) next.headers.set(name, value);
  return next;
}
