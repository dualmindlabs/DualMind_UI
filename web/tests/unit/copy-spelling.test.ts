import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

// The copy is en-US everywhere (docs/redesign/design-direction.md, "CTA lexicon"). The info
// pages have their own check (features/info/content.test.ts); this one reads the copy in the
// source of every other screen: string literals that contain a space (sentences and labels, not
// state names such as 'cancelled' in a union type) and JSX text. Comments are ignored.
// Left out: the style guide (/design/, noindex, internal) and vendored components.

const srcDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../src');

const ROOTS = [
  'features',
  'components/layout',
  'content',
  'app',
  'hooks',
  'lib/api/errors.ts',
  'lib/supabase/errors.ts',
];
const SKIP = ['features/design-system/', 'app/routes/design.tsx'];

const BRITISH =
  /\b(colour(s|ed|ful)?|licence(s|d)?|optimis(e|ed|es|ing|ation)|behaviour(s)?|cancell(ed|ing)|organis(e|ed|es|ing|ation)|favourite(s)?|centre(s|d)?|analys(e|ed|es|ing)|recognis(e|ed|es|ing)|catalogue|grey)\b/i;

function walk(target: string): string[] {
  if (!statSync(target).isDirectory()) return [target];
  return readdirSync(target).flatMap(name => walk(path.join(target, name)));
}

/** The string literals of a source file, and the code with comments and strings taken out. */
function tokens(source: string): { strings: string[]; code: string } {
  const strings: string[] = [];
  let code = '';
  let i = 0;
  while (i < source.length) {
    const char = source[i] ?? '';
    const next = source[i + 1] ?? '';
    if (char === '/' && next === '/') {
      while (i < source.length && source[i] !== '\n') i += 1;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', i + 2);
      i = end < 0 ? source.length : end + 2;
      continue;
    }
    if (char === "'" || char === '"' || char === '`') {
      let j = i + 1;
      let text = '';
      while (j < source.length && source[j] !== char) {
        if (source[j] === '\\') {
          text += source[j + 1] ?? '';
          j += 2;
          continue;
        }
        if (char !== '`' && source[j] === '\n') break;
        text += source[j] ?? '';
        j += 1;
      }
      strings.push(text);
      code += '""';
      i = j + 1;
      continue;
    }
    code += char;
    i += 1;
  }
  return { strings, code };
}

/** The copy a source file shows: strings with a space in them, and JSX text. */
function copyOf(source: string): string[] {
  const { strings, code } = tokens(source);
  const jsxText = [...code.matchAll(/>([^<>{}]*)</g)].map(match => match[1] ?? '');
  return [...strings.filter(text => /\s/.test(text)), ...jsxText];
}

const files = ROOTS.flatMap(root => walk(path.join(srcDir, root)))
  .map(full => path.relative(srcDir, full).split(path.sep).join('/'))
  .filter(file => /\.tsx?$/.test(file) && !SKIP.some(skip => file.startsWith(skip)));

describe('en-US copy outside the info pages', () => {
  it('reads a real set of files', () => {
    expect(files.length).toBeGreaterThan(150);
    expect(files).toContain('features/settings/components/appearance-section.tsx');
  });

  it('finds the British spellings it is meant to catch', () => {
    expect(copyOf(`const a = 'The colours of every page.';`)).toEqual([
      'The colours of every page.',
    ]);
    expect(copyOf(`<p>Export cancelled.</p>`).some(text => BRITISH.test(text))).toBe(true);
    // State names and comments are not copy.
    expect(copyOf(`type S = 'cancelled' | 'done'; // the colour`)).toEqual([]);
  });

  it('has no British spelling in any screen', () => {
    const found = files.flatMap(file =>
      copyOf(readFileSync(path.join(srcDir, file), 'utf8'))
        .filter(text => BRITISH.test(text))
        .map(text => `${file}: ${text.trim().slice(0, 80)}`),
    );
    expect(found).toEqual([]);
  });
});
