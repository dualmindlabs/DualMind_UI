import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

import { passGate, storeTheme } from './helpers';

// The crowd leaderboard's review follow-up through the real Worker, with every API answer mocked
// by route interception from the fixtures: rated rows without a rank claim, the backend warnings,
// the 503 and 500 fallbacks, a category that falls back to the overall board, the seeded details,
// and axe (contrast of the muted and warning text) in both themes.

const here = path.dirname(fileURLToPath(import.meta.url));
const fixture = (name: string) =>
  readFileSync(path.join(here, '..', 'fixtures', 'api', name), 'utf8');
const CROWD = fixture('crowd-board.json');
const CATEGORIES = fixture('crowd-categories.json');
const CLASSIC = fixture('leaderboard-v2.board.json');

type Reply = { status: number; body: string };
const ok = (body: string): Reply => ({ status: 200, body });
const err = (status: number): Reply => ({
  status,
  body: JSON.stringify({ success: false, error: 'Down', code: 'E' }),
});

/** Answers each API path with `routes[path]`, anything else with a 404 (flag off). */
async function mockApi(page: Page, routes: Record<string, Reply>) {
  await page.route('**/api/v2/leaderboard', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: CLASSIC }),
  );
  await page.route(/\/api\/leaderboard(\/.*)?$/, async (route: Route) => {
    const { pathname } = new URL(route.request().url());
    const reply = routes[pathname] ?? err(404);
    await route.fulfill({
      status: reply.status,
      contentType: 'application/json',
      body: reply.body,
    });
  });
}

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(violation => `${violation.id}: ${violation.nodes[0]?.target.join(' ')}`);
}

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

test('a rated model without a rank claim shows no rank number, and "by rating"', async ({
  page,
}) => {
  await mockApi(page, { '/api/leaderboard': ok(CROWD) });
  await page.goto('/leaderboard/');
  const rows = page.getByRole('table').locator('tbody tr');
  await expect(rows.first()).toBeVisible();
  const unranked = rows.filter({ has: page.locator('[data-rank-claim="none"]') });
  expect(await unranked.count()).toBeGreaterThan(0);
  const firstCell = unranked.first().getByRole('cell').first();
  await expect(firstCell).toContainText('by rating');
  expect(await firstCell.innerText()).not.toMatch(/\d/);
  // Ranked rows come first: the unranked ones are below the last numbered row.
  const lastNumbered = await rows.evaluateAll(nodes =>
    nodes.map(node => !node.querySelector('[data-rank-claim="none"]')).lastIndexOf(true),
  );
  const firstUnranked = await rows.evaluateAll(nodes =>
    nodes.findIndex(node => node.querySelector('[data-rank-claim="none"]') !== null),
  );
  expect(firstUnranked).toBe(lastNumbered + 1);
});

test('on a phone, an unranked row says "by rating" in its card', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await mockApi(page, { '/api/leaderboard': ok(CROWD) });
  await page.goto('/leaderboard/');
  const claim = page.locator('[data-model-id] [data-rank-claim="none"]').first();
  await expect(claim).toBeVisible();
  await expect(claim).toContainText('by rating');
});

test('the backend warnings are rendered', async ({ page }) => {
  await mockApi(page, {
    '/api/leaderboard': ok(
      JSON.stringify({ ...JSON.parse(CROWD), warnings: ['Showing the top 100 models only'] }),
    ),
  });
  await page.goto('/leaderboard/');
  await expect(page.getByTestId('crowd-warnings')).toContainText('Showing the top 100 models only');
});

for (const [status, text] of [
  [503, 'Live ratings are temporarily unavailable'],
  [500, 'Live ratings could not be loaded'],
] as const) {
  test(`a ${status} from the crowd board shows the classic board with a notice`, async ({
    page,
  }) => {
    await mockApi(page, { '/api/leaderboard': err(status) });
    await page.goto('/leaderboard/');
    await expect(page.getByTestId('board-fallback')).toContainText(text);
    await expect(page.getByRole('table').locator('tbody tr').first()).toBeVisible();
    await expect(page.getByTestId('crowd-note')).toHaveCount(0);
    await expect(page.getByRole('alert')).toHaveCount(0);
  });
}

test('a category that cannot be served falls back without claiming its name', async ({ page }) => {
  await mockApi(page, {
    '/api/leaderboard': ok(CROWD),
    '/api/leaderboard/categories': ok(CATEGORIES),
    '/api/leaderboard/categories/math': err(500),
  });
  await page.goto('/leaderboard/');
  await page.getByRole('tab', { name: 'Math' }).click();
  await expect(page.getByTestId('category-fallback')).toBeVisible();
  await expect(page.getByTestId('crowd-note')).not.toContainText('in Math');
});

test('a seeded model is tagged as seeded in its details, without an interval', async ({ page }) => {
  await mockApi(page, { '/api/leaderboard': ok(CROWD) });
  await page.goto('/leaderboard/');
  await page.getByRole('button', { name: /^Show \d+ models$/ }).click();
  await page.locator('#unrated-list button[aria-haspopup="dialog"]').first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Elo, seeded');
  await expect(dialog).not.toContainText('±');
  await expect(dialog).toContainText('starting value');
});

for (const theme of ['dark', 'light'] as const) {
  test(`axe finds no serious violation on the crowd board (${theme})`, async ({ page }) => {
    await storeTheme(page, theme);
    await mockApi(page, {
      '/api/leaderboard': ok(
        JSON.stringify({ ...JSON.parse(CROWD), warnings: ['Showing the top 100 models only'] }),
      ),
    });
    await page.goto('/leaderboard/');
    await expect(page.getByTestId('crowd-warnings')).toBeVisible();
    await page.getByRole('button', { name: /^Show \d+ models$/ }).click();
    expect(await blockingViolations(page)).toEqual([]);
  });

  test(`axe finds no serious violation on the fallback notice (${theme})`, async ({ page }) => {
    await storeTheme(page, theme);
    await mockApi(page, { '/api/leaderboard': err(503) });
    await page.goto('/leaderboard/');
    await expect(page.getByTestId('board-fallback')).toBeVisible();
    expect(await blockingViolations(page)).toEqual([]);
  });
}
