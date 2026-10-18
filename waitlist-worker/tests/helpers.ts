import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { Page, TestInfo } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));
export const STATS_FIXTURE = readFileSync(path.join(here, 'fixtures', 'model-stats.json'), 'utf8');
export const STATS_URL = 'https://api.dualmindlab.tech/api/arena/model-stats';
/** Where the page remembers the email that joined from this browser (src/lib/waitlist.ts). */
export const DEVICE_KEY = 'dualmind_waitlist_joined';
/** Where the old page kept its local-only "signups". */
export const LEGACY_KEY = 'dualmind_waitlist';

/** Answers the leaderboard API with a saved real response (2026-10-18), or fails it. */
export async function mockStats(page: Page, mode: 'ok' | 'fail' = 'ok') {
  await page.route(STATS_URL, route =>
    mode === 'ok'
      ? route.fulfill({
          status: 200,
          contentType: 'application/json',
          headers: { 'access-control-allow-origin': '*' },
          body: STATS_FIXTURE,
        })
      : route.abort('failed'),
  );
}

export type SignupMock = { requests: Record<string, unknown>[]; emails: Set<string> };

/**
 * Stands in for POST /api/signup (server/signup.js), which `vite preview` doesn't serve. Like the
 * real one, a new email gets 201 {"status":"created"} and a known one 200 {"status":"exists"}.
 * `status` forces that HTTP status instead (400, 429, 500...); `abort` drops the connection.
 */
export async function mockSignup(
  page: Page,
  options: { known?: string[]; status?: number; abort?: boolean } = {},
): Promise<SignupMock> {
  const mock: SignupMock = { requests: [], emails: new Set(options.known ?? []) };
  await page.route('**/api/signup', async route => {
    const body = (route.request().postDataJSON() ?? {}) as Record<string, unknown>;
    mock.requests.push(body);
    if (options.abort) return route.abort('failed');
    if (options.status) {
      return route.fulfill({ status: options.status, contentType: 'application/json', body: '{"error":"mocked"}' });
    }
    const email = String(body.email ?? '').toLowerCase();
    const exists = mock.emails.has(email);
    mock.emails.add(email);
    return route.fulfill({
      status: exists ? 200 : 201,
      contentType: 'application/json',
      body: JSON.stringify({ status: exists ? 'exists' : 'created' }),
    });
  });
  return mock;
}

/** Waits for web fonts and the entrance animations. */
export async function settle(page: Page, ms = 2200) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

/** Scrolls through the page so every in-view animation has run, then returns to the top. */
export async function scrollThrough(page: Page) {
  const height = await page.evaluate(() => document.documentElement.scrollHeight);
  const step = await page.evaluate(() => Math.round(window.innerHeight * 0.7));
  for (let y = 0; y < height; y += step) {
    await page.evaluate(top => window.scrollTo({ top, behavior: 'instant' }), y);
    await page.waitForTimeout(250);
  }
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' }));
  await page.waitForTimeout(400);
}

export function shotPath(testInfo: TestInfo, name: string) {
  return path.join(here, '..', 'screenshots', `${testInfo.project.name}-${name}.png`);
}
