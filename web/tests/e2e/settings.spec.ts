import { readFileSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, type Route, test } from '@playwright/test';

import { mockArena, SUPABASE } from './arena-mocks';
import { passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';

// Slice S12: /settings/ through the real Worker (client-only, noindex), with Supabase and the
// API answered by Playwright routes (arena-mocks.ts): the signed-out redirect, every section,
// theme and motion that persist (and really stop CSS motion), the arena reading the same
// preferences, the name and password forms, every export format downloading a file, the PDF
// print view, empty and error states, axe in both themes, phone overflow, touch targets, and the
// review screenshots.

const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };
const STRONG = 'Tabs&Spaces-2026';

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
  await page.exposeFunction('reportSettingsCsp', (text: string) => violations.push(text));
  await page.addInitScript(() => {
    document.addEventListener('securitypolicyviolation', event => {
      (window as unknown as { reportSettingsCsp: (text: string) => void }).reportSettingsCsp(
        `${event.violatedDirective} ${event.blockedURI}`,
      );
    });
  });
  return violations;
}

async function openSettings(page: Page, path = '/settings/') {
  await page.goto(path);
  await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Profile' })).toBeVisible();
}

/** Supabase's PUT /auth/v1/user (name and password changes), answered with the updated user. */
async function mockUserUpdates(page: Page) {
  const bodies: Array<Record<string, unknown>> = [];
  await page.route(`${SUPABASE}/auth/v1/user`, async (route: Route) => {
    const request = route.request();
    if (request.method() !== 'PUT') {
      await route.fallback();
      return;
    }
    const body = request.postDataJSON() as { data?: Record<string, unknown> };
    bodies.push(body);
    await route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*', 'content-type': 'application/json' },
      body: JSON.stringify({
        id: '00000000-0000-4000-8000-000000000001',
        aud: 'authenticated',
        role: 'authenticated',
        email: 'ada@example.com',
        phone: '',
        email_confirmed_at: '2026-10-01T10:00:00Z',
        app_metadata: { provider: 'email', providers: ['email'] },
        user_metadata: { full_name: 'Ada Lovelace', ...(body.data ?? {}) },
        identities: [],
        created_at: '2026-10-01T10:00:00Z',
        updated_at: new Date().toISOString(),
      }),
    });
  });
  await page.route('https://api.pwnedpasswords.com/range/*', route =>
    route.fulfill({
      status: 200,
      headers: { 'access-control-allow-origin': '*' },
      contentType: 'text/plain',
      body: '0000000000000000000000000000000000A:0',
    }),
  );
  return bodies;
}

/** Slows the messages calls down, for the progress state and its screenshot. */
async function slowMessages(page: Page, ms: number) {
  await page.route('**/api/threads/*/messages', async route => {
    await new Promise(resolve => setTimeout(resolve, ms));
    await route.fallback().catch(() => undefined);
  });
}

/** Messages that never come back in time, for cancelling (answered here, never passed on). */
async function stalledMessages(page: Page) {
  await page.route('**/api/threads/*/messages', async route => {
    await new Promise(resolve => setTimeout(resolve, 8000));
    await route
      .fulfill({ status: 200, contentType: 'application/json', body: '{"items":[]}' })
      .catch(() => undefined);
  });
}

/** Page-level horizontal overflow (scroll containers clip their own content). */
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

async function download(page: Page, format: RegExp, button: RegExp) {
  await page.getByRole('radio', { name: format }).check();
  const [file] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: button }).click(),
  ]);
  const filePath = await file.path();
  return { name: file.suggestedFilename(), text: readFileSync(filePath, 'utf8') };
}

