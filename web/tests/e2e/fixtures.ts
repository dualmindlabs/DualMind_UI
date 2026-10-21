import { expect, test as base } from '@playwright/test';

export { expect };

/**
 * `test` with one change: `page.goto` also waits for the app to hydrate (`<html data-hydrated>`,
 * set by src/app/root.tsx). Prerendered pages start their JavaScript after the first paint
 * (scripts/defer-hydration.js), so a click right after `load` would reach plain HTML. Pages
 * whose scripts a test blocks, and pages that are not part of the web app, never get the
 * attribute; the wait gives up after a few seconds and the test goes on.
 */
export const test = base.extend({
  page: async ({ page }, run) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      await page
        .locator('html[data-hydrated]')
        .waitFor({ state: 'attached', timeout: 4_000 })
        .catch(() => undefined);
      return response;
    };
    await run(page);
  },
});
