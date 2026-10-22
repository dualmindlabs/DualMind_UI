import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Page, type Route, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// Every keyboard stop shows where focus is. The page is walked with Tab from the top until focus
// comes back round (or leaves the page); each focused element must draw a solid outline of at
// least 2px itself, on its ::before or ::after (the leaderboard and model cards ring the whole
// card), or on a close ancestor that rings its focused child (`focus-ring-within`, the
// composers). Audit follow-up of 22 Oct (docs/redesign/ui-audit.md, "Status after 22 Oct").

const here = path.dirname(fileURLToPath(import.meta.url));
const SHARED = JSON.parse(
  readFileSync(path.join(here, '..', 'fixtures', 'api', 'share-threads.json'), 'utf8'),
) as {
  ids: { public: string };
  threads: Record<string, { thread: unknown; messages: unknown[] } | undefined>;
};

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

interface Stop {
  /** The element, for the failure message. */
  name: string;
  ringed: boolean;
}

/** One Tab: the newly focused element and whether it shows a ring; null once focus is back. */
async function nextStop(page: Page): Promise<Stop | null> {
  await page.keyboard.press('Tab');
  return page.evaluate(() => {
    const element = document.activeElement as HTMLElement | null;
    if (!element || element === document.body || element === document.documentElement) {
      return null;
    }
    // Seen before: the walk has come round.
    if (element.dataset.focusWalk === 'seen') return null;
    element.dataset.focusWalk = 'seen';

    const solid = (style: CSSStyleDeclaration) =>
      style.outlineStyle !== 'none' &&
      parseFloat(style.outlineWidth) >= 2 &&
      style.outlineColor !== 'rgba(0, 0, 0, 0)' &&
      style.outlineColor !== 'transparent';
    let ringed =
      solid(getComputedStyle(element)) ||
      solid(getComputedStyle(element, '::after')) ||
      solid(getComputedStyle(element, '::before'));
    let parent = element.parentElement;
    for (let depth = 0; !ringed && parent && depth < 4; depth += 1) {
      ringed = solid(getComputedStyle(parent));
      parent = parent.parentElement;
    }

    const label =
      element.getAttribute('aria-label') ??
      element.getAttribute('name') ??
      element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 40) ??
      '';
    const role = element.getAttribute('role');
    return {
      name: `<${element.tagName.toLowerCase()}${role ? ` role=${role}` : ''}> "${label}"`,
      ringed,
    };
  });
}

/** Tabs through the whole page; returns how many stops it found and the ones with no ring. */
async function walk(page: Page, limit = 160) {
  const missing: string[] = [];
  let stops = 0;
  for (let i = 0; i < limit; i += 1) {
    const stop = await nextStop(page);
    if (!stop) break;
    stops += 1;
    if (!stop.ringed) missing.push(stop.name);
  }
  return { stops, missing };
}

async function mockStats(page: Page) {
  const board = readFileSync(
    path.join(here, '..', 'fixtures', 'api', 'leaderboard-v2.board.json'),
    'utf8',
  );
  await page.route('**/api/v2/leaderboard', (route: Route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: board }),
  );
}

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

interface Case {
  name: string;
  url: string;
  ready: (page: Page) => Promise<void>;
  signedIn?: boolean;
  minStops: number;
}

const CASES: Case[] = [
  {
    name: 'landing',
    url: '/',
    ready: page => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    minStops: 15,
  },
  {
    name: 'leaderboard',
    url: '/leaderboard/',
    ready: page => expect(page.getByRole('table', { name: /Models ranked by Elo/ })).toBeVisible(),
    minStops: 20,
  },
  {
    name: 'models',
    url: '/models/',
    ready: page => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    minStops: 20,
  },
  {
    name: 'faq',
    url: '/faq/',
    ready: page => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    minStops: 10,
  },
  {
    name: 'login',
    url: '/login/',
    ready: page => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    minStops: 8,
  },
  {
    name: 'signup',
    url: '/signup/',
    ready: page => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    minStops: 8,
  },
  {
    name: '404',
    url: '/no-such-page/',
    ready: page => expect(page.getByRole('heading', { level: 1 })).toBeVisible(),
    minStops: 8,
  },
  {
    name: 'share',
    url: `/share/${SHARED.ids.public}`,
    ready: page => expect(page.getByTestId('turn')).toHaveCount(2),
    minStops: 8,
  },
  {
    name: 'settings',
    url: '/settings/',
    ready: page => expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible(),
    signedIn: true,
    minStops: 15,
  },
  {
    name: 'arena',
    url: '/?arena=new&thread=t-recursion',
    ready: page => expect(page.getByTestId('turn').first()).toBeVisible(),
    signedIn: true,
    minStops: 10,
  },
];

test.describe('every keyboard stop shows a focus ring', () => {
  test.use({ viewport: { width: 1280, height: 800 } });

  for (const item of CASES) {
    test(item.name, async ({ page }) => {
      await storeTheme(page, 'dark');
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockStats(page);
      await mockSharedApi(page);
      if (item.signedIn) await mockArena(page);
      await page.goto(item.url);
      await item.ready(page);
      await settle(page, 400);

      const { stops, missing } = await walk(page);
      console.log(`${item.name}: ${stops} keyboard stops`);
      expect(stops, `${item.name}: the walk found too few stops`).toBeGreaterThanOrEqual(
        item.minStops,
      );
      expect(missing, `${item.name}: focused with no visible ring`).toEqual([]);
    });
  }

  for (const theme of ['dark', 'light'] as const) {
    test(`the ring on a leaderboard row (${theme})`, async ({ page }) => {
      await storeTheme(page, theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockStats(page);
      await page.goto('/leaderboard/');
      const table = page.getByRole('table', { name: /Models ranked by Elo/ });
      await expect(table).toBeVisible();
      // Keyboard focus (a Tab first, so the browser shows the ring) on the first model's button.
      await page.keyboard.press('Tab');
      const first = table.locator('tbody').getByRole('button').first();
      await first.focus();
      await expect(first).toBeFocused();
      await table.scrollIntoViewIfNeeded();
      await settle(page, 300);
      await page.screenshot({ path: shotPath(`focus-ring-leaderboard-row-desktop-${theme}`) });
    });
  }
});
