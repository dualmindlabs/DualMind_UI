import AxeBuilder from '@axe-core/playwright';
import { expect, type Page, test } from '@playwright/test';

import { credits } from '../../src/content/credits';
import { passGate, PREVIEW_COOKIE, settle, shotPath, storeTheme } from './helpers';

// The info, legal and 404 pages (slice S4) in Chromium, through the real Worker: prerendered
// content without JavaScript, SEO tags, console and CSP errors, axe in both themes, overflow,
// the table of contents, FAQ deep links, the 404 status, sitemap and screenshots.

const withCookie = { headers: { Cookie: PREVIEW_COOKIE }, maxRedirects: 0 };

interface PageSpec {
  slug: string;
  path: string;
  title: string;
  h1: string;
  /** Text that must be in the prerendered HTML. */
  text: string;
}

const pages: PageSpec[] = [
  {
    slug: 'about',
    path: '/about/',
    title: 'About DualMind Arena',
    h1: 'Compare AI models, blind.',
    text: 'Why blind comparison',
  },
  {
    slug: 'credits',
    path: '/credits/',
    title: 'Credits and licenses · DualMind Arena',
    h1: 'Built on the work of others.',
    text: 'Sources and licenses',
  },
  {
    slug: 'how-it-works',
    path: '/how-it-works/',
    title: 'How DualMind Arena works',
    h1: 'Ask. Compare. You decide.',
    text: 'How votes become a rating',
  },
  {
    slug: 'faq',
    path: '/faq/',
    title: 'Frequently asked questions · DualMind Arena',
    h1: 'Questions, answered.',
    text: 'Do I need an account?',
  },
  {
    slug: 'privacy',
    path: '/privacy/',
    title: 'Privacy Policy · DualMind Arena',
    h1: 'Privacy, in plain words.',
    text: 'What we collect',
  },
  {
    slug: 'terms',
    path: '/terms/',
    title: 'Terms of Service · DualMind Arena',
    h1: 'Terms of Service, plainly.',
    text: 'Acceptable use',
  },
  {
    slug: 'cookies',
    path: '/cookies/',
    title: 'Cookie Policy · DualMind Arena',
    h1: 'Cookies, almost none.',
    text: 'Browser storage we use instead',
  },
];

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

/** Scrolls through the page so the in-view entrances run, then back to the top. */
async function scrollThrough(page: Page) {
  await page.evaluate(async () => {
    const step = Math.max(300, Math.floor(window.innerHeight * 0.7));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      window.scrollTo({ top: y, behavior: 'instant' });
      await new Promise(resolve => setTimeout(resolve, 120));
    }
    window.scrollTo({ top: 0, behavior: 'instant' });
  });
  await page.waitForTimeout(900);
}

async function blockingViolations(page: Page) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();
  return results.violations
    .filter(violation => violation.impact === 'serious' || violation.impact === 'critical')
    .map(
      violation =>
        `${violation.id} (${violation.impact}): ${violation.nodes
          .slice(0, 3)
          .map(node => node.target.join(' '))
          .join(', ')}`,
    );
}

async function overflowing(page: Page) {
  return page.evaluate(() => {
    const limit = document.documentElement.clientWidth + 0.5;
    const clipped = (element: Element) => {
      for (let parent = element.parentElement; parent; parent = parent.parentElement) {
        if (parent === document.body || parent === document.documentElement) return false;
        const { overflowX } = getComputedStyle(parent);
        if (overflowX === 'hidden' || overflowX === 'clip') return true;
      }
      return false;
    };
    return [...document.querySelectorAll('body *')]
      .filter(element => {
        const box = element.getBoundingClientRect();
        return box.width > 0 && box.right > limit && !clipped(element);
      })
      .slice(0, 5)
      .map(
        element => `${element.tagName.toLowerCase()}.${element.className.toString().slice(0, 60)}`,
      );
  });
}

