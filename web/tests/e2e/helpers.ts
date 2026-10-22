import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { expect, type BrowserContext, type Page } from '@playwright/test';

const here = path.dirname(fileURLToPath(import.meta.url));

/** worker.js lets requests with this cookie past the waitlist gate (FORCE_WAITLIST). */
export const PREVIEW_COOKIE = 'dm_preview=1';

export async function passGate(context: BrowserContext, baseURL: string) {
  await context.addCookies([{ name: 'dm_preview', value: '1', url: baseURL }]);
}

/** Stores a theme choice before any page script runs, like a returning visitor's. */
export async function storeTheme(page: Page, theme: 'dark' | 'light' | 'system') {
  await page.addInitScript(value => window.localStorage.setItem('dm.theme', value), theme);
}

/** Waits for web fonts and the entrance animations (hero 0.9 s + delays, emblem 1.4 s). */
export async function settle(page: Page, ms = 1800) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

export function shotPath(name: string) {
  return path.join(here, '..', '..', 'screenshots', `${name}.png`);
}

/**
 * A screenshot for review. Full-page captures show the sticky site header wherever the page was
 * scrolled to (audit P2-10), which misleads reviewers: for the capture the header sits in the
 * flow at the top instead. Fold shots (not `fullPage`) are taken as they are.
 */
export async function fullPageShot(page: Page, options: Parameters<Page['screenshot']>[0]) {
  if (!options?.fullPage) return page.screenshot(options);
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  try {
    return await page.screenshot(options);
  } finally {
    await handle.evaluate(node => (node as Element).remove());
  }
}

/** The arena's history is an on-demand slide-over (never docked): open it from the header. */
export async function openHistory(page: Page) {
  await page.getByRole('button', { name: 'Open the history' }).click();
  await expect(page.getByRole('dialog', { name: 'History' })).toBeVisible();
}
