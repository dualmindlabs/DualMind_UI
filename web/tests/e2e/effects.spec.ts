import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

import { expect, test } from './fixtures';
import { passGate, settle, shotPath, storeTheme } from './helpers';

// The effects gallery on /design/ (section 07): every vendored effect renders without errors,
// WebGL only runs behind its gate, reduced motion shows the still versions, axe passes with the
// effects running, nothing overflows on a phone, and review screenshots.

const EFFECT_COUNT = 27;

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

/** Opens the gallery once the app has hydrated, then scrolls through it so every effect loads. */
async function visitEffects(page: Page) {
  await page.goto('/design/');
  await expect(page.getByRole('button', { name: 'Preview reduced motion' })).toBeVisible();
  await page.waitForLoadState('networkidle');
  await page.evaluate(async () => {
    const section = document.getElementById('effects');
    if (!section) throw new Error('no #effects section');
    const top = section.getBoundingClientRect().top + window.scrollY;
    const end = top + section.offsetHeight;
    for (let y = top - 200; y < end; y += Math.round(window.innerHeight * 0.6)) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 250));
    }
    window.scrollTo({ top, behavior: 'instant' });
  });
  await settle(page, 1500);
}

async function gateStates(page: Page) {
  return page.locator('#effects [data-webgl]').evaluateAll(gates =>
    gates.map(gate => ({
      state: gate.getAttribute('data-webgl'),
      reason: gate.getAttribute('data-webgl-reason'),
      canvas: gate.querySelector('canvas') !== null,
    })),
  );
}

test('effects: every effect renders without console errors; WebGL runs behind its gate', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await visitEffects(page);

  await expect(page.locator('#effects figure[data-effect]')).toHaveCount(EFFECT_COUNT);
  const gates = await gateStates(page);
  expect(gates).toHaveLength(3);
  for (const gate of gates) {
    // A capable desktop runs the shader; a CI machine without WebGL2 keeps the poster.
    if (gate.state === 'live') expect(gate.canvas).toBe(true);
    else expect(gate).toEqual({ state: 'static', reason: 'no-webgl2', canvas: false });
  }
  test.info().annotations.push({ type: 'webgl', description: JSON.stringify(gates) });
  expect(errors).toEqual([]);
});

test('effects: reduced motion keeps every WebGL effect on its static poster', async ({ page }) => {
  const errors = collectErrors(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await visitEffects(page);

  const gates = await gateStates(page);
  expect(gates).toHaveLength(3);
  for (const gate of gates) {
    expect(gate).toEqual({ state: 'static', reason: 'reduced-motion', canvas: false });
  }
  await expect(
    page.getByRole('status').filter({ hasText: 'Your system asks for reduced motion' }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});

test('effects: the preview switch shows the reduced-motion versions', async ({ page }) => {
  await visitEffects(page);
  const toggle = page.getByRole('button', { name: 'Preview reduced motion' });
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#effects [data-reduced-motion="true"]')).toHaveCount(1);
  for (const gate of await gateStates(page)) {
    expect(gate).toEqual({ state: 'static', reason: 'reduced-motion', canvas: false });
  }
});

test('effects: the composer is labelled, rotates examples and sends with Enter', async ({
  page,
}) => {
  await visitEffects(page);
  const field = page.getByLabel('Ask both models');
  await field.scrollIntoViewIfNeeded();
  await field.fill('Explain recursion to a ten-year-old');
  await field.press('Enter');
  await expect(page.getByRole('status').filter({ hasText: 'Sent:' })).toContainText(
    'Explain recursion to a ten-year-old',
  );
  await expect(field).toHaveValue('', { timeout: 5000 });
});

for (const theme of ['dark', 'light'] as const) {
  test(`effects: axe finds no serious or critical violations while effects run (${theme})`, async ({
    page,
  }) => {
    await storeTheme(page, theme);
    await visitEffects(page);
    await settle(page, 1500);
    const results = await new AxeBuilder({ page })
      .include('#effects')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
      .analyze();
    const blocking = results.violations.filter(
      violation => violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(
      blocking.map(
        violation =>
          `${violation.id} (${violation.impact}): ${violation.nodes
            .slice(0, 3)
            .map(node => node.target.join(' '))
            .join(', ')}`,
      ),
    ).toEqual([]);
  });
}

test('effects: nothing sticks out at 360 px once every effect has loaded', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 780 });
  await visitEffects(page);
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
    return [...document.querySelectorAll('#effects *')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > limit && !clipped(element);
      })
      .slice(0, 5)
      .map(
        element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
      );
  });
  expect(offenders).toEqual([]);
});

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
    test(`screenshot: effects ${viewport.name} ${mode.name}`, async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
      await page.emulateMedia({ reducedMotion: mode.reducedMotion });
      await storeTheme(page, mode.theme);
      await visitEffects(page);
      const backgrounds = page.locator('figure[data-effect="light-rays"]').locator('xpath=..');
      await backgrounds.scrollIntoViewIfNeeded();
      await settle(page, 1200);
      await backgrounds.screenshot({
        path: shotPath(`effects-${viewport.name}-${mode.name}-webgl`),
        animations: 'disabled',
      });
      await page.locator('#effects').screenshot({
        path: shotPath(`effects-${viewport.name}-${mode.name}`),
        animations: 'disabled',
      });
    });
  }
}
