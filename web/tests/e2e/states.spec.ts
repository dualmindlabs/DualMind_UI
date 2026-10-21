import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import {
  type BrowserContext,
  expect,
  type Locator,
  type Page,
  type Route,
  test,
} from '@playwright/test';

import { mockArena, SUPABASE } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// Proof of quality for the data screens: every state a visitor can land in, not only the happy
// path. For the leaderboard, the models page, the two sign-in pages and the arena, each failure
// state is forced with Playwright route mocks (nothing reaches a real server), asserted (visible
// copy, the live region it is announced in, the request id where one is designed), checked with
// axe, and screenshotted in dark and light, on a desktop and on a phone, as
// state-<screen>-<state>-<viewport>-<theme>.png (uploaded with the other `web-screenshots`).

const here = path.dirname(fileURLToPath(import.meta.url));
const BOARD = readFileSync(
  path.join(here, '..', 'fixtures', 'api', 'model-stats.board.recorded.json'),
  'utf8',
);
const STATS = '**/api/arena/model-stats';
const PROBLEM = 'https://arena.dualmindlab.tech/problems/';
const STRONG = 'Tabs&Spaces-2026';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
] as const;
const THEMES = ['dark', 'light'] as const;

/** Chrome logs every failed request ("Failed to load resource"): expected while forcing errors. */
const EXPECTED_NOISE =
  /Failed to load resource|net::ERR_|ERR_INTERNET_DISCONNECTED|Failed to fetch/;

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      violation =>
        `${violation.id} (${violation.impact}): ${violation.nodes
          .slice(0, 3)
          .map(node => node.target.join(' '))
          .join(', ')}`,
    );
}

interface Ctx {
  page: Page;
  context: BrowserContext;
}

/**
 * Forces the state and asserts it. Returns the element that shows it (scrolled into view for
 * the screenshots: the states sit below a long hero) and may return a cleanup (release a held
 * response).
 */
interface Shown {
  focus: Locator;
  cleanup?: () => void;
}
type Scenario = {
  screen: string;
  state: string;
  run: (ctx: Ctx) => Promise<Shown>;
};

// --- Board (leaderboard and models) ---------------------------------------------------------

type BoardMode = 'hold' | 'error' | 'empty' | 'limited';

/** Answers model-stats the way `mode` says; returns the request id the client sent last. */
async function mockBoard(page: Page, mode: BoardMode) {
  const seen = { requestId: '' };
  let release: () => void = () => {};
  const gate = new Promise<void>(resolve => {
    release = resolve;
  });
  await page.route(STATS, async (route: Route) => {
    seen.requestId = route.request().headers()['x-request-id'] ?? '';
    if (mode === 'hold') {
      await gate;
      await route.fulfill({ status: 200, contentType: 'application/json', body: BOARD });
    } else if (mode === 'error') {
      await route.fulfill({
        status: 500,
        contentType: 'application/problem+json',
        body: JSON.stringify({
          type: `${PROBLEM}internal`,
          title: 'Internal server error',
          status: 500,
          requestId: seen.requestId,
        }),
      });
    } else if (mode === 'limited') {
      await route.fulfill({
        status: 429,
        contentType: 'application/problem+json',
        headers: { 'Retry-After': '30' },
        body: JSON.stringify({
          type: `${PROBLEM}rate-limited`,
          title: 'Too many requests',
          status: 429,
          retryAfter: 30,
          requestId: seen.requestId,
        }),
      });
    } else {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: '{"success":true,"items":[]}',
      });
    }
  });
  return { seen, release };
}

async function expectRequestId(alert: Locator, seen: { requestId: string }) {
  await expect(alert).toContainText(/Request id\s+\S+/);
  expect(seen.requestId).not.toBe('');
  await expect(alert).toContainText(seen.requestId);
}

