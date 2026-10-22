import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

import { fullPageShot, passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';
import {
  OG_HEIGHT,
  OG_LEADERBOARD_TEMPLATE,
  OG_MODELS_TEMPLATE,
  OG_WIDTH,
} from './og-board-template';

// /leaderboard/ and /models/ through the real Worker, with GET /api/v2/leaderboard answered
// by the recorded live board (53 models, web/tests/fixtures/api/leaderboard-v2.board.json),
// so nothing reaches production. Prerendering, the board, sorting, search and filters, the
// details sheet and drawer, error and empty states, CSP, axe, overflow and the screenshots.

const here = path.dirname(fileURLToPath(import.meta.url));
const BOARD = readFileSync(
  path.join(here, '..', 'fixtures', 'api', 'leaderboard-v2.board.json'),
  'utf8',
);
const STATS = '**/api/v2/leaderboard';

/** The recorded board has 53 models; 49 have the 5 battles that earn a rank (PROVISIONAL_BATTLES). */
const MODELS = 53;
const RATED = 49;
const UNRATED = MODELS - RATED;
const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };

type Reply = 'ok' | 'empty' | 'error';

/** Answers the v2 leaderboard with `reply()` on every request (the board refreshes in the background). */
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
      body:
        mode === 'empty'
          ? '{"items":[],"meta":{"generatedAt":"2026-10-21T18:30:00.000Z","count":0,"provisionalBelow":5,"source":"dualmind-api:model-stats"}}'
          : BOARD,
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
      .map(
        element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
      );
  });
}

const table = (page: Page) => page.getByRole('table');
const bodyRows = (page: Page) => table(page).locator('tbody tr');
const firstRowName = (page: Page) =>
  bodyRows(page).first().getByRole('rowheader').getByRole('button');

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

