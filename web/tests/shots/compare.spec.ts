import { mkdirSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { COMPARE_ID, type CompareMockOptions, mockCompareBackend } from '../e2e/compare-mocks';

// Compare page review screenshots (backend PR 64 on DualMind_Back, flag be9_compare_mode, off by
// default): the empty form with its private-by-default copy, both models working, the result with
// its privacy panel, a shared result with its link, the delete confirmation, a failed run, a
// private result opened signed out, and the page with the flag OFF. The API is answered by
// Playwright routes (tests/e2e/compare-mocks.ts): no backend is needed and the answers are
// synthetic.

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

async function capture(page: Page, name: string, vp: string, theme: string, full = true) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
  await page.mouse.move(0, 0);
  await page.waitForTimeout(250);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  await page.screenshot({
    path: path.join(OUT, `compare-${name}__${vp}__${theme}.png`),
    fullPage: full,
  });
  await handle.evaluate(node => (node as Element).remove());
}

async function pickModel(page: Page, label: string, index: number) {
  await page.getByRole('combobox', { name: new RegExp(label) }).click();
  await page.getByRole('option').nth(index).click();
}

async function fillAndRun(page: Page) {
  await page.getByRole('textbox', { name: /your prompt/i }).fill('Why is the sky blue?');
  await pickModel(page, 'Model A', 0);
  await pickModel(page, 'Model B', 1);
  await page.getByRole('button', { name: 'Run compare' }).click();
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`compare ${vp.name} ${theme}`, () => {
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

      async function open(page: Page, options: CompareMockOptions = {}) {
        const state = await mockCompareBackend(page, options);
        await page.goto('/compare/');
        return state;
      }

      test('form, running, result, sharing, delete', async ({ page }) => {
        await open(page, { delayMs: 3000 });
        await expect(page.getByTestId('compare-form')).toBeVisible();
        await capture(page, '1-form', vp.name, theme);

        await fillAndRun(page);
        await expect(page.getByTestId('compare-loading')).toBeVisible();
        await capture(page, '2-running', vp.name, theme);

        await expect(page.getByTestId('compare-result')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByTestId('compare-answers')).toBeVisible();
        await expect(page.getByRole('heading', { name: 'Private' })).toBeVisible();
        await page.waitForTimeout(500);
        await capture(page, '3-result-private', vp.name, theme);

        await page.getByRole('switch', { name: /anyone with the link can read this$/i }).click();
        await expect(page.getByRole('heading', { name: 'Shared by link' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: 'Share link' })).toHaveValue(
          new RegExp(`/compare/${COMPARE_ID}$`),
        );
        await page.getByTestId('compare-sharing').scrollIntoViewIfNeeded();
        await capture(page, '4-result-shared', vp.name, theme);

        await page.getByRole('button', { name: 'Delete this result' }).click();
        await page.getByRole('button', { name: 'Delete for good' }).waitFor();
        await page.getByTestId('compare-sharing').scrollIntoViewIfNeeded();
        await page.screenshot({
          path: path.join(OUT, `compare-5-delete-confirm__${vp.name}__${theme}.png`),
        });
      });

      test('a failed run keeps the form and says why', async ({ page }) => {
        await open(page, { fail: { status: 503, code: 'MODEL_UNAVAILABLE' } });
        await fillAndRun(page);
        await expect(page.getByTestId('compare-run-error')).toContainText('Nothing was saved');
        await expect(page.getByTestId('compare-form')).toBeVisible();
        await capture(page, '6-error', vp.name, theme);
      });

      test('a shared result opened without signing in', async ({ page }) => {
        // The arena mocks sign the browser in; clear that session so this visitor is signed out.
        await mockCompareBackend(page, { shared: true });
        await page.addInitScript(() => window.localStorage.clear());
        await page.goto(`/compare/${COMPARE_ID}`);
        await expect(page.getByTestId('compare-result')).toBeVisible({ timeout: 15_000 });
        await expect(page.getByRole('heading', { name: 'Shared by link' })).toBeVisible();
        await expect(page.getByRole('switch')).toHaveCount(0);
        await capture(page, '7-shared-view', vp.name, theme);
      });

      test('flag off: the page says compare is not on and points to side by side', async ({
        page,
      }) => {
        await open(page, { off: true });
        await expect(page.getByTestId('compare-unavailable')).toBeVisible();
        await expect(page.getByTestId('compare-form')).toHaveCount(0);
        await capture(page, '8-flag-off', vp.name, theme);
      });

      test('a result that could not be stored says so', async ({ page }) => {
        await open(page, { unstored: true });
        await fillAndRun(page);
        await expect(page.getByRole('heading', { name: 'Not saved' })).toBeVisible();
        await capture(page, '9-not-saved', vp.name, theme);
      });
    });
  }
}
