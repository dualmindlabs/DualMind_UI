import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { passGate, settle, shotPath, storeTheme } from './helpers';

// The /design/ page in Chromium, through the real Worker: hydration, theme, keyboard, overflow,
// axe, and the review screenshots (uploaded by CI as the `web-screenshots` artifact).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test('loads without console errors and hydrates (the theme toggle works)', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('/design/');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Two minds, one verdict.');

  await page.locator('label').filter({ hasText: 'Light' }).click();
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => window.localStorage.getItem('dm.theme'))).toBe('light');

  await page.locator('label').filter({ hasText: 'System' }).click();
  await expect(page.locator('html')).not.toHaveAttribute('data-theme');

  await page.getByRole('button', { name: 'B is better' }).click();
  await expect(page.getByRole('button', { name: 'B is better' })).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  expect(errors).toEqual([]);
});

test('a stored theme applies before any app JavaScript runs (no flash)', async ({ page }) => {
  await storeTheme(page, 'light');
  // Block the app bundle: only the inline <head> script can set the theme now.
  await page.route('**/assets/*.js', route => route.abort());
  await page.goto('/design/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );
});

test('"system" follows prefers-color-scheme', async ({ page }) => {
  await page.emulateMedia({ colorScheme: 'light' });
  await page.goto('/design/');
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );
  await page.emulateMedia({ colorScheme: 'dark' });
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(15, 17, 21)',
  );
});

test('keyboard: the skip link comes first and moves focus to the content', async ({ page }) => {
  await page.goto('/design/');
  await page.keyboard.press('Tab');
  const skip = page.getByRole('link', { name: 'Skip to content' });
  await expect(skip).toBeFocused();
  await expect(skip).toBeVisible();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#main$/);
  await page.keyboard.press('Tab');
  // The next stop is inside <main>, not back in the header.
  expect(await page.evaluate(() => !!document.activeElement?.closest('main'))).toBe(true);
});

test('no horizontal overflow at 320 and 360 px', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/design/');
    await settle(page, 300);
    // html and body clip horizontal overflow, so look for elements that stick out instead of
    // measuring scrollWidth. Elements inside a clipping container (overflow hidden) are fine.
    const offenders = await page.evaluate(() => {
      const limit = document.documentElement.clientWidth + 0.5;
      const clipped = (element: Element) => {
        for (let parent = element.parentElement; parent; parent = parent.parentElement) {
          if (parent === document.body || parent === document.documentElement) return false;
          const { overflowX } = getComputedStyle(parent);
          if (overflowX === 'hidden' || overflowX === 'clip') return true;
        }
        return false;
      };
      return [...document.querySelectorAll('body *')]
        .filter(element => {
          const box = element.getBoundingClientRect();
          return box.width > 0 && box.right > limit && !clipped(element);
        })
        .slice(0, 5)
        .map(
          element =>
            `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
        );
    });
    expect(offenders, `${width}px`).toEqual([]);
  }
});

for (const theme of ['dark', 'light'] as const) {
  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    test(`axe: no serious or critical violations (${theme}, ${viewport.name})`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await storeTheme(page, theme);
      await page.goto('/design/');
      await settle(page, 500);

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      const blocking = results.violations.filter(
        violation => violation.impact === 'serious' || violation.impact === 'critical',
      );
      const summary = blocking.map(
        violation =>
          `${violation.id} (${violation.impact}): ${violation.nodes
            .slice(0, 3)
            .map(node => node.target.join(' '))
            .join(', ')}`,
      );
      expect(summary).toEqual([]);
    });
  }
}

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];
const modes = [
  { name: 'dark', theme: 'dark', reducedMotion: 'no-preference' },
  { name: 'light', theme: 'light', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', theme: 'dark', reducedMotion: 'reduce' },
] as const;

for (const viewport of viewports) {
  for (const mode of modes) {
    test(`screenshot: ${viewport.name} ${mode.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      await storeTheme(page, mode.theme);
      await page.goto('/design/');
      await settle(page);
      // The entrance animations have finished by now; `animations: 'disabled'` pins their end
      // state, because Chromium can drop animated layers from full-page captures.
      await page.screenshot({
        path: shotPath(`design-${viewport.name}-${mode.name}-fold`),
        animations: 'disabled',
      });
      await page.screenshot({
        path: shotPath(`design-${viewport.name}-${mode.name}-full`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}
