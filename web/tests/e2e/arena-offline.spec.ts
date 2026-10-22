import { type BrowserContext, expect, type Page, test } from '@playwright/test';

import { mockArena, SESSION_KEY, sessionJson, SUPABASE } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// The signed-in arena when the network drops (Harsh's phone: the whole page became the root
// "Something went wrong" screen). Every test collects the page's real errors and prints them, so
// the CI log shows what was thrown, and asserts that the root error screen never appears and the
// arena stays: honest offline notice, drafts kept, votes queued and sent on reconnect.

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

const PHONE = { width: 390, height: 844 };

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error =>
    problems.push(`pageerror: ${error.message}\n${error.stack ?? '(no stack)'}`),
  );
  return problems;
}

/** The root ErrorBoundary's screen (src/app/root.tsx): must never replace the arena. */
async function expectArenaStays(page: Page, problems: string[], label: string) {
  const crashed = await page.getByTestId('root-error').count();
  const legacyCrashed = await page
    .getByRole('heading', { level: 1 })
    .filter({ hasText: /Something went wrong|You are offline|newer version/i })
    .count();
  if (crashed + legacyCrashed > 0 || problems.length > 0) {
    console.log(
      `[arena-offline] ${label}: crashed=${crashed + legacyCrashed > 0}\n${problems.join('\n---\n')}`,
    );
  }
  expect(crashed + legacyCrashed, `${label}: the root error screen is showing`).toBe(0);
  await expect(page.getByTestId('arena')).toBeVisible();
  await expect(page.getByTestId('arena-error')).toHaveCount(0);
}

async function openArena(page: Page, path = '/') {
  await page.goto(path);
  await expect(page.getByTestId('arena')).toBeVisible();
}

const abortApi = (route: { abort: (reason?: string) => Promise<void> }) =>
  route.abort('internetdisconnected');

async function goOffline(context: BrowserContext, page: Page) {
  await page.route('**/api/**', abortApi);
  await context.setOffline(true);
}

async function goOnline(context: BrowserContext, page: Page) {
  await context.setOffline(false);
  await page.unroute('**/api/**', abortApi);
}

const notice = (page: Page) => page.getByTestId('offline-notice');

