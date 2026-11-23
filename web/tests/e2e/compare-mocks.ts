import type { Page, Route } from '@playwright/test';

import { mockArena, MODELS } from './arena-mocks';

// The compare routes (backend PR 64, flag be9_compare_mode) answered from memory, on top of the
// arena mocks. The answers are written for the tests and the screenshots; they say nothing about
// real models.

export const COMPARE_ID = 'cmpAbCdEfGhIjKlMnOp12';

const ANSWER_A = `The sky is blue because of **Rayleigh scattering**: air molecules scatter short (blue) wavelengths of sunlight far more than long (red) ones.

- Blue light is scattered in every direction, so you see it wherever you look.
- At sunset the light crosses more air, the blue is scattered away, and the red is left.

\`\`\`text
scattering strength ~ 1 / wavelength^4
\`\`\``;

const ANSWER_B = `Sunlight looks white but is a mix of colors. When it enters the atmosphere, **the small molecules bounce blue light around** much more than red light.

| Color | Wavelength | Scattered |
| --- | ---: | ---: |
| Blue | 450 nm | most |
| Green | 530 nm | some |
| Red | 650 nm | least |

That is why the sky is blue by day and red near the horizon at dusk.`;

export interface CompareMockOptions {
  /** Compare mode off: every compare route answers 404 FEATURE_DISABLED. */
  off?: boolean;
  /** Delay of the run answer in milliseconds (the loading state's screenshot). */
  delayMs?: number;
  /** Make the run fail with this status and code. */
  fail?: { status: number; code: string; retryAfter?: number };
  /** The result could not be stored: no share id, and a warning. */
  unstored?: boolean;
  /** The result is already shared when it is created. */
  shared?: boolean;
}

export interface CompareMockState {
  requests: string[];
  bodies: Array<{ method: string; path: string; body: unknown }>;
  shared: boolean;
  deleted: boolean;
  /** The last run's request body. */
  last: { prompt: string; modelA: string; modelB: string; share?: boolean } | null;
}

const problem = (
  route: Route,
  status: number,
  code: string,
  headers: Record<string, string> = {},
) =>
  route.fulfill({
    status,
    contentType: 'application/problem+json',
    headers,
    body: JSON.stringify({
      type: `https://arena.dualmindlab.tech/problems/${code.toLowerCase()}`,
      title: code,
      status,
      detail: code,
      code,
      message: code,
    }),
  });

const side = (name: string, answer: string, timeMs: number) => {
  const model = MODELS.find(item => item.modelName === name);
  return {
    modelName: name,
    displayName: model?.displayName ?? name,
    provider: model?.providerName ?? 'unknown',
    answer,
    timeMs,
  };
};

export async function mockCompare(
  page: Page,
  options: CompareMockOptions = {},
): Promise<CompareMockState> {
  const state: CompareMockState = {
    requests: [],
    bodies: [],
    shared: options.shared ?? false,
    deleted: false,
    last: null,
  };
  const created = new Date();
  const expires = new Date(created.getTime() + 30 * 24 * 3600 * 1000);
  const result = () => {
    const last = state.last;
    return {
      success: true,
      shareId: options.unstored ? null : COMPARE_ID,
      prompt: last?.prompt ?? 'Why is the sky blue?',
      a: side(last?.modelA ?? MODELS[0]?.modelName ?? '', ANSWER_A, 1840),
      b: side(last?.modelB ?? MODELS[1]?.modelName ?? '', ANSWER_B, 2310),
      createdAt: created.toISOString(),
      shared: state.shared,
      expiresAt: options.unstored ? null : expires.toISOString(),
      replayed: false,
      warnings: options.unstored
        ? ['This result could not be saved, so it has no share link.']
        : [],
    };
  };

  // Registered after mockArena's catch-all, so it answers first.
  await page.route('**/api/compare**', async route => {
    const request = route.request();
    const { pathname } = new URL(request.url());
    const method = request.method();
    state.requests.push(`${method} ${pathname}`);
    if (options.off) return problem(route, 404, 'FEATURE_DISABLED');

    const json = (body: unknown, status = 200) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });

    if (pathname === '/api/compare' && method === 'POST') {
      state.last = request.postDataJSON() as CompareMockState['last'];
      state.bodies.push({ method, path: pathname, body: state.last });
      if (options.delayMs) await new Promise(resolve => setTimeout(resolve, options.delayMs));
      if (options.fail) {
        const headers: Record<string, string> = {};
        if (options.fail.retryAfter) headers['Retry-After'] = String(options.fail.retryAfter);
        return problem(route, options.fail.status, options.fail.code, headers);
      }
      state.shared = state.last?.share === true || (options.shared ?? false);
      state.deleted = false;
      return json(result());
    }

    const match = /^\/api\/compare\/([^/]+)(\/share)?$/.exec(pathname);
    const id = match?.[1];
    if (id === undefined) return problem(route, 404, 'COMPARE_NOT_FOUND');
    if (id !== COMPARE_ID || state.deleted) return problem(route, 404, 'COMPARE_NOT_FOUND');

    if (match?.[2] === '/share' && method === 'PUT') {
      const body = request.postDataJSON() as { shared: boolean };
      state.bodies.push({ method, path: pathname, body });
      state.shared = body.shared;
      return json({ shared: state.shared });
    }
    if (method === 'DELETE') {
      state.deleted = true;
      state.bodies.push({ method, path: pathname, body: null });
      return route.fulfill({ status: 204 });
    }
    if (method === 'GET') {
      const signedIn = request.headers().authorization !== undefined;
      if (!state.shared && !signedIn) return problem(route, 404, 'COMPARE_NOT_FOUND');
      return json(result());
    }
    return problem(route, 404, 'COMPARE_NOT_FOUND');
  });
  return state;
}

/** Signs in (the arena mocks) and turns compare on, or off. */
export async function mockCompareBackend(page: Page, options: CompareMockOptions = {}) {
  await mockArena(page);
  return mockCompare(page, options);
}