test.describe('prerendered pages', () => {
  for (const { url, title, h1, text, image } of [
    {
      url: '/leaderboard/',
      title: 'AI model leaderboard: Elo from blind votes · DualMind Arena',
      h1: 'blind votes.',
      text: 'How to read',
      image: 'leaderboard',
    },
    {
      url: '/models/',
      title: 'AI models in the Arena · DualMind Arena',
      h1: 'the Arena.',
      text: 'Every model in',
      image: 'models',
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
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain(
        `property="og:image" content="https://arena.dualmindlab.tech/og/${image}.png"`,
      );
      expect(html).toContain('name="twitter:image"');
      expect(html).toContain(h1);
      expect(html).toContain(text);
      expect(html).toContain('<noscript>');
      // The legacy page asked visitors to sign in before it showed any data.
      expect(html).not.toMatch(/login in the main app|Login required/i);
    });
  }

  for (const image of ['leaderboard', 'models']) {
    test(`/og/${image}.png is served as a PNG`, async ({ request }) => {
      const response = await request.get(`/og/${image}.png`, withCookie);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toBe('image/png');
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
    await expect(bodyRows(page)).toHaveCount(RATED);
    const podium = page.getByRole('list', { name: 'Top three models' });
    await expect(podium.getByRole('listitem')).toHaveCount(3);
    // The API's own leader has 96 battles, enough to be rated, so it leads the podium.
    await expect(podium.getByRole('listitem').first()).toContainText('Llama 3.3 70B Instruct');
    await expect(podium.getByRole('listitem').first()).toContainText('via Cloudflare Workers AI');
    await expect(page.getByRole('status').filter({ hasText: 'models' })).toContainText(
      `${MODELS} models`,
    );
    // The rest are in their own group, collapsed, without rank numbers.
    await expect(page.getByRole('heading', { name: 'Not yet rated' })).toBeVisible();
    await expect(page.getByRole('button', { name: `Show ${UNRATED} models` })).toBeVisible();
    // The legacy page asked for a sign-in first; this one only has the header's Sign in link.
    await expect(page.getByText(/login in the main app|login required/i)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test('no raw model id is a primary label; the id is in the tooltip and the details', async ({
    page,
  }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(RATED);
    const labels = await page.locator('tbody th button').allTextContents();
    expect(labels).toHaveLength(RATED);
    for (const label of labels) {
      expect(label).not.toMatch(/[@/]/);
      expect(label).toMatch(/[A-Z]/);
    }
    await expect(firstRowName(page)).toHaveAttribute(
      'title',
      '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    );
  });

  test('models below 5 battles sit in a collapsed "Not yet rated" group without ranks', async ({
    page,
  }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(RATED);
    await expect(table(page)).toHaveCount(1);

    await page.getByRole('button', { name: `Show ${UNRATED} models` }).click();
    await expect(table(page)).toHaveCount(2);
    const unrated = table(page).nth(1);
    await expect(unrated.locator('tbody tr')).toHaveCount(UNRATED);
    await expect(unrated.getByRole('columnheader', { name: 'Rank' })).toHaveCount(0);
    await expect(unrated.locator('tbody th button').first()).toHaveText('Gemma 3n E4B IT');
    await expect(page.getByRole('button', { name: `Hide ${UNRATED} models` })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  });

  test('column headers sort the table and update aria-sort', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(RATED);
    const rankHeader = page.getByRole('columnheader', { name: 'Rank' });
    const battlesHeader = page.getByRole('columnheader', { name: 'Battles' });
    await expect(rankHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(battlesHeader).toHaveAttribute('aria-sort', 'none');

    await battlesHeader.getByRole('button').click();
    await expect(battlesHeader).toHaveAttribute('aria-sort', 'descending');
    await expect(rankHeader).toHaveAttribute('aria-sort', 'none');
    await expect(firstRowName(page)).toHaveText('Llama 3.2 1B Instruct');

    await battlesHeader.getByRole('button').click();
    await expect(battlesHeader).toHaveAttribute('aria-sort', 'ascending');
    await expect(firstRowName(page)).toHaveText('Gemma 3n E2B IT');

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
    await expect(bodyRows(page)).toHaveCount(RATED);

    // Ten Gemma builds, eight rated and two not yet: a search opens the unrated group by itself.
    await page.getByRole('searchbox', { name: 'Search models' }).fill('gemma');
    await expect(bodyRows(page)).toHaveCount(10);
    await expect(page.getByText(/^Showing/)).toHaveText(`Showing 10 of ${MODELS} models`);

    // Google made nine of them (the SEA-LION build is AI Singapore's).
    await page.getByRole('button', { name: /^Google/ }).click();
    await expect(bodyRows(page)).toHaveCount(9);
    await expect(page.getByRole('button', { name: /^Google/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.getByRole('searchbox', { name: 'Search models' }).fill('qwen');
    await expect(page.getByText('No model matches “qwen”.')).toBeVisible();
    await page.getByRole('button', { name: 'Clear the filters' }).click();
    await expect(bodyRows(page)).toHaveCount(RATED);
  });

  test('a row opens the details sheet with the chart; Esc closes it and focus returns', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await mockStats(page);
    await page.goto('/leaderboard/');
    // The podium names the top three too, so look for the name inside the table.
    const name = table(page).getByRole('button', { name: 'Qwen QwQ 32B', exact: true });
    await name.focus();
    await page.keyboard.press('Enter');

    const sheet = page.getByRole('dialog');
    await expect(sheet).toBeVisible();
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('Qwen QwQ 32B');
    // The raw id stays in the details, and the maker comes with the platform that serves it.
    await expect(sheet.getByText('@cf/qwen/qwq-32b')).toBeVisible();
    await expect(sheet.getByText('Alibaba Qwen')).toBeVisible();
    await expect(sheet.getByText('via Cloudflare Workers AI')).toBeVisible();
    await expect(sheet.getByText(`Rank 04 of ${RATED}`)).toBeVisible();
    await expect(sheet.getByText('-40 on the leader')).toBeVisible();
    await expect(sheet.locator('.recharts-surface')).toBeVisible();
    await expect(sheet.getByRole('link', { name: 'How ratings work' })).toHaveAttribute(
      'href',
      '/how-it-works/#rating',
    );

    await page.keyboard.press('Escape');
    await expect(sheet).toBeHidden();
    await expect(name).toBeFocused();

    // A click anywhere on a row opens it too (the name's button covers the whole row).
    const cell = bodyRows(page).nth(1).locator('td').last();
    const box = await cell.boundingBox();
    expect(box).not.toBeNull();
    if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText(
      'Llama 3.1 70B Instruct',
    );
    expect(errors).toEqual([]);
  });

  test('the command palette opens a model', async ({ page }) => {
    await mockStats(page);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(RATED);
    await page.keyboard.press('Control+K');
    const palette = page.getByRole('dialog', { name: 'Command palette' });
    await expect(palette).toBeVisible();
    await palette.getByRole('combobox').fill('kimi');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog').getByRole('heading', { level: 2 })).toHaveText(
      'Kimi K2 Instruct (0905)',
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
    await expect(bodyRows(page)).toHaveCount(RATED);
  });

  test('a failed background refresh keeps the board and says it may be out of date', async ({
    page,
  }) => {
    let mode: Reply = 'ok';
    await mockStats(page, () => mode);
    await page.goto('/leaderboard/');
    await expect(bodyRows(page)).toHaveCount(RATED);
    mode = 'error';
    await page.getByRole('button', { name: 'Refresh the leaderboard' }).click();
    await expect(page.getByText('These numbers may be out of date.')).toBeVisible({
      timeout: 15_000,
    });
    await expect(bodyRows(page)).toHaveCount(RATED);
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
    await expect(list.getByRole('listitem')).toHaveCount(RATED);
    await expect(table(page)).toHaveCount(0);

    await page
      .getByRole('group', { name: 'Sort' })
      .getByRole('button', { name: 'Battles' })
      .click();
    await expect(list.getByRole('listitem').first()).toContainText('Llama 3.2 1B Instruct');

    const card = list.getByRole('button', { name: 'Llama 3.2 1B Instruct' });
    await card.click();
    const drawer = page.getByRole('dialog');
    await expect(drawer).toBeVisible();
    await expect(drawer.getByRole('heading', { level: 2 })).toHaveText('Llama 3.2 1B Instruct');
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
    await expect(grid.getByRole('listitem')).toHaveCount(MODELS);

    // Models are grouped by who made them: OpenAI's two open-weight models, served by Groq.
    await page.getByRole('button', { name: /^OpenAI/ }).click();
    await expect(grid.getByRole('listitem')).toHaveCount(2);
    await expect(grid.getByRole('listitem').first()).toContainText('via Groq');
    await page.getByRole('button', { name: 'A to Z' }).click();
    await expect(grid.getByRole('listitem').first()).toContainText('GPT OSS 20B');

    const card = grid.getByRole('button', { name: 'GPT OSS 120B' });
    await expect(card).toHaveAttribute('title', 'openai/gpt-oss-120b');
    await card.click();
    const sheet = page.getByRole('dialog');
    await expect(sheet.getByRole('heading', { level: 2 })).toHaveText('GPT OSS 120B');
    await expect(sheet.getByRole('link', { name: 'See the leaderboard' })).toBeVisible();
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
        await settle(tab, 3000);
        await tab.screenshot({
          path: shotPath(`${page}-${viewport.name}-${mode.name}-fold`),
          animations: 'disabled',
        });
        await fullPageShot(tab, {
          path: shotPath(`${page}-${viewport.name}-${mode.name}-full`),
          fullPage: true,
          animations: 'disabled',
        });

        if (mode.name === 'reduced-motion') return;
        // The details sheet (desktop) or drawer (phone), on a model with a full record.
        await tab
          .locator('[data-model-id] button[aria-haspopup="dialog"]')
          .filter({ hasText: /^Llama 3\.1 70B Instruct$/ })
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

test.describe('models without a rank on the models page', () => {
  test('cards show "Not yet rated" instead of a rank', async ({ page }) => {
    await mockStats(page);
    await page.goto('/models/');
    await expect(page.locator('[data-model-id]').first()).toBeVisible();
    await expect(page.locator('[data-model-id]').locator('[data-unrated]')).toHaveCount(UNRATED);
    const top = page.locator('[data-model-id]').filter({ hasText: 'Llama 3.1 70B Instruct' });
    await expect(top.first()).toContainText('#02');
  });
});

for (const card of [
  { name: 'leaderboard', url: '/leaderboard/', template: OG_LEADERBOARD_TEMPLATE },
  { name: 'models', url: '/models/', template: OG_MODELS_TEMPLATE },
]) {
  test(`render the Open Graph image (og-${card.name}.png)`, async ({ page }) => {
    await page.setViewportSize({ width: OG_WIDTH, height: OG_HEIGHT });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: 'dark' });
    await storeTheme(page, 'dark');
    await mockStats(page);
    await page.goto(card.url);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.evaluate(() => document.fonts.ready);
    // A fixed layer on top of the page: React keeps the page underneath, the card uses its
    // fonts and tokens (same method as og-landing.png and og-share.png).
    await page.evaluate(template => {
      const layer = document.createElement('div');
      layer.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647';
      layer.innerHTML = template;
      document.body.append(layer);
    }, card.template);
    await page.evaluate(async () => {
      await document.fonts.load('italic 400 70px "Playfair Display"');
      await document.fonts.load('800 21px "Bricolage Grotesque Variable"');
      await document.fonts.load('300 66px "Bricolage Grotesque Variable"');
      await document.fonts.load('500 15px "DM Mono"');
      await document.fonts.ready;
    });
    await page.waitForTimeout(300);
    await page.locator('#og-card').screenshot({ path: shotPath(`og-${card.name}`) });
  });
}
