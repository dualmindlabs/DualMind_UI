import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { Page, Route } from '@playwright/test';

// The arena's backend for the e2e tests: Supabase answered by Playwright routes (the build uses
// the dummy project https://e2eproject.supabase.co, see web.yml) and every /api/* call answered
// from memory here, so no test reaches a real server. The answers are written for the tests and
// the screenshots (they say nothing about real models).

export const SUPABASE = 'https://e2eproject.supabase.co';
export const SESSION_KEY = 'sb-e2eproject-auth-token';

// The picker's ranks and ratings come from the same recorded board as the leaderboard page, so
// the two never disagree in the review screenshots.
const BOARD = readFileSync(
  path.join(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    'fixtures',
    'api',
    'leaderboard-v2.board.json',
  ),
  'utf8',
);

const USER = {
  id: '00000000-0000-4000-8000-000000000001',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'ada@example.com',
  phone: '',
  email_confirmed_at: '2026-10-01T10:00:00Z',
  app_metadata: { provider: 'email', providers: ['email'] },
  user_metadata: { full_name: 'Ada Lovelace' },
  identities: [],
  created_at: '2026-10-01T10:00:00Z',
  updated_at: '2026-10-01T10:00:00Z',
};

function jwt(payload: object): string {
  const encode = (value: object) => Buffer.from(JSON.stringify(value)).toString('base64url');
  return `${encode({ alg: 'HS256', typ: 'JWT' })}.${encode(payload)}.c2lnbmF0dXJl`;
}

export function sessionJson(): string {
  const now = Math.floor(Date.now() / 1000);
  const accessToken = jwt({
    sub: USER.id,
    aud: 'authenticated',
    role: 'authenticated',
    email: USER.email,
    iat: now,
    exp: now + 3600,
    session_id: 'session-e2e',
  });
  return JSON.stringify({
    access_token: accessToken,
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    refresh_token: 'refresh-e2e',
    user: USER,
  });
}

interface RecordedStat {
  modelId: string;
  modelName: string;
  displayName: string;
  providerName: string;
}

/**
 * The catalogue (`GET /api/models`): every model on the recorded board, with the same ids,
 * names and providers, so the pickers list what the leaderboard lists (53 models, ranked and not
 * yet rated) and the two never disagree in the review screenshots.
 */
export const MODELS = (JSON.parse(BOARD) as { items: RecordedStat[] }).items.map(stat => ({
  modelId: stat.modelId,
  modelName: stat.modelName,
  displayName: stat.displayName,
  providerName: stat.providerName,
  isFree: true,
  status: 'active',
}));

function boardModel(modelName: string) {
  const found = MODELS.find(item => item.modelName === modelName);
  if (!found) throw new Error(`${modelName} is not on the recorded board`);
  return found;
}

/** The pair a battle answers with when the request names none (and the stored threads). */
export const PAIR = [
  boardModel('@cf/meta/llama-3.3-70b-instruct-fp8-fast'),
  boardModel('groq/compound-mini'),
] as const;

const ANSWER_A = `Recursion is when a function **solves a problem by calling itself** on a smaller piece of the same problem.

## The two rules

1. A **base case** that stops: the smallest input, answered directly.
2. A **recursive case** that moves towards it.

\`\`\`python
def factorial(n: int) -> int:
    if n <= 1:          # base case
        return 1
    return n * factorial(n - 1)
\`\`\`

Without the base case the calls never end, and the program runs out of stack. Read more in the [Python docs](https://docs.python.org/3/tutorial/controlflow.html).`;

const ANSWER_B = `Think of **Russian nesting dolls**: to find the smallest doll, you open one doll and do the same thing again with the doll inside.

- Each step is the *same task*, just smaller.
- You stop when a doll does not open (the base case).

| Input | Calls made | Result |
| --- | ---: | ---: |
| 1 | 1 | 1 |
| 3 | 3 | 6 |
| 5 | 5 | 120 |

That is all recursion is: a task defined in terms of a smaller copy of itself.`;

function iso(daysAgo: number, hour = 11): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, 15, 0, 0);
  return date.toISOString();
}

export interface ArenaMockState {
  threads: Array<Record<string, unknown>>;
  requests: string[];
  /** Request bodies of the battle and vote calls, in order. */
  bodies: Array<{ path: string; body: Record<string, unknown> }>;
  /** While true, votes fail like a dropped connection (the offline queue keeps them). */
  offline: boolean;
  /** The Idempotency-Key header of each dualchat request, in order (empty when none was sent). */
  idempotencyKeys: string[];
}

