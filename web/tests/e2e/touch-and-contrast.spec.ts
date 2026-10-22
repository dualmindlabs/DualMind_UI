import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Locator, type Page, type Route, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// Touch targets (44 by 44 CSS px on a coarse pointer) for the shell, landing, leaderboard and
// FAQ controls, and the forced-colors (Windows High Contrast) rendering with screenshots.

const here = path.dirname(fileURLToPath(import.meta.url));
const BOARD = readFileSync(
  path.join(here, '..', 'fixtures', 'api', 'leaderboard-v2.board.json'),
  'utf8',
);
const SHARED = JSON.parse(
  readFileSync(path.join(here, '..', 'fixtures', 'api', 'share-threads.json'), 'utf8'),
) as {
  ids: { public: string };
  threads: Record<string, { thread: unknown; messages: unknown[] } | undefined>;
};

async function mockStats(page: Page) {
  await page.route('**/api/v2/leaderboard', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: BOARD }),
  );
}

/** The public thread API for a signed-out visitor (tests/fixtures/api/share-threads.json). */
async function mockSharedApi(page: Page) {
  await page.route('**/api/threads/**', (route: Route) => {
    const pathname = new URL(route.request().url()).pathname;
    const match = /\/api\/threads\/([^/]+)(\/messages)?$/.exec(pathname);
    const entry = SHARED.threads[decodeURIComponent(match?.[1] ?? '')];
    return route.fulfill({
      status: entry ? 200 : 404,
      contentType: 'application/json',
      body: JSON.stringify(entry ? (match?.[2] ? { items: entry.messages } : entry.thread) : {}),
    });
  });
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
      const label = (element.getAttribute('aria-label') ?? element.textContent ?? element.tagName)
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
    await expectTouchSized(
      page.getByRole('contentinfo').getByRole('link').filter({ visible: true }),
      'footer links',
    );

    await banner.getByRole('button', { name: 'Open the menu' }).click();
    const menu = page.getByTestId('mobile-nav');
    await expect(menu).toBeVisible();
    await settle(page, 500);
    await expectTouchSized(
      menu.locator('a, button, label').filter({ visible: true }),
      'phone menu controls',
    );
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
    await expectTouchSized(
      page.getByRole('navigation', { name: 'Legal' }).getByRole('link'),
      'legal links',
    );
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`404: search without a keyboard hint on a touch screen (${theme})`, async ({ page }) => {
      await storeTheme(page, theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await page.goto('/no-such-page/');
      const search = page.getByRole('button', { name: /Or search the site/ });
      await expect(search).toBeVisible();
      await expect(page.getByTestId('not-found-shortcut')).toBeHidden();
      await expectTouchSized(search, '404 search button');
      await search.click();
      await expect(page.getByRole('dialog')).toBeVisible();
      await page.keyboard.press('Escape');
      await settle(page, 300);
      await page.screenshot({ path: shotPath(`touch-404-mobile-${theme}`) });
    });
  }
});

test('404: the shortcut hint shows where there is a keyboard', async ({ page }) => {
  await page.goto('/no-such-page/');
  const search = page.getByRole('button', { name: /Or search the site/ });
  await expect(search).toHaveAttribute('aria-keyshortcuts', 'Control+K Meta+K');
  await expect(page.getByTestId('not-found-shortcut')).toBeVisible();
});

/** The colour CanvasText resolves to, and the fill of every wordmark path on the page. */
async function wordmarkFills(page: Page) {
  return page.evaluate(() => {
    const probe = document.createElement('span');
    probe.style.color = 'CanvasText';
    document.body.append(probe);
    const canvasText = getComputedStyle(probe).color;
    probe.remove();
    const fills = [...document.querySelectorAll('[data-slot="wordmark"] path')]
      .filter(path => path.getBoundingClientRect().width > 0)
      .map(path => getComputedStyle(path).fill);
    return { canvasText, fills };
  });
}

/**
 * The shared forced-colors checks: the mode is on, the focused control has a solid outline of
 * at least 2px, buttons keep an edge, and the wordmark is drawn in the system text colour (its
 * SVG fills come from theme tokens, which forced colours leave alone).
 */
