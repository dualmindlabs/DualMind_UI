import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type Page, test } from '@playwright/test';

import { mockArena, SUPABASE } from '../e2e/arena-mocks';
import {
  audit,
  LIVE,
  type Probe,
  probe,
  record,
  settle,
  shot,
  shotName,
  THEMES,
  VIEWPORTS,
} from './audit';

// The hard pass: every route and state, at desktop 1440 and phone 390, dark and light, with the
// same battery on each (console errors, failed requests, sideways scroll, broken images, tap
// targets on the phone, visible focus, axe with every impact level) and a full-page screenshot.
// Findings are collected per test and asserted softly, so one run reports everything.

const here = path.dirname(fileURLToPath(import.meta.url));
const SHARES = JSON.parse(
  readFileSync(path.join(here, '..', 'fixtures', 'api', 'share-threads.json'), 'utf8'),
) as { ids: Record<string, string> };

const PREVIEW = 'dualmind-preview';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([{ name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' }]);
});

async function theme(page: Page, value: 'dark' | 'light') {
  await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), value);
}

interface Ctx {
  id: string;
  vp: (typeof VIEWPORTS)[number];
  theme: 'dark' | 'light';
}

/** Runs the battery on the current page, saves the screenshot and the findings. */
async function finish(page: Page, ctx: Ctx, found: Probe, extra: string[] = [], opts: { axeExclude?: string[]; allowNoise?: boolean } = {}) {
  await settle(page, 900);
  const findings = [...extra, ...(await audit(page, { phone: ctx.vp.phone, probe: found, axeExclude: opts.axeExclude }))];
  const name = shotName(ctx.id, ctx.vp.name, ctx.theme);
  await shot(page, name);
  record(name, { ...ctx, vp: ctx.vp.name, url: page.url(), findings });
  expect.soft(findings, `${name}\n`).toEqual([]);
}

// --- Public routes ---------------------------------------------------------------------------

const ROUTES: Array<{ id: string; url: string; status?: number; live?: boolean }> = [
  { id: 'landing', url: '/', live: true },
  { id: 'leaderboard', url: '/leaderboard/', live: true },
  { id: 'models', url: '/models/', live: true },
  { id: 'about', url: '/about/', live: true },
  { id: 'credits', url: '/credits/', live: true },
  { id: 'how-it-works', url: '/how-it-works/', live: true },
  { id: 'faq', url: '/faq/', live: true },
  { id: 'privacy', url: '/privacy/', live: true },
  { id: 'terms', url: '/terms/', live: true },
  { id: 'cookies', url: '/cookies/', live: true },
  { id: 'developers', url: '/developers/', live: true },
  { id: 'problems', url: '/problems/', live: true },
  { id: 'login', url: '/login/', live: true },
  { id: 'signup', url: '/signup/', live: true },
  { id: 'forgot-password', url: '/forgot-password/', live: true },
  { id: 'auth-callback-no-link', url: '/auth-callback.html', live: true },
  { id: 'update-password-no-link', url: '/update-password.html', live: true },
  { id: 'design', url: '/design/', live: true },
  { id: 'share-unknown-id', url: '/share/does-not-exist-123', live: true },
  { id: 'not-found-404', url: '/this-page-does-not-exist', status: 404, live: true },
  { id: 'not-found-404-deep', url: '/leaderboard/nope/deeper', status: 404, live: true },
  { id: 'share-public', url: `/share/${SHARES.ids.public}` },
  { id: 'share-unvoted', url: `/share/${SHARES.ids.unvoted}` },
  { id: 'share-direct', url: `/share/${SHARES.ids.direct}` },
  { id: 'share-private-dead-end', url: `/share/${SHARES.ids.private}` },
  { id: 'settings-signed-out', url: '/settings/' },
];