function boardScenarios(screen: 'leaderboard' | 'models'): Scenario[] {
  const url = `/${screen}/`;
  const title = 'The leaderboard did not load.';
  return [
    {
      screen,
      state: 'loading',
      run: async ({ page }) => {
        const { release } = await mockBoard(page, 'hold');
        await page.goto(url);
        const busy = page.locator('div[aria-busy="true"]');
        await expect(busy).toBeVisible();
        await expect(busy.getByRole('status')).toHaveText(
          screen === 'models' ? 'Loading the models' : 'Loading the leaderboard',
        );
        return { focus: busy, cleanup: release };
      },
    },
    {
      screen,
      state: 'error',
      run: async ({ page }) => {
        const { seen } = await mockBoard(page, 'error');
        await page.goto(url);
        const alert = page.getByRole('alert').filter({ hasText: title });
        await expect(alert).toBeVisible({ timeout: 20_000 });
        await expect(alert).toContainText('Something went wrong on our side.');
        await expect(alert.getByRole('button', { name: /Try again/ })).toBeVisible();
        await expectRequestId(alert, seen);
        return { focus: alert };
      },
    },
    {
      screen,
      state: 'empty',
      run: async ({ page }) => {
        await mockBoard(page, 'empty');
        await page.goto(url);
        const status = page.getByRole('status').filter({ hasText: 'No model is ranked yet.' });
        await expect(status).toBeVisible();
        await expect(status.getByRole('link', { name: 'Start the first battle' })).toBeVisible();
        return { focus: status };
      },
    },
    {
      screen,
      state: 'no-match',
      run: async ({ page }) => {
        await route200(page);
        await page.goto(url);
        await expect(page.locator('[data-model-id]').first()).toBeVisible();
        await page.getByRole('searchbox', { name: 'Search models' }).fill('zzzz-no-such-model');
        await expect(page.getByText('No model matches “zzzz-no-such-model”.')).toBeVisible();
        await expect(page.getByRole('button', { name: 'Clear the filters' })).toBeVisible();
        return { focus: page.getByRole('button', { name: 'Clear the filters' }) };
      },
    },
    {
      screen,
      state: 'rate-limited',
      run: async ({ page }) => {
        const { seen } = await mockBoard(page, 'limited');
        await page.goto(url);
        const alert = page.getByRole('alert').filter({ hasText: title });
        await expect(alert).toBeVisible({ timeout: 20_000 });
        await expect(alert).toContainText('Too many requests. Try again in 30 seconds.');
        await expect(alert.getByRole('button', { name: /Try again/ })).toBeVisible();
        await expectRequestId(alert, seen);
        return { focus: alert };
      },
    },
  ];
}

async function route200(page: Page) {
  await page.route(STATS, route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: BOARD }),
  );
}

// --- Sign-in pages --------------------------------------------------------------------------

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

type AuthMode = 'wrong-password' | 'exists' | 'limited' | 'offline';

/** Answers the dummy Supabase project: one auth call fails the way `mode` says. */
async function mockAuth(page: Page, mode: AuthMode) {
  await page.route(`${SUPABASE}/**`, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          ...CORS,
          'access-control-allow-headers':
            request.headers()['access-control-request-headers'] ?? 'content-type',
        },
      });
      return;
    }
    if (mode === 'offline') {
      await route.abort('internetdisconnected');
      return;
    }
    const json = (status: number, body: unknown, headers: Record<string, string> = {}) =>
      route.fulfill({
        status,
        headers: { ...CORS, 'content-type': 'application/json', ...headers },
        body: JSON.stringify(body),
      });
    if (mode === 'limited') {
      await json(
        429,
        {
          code: 'over_request_rate_limit',
          error_code: 'over_request_rate_limit',
          msg: 'Request rate limit reached',
        },
        { 'Retry-After': '300' },
      );
    } else if (mode === 'exists') {
      await json(422, {
        code: 'user_already_exists',
        error_code: 'user_already_exists',
        msg: 'User already registered',
      });
    } else {
      await json(400, {
        code: 'invalid_credentials',
        error_code: 'invalid_credentials',
        msg: 'Invalid login credentials',
      });
    }
  });
  // The breach check on the sign-up page: a clean range.
  await page.route('https://api.pwnedpasswords.com/range/*', async route => {
    if (route.request().method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: { ...CORS, 'access-control-allow-headers': '*' },
      });
      return;
    }
    await route.fulfill({
      status: 200,
      headers: CORS,
      contentType: 'text/plain',
      body: '0000000000000000000000000000000000A:0',
    });
  });
}

