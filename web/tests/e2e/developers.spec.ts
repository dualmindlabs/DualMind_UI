import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';

// The API docs surfaces (BE-5) in Chromium, through the real Worker: the prerendered /developers/
// reference, the OpenAPI document, /leaderboard.md, /llms.txt and the problem pages. The fake
// backend of serve-dist.mjs answers the leaderboard request with the recorded board.

const here = path.dirname(fileURLToPath(import.meta.url));
const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };
const PAGE = '/developers/';

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

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
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

async function overflowing(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const clipped = (element: Element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) return false;
        const { overflowX } = getComputedStyle(parent);
        if (overflowX === 'hidden' || overflowX === 'clip' || overflowX === 'auto') return true;
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

test.describe(PAGE, () => {
  test('is prerendered HTML with its SEO tags and the reference content', async ({ request }) => {
    const response = await request.get(PAGE, withCookie);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/html');
    const html = await response.text();
    expect(html).toContain('<title>API reference · DualMind Arena</title>');
    expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
    expect(html).toMatch(/<meta name="robots" content="index, follow"\/?>/);
    expect(html).toContain('<link rel="canonical" href="https://arena.dualmindlab.tech/developers/"');
    expect(html).toContain('/api/v2/leaderboard');
    expect(html).toContain('rate_limited');
    expect(html).toContain('class="human-voice');
  });

  test('shows the reference with JavaScript blocked', async ({ page }) => {
    await page.route('**/assets/*.js', route => route.abort());
    await page.goto(PAGE);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('The Arena API, in the open.');
    await expect(page.getByRole('heading', { level: 3, name: /GET\s*\/api\/v2\/leaderboard/ })).toBeVisible();
    await expect(page.getByRole('region', { name: 'Problem types' })).toBeVisible();
  });

  test('loads without console or CSP errors and hydrates', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(PAGE);
    await settle(page, 600);
    await page
      .getByRole('banner')
      .getByRole('button', { name: /^Search/ })
      .first()
      .click();
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });

  test('the page navigation jumps to a section', async ({ page }) => {
    await page.goto(`${PAGE}#problems`);
    await settle(page, 400);
    await expect(page.locator('#problems-title')).toBeInViewport();
  });

  test('links to the OpenAPI document, the problem pages and the Markdown leaderboard', async ({
    page,
  }) => {
    await page.goto(PAGE);
    const main = page.locator('main');
    for (const href of ['/api/v2/openapi.json', '/problems/rate_limited', '/leaderboard.md', '/llms.txt']) {
      const link = main.locator(`a[href="${href}"]`).first();
      await expect(link).toBeAttached();
      const response = await page.request.get(href);
      expect(response.status(), href).toBe(200);
    }
  });

  test('the footer links to it and the sitemap lists it', async ({ page, request }) => {
    await page.goto('/about/');
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'API', exact: true }),
    ).toHaveAttribute('href', PAGE);
    const xml = await (await request.get('/sitemap.xml', withCookie)).text();
    expect(xml).toContain('<loc>https://arena.dualmindlab.tech/developers/</loc>');
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe: no serious or critical violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await storeTheme(page, theme);
      await page.goto(PAGE);
      await settle(page, 500);
      expect(await blockingViolations(page)).toEqual([]);
    });
  }

  test('no horizontal overflow at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto(PAGE);
    await settle(page, 400);
    expect(await overflowing(page)).toEqual([]);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'phone', width: 390, height: 844 },
  ]) {
    for (const theme of ['dark', 'light'] as const) {
      test(`screenshot: ${viewport.name} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await page.goto(PAGE);
        await settle(page);
        await page.screenshot({
          path: shotPath(`developers-${viewport.name}-${theme}-fold`),
          animations: 'disabled',
        });
        await page.screenshot({
          path: shotPath(`developers-${viewport.name}-${theme}-full`),
          fullPage: true,
          animations: 'disabled',
        });
      });
    }
  }
});

test.describe('the machine-readable routes', () => {
  test('/api/v2/openapi.json is the committed document, with an ETag', async ({ request }) => {
    const response = await request.get('/api/v2/openapi.json', withCookie);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    expect(response.headers()['etag']).toMatch(/^"oa-[0-9a-f]{16}"$/);
    const committed = JSON.parse(
      readFileSync(path.join(here, '..', '..', '..', 'docs', 'api', 'openapi.v2.json'), 'utf8'),
    ) as unknown;
    expect(await response.json()).toEqual(committed);
    const again = await request.get('/api/v2/openapi.json', {
      ...withCookie,
      headers: { ...withCookie.headers, 'If-None-Match': response.headers()['etag'] ?? '' },
    });
    expect(again.status()).toBe(304);
  });

  test('/llms.txt indexes the other entry points', async ({ request }) => {
    const response = await request.get('/llms.txt', withCookie);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/plain');
    const text = await response.text();
    expect(text).toContain('# DualMind Arena');
    expect(text).toContain('/leaderboard.md');
    expect(text).toContain('/developers/');
  });

  test('/problems/<slug> explains a problem type, and an unknown slug is a 404 problem', async ({
    request,
  }) => {
    const page = await request.get('/problems/rate_limited', withCookie);
    expect(page.status()).toBe(200);
    expect(page.headers()['content-type']).toContain('text/markdown');
    expect(await page.text()).toContain('# rate_limited (HTTP 429)');
    const missing = await request.get('/problems/nope', withCookie);
    expect(missing.status()).toBe(404);
    expect(missing.headers()['content-type']).toContain('application/problem+json');
  });

  test('/leaderboard.md is the board as a Markdown table', async ({ request }) => {
    const response = await request.get('/leaderboard.md', withCookie);
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('text/markdown');
    expect(response.headers()['etag']).toMatch(/^"lbmd-[0-9a-f]{16}"$/);
    const text = await response.text();
    expect(text).toContain('# DualMind Arena leaderboard');
    expect(text).toContain('| Rank | Model | Provider | Elo | Win rate | Battles | Status |');
    expect(text).toMatch(/\n\| 1 \| .+ \| .+ \| \d+\.\d \| \d+\.\d\d% \| \d+ \|/);
  });
});