for (const vp of VIEWPORTS) {
  for (const th of THEMES) {
    test.describe(`routes ${vp.name} ${th}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
      });
      for (const route of ROUTES) {
        test(`${route.id}`, async ({ page }) => {
          test.skip(LIVE && !route.live, 'needs mocks');
          const found = probe(page, route.status === 404);
          await theme(page, th);
          const response = await page.goto(
            route.url + (LIVE ? `${route.url.includes('?') ? '&' : '?'}preview=${PREVIEW}` : ''),
          );
          const extra: string[] = [];
          if (route.status && response?.status() !== route.status) {
            extra.push(`expected HTTP ${route.status}, got ${response?.status()}`);
          }
          if (!route.status && response && response.status() >= 400 && route.id !== 'share-unknown-id') {
            extra.push(`unexpected HTTP ${response.status()}`);
          }
          // The 404 page logs the failed document load itself: not an app error.
          if (route.status) found.failed.length = 0;
          await finish(page, { id: route.id, vp, theme: th }, found, extra);
        });
      }

      test('model detail (leaderboard sheet)', async ({ page }) => {
        const found = probe(page);
        await theme(page, th);
        await page.goto('/leaderboard/' + (LIVE ? `?preview=${PREVIEW}` : ''));
        await expect(page.locator('[data-model-id]').first()).toBeVisible({ timeout: 20_000 });
        const opener = page.locator('[data-model-id]').first().getByRole('button').first();
        await opener.scrollIntoViewIfNeeded();
        await opener.click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await settle(page, 1500);
        await finish(page, { id: 'model-detail', vp, theme: th }, found, [], { axeExclude: [] });
      });

      test('models page: search with no match', async ({ page }) => {
        const found = probe(page);
        await theme(page, th);
        await page.goto('/models/' + (LIVE ? `?preview=${PREVIEW}` : ''));
        await page.getByRole('searchbox', { name: 'Search models' }).fill('zzzz-no-such-model');
        await expect(page.getByText(/No model matches/)).toBeVisible();
        await finish(page, { id: 'models-no-match', vp, theme: th }, found);
      });
    });
  }
}

// --- Data states (composed build only: forced with route mocks) --------------------------------

const PROBLEM = 'https://arena.dualmindlab.tech/problems/';

for (const vp of VIEWPORTS) {
  for (const th of THEMES) {
    test.describe(`states ${vp.name} ${th}`, () => {
      test.skip(LIVE, 'forced states need mocks');
      test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.phone, isMobile: vp.phone });

      test('leaderboard loading', async ({ page }) => {
        const found = probe(page, true);
        await theme(page, th);
        let release: () => void = () => undefined;
        const held = new Promise<void>(resolve => (release = resolve));
        await page.route('**/api/v2/leaderboard', async route => {
          await held;
          await route.abort();
        });
        await page.goto('/leaderboard/');
        await expect(page.locator('div[aria-busy="true"]')).toBeVisible();
        await finish(page, { id: 'leaderboard-loading', vp, theme: th }, found);
        release();
      });

      for (const [state, status, retry] of [['error', 500, undefined], ['rate-limited', 429, '30']] as const) {
        test(`leaderboard ${state}`, async ({ page }) => {
          const found = probe(page, true);
          await theme(page, th);
          await page.route('**/api/v2/leaderboard', route =>
            route.fulfill({
              status,
              contentType: 'application/problem+json',
              headers: retry ? { 'Retry-After': retry } : {},
              body: JSON.stringify({ type: `${PROBLEM}${status === 429 ? 'rate-limited' : 'internal'}`, title: 'x', status }),
            }),
          );
          await page.goto('/leaderboard/');
          await expect(page.getByRole('alert').filter({ hasText: 'did not load' })).toBeVisible({ timeout: 20_000 });
          await finish(page, { id: `leaderboard-${state}`, vp, theme: th }, found);
        });
      }

      test('root offline screen', async ({ page }) => {
        const found = probe(page, true);
        await theme(page, th);
        await page.addInitScript(() => {
          Object.defineProperty(window.navigator, 'onLine', { configurable: true, get: () => false });
          const real = window.matchMedia.bind(window);
          window.matchMedia = (query: string) => {
            if (!query.includes('prefers-color-scheme')) throw new Error('forced crash');
            return real(query);
          };
        });
        await page.goto('/leaderboard/');
        await expect(page.getByTestId('root-error')).toBeVisible();
        await finish(page, { id: 'error-root-offline', vp, theme: th }, found);
      });

      test('root crash screen (online)', async ({ page }) => {
        const found = probe(page, true);
        await theme(page, th);
        await page.addInitScript(() => {
          const real = window.matchMedia.bind(window);
          window.matchMedia = (query: string) => {
            if (!query.includes('prefers-color-scheme')) throw new Error('forced crash');
            return real(query);
          };
        });
        await page.goto('/leaderboard/');
        await expect(page.getByTestId('root-error')).toBeVisible();
        await finish(page, { id: 'error-root-crash', vp, theme: th }, found);
      });
    });
  }
}

// --- Signed-in: arena, share dialog, settings ---------------------------------------------------

const PROMPT = 'Design a cache for a read-heavy API and show the code';

for (const vp of VIEWPORTS) {
  for (const th of THEMES) {
    test.describe(`arena ${vp.name} ${th}`, () => {
      test.skip(LIVE, 'signed-in screens need mocks');
      test.use({ viewport: { width: vp.width, height: vp.height }, hasTouch: vp.phone, isMobile: vp.phone });

      test('empty, typing, awaiting vote, reveal, share dialog, rematch', async ({ page }) => {
        const found = probe(page);
        await theme(page, th);
        await mockArena(page);
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        await finish(page, { id: 'arena-1-empty', vp, theme: th }, found);

        const prompt = page.getByRole('textbox', { name: 'Your prompt' });
        await prompt.fill(PROMPT);
        await finish(page, { id: 'arena-2-typing', vp, theme: th }, found);

        await prompt.click();
        await page.keyboard.press('Enter');
        const turn = page.getByTestId('live-turn').first();
        await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
        await finish(page, { id: 'arena-3-vote', vp, theme: th }, found);

        await turn.getByRole('button', { name: /A is better/ }).click();
        await expect(turn).toHaveAttribute('data-phase', 'revealed');
        await finish(page, { id: 'arena-4-reveal', vp, theme: th }, found);

        const share = page.getByTestId('reveal-panel').getByRole('button', { name: 'Share this battle' });
        await share.click();
        await expect(page.getByRole('dialog', { name: 'Share this battle' })).toBeVisible();
        await finish(page, { id: 'arena-5-share-dialog', vp, theme: th }, found);
        await page.keyboard.press('Escape');

        await page.getByTestId('reveal-panel').getByRole('button', { name: 'Rematch' }).click();
        await expect(prompt).toHaveValue(PROMPT);
        await finish(page, { id: 'arena-6-rematch', vp, theme: th }, found);
      });

      test('history open, thread with a voted turn', async ({ page }) => {
        const found = probe(page);
        await theme(page, th);
        await mockArena(page);
        await page.goto('/?thread=t-recursion');
        await expect(page.getByTestId('turn').first()).toBeVisible();
        await finish(page, { id: 'arena-thread-history', vp, theme: th }, found);
      });

      test('battle failed, rate limited, offline notice, arena crash panel', async ({ page, context }) => {
        const found = probe(page, true);
        await theme(page, th);
        await mockArena(page);
        const fail = (status: number, extraHeaders: Record<string, string> = {}) =>
          page.route('**/api/arena/dualchat', route =>
            route.fulfill({
              status,
              contentType: 'application/problem+json',
              headers: extraHeaders,
              body: JSON.stringify({ type: `${PROBLEM}${status === 429 ? 'rate-limited' : 'internal'}`, title: 'x', status, retryAfter: 30 }),
            }),
          );
        await page.goto('/?arena=new');
        await expect(page.getByTestId('arena')).toBeVisible();
        await fail(500);
        await page.getByRole('textbox', { name: 'Your prompt' }).fill(PROMPT);
        await page.keyboard.press('Enter');
        await expect(page.getByRole('alert').filter({ hasText: 'did not arrive' })).toBeVisible({ timeout: 15_000 });
        await finish(page, { id: 'arena-state-battle-failed', vp, theme: th }, found);

        await page.unroute('**/api/arena/dualchat');
        await fail(429, { 'Retry-After': '30' });
        await page.getByRole('button', { name: /Try again/ }).first().click();
        await expect(page.getByRole('alert').filter({ hasText: /Too many requests/ })).toBeVisible({ timeout: 15_000 });
        await finish(page, { id: 'arena-state-rate-limited', vp, theme: th }, found);

        await context.setOffline(true);
        await expect(page.getByTestId('offline-notice')).toBeVisible({ timeout: 10_000 });
        await finish(page, { id: 'arena-state-offline', vp, theme: th }, found);
        await context.setOffline(false);
      });

      test('settings and export', async ({ page }) => {
        const found = probe(page);
        await theme(page, th);
        await mockArena(page);
        await page.goto('/settings/');
        await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
        await expect(page.getByTestId('export-count')).toBeVisible();
        await finish(page, { id: 'settings', vp, theme: th }, found);
        const [download] = await Promise.all([
          page.waitForEvent('download'),
          page.getByRole('button', { name: /Export as Markdown/ }).click(),
        ]);
        const extra: string[] = [];
        if (!/^dualmind-export-.*\.md$/.test(download.suggestedFilename())) {
          extra.push(`unexpected export filename ${download.suggestedFilename()}`);
        }
        await finish(page, { id: 'settings-export-done', vp, theme: th }, found, extra);
      });
    });
  }
}

// --- Behaviours -------------------------------------------------------------------------------

test.describe('keyboard flow through the arena (desktop)', () => {
  test.skip(LIVE, 'needs mocks');
  test.use({ viewport: { width: 1440, height: 900 } });
  test('Tab reaches the prompt, Enter sends, 1 votes, Tab walks the next steps', async ({ page }) => {
    const found = probe(page);
    await mockArena(page);
    await page.goto('/?arena=new');
    await expect(page.getByTestId('arena')).toBeVisible();
    const findings: string[] = [];
    let reached = false;
    for (let i = 0; i < 40 && !reached; i += 1) {
      await page.keyboard.press('Tab');
      reached = await page.evaluate(() => (document.activeElement as HTMLElement | null)?.getAttribute('aria-label') === 'Your prompt' || (document.activeElement as HTMLElement | null)?.matches('textarea') === true);
    }
    if (!reached) findings.push('Tab never reached the prompt box in 40 presses');
    await page.keyboard.type('Keyboard only battle');
    await page.keyboard.press('Enter');
    const turn = page.getByTestId('live-turn').first();
    await expect(turn).toHaveAttribute('data-phase', 'awaiting_vote', { timeout: 15_000 });
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    await page.keyboard.press('1');
    await expect(turn).toHaveAttribute('data-phase', 'revealed');
    const panel = page.getByTestId('reveal-panel');
    if (!(await panel.evaluate(el => el === document.activeElement))) findings.push('focus did not move to the result panel after the vote');
    const names: string[] = [];
    for (let i = 0; i < 4; i += 1) {
      await page.keyboard.press('Tab');
      names.push(await page.evaluate(() => (document.activeElement?.textContent ?? '').replace(/\s+/g, ' ').trim()));
    }
    if (!names.some(name => /Rematch/.test(name))) findings.push(`Tab from the panel does not reach Rematch: ${names.join(' | ')}`);
    await page.keyboard.press('Control+k');
    if (!(await page.getByRole('combobox').isVisible().catch(() => false))) findings.push('Ctrl+K did not open the command palette');
    await page.keyboard.press('Escape');
    await page.keyboard.press('?');
    if (!(await page.getByRole('dialog', { name: 'Keyboard shortcuts' }).isVisible().catch(() => false))) findings.push('? did not open the shortcuts');
    findings.push(...found.errors);
    record('behaviour-keyboard-arena', { findings });
    expect.soft(findings).toEqual([]);
  });
});

for (const target of [
  { id: 'landing', url: '/' },
  { id: 'leaderboard', url: '/leaderboard/' },
  { id: 'faq', url: '/faq/' },
  { id: 'arena', url: '/?arena=new', mocked: true },
]) {
  test(`reduced motion: no endless animation on ${target.id}`, async ({ page }) => {
    test.skip(LIVE && target.mocked, 'needs mocks');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    if (target.mocked) await mockArena(page);
    await page.goto(target.url + (LIVE ? `?preview=${PREVIEW}` : ''));
    await settle(page, 2500);
    const running = await page.evaluate(() =>
      document
        .getAnimations()
        .filter(a => a.playState === 'running')
        .map(a => {
          const timing = a.effect?.getTiming();
          const name = (a as CSSAnimation).animationName ?? (a as CSSTransition).transitionProperty ?? 'anim';
          return { name, infinite: timing?.iterations === Infinity, duration: Number(timing?.duration ?? 0) };
        })
        .filter(a => a.infinite || a.duration > 600)
        .slice(0, 6),
    );
    record(`behaviour-reduced-motion-${target.id}`, { running });
    expect.soft(running, 'long or endless animations while prefers-reduced-motion: reduce').toEqual([]);
  });
}

test('internal link crawl: every same-origin link answers < 400', async ({ page, context }) => {
  test.setTimeout(240_000);
  const seeds = ['/', '/leaderboard/', '/models/', '/about/', '/credits/', '/how-it-works/', '/faq/', '/privacy/', '/terms/', '/cookies/', '/developers/', '/login/', '/signup/', '/forgot-password/', '/problems/'];
  const seen = new Set<string>();
  const queue = [...seeds];
  const bad: string[] = [];
  const hashBad: string[] = [];
  const origin = new URL((await page.context().cookies())[0] ? 'http://x' : 'http://x').origin;
  void origin;
  while (queue.length && seen.size < 150) {
    const url = queue.shift()!;
    if (seen.has(url)) continue;
    seen.add(url);
    const res = await page.goto(url + (LIVE ? `?preview=${PREVIEW}` : ''));
    if (!res || res.status() >= 400) {
      bad.push(`${res?.status()} ${url}`);
      continue;
    }
    if (!(res.headers()['content-type'] ?? '').includes('html')) continue;
    await page.waitForTimeout(300);
    const links = await page.evaluate(() =>
      [...document.querySelectorAll('a[href]')].map(a => (a as HTMLAnchorElement).href),
    );
    const here = new URL(page.url());
    for (const href of links) {
      const link = new URL(href);
      if (link.origin !== here.origin) continue;
      if (/^\/(api|cdn-cgi)\//.test(link.pathname)) continue;
      if (link.hash && link.pathname === here.pathname) {
        const id = decodeURIComponent(link.hash.slice(1));
        if (id && (await page.locator(`[id="${id}"]`).count()) === 0) hashBad.push(`${url} -> #${id}`);
        continue;
      }
      const next = link.pathname + link.search;
      if (/\.(md|json|xml|txt|png|jpg|svg|ico|webmanifest|pdf)$/.test(link.pathname)) {
        const r = await context.request.get(link.origin + next);
        if (r.status() >= 400) bad.push(`${r.status()} ${next} (from ${url})`);
        continue;
      }
      if (!seen.has(next)) queue.push(next);
    }
  }
  // Also the other files a crawler reads.
  for (const file of ['/sitemap.xml', '/robots.txt', '/llms.txt', '/favicon.ico', '/manifest.json']) {
    const r = await context.request.get(file);
    if (r.status() >= 400) bad.push(`${r.status()} ${file}`);
  }
  const findings = [...bad, ...hashBad.map(item => `dead in-page anchor: ${item}`)];
  record('behaviour-link-crawl', { crawled: [...seen], findings });
  expect.soft(findings).toEqual([]);
});

