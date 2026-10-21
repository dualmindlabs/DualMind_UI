import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

import { passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';

// /leaderboard/ and /models/ through the real Worker, with GET /api/arena/model-stats answered
// by the recorded live board (53 models, web/tests/fixtures/api/model-stats.board.recorded.json),
// so nothing reaches production. Prerendering, the board, sorting, search and filters, the
// details sheet and drawer, error and empty states, CSP, axe, overflow and the screenshots.

const here = path.dirname(fileURLToPath(import.meta.url));
const BOARD = readFileSync(
  path.join(here, '..', 'fixtures', 'api', 'model-stats.board.recorded.json'),
  'utf8',
);
const STATS = '**/api/arena/model-stats';
const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };

type Reply = 'ok' | 'empty' | 'error';

/** Answers model-stats with `reply()` on every request (the board refreshes in the background). */
async function mockStats(page: Page, reply: () => Reply = () => 'ok') {
  await page.route(STATS, async (route: Route) => {
    const mode = reply();
    if (mode === 'error') {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ success: false, error: 'Internal server error', code: 'E500' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: mode === 'empty' ? '{"success":true,"items":[]}' : BOARD,
    });
  });
}

function collectErrors(page: Page) {
  const errors: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function blockingViolations(page: Page, include?: string) {
  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
  if (include) builder = builder.include(include);
  const results = await builder.analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      violation =>
        `${violation.id} (${violation.impact}): ${violation.nodes
          .slice(0, 3)
          .map(node => node.target.join(' '))
          .join(', ')}`,
    );
}

