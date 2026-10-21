import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { mockArena } from './arena-mocks';
import { fullPageShot, passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';
import { OG_HEIGHT, OG_SHARE_TEMPLATE, OG_WIDTH } from './og-share-template';

// Slice S11: sharing. The dialog in the arena (Supabase and the API mocked by arena-mocks.ts),
// the public share page for a signed-out visitor (its API calls answered from
// tests/fixtures/api/share-threads.json), the link-preview tags the real Worker writes (its own
// look-up reaches the e2e backend in serve-dist.mjs, which serves the same file), axe, CSP,
// phone layout and the review screenshots.

interface SharedFixtures {
  ids: { public: string; unvoted: string; direct: string; private: string };
  threads: Record<string, { thread: Record<string, unknown>; messages: unknown[] } | undefined>;
}

const shared = JSON.parse(
  readFileSync(
    path.join(
      path.dirname(fileURLToPath(import.meta.url)),
      '..',
      'fixtures',
      'api',
      'share-threads.json',
    ),
    'utf8',
  ),
) as SharedFixtures;
const IDS = shared.ids;
const PUBLIC_TITLE = 'Explain recursion to a ten-year-old';

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

async function cspViolations(page: Page) {
  const violations: string[] = [];
  await page.exposeFunction('reportShareCsp', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      (window as unknown as { reportShareCsp: (text: string) => void }).reportShareCsp(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  return violations;
}

/** The public thread API as a visitor without a token sees it. */
async function mockSharedApi(page: Page, options: { offline?: () => boolean } = {}) {
  const requests: string[] = [];
  await page.route('**/api/threads/**', async route => {
    const request = route.request();
    requests.push(`${request.method()} ${new URL(request.url()).pathname}`);
    if (options.offline?.()) return route.abort('internetdisconnected');
    const match = /\/api\/threads\/([^/]+)(\/messages)?$/.exec(new URL(request.url()).pathname);
    const id = decodeURIComponent(match?.[1] ?? '');
    const headers = request.headers();
    if (headers.authorization) requests.push('sent a token');
    const entry = shared.threads[id];
    const reply = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (id === IDS.private) return reply(401, { success: false, code: 'UNAUTHORIZED' });
    if (!entry) return reply(404, { success: false, code: 'NOT_FOUND' });
    return reply(200, match?.[2] ? { items: entry.messages } : entry.thread);
  });
  return requests;
}

async function openShare(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByTestId('share-page')).toBeVisible();
}

/** Page-level horizontal overflow (scroll containers such as the phone pane row clip). */
async function overflowing(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const clipped = (element: Element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) return false;
        const { overflowX } = getComputedStyle(parent);
        if (['hidden', 'clip', 'auto', 'scroll'].includes(overflowX)) return true;
      }
      return false;
    };
    const offenders = [...document.querySelectorAll('body *')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > limit && !clipped(element);
      })
      .slice(0, 5)
      .map(
        element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
      );
    if (document.documentElement.scrollWidth > limit) offenders.push('documentElement');
    return offenders;
  });
}

async function axeBlocking(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      violation =>
        `${violation.id}: ${violation.nodes
          .map(node => node.target.join(' '))
          .slice(0, 3)
          .join(', ')}`,
    );
}

const metaContent = (html: string, attribute: string, key: string) =>
  new RegExp(`<meta ${attribute}="${key}" content="([^"]*)"`).exec(html)?.[1];

