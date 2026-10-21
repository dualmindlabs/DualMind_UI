import path from 'node:path';
import { fileURLToPath } from 'node:url';

import type { BrowserContext, Page } from '@playwright/test';

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
 * The landing sections under the hero stay prerendered HTML until the visitor scrolls or
 * interacts (features/marketing/components/landing-page.tsx). A small wheel turn wakes them; this
 * resolves once they are live (the demo has taken its first turn).
 */
export async function wakeSections(page: Page) {
  await page.locator('html[data-hydrated]').waitFor({ state: 'attached' });
  await page.mouse.wheel(0, 1);
}
