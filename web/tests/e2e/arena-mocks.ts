import type { Page, Route } from '@playwright/test';

// The arena's backend for the e2e tests: Supabase answered by Playwright routes (the build uses
// the dummy project https://e2eproject.supabase.co, see web.yml) and every /api/* call answered
// from memory here, so no test reaches a real server. The answers are written for the tests and
// the screenshots (they say nothing about real models).

export const SUPABASE = 'https://e2eproject.supabase.co';
export const SESSION_KEY = 'sb-e2eproject-auth-token';

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

export const MODELS = [
  {
    modelId: 'fdbfca6d-a3d2-4a70-b0ab-426024eb5cd5',
    modelName: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    displayName: 'llama-3.3-70b-instruct-fp8-fast',
    providerName: 'cloudflare',
    isFree: true,
    status: 'active',
  },
  {
    modelId: '69a22e49-21bf-4388-88e3-46794e7cbac2',
    modelName: 'groq/compound-mini',
    displayName: 'Compound Mini',
    providerName: 'groq',
    isFree: true,
    status: 'active',
  },
  {
    modelId: '1fe310c7-24d1-49a5-a042-2e409e009524',
    modelName: 'gemma-3n-e2b-it',
    displayName: 'Gemma 3n E2B IT',
    providerName: 'google',
    isFree: true,
    status: 'active',
  },
];

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
    model1Name: MODELS[0]?.modelName,
    model2Name: MODELS[1]?.modelName,
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
  } = {},
): Promise<ArenaMockState> {
  const state: ArenaMockState = {
    threads: options.threads ?? seedThreads(),
    requests: [],
    bodies: [],
    offline: false,
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
    if (path === '/api/arena/model-stats') {
      return json(route, 200, {
        success: true,
        items: MODELS.map((model, index) => ({
          ...model,
          eloScore: 1150 - index * 40,
          eloRank: index + 1,
          totalWins: 60 - index * 10,
          totalLosses: 30,
          totalTies: 9,
          totalResponses: 99 - index * 10,
          winRate: 60 - index * 8,
        })),
      });
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
      if (options.battleDelayMs) await new Promise(resolve => setTimeout(resolve, options.battleDelayMs));
      battles += 1;
      const pick = (id: unknown, fallback: number) =>
        MODELS.find(model => model.modelId === id) ?? MODELS[fallback] ?? MODELS[0];
      const left = pick(body.model1, 0);
      const right = pick(body.model2, 1);
      const answer = (text: string, model: (typeof MODELS)[number] | undefined, ms: number) => ({
        object: 'ai.response',
        success: true,
        message: text,
        model: { name: model?.modelName, displayName: model?.displayName, provider: model?.providerName },
        responseTimeMs: ms,
        usage: { promptTokens: 12, completionTokens: Math.ceil(text.length / 4), totalTokens: 12 + Math.ceil(text.length / 4) },
      });
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
    const match = /^\/api\/threads\/([^/]+)(\/messages)?$/.exec(path);
    if (match) {
      const id = decodeURIComponent(match[1] ?? '');
      const thread = state.threads.find(item => item.threadId === id);
      if (!thread)
        return json(route, 404, { success: false, error: 'Thread not found', code: 'NOT_FOUND' });
      if (match[2]) return json(route, 200, { items: messagesFor(id) });
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