test.describe('share dialog in the arena', () => {
  test('opens from the thread header, saves Unlisted and copies the link', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: baseURL ?? 'http://127.0.0.1:8787',
    });
    const problems = collectProblems(page);
    const csp = await cspViolations(page);
    const state = await mockArena(page);
    await page.goto('/?thread=t-recursion');
    await expect(page.getByTestId('turn').first()).toBeVisible();
    await page.getByRole('button', { name: 'Share', exact: true }).click();

    const dialog = page.getByRole('dialog', { name: 'Share this battle' });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole('radio', { name: /Private/ })).toBeChecked();
    await expect(dialog.getByRole('textbox', { name: 'Link' })).toBeDisabled();

    await dialog.getByRole('radio', { name: /Unlisted/ }).click();
    await expect(dialog.getByRole('radio', { name: /Unlisted/ })).toBeChecked();
    await expect(dialog.getByRole('textbox', { name: 'Link' })).toBeEnabled();
    expect(state.bodies).toContainEqual({
      path: '/api/threads/t-recursion/visibility',
      body: { visibility: 'unlisted' },
    });

    await dialog.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied')).toBeVisible();
    const origin = new URL(page.url()).origin;
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${origin}/share/t-recursion`,
    );
    await expect(dialog.getByRole('link', { name: /Open the page/ })).toHaveAttribute(
      'href',
      '/share/t-recursion',
    );
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    expect(problems).toEqual([]);
    expect(csp).toEqual([]);
  });

  test('opens from the command palette and from the history menu', async ({ page }) => {
    await mockArena(page);
    await page.goto('/?thread=t-recursion');
    await expect(page.getByTestId('turn').first()).toBeVisible();
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('share this');
    await page.keyboard.press('Enter');
    await expect(page.getByRole('dialog', { name: 'Share this battle' })).toBeVisible();
    await page.keyboard.press('Escape');

    const history = page.getByRole('navigation', { name: 'Your threads' });
    await history.getByRole('button', { name: 'Actions for Decline a meeting politely' }).click();
    await page.getByRole('menuitem', { name: 'Share' }).click();
    await expect(page.getByRole('dialog', { name: 'Share this chat' })).toBeVisible();
  });
});

test.describe('share page', () => {
  test('a voted battle, signed out: the reveal, the verdict and the call to action', async ({
    page,
    context,
    baseURL,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write'], {
      origin: baseURL ?? 'http://127.0.0.1:8787',
    });
    const problems = collectProblems(page);
    const csp = await cspViolations(page);
    const requests = await mockSharedApi(page);
    await openShare(page, `/share/${IDS.public}`);

    await expect(page.getByRole('heading', { level: 1, name: PUBLIC_TITLE })).toBeVisible();
    await expect(page).toHaveTitle(`${PUBLIC_TITLE} · DualMind Arena`);
    const turns = page.getByTestId('turn');
    await expect(turns).toHaveCount(2);
    const first = turns.first();
    await expect(first.getByTestId('pane-model').first()).toContainText(
      'Llama 3.3 70B Instruct (FP8, fast)',
    );
    await expect(first.getByTestId('pane-model').nth(1)).toContainText('Qwen3 30B A3B (FP8)');
    await expect(first.locator('[data-side="b"][data-chosen]')).toContainText('Picked');
    await expect(first.getByTestId('turn-verdict')).toContainText('Verdict: B is better');
    await expect(first.getByTestId('pane-meta').first()).toContainText('1.8 s');
    await expect(page.getByTestId('turn').getByText(/Your verdict|Your pick/)).toHaveCount(0);
    // The hardened renderer: real emphasis and a code block with its copy button.
    await expect(first.locator('strong').first()).toBeVisible();
    await expect(first.getByRole('button', { name: /Copy the .* code/i }).first()).toBeVisible();
    // Nothing about the owner, and no token sent.
    await expect(page.locator('body')).not.toContainText('00000000-0000-4000-8000-0000000000aa');
    expect(requests).not.toContain('sent a token');

    await expect(page.getByRole('link', { name: /Run your own battle/ }).first()).toHaveAttribute(
      'href',
      '/',
    );
    await page.getByRole('button', { name: 'Copy link' }).click();
    await expect(page.getByText('Link copied')).toBeVisible();
    const origin = new URL(page.url()).origin;
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(
      `${origin}/share/${IDS.public}`,
    );
    expect(problems).toEqual([]);
    expect(csp).toEqual([]);
  });

  test('a battle without a vote keeps both models anonymous', async ({ page }) => {
    await mockSharedApi(page);
    await openShare(page, `/share/${IDS.unvoted}`);
    await expect(page.getByTestId('share-lead')).toContainText('Nobody voted');
    await expect(page.getByTestId('turn')).toHaveCount(1);
    await expect(page.getByTestId('pane-model')).toHaveCount(0);
    await expect(page.getByTestId('pane-meta')).toHaveCount(0);
    await expect(page.locator('main')).not.toContainText(/llama|qwen/i);
  });

  test('a Direct chat shows one answer', async ({ page }) => {
    await mockSharedApi(page);
    await openShare(page, `/share/${IDS.direct}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Decline a meeting politely' }),
    ).toBeVisible();
    await expect(page.getByText('Shared chat')).toBeVisible();
    await expect(page.locator('[data-side="solo"]')).toHaveCount(1);
  });

  test('old ?id=, ?thread= and ?threadId= links work and move to /share/<id>', async ({ page }) => {
    await mockSharedApi(page);
    for (const query of ['id', 'thread', 'threadId']) {
      await openShare(page, `/share/?${query}=${IDS.public}`);
      await expect(page.getByRole('heading', { level: 1, name: PUBLIC_TITLE })).toBeVisible();
      await expect(page).toHaveURL(new RegExp(`/share/${IDS.public}$`));
    }
    await openShare(page, `/share/index.html?threadId=${IDS.public}`);
    await expect(page).toHaveURL(new RegExp(`/share/${IDS.public}$`));
  });

  test('a private link says so', async ({ page }) => {
    const problems = collectProblems(page);
    await mockSharedApi(page);
    await openShare(page, `/share/${IDS.private}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'This link is private or doesn’t exist.' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Run your own battle' })).toHaveAttribute(
      'href',
      '/',
    );
    await expect(page).toHaveTitle('Link unavailable · DualMind Arena');
    // The browser logs the 401 response itself; nothing else may fail.
    expect(problems.filter(problem => !problem.includes('401'))).toEqual([]);
  });

  test('a network failure shows a retry that works', async ({ page }) => {
    let offline = true;
    await mockSharedApi(page, { offline: () => offline });
    await openShare(page, `/share/${IDS.public}`);
    const error = page.getByTestId('share-error');
    await expect(error).toBeVisible({ timeout: 20_000 });
    await expect(error.getByRole('heading', { level: 1 })).toHaveText(
      'This shared page did not load.',
    );
    offline = false;
    await error.getByRole('button', { name: /Try again/ }).click();
    await expect(page.getByRole('heading', { level: 1, name: PUBLIC_TITLE })).toBeVisible();
  });
});

test.describe('link previews from the Worker', () => {
  const headers = { Cookie: PREVIEW_COOKIE };

  test('a public battle: 200, never cached, the first prompt in the tags', async ({ request }) => {
    const response = await request.get(`/share/${IDS.public}`, { headers, maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store, no-cache, must-revalidate');
    expect(response.headers()['content-security-policy']).toContain("script-src 'self'");
    const html = await response.text();
    expect(html).toContain(`<title>${PUBLIC_TITLE} · DualMind Arena</title>`);
    expect(metaContent(html, 'property', 'og:title')).toBe(PUBLIC_TITLE);
    expect(metaContent(html, 'property', 'og:description')).toBe(
      'Two anonymous AI models answered. See which one won.',
    );
    // The Worker uses the origin it was called on (wrangler dev here, the site in production).
    expect(metaContent(html, 'property', 'og:url')).toMatch(
      new RegExp(`^https?://[^/]+/share/${IDS.public}$`),
    );
    expect(metaContent(html, 'property', 'og:image')).toMatch(/^https?:\/\/[^/]+\/og\/share\.png$/);
    expect(metaContent(html, 'name', 'twitter:card')).toBe('summary_large_image');
    expect(html).not.toMatch(/llama|qwen/i);
    expect(html).toContain('data-spa-fallback');
  });

  test('an old ?id= link gets the same tags, pointing at the canonical address', async ({
    request,
  }) => {
    const response = await request.get(`/share/?id=${IDS.unvoted}`, { headers, maxRedirects: 0 });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(metaContent(html, 'property', 'og:title')).toBe('Which is bigger, 9.11 or 9.9?');
    expect(metaContent(html, 'property', 'og:url')).toMatch(
      new RegExp(`^https?://[^/]+/share/${IDS.unvoted}$`),
    );
    expect(metaContent(html, 'name', 'robots')).toBe('noindex, nofollow');
  });

  test('private and unknown links get the generic tags', async ({ request }) => {
    for (const id of [IDS.private, '5ba7e1a0-5a3e-4c1d-8000-0000000000ff']) {
      const response = await request.get(`/share/${id}`, { headers, maxRedirects: 0 });
      expect(response.status()).toBe(200);
      expect(response.headers()['x-robots-tag']).toBe('noindex, nofollow');
      const html = await response.text();
      expect(metaContent(html, 'property', 'og:title')).toBe('Shared from DualMind Arena');
      expect(html).not.toContain(PUBLIC_TITLE);
    }
  });

  test('the share card image is served', async ({ request }) => {
    const image = await request.get('/og/share.png', { headers });
    expect(image.status()).toBe(200);
    expect(image.headers()['content-type']).toBe('image/png');
  });
});

