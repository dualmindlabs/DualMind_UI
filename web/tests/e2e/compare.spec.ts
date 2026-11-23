import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { COMPARE_ID, type CompareMockOptions, mockCompareBackend } from './compare-mocks';
import { passGate, storeTheme } from './helpers';

// Compare mode (backend PR 64, flag be9_compare_mode) through the real Worker: the flag-off page,
// running a compare with the request the API expects, the privacy panel, sharing and deleting,
// every failure the backend can answer, keyboard use, axe in both themes, and no sideways scroll
// on a phone. The API is answered by Playwright routes (compare-mocks.ts).

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

async function open(page: Page, options: CompareMockOptions = {}) {
  const state = await mockCompareBackend(page, options);
  await page.goto('/compare/');
  return state;
}

async function pickModel(page: Page, label: string, index: number) {
  await page.getByRole('combobox', { name: new RegExp(label) }).click();
  await page.locator('[role="option"]:visible').nth(index).click();
  // The list closes (and its options leave the page) before the next one opens.
  await expect(page.locator('[role="listbox"]:visible')).toHaveCount(0);
}

async function run(page: Page) {
  await page.getByRole('textbox', { name: /your prompt/i }).fill('Why is the sky blue?');
  await pickModel(page, 'Model A', 0);
  await pickModel(page, 'Model B', 1);
  await page.getByRole('button', { name: 'Run compare' }).click();
}

test.describe('compare mode', () => {
  test('flag off: says so, and never shows the form', async ({ page }) => {
    const state = await open(page, { off: true });
    await expect(page.getByTestId('compare-unavailable')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Open the Arena' })).toHaveAttribute('href', '/');
    await expect(page.getByTestId('compare-form')).toHaveCount(0);
    // Only the one probe went out; nothing that costs a model call.
    expect(state.requests.filter(request => request.startsWith('POST'))).toEqual([]);
  });

  test('runs a compare: names, no system prompt, private by default, both answers', async ({
    page,
  }) => {
    const state = await open(page);
    await run(page);
    await expect(page.getByTestId('compare-answers')).toBeVisible();
    expect(state.last).toMatchObject({ prompt: 'Why is the sky blue?' });
    expect(state.last?.modelA).not.toEqual(state.last?.modelB);
    expect(state.last).not.toHaveProperty('system');
    expect(state.last).not.toHaveProperty('share');
    await expect(page.getByRole('heading', { name: 'Private' })).toBeVisible();
    await expect(page.getByTestId('compare-privacy')).toContainText(
      'Only you can open this result',
    );
    await expect(page.getByTestId('compare-privacy')).toContainText('then deleted');
    // Both panes carry the model names (nothing is blind here).
    await expect(page.getByRole('region', { name: /^Answer A/ })).toBeVisible();
    await expect(page.getByRole('region', { name: /^Answer B/ })).toBeVisible();
    await expect(page.getByText('Rayleigh scattering')).toBeVisible();
  });

  test('sharing on shows the link, off hides it, delete asks first', async ({ page }) => {
    const state = await open(page);
    await run(page);
    const toggle = page.getByRole('switch', { name: /anyone with the link can read this$/i });
    await toggle.click();
    await expect(page.getByRole('textbox', { name: 'Share link' })).toHaveValue(
      new RegExp(`/compare/${COMPARE_ID}$`),
    );
    await expect(page.getByRole('status').filter({ hasText: 'Sharing is on' })).toBeVisible();
    await toggle.click();
    await expect(page.getByRole('textbox', { name: 'Share link' })).toHaveCount(0);
    expect(state.shared).toBe(false);

    await page.getByRole('button', { name: 'Delete this result' }).click();
    expect(state.deleted).toBe(false);
    await page.getByRole('button', { name: 'Delete for good' }).click();
    await expect(page.getByTestId('compare-result')).toHaveCount(0);
    expect(state.deleted).toBe(true);
  });

  test('a shared result reads without signing in; a private one does not', async ({ page }) => {
    await mockCompareBackend(page, { shared: true });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(`/compare/${COMPARE_ID}`);
    await expect(page.getByRole('heading', { name: 'Shared by link' })).toBeVisible();
    await expect(page.getByRole('switch')).toHaveCount(0);
  });

  test('a private result is the same "private or does not exist" page for a stranger', async ({
    page,
  }) => {
    await mockCompareBackend(page, { shared: false });
    await page.addInitScript(() => window.localStorage.clear());
    await page.goto(`/compare/${COMPARE_ID}`);
    await expect(page.getByTestId('compare-not-found')).toBeVisible();
  });

  for (const [status, code, text] of [
    [429, 'RATE_LIMITED', 'Wait a moment'],
    [429, 'COMPARE_IN_PROGRESS', 'still running'],
    [503, 'MODEL_UNAVAILABLE', 'Nothing was saved'],
    [503, 'COMPARE_BUSY', 'busy right now'],
    [400, 'SAME_MODEL', 'two different models'],
  ] as const) {
    test(`${code}: explained, and the form stays`, async ({ page }) => {
      await open(page, { fail: { status, code, retryAfter: 5 } });
      await run(page);
      await expect(page.getByTestId('compare-run-error')).toContainText(text);
      await expect(page.getByRole('button', { name: 'Run compare' })).toBeEnabled();
    });
  }

  test('works from the keyboard: the prompt, then the model lists open with Enter', async ({
    page,
  }) => {
    await open(page);
    await page.getByRole('textbox', { name: /your prompt/i }).focus();
    await page.keyboard.type('Keyboard only');
    await page.keyboard.press('Tab');
    await expect(page.getByRole('combobox', { name: /Model A/ })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('listbox')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('listbox')).toHaveCount(0);
  });

  test('the loading state keeps its place and announces itself', async ({ page }) => {
    await open(page, { delayMs: 1500 });
    await run(page);
    await expect(page.getByTestId('compare-loading')).toBeVisible();
    await expect(page.getByRole('status').filter({ hasText: 'Asking both models' })).toBeAttached();
    await expect(page.getByTestId('compare-answers')).toBeVisible({ timeout: 10_000 });
    await expect(page.getByTestId('compare-loading')).toHaveCount(0);
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe: no violations, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await open(page);
      await run(page);
      await expect(page.getByTestId('compare-answers')).toBeVisible();
      const results = await new AxeBuilder({ page }).analyze();
      expect(
        results.violations.map(violation => `${violation.id}: ${violation.nodes.length}`),
      ).toEqual([]);
    });
  }

  test('phone: no sideways scroll', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await open(page);
    await run(page);
    await expect(page.getByTestId('compare-answers')).toBeVisible();
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
