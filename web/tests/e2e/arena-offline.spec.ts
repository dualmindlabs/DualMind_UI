import { expect, type BrowserContext, type Page, test } from '@playwright/test';

import { mockArena, SESSION_KEY, sessionJson, SUPABASE } from './arena-mocks';
import { passGate } from './helpers';

// The signed-in arena when the network drops (Harsh's phone: the whole page became the root
// "Something went wrong" screen). Every test collects the page's real errors and prints them, so
// the CI log shows what was thrown, and asserts that the root error screen never appears.

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
async function expectNoRootError(page: Page, problems: string[], label: string) {
  const crashed = await page
    .getByRole('heading', { level: 1 })
    .filter({ hasText: /Something went wrong|You are offline|newer version/i })
    .count();
  if (crashed > 0 || problems.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[arena-offline] ${label}: crashed=${crashed > 0}\n${problems.join('\n---\n')}`);
  }
  expect(crashed, `${label}: root error screen is showing`).toBe(0);
  await expect(page.getByTestId('arena')).toBeVisible();
}

async function openArena(page: Page) {
  // Log who takes the arena away (the head script's <html data-arena> mark).
  await page.addInitScript(() => {
    const remove = Element.prototype.removeAttribute;
    Element.prototype.removeAttribute = function (name: string) {
      if (name === 'data-arena') console.log(`[arena-offline] data-arena removed: ${new Error().stack}`);
      return remove.call(this, name);
    };
  });
  page.on('console', message => {
    if (message.text().startsWith('[arena-offline]')) console.log(message.text());
  });
  await page.goto('/');
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

    await page.keyboard.press('Control+k');
    await page.waitForTimeout(800);
    await expectNoRootError(page, problems, 'a: command palette');
    await page.keyboard.press('Escape');

    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('?');
    await page.waitForTimeout(500);
    await expectNoRootError(page, problems, 'a: shortcuts overlay');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.waitForTimeout(500);
    await expectNoRootError(page, problems, 'a: account menu');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: 'Open the history' }).click();
    await page.waitForTimeout(500);
    await expectNoRootError(page, problems, 'a: history drawer');
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'History' })).toBeHidden();

    await page.getByRole('radio', { name: 'Side by side' }).check({ force: true });
    await page.getByRole('button', { name: /Model for answer A/ }).click();
    await page.waitForTimeout(500);
    await expectNoRootError(page, problems, 'a: model picker');
  });

  test('(a2) a thread open: the share dialog offline', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await page.goto('/?thread=t-recursion');
    await expect(page.getByTestId('arena')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Share', exact: true })).toBeVisible();
    await goOffline(context, page);
    await page.getByRole('button', { name: 'Share', exact: true }).click();
    await page.waitForTimeout(800);
    await expectNoRootError(page, problems, 'a2: share dialog');
  });

  test('(b) sending a battle while offline keeps the arena', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Offline prompt');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2500);
    await expectNoRootError(page, problems, 'b: send offline');
    await goOnline(context, page);
    await page.waitForTimeout(1500);
    await expectNoRootError(page, problems, 'b: back online');
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
    await expectNoRootError(page, problems, 'c: offline during battle');
  });

  test('(d) answers shown, offline vote queues, online flushes', async ({ page, context }) => {
    const problems = collectProblems(page);
    const state = await mockArena(page);
    await openArena(page);
    await page.getByRole('textbox', { name: 'Your prompt' }).fill('Which is bigger, 9.11 or 9.9?');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    state.offline = true;
    await goOffline(context, page);
    await turn.getByRole('button', { name: /A is better/ }).click();
    await expect(turn.getByTestId('vote-pending')).toBeVisible();
    await expectNoRootError(page, problems, 'd: vote offline');
    state.offline = false;
    await goOnline(context, page);
    await expect(turn.getByTestId('vote-pending')).toHaveCount(0, { timeout: 15_000 });
    await expectNoRootError(page, problems, 'd: flushed');
  });

  test('(e) opening a thread from the history while offline', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    await page.getByRole('link', { name: /Write a haiku about merge conflicts/ }).click();
    await page.waitForTimeout(2500);
    await expectNoRootError(page, problems, 'e: open thread offline');
  });

  test('(f) client-side navigation to unloaded routes while offline', async ({ page, context }) => {
    const problems = collectProblems(page);
    await mockArena(page);
    await openArena(page);
    await goOffline(context, page);
    await page.getByRole('button', { name: /^Account:/ }).click();
    await page.getByRole('menuitem', { name: /Settings/ }).click();
    await page.waitForTimeout(3000);
    const headings = await page.getByRole('heading', { level: 1 }).allTextContents();
    // eslint-disable-next-line no-console
    console.log(
      `[arena-offline] f: url=${page.url()} title=${await page.title()} headings=${JSON.stringify(headings)}\n${problems.join('\n')}`,
    );
    expect(page.url()).not.toMatch(/^chrome-error:/);
    expect(headings.join(' ')).not.toMatch(/Something went wrong/i);
    await expect(page.getByTestId('arena').or(page.getByRole('main'))).toBeVisible();
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
      await expectNoRootError(page, problems, `g: focus round ${round}`);
    }
    await goOnline(context, page);
    await page.waitForTimeout(1500);
    await expectNoRootError(page, problems, 'g: reconnected');
  });

  test('(h) a stored session that is expired cannot refresh while offline', async ({
    page,
    context,
  }) => {
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
    await page.route(`${SUPABASE}/**`, route => route.abort('internetdisconnected'));
    await page.goto('/');
    await page.waitForTimeout(4000);
    // eslint-disable-next-line no-console
    console.log(`[arena-offline] h: landing present=${await page.locator('[data-landing]').count()}`);
    await expectNoRootError(page, problems, 'h: expired session, refresh fails');
    void context;
  });
});