export function seedThreads(): Array<Record<string, unknown>> {
  const thread = (id: string, title: string, mode: string, daysAgo: number, hour?: number) => ({
    threadId: id,
    userId: USER.id,
    title,
    mode,
    visibility: 'private',
    messageCount: id === 't-recursion' ? 2 : 1,
    createdAt: iso(daysAgo, hour),
    updatedAt: iso(daysAgo, hour),
  });
  return [
    thread('t-recursion', 'Explain recursion to a ten-year-old', 'battle', 0, 10),
    thread('t-haiku', 'Write a haiku about merge conflicts', 'arena', 0, 9),
    thread('t-sql', 'Review this SQL for bugs', 'battle', 1),
    thread('t-email', 'Decline a meeting politely', 'direct', 3),
    thread('t-monty', 'Why does switching win in Monty Hall?', 'battle', 4),
    thread('t-lisbon', 'Plan three days in Lisbon on a budget', 'battle', 21),
  ];
}

function messagesFor(threadId: string) {
  const row = (position: number, prompt: string, vote: string | null) => ({
    messageId: `${threadId}-m${position}`,
    threadId,
    position,
    promptText: prompt,
    model1Name: PAIR[0].modelName,
    model2Name: PAIR[1].modelName,
    model1Response: ANSWER_A,
    model2Response: ANSWER_B,
    model1TimeMs: 1840,
    model2TimeMs: 2310,
    comparisonId: `${threadId}-c${position}`,
    voteChoice: vote,
    hasVoted: vote !== null,
    createdAt: iso(0, 10),
  });
  if (threadId === 't-recursion') {
    return [
      row(0, 'Explain recursion to a ten-year-old', 'right'),
      row(1, 'Now show it with a short Python example', null),
    ];
  }
  return [row(0, 'A stored prompt', null)];
}

const json = (route: Route, status: number, body: unknown) =>
  route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

