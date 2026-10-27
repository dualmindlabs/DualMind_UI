import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export const OUT = path.resolve(process.cwd(), 'hardtest-out');
export const SHOTS = path.join(OUT, 'shots');
export const RESULTS = path.join(OUT, 'results');
mkdirSync(SHOTS, { recursive: true });
mkdirSync(RESULTS, { recursive: true });

export const TARGET = process.env.HARD_BASE_URL ? 'live' : 'composed';
export const LIVE = TARGET === 'live';

export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900, phone: false },
  { name: 'phone', width: 390, height: 844, phone: true },
] as const;
export const THEMES = ['dark', 'light'] as const;
export type Viewport = (typeof VIEWPORTS)[number];

/** Known, expected noise while the page is held in a forced state. */
const NOISE = /Failed to load resource|net::ERR_|ERR_INTERNET_DISCONNECTED|Failed to fetch/;

export interface Probe {
  errors: string[];
  failed: string[];
}

/** Console errors, page errors and failed same-origin requests; attach BEFORE goto. */
export function probe(page: Page, allowNoise = false): Probe {
  const found: Probe = { errors: [], failed: [] };
  page.on('console', message => {
    if (message.type() !== 'error') return;
    if (allowNoise && NOISE.test(message.text())) return;
    found.errors.push(`console: ${message.text().slice(0, 300)}`);
  });
  page.on('pageerror', error => found.errors.push(`pageerror: ${error.message.slice(0, 300)}`));
  page.on('response', response => {
    const url = new URL(response.url());
    const own = url.origin === new URL(page.url() || response.url()).origin;
    if (own && response.status() >= 400 && !/\/api\//.test(url.pathname)) {
      found.failed.push(`${response.status()} ${url.pathname}`);
    }
  });
  return found;
}

export async function settle(page: Page, ms = 1200) {
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(ms);
}

export function shotName(id: string, vp: string, theme: string) {
  return `${id}__${vp}__${theme}`;
}

export async function shot(page: Page, name: string, fullPage = true) {
  const handle = await page.addStyleTag({
    content: '[data-slot="site-header"] { position: static !important; }',
  });
  try {
    await page.screenshot({ path: path.join(SHOTS, `${name}.png`), fullPage });
  } finally {
    await handle.evaluate(node => (node as Element).remove());
  }
}

/** Every check that runs on every page. Returns human-readable findings (empty = pass). */
export async function audit(
  page: Page,
  opts: { phone: boolean; probe?: Probe; skipFocus?: boolean; axeExclude?: string[] },
): Promise<string[]> {
  const findings: string[] = [];
  if (opts.probe) {
    findings.push(...opts.probe.errors);
    findings.push(...opts.probe.failed.map(item => `failed request: ${item}`));
  }

  const overflow = await page.evaluate(
    () =>
      Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth ?? 0) -
      window.innerWidth,
  );
  if (overflow > 0) findings.push(`horizontal scroll: page is ${overflow}px wider than the window`);

  // Lazy images: scroll through once so they load, then check each.
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += window.innerHeight) {
      window.scrollTo(0, y);
      await new Promise(resolve => setTimeout(resolve, 60));
    }
    window.scrollTo(0, 0);
  });
  const broken = await page.evaluate(() =>
    [...document.images]
      .filter(
        img => img.getBoundingClientRect().width > 0 && (!img.complete || img.naturalWidth === 0),
      )
      .map(img => img.currentSrc || img.src)
      .slice(0, 5),
  );
  for (const src of broken) findings.push(`broken image: ${src}`);

  if (opts.phone) {
    const small = await page.evaluate(() => {
      const selector =
        'a[href], button, input:not([type=hidden]), select, textarea, summary, [role=button], [role=tab], [role=menuitem], [role=checkbox], [role=radio], [role=switch]';
      const out: string[] = [];
      for (const element of document.querySelectorAll(selector)) {
        const style = getComputedStyle(element);
        if (style.visibility === 'hidden' || style.display === 'none') continue;
        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        // Links inside running text are exempt (WCAG 2.5.8 inline exception).
        if (element.tagName === 'A' && style.display === 'inline') {
          const parent = element.parentElement;
          if (
            parent &&
            (parent.textContent ?? '').trim().length > (element.textContent ?? '').trim().length + 3
          )
            continue;
        }
        // Visually hidden helpers (skip links, sr-only inputs behind a label).
        if (box.width <= 1 || box.height <= 1) continue;
        const pseudo = getComputedStyle(element, '::before');
        const extended = pseudo.content !== 'none' && pseudo.position === 'absolute';
        const width = Math.max(box.width, extended ? parseFloat(pseudo.width) || 0 : 0);
        const height = Math.max(box.height, extended ? parseFloat(pseudo.height) || 0 : 0);
        if (width < 43.5 || height < 43.5) {
          const label = (
            element.getAttribute('aria-label') ??
            element.textContent ??
            element.tagName
          )
            .replace(/\s+/g, ' ')
            .trim()
            .slice(0, 30);
          out.push(
            `${element.tagName.toLowerCase()} "${label}" ${Math.round(width)}x${Math.round(height)}`,
          );
        }
      }
      return out.slice(0, 12);
    });
    for (const item of small) findings.push(`tap target < 44px: ${item}`);
  }

  if (!opts.skipFocus) {
    const bad: string[] = [];
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());
    for (let index = 0; index < 6; index += 1) {
      await page.keyboard.press('Tab');
      const state = await page.evaluate(() => {
        const element = document.activeElement as HTMLElement | null;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        const outline = style.outlineStyle !== 'none' && parseFloat(style.outlineWidth) > 0;
        const shadow = style.boxShadow !== 'none';
        const ring = element.matches(':focus-visible');
        const label = (element.getAttribute('aria-label') ?? element.textContent ?? element.tagName)
          .replace(/\s+/g, ' ')
          .trim()
          .slice(0, 30);
        return { visible: ring && (outline || shadow), label, tag: element.tagName.toLowerCase() };
      });
      if (state && !state.visible) bad.push(`${state.tag} "${state.label}"`);
    }
    for (const item of bad) findings.push(`no visible focus indicator: ${item}`);
  }

  let builder = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
    'best-practice',
  ]);
  for (const selector of opts.axeExclude ?? []) builder = builder.exclude(selector);
  const axe = await builder.analyze();
  for (const violation of axe.violations) {
    findings.push(
      `axe ${violation.id} (${violation.impact}): ${violation.nodes
        .slice(0, 3)
        .map(node => node.target.join(' '))
        .join(' | ')}`,
    );
  }
  return findings;
}

export function record(id: string, data: Record<string, unknown>) {
  writeFileSync(
    path.join(RESULTS, `${id.replace(/[^\w.-]+/g, '_')}.json`),
    JSON.stringify(data, null, 1),
  );
}
