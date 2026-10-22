import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, type Route, test } from '@playwright/test';

// Leaderboard review screenshots (redesign slice C): the board with rank movement, the details
// sheet or drawer, the loading, error, rate-limited and no-match states, and the "Not yet rated"
// group open, at desktop and phone, in dark and light. The API is answered from the recorded
// live board (tests/fixtures/api/leaderboard-v2.board.json), so nothing reaches production.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

const BOARD = readFileSync(
  path.resolve(process.cwd(), 'tests/fixtures/api/leaderboard-v2.board.json'),
  'utf8',
);
const STATS = '**/api/v2/leaderboard';

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;

interface Item {
  modelId: string;
  eloScore: number;
  provisional: boolean;
}

/** Ranks from "your last visit": the recorded ranks, nudged, with a few models missing (new). */
function lastVisitRanks(): Record<string, number> {
  const items = (JSON.parse(BOARD) as { items: Item[] }).items.filter(item => !item.provisional);
  const shifts = [0, 2, -1, 0, 3, -2, 1, 0, -3, 1, 0, 2];
  const ranks: Record<string, number> = {};
  items.forEach((item, index) => {
    if (index % 11 === 7) return;
    const rank = 1 + items.filter(other => other.eloScore > item.eloScore).length;
    ranks[item.modelId] = Math.max(1, rank + (shifts[index % shifts.length] ?? 0));
  });
  return ranks;
}

type Reply = 'ok' | 'error' | 'rate-limited' | 'hang';

async function mockBoard(page: Page, reply: Reply) {
  await page.route(STATS, async (route: Route) => {
    if (reply === 'hang') return;
    if (reply === 'error') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal server error', code: 'E500' }),
      });
      return;
    }
    if (reply === 'rate-limited') {
      await route.fulfill({
        status: 429,
        contentType: 'application/json',
        headers: { 'retry-after': '60' },
        body: JSON.stringify({ success: false, error: 'Too many requests', code: 'RATE_LIMITED' }),
      });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: BOARD });
  });
}

async function capture(page: Page, name: string, vp: string, theme: string, full = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);
  if (full) {
    await page.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
        window.scrollTo(0, y);
        await new Promise(resolve => setTimeout(resolve, 60));
      }
      window.scrollTo(0, 0);
    });
  }
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  await page.screenshot({
    path: path.join(OUT, `lb-${name}__${vp}__${theme}.png`),
    fullPage: full,
  });
  await handle.evaluate(node => (node as Element).remove());
}

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
  ]);
});

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`leaderboard ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(value => window.localStorage.setItem('dm.theme', value), theme);
      });

      test('board, details, unrated group', async ({ page }) => {
        await page.addInitScript(
          ranks =>
            window.localStorage.setItem(
              'dm.leaderboard.ranks',
              JSON.stringify({
                v: 1,
                current: { at: Date.now() - 2 * 24 * 3600 * 1000, ranks },
                previous: null,
              }),
            ),
          lastVisitRanks(),
        );
        await mockBoard(page, 'ok');
        await page.goto('/leaderboard/');
        await expect(page.locator('[data-model-id]').first()).toBeVisible();
        await expect(page.locator('[data-movement]').first()).toBeVisible();
        await capture(page, '1-board', vp.name, theme);

        await page.locator('[data-model-id] button[aria-haspopup="dialog"]').nth(4).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(page.getByRole('dialog').locator('.recharts-surface')).toBeVisible();
        await page.waitForTimeout(800);
        await page.screenshot({ path: path.join(OUT, `lb-2-details__${vp.name}__${theme}.png`) });
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: /^Show \d+ models$/ }).click();
        await page.getByRole('heading', { name: 'Not yet rated' }).scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `lb-3-unrated__${vp.name}__${theme}.png`) });
      });

      test('search with no match', async ({ page }) => {
        await mockBoard(page, 'ok');
        await page.goto('/leaderboard/');
        await expect(page.locator('[data-model-id]').first()).toBeVisible();
        await page.getByRole('searchbox', { name: 'Search models' }).fill('zzzz');
        await expect(page.getByText(/No model matches/)).toBeVisible();
        await page.getByText(/No model matches/).scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `lb-4-no-match__${vp.name}__${theme}.png`) });
      });

      test('loading', async ({ page }) => {
        await mockBoard(page, 'hang');
        await page.goto('/leaderboard/');
        await expect(page.getByText('Loading the leaderboard')).toBeAttached();
        await capture(page, '5-loading', vp.name, theme, false);
      });

      test('error and rate limited', async ({ page }) => {
        await mockBoard(page, 'error');
        await page.goto('/leaderboard/');
        const alert = page.getByRole('alert').filter({ hasText: 'did not load' });
        await expect(alert).toBeVisible({ timeout: 20_000 });
        await alert.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({ path: path.join(OUT, `lb-6-error__${vp.name}__${theme}.png`) });

        await page.unroute(STATS);
        await mockBoard(page, 'rate-limited');
        await alert.getByRole('button', { name: /Try again/ }).click();
        const limited = page.getByRole('alert').filter({ hasText: 'catching its breath' });
        await expect(limited).toBeVisible({ timeout: 20_000 });
        await limited.scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(OUT, `lb-7-rate-limited__${vp.name}__${theme}.png`),
        });
      });
    });
  }
}
