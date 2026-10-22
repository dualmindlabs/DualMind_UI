import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Locator, type Page, type Route, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { fullPageShot, passGate, settle, shotPath, storeTheme } from './helpers';

// Phone checks across the site: no sideways page scroll on any public route or the signed-in
// arena at 360 and 390 px wide, and the docked composer and the vote bar fully on screen.
// Screenshots (`mobile-*`) are for the review of the fixed screens, dark and light.

const here = path.dirname(fileURLToPath(import.meta.url));
const BOARD = readFileSync(
  path.join(here, '..', 'fixtures', 'api', 'model-stats.board.recorded.json'),
  'utf8',
);

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

const PHONES = [
  { label: '360', width: 360, height: 740 },
  { label: '390', width: 390, height: 844 },
] as const;

const PUBLIC_ROUTES = [
  '/',
  '/leaderboard/',
  '/models/',
  '/login/',
  '/signup/',
  '/forgot-password/',
  '/about/',
  '/credits/',
  '/how-it-works/',
  '/faq/',
  '/privacy/',
  '/terms/',
  '/cookies/',
  '/does-not-exist',
] as const;

async function mockStats(page: Page) {
  await page.route('**/api/arena/model-stats', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: BOARD }),
  );
}

/** How far the page is wider than the window (0 when there is no sideways scroll). */
async function overflowX(page: Page) {
  return page.evaluate(
    () =>
      Math.max(
        document.documentElement.scrollWidth,
        document.body ? document.body.scrollWidth : 0,
      ) - window.innerWidth,
  );
}

async function expectInsideViewport(page: Page, selector: Locator, what: string) {
  const box = await selector.boundingBox();
  expect(box, `${what}: not rendered`).not.toBeNull();
  const size = page.viewportSize();
  if (!box || !size) return;
  expect(box.x, `${what}: left edge`).toBeGreaterThanOrEqual(-0.5);
  expect(box.y, `${what}: top edge`).toBeGreaterThanOrEqual(-0.5);
  expect(box.x + box.width, `${what}: right edge`).toBeLessThanOrEqual(size.width + 0.5);
  expect(box.y + box.height, `${what}: bottom edge`).toBeLessThanOrEqual(size.height + 0.5);
}

for (const phone of PHONES) {
  test.describe(`phone ${phone.label}`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: phone.width, height: phone.height });
    });

    for (const route of PUBLIC_ROUTES) {
      test(`no sideways scroll: ${route}`, async ({ page }) => {
        await mockStats(page);
        await page.goto(route);
        await settle(page, 900);
        expect(await overflowX(page)).toBeLessThanOrEqual(0);
      });
    }

    test('no sideways scroll: the phone menu and the palette', async ({ page }) => {
      await mockStats(page);
      await page.goto('/leaderboard/');
      await settle(page, 600);
      await page.getByRole('button', { name: /menu/i }).first().click();
      await settle(page, 600);
      expect(await overflowX(page)).toBeLessThanOrEqual(0);
    });

    test('signed-in arena: empty, battle, vote bar, composer, settings', async ({ page }) => {
      await mockArena(page);
      await page.goto('/');
      await expect(page.getByTestId('arena')).toBeVisible();
      await settle(page, 900);
      expect(await overflowX(page), 'empty arena').toBeLessThanOrEqual(0);
      const prompt = page.getByRole('textbox', { name: 'Your prompt' });
      await expectInsideViewport(page, prompt, 'the empty arena composer');

      await prompt.fill('Explain recursion to a ten-year-old');
      await page.keyboard.press('Control+Enter');
      const turn = page.getByTestId('live-turn').first();
      await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
      await settle(page, 600);
      expect(await overflowX(page), 'battle').toBeLessThanOrEqual(0);
      await expectInsideViewport(page, page.getByTestId('vote-hint'), 'the vote hint');
      await expectInsideViewport(
        page,
        page.getByRole('textbox', { name: 'Your prompt' }),
        'the docked composer',
      );
      await expectInsideViewport(page, page.getByTestId('composer-send'), 'the send button');

      await page.goto('/settings/');
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
      await settle(page, 600);
      expect(await overflowX(page), 'settings').toBeLessThanOrEqual(0);
    });
  });
}

test.describe('mobile screenshots', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`fixed screens: ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await storeTheme(page, theme);
      await mockStats(page);
      await page.goto('/does-not-exist');
      await settle(page, 2200);
      await page.screenshot({ path: shotPath(`mobile-404-${theme}`) });

      await page.goto('/');
      await settle(page, 2000);
      await page.screenshot({ path: shotPath(`mobile-landing-fold-${theme}`) });

      await page.goto('/leaderboard/');
      await settle(page, 1200);
      await fullPageShot(page, { path: shotPath(`mobile-leaderboard-${theme}`), fullPage: true });
    });

    test(`signed-in arena: ${theme}`, async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 740 });
      await storeTheme(page, theme);
      await mockArena(page);
      await page.goto('/');
      await expect(page.getByTestId('arena')).toBeVisible();
      await settle(page, 1200);
      await page.screenshot({ path: shotPath(`mobile-arena-empty-${theme}`) });
      const prompt = page.getByRole('textbox', { name: 'Your prompt' });
      await prompt.fill('Explain recursion to a ten-year-old');
      await page.keyboard.press('Control+Enter');
      await expect(page.getByTestId('live-turn').first()).toHaveAttribute(
        'data-phase',
        'awaiting_vote',
        { timeout: 15_000 },
      );
      await settle(page, 800);
      await page.screenshot({ path: shotPath(`mobile-arena-vote-${theme}`) });
    });
  }

  test('arena in landscape: composer stays on screen', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 });
    await mockArena(page);
    await page.goto('/');
    await expect(page.getByTestId('arena')).toBeVisible();
    await settle(page, 1200);
    expect(await overflowX(page)).toBeLessThanOrEqual(0);
    await page.getByRole('textbox', { name: 'Your prompt' }).scrollIntoViewIfNeeded();
    await expectInsideViewport(
      page,
      page.getByRole('textbox', { name: 'Your prompt' }),
      'the landscape composer',
    );
    await page.screenshot({ path: shotPath('mobile-arena-landscape') });
  });
});