/** Elements that stick out of the viewport (html and body clip, so scrollWidth hides them). */
async function overflowing(page: Page) {
  return page.evaluate(() => {
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
      .map(element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`);
  });
}

const table = (page: Page) => page.getByRole('table');
const bodyRows = (page: Page) => table(page).locator('tbody tr');
const firstRowName = (page: Page) => bodyRows(page).first().getByRole('rowheader').getByRole('button');

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

test.describe('prerendered pages', () => {
  for (const { url, title, h1, text } of [
    {
      url: '/leaderboard/',
      title: 'AI model leaderboard: Elo from blind votes · DualMind Arena',
      h1: 'blind votes.',
      text: 'How to read',
    },
    {
      url: '/models/',
      title: 'AI models in the Arena · DualMind Arena',
      h1: 'the Arena.',
      text: 'Every model in',
    },
  ]) {
    test(`${url} is prerendered with its SEO tags, enforced CSP and revalidation`, async ({
      request,
    }) => {
      const response = await request.get(url, withCookie);
      expect(response.status()).toBe(200);
      const headers = response.headers();
      expect(headers['content-type']).toContain('text/html');
      expect(headers['cache-control']).toBe('no-cache');
      expect(headers['x-robots-tag']).toBeUndefined();
      const csp = headers['content-security-policy'] ?? '';
      const scriptSrc = csp.split(';').find(part => part.trim().startsWith('script-src')) ?? '';
      expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/]{43}='/);
      expect(scriptSrc).not.toContain('unsafe-inline');
      expect(headers['content-security-policy-report-only']).toBeUndefined();

      const html = await response.text();
      expect(html).toContain(`<title>${title}</title>`);
      expect(html).toContain(`<link rel="canonical" href="https://arena.dualmindlab.tech${url}"/>`);
      expect(html).toContain('property="og:title"');
      expect(html).toContain(`property="og:url" content="https://arena.dualmindlab.tech${url}"`);
      expect(html).toContain('name="twitter:card"');
      expect(html).toContain(h1);
      expect(html).toContain(text);
      expect(html).toContain('<noscript>');
      // The legacy page asked visitors to sign in before it showed any data.
      expect(html).not.toMatch(/login in the main app|Login required/i);
    });
  }

  test('the old static models article is gone', async ({ request }) => {
    const html = await (await request.get('/models/', withCookie)).text();
    expect(html).not.toContain('AI Models Comparison');
  });
});

test.describe('/leaderboard/ (desktop)', () => {
  test('loads the live board without a sign-in and without console errors', async ({ page }) => {
    const errors = collectErrors(page);
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(53);
    const podium = page.getByRole('list', { name: 'Top three models' });
    await expect(podium.getByRole('listitem')).toHaveCount(3);
    await expect(podium.getByRole('listitem').first()).toContainText('llama-3.3-70b-instruct-fp8-fast');
    await expect(page.getByRole('status').filter({ hasText: 'models' })).toContainText('53 models');
    // The leader has 96 battles: provisional, and the page says so.
    await expect(bodyRows(page).first().getByText('Provisional')).toBeVisible();
    await expect(page.getByText(/sign in|log in/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('column headers sort the table and update aria-sort', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(53);
    const rankHeader = page.getByRole('columnheader', { name: 'Rank' });
    const battlesHeader = page.getByRole('columnheader', { name: 'Battles' });
    await expect(rankHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(battlesHeader).toHaveAttribute('aria-sort', 'none');

    await battlesHeader.getByRole('button').click();
    await expect(battlesHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(rankHeader).toHaveAttribute('aria-sort', 'none');
    await expect(firstRowName(page)).toHaveText('llama-3.2-1b-instruct');

    await battlesHeader.getByRole('button').click();
    await expect(battlesHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstRowName(page)).toHaveText('Gemini 2.0 Flash');

    await page.getByRole('columnheader', { name: 'Model' }).getByRole('button').click();
    await expect(page.getByRole('columnheader', { name: 'Model' })).toHaveAttribute(
      'aria-sort',
      'ascending',
    );
    await expect(firstRowName(page)).toHaveText('Compound');
  });

  test('search and the provider filter narrow the board', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(53);

    await page.getByRole('searchbox', { name: 'Search models' }).fill('gemma');
    await expect(bodyRows(page)).toHaveCount(10);
    await expect(page.getByText(/^Showing/)).toHaveText('Showing 10 of 53 models');

    await page.getByRole('button', { name: /^Google/ }).click();
    await expect(bodyRows(page)).toHaveCount(6);
    await expect(page.getByRole('button', { name: /^Google/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('searchbox', { name: 'Search models' }).fill('qwen');
    await expect(page.getByText('No model matches “qwen”.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear the filters' }).click();
    await expect(bodyRows(page)).toHaveCount(53);
  });

  test('a row opens the details sheet with the chart; Esc closes it and focus returns', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await mockStats(page);
    await page.goto('/leaderboard/');
    const name = page.getByRole('button', { name: 'qwq-32b', exact: true });
    await name.focus();
    await page.keyboard.press('Enter');

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('qwq-32b');
    await expect(sheet.getByText('Rank 04 of 53')).toBeVisible();
    await expect(sheet.getByText('-40 on the leader')).toBeVisible();
    await expect(sheet.locator('.recharts-surface')).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'How ratings work' })).toHaveAttribute(
      'href',
      '/how-it-works/#rating',
    );

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(name).toBeFocused();

    // A click anywhere on a row opens it too.
    await bodyRows(page).nth(2).locator('td').last().click();
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText(
      'deepseek-r1-distill-qwen-32b',
    );
    expect(errors).toEqual([]);
  });

  test('the command palette opens a model', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(53);
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await palette.getByRole('combobox').fill('kimi');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText(
      'Kimi K2 Instruct',
    );
  });

  test('an error explains itself and Try again loads the board', async ({ page }) => {
    let mode: Reply = 'error';
    await mockStats(page, () => mode);
    await page.goto('/leaderboard/');
    const alert = page.getByRole('alert').filter({ hasText: 'The leaderboard did not load.' });
    await expect(alert).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole('list', { name: 'Top three models' })).toHaveCount(0);

    mode = 'ok';
    await alert.getByRole('button', { name: /Try again/ }).click();
    await expect(bodyRows(page)).toHaveCount(53);
  });

  test('a failed background refresh keeps the board and says it may be out of date', async ({
    page,
  }) => {
    let mode: Reply = 'ok';
    await mockStats(page, () => mode);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(53);
    mode = 'error';
    await page.getByRole('button', { name: 'Refresh the leaderboard' }).click();
    await expect(page.getByText('These numbers may be out of date.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(bodyRows(page)).toHaveCount(53);
  });

  test('an empty board says so', async ({ page }) => {
    await mockStats(page, () => 'empty');
    await page.goto('/leaderboard/');
    await expect(page.getByText('No model is ranked yet.')).toBeVisible();
  });
});

test.describe('/leaderboard/ (phone)', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true });

  test('shows a card list and opens a drawer', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    const list = page.getByRole('list', { name: 'Models ranked by Elo' });
    await expect(list.getByRole('listitem')).toHaveCount(53);
    await expect(table(page)).toHaveCount(0);

    await page.getByRole('group', { name: 'Sort' }).getByRole('button', { name: 'Battles' }).click();
    await expect(list.getByRole('listitem').first()).toContainText('llama-3.2-1b-instruct');

    const card = list.getByRole('button', { name: 'llama-3.2-1b-instruct' });
    await card.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { level: 2 })).toHaveText('llama-3.2-1b-instruct');
    await page.keyboard.press('Escape');
    await expect(drawer).toBeHidden();
  });
});

test.describe('/models/', () => {
  test('lists every model and opens the shared sheet', async ({ page }) => {
    const errors = collectErrors(page);
    await mockStats(page);
    await page.goto('/models/');
    const grid = page.getByRole('list', { name: 'Models' });
    await expect(grid.getByRole('listitem')).toHaveCount(53);

    await page.getByRole('button', { name: /^Groq/ }).click();
    await expect(grid.getByRole('listitem')).toHaveCount(9);
    await page.getByRole('button', { name: 'A to Z' }).click();
    await expect(grid.getByRole('listitem').first()).toContainText('Compound');

    const card = grid.getByRole('button', { name: 'GPT OSS 120B' });
    await card.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('GPT OSS 120B');
    await expect(sheet.getByRole('link', { name: 'Open the leaderboard' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(card).toBeFocused();
    expect(errors).toEqual([]);
  });
});

test.describe('layout and accessibility', () => {
  for (const url of ['/leaderboard/', '/models/']) {
    test(`${url}: no horizontal overflow at 320 and 360 px`, async ({ page }) => {
      await mockStats(page);
      for (const width of [320, 360]) {
        await page.setViewportSize({ width, height: 780 });
        await page.goto(url);
        await expect(page.locator('[data-model-id]').first()).toBeVisible();
        await settle(page, 400);
        expect(await overflowing(page), `${url} at ${width}px`).toEqual([]);
      }
    });

    for (const theme of ['dark', 'light'] as const) {
      for (const viewport of [
        { name: 'desktop', width: 1440, height: 900 },
        { name: 'mobile', width: 390, height: 844 },
      ]) {
        test(`${url} axe: no serious or critical violations (${theme}, ${viewport.name})`, async ({
          page,
        }) => {
          await mockStats(page);
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await page.emulateMedia({ reducedMotion: 'reduce' });
          await storeTheme(page, theme);
          await page.goto(url);
          await expect(page.locator('[data-model-id]').first()).toBeVisible();
          await settle(page, 500);
          expect(await blockingViolations(page)).toEqual([]);

          // And with the details open (the rest of the page is inert behind it).
          await page.locator('[data-model-id] button[aria-haspopup="dialog"]').first().click();
          await expect(page.getByRole('dialog')).toBeVisible();
          await settle(page, 600);
          expect(await blockingViolations(page, '[role="dialog"]')).toEqual([]);
        });
      }
    }
  }
});

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
] as const;
const modes = [
  { name: 'dark', theme: 'dark', reducedMotion: 'no-preference' },
  { name: 'light', theme: 'light', reducedMotion: 'no-preference' },
  { name: 'reduced-motion', theme: 'dark', reducedMotion: 'reduce' },
] as const;

for (const page of ['leaderboard', 'models'] as const) {
  for (const viewport of viewports) {
    for (const mode of modes) {
      test(`screenshot: ${page} ${viewport.name} ${mode.name}`, async ({ page: tab }) => {
        await mockStats(tab);
        await tab.setViewportSize({ width: viewport.width, height: viewport.height });
        await tab.emulateMedia({ reducedMotion: mode.reducedMotion });
        await storeTheme(tab, mode.theme);
        await tab.goto(`/${page}/`);
        await expect(tab.locator('[data-model-id]').first()).toBeVisible();
        await settle(tab, 2600);
        await tab.screenshot({
          path: shotPath(`${page}-${viewport.name}-${mode.name}-fold`),
          animations: 'disabled',
        });
        await tab.screenshot({
          path: shotPath(`${page}-${viewport.name}-${mode.name}-full`),
          fullPage: true,
          animations: 'disabled',
        });

        if (mode.name === 'reduced-motion') return;
        // The details sheet (desktop) or drawer (phone), on a model with a full record.
        await tab
          .locator('[data-model-id] button[aria-haspopup="dialog"]')
          .filter({ hasText: /^llama-3\.1-70b-instruct$/ })
          .first()
          .click();
        await expect(tab.getByRole('dialog')).toBeVisible();
        await expect(tab.getByRole('dialog').locator('.recharts-surface')).toBeVisible();
        await settle(tab, 1500);
        await tab.screenshot({
          path: shotPath(`${page}-${viewport.name}-${mode.name}-details`),
          animations: 'disabled',
        });
      });
    }
  }
}

test('screenshot: leaderboard podium with the spotlight under the pointer', async ({ page }) => {
  await mockStats(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await storeTheme(page, 'dark');
  await page.goto('/leaderboard/');
  const leader = page.getByRole('list', { name: 'Top three models' }).getByRole('listitem').first();
  await expect(leader).toBeVisible();
  await settle(page, 2000);
  await leader.scrollIntoViewIfNeeded();
  const box = await leader.boundingBox();
  if (box) await page.mouse.move(box.x + box.width * 0.35, box.y + box.height * 0.4);
  await settle(page, 700);
  await leader.screenshot({ path: shotPath('leaderboard-desktop-dark-podium-hover') });
});
