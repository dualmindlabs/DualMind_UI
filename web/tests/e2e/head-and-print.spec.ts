import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Page, test } from '@playwright/test';

import { passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';

// The document head of every page (link-preview tags, icons, the web app manifest) and printing
// outside the legal pages (the shared battle and the leaderboard). Audit follow-up of 22 Oct
// (docs/redesign/ui-audit.md, "Status after 22 Oct").

const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };
const SITE = 'https://arena.dualmindlab.tech';
const here = path.dirname(fileURLToPath(import.meta.url));

interface SharedFixtures {
  ids: { public: string };
  threads: Record<string, { thread: Record<string, unknown>; messages: unknown[] } | undefined>;
}
const shared = JSON.parse(
  readFileSync(path.join(here, '..', 'fixtures', 'api', 'share-threads.json'), 'utf8'),
) as SharedFixtures;

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

/** Every attribute of every tag of one name in an HTML string, in document order. */
function tags(html: string, name: 'meta' | 'link'): Array<Record<string, string>> {
  return [...html.matchAll(new RegExp(`<${name}\\s([^>]*?)/?>`, 'g'))].map(match => {
    const attributes: Record<string, string> = {};
    for (const [, key, value] of (match[1] ?? '').matchAll(/([a-zA-Z:-]+)="([^"]*)"/g)) {
      attributes[key ?? ''] = value ?? '';
    }
    return attributes;
  });
}

function metaValues(html: string, attribute: 'name' | 'property', key: string): string[] {
  const matching = tags(html, 'meta').filter(tag => tag[attribute] === key);
  return matching.map(tag => tag.content ?? '');
}

/** Width and height from a PNG's header (the IHDR chunk). */
function pngSize(body: Buffer): { width: number; height: number } {
  expect(body.subarray(1, 4).toString('latin1')).toBe('PNG');
  return { width: body.readUInt32BE(16), height: body.readUInt32BE(20) };
}

// Every prerendered page. /404 is left out on purpose: it is never indexed or shared.
const PRERENDERED = [
  '/',
  '/leaderboard/',
  '/models/',
  '/about/',
  '/credits/',
  '/how-it-works/',
  '/faq/',
  '/privacy/',
  '/terms/',
  '/cookies/',
  '/login/',
  '/signup/',
  '/forgot-password/',
  '/developers/',
  '/design/',
] as const;