test.describe('arena offline', () => {
  test('(a) empty arena: palette, shortcuts, account menu, picker, history on a phone', async ({
    page,
    context,
  }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await page.setViewportSize(PHONE);
    await openArena(page);
    await goOffline(context, page);
    await expect(notice(page)).toContainText('You are offline.');

    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);
    await expectArenaStays(page, problems, 'a: command palette');
    await page.keyboard.press('Escape');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    await expectArenaStays(page, problems, 'a: shortcuts overlay');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.waitForTimeout(500);
    await expectArenaStays(page, problems, 'a: account menu');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Open the history' }).click();
    await page.waitForTimeout(500);
    await expectArenaStays(page, problems, 'a: history drawer');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'History' })).toBeHidden();

    await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
    await page.getByRole('button', { name: /Model for answer A/ }).click();
    await page.waitForTimeout(500);
    await expectArenaStays(page, problems, 'a: model picker');
  });

  test('(a2) a thread open: the share dialog offline', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page, '/?thread=t-recursion');
    await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
    await goOffline(context, page);
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.waitForTimeout(800);
    await expectArenaStays(page, problems, 'a2: share dialog');
  });

  test('(b) sending a battle while offline keeps the draft and fires no request', async ({
    page,
    context,
  }) => {
    const problems = collectProblems(page);
    const state = await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });
    await prompt.fill('Offline prompt');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1000);
    await expectArenaStays(page, problems, 'b: send offline');
    await expect(prompt).toHaveValue('Offline prompt');
    await expect(page.getByTestId('live-turn')).toHaveCount(0);
    expect(state.bodies.filter(item => item.path === '/api/arena/dualchat')).toEqual([]);
    await goOnline(context, page);
    await expect(notice(page)).toContainText('Back online');
    await expectArenaStays(page, problems, 'b: back online');
    await expect(prompt).toHaveValue('Offline prompt');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('live-turn').first()).toHaveAttribute(
      'data-phase',
      'awaiting_vote',
      { timeout: 15_000 },
    );
  });

  test('(c) going offline while a battle request is pending', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page, { battleDelayMs: 4000 });
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Pending prompt');
    await page.keyboard.press('Enter');
    await expect(page.getByTestId('live-turn').first()).toBeVisible();
    await goOffline(context, page);
    await page.waitForTimeout(5000);
    await expectArenaStays(page, problems, 'c: offline during battle');
  });

  test('(d) answers shown, offline vote queues (N waiting), online flushes', async ({
    page,
    context,
  }) => {
    const problems = collectProblems(page);
    const state = await mockArena(page);
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Which is bigger, 9.11 or 9.9?');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    state.offline = true;
    await goOffline(context, page);
    // The vote pill opens once both answers are read, or on "Vote now".
    await turn
      .getByRole('button', { name: 'Vote now' })
      .click({ timeout: 1500 })
      .catch(() => undefined);
    await turn.getByRole('button', { name: /A is better/ }).click();
    await expect(turn.getByTestId('vote-pending')).toBeVisible();
    await expect(notice(page)).toContainText('(1 waiting)');
    // The reveal runs offline too (its effects are decoration and must never throw).
    await page.waitForTimeout(3000);
    await expectArenaStays(page, problems, 'd: vote offline');
    state.offline = false;
    await goOnline(context, page);
    await expect(turn.getByTestId('vote-pending')).toHaveCount(0, { timeout: 15_000 });
    expect(state.bodies.some(item => item.path === '/api/arena/model-vote')).toBe(true);
    await expectArenaStays(page, problems, 'd: flushed');
  });

  test('(e) opening a thread from the history while offline', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    await page.getByRole('link', { name: /Write a haiku about merge conflicts/ }).click();
    await page.waitForTimeout(2500);
    await expectArenaStays(page, problems, 'e: open thread offline');
  });

  test('(f) a link to another page while offline stays on the arena and says why', async ({
    page,
    context,
  }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByRole('menuitem', { name: /Settings/ }).click();
    await page.waitForTimeout(1500);
    expect(page.url()).not.toMatch(/^chrome-error:/);
    expect(new URL(page.url()).pathname).toBe('/');
    await expect(notice(page)).toContainText('That page needs a connection.');
    await expectArenaStays(page, problems, 'f: settings link offline');
    // The command palette navigates with location.assign: same rule.
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('leaderboard');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(1500);
    expect(new URL(page.url()).pathname).toBe('/');
    await expectArenaStays(page, problems, 'f: palette navigation offline');
    // Back online the same link works.
    await goOnline(context, page);
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByRole('menuitem', { name: /Settings/ }).click();
    await page.waitForURL(/\/settings\//);
  });

  test('(g) offline, focus and visibility changes, then reconnect', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    for (let round = 0; round < 2; round += 1) {
      await page.evaluate(() => {
        Object.defineProperty(document, 'visibilityState', { value: 'hidden', configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
        Object.defineProperty(document, 'visibilityState', {
          value: 'visible',
          configurable: true,
        });
        document.dispatchEvent(new Event('visibilitychange'));
        window.dispatchEvent(new Event('focus'));
      });
      await page.waitForTimeout(1200);
      await expectArenaStays(page, problems, `g: focus round ${round}`);
    }
    await goOnline(context, page);
    await page.waitForTimeout(1500);
    await expectArenaStays(page, problems, 'g: reconnected');
  });

  test('(h) an expired stored session that cannot refresh stays in the arena', async ({ page }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    // Later init scripts win: the stored session is past its expiry.
    await page.addInitScript(
      ([key, value]) => {
        const stored = JSON.parse(value) as { expires_at: number };
        stored.expires_at = Math.floor(Date.now() / 1000) - 600;
        window.localStorage.setItem(key, JSON.stringify(stored));
      },
      [SESSION_KEY, sessionJson()] as const,
    );
    // The refresh cannot reach Supabase.
    let reachable = false;
    await page.route(`${SUPABASE}/**`, route =>
      reachable ? route.fallback() : route.abort('internetdisconnected'),
    );
    await page.goto('/');
    await page.waitForTimeout(3000);
    await expectArenaStays(page, problems, 'h: expired session, refresh fails');
    expect(await page.locator('html').getAttribute('data-arena')).not.toBeNull();
    // The network is back: the session is checked for real (the mock refreshes it).
    reachable = true;
    await page.evaluate(() => window.dispatchEvent(new Event('online')));
    await page.waitForTimeout(1500);
    await expectArenaStays(page, problems, 'h: recovered');
  });

  test('(h2) a stored session the server rejects still signs the visitor out', async ({ page }) => {
    await mockArena(page);
    await page.addInitScript(
      ([key, value]) => {
        const stored = JSON.parse(value) as { expires_at: number };
        stored.expires_at = Math.floor(Date.now() / 1000) - 600;
        window.localStorage.setItem(key, JSON.stringify(stored));
      },
      [SESSION_KEY, sessionJson()] as const,
    );
    await page.route(`${SUPABASE}/auth/v1/token**`, route =>
      route.fulfill({
        status: 400,
        headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid Refresh Token',
        }),
      }),
    );
    await page.goto('/');
    await expect(
      page.getByRole('heading', { level: 1, name: /Two models\. One prompt\.\s*You decide\./ }),
    ).toBeVisible();
    await expect(page.getByTestId('arena')).toHaveCount(0);
  });
});