test.describe('quality', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`axe: share page, private link and dialog, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await mockSharedApi(page);
      await openShare(page, `/share/${IDS.public}`);
      await expect(page.getByTestId('turn').first()).toBeVisible();
      await settle(page, 500);
      expect(await axeBlocking(page), 'share page').toEqual([]);
      await openShare(page, `/share/${IDS.private}`);
      await expect(page.getByTestId('share-unavailable')).toBeVisible();
      expect(await axeBlocking(page), 'private link').toEqual([]);
    });

    test(`axe: share dialog, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await mockArena(page);
      await page.goto('/?thread=t-recursion');
      await expect(page.getByTestId('turn').first()).toBeVisible();
      await page.getByRole('button', { name: 'Share', exact: true }).click();
      const dialog = page.getByRole('dialog', { name: 'Share this battle' });
      await dialog.getByRole('radio', { name: /Unlisted/ }).click();
      await expect(dialog.getByRole('textbox', { name: 'Link' })).toBeEnabled();
      await settle(page, 400);
      expect(await axeBlocking(page)).toEqual([]);
    });
  }

  test('no horizontal overflow at 360 px, and the A / B switch on phones', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await mockSharedApi(page);
    await openShare(page, `/share/${IDS.public}`);
    await expect(page.getByTestId('turn').first()).toBeVisible();
    expect(await overflowing(page)).toEqual([]);
    const answerB = page
      .getByTestId('turn')
      .first()
      .getByRole('button', { name: 'Answer B', exact: true });
    await answerB.click();
    await expect(answerB).toHaveAttribute('aria-pressed', 'true');
    await openShare(page, `/share/${IDS.private}`);
    expect(await overflowing(page)).toEqual([]);
  });
});