test.describe('document head', () => {
  for (const url of PRERENDERED) {
    test(`${url}: share card, large Twitter card, locale, icons and the manifest`, async ({
      request,
    }) => {
      const response = await request.get(url, withCookie);
      expect(response.status()).toBe(200);
      const html = await response.text();

      expect(html).toContain(`<link rel="canonical" href="${SITE}${url}"`);
      expect(metaValues(html, 'property', 'og:title')).toHaveLength(1);
      expect(metaValues(html, 'property', 'og:description')).toHaveLength(1);
      expect(metaValues(html, 'property', 'og:locale')).toEqual(['en_US']);
      expect(metaValues(html, 'name', 'twitter:card')).toEqual(['summary_large_image']);
      const images = metaValues(html, 'property', 'og:image');
      expect(images).toHaveLength(1);
      expect(images[0]).toMatch(new RegExp(`^${SITE}/(og/[a-z-]+|og-default)\\.png$`));
      expect(metaValues(html, 'property', 'og:image:alt')[0]?.length ?? 0).toBeGreaterThan(10);
      expect(metaValues(html, 'name', 'twitter:image')).toEqual(images);

      // The card itself is served (from this server, at the same path).
      const card = await request.get(new URL(images[0] ?? '').pathname, withCookie);
      expect(card.status()).toBe(200);
      expect(pngSize(await card.body())).toEqual({ width: 1200, height: 630 });

      const links = tags(html, 'link');
      expect(links).toContainEqual({ rel: 'icon', href: '/favicon.ico', sizes: '32x32' });
      expect(links).toContainEqual({ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' });
      expect(links).toContainEqual({ rel: 'apple-touch-icon', href: '/apple-touch-icon.png' });
      expect(links).toContainEqual({
        rel: 'manifest',
        href: '/site.webmanifest',
        crossorigin: 'use-credentials',
      });
      expect(metaValues(html, 'name', 'application-name')).toEqual(['DualMind Arena']);
      expect(metaValues(html, 'name', 'apple-mobile-web-app-title')).toEqual(['DualMind']);
    });
  }

  for (const url of ['/update-password.html', '/auth-callback.html']) {
    test(`${url} (client-only): the same share card and locale once it renders`, async ({
      page,
    }) => {
      await page.goto(url);
      await expect(page.locator('meta[property="og:image"]')).toHaveAttribute(
        'content',
        `${SITE}/og-default.png`,
      );
      await expect(page.locator('meta[property="og:locale"]')).toHaveAttribute('content', 'en_US');
      await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute(
        'content',
        'summary_large_image',
      );
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
        'content',
        'noindex, nofollow',
      );
    });
  }
});

test.describe('icons and the web app manifest', () => {
  test('the manifest names the app and lists icons that load at their stated sizes', async ({
    request,
  }) => {
    const response = await request.get('/site.webmanifest', withCookie);
    expect(response.status()).toBe(200);
    const manifest = (await response.json()) as {
      name: string;
      short_name: string;
      description: string;
      start_url: string;
      display: string;
      background_color: string;
      theme_color: string;
      icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
    };
    expect(manifest.name).toBe('DualMind Arena');
    expect(manifest.short_name).toBe('DualMind');
    expect(manifest.description).toBe('Blind battles between AI models, ranked by votes.');
    expect(manifest.start_url).toBe('/');
    expect(manifest.display).toBe('standalone');
    expect(manifest.background_color).toBe('#0B0D10');
    expect(manifest.theme_color).toBe('#0B0D10');

    const purposes = manifest.icons.map(icon => `${icon.sizes} ${icon.purpose}`);
    expect(purposes).toEqual(
      expect.arrayContaining(['192x192 any', '512x512 any', '512x512 maskable']),
    );
    for (const icon of manifest.icons) {
      const file = await request.get(icon.src, withCookie);
      expect(file.status(), icon.src).toBe(200);
      expect(file.headers()['content-type'], icon.src).toContain(icon.type);
      if (icon.type === 'image/png') {
        const [width, height] = icon.sizes.split('x').map(Number);
        expect(pngSize(await file.body()), icon.src).toEqual({ width, height });
      }
    }
  });

  test('favicon.ico and the Apple touch icon are served', async ({ request }) => {
    const ico = await request.get('/favicon.ico', withCookie);
    expect(ico.status()).toBe(200);
    // ICONDIR: reserved 0, type 1 (icon), then the number of images (32 and 16 px).
    const body = await ico.body();
    expect([body.readUInt16LE(0), body.readUInt16LE(2), body.readUInt16LE(4)]).toEqual([0, 1, 2]);

    const touch = await request.get('/apple-touch-icon.png', withCookie);
    expect(touch.status()).toBe(200);
    expect(pngSize(await touch.body())).toEqual({ width: 180, height: 180 });
  });

  test('Chrome reads the manifest without errors (it is fetched with the preview cookie)', async ({
    page,
  }) => {
    await page.goto('/leaderboard/');
    const cdp = await page.context().newCDPSession(page);
    const manifest = await cdp.send('Page.getAppManifest');
    expect(manifest.url).toMatch(/\/site\.webmanifest$/);
    expect(manifest.errors).toEqual([]);
    const data = JSON.parse(manifest.data ?? '{}') as { name?: string };
    expect(data.name).toBe('DualMind Arena');

    // Installability: private browsing contexts and the missing service worker are expected in
    // a test browser; nothing may be wrong with the manifest or its icons.
    const { installabilityErrors } = await cdp.send('Page.getInstallabilityErrors');
    const ids = installabilityErrors.map(error => error.errorId);
    console.log(`Installability notes: ${ids.join(', ') || 'none'}`);
    expect(ids.filter(id => /manifest|icon|start-url|display|name/.test(id))).toEqual([]);
    await cdp.detach();
  });
});

/** The public thread API for a signed-out visitor (tests/fixtures/api/share-threads.json). */
async function mockSharedApi(page: Page) {
  await page.route('**/api/threads/**', async route => {
    const pathname = new URL(route.request().url()).pathname;
    const match = /\/api\/threads\/([^/]+)(\/messages)?$/.exec(pathname);
    const entry = shared.threads[decodeURIComponent(match?.[1] ?? '')];
    if (!entry) {
      return route.fulfill({ status: 404, contentType: 'application/json', body: '{}' });
    }
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(match?.[2] ? { items: entry.messages } : entry.thread),
    });
  });
}

async function expectNoSiteChrome(page: Page) {
  await expect(page.getByRole('banner')).toBeHidden();
  await expect(page.getByRole('contentinfo')).toBeHidden();
  await expect(page.locator('[data-slot="site-header"]:visible')).toHaveCount(0);
  await expect(page.locator('[data-slot="site-footer"]:visible')).toHaveCount(0);
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
    'rgb(255, 255, 255)',
  );
}

test.describe('print', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`a shared battle prints its transcript and address, no chrome (${theme})`, async ({
      page,
    }) => {
      await storeTheme(page, theme);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await mockSharedApi(page);
      const id = shared.ids.public;
      await page.goto(`/share/${id}`);
      await expect(page.getByTestId('turn')).toHaveCount(2);
      await settle(page, 400);

      await expect(page.getByTestId('share-print-url')).toBeHidden();
      await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
      await expectNoSiteChrome(page);
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      await expect(page.getByTestId('turn').first()).toBeVisible();
      await expect(page.getByRole('button', { name: 'Copy link' })).toBeHidden();
      await expect(page.getByRole('heading', { name: /Your prompt\./ })).toBeHidden();
      const address = page.getByTestId('share-print-url');
      await expect(address).toBeVisible();
      await expect(address).toHaveText(new RegExp(`/share/${id}$`));
      // Dark or light on screen, paper is light, code colours included.
      await expect(page.locator('html')).toHaveCSS('color-scheme', 'light');
      const inks = await page.evaluate(() => {
        const style = getComputedStyle(document.documentElement);
        return ['--mind-b-text', '--ok', '--warn', '--bad'].map(name =>
          style.getPropertyValue(name).trim().toLowerCase(),
        );
      });
      expect(inks).toEqual(['#974822', '#17704a', '#855400', '#b3261e']);
      await page.screenshot({ path: shotPath(`print-share-from-${theme}`), fullPage: true });
    });
  }

  test('the leaderboard prints without the site header and footer', async ({ page }) => {
    await storeTheme(page, 'dark');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/leaderboard/');
    await expect(page.locator('main')).toContainText('Full rankings');
    await settle(page, 600);
    await page.emulateMedia({ media: 'print', reducedMotion: 'reduce' });
    await expectNoSiteChrome(page);
    await page.screenshot({ path: shotPath('print-leaderboard-from-dark') });
  });
});
