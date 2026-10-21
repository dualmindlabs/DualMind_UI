import { createRequire } from 'node:module';

import { describe, expect, it } from 'vitest';

interface Deferred {
  html: string;
  bootFile: string;
  bootCode: string;
}
const nodeRequire = createRequire(import.meta.url);
const { deferHydration } = nodeRequire('../../../../scripts/defer-hydration.js') as {
  deferHydration: (html: string) => Deferred | null;
};

const PAGE =
  '<html><head><link rel="modulepreload" href="/assets/a-12345678.js"/>' +
  '<link rel="modulepreload" href="/assets/b-abcdefgh.js"/><link rel="stylesheet" href="/assets/x.css"/></head>' +
  '<body><main>Hello</main>' +
  '<script type="module" async="">import "/assets/a-12345678.js"; import("/assets/b-abcdefgh.js");</script>' +
  '</body></html>';

describe('deferHydration', () => {
  it('moves the module script and the preloads behind the load event', () => {
    const result = deferHydration(PAGE);
    expect(result).not.toBeNull();
    if (!result) return;
    expect(result.html).not.toContain('<link rel="modulepreload"');
    expect(result.html).not.toContain('<script type="module"');
    expect(result.html).toContain('<link rel="stylesheet" href="/assets/x.css"/>');
    expect(result.html).toContain('<main>Hello</main>');
    expect(result.html).toContain('addEventListener("load"');
    expect(result.html).toContain('["/assets/a-12345678.js","/assets/b-abcdefgh.js"]');
    expect(result.html).toContain(`/assets/${result.bootFile}`);
    expect(result.bootCode).toBe(
      'import "/assets/a-12345678.js"; import("/assets/b-abcdefgh.js");',
    );
    expect(result.bootFile).toMatch(/^boot-[A-Za-z0-9_-]{8}\.js$/);
  });

  it('names the boot file after its content', () => {
    const other = PAGE.replaceAll('b-abcdefgh', 'c-abcdefgh');
    expect(deferHydration(PAGE)?.bootFile).not.toBe(deferHydration(other)?.bootFile);
    expect(deferHydration(PAGE)?.bootFile).toBe(deferHydration(PAGE)?.bootFile);
  });

  it('leaves the SPA fallback and pages without a module script alone', () => {
    expect(deferHydration(`<html data-spa-fallback>${PAGE}</html>`)).toBeNull();
    expect(deferHydration('<html><body>plain</body></html>')).toBeNull();
  });
});
