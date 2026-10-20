import { describe, expect, it } from 'vitest';

import { contrastReadings } from '@/features/design-system/lib/token-contrast';
import tokensCss from '@/styles/tokens.css?raw';
import { colorTokens, durations, easings, type ThemeName } from '@/styles/tokens';

/** Innermost CSS rule blocks (no nested braces), with comments removed. */
function ruleBlocks(css: string): Array<{ selector: string; declarations: Map<string, string> }> {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, '');
  return [...clean.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map(([, selector = '', body = '']) => ({
    // Quote style is Prettier's business, not the test's.
    selector: selector.trim().replace(/"/g, "'"),
    declarations: new Map(
      [...body.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)].map(([, name = '', value = '']) => [
        name,
        value.trim().replace(/\s+/g, ' '),
      ]),
    ),
  }));
}

const blocks = ruleBlocks(tokensCss);

function block(selector: string, mustHave: string) {
  const found = blocks.find(item => item.selector === selector && item.declarations.has(mustHave));
  if (!found) throw new Error(`tokens.css has no "${selector}" block declaring ${mustHave}`);
  return found.declarations;
}

const dark = block(':root', '--bg');
const systemLight = block(":root:not([data-theme='dark'])", '--bg');
const explicitLight = block(":root[data-theme='light']", '--bg');
const derived = block(':root', '--dur-base');
const theme = block('@theme', '--ease-out-expo');

describe('tokens.css and tokens.ts agree', () => {
  it.each(colorTokens.map(token => [token.name, token] as const))('%s', (name, token) => {
    expect(dark.get(name)).toBe(token.dark.toLowerCase());
    expect(systemLight.get(name)).toBe(token.light.toLowerCase());
    expect(explicitLight.get(name)).toBe(token.light.toLowerCase());
  });

  it('every hex colour in tokens.css is documented in tokens.ts', () => {
    const documented = new Set(colorTokens.map(token => token.name));
    const hexTokens = [...dark.entries()]
      .filter(([, value]) => value.startsWith('#'))
      .map(([name]) => name);
    expect(hexTokens.filter(name => !documented.has(name))).toEqual([]);
  });

  it('the two light blocks (system and explicit) are identical', () => {
    expect(Object.fromEntries(systemLight)).toEqual(Object.fromEntries(explicitLight));
  });

  it('durations and easings match', () => {
    for (const token of durations) expect(derived.get(token.name)).toBe(`${token.ms}ms`);
    for (const easing of easings) {
      expect(theme.get(easing.name)).toBe(`cubic-bezier(${easing.points.join(', ')})`);
    }
  });
});

describe('every colour token meets its WCAG contrast target', () => {
  const cases = colorTokens.flatMap(token =>
    (['dark', 'light'] as ThemeName[]).map(themeName => [token.name, themeName, token] as const),
  );

  it.each(cases)('%s in %s', (_name, themeName, token) => {
    for (const reading of contrastReadings(token, themeName)) {
      expect(reading.passes, `${reading.ratio.toFixed(2)}:1 against ${reading.against}`).toBe(
        true,
      );
    }
  });
});