test.describe('access', () => {
  test('signed out: /settings/ sends the visitor to sign in and back', async ({ page }) => {
    await page.goto('/settings/');
    await page.waitForURL(/\/login\/\?redirect=%2Fsettings%2F$/);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('client-only, status 200 and never indexed, with and without the slash', async ({
    request,
  }) => {
    for (const url of ['/settings/', '/settings']) {
      const response = await request.get(url, withCookie);
      expect(response.status(), url).toBe(200);
      const headers = response.headers();
      expect(headers['x-robots-tag'], url).toBe('noindex, nofollow');
      expect(headers['content-security-policy'], url).toContain("default-src 'self'");
      expect(await response.text(), url).toContain('data-spa-fallback');
    }
  });

  test('the account menu and the command palette lead here', async ({ page }) => {
    await mockArena(page);
    await page.goto('/');
    await expect(page.getByTestId('arena')).toBeVisible();
    await page.getByRole('button', { name: /^Account:/ }).click();
    await expect(page.getByRole('menuitem', { name: 'Settings' })).toHaveAttribute(
      'href',
      '/settings/',
    );
    await page.keyboard.press('Escape');
    await page.keyboard.press('Control+k');
    await page.getByRole('combobox').fill('settings');
    await expect(page.getByRole('option', { name: /Settings/ })).toBeVisible();
    await page.keyboard.press('Enter');
    await page.waitForURL(/\/settings\/$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Settings' })).toBeVisible();
  });
});

test.describe('sections', () => {
  test('every section renders, the nav jumps and marks the section, no errors', async ({
    page,
  }) => {
    const problems = collectProblems(page);
    const csp = await cspViolations(page);
    await mockArena(page);
    await openSettings(page);
    await expect(page).toHaveTitle('Settings · DualMind Arena');
    await expect(page.locator('meta[name="robots"]').first()).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    for (const name of ['Appearance', 'Arena', 'Keyboard shortcuts', 'Your data']) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeVisible();
    }
    await expect(page.getByRole('textbox', { name: 'Display name' })).toHaveValue('Ada Lovelace');
    await expect(page.getByRole('textbox', { name: 'Email' })).toHaveValue('ada@example.com');
    await expect(page.getByTestId('shortcut-table')).toHaveCount(3);
    await expect(page.getByTestId('export-count')).toContainText('6 threads');

    const nav = page.getByRole('navigation', { name: 'Settings sections' });
    await nav.getByRole('link', { name: 'Your data' }).click();
    await expect(page).toHaveURL(/#data$/);
    await expect(nav.getByRole('link', { name: 'Your data' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    // A link to a section lands on it.
    await page.goto('/settings/#shortcuts');
    await expect(
      page.getByRole('heading', { level: 2, name: 'Keyboard shortcuts' }),
    ).toBeInViewport();
    expect(problems).toEqual([]);
    expect(csp).toEqual([]);
  });
});

test.describe('preferences', () => {
  test('the theme persists and applies before the first paint', async ({ page }) => {
    await mockArena(page);
    await openSettings(page);
    const theme = page.getByRole('group', { name: 'Theme', exact: true });
    await theme.getByRole('radio', { name: 'Light' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    // The head script set it before React ran.
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await expect(theme.getByRole('radio', { name: 'Light' })).toBeChecked();
    await theme.getByRole('radio', { name: 'Dark' }).check();
    expect(await page.evaluate(() => window.localStorage.getItem('dm.theme'))).toBe('dark');
  });

  test('motion: Reduce stops CSS motion and persists; Allow overrides the OS', async ({ page }) => {
    await mockArena(page);
    await openSettings(page);
    const navLink = page
      .getByRole('navigation', { name: 'Settings sections' })
      .getByRole('link', { name: 'Profile' });
    const duration = () =>
      navLink.evaluate(element => Number.parseFloat(getComputedStyle(element).transitionDuration));
    expect(await duration()).toBeGreaterThan(0.1);

    const motion = page.getByRole('group', { name: 'Motion', exact: true });
    await motion.getByRole('radio', { name: 'Reduce' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    expect(await duration()).toBeLessThan(0.001);
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'reduce');
    expect(await duration()).toBeLessThan(0.001);

    // The OS asks for less motion; "Allow" keeps it, "System" follows the OS again.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await motion.getByRole('radio', { name: 'Allow' }).check();
    await expect(page.locator('html')).toHaveAttribute('data-motion', 'allow');
    expect(await duration()).toBeGreaterThan(0.1);
    await motion.getByRole('radio', { name: 'System' }).check();
    await expect(page.locator('html')).not.toHaveAttribute('data-motion', /.+/);
    expect(await duration()).toBeLessThan(0.001);
    await expect(motion).toContainText('Your device asks for reduced motion');
  });

  test('the arena reads the default mode, the send key and the shortcut switch', async ({
    page,
  }) => {
    const state = await mockArena(page);
    await openSettings(page);
    await page.getByRole('radio', { name: 'Direct' }).check();
    await page.getByRole('radio', { name: 'Ctrl+Enter sends' }).check();
    await page.getByRole('switch', { name: 'Use single-key shortcuts' }).click();
    await expect(page.getByText('Off', { exact: true }).first()).toBeVisible();

    await page.goto('/');
    await expect(page.getByTestId('arena')).toBeVisible();
    await expect(page.getByRole('radio', { name: 'Direct' })).toBeChecked();
    await expect(page.getByText('Ctrl+Enter to send')).toBeVisible();
    const prompt = page.getByRole('textbox', { name: 'Your prompt' });
    await prompt.fill('First line');
    await prompt.press('Enter');
    await expect(prompt).toHaveValue('First line\n');
    expect(state.requests.filter(line => /\/api\/arena\/(dualchat|chat)/.test(line))).toEqual([]);
    // Single keys are off: / no longer moves to the prompt box.
    await prompt.blur();
    await page.keyboard.press('/');
    await expect(prompt).not.toBeFocused();
  });
});

test.describe('profile', () => {
  test('saves the display name and changes the password', async ({ page }) => {
    await mockArena(page);
    const bodies = await mockUserUpdates(page);
    await openSettings(page);

    const name = page.getByRole('textbox', { name: 'Display name' });
    const save = page.getByRole('button', { name: 'Save', exact: true });
    await expect(save).toBeDisabled();
    await name.fill('');
    await save.click();
    await expect(page.getByText('Enter your name.')).toBeVisible();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await name.fill('Countess Ada');
    await save.click();
    await expect(page.getByText('Name saved')).toBeVisible();
    expect(bodies[0]).toMatchObject({ data: { full_name: 'Countess Ada' } });
    await expect(page.getByTestId('settings-identity-name')).toHaveText('Countess Ada');
    await expect(page.getByRole('button', { name: 'Account: Countess Ada' })).toBeVisible();

    await page.getByRole('button', { name: 'Change password' }).click();
    await page.getByLabel('New password', { exact: true }).fill(STRONG);
    await page.getByLabel('Confirm password', { exact: true }).fill(STRONG);
    await page.getByRole('button', { name: 'Save new password' }).click();
    await expect(page.getByText('Password changed')).toBeVisible();
    expect(bodies.at(-1)).toMatchObject({ password: STRONG });
  });

  test('signing out here goes home, not to the sign-in page', async ({ page }) => {
    await mockArena(page);
    await openSettings(page);
    await page.getByRole('button', { name: 'Sign out', exact: true }).click();
    await page.waitForURL(url => url.pathname === '/');
  });
});

test.describe('export', () => {
  test('downloads Markdown, JSON, CSV and HTML built from the API', async ({ page }) => {
    await mockArena(page);
    await openSettings(page);
    await expect(page.getByTestId('export-count')).toBeVisible();

    const markdown = await download(page, /^Markdown/, /Export as Markdown/);
    expect(markdown.name).toMatch(/^dualmind-export-\d{4}-\d{2}-\d{2}\.md$/);
    expect(markdown.text).toContain('# DualMind Arena export');
    expect(markdown.text).toContain('## 1. Explain recursion to a ten-year-old');
    expect(markdown.text).toContain('**Your verdict:** B is better');
    // The second turn was never voted on: its models stay hidden.
    expect(markdown.text).toContain('name hidden until you vote');
    await expect(page.getByTestId('export-done')).toContainText(markdown.name);
    await expect(page.getByText(`Downloaded ${markdown.name}`).first()).toBeVisible();

    const json = await download(page, /^JSON/, /Export as JSON/);
    expect(json.name).toMatch(/\.json$/);
    const parsed = JSON.parse(json.text) as { threadCount: number; threads: unknown[] };
    expect(parsed.threadCount).toBe(6);
    expect(parsed.threads).toHaveLength(6);

    const csv = await download(page, /^CSV/, /Export as CSV/);
    expect(csv.name).toMatch(/\.csv$/);
    expect(csv.text.replace(/^﻿/, '').split('\r\n')[0]).toMatch(/^thread_id,thread_title,/);

    const html = await download(page, /^HTML/, /Export as HTML/);
    expect(html.name).toMatch(/\.html$/);
    expect(html.text.startsWith('<!doctype html>')).toBe(true);
    expect(html.text).toContain('Explain recursion to a ten-year-old');
  });

  test('PDF opens the print view, and printing shows only the export', async ({ page }) => {
    await page.addInitScript(() => {
      const counter = window as unknown as { printCalls: number };
      counter.printCalls = 0;
      window.print = () => {
        counter.printCalls += 1;
      };
    });
    await mockArena(page);
    await openSettings(page);
    await page.getByRole('radio', { name: /^PDF/ }).check();
    await page.getByRole('button', { name: 'Open the print view' }).click();
    await expect(page.getByTestId('export-done')).toContainText('Save as PDF');
    await expect
      .poll(() => page.evaluate(() => (window as unknown as { printCalls: number }).printCalls))
      .toBe(1);
    await expect(page.getByTestId('print-export')).toBeHidden();
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByTestId('print-export')).toBeVisible();
    await expect(page.getByTestId('settings-page')).toBeHidden();
    await expect(page.getByTestId('print-export')).toContainText(
      'Explain recursion to a ten-year-old',
    );
    await page.screenshot({ path: shotPath('settings-print'), fullPage: true });
    await page.emulateMedia({ media: 'screen' });
    await page.getByRole('button', { name: 'Close the print view' }).click();
    await expect(page.getByTestId('print-export')).toHaveCount(0);
  });

  test('a failed export says what happened and offers a retry', async ({ page }) => {
    await mockArena(page, { failThreads: true });
    await openSettings(page);
    await page.getByRole('button', { name: /Export as Markdown/ }).click();
    await expect(page.getByTestId('export-error')).toBeVisible({ timeout: 20_000 });
    await expect(page.getByTestId('export-error')).toContainText('Nothing was downloaded');
    await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  });

  test('with no threads there is nothing to export', async ({ page }) => {
    await mockArena(page, { threads: [] });
    await openSettings(page);
    await expect(page.getByTestId('export-empty')).toBeVisible();
    await expect(page.getByRole('button', { name: /Export as Markdown/ })).toBeDisabled();
  });

  test('a running export shows its progress and can be cancelled', async ({ page }) => {
    await mockArena(page);
    await stalledMessages(page);
    await openSettings(page);
    await page.getByRole('button', { name: /Export as Markdown/ }).click();
    await expect(page.getByRole('progressbar', { name: 'Export progress' })).toBeVisible();
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.getByText('Export cancelled. Nothing was downloaded.')).toBeVisible();
  });
});

test.describe('quality', () => {
  for (const theme of ['dark', 'light'] as const) {
    test(`axe: no serious or critical violations, ${theme}`, async ({ page }) => {
      await storeTheme(page, theme);
      await mockArena(page);
      await openSettings(page);
      await settle(page, 500);
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
        .analyze();
      const blocking = results.violations
        .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
        .map(
          violation =>
            `${violation.id}: ${violation.nodes
              .map(node => node.target.join(' '))
              .slice(0, 3)
              .join(', ')}`,
        );
      expect(blocking).toEqual([]);
    });
  }

  test('no horizontal overflow at 320 px', async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 720 });
    await mockArena(page);
    await openSettings(page);
    expect(await overflowing(page)).toEqual([]);
    await page.getByRole('button', { name: 'Change password' }).click();
    expect(await overflowing(page)).toEqual([]);
  });
});

test.describe('touch', () => {
  test.use({ hasTouch: true, isMobile: true, viewport: { width: 390, height: 844 } });

  test('every control in the page has a 44 px target on a touch screen', async ({ page }) => {
    await mockArena(page);
    await openSettings(page);
    const coarse = await page.evaluate(() => window.matchMedia('(pointer: coarse)').matches);
    test.skip(!coarse, 'This browser does not report a coarse pointer.');
    const small = await page.evaluate(() => {
      const main = document.querySelector('main');
      if (!main) return ['no main'];
      const controls = main.querySelectorAll<HTMLElement>(
        'a[href], button, input:not([type="radio"]):not([type="hidden"]), summary, [role="switch"], label:has(> input[type="radio"])',
      );
      return [...controls]
        .filter(element => {
          const style = getComputedStyle(element);
          // Links inside a sentence are exempt (WCAG 2.5.8, inline targets).
          if (style.display === 'inline') return false;
          // The hidden form inputs of Base UI controls (the switch) are not targets.
          if (element.closest('[aria-hidden="true"]')) return false;
          if (element instanceof HTMLInputElement && element.tabIndex < 0) return false;
          const box = element.getBoundingClientRect();
          if (box.width === 0 && box.height === 0) return false;
          const target = getComputedStyle(element, '::before');
          const extra = target.content !== 'none' && target.position === 'absolute';
          const width = Math.max(box.width, extra ? Number.parseFloat(target.width) || 0 : 0);
          const height = Math.max(box.height, extra ? Number.parseFloat(target.height) || 0 : 0);
          return Math.min(width, height) < 43.5;
        })
        .map(element => `${element.tagName.toLowerCase()} "${(element.textContent ?? '').trim().slice(0, 30)}"`);
    });
    expect(small).toEqual([]);
  });
});

test.describe('screenshots', () => {
  const viewports = [
    { label: 'desktop', width: 1440, height: 900 },
    { label: 'mobile', width: 390, height: 844 },
  ] as const;
  for (const viewport of viewports) {
    for (const theme of ['dark', 'light'] as const) {
      test(`settings: ${viewport.label}, ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await mockArena(page);
        await openSettings(page);
        await expect(page.getByTestId('export-count')).toBeVisible();
        await settle(page, 600);
        await page.screenshot({ path: shotPath(`settings-${viewport.label}-${theme}`) });
        await page.screenshot({
          path: shotPath(`settings-full-${viewport.label}-${theme}`),
          fullPage: true,
        });
        await page
          .getByRole('navigation', { name: 'Settings sections' })
          .getByRole('link', { name: 'Appearance' })
          .click();
        await settle(page, 500);
        await page.screenshot({ path: shotPath(`settings-appearance-${viewport.label}-${theme}`) });
        await page
          .getByRole('navigation', { name: 'Settings sections' })
          .getByRole('link', { name: 'Your data' })
          .click();
        await settle(page, 500);
        await page.screenshot({ path: shotPath(`settings-data-${viewport.label}-${theme}`) });
      });
    }
  }

  test('settings: states (password form, export progress, done, error, empty), desktop dark', async ({
    page,
  }) => {
    await storeTheme(page, 'dark');
    await mockArena(page);
    await mockUserUpdates(page);
    await slowMessages(page, 700);
    await openSettings(page);
    await page.getByRole('button', { name: 'Change password' }).click();
    await page.getByLabel('New password', { exact: true }).fill('short');
    await settle(page, 300);
    await page.getByRole('heading', { level: 3, name: 'Password' }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: shotPath('settings-password-desktop-dark') });

    const exportCard = page.getByTestId('export-card');
    await exportCard.scrollIntoViewIfNeeded();
    const [file] = await Promise.all([
      page.waitForEvent('download'),
      (async () => {
        await page.getByRole('button', { name: /Export as Markdown/ }).click();
        await expect(page.getByRole('progressbar', { name: 'Export progress' })).toBeVisible();
        await page.waitForTimeout(900);
        await exportCard.screenshot({ path: shotPath('settings-export-progress-desktop-dark') });
      })(),
    ]);
    expect(file.suggestedFilename()).toMatch(/\.md$/);
    await expect(page.getByTestId('export-done')).toBeVisible();
    await settle(page, 300);
    await exportCard.screenshot({ path: shotPath('settings-export-done-desktop-dark') });
  });

  test('settings: export error and empty states, desktop', async ({ page }) => {
    await storeTheme(page, 'dark');
    await mockArena(page, { failThreads: true });
    await openSettings(page);
    await page.getByRole('button', { name: /Export as Markdown/ }).click();
    await expect(page.getByTestId('export-error')).toBeVisible({ timeout: 20_000 });
    await page.getByTestId('export-card').scrollIntoViewIfNeeded();
    await settle(page, 300);
    await page.getByTestId('export-card').screenshot({
      path: shotPath('settings-export-error-desktop-dark'),
    });

    await page.unrouteAll({ behavior: 'ignoreErrors' });
    await storeTheme(page, 'light');
    await mockArena(page, { threads: [] });
    await openSettings(page);
    await expect(page.getByTestId('export-empty')).toBeVisible();
    await page.getByTestId('export-card').scrollIntoViewIfNeeded();
    await settle(page, 300);
    await page.getByTestId('export-card').screenshot({
      path: shotPath('settings-export-empty-desktop-light'),
    });
  });
});
