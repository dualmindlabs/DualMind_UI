import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

// Models directory review screenshots with the recorded 53-model board mocked: cards, list view,
// two models pinned for comparison (dock open), and the no-match state. Dark and light, desktop
// and phone, motion reduced, focus blurred.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });
const BOARD = readFileSync(
  path.resolve(process.cwd(), 'tests/fixtures/api/leaderboard-v2.board.json'),
  'utf8',
);

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`models ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      test('cards, list, compare, no match', async ({ page, context, baseURL }) => {
        await context.addCookies([
          { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
        ]);
        await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
        await page.route('**/api/v2/leaderboard', route =>
          route.fulfill({ status: 200, contentType: 'application/json', body: BOARD }),
        );
        const file = (name: string) => path.join(OUT, `models-${name}__${vp.name}__${theme}.png`);

        await page.goto('/models/');
        const items = page.getByRole('list', { name: 'Models' }).getByRole('listitem');
        await expect(items.first()).toBeVisible();
        await settle(page);
        await page.screenshot({ path: file('1-cards-top') });
        await page.screenshot({ path: file('2-cards-full'), fullPage: true });

        await page.getByRole('button', { name: 'List' }).click();
        await settle(page);
        await page.getByRole('list', { name: 'Models' }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: file('3-list') });
        await page.getByRole('button', { name: 'Cards' }).click();

        await items.nth(0).locator('label').click();
        await expect(items.nth(0).getByRole('checkbox')).toBeChecked();
        await items.nth(2).locator('label').click();
        await expect(items.nth(2).getByRole('checkbox')).toBeChecked();
        await expect(page.getByRole('region', { name: 'Model comparison' })).toBeVisible();
        await items.nth(0).scrollIntoViewIfNeeded();
        await settle(page);
        await page.screenshot({ path: file('4-compare') });

        await page.getByRole('button', { name: 'Clear comparison' }).click();
        await page.getByRole('searchbox', { name: 'Search models' }).fill('zzzz-no-such-model');
        await expect(page.getByText('No model matches “zzzz-no-such-model”.')).toBeVisible();
        await settle(page);
        await page.getByRole('heading', { name: /No model matches/ }).scrollIntoViewIfNeeded();
        await page.screenshot({ path: file('5-no-match') });
      });
    });
  }
}