for (const spec of pages) {
  test.describe(spec.path, () => {
    test('is prerendered HTML with its SEO tags and content', async ({ request }) => {
      const response = await request.get(spec.path, withCookie);
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('text/html');
      expect(response.headers()['x-robots-tag']).toBeUndefined();
      expect(response.headers()['cache-control']).toBe('no-cache');
      const html = await response.text();
      expect(html).toContain(`<title>${spec.title}</title>`);
      expect(html).toMatch(/<meta name="description" content="[^"]{40,}"/);
      expect(html).toMatch(/<meta name="robots" content="index, follow"\/?>/);
      expect(html).toContain(
        `<link rel="canonical" href="https://arena.dualmindlab.tech${spec.path}"`,
      );
      expect(html).toContain('property="og:title"');
      expect(html).toContain(
        'property="og:image" content="https://arena.dualmindlab.tech/og-default.png"',
      );
      expect(html).toContain('name="twitter:card" content="summary_large_image"');
      expect(html).toContain(spec.text);
      expect(html).toContain('class="human-voice');
    });

    test('shows its content with JavaScript blocked', async ({ page }) => {
      await page.route('**/assets/*.js', route => route.abort());
      await page.goto(spec.path);
      const heading = page.getByRole('heading', { level: 1 });
      await expect(heading).toBeVisible();
      if (spec.h1) await expect(heading).toHaveText(spec.h1);
      await expect(page.locator('main')).toContainText(spec.text);
      // Nothing waits for scripts to become visible: no section is faded out.
      expect(await page.locator('[data-reveal="hidden"]').count()).toBe(0);
    });

    test('loads without console or CSP errors and hydrates', async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(spec.path);
      await settle(page, 600);
      await scrollThrough(page);
      await page
        .getByRole('banner')
        .getByRole('button', { name: /^Search/ })
        .first()
        .click();
      await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
      await page.keyboard.press('Escape');
      expect(errors).toEqual([]);
    });

    for (const theme of ['dark', 'light'] as const) {
      test(`axe: no serious or critical violations (${theme})`, async ({ page }) => {
        await page.emulateMedia({ reducedMotion: 'reduce' });
        await storeTheme(page, theme);
        await page.goto(spec.path);
        await settle(page, 500);
        await scrollThrough(page);
        expect(await blockingViolations(page)).toEqual([]);
      });
    }

    test('no horizontal overflow at 360 px', async ({ page }) => {
      await page.setViewportSize({ width: 360, height: 780 });
      await page.goto(spec.path);
      await settle(page, 400);
      expect(await overflowing(page)).toEqual([]);
    });

    for (const viewport of [
      { name: 'desktop', width: 1440, height: 900 },
      { name: 'mobile', width: 390, height: 844 },
    ]) {
      for (const theme of ['dark', 'light'] as const) {
        test(`screenshot: ${viewport.name} ${theme}`, async ({ page }) => {
          await page.setViewportSize({ width: viewport.width, height: viewport.height });
          await storeTheme(page, theme);
          await page.goto(spec.path);
          await settle(page);
          await page.screenshot({
            path: shotPath(`info-${spec.slug}-${viewport.name}-${theme}-fold`),
            animations: 'disabled',
          });
          await scrollThrough(page);
          await page.screenshot({
            path: shotPath(`info-${spec.slug}-${viewport.name}-${theme}-full`),
            fullPage: true,
            animations: 'disabled',
          });
        });
      }
    }
  });
}

test.describe('About', () => {
  test('is a company page: mission, how it is run, open source, contact, no license wall', async ({
    page,
  }) => {
    await page.goto('/about/');
    for (const name of [
      'What it is',
      'Why blind comparison matters',
      'How the project is run',
      'What is open source',
      'Get in touch',
    ]) {
      await expect(page.getByRole('heading', { level: 2, name })).toBeAttached();
    }
    await expect(page.locator('#credits')).toHaveCount(0);
    const main = page.locator('main');
    await expect(main).not.toContainText('.NET');
    await expect(main.getByRole('link', { name: 'Credits' })).toHaveAttribute('href', '/credits/');
    await expect(main.getByRole('link', { name: 'GitHub', exact: true })).toHaveAttribute(
      'href',
      'https://github.com/dualmindlabs/DualMind_UI',
    );
    await expect(main.getByRole('link', { name: 'support@dualmindlab.tech' })).toHaveAttribute(
      'href',
      'mailto:support@dualmindlab.tech',
    );
  });
});

