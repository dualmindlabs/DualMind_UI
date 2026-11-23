import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, type Route, test } from '@playwright/test';

import { mockArena } from '../e2e/arena-mocks';

// Crowd leaderboard review screenshots (backend leaderboard v2, PRs 57 and 62 on DualMind_Back,
// both flagged off): the board with measured 95% intervals, rank ranges and vote counts, a
// category tab, the not-yet-rated rows with seeded ratings, the details sheet, the methodology
// page, the receipt chip after a vote, and the same pages with the backend flags OFF (404), which
// must look like the classic board. The API is answered from fixtures (tests/fixtures/api/crowd-*),
// so no backend is needed; the numbers are synthetic, not real votes.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

const fixture = (name: string) =>
  readFileSync(path.resolve(process.cwd(), 'tests/fixtures/api', name), 'utf8');
const CROWD = fixture('crowd-board.json');
const CROWD_CODE = fixture('crowd-board-code.json');
const CATEGORIES = fixture('crowd-categories.json');
const METHODOLOGY = fixture('crowd-methodology.txt');
const CLASSIC = fixture('leaderboard-v2.board.json');

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;

const OFF_BODY = JSON.stringify({ success: false, error: 'Not found', code: 'FEATURE_DISABLED' });

/** The backend with its leaderboard flags on, or off (every crowd route answers 404). */
async function mockBackend(page: Page, flags: 'on' | 'off') {
  await page.route('**/api/v2/leaderboard', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: CLASSIC }),
  );
  await page.route(/\/api\/leaderboard(\/.*)?$/, async (route: Route) => {
    if (flags === 'off') {
      await route.fulfill({ status: 404, contentType: 'application/json', body: OFF_BODY });
      return;
    }
    const { pathname } = new URL(route.request().url());
    const json = (body: string) =>
      route.fulfill({ status: 200, contentType: 'application/json', body });
    if (pathname.endsWith('/methodology')) {
      await route.fulfill({
        status: 200,
        contentType: 'text/plain; charset=utf-8',
        body: METHODOLOGY,
      });
    } else if (pathname.endsWith('/categories')) await json(CATEGORIES);
    else if (pathname.includes('/categories/')) await json(CROWD_CODE);
    else await json(CROWD);
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
    path: path.join(OUT, `crowd-${name}__${vp}__${theme}.png`),
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
    test.describe(`crowd leaderboard ${vp.name} ${theme}`, () => {
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

      test('board, category tab, details, not yet rated', async ({ page }) => {
        await mockBackend(page, 'on');
        await page.goto('/leaderboard/');
        await expect(page.locator('[data-model-id]').first()).toBeVisible();
        await expect(page.locator('[data-rank-range]').first()).toBeVisible();
        await expect(page.locator('[data-whisker]').first()).toBeVisible();
        await expect(page.getByTestId('crowd-note')).toContainText('bt-v1');
        await expect(page.getByRole('tablist')).toBeVisible();
        await capture(page, '1-board', vp.name, theme);

        await page.getByRole('tab', { name: 'Code' }).click();
        await expect(page.getByTestId('crowd-note')).toContainText('1,312');
        await page.getByTestId('category-tabs').scrollIntoViewIfNeeded();
        await page.waitForTimeout(600);
        await capture(page, '2-category', vp.name, theme);
        await page.getByRole('tab', { name: 'All prompts' }).click();
        await expect(page.getByTestId('crowd-note')).toContainText('4,821');

        await page.locator('[data-model-id] button[aria-haspopup="dialog"]').nth(2).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await page.waitForTimeout(900);
        await page.screenshot({
          path: path.join(OUT, `crowd-3-details__${vp.name}__${theme}.png`),
        });
        await page.keyboard.press('Escape');

        await page.getByRole('button', { name: /^Show \d+ models$/ }).click();
        await page.getByRole('heading', { name: 'Not yet rated' }).scrollIntoViewIfNeeded();
        await page.waitForTimeout(500);
        await page.screenshot({
          path: path.join(OUT, `crowd-4-provisional__${vp.name}__${theme}.png`),
        });
      });

      test('methodology page', async ({ page }) => {
        await mockBackend(page, 'on');
        await page.goto('/methodology/');
        await expect(page.getByTestId('methodology-live')).toContainText('Bradley-Terry');
        await expect(page.getByRole('heading', { name: 'Receipts' })).toBeVisible();
        await capture(page, '5-methodology', vp.name, theme);
      });

      test('flags off: the classic board and the static methodology', async ({ page }) => {
        await mockBackend(page, 'off');
        await page.goto('/leaderboard/');
        await expect(page.locator('[data-model-id]').first()).toBeVisible();
        await expect(page.locator('[data-rank-range]')).toHaveCount(0);
        await expect(page.getByTestId('category-tabs')).toHaveCount(0);
        await expect(page.getByTestId('crowd-note')).toHaveCount(0);
        await capture(page, '6-flags-off', vp.name, theme);

        await page.goto('/methodology/');
        await expect(page.getByTestId('methodology-fallback')).toBeVisible();
        await capture(page, '7-methodology-off', vp.name, theme);
      });

      test('receipt chip after a vote', async ({ page }) => {
        await mockArena(page, { receipt: true });
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        const prompt = page.getByRole('textbox', { name: 'Your prompt' });
        await prompt.fill('Design a cache for a read-heavy API and show the code');
        await prompt.click();
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 20_000 });
        await turn.getByRole('button', { name: /B is better/ }).click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await expect(page.getByTestId('receipt-chip')).toBeVisible();
        await expect(page.getByTestId('receipt-hash')).toHaveText('7f3a9c21…90e4');
        await page.waitForTimeout(2200);
        await page.getByTestId('receipt-chip').scrollIntoViewIfNeeded();
        await capture(page, '8-receipt', vp.name, theme);
      });
    });
  }
}
