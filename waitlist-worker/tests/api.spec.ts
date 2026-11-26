import { expect, test } from '@playwright/test';
import { ALLOWED_HOSTS, clientKey, handleSignup, MAX_BODY_BYTES, MAX_USER_AGENT_LENGTH, normaliseEmail, sanitiseRef } from '../server/signup.js';
import worker from '../worker.js';

// Unit tests for the Worker's POST /api/signup handler (server/signup.js), run in Node with a fake
// D1 database: no browser, no network. They run once, in the desktop project.
test.beforeEach(({}, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Runs once');
});

const ORIGIN = 'https://early.dualmindlab.tech';
const allow = async () => true;

type Row = { email: string; ref: unknown; country: unknown; user_agent: unknown };

/** Just enough of D1 for the handler: prepare(sql).bind(...).run(), with a case-insensitive unique email. */
function fakeDb({ fail = false } = {}) {
  const rows: Row[] = [];
  const statements: string[] = [];
  return {
    rows,
    statements,
    prepare(sql: string) {
      statements.push(sql);
      return {
        bind(...args: unknown[]) {
          return {
            async run() {
              if (fail) throw new Error('D1 is down');
              const [email, ref, country, user_agent] = args;
              if (rows.some(row => row.email.toLowerCase() === String(email).toLowerCase())) {
                return { meta: { changes: 0 } };
              }
              rows.push({ email: String(email), ref, country, user_agent });
              return { meta: { changes: 1 } };
            },
          };
        },
      };
    },
  };
}

function signupRequest(
  body: unknown,
  { method = 'POST', headers = {}, raw, country = 'IN' }: { method?: string; headers?: Record<string, string>; raw?: string; country?: string } = {},
) {
  const request = new Request(`${ORIGIN}/api/signup`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Origin: ORIGIN,
      'Sec-Fetch-Site': 'same-origin',
      'User-Agent': 'Mozilla/5.0 (test)',
      ...headers,
    },
    body: method === 'GET' || method === 'HEAD' ? undefined : (raw ?? JSON.stringify(body)),
  });
  // Cloudflare adds request.cf; Node's Request has none.
  Object.defineProperty(request, 'cf', { value: { country } });
  return request;
}

async function call(request: Request, db = fakeDb(), rateLimit = allow) {
  const response = await handleSignup(request, { DB: db }, { rateLimit });
  const text = await response.text();
  return { status: response.status, headers: response.headers, body: text ? JSON.parse(text) : null, db };
}

test('a new email is stored lower-cased with ref, country and user agent: 201 created', async () => {
  const { status, body, headers, db } = await call(signupRequest({ email: '  Ada.Lovelace@Example.COM ', ref: 'Arena' }));
  expect(status).toBe(201);
  expect(body).toEqual({ status: 'created' });
  expect(headers.get('cache-control')).toBe('no-store');
  expect(db.rows).toEqual([{ email: 'ada.lovelace@example.com', ref: 'arena', country: 'IN', user_agent: 'Mozilla/5.0 (test)' }]);
  expect(db.statements[0]).toContain('ON CONFLICT(email) DO NOTHING');
});

test('the same email again, in any case: the same 201 answer, nothing added', async () => {
  const db = fakeDb();
  const first = await call(signupRequest({ email: 'dup@example.com' }), db);
  const again = await call(signupRequest({ email: 'DUP@Example.com' }), db);
  expect(first.status).toBe(201);
  expect(again.status).toBe(201);
  expect(again.body).toEqual(first.body);
  expect(db.rows).toHaveLength(1);
});