async function submitLogin(page: Page) {
  await page.goto('/login/');
  await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill('not-my-password');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
}

async function submitSignup(page: Page) {
  await page.goto('/signup/');
  await page.getByLabel('Name').fill('Ada Lovelace');
  await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
  await page.getByRole('textbox', { name: 'Password', exact: true }).fill(STRONG);
  await expect(page.getByText('Not found in known data breaches')).toBeVisible();
  await page.getByRole('textbox', { name: 'Confirm password' }).fill(STRONG);
  await page.getByRole('button', { name: 'Create account' }).click();
}

const authAlert = (page: Page, text: string | RegExp) =>
  page.getByRole('alert').filter({ hasText: text });

const authScenarios: Scenario[] = [
  {
    screen: 'login',
    state: 'wrong-password',
    run: async ({ page }) => {
      await mockAuth(page, 'wrong-password');
      await submitLogin(page);
      await expect(authAlert(page, 'That email and password do not match')).toBeVisible();
      return { focus: authAlert(page, 'That email and password do not match') };
    },
  },
  {
    screen: 'login',
    state: 'too-many-attempts',
    run: async ({ page }) => {
      await mockAuth(page, 'limited');
      await submitLogin(page);
      const alert = authAlert(page, 'Too many attempts. Wait a few minutes, then try again.');
      await expect(alert).toBeVisible();
      return { focus: alert };
    },
  },
  {
    screen: 'login',
    state: 'offline',
    run: async ({ page }) => {
      await mockAuth(page, 'offline');
      await submitLogin(page);
      await expect(authAlert(page, 'We could not reach the sign-in service.')).toBeVisible();
      return { focus: authAlert(page, 'We could not reach the sign-in service.') };
    },
  },
  {
    screen: 'signup',
    state: 'account-exists',
    run: async ({ page }) => {
      await mockAuth(page, 'exists');
      await submitSignup(page);
      await expect(authAlert(page, 'An account with this email already exists.')).toBeVisible();
      return { focus: authAlert(page, 'An account with this email already exists.') };
    },
  },
  {
    screen: 'signup',
    state: 'too-many-attempts',
    run: async ({ page }) => {
      await mockAuth(page, 'limited');
      await submitSignup(page);
      const alert = authAlert(page, 'Too many attempts. Wait a few minutes, then try again.');
      await expect(alert).toBeVisible();
      return { focus: alert };
    },
  },
  {
    screen: 'signup',
    state: 'offline',
    run: async ({ page }) => {
      await mockAuth(page, 'offline');
      await submitSignup(page);
      await expect(authAlert(page, 'We could not reach the sign-in service.')).toBeVisible();
      return { focus: authAlert(page, 'We could not reach the sign-in service.') };
    },
  },
];

// --- Arena ----------------------------------------------------------------------------------

async function sendPrompt(page: Page) {
  await page.goto('/?arena=new');
  await expect(page.getByTestId('arena')).toBeVisible();
  await page.getByRole('textbox', { name: 'Your prompt' }).fill('Which is bigger, 9.11 or 9.9?');
  await page.keyboard.press('Enter');
}

