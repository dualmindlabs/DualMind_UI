import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';
import { OG_HEIGHT, OG_TEMPLATE, OG_WIDTH } from './og-template';

// The landing page at / (slice S3) in Chromium, through the real Worker: prerendered content,
// SEO tags, the enforced CSP, the live strip (the local fake backend answers the leaderboard with
// a recorded response; failures are mocked here), the recorded demo with the keyboard, the
// signed-in hand-off to the legacy arena, axe, overflow, and the review screenshots.

const HEADLINE = /Two models\. One prompt\.\s*You decide\./;
const STATS = '**/api/arena/model-stats';

test.beforeEach(async ({ context, baseURL }) => {
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
});

function collectProblems(page: Page) {
  const problems: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', error => problems.push(`pageerror: ${error.message}`));
  return problems;
}

/** Scrolls through the whole page so every in-view effect and the demo play, then back up. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.round(window.innerHeight * 0.6);
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 220));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
}

const demo = (page: Page) => page.getByTestId('demo-battle');

test('/ is prerendered: headline, demo answers, SEO tags and the hand-off script in the HTML', async ({
  request,
}) => {
  const response = await request.get('/', { headers: { Cookie: PREVIEW_COOKIE } });
  expect(response.status()).toBe(200);
  const headers = response.headers();
  expect(headers['x-robots-tag']).toBeUndefined();
  expect(headers['cache-control']).toBe('no-cache');
  const scriptSrc =
    (headers['content-security-policy'] ?? '')
      .split(';')
      .find(part => part.trim().startsWith('script-src')) ?? '';
  expect(scriptSrc).toMatch(/'sha256-[A-Za-z0-9+/]{43}='/);
  expect(scriptSrc).not.toContain('unsafe-inline');

  const html = await response.text();
  const head = html.slice(0, html.indexOf('<body'));
  expect(html).toContain('<title>DualMind Arena: blind battles between AI models</title>');
  expect(head).toMatch(/<meta name="description" content="Ask one prompt, compare two anonymous/);
  expect(head).toContain('<link rel="canonical" href="https://arena.dualmindlab.tech/"');
  expect(head).toContain(
    'property="og:image" content="https://arena.dualmindlab.tech/og/landing.png"',
  );
  expect(head).toContain('name="twitter:card" content="summary_large_image"');
  expect(head).toContain('"@type":"WebSite"');
  expect(head).toContain('"@type":"Organization"');
  expect(head).not.toMatch(/name="robots" content="noindex/);
  // The hand-off runs in <head>, before the theme script and before anything is painted.
  expect(head.indexOf('legacy-app.html')).toBeGreaterThan(-1);
  expect(head.indexOf('legacy-app.html')).toBeLessThan(head.indexOf('dm.theme'));
  // Readable without JavaScript: the headline and both demo answers are in the HTML.
  expect(html).toContain('Two models. One prompt.');
  expect(html).toContain('You decide.');
  expect(html).toContain('Recorded demo, answers written for illustration');
  expect(html).toContain('Test questions leak into training data');

  const og = await request.get('/og/landing.png', { headers: { Cookie: PREVIEW_COOKIE } });
  expect(og.status()).toBe(200);
  expect(og.headers()['content-type']).toBe('image/png');
});

test('without JavaScript the hero and the demo are visible', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  await passGate(context, baseURL ?? 'http://127.0.0.1:8787');
  const page = await context.newPage();
  await page.goto('/');
  const heading = page.getByRole('heading', { level: 1, name: HEADLINE });
  await expect(heading).toBeVisible();
  await page.waitForTimeout(2200);
  // The CSS entrance has finished without JavaScript: every word is opaque.
  const words = heading.locator('[aria-hidden="true"] > span > span');
  expect(await words.count()).toBeGreaterThan(4);
  for (let index = 0; index < (await words.count()); index += 1) {
    await expect(words.nth(index)).toHaveCSS('opacity', '1');
  }
  await expect(page.getByTestId('demo-text-a')).toContainText('benchmarks');
  await context.close();
});

test('no console errors or CSP violations while the whole page runs', async ({ page }) => {
  const problems = collectProblems(page);
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      console.error(`CSP violation: ${event.violatedDirective} ${event.blockedURI}`);
    });
  });
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
  await expect(page.getByTestId('live-strip')).toHaveAttribute('data-state', 'ready');
  await scrollThrough(page);
  await expect(demo(page)).toHaveAttribute('data-phase', /voting|revealed/);
  expect(problems).toEqual([]);
});

test('the live strip shows the leaderboard numbers and the #1', async ({ page }) => {
  await page.goto('/');
  const strip = page.getByTestId('live-strip');
  await expect(strip).toHaveAttribute('data-state', 'ready');
  await expect(strip).toContainText('llama-3.3-70b-instruct-fp8-fast');
  await expect(strip).toContainText('1150 Elo · Cloudflare');
  await expect(strip).toContainText('Live from the public leaderboard');
  await expect(page.getByTestId('model-strip-source')).toHaveText('Live · 53 models');
});

for (const failure of ['server error', 'network error'] as const) {
  test(`the live strip falls back honestly on a ${failure}`, async ({ page }) => {
    await page.route(STATS, route =>
      failure === 'server error'
        ? route.fulfill({ status: 500, contentType: 'application/json', body: '{"success":false}' })
        : route.abort('failed'),
    );
    await page.goto('/');
    const strip = page.getByTestId('live-strip');
    await expect(strip).toHaveAttribute('data-state', 'error', { timeout: 15_000 });
    await expect(strip).toContainText('Live numbers are unavailable right now.');
    await expect(strip.getByRole('link', { name: 'Open the leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard/',
    );
    for (const value of await strip.locator('dd').allTextContents()) {
      expect(value).not.toMatch(/\d/);
    }
    await expect(page.getByTestId('leaderboard-preview')).toContainText(
      'The live leaderboard is not answering right now.',
    );
  });
}

test('demo battle: the full keyboard flow with announcements', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
  const region = demo(page);
  await region.scrollIntoViewIfNeeded();
  await expect(region).toHaveAttribute('data-run', '1');
  await expect(region).toHaveAttribute('data-phase', 'voting', { timeout: 5_000 });
  const announcer = page.getByTestId('demo-announcer');
  await expect(announcer).toHaveAttribute('aria-live', 'polite');
  await expect(announcer).toContainText('Both answers are ready');

  await region.focus();
  await page.keyboard.press('1');
  await expect(region).toHaveAttribute('data-phase', 'revealed');
  await expect(announcer).toContainText('You voted: A is better.');
  await expect(announcer).toContainText('Answer B: Answered the question.');
  await expect(page.getByTestId('demo-pane-a')).toContainText('Your pick');
  await expect(page.getByTestId('demo-pane-b')).toContainText('Answered the question');
  const next = region.getByRole('button', { name: 'Next prompt' });
  await expect(next).toBeFocused();

  await page.keyboard.press('Enter');
  await expect(page.getByTestId('demo-prompt')).toHaveText('Explain quantum entanglement simply');
  await expect(announcer).toContainText('Prompt 2 of 3');
  await expect(
    region.getByRole('group', { name: 'Your verdict' }).getByRole('button').first(),
  ).toBeFocused();
  await expect(region).toHaveAttribute('data-phase', 'voting', { timeout: 5_000 });
  await page.keyboard.press('4');
  await expect(announcer).toContainText('You voted: Both are bad.');
});

test('a prompt from the hero plays the recorded demo and offers the sign-in', async ({ page }) => {
  await page.goto('/');
  const field = page.getByRole('textbox', { name: 'Ask both models' });
  await field.fill('Write a sonnet about tabs and spaces');
  await field.press('Enter');
  const region = demo(page);
  await expect(region).toBeFocused();
  await expect(region).toBeInViewport();
  await expect(page.getByTestId('asked-note')).toContainText(
    'Write a sonnet about tabs and spaces',
  );
  await expect(
    page.getByTestId('asked-note').getByRole('link', { name: 'Sign in to battle real models' }),
  ).toHaveAttribute('href', '/login/');
  await expect(page.getByText('Playing a recorded demo below.')).toBeVisible();
});

test.describe('signed-in hand-off', () => {
  // The legacy app's own scripts would redirect a fake session to the login page; keep them
  // out so the test sees where the hand-off lands.
  test.beforeEach(async ({ page }) => {
    await page.route(/\/(config\.js|js\/.*)$/, route => route.abort());
  });

  test('a stored legacy session goes to the legacy arena, query and hash kept', async ({
    page,
  }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem('dualmind.auth.supabase', '{"access_token":"t"}'),
    );
    await page.goto('/?ref=e2e#battle', { waitUntil: 'commit' });
    await page.waitForURL(/\/legacy-app/);
    const url = new URL(page.url());
    expect(url.pathname).toMatch(/^\/legacy-app(\.html)?$/);
    expect(url.search).toBe('?ref=e2e');
    expect(url.hash).toBe('#battle');
    await expect(page).toHaveTitle('DualMind - Battle Arena');
  });

  test('a supabase-js session key hands off too', async ({ page }) => {
    await page.addInitScript(() =>
      window.localStorage.setItem('sb-projectref-auth-token', '{"access_token":"t"}'),
    );
    await page.goto('/', { waitUntil: 'commit' });
    await page.waitForURL(/\/legacy-app/);
  });

  test('an OAuth return keeps its tokens in the hash for the legacy client', async ({ page }) => {
    await page.goto('/#access_token=abc&refresh_token=def&type=recovery', { waitUntil: 'commit' });
    await page.waitForURL(/\/legacy-app/);
    expect(new URL(page.url()).hash).toBe('#access_token=abc&refresh_token=def&type=recovery');
  });

  test('a PKCE return keeps its code', async ({ page }) => {
    await page.goto('/?code=pkce123', { waitUntil: 'commit' });
    await page.waitForURL(/\/legacy-app/);
    expect(new URL(page.url()).search).toBe('?code=pkce123');
  });

  test('signed-out visitors stay on the landing page', async ({ page }) => {
    await page.goto('/?ref=e2e#how');
    await expect(page.getByRole('heading', { level: 1, name: HEADLINE })).toBeVisible();
    expect(new URL(page.url()).pathname).toBe('/');
  });
});

test('no horizontal overflow at 320 and 360 px', async ({ page }) => {
  for (const width of [320, 360]) {
    await page.setViewportSize({ width, height: 780 });
    await page.goto('/');
    await expect(page.getByTestId('live-strip')).toHaveAttribute('data-state', 'ready');
    await scrollThrough(page);
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
      await page.goto('/');
      await expect(page.getByTestId('live-strip')).toHaveAttribute('data-state', 'ready');
      await scrollThrough(page);
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
    test(`screenshot: landing ${viewport.name} ${mode.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      await storeTheme(page, mode.theme);
      await page.goto('/');
      await expect(page.getByTestId('live-strip')).toHaveAttribute('data-state', 'ready');
      // The headline has resolved (about 1.5 s) and the composer's examples have not rotated yet
      // (every 3 s), so the fold is not caught mid-transition.
      await settle(page, 1700);
      await page.screenshot({
        path: shotPath(`landing-${viewport.name}-${mode.name}-fold`),
        animations: 'disabled',
      });
      await scrollThrough(page);
      await settle(page, 1200);
      await page.screenshot({
        path: shotPath(`landing-${viewport.name}-${mode.name}-full`),
        fullPage: true,
        animations: 'disabled',
      });
    });
  }
}

for (const shot of [
  { name: 'desktop-dark', width: 1440, height: 900, theme: 'dark' },
  { name: 'desktop-light', width: 1440, height: 900, theme: 'light' },
  { name: 'mobile-dark', width: 390, height: 844, theme: 'dark' },
] as const) {
  test(`screenshot: the demo after the reveal (${shot.name})`, async ({ page }) => {
    await page.setViewportSize({ width: shot.width, height: shot.height });
    await storeTheme(page, shot.theme);
    await page.goto('/');
    const region = demo(page);
    await region.scrollIntoViewIfNeeded();
    await expect(region).toHaveAttribute('data-phase', 'voting', { timeout: 5_000 });
    await region.getByRole('button', { name: 'B is better' }).click();
    await expect(region).toHaveAttribute('data-phase', 'revealed');
    // The decrypt has finished and the electric current runs around the chosen pane.
    await page.waitForTimeout(700);
    await region.screenshot({ path: shotPath(`landing-demo-revealed-${shot.name}`) });
  });
}

for (const theme of ['dark', 'light'] as const) {
  test(`render the Open Graph image (og-landing${theme === 'dark' ? '' : '-light'}.png)`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: OG_WIDTH, height: OG_HEIGHT });
    await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
    await storeTheme(page, theme);
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
    await page.evaluate(() => document.fonts.ready);
    // A fixed layer on top of the page: React keeps the page underneath, the card uses its
    // fonts and tokens.
    await page.evaluate(template => {
      const layer = document.createElement('div');
      layer.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647';
      layer.innerHTML = template;
      document.body.append(layer);
    }, OG_TEMPLATE);
    await page.evaluate(async () => {
      await document.fonts.load('italic 400 84px "Playfair Display"');
      await document.fonts.load('800 22px "Bricolage Grotesque Variable"');
      await document.fonts.load('500 15px "DM Mono"');
      await document.fonts.ready;
    });
    await page.waitForTimeout(300);
    await page
      .locator('#og-card')
      .screenshot({ path: shotPath(theme === 'dark' ? 'og-landing' : 'og-landing-light') });
  });
}
