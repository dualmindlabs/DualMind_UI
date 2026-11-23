import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

// Chrome screenshots (slice F): the header at the top and condensed, the skip link, the command
// palette, the phone menu and the footer, at desktop and phone, in dark and light. Motion is
// reduced so the captures are the settled state.

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

async function settle(page: Page) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(700);
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`chrome ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });

      test.beforeEach(async ({ page }) => {
        await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
        await page.goto('/leaderboard/');
        await settle(page);
      });

      const name = (id: string) => path.join(OUT, `chrome-${id}__${vp.name}__${theme}.png`);

      test('header at the top and condensed', async ({ page }) => {
        await page.mouse.move(0, 0);
        await page.screenshot({
          path: name('1-header-top'),
          clip: { x: 0, y: 0, width: vp.width, height: 120 },
        });
        await page.mouse.wheel(0, 700);
        await page.waitForTimeout(600);
        await page.screenshot({
          path: name('2-header-condensed'),
          clip: { x: 0, y: 0, width: vp.width, height: 120 },
        });
      });

      test('skip link focused', async ({ page }) => {
        await page.keyboard.press('Tab');
        await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
        await page.screenshot({
          path: name('3-skip-link'),
          clip: { x: 0, y: 0, width: vp.width, height: 120 },
        });
      });

      test('command palette', async ({ page }) => {
        await page.keyboard.press('Control+K');
        await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
        await page.waitForTimeout(400);
        await page.screenshot({ path: name('4-palette') });
      });

      if (vp.phone) {
        test('phone menu', async ({ page }) => {
          await page.getByRole('banner').getByRole('button', { name: 'Open the menu' }).click();
          await expect(page.getByTestId('mobile-nav')).toBeVisible();
          await page.waitForTimeout(700);
          await page.screenshot({ path: name('5-menu') });
        });
      }

      test('footer', async ({ page }) => {
        const footer = page.locator('footer[data-slot="site-footer"]');
        await footer.scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        await footer.screenshot({ path: name('6-footer') });
      });
    });
  }
}