async function failBattle(page: Page, kind: 'error' | 'limited') {
  await mockArena(page);
  // Registered last, so it answers first.
  await page.route('**/api/arena/dualchat', route =>
    kind === 'error'
      ? route.fulfill({
          status: 500,
          contentType: 'application/problem+json',
          body: JSON.stringify({
            type: `${PROBLEM}internal`,
            title: 'Internal server error',
            status: 500,
          }),
        })
      : route.fulfill({
          status: 429,
          contentType: 'application/problem+json',
          headers: { 'Retry-After': '30' },
          body: JSON.stringify({
            type: `${PROBLEM}rate-limited`,
            title: 'Too many requests',
            status: 429,
            retryAfter: 30,
          }),
        }),
  );
}

const arenaScenarios: Scenario[] = [
  {
    screen: 'arena',
    state: 'battle-failed',
    run: async ({ page }) => {
      await failBattle(page, 'error');
      await sendPrompt(page);
      const alert = page.getByRole('alert').filter({ hasText: 'The answers did not arrive.' });
      await expect(alert).toBeVisible({ timeout: 15_000 });
      await expect(alert).toContainText('Something went wrong on our side.');
      await expect(alert.getByRole('button', { name: /Try again/ })).toBeVisible();
      return { focus: alert };
    },
  },
  {
    screen: 'arena',
    state: 'rate-limited',
    run: async ({ page }) => {
      await failBattle(page, 'limited');
      await sendPrompt(page);
      const alert = page.getByRole('alert').filter({ hasText: 'The answers did not arrive.' });
      await expect(alert).toBeVisible({ timeout: 15_000 });
      await expect(alert).toContainText('Too many requests. Try again in 30 seconds.');
      await expect(alert.getByRole('button', { name: /Try again/ })).toBeVisible();
      return { focus: alert };
    },
  },
  {
    screen: 'arena',
    state: 'offline-vote-queued',
    run: async ({ page }) => {
      await mockArena(page);
      await sendPrompt(page);
      const turn = page.getByTestId('live-turn').first();
      await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
      // The browser is only told it is offline (the vote queue reads navigator.onLine). Really
      // cutting the network breaks the reveal, which lazy-loads a chunk, and a resize to the
      // phone layout, and those are not what this screenshot is about.
      await page.evaluate(() => {
        Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false });
      });
      await turn.getByRole('button', { name: /A is better/ }).click();
      await expect(turn.getByTestId('vote-pending')).toBeVisible();
      await expect(turn.getByTestId('vote-pending')).toContainText('Saved offline');
      return {
        focus: turn.getByTestId('vote-pending'),
        cleanup: () =>
          void page.evaluate(() => {
            Reflect.deleteProperty(navigator, 'onLine');
          }),
      };
    },
  },
];

// --- The loop -------------------------------------------------------------------------------

const SCENARIOS: Scenario[] = [
  ...boardScenarios('leaderboard'),
  ...boardScenarios('models'),
  ...authScenarios,
  ...arenaScenarios,
];

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

for (const scenario of SCENARIOS) {
  for (const theme of THEMES) {
    test(`${scenario.screen}: ${scenario.state}, ${theme}`, async ({ page, context }) => {
      const problems: string[] = [];
      page.on('console', message => {
        if (message.type() === 'error' && !EXPECTED_NOISE.test(message.text())) {
          problems.push(`console: ${message.text()}`);
        }
      });
      page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));

      await storeTheme(page, theme);
      await page.setViewportSize({ width: VIEWPORTS[0].width, height: VIEWPORTS[0].height });
      const { focus, cleanup } = await scenario.run({ page, context });

      for (const viewport of VIEWPORTS) {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await focus.evaluate(element => element.scrollIntoView({ block: 'center' }));
        await settle(page, 500);
        expect(await blockingViolations(page), `axe on ${viewport.name}`).toEqual([]);
        await page.screenshot({
          path: shotPath(`state-${scenario.screen}-${scenario.state}-${viewport.name}-${theme}`),
        });
      }

      if (cleanup) cleanup();
      expect(problems).toEqual([]);
    });
  }
}