test('unknown paths answer a real 404; known ones 200', async ({ context }) => {
  const findings: string[] = [];
  for (const p of ['/nope', '/nope/', '/a/b/c/d', '/leaderboard/nope', '/models/nope/x', '/share/x/y/z', '/index.php', '/.env', '/wp-admin/']) {
    const r = await context.request.get(p, { maxRedirects: 0 });
    if (r.status() !== 404) findings.push(`${p} -> ${r.status()} (want 404)`);
  }
  for (const p of ['/', '/leaderboard/', '/about/', '/login/']) {
    const r = await context.request.get(p, { maxRedirects: 0 });
    if (r.status() !== 200) findings.push(`${p} -> ${r.status()} (want 200)`);
  }
  record('behaviour-status-codes', { findings });
  expect.soft(findings).toEqual([]);
});

test('security headers and CSP on HTML, API and 404 responses', async ({ context }) => {
  const findings: string[] = [];
  for (const p of ['/', '/leaderboard/', '/login/', '/settings/', '/share/abc', '/nope-404']) {
    const r = await context.request.get(p, { maxRedirects: 0 });
    const h = r.headers();
    const csp = h['content-security-policy'] ?? h['content-security-policy-report-only'];
    if (!csp) findings.push(`${p}: no Content-Security-Policy`);
    else {
      if (!h['content-security-policy']) findings.push(`${p}: CSP is report-only`);
      if (/script-src[^;]*'unsafe-inline'/.test(csp)) findings.push(`${p}: script-src allows unsafe-inline`);
      if (/script-src[^;]*'unsafe-eval'/.test(csp)) findings.push(`${p}: script-src allows unsafe-eval`);
      if (!/frame-ancestors/.test(csp) && !h['x-frame-options']) findings.push(`${p}: no frame-ancestors`);
      if (!/object-src 'none'/.test(csp)) findings.push(`${p}: object-src not none`);
    }
    if (h['x-content-type-options'] !== 'nosniff') findings.push(`${p}: x-content-type-options missing`);
    if (!h['referrer-policy']) findings.push(`${p}: referrer-policy missing`);
    if (!h['permissions-policy']) findings.push(`${p}: permissions-policy missing`);
    if (LIVE && !h['strict-transport-security']) findings.push(`${p}: HSTS missing`);
    if (h['server'] && /\d/.test(h['server'])) findings.push(`${p}: server header leaks a version (${h['server']})`);
  }
  record('behaviour-security-headers', { findings });
  expect.soft(findings).toEqual([]);
});

test('CSP violations on the main pages', async ({ page }) => {
  const violations: string[] = [];
  await page.exposeFunction('reportCsp', (text: string) => violations.push(text));
  await page.addInitScript(() =>
    document.addEventListener('securitypolicyviolation', event =>
      (window as unknown as { reportCsp: (t: string) => void }).reportCsp(`${event.violatedDirective} ${event.blockedURI}`),
    ),
  );
  for (const p of ['/', '/leaderboard/', '/models/', '/faq/', '/login/', '/developers/']) {
    await page.goto(p + (LIVE ? `?preview=${PREVIEW}` : ''));
    await settle(page, 1500);
  }
  record('behaviour-csp-violations', { findings: violations });
  expect.soft(violations).toEqual([]);
});

void SUPABASE;
