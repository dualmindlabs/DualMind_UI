import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';

import { expect, type Page, test } from '@playwright/test';

import { mockArena, SUPABASE } from '../e2e/arena-mocks';

// Slice G review screenshots: sign-in pages (login, signup with a password typed, forgot password,
// the two email-link states), settings (signed in) and the share pages (voted, unvoted, direct
// chat, private dead end), at desktop and phone, in dark and light. Supabase and the thread API
// are answered by routes. Focus is blurred and motion reduced so the captures are settled.

const OUT = path.resolve(process.cwd(), 'shots-out');
mkdirSync(OUT, { recursive: true });

interface SharedFixtures {
  ids: { public: string; unvoted: string; direct: string; private: string };
  threads: Record<string, { thread: Record<string, unknown>; messages: unknown[] } | undefined>;
}
const shared = JSON.parse(
  readFileSync(path.resolve(process.cwd(), 'tests/fixtures/api/share-threads.json'), 'utf8'),
) as SharedFixtures;

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
const THEMES = ['dark', 'light'] as const;
const EXPIRED =
  '#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired';

test.beforeEach(async ({ context, baseURL }) => {
  await context.addCookies([
    { name: 'dm_preview', value: '1', url: baseURL ?? 'http://127.0.0.1:8787' },
  ]);
});

async function capture(page: Page, name: string, vp: string, theme: string) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(900);
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
    (document.activeElement as HTMLElement | null)?.blur();
  });
  await page.mouse.move(0, 0);
  await page.waitForTimeout(300);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  await page.screenshot({ path: path.join(OUT, `${name}__${vp}__${theme}.png`), fullPage: true });
  await handle.evaluate(node => (node as Element).remove());
}

/** Signed-out Supabase: every call answered, none reaches the network. */
async function quietSupabase(page: Page) {
  await page.route(`${SUPABASE}/**`, route =>
    route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: '{}',
    }),
  );
}

async function mockSharedApi(page: Page) {
  await page.route('**/api/threads/**', async route => {
    const url = new URL(route.request().url());
    const match = /\/api\/threads\/([^/]+)(\/messages)?$/.exec(url.pathname);
    const id = decodeURIComponent(match?.[1] ?? '');
    const entry = shared.threads[id];
    const reply = (status: number, body: unknown) =>
      route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (id === shared.ids.private) return reply(401, { success: false, code: 'UNAUTHORIZED' });
    if (!entry) return reply(404, { success: false, code: 'NOT_FOUND' });
    return reply(200, match?.[2] ? { items: entry.messages } : entry.thread);
  });
}

for (const vp of VIEWPORTS) {
  for (const theme of THEMES) {
    test.describe(`G ${vp.name} ${theme}`, () => {
      test.use({
        viewport: { width: vp.width, height: vp.height },
        hasTouch: vp.phone,
        isMobile: vp.phone,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      test.beforeEach(async ({ page }) => {
        await page.addInitScript(v => window.localStorage.setItem('dm.theme', v), theme);
      });

      test('auth: login, signup, forgot, link states', async ({ page }) => {
        await quietSupabase(page);
        await page.goto('/login/');
        await expect(page.getByRole('tab', { name: 'Password' })).toBeVisible();
        await capture(page, 'g-auth-1-login', vp.name, theme);

        await page.goto('/signup/');
        await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible();
        await page.getByLabel('Name').fill('Ada Lovelace');
        await page.getByLabel('Email', { exact: true }).fill('ada@example.com');
        await page.getByRole('textbox', { name: 'Password', exact: true }).fill('Tabs&Spaces-2026');
        await capture(page, 'g-auth-2-signup', vp.name, theme);

        await page.goto('/forgot-password/');
        await expect(page.getByRole('button', { name: 'Send the reset link' })).toBeVisible();
        await capture(page, 'g-auth-3-forgot', vp.name, theme);

        await page.goto(`/auth-callback.html${EXPIRED}`);
        await expect(page.getByRole('heading', { name: 'This link did not work' })).toBeVisible();
        await capture(page, 'g-auth-4-link-error', vp.name, theme);
      });

      test('settings (signed in)', async ({ page }) => {
        await mockArena(page);
        await page.goto('/settings/');
        await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
        await expect(page.getByTestId('export-count')).toBeVisible();
        await capture(page, 'g-settings', vp.name, theme);
      });

      for (const [key, label] of [
        ['public', 'voted'],
        ['unvoted', 'unvoted'],
        ['direct', 'direct'],
        ['private', 'private'],
      ] as const) {
        test(`share: ${label}`, async ({ page }) => {
          await mockSharedApi(page);
          await page.goto(`/share/${shared.ids[key]}`);
          await expect(page.getByTestId('share-page')).toBeVisible();
          await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
          await capture(page, `g-share-${label}`, vp.name, theme);
        });
      }
    });
  }
}