/** Signs the browser in (a stored session) and answers Supabase and the API from memory. */
export async function mockArena(
  page: Page,
  options: {
    threads?: Array<Record<string, unknown>>;
    failThreads?: boolean;
    /** Delay of the battle answer, in milliseconds (the waiting state's screenshot). */
    battleDelayMs?: number;
    /**
     * `fallback`: a backup model answered, so the API stores no comparison (no `comparisonId`,
     * `fallbackUsed: true`). `unavailable`: neither model answered (503 `upstream_unavailable`).
     */
    battle?: 'fallback' | 'unavailable';
    /** Thread ids that belong to another account: their reads answer 403. */
    foreignThreads?: string[];
  } = {},
): Promise<ArenaMockState> {
  const state: ArenaMockState = {
    threads: options.threads ?? seedThreads(),
    requests: [],
    bodies: [],
    offline: false,
    idempotencyKeys: [],
  };
  let battles = 0;
  const session = sessionJson();
  await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
    SESSION_KEY,
    session,
  ] as const);

  await page.route(`${SUPABASE}/**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'access-control-allow-origin': '*',
          'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'access-control-allow-headers':
            request.headers()['access-control-request-headers'] ?? 'content-type',
        },
      });
      return;
    }
    const path = new URL(request.url()).pathname;
    const cors = { 'access-control-allow-origin': '*', 'content-type': 'application/json' };
    if (path === '/auth/v1/user') {
      await route.fulfill({ status: 200, headers: cors, body: JSON.stringify(USER) });
    } else if (path === '/auth/v1/token') {
      await route.fulfill({ status: 200, headers: cors, body: session });
    } else if (path === '/auth/v1/logout') {
      await route.fulfill({ status: 204, headers: cors });
    } else {
      await route.fulfill({ status: 200, headers: cors, body: '{}' });
    }
  });

  await page.route('**/api/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    const method = request.method();
    state.requests.push(`${method} ${path}`);

    if (path === '/api/users/sync') {
      return json(route, 200, { success: true, user: { user_id: USER.id, name: 'Ada Lovelace' } });
    }
    if (path === '/api/models') return json(route, 200, { items: MODELS });
    if (path === '/api/v2/leaderboard') {
      return json(route, 200, JSON.parse(BOARD));
    }
    // Direct chat streams from the e2e backend (serve-dist.mjs), in real chunks.
    if (path === '/api/arena/chat/stream') return route.continue();
    if (path === '/api/threads' && method === 'POST') {
      const body = request.postDataJSON() as { title?: string; mode?: string };
      const created = {
        threadId: `t-new-${state.threads.length + 1}`,
        userId: USER.id,
        title: body.title ?? 'New thread',
        mode: body.mode ?? 'battle',
        visibility: 'private',
        messageCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      state.threads = [created, ...state.threads];
      return json(route, 200, created);
    }
    if (path === '/api/arena/dualchat') {
      const body = request.postDataJSON() as Record<string, unknown>;
      state.bodies.push({ path, body });
      state.idempotencyKeys.push(request.headers()['idempotency-key'] ?? '');
      if (options.battleDelayMs)
        await new Promise(resolve => setTimeout(resolve, options.battleDelayMs));
      if (options.battle === 'unavailable') {
        return route.fulfill({
          status: 503,
          contentType: 'application/problem+json',
          headers: { 'Retry-After': '5' },
          body: JSON.stringify({
            type: 'https://arena.dualmindlab.tech/problems/upstream_unavailable',
            title: 'Models unavailable',
            status: 503,
            detail: 'Neither model answered.',
            code: 'MODEL_UNAVAILABLE',
            message: 'Neither model answered.',
          }),
        });
      }
      battles += 1;
      const pick = (id: unknown, fallback: 0 | 1) =>
        MODELS.find(item => item.modelId === id) ?? PAIR[fallback];
      const left = pick(body.model1, 0);
      const right = pick(body.model2, 1);
      const answer = (text: string, model: (typeof MODELS)[number], ms: number) => ({
        object: 'ai.response',
        success: true,
        message: text,
        model: {
          name: model.modelName,
          displayName: model.displayName,
          provider: model.providerName,
        },
        responseTimeMs: ms,
        usage: {
          promptTokens: 12,
          completionTokens: Math.ceil(text.length / 4),
          totalTokens: 12 + Math.ceil(text.length / 4),
        },
      });
      if (options.battle === 'fallback') {
        // Like the API: no comparison is stored, so there is no `comparisonId`.
        return json(route, 200, {
          success: true,
          fallbackUsed: true,
          agent1: answer(ANSWER_A, left, 1840),
          agent2: {
            ...answer(ANSWER_B, right, 2310),
            servedBy: 'groq/compound-mini',
            fallbackUsed: true,
          },
        });
      }
      return json(route, 200, {
        success: true,
        comparisonId: `c-live-${battles}`,
        agent1: answer(ANSWER_A, left, 1840),
        agent2: answer(ANSWER_B, right, 2310),
      });
    }
    if (path === '/api/arena/model-vote') {
      const body = request.postDataJSON() as Record<string, unknown>;
      if (state.offline) return route.abort('internetdisconnected');
      state.bodies.push({ path, body });
      return json(route, 200, { success: true, message: 'Vote recorded' });
    }
    if (path === '/api/threads' && method === 'GET') {
      if (options.failThreads)
        return json(route, 500, { success: false, error: 'Boom', code: 'INTERNAL_ERROR' });
      return json(route, 200, { items: state.threads });
    }
    if (path === '/api/settings/feature-flag/public_sharing') {
      return json(route, 200, { key: 'public_sharing', enabled: true });
    }
    const match = /^\/api\/threads\/([^/]+)(\/messages|\/visibility)?$/.exec(path);
    if (match) {
      const id = decodeURIComponent(match[1] ?? '');
      if (options.foreignThreads?.includes(id)) {
        return route.fulfill({
          status: 403,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            type: 'https://arena.dualmindlab.tech/problems/forbidden',
            title: 'Forbidden',
            status: 403,
            code: 'FORBIDDEN',
          }),
        });
      }
      const thread = state.threads.find(item => item.threadId === id);
      if (!thread)
        return json(route, 404, { success: false, error: 'Thread not found', code: 'NOT_FOUND' });
      if (match[2] === '/visibility' && method === 'PATCH') {
        const body = request.postDataJSON() as { visibility?: string };
        state.bodies.push({ path, body });
        thread.visibility = body.visibility ?? thread.visibility;
        return json(route, 200, {
          success: true,
          message: 'Visibility updated',
          visibility: thread.visibility,
        });
      }
      if (match[2] === '/messages') return json(route, 200, { items: messagesFor(id) });
      if (method === 'GET') return json(route, 200, thread);
      if (method === 'PATCH') {
        const body = request.postDataJSON() as { title?: string };
        thread.title = body.title ?? thread.title;
        return json(route, 200, { success: true, message: 'Thread updated' });
      }
      if (method === 'DELETE') {
        state.threads = state.threads.filter(item => item.threadId !== id);
        return json(route, 200, { success: true, message: 'Thread deleted' });
      }
    }
    if (path === '/api/health') return json(route, 200, { status: 'healthy' });
    return json(route, 404, {
      success: false,
      error: `unmocked ${method} ${path}`,
      code: 'NOT_FOUND',
    });
  });

  return state;
}
