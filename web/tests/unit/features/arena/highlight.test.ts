import { describe, expect, it } from 'vitest';

import {
  CODE_VARIABLE_PREFIX,
  highlightCode,
  MAX_HIGHLIGHT_CHARS,
  resolveCodeLanguage,
} from '@/features/arena/lib/highlight';

// Shiki with the JavaScript regex engine and the CSS-variables theme, for real (no mocks): the
// grammars load as they would in the browser, and every colour is a var(--code-token-*).

describe('resolveCodeLanguage', () => {
  it('maps the labels answers use to the grammars we load', () => {
    expect(resolveCodeLanguage('ts')).toBe('typescript');
    expect(resolveCodeLanguage('TypeScript')).toBe('typescript');
    expect(resolveCodeLanguage('js')).toBe('javascript');
    expect(resolveCodeLanguage('py')).toBe('python');
    expect(resolveCodeLanguage('sh')).toBe('shellscript');
    expect(resolveCodeLanguage('bash')).toBe('shellscript');
    expect(resolveCodeLanguage('c++')).toBe('cpp');
    expect(resolveCodeLanguage('c#')).toBe('csharp');
    expect(resolveCodeLanguage('yml')).toBe('yaml');
    expect(resolveCodeLanguage('md')).toBe('markdown');
    expect(resolveCodeLanguage(' diff ')).toBe('diff');
  });

  it('leaves everything else plain', () => {
    expect(resolveCodeLanguage(null)).toBeNull();
    expect(resolveCodeLanguage(undefined)).toBeNull();
    expect(resolveCodeLanguage('')).toBeNull();
    expect(resolveCodeLanguage('brainfuck')).toBeNull();
    expect(resolveCodeLanguage('text')).toBeNull();
  });
});

describe('highlightCode', () => {
  it('colours TypeScript with theme variables only', { timeout: 20_000 }, async () => {
    const lines = await highlightCode('const total: number = 1; // sum', 'typescript');
    expect(lines).not.toBeNull();
    const tokens = (lines ?? []).flat();
    expect(tokens.map(token => token.content).join('')).toBe('const total: number = 1; // sum');
    const keyword = tokens.find(token => token.content.trim() === 'const');
    expect(keyword?.color).toBe(`var(${CODE_VARIABLE_PREFIX}token-keyword)`);
    const comment = tokens.find(token => token.content.includes('sum'));
    expect(comment?.color).toBe(`var(${CODE_VARIABLE_PREFIX}token-comment)`);
    for (const token of tokens) {
      // Never a hex or rgb value: colours come from our tokens.
      if (token.color !== null) expect(token.color).toMatch(/^var\(--code-[\w-]+\)$/);
    }
  });

  it('keeps one line per source line', { timeout: 20_000 }, async () => {
    const code = 'def f(n):\n    return n\n\nprint(f(2))';
    const lines = await highlightCode(code, 'python');
    expect(lines).toHaveLength(4);
    expect(lines?.map(line => line.map(token => token.content).join('')).join('\n')).toBe(code);
  });

  it('colours added and removed lines in a diff', { timeout: 20_000 }, async () => {
    const lines = await highlightCode('-old\n+new', 'diff');
    const [removed, added] = (lines ?? []).map(line => line[0]?.color);
    expect(removed).toBe(`var(${CODE_VARIABLE_PREFIX}token-deleted)`);
    expect(added).toBe(`var(${CODE_VARIABLE_PREFIX}token-inserted)`);
  });

  it('leaves very long blocks plain', async () => {
    expect(await highlightCode('x'.repeat(MAX_HIGHLIGHT_CHARS + 1), 'typescript')).toBeNull();
  });
});