test.describe('a crash inside the arena', () => {
  test('shows an in-place panel, Try again re-mounts, the header stays', async ({ page }) => {
    await mockArena(page);
    await page.addInitScript(() => {
      (window as unknown as { dmCrash: boolean }).dmCrash = false;
      // eslint-disable-next-line @typescript-eslint/unbound-method -- patched back with .apply
      const real = Number.prototype.toLocaleString;
      Number.prototype.toLocaleString = function (...args: Parameters<typeof real>) {
        if ((window as unknown as { dmCrash: boolean }).dmCrash) throw new Error('forced crash');
        return real.apply(this, args);
      };
    });
    await page.goto('/');
    await expect(page.getByTestId('arena')).toBeVisible();
    await page.evaluate(() => ((window as unknown as { dmCrash: boolean }).dmCrash = true));
    await page.getByRole('link', { name: /Explain recursion to a ten-year-old/ }).click();
    const panel = page.getByTestId('arena-error');
    await expect(panel).toBeVisible();
    await expect(panel).toContainText('Something broke in the arena.');
    await expect(page.getByTestId('root-error')).toHaveCount(0);
    // The rest of the arena is still there: the header, with the history one press away.
    await expect(page.getByRole('button', { name: 'Open the history' })).toBeVisible();
    await page.evaluate(() => ((window as unknown as { dmCrash: boolean }).dmCrash = false));
    await panel.getByRole('button', { name: 'Try again' }).click();
    await expect(page.getByTestId('arena-error')).toHaveCount(0);
    await expect(page.getByTestId('arena')).toBeVisible();
  });
});

// --- Screenshots -----------------------------------------------------------------------------

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
] as const;

test.describe('offline screenshots', () => {
  for (const viewport of VIEWPORTS) {
    for (const theme of ['dark', 'light'] as const) {
      test(`offline notice: ${viewport.label}, ${theme}`, async ({ page, context }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        const state = await mockArena(page);
        await openArena(page);
        await page
          .getByRole('textbox', { name: 'Your prompt' })
          .fill('Which is bigger, 9.11 or 9.9?');
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
        state.offline = true;
        await goOffline(context, page);
        // The vote pill opens once both answers are read, or on "Vote now".
        await turn
          .getByRole('button', { name: 'Vote now' })
          .click({ timeout: 1500 })
          .catch(() => undefined);
        await turn.getByRole('button', { name: /A is better/ }).click();
        await expect(notice(page)).toContainText('(1 waiting)');
        await settle(page, 600);
        await page.screenshot({ path: shotPath(`arena-offline-${viewport.label}-${theme}`) });
      });

      test(`in-arena error panel: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page);
        await page.addInitScript(() => {
          // eslint-disable-next-line @typescript-eslint/unbound-method -- patched back with .apply
          const real = Number.prototype.toLocaleString;
          Number.prototype.toLocaleString = function (...args: Parameters<typeof real>) {
            if (window.location.search.includes('thread=')) throw new Error('forced crash');
            return real.apply(this, args);
          };
        });
        await page.goto('/?thread=t-recursion');
        await expect(page.getByTestId('arena-error')).toBeVisible();
        await settle(page, 600);
        await page.screenshot({ path: shotPath(`arena-error-${viewport.label}-${theme}`) });
      });

      test(`root offline screen: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await page.addInitScript(() => {
          // Offline, and something outside the arena throws on its first effect.
          Object.defineProperty(window.navigator, 'onLine', {
            configurable: true,
            get: () => false,
          });
          const real = window.matchMedia.bind(window);
          window.matchMedia = (query: string) => {
            if (!query.includes('prefers-color-scheme')) throw new Error('forced crash');
            return real(query);
          };
        });
        await page.goto('/leaderboard/');
        await expect(page.getByTestId('root-error')).toBeVisible();
        await expect(page.getByTestId('root-error')).toContainText('You are offline.');
        // The error screen keeps the visitor's theme (it is re-applied after a hydration error).
        await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
        await settle(page, 600);
        await page.screenshot({ path: shotPath(`root-offline-${viewport.label}-${theme}`) });
      });
    }
  }
});