test.describe('Credits', () => {
  test('lists every credit with its license (the license policy)', async ({ page }) => {
    await page.goto('/credits/');
    const section = page.locator('#credits');
    await expect(section.getByRole('listitem')).toHaveCount(credits.length);
    for (const name of ['React Bits', 'Magic UI', 'Aceternity UI', 'Motion Primitives', 'Lucide']) {
      await expect(section.getByRole('link', { name: new RegExp(`^${name}`) })).toHaveAttribute(
        'href',
        /^https:\/\//,
      );
    }
    await expect(section.getByRole('link', { name: /MIT \+ Commons Clause/ })).toBeVisible();
  });

  test('the footer links to it, and it is in the sitemap', async ({ page, request }) => {
    await page.goto('/about/');
    await expect(
      page.getByRole('contentinfo').getByRole('link', { name: 'Credits', exact: true }),
    ).toHaveAttribute('href', '/credits/');
    const xml = await (await request.get('/sitemap.xml', withCookie)).text();
    expect(xml).toContain('<loc>https://arena.dualmindlab.tech/credits/</loc>');
    expect(xml).not.toContain('/login/');
    expect(xml).not.toContain('/signup/');
    expect(xml).toMatch(/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/);
  });
});

test.describe('Footer', () => {
  test('has GitHub, Contact and Credits, one tagline, and no Status link', async ({ page }) => {
    await page.goto('/about/');
    const footer = page.getByRole('contentinfo');
    await expect(footer.getByRole('link', { name: 'GitHub' })).toHaveAttribute(
      'href',
      'https://github.com/dualmindlabs/DualMind_UI',
    );
    await expect(footer.getByRole('link', { name: 'Contact' })).toHaveAttribute(
      'href',
      'mailto:support@dualmindlab.tech',
    );
    await expect(footer.getByRole('link', { name: 'Credits' })).toHaveAttribute(
      'href',
      '/credits/',
    );
    await expect(footer.getByRole('link', { name: 'Status' })).toHaveCount(0);
    await expect(footer).not.toContainText('one verdict');
    await expect(footer).toContainText('Blind battles between AI models, ranked by votes.');
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    for (const theme of ['dark', 'light'] as const) {
      test(`screenshot: footer ${viewport.name} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await page.goto('/about/');
        await settle(page, 600);
        const footer = page.getByRole('contentinfo');
        await footer.scrollIntoViewIfNeeded();
        expect(await overflowing(page)).toEqual([]);
        await footer.screenshot({
          path: shotPath(`info-footer-${viewport.name}-${theme}`),
          animations: 'disabled',
        });
      });
    }
  }
});

test.describe('How it works', () => {
  test('has the flow diagram, the timeline and the #rating section', async ({ page }) => {
    await page.goto('/how-it-works/');
    await expect(page.getByText('Answer A', { exact: true })).toBeVisible();
    await expect(page.getByText('Answer B', { exact: true })).toBeVisible();
    await expect(
      page.locator('ol').filter({ hasText: 'Compare two anonymous answers' }),
    ).toBeVisible();
    await expect(page.getByText('Step 4')).toBeAttached();
    await expect(page.locator('section#rating')).toBeAttached();
  });

  test('/how-it-works/#rating lands on the rating explanation', async ({ page }) => {
    await page.goto('/how-it-works/#rating');
    await settle(page, 600);
    const heading = page.getByRole('heading', { level: 2, name: 'How votes become a rating' });
    await expect(heading).toBeInViewport();
    await expect(page.getByText('E(A) = 1 / (1 + 10^((Rb - Ra) / 400))')).toBeVisible();
  });

  test('the timeline is static under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/how-it-works/');
    await settle(page, 300);
    await expect(page.getByText('Step 1')).toBeVisible();
    expect(await page.locator('[data-reveal]:not([data-reveal="static"])').count()).toBe(0);
  });
});

test.describe('FAQ', () => {
  const question = 'Do I need an account?';

  test('every answer is in the prerendered HTML, with FAQPage JSON-LD', async ({ request }) => {
    const html = await (await request.get('/faq/', withCookie)).text();
    expect(html).toContain('Signing up needs an email address');
    expect(html).toContain('id="do-i-need-an-account"');
    const match = html.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/);
    expect(match).not.toBeNull();
    const data = JSON.parse(match?.[1] ?? '{}') as {
      '@type': string;
      mainEntity: { name: string; acceptedAnswer: { text: string } }[];
    };
    expect(data['@type']).toBe('FAQPage');
    expect(data.mainEntity.length).toBeGreaterThan(8);
    expect(data.mainEntity.map(item => item.name)).toContain(question);
  });

  test('opens a question by click and keyboard', async ({ page }) => {
    await page.goto('/faq/');
    await settle(page, 400);
    const trigger = page.getByRole('button', { name: question });
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
    await trigger.click();
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(page.getByText('Signing up needs an email address')).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(trigger).toHaveAttribute('aria-expanded', 'false');
  });

  test('a #hash opens that question and focus lands on it', async ({ page }) => {
    await page.goto('/faq/#do-i-need-an-account');
    const trigger = page.getByRole('button', { name: question });
    await expect(trigger).toHaveAttribute('aria-expanded', 'true');
    await expect(trigger).toBeFocused();
    await expect(trigger).toBeInViewport();
    await expect(page.getByText('Signing up needs an email address')).toBeVisible();

    // Following another deep link on the same page opens that one too.
    await page.evaluate(() => {
      window.location.hash = '#why-are-the-models-anonymous';
    });
    const second = page.getByRole('button', { name: 'Why are the models anonymous?' });
    await expect(second).toHaveAttribute('aria-expanded', 'true');
    await expect(second).toBeFocused();
  });
});

test.describe('Legal pages', () => {
  test('summary, last updated date and the sections in order', async ({ page }) => {
    await page.goto('/privacy/');
    await expect(page.getByRole('note').first()).toContainText('We do not use analytics');
    await expect(page.getByText('Last updated')).toBeVisible();
    await expect(page.locator('time')).toHaveAttribute('datetime', '2026-10-20');
    await expect(page.locator('time')).toHaveText('20 October 2026');
    // Legal pages have no entrance effects.
    expect(await page.locator('[data-reveal]').count()).toBe(0);
    expect(await page.locator('canvas').count()).toBe(0);
  });

  test('desktop: the table of contents is sticky, highlights the section and jumps', async ({
    page,
  }) => {
    await page.goto('/privacy/');
    await settle(page, 400);
    const nav = page.locator('nav[aria-label="On this page"]:visible');
    await expect(nav).toHaveCount(1);
    const links = nav.getByRole('link');
    const total = await links.count();
    expect(total).toBeGreaterThan(8);

    await links.nth(2).click();
    await expect(page).toHaveURL(/#what-we-do-not-collect$|#how-we-use-it$|#[a-z-]+$/);
    const target = (await links.nth(2).getAttribute('href')) ?? '';
    await expect(page.locator(target)).toBeInViewport();
    await expect(nav.locator('a[aria-current="location"]')).toHaveAttribute('href', target);

    // The list stays in view while the page scrolls.
    await expect(nav).toBeInViewport();

    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(nav.locator('a[aria-current="location"]')).toHaveAttribute(
      'href',
      (await links.last().getAttribute('href')) ?? '',
    );
  });

  test('phone: the table of contents is collapsed and jumps to a section', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/terms/');
    await settle(page, 400);
    const details = page.locator('details').filter({ hasText: 'On this page' });
    await expect(details).toBeVisible();
    await expect(details).not.toHaveAttribute('open', '');
    await details.getByText('On this page').click();
    await expect(details).toHaveAttribute('open', '');
    const link = details.getByRole('link').nth(3);
    const target = (await link.getAttribute('href')) ?? '';
    await link.click();
    await expect(page.locator(target)).toBeInViewport();
  });

  test('print: no header, footer or contents; light colours', async ({ page }) => {
    await page.goto('/privacy/');
    await settle(page, 300);
    await page.emulateMedia({ media: 'print' });
    await expect(page.getByRole('banner')).toBeHidden();
    await expect(page.getByRole('contentinfo')).toBeHidden();
    await expect(page.locator('nav[aria-label="On this page"]:visible')).toHaveCount(0);
    expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe(
      'rgb(255, 255, 255)',
    );
  });
});

test.describe('404', () => {
  test('the Worker answers any unknown address with the 404 page and status 404', async ({
    request,
  }) => {
    for (const path of [
      '/does-not-exist',
      '/does-not-exist/',
      '/about/nope',
      '/leaderboard/nope/',
    ]) {
      const response = await request.get(path, withCookie);
      expect(response.status(), path).toBe(404);
      expect(response.headers()['content-type'], path).toContain('text/html');
      expect(response.headers()['x-robots-tag'], path).toBe('noindex');
      expect(response.headers()['content-security-policy'], path).toContain("script-src 'self'");
      const html = await response.text();
      expect(html, path).toContain('This page took a wrong turn.');
      expect(html, path).toContain('<title>Page not found · DualMind Arena</title>');
      expect(html, path).toMatch(/<meta name="robots" content="noindex"\/?>/);
    }
    expect((await request.head('/does-not-exist', withCookie)).status()).toBe(404);
  });

  test('renders, hydrates and offers the way back', async ({ page }) => {
    // Chrome logs the 404 status of the document itself as a console error; anything else counts.
    const errors: string[] = [];
    page.on('console', message => {
      if (message.type() !== 'error') return;
      if (message.location().url.endsWith('/does-not-exist')) return;
      errors.push(message.text());
    });
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
    await settle(page, 600);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('404');
    await expect(page.getByRole('link', { name: 'Start a battle' })).toHaveAttribute('href', '/');
    await expect(page.getByRole('link', { name: 'See the leaderboard' })).toHaveAttribute(
      'href',
      '/leaderboard/',
    );
    await page.getByRole('button', { name: /Or search the site/ }).click();
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    expect(errors).toEqual([]);
  });

  test('the fuzzy 404 is plain text under reduced motion', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/does-not-exist');
    await settle(page, 400);
    expect(await page.locator('h1 canvas').count()).toBe(0);
    await expect(page.locator('h1')).toContainText('404');
  });

  for (const theme of ['dark', 'light'] as const) {
    test(`axe: no serious or critical violations (${theme})`, async ({ page }) => {
      await page.emulateMedia({ reducedMotion: 'reduce' });
      await storeTheme(page, theme);
      await page.goto('/does-not-exist');
      await settle(page, 500);
      expect(await blockingViolations(page)).toEqual([]);
    });
  }

  test('no horizontal overflow at 360 px', async ({ page }) => {
    await page.setViewportSize({ width: 360, height: 780 });
    await page.goto('/does-not-exist');
    await settle(page, 400);
    expect(await overflowing(page)).toEqual([]);
  });

  for (const viewport of [
    { name: 'desktop', width: 1440, height: 900 },
    { name: 'mobile', width: 390, height: 844 },
  ]) {
    for (const theme of ['dark', 'light'] as const) {
      test(`screenshot: ${viewport.name} ${theme}`, async ({ page }) => {
        await page.setViewportSize({ width: viewport.width, height: viewport.height });
        await storeTheme(page, theme);
        await page.goto('/does-not-exist');
        await settle(page, 2200);
        await page.screenshot({
          path: shotPath(`info-404-${viewport.name}-${theme}-fold`),
          animations: 'disabled',
        });
        await page.screenshot({
          path: shotPath(`info-404-${viewport.name}-${theme}-full`),
          fullPage: true,
          animations: 'disabled',
        });
      });
    }
  }
});

test.describe('sitemap.xml and robots.txt', () => {
  test('are built files listing the public pages only', async ({ request }) => {
    const sitemap = await request.get('/sitemap.xml', withCookie);
    expect(sitemap.status()).toBe(200);
    expect(sitemap.headers()['content-type']).toContain('xml');
    const xml = await sitemap.text();
    for (const spec of pages) {
      expect(xml).toContain(`<loc>https://arena.dualmindlab.tech${spec.path}</loc>`);
    }
    expect(xml).toContain('<loc>https://arena.dualmindlab.tech/</loc>');
    for (const hidden of ['/design/', '/404', '__spa-fallback', '/api/', '/login/', '/signup/']) {
      expect(xml).not.toContain(hidden);
    }

    const robots = await request.get('/robots.txt', withCookie);
    expect(robots.status()).toBe(200);
    const text = await robots.text();
    expect(text).toContain('Sitemap: https://arena.dualmindlab.tech/sitemap.xml');
    expect(text).toContain('Disallow: /api/');
  });
});