test('only our own hostname may serve the signup (not workers.dev)', async () => {
  expect(ALLOWED_HOSTS).toContain('early.dualmindlab.tech');
  const host = 'https://dualmind-waitlist.example.workers.dev';
  const request = new Request(`${host}/api/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Origin: host, 'Sec-Fetch-Site': 'same-origin' },
    body: JSON.stringify({ email: 'a@b.co' }),
  });
  const response = await call(request);
  expect(response.status).toBe(403);
  expect(response.db.rows).toEqual([]);
});

test('the rate-limit key of an IPv6 client is its /64', () => {
  expect(clientKey('203.0.113.7')).toBe('203.0.113.7');
  expect(clientKey('::ffff:203.0.113.7')).toBe('203.0.113.7');
  const a = clientKey('2001:db8:abcd:12:1:2:3:4');
  expect(a).toBe('2001:0db8:abcd:0012::/64');
  expect(clientKey('2001:DB8:abcd:12:ffff:ffff:ffff:ffff')).toBe(a);
  expect(clientKey('2001:db8:abcd:13::1')).not.toBe(a);
  expect(clientKey('2001:db8::1')).toBe('2001:0db8:0000:0000::/64');
  expect(clientKey('::1')).toBe('0000:0000:0000:0000::/64');
});

test('email validation', () => {
  for (const good of ['a@b.co', 'first.last+tag@sub.example.org', "o'brien@example.ie", '  MiXeD@Example.com  ']) {
    expect(normaliseEmail(good), good).toBe(good.trim().toLowerCase());
  }
  // 254 characters is the most an address can have; one more is refused.
  const longest = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(57)}.com`;
  expect(longest.length).toBe(254);
  expect(normaliseEmail(longest)).toBe(longest);
  const long = `${'a'.repeat(64)}@${'b'.repeat(63)}.${'c'.repeat(63)}.${'d'.repeat(58)}.com`;
  for (const bad of [
    '',
    '   ',
    'plain',
    '@example.com',
    'ada@',
    'ada@localhost',
    'ada@@example.com',
    'ada lovelace@example.com',
    'ada@exa mple.com',
    'ada@-example.com',
    'ada@example..com',
    '<script>@example.com',
    `${'a'.repeat(65)}@example.com`,
    long,
    'ada@exämple.com',
    null,
    42,
    ['a@b.co'],
    { email: 'a@b.co' },
  ]) {
    expect(normaliseEmail(bad), JSON.stringify(bad)).toBeNull();
  }
});

test('ref is kept only as a short slug', () => {
  expect(sanitiseRef('arena')).toBe('arena');
  expect(sanitiseRef(' CV-2026_x ')).toBe('cv-2026_x');
  for (const bad of ['', '-arena', 'a'.repeat(41), '<script>', 'arena link', 'ärena', null, 7]) {
    expect(sanitiseRef(bad), JSON.stringify(bad)).toBeNull();
  }
});

test('an invalid email or body: 400, nothing stored', async () => {
  for (const [payload, error] of [
    [{ email: 'not-an-email' }, 'invalid_email'],
    [{ email: 'ada@localhost' }, 'invalid_email'],
    [{}, 'invalid_email'],
    [[], 'invalid_body'],
    ['ada@example.com', 'invalid_body'],
    [null, 'invalid_body'],
  ] as const) {
    const { status, body, db } = await call(signupRequest(payload));
    expect(status, JSON.stringify(payload)).toBe(400);
    expect(body).toEqual({ error });
    expect(db.rows).toEqual([]);
  }
  const broken = await call(signupRequest(null, { raw: '{"email": ' }));
  expect(broken.status).toBe(400);
  expect(broken.body).toEqual({ error: 'invalid_body' });
});

test('junk ref, unknown country and a long user agent are cleaned up', async () => {
  const { db } = await call(
    signupRequest({ email: 'a@b.co', ref: '<img src=x>' }, { country: 'not a country', headers: { 'User-Agent': 'x'.repeat(5000) } }),
  );
  expect(db.rows[0]).toEqual({ email: 'a@b.co', ref: null, country: null, user_agent: 'x'.repeat(MAX_USER_AGENT_LENGTH) });
});

test('a filled honeypot looks like success but stores nothing', async () => {
  const { status, body, db } = await call(signupRequest({ email: 'bot@example.com', website: 'https://spam.example' }));
  expect(status).toBe(201);
  expect(body).toEqual({ status: 'created' });
  expect(db.rows).toEqual([]);
  // An empty honeypot is what people send (well, the page leaves it out): stored as normal.
  expect((await call(signupRequest({ email: 'person@example.com', website: '' }))).db.rows).toHaveLength(1);
});

test('only same-origin POSTs with a JSON body are accepted', async () => {
  const get = await call(signupRequest(null, { method: 'GET' }));
  expect(get.status).toBe(405);
  expect(get.headers.get('allow')).toBe('POST');

  const refused: Record<string, string>[] = [
    { Origin: 'https://evil.example' },
    { Origin: 'http://early.dualmindlab.tech' },
    { Origin: '' },
    { 'Sec-Fetch-Site': 'cross-site' },
  ];
  for (const headers of refused) {
    const response = await call(signupRequest({ email: 'a@b.co' }, { headers }));
    expect(response.status, JSON.stringify(headers)).toBe(403);
    expect(response.db.rows).toEqual([]);
  }

  const form = await call(signupRequest(null, { raw: 'email=a@b.co', headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }));
  expect(form.status).toBe(415);
  // A charset parameter is fine.
  expect((await call(signupRequest({ email: 'a@b.co' }, { headers: { 'Content-Type': 'application/json; charset=utf-8' } }))).status).toBe(201);
});

test('bodies over 2 KB are refused, by header or by size', async () => {
  const declared = await call(signupRequest({ email: 'a@b.co' }, { headers: { 'Content-Length': String(MAX_BODY_BYTES + 1) } }));
  expect(declared.status).toBe(413);
  const padded = await call(signupRequest({ email: 'a@b.co', padding: 'x'.repeat(MAX_BODY_BYTES) }));
  expect(padded.status).toBe(413);
  expect(padded.db.rows).toEqual([]);
});

test('over the rate limit: 429 with Retry-After, nothing stored', async () => {
  const { status, body, headers, db } = await call(signupRequest({ email: 'a@b.co' }), fakeDb(), async () => false);
  expect(status).toBe(429);
  expect(body).toEqual({ error: 'rate_limited' });
  expect(Number(headers.get('retry-after'))).toBeGreaterThan(0);
  expect(db.rows).toEqual([]);
  // A limiter that throws doesn't block signups.
  const broken = await call(signupRequest({ email: 'a@b.co' }), fakeDb(), async () => {
    throw new Error('cache unavailable');
  });
  expect(broken.status).toBe(201);
});

test('a database error is a 500, not a crash', async () => {
  const { status, body } = await call(signupRequest({ email: 'a@b.co' }), fakeDb({ fail: true }));
  expect(status).toBe(500);
  expect(body).toEqual({ error: 'server_error' });
  const response = await handleSignup(signupRequest({ email: 'a@b.co' }), {}, { rateLimit: allow });
  expect(response.status).toBe(500);
});

test('the Worker routes /api/signup to the handler and answers other /api/ paths with 404', async () => {
  const db = fakeDb();
  const created = await worker.fetch(signupRequest({ email: 'via-worker@example.com' }), { DB: db });
  expect(created.status).toBe(201);
  expect(db.rows).toHaveLength(1);
  const other = await worker.fetch(new Request(`${ORIGIN}/api/other`), { DB: db });
  expect(other.status).toBe(404);
});


test('an unknown address gets the 404 page with status 404', async () => {
  const assets = {
    fetch: async (request: Request) => {
      const { pathname } = new URL(request.url);
      if (pathname === '/404') {
        return new Response('<title>Page not found</title>', { status: 200, headers: { 'content-type': 'text/html' } });
      }
      return new Response('', { status: 404 });
    },
  };
  const response = await worker.fetch(new Request(`${ORIGIN}/does-not-exist`), { ASSETS: assets });
  expect(response.status).toBe(404);
  expect(await response.text()).toContain('Page not found');
  expect(response.headers.get('x-robots-tag')).toBe('noindex');
  // No traffic headers that echo the referer.
  expect(response.headers.get('x-traffic-referer')).toBeNull();
  expect(response.headers.get('x-waitlist-traffic')).toBeNull();
});
