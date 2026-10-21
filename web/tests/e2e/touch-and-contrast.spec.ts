import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Locator, type Page, type Route, test } from '@playwright/test';

import { passGate, settle, shotPath, storeTheme } from './helpers';

// Touch targets (44 by 44 CSS px on a coarse pointer) for the shell, landing, leaderboard and
// FAQ controls, and the forced-colors (Windows High Contrast) rendering with screenshots.

const here = path.dirname(fileURLToPath(import.meta.url));
const BOARD = readFileSync(
  path.join(here, '..', 'fixtures', 'api', 'model-stats.board.recorded.json'),
  'utf8',
);

async function mockStats(page: Page) {
  await page.route('**/api/arena/model-stats', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: BOARD }),
  );
}

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

interface Size {
  name: string;
  width: number;
  height: number;
}

/**
 * The pointer target of every element the locator matches: its box, or the `hit-area`
 * pseudo-element when that is larger (it is centred on the element and takes the clicks).
 */
async function targetSizes(locator: Locator): Promise<Size[]> {
  return locator.evaluateAll(elements =>
    elements.map(element => {
      const box = element.getBoundingClientRect();
      const pseudo = getComputedStyle(element, '::before');
      const extends_ = pseudo.content !== 'none' && pseudo.position === 'absolute';
      const label = (
        element.getAttribute('aria-label') ??
        element.textContent ??
        element.tagName
      )
        .trim()
        .slice(0, 40);
      return {
        name: label,
        width: Math.max(box.width, extends_ ? parseFloat(pseudo.width) || 0 : 0),
        height: Math.max(box.height, extends_ ? parseFloat(pseudo.height) || 0 : 0),
      };
    }),
  );
}

async function expectTouchSized(locator: Locator, what: string) {
  const sizes = await targetSizes(locator);
  expect(sizes.length, `${what}: no controls found`).toBeGreaterThan(0);
  const small = sizes.filter(size => size.width < 43.5 || size.height < 43.5);
  expect(small, `${what}: controls under 44x44`).toEqual([]);
}

test.describe('touch targets (phone, coarse pointer)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the page reports a coarse pointer', async ({ page }) => {
    await page.goto('/design/');
    expect(await page.evaluate(() => matchMedia('(pointer: coarse)').matches)).toBe(true);
  });

  test('landing: header, example chips, menu, theme switch and footer', async ({ page }) => {
    await page.goto('/');
    await settle(page, 600);
    const banner = page.getByRole('banner');
    await expectTouchSized(
      banner.locator('a[aria-label="DualMind Arena, home"], button').filter({ visible: true }),
      'header controls',
    );
    await expectTouchSized(
      page.getByRole('button', { name: /^Play the recorded battle/ }).filter({ visible: true }),
      'example chips',
    );
    await expectTouchSized(page.getByRole('contentinfo').getByRole('link').filter({ visible: true }), 'footer links');

    await banner.getByRole('button', { name: 'Open the menu' }).click();
    const menu = page.getByTestId('mobile-nav');
    await expect(menu).toBeVisible();
    await settle(page, 500);
    await expectTouchSized(menu.locator('a, button, label').filter({ visible: true }), 'phone menu controls');
    await page.screenshot({ path: shotPath('touch-mobile-menu-mobile-dark') });
  });

  test('leaderboard: sort and provider toggles', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(page.getByRole('list', { name: 'Models ranked by Elo' })).toBeVisible();
    await expectTouchSized(
      page.getByRole('group', { name: 'Sort' }).getByRole('button'),
      'sort toggles',
    );
    await expectTouchSized(
      page.getByRole('group', { name: 'Provider' }).getByRole('button'),
      'provider toggles',
    );
  });

  test('FAQ: question rows', async ({ page }) => {
    await page.goto('/faq/');
    await expectTouchSized(
      page.locator('[data-slot="accordion-trigger"]').filter({ visible: true }),
      'FAQ rows',
    );
  });

  test('sign-in pages: links and the legal footer', async ({ page }) => {
    await page.goto('/login/');
    await expectTouchSized(page.getByRole('navigation', { name: 'Legal' }).getByRole('link'), 'legal links');
  });
});

test.describe('forced colors', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const [name, url] of [
    ['landing', '/'],
    ['login', '/login/'],
    ['leaderboard', '/leaderboard/'],
  ] as const) {
    test(`${name} keeps a visible focus ring and borders`, async ({ page }) => {
      await storeTheme(page, 'dark');
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await mockStats(page);
      await page.goto(url);
      await settle(page, 600);
      expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

      // Tab to the first control after the skip link: its outline is a real, wide line.
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      const ring = await page.evaluate(() => {
        const style = getComputedStyle(document.activeElement ?? document.body);
        return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
      });
      expect(ring.style).toBe('solid');
      expect(ring.width).toBeGreaterThanOrEqual(2);

      // Buttons keep an edge when their fill is replaced by system colours.
      const edge = await page.evaluate(() => {
        const button = document.querySelector('[data-slot="button"], a[class*="h-11"]');
        return button ? getComputedStyle(button).borderTopWidth : '1px';
      });
      expect(parseFloat(edge)).toBeGreaterThanOrEqual(1);

      await page.screenshot({ path: shotPath(`forced-colors-${name}-desktop`) });
    });
  }
});