test.describe('screenshots', () => {
  const viewports = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
  ] as const;

  for (const viewport of viewports) {
    for (const theme of ['dark', 'light'] as const) {
      test(`share page and dialog: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockSharedApi(page);
        await openShare(page, `/share/${IDS.public}`);
        await expect(page.getByTestId('turn').first()).toBeVisible();
        await settle(page, 700);
        await page.screenshot({ path: shotPath(`share-page-${viewport.label}-${theme}`) });
        await fullPageShot(page, {
          path: shotPath(`share-page-full-${viewport.label}-${theme}`),
          fullPage: true,
        });
        await openShare(page, `/share/${IDS.private}`);
        await expect(page.getByTestId('share-unavailable')).toBeVisible();
        await settle(page, 300);
        await page.screenshot({ path: shotPath(`share-unavailable-${viewport.label}-${theme}`) });

        await page.unrouteAll({ behavior: 'ignoreErrors' });
        await mockArena(page);
        await page.goto('/?thread=t-recursion');
        await expect(page.getByTestId('turn').first()).toBeVisible();
        await page.getByRole('button', { name: 'Share', exact: true }).click();
        const dialog = page.getByRole('dialog', { name: 'Share this battle' });
        await expect(dialog.getByRole('radio', { name: /Private/ })).toBeChecked();
        await settle(page, 400);
        await page.screenshot({
          path: shotPath(`share-dialog-private-${viewport.label}-${theme}`),
        });
        await dialog.getByRole('radio', { name: /Unlisted/ }).click();
        await expect(dialog.getByRole('textbox', { name: 'Link' })).toBeEnabled();
        await settle(page, 400);
        await page.screenshot({ path: shotPath(`share-dialog-${viewport.label}-${theme}`) });
      });
    }
  }

  test('share page: loading and error states, desktop dark', async ({ page }) => {
    let offline = true;
    let hold: (() => void) | null = null;
    const held = new Promise<void>(resolve => {
      hold = resolve;
    });
    await page.route('**/api/threads/**', async route => {
      if (hold) await held;
      if (offline) return route.abort('internetdisconnected');
      return route.continue();
    });
    await page.goto(`/share/${IDS.public}`);
    await expect(page.getByTestId('share-loading')).toBeVisible();
    await settle(page, 300);
    await page.screenshot({ path: shotPath('share-loading-desktop-dark') });
    const release = hold as (() => void) | null;
    hold = null;
    release?.();
    await expect(page.getByTestId('share-error')).toBeVisible({ timeout: 20_000 });
    await settle(page, 300);
    await page.screenshot({ path: shotPath('share-error-desktop-dark') });
    offline = false;
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`render the Open Graph image (og-share${theme === 'dark' ? '' : '-light'}.png)`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: OG_WIDTH, height: OG_HEIGHT });
      await page.emulateMedia({ reducedMotion: 'reduce', colorScheme: theme });
      await storeTheme(page, theme);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      await page.evaluate(template => {
        const layer = document.createElement('div');
        layer.style.cssText = 'position: fixed; inset: 0; z-index: 2147483647';
        layer.innerHTML = template;
        document.body.append(layer);
      }, OG_SHARE_TEMPLATE);
      await page.evaluate(async () => {
        await document.fonts.load('italic 400 70px "Playfair Display"');
        await document.fonts.load('800 21px "Bricolage Grotesque Variable"');
        await document.fonts.load('300 66px "Bricolage Grotesque Variable"');
        await document.fonts.load('500 15px "DM Mono"');
        await document.fonts.ready;
      });
      await page.waitForTimeout(300);
      await page
        .locator('#og-card')
        .screenshot({ path: shotPath(theme === 'dark' ? 'og-share' : 'og-share-light') });
    });
  }
});