async function expectForcedColorsBasics(page: Page) {
  expect(await page.evaluate(() => matchMedia('(forced-colors: active)').matches)).toBe(true);

  const ring = await page.evaluate(() => {
    const style = getComputedStyle(document.activeElement ?? document.body);
    return { style: style.outlineStyle, width: parseFloat(style.outlineWidth) };
  });
  expect(ring.style).toBe('solid');
  expect(ring.width).toBeGreaterThanOrEqual(2);

  // Buttons keep an edge when their fill is replaced by system colours.
  const edge = await page.evaluate(() => {
    const button = document.querySelector('[data-slot="button"]');
    return button ? getComputedStyle(button).borderTopWidth : '1px';
  });
  expect(parseFloat(edge)).toBeGreaterThanOrEqual(1);

  const { canvasText, fills } = await wordmarkFills(page);
  expect(fills.length).toBeGreaterThan(0);
  expect(new Set(fills)).toEqual(new Set([canvasText]));
}

const shotSuffix = (theme: 'dark' | 'light') => (theme === 'dark' ? '' : '-light');

test.describe('forced colors', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const theme of ['dark', 'light'] as const) {
    for (const [name, url] of [
      ['landing', '/'],
      ['login', '/login/'],
      ['leaderboard', '/leaderboard/'],
      ['404', '/no-such-page/'],
    ] as const) {
      test(`${name} keeps a visible focus ring, borders and the wordmark (${theme})`, async ({
        page,
      }) => {
        await storeTheme(page, theme);
        await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
        await mockStats(page);
        await page.goto(url);
        await settle(page, 600);

        // Tab to the first control after the skip link: its outline is a real, wide line.
        await page.keyboard.press('Tab');
        await page.keyboard.press('Tab');
        await expectForcedColorsBasics(page);
        const shot = `forced-colors-${name}-desktop${shotSuffix(theme)}`;
        await page.screenshot({ path: shotPath(shot) });
      });
    }

    test(`a shared battle keeps its panes, badges and focus ring (${theme})`, async ({ page }) => {
      await storeTheme(page, theme);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await mockStats(page);
      await mockSharedApi(page);
      await page.goto(`/share/${SHARED.ids.public}`);
      await expect(page.getByTestId('turn')).toHaveCount(2);
      await settle(page, 600);
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expectForcedColorsBasics(page);
      // The A and B badges carry identity by colour on screen; here they keep an edge.
      const badge = page.locator('[data-slot="role-badge"]').filter({ visible: true }).first();
      await expect(badge).toBeVisible();
      expect(
        parseFloat(await badge.evaluate(element => getComputedStyle(element).borderTopWidth)),
      ).toBeGreaterThanOrEqual(1);
      await page.screenshot({ path: shotPath(`forced-colors-share-desktop${shotSuffix(theme)}`) });
    });

    test(`the arena vote keeps visible choices and focus (${theme})`, async ({ page }) => {
      await storeTheme(page, theme);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await mockArena(page);
      await page.goto('/?arena=new');
      await expect(page.getByTestId('arena')).toBeVisible();
      await page.getByRole('textbox', { name: 'Your prompt' }).fill('Explain recursion');
      await page.keyboard.press('Enter');
      const turn = page.getByTestId('live-turn').first();
      await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
      await settle(page, 400);
      await turn.getByRole('button', { name: /A is better/ }).focus();
      await expectForcedColorsBasics(page);
      const shot = `forced-colors-arena-vote-desktop${shotSuffix(theme)}`;
      await page.screenshot({ path: shotPath(shot) });
    });

    test(`settings keeps its choices and switches visible (${theme})`, async ({ page }) => {
      await storeTheme(page, theme);
      await page.emulateMedia({ forcedColors: 'active', reducedMotion: 'reduce' });
      await mockArena(page);
      await page.goto('/settings/#appearance');
      await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
      await settle(page, 600);
      await page.getByRole('heading', { level: 2, name: 'Appearance' }).scrollIntoViewIfNeeded();
      await page.keyboard.press('Tab');
      await page.keyboard.press('Tab');
      await expectForcedColorsBasics(page);
      const shot = `forced-colors-settings-desktop${shotSuffix(theme)}`;
      await page.screenshot({ path: shotPath(shot) });
    });
  }
});
