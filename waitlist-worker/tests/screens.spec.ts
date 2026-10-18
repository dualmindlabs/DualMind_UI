import { expect, test } from '@playwright/test';
import { mockStats, scrollThrough, settle, shotPath } from './helpers';

// Screenshots for review, at desktop (1440x900) and mobile (360x780) sizes.
test.beforeEach(async ({ page }) => {
  await mockStats(page);
});

test('hero', async ({ page }, testInfo) => {
  await page.goto('/?ref=arena');
  await settle(page, 3200);
  await page.screenshot({ path: shotPath(testInfo, '01-hero') });
});

test('signup states: success, duplicate, invalid', async ({ page }, testInfo) => {
  await page.goto('/');
  await settle(page);
  const input = page.getByLabel('Email address');

  await input.fill('ada@example.com');
  await input.press('Enter');
  await expect(page.getByTestId('signup-success')).toBeVisible();
  await page.waitForTimeout(500);
  await page.screenshot({ path: shotPath(testInfo, '03-success') });

  await page.reload();
  await settle(page);
  await input.fill('ada@example.com');
  await input.press('Enter');
  await expect(page.locator('#signup-status')).toContainText('already on the list');
  await page.screenshot({ path: shotPath(testInfo, '04-duplicate') });

  await input.fill('ada@');
  await input.press('Enter');
  await expect(page.locator('#signup-status')).toContainText('Enter a valid email address');
  await page.screenshot({ path: shotPath(testInfo, '05-error') });
});

test('reduced motion', async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await settle(page, 1500);
  await page.screenshot({ path: shotPath(testInfo, '06-reduced-motion') });
});

test('battle demo after a vote, and the live leaderboard', async ({ page }, testInfo) => {
  await page.goto('/');
  await settle(page, 800);
  const battle = page.getByTestId('battle');
  await battle.scrollIntoViewIfNeeded();
  // Let both answers stream in, then vote.
  await page.waitForTimeout(6500);
  await page.getByRole('button', { name: 'B is better' }).click();
  await page.waitForTimeout(1800);
  await battle.screenshot({ path: shotPath(testInfo, '08-battle') });

  const board = page.locator('#leaderboard');
  await board.scrollIntoViewIfNeeded();
  await page.waitForTimeout(2800);
  await board.screenshot({ path: shotPath(testInfo, '09-leaderboard') });
});

test('nothing is wider than the screen, and the model marquee shows', async ({ page }, testInfo) => {
  await page.goto('/');
  await settle(page, 1500);
  const report = await page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const clipped = (el: Element) => {
      for (let node = el.parentElement; node && node !== document.body; node = node.parentElement) {
        if (getComputedStyle(node).overflowX !== 'visible') return true;
      }
      return false;
    };
    const tooWide = Array.from(document.querySelectorAll('body *'))
      .filter(el => el.getBoundingClientRect().right > width + 0.5 && !clipped(el))
      .slice(0, 12)
      .map(el => `${el.tagName.toLowerCase()}[${String(el.getAttribute('class')).slice(0, 80)}] right=${el.getBoundingClientRect().right.toFixed(1)}`);
    // Elements whose content spills sideways without being clipped, deepest last.
    const spilling = Array.from(document.querySelectorAll('body *'))
      .filter(el => el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX === 'visible' && el.clientWidth > 0)
      .slice(-12)
      .map(el => `${el.tagName.toLowerCase()}[${String(el.getAttribute('class')).slice(0, 70)}] ${el.clientWidth}->${el.scrollWidth}`);
    // Hide each top-level block in turn to see which one makes the page wider.
    const blocks = [
      ...Array.from(document.querySelectorAll('#root > *')),
      ...Array.from(document.querySelectorAll('main > *')),
    ] as HTMLElement[];
    const overflowing = document.documentElement.scrollWidth > width;
    const culprits = (overflowing ? blocks : [])
      .map(block => {
        const before = block.style.display;
        block.style.display = 'none';
        const without = document.documentElement.scrollWidth;
        block.style.display = before;
        return { block, without };
      })
      .filter(({ without }) => without <= width)
      .map(({ block }) => `${block.tagName.toLowerCase()}#${block.id}[${String(block.getAttribute('class')).slice(0, 50)}]`);
    // Then walk down from the first culprit to the element that causes it.
    const path: string[] = [];
    let node: Element | undefined = culprits.length ? blocks.find(block => culprits[0].startsWith(block.tagName.toLowerCase() + '#' + block.id)) : undefined;
    for (let depth = 0; node && depth < 25; depth++) {
      const style = getComputedStyle(node);
      path.push(`${node.tagName.toLowerCase()}[${String(node.getAttribute('class')).slice(0, 40)}] pos=${style.position} right=${node.getBoundingClientRect().right.toFixed(1)}`);
      const next: Element | undefined = Array.from(node.children).find(child => {
        const el = child as HTMLElement;
        const before = el.style.display;
        el.style.display = 'none';
        const fixed = document.documentElement.scrollWidth <= width;
        el.style.display = before;
        return fixed;
      });
      node = next;
    }
    const canvas = document.createElement('canvas');
    return {
      culprits,
      path,
      width,
      scrollWidth: document.documentElement.scrollWidth,
      tooWide,
      spilling,
      webgl2: !!canvas.getContext('webgl2'),
      heroCanvases: document.querySelectorAll('section canvas').length,
    };
  });
  console.log(`[${testInfo.project.name}] ${JSON.stringify(report, null, 1)}`);
  const marquee = page.getByRole('region', { name: 'Models in DualMind Arena' });
  expect((await marquee.boundingBox())?.height ?? 0).toBeGreaterThan(16);
  expect(report.scrollWidth, report.tooWide.join('\n')).toBeLessThanOrEqual(report.width);
});

// Full-page captures at 1x: Chromium's software renderer can't capture taller than 8192 device
// pixels, and the mobile page at 2x would be about 12000.
test.describe('full page', () => {
  test.use({ deviceScaleFactor: 1 });

  test('full page', async ({ page }, testInfo) => {
    await page.goto('/?ref=arena');
    await settle(page, 2500);
    await scrollThrough(page);
    // The demo answers stream for about six seconds once scrolled into view.
    await page.waitForTimeout(5000);
    await page.screenshot({ path: shotPath(testInfo, '02-full'), fullPage: true });
  });

  test('full page, reduced motion', async ({ page }, testInfo) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await settle(page, 1500);
    await scrollThrough(page);
    await page.screenshot({ path: shotPath(testInfo, '07-reduced-motion-full'), fullPage: true });
  });
});
