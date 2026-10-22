import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

// Slice H review screenshots: the 404 (shallow, nested, after a vote), the root crash, offline and
// update screens, and the /problems pages the Worker renders. Desktop and phone, dark and light,
// motion reduced so the captures are the settled state.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
  ]);
});

async function capture(page: Page, name: string, vp: string, theme: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(200);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  await page.screenshot({ path: path.join(OUT, `${name}__${vp}__${theme}.png`), fullPage: true });
  await handle.evaluate(node => (node as Element).remove());
}

/** Makes the app's root error boundary show: something outside the arena throws on first effect. */
async function forceCrash(page: Page, message: string, offline = false) {
  await page.addInitScript(
    ({ text, off }) => {
      if (off) {
        Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
      }
      const real = window.matchMedia.bind(window);
      window.matchMedia = (query: string) => {
        if (!query.includes('prefers-color-scheme')) throw new Error(text);
        return real(query);
      };
    },
    { text: message, off: offline },
  );
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`errors ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
      });

      test('404 nested path', async ({ page }) => {
        await page.goto('/leaderboard/nope/deeper');
        await expect(page.getByTestId('not-found-prompt')).toContainText(
          '/leaderboard/nope/deeper',
        );
        await expect(page.getByTestId('root-error')).toHaveCount(0);
        await capture(page, 'h-404-nested', vp.name, theme);
      });

      test('404 after a vote', async ({ page }) => {
        await page.goto('/does-not-exist');
        await page.getByRole('button', { name: 'Both bad' }).click();
        await expect(page.getByTestId('not-found-verdict')).toContainText('only correct vote');
        await capture(page, 'h-404-voted', vp.name, theme);
      });

      test('root crash', async ({ page }) => {
        await forceCrash(page, 'forced crash');
        await page.goto('/leaderboard/');
        await expect(page.getByTestId('root-error')).toHaveAttribute('data-kind', 'error');
        await capture(page, 'h-crash', vp.name, theme);
      });

      test('offline', async ({ page }) => {
        await forceCrash(page, 'forced crash', true);
        await page.goto('/leaderboard/');
        await expect(page.getByTestId('root-error')).toHaveAttribute('data-kind', 'offline');
        await capture(page, 'h-offline', vp.name, theme);
      });

      test('update (chunk failed)', async ({ page }) => {
        await forceCrash(page, 'Failed to fetch dynamically imported module: /assets/x.js');
        await page.goto('/leaderboard/');
        await expect(page.getByTestId('root-error')).toHaveAttribute('data-kind', 'chunk');
        await capture(page, 'h-update', vp.name, theme);
      });

      test('problems index and one problem', async ({ page }) => {
        await page.goto('/problems/');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Problem types');
        await capture(page, 'h-problems', vp.name, theme);
        await page.goto('/problems/rate_limited');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText('Too many requests');
        await capture(page, 'h-problem-detail', vp.name, theme);
      });
    });
  }
}
