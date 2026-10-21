import type { HighlighterCore, LanguageRegistration } from 'shiki/core';

/**
 * Syntax highlighting for code blocks in answers, on Shiki. Nothing here loads with the arena:
 * the highlighter, the regex engine and each grammar are separate chunks, fetched the first time
 * a code block in that language is on screen (`highlightCode`). Until then, and for any language
 * outside the set below, the block shows plain code in the same font and size, so nothing moves
 * when the colours arrive.
 *
 * - **Engine:** Shiki's JavaScript regex engine (`createJavaScriptRegexEngine`), not Oniguruma
 *   compiled to WebAssembly, so the enforced CSP needs neither `wasm-unsafe-eval` nor
 *   `unsafe-eval` (server/security-headers.js). Grammars it cannot run are skipped (`forgiving`).
 * - **Colours:** one CSS-variables theme. Every token's colour is `var(--code-token-*)`, defined
 *   from our light and dark tokens in styles/tokens.css, so a theme switch recolours code without
 *   highlighting it again, and no colour value lives in this file.
 * - **Output:** tokens, rendered by React as text in `<span>`s (code-block.tsx). No HTML string
 *   is ever produced or injected.
 */

/** The theme's name, and the prefix of the CSS variables its colours point at. */
export const CODE_THEME = 'dualmind';
export const CODE_VARIABLE_PREFIX = '--code-';

/** Bigger blocks stay plain: highlighting them would hold the main thread for too long. */
export const MAX_HIGHLIGHT_CHARS = 20_000;

/** Lines longer than this (minified code, data) are left as plain text by the tokenizer. */
const MAX_LINE_LENGTH = 2_000;

type GrammarModule = { default: LanguageRegistration[] };

/**
 * The supported grammars, one chunk each. Keys are Shiki's language ids; a static map, so the
 * bundler can see (and split) every import.
 */
const GRAMMARS = {
  typescript: () => import('shiki/langs/typescript.mjs'),
  javascript: () => import('shiki/langs/javascript.mjs'),
  tsx: () => import('shiki/langs/tsx.mjs'),
  jsx: () => import('shiki/langs/jsx.mjs'),
  json: () => import('shiki/langs/json.mjs'),
  python: () => import('shiki/langs/python.mjs'),
  shellscript: () => import('shiki/langs/shellscript.mjs'),
  html: () => import('shiki/langs/html.mjs'),
  css: () => import('shiki/langs/css.mjs'),
  sql: () => import('shiki/langs/sql.mjs'),
  go: () => import('shiki/langs/go.mjs'),
  rust: () => import('shiki/langs/rust.mjs'),
  java: () => import('shiki/langs/java.mjs'),
  c: () => import('shiki/langs/c.mjs'),
  cpp: () => import('shiki/langs/cpp.mjs'),
  csharp: () => import('shiki/langs/csharp.mjs'),
  yaml: () => import('shiki/langs/yaml.mjs'),
  markdown: () => import('shiki/langs/markdown.mjs'),
  diff: () => import('shiki/langs/diff.mjs'),
} satisfies Record<string, () => Promise<GrammarModule>>;

export type CodeLanguage = keyof typeof GRAMMARS;

/** What answers write after the fence (` ```ts `), lower case, to the grammar that reads it. */
const ALIASES: Readonly<Record<string, CodeLanguage>> = {
  ts: 'typescript',
  typescript: 'typescript',
  mts: 'typescript',
  cts: 'typescript',
  js: 'javascript',
  javascript: 'javascript',
  mjs: 'javascript',
  cjs: 'javascript',
  node: 'javascript',
  tsx: 'tsx',
  jsx: 'jsx',
  json: 'json',
  jsonc: 'json',
  json5: 'json',
  py: 'python',
  python: 'python',
  python3: 'python',
  bash: 'shellscript',
  sh: 'shellscript',
  shell: 'shellscript',
  shellscript: 'shellscript',
  zsh: 'shellscript',
  console: 'shellscript',
  html: 'html',
  htm: 'html',
  xhtml: 'html',
  css: 'css',
  sql: 'sql',
  postgres: 'sql',
  postgresql: 'sql',
  mysql: 'sql',
  sqlite: 'sql',
  go: 'go',
  golang: 'go',
  rust: 'rust',
  rs: 'rust',
  java: 'java',
  c: 'c',
  h: 'c',
  cpp: 'cpp',
  'c++': 'cpp',
  cc: 'cpp',
  cxx: 'cpp',
  hpp: 'cpp',
  csharp: 'csharp',
  'c#': 'csharp',
  cs: 'csharp',
  yaml: 'yaml',
  yml: 'yaml',
  markdown: 'markdown',
  md: 'markdown',
  diff: 'diff',
  patch: 'diff',
};

/** The grammar for a fence's language label, or null (no label, or a language we do not load). */
export function resolveCodeLanguage(label: string | null | undefined): CodeLanguage | null {
  if (!label) return null;
  return ALIASES[label.trim().toLowerCase()] ?? null;
}

/** Shiki's font style bits (vscode-textmate's FontStyle). */
const ITALIC = 1;
const BOLD = 2;
const UNDERLINE = 4;

/** One coloured run of text. `color` is a `var(--code-token-*)` reference, never a value. */
export interface CodeToken {
  content: string;
  color: string | null;
  italic: boolean;
  bold: boolean;
  underline: boolean;
}

export type CodeLine = readonly CodeToken[];

let highlighter: Promise<HighlighterCore> | null = null;
const loading = new Map<CodeLanguage, Promise<void>>();

async function createHighlighter(): Promise<HighlighterCore> {
  const [{ createHighlighterCore, createCssVariablesTheme }, { createJavaScriptRegexEngine }] =
    await Promise.all([import('shiki/core'), import('shiki/engine/javascript')]);
  const theme = createCssVariablesTheme({
    name: CODE_THEME,
    variablePrefix: CODE_VARIABLE_PREFIX,
    fontStyle: true,
  });
  // Diffs: the base theme has no colour for added and removed lines.
  theme.tokenColors = [
    ...(theme.tokenColors ?? []),
    {
      scope: ['markup.inserted', 'punctuation.definition.inserted'],
      settings: { foreground: `var(${CODE_VARIABLE_PREFIX}token-inserted)` },
    },
    {
      scope: ['markup.deleted', 'punctuation.definition.deleted'],
      settings: { foreground: `var(${CODE_VARIABLE_PREFIX}token-deleted)` },
    },
    {
      scope: ['meta.diff.range', 'meta.diff.header', 'meta.diff.index'],
      settings: { foreground: `var(${CODE_VARIABLE_PREFIX}token-comment)` },
    },
  ];
  return createHighlighterCore({
    themes: [theme],
    langs: [],
    engine: createJavaScriptRegexEngine({ forgiving: true }),
  });
}

function getHighlighter(): Promise<HighlighterCore> {
  highlighter ??= createHighlighter().catch((error: unknown) => {
    // A failed chunk (offline, a deploy in between) must not stick: the next block tries again.
    highlighter = null;
    throw error;
  });
  return highlighter;
}

function loadGrammar(core: HighlighterCore, language: CodeLanguage): Promise<void> {
  if (core.getLoadedLanguages().includes(language)) return Promise.resolve();
  let pending = loading.get(language);
  if (!pending) {
    pending = core
      .loadLanguage(GRAMMARS[language])
      .finally(() => loading.delete(language));
    loading.set(language, pending);
  }
  return pending;
}

/**
 * The code as coloured lines, or null when it should stay plain (too long). Loads the
 * highlighter and the grammar on first use; rejects when a chunk cannot be loaded (the caller
 * keeps the plain code).
 */
export async function highlightCode(
  code: string,
  language: CodeLanguage,
): Promise<CodeLine[] | null> {
  if (code.length > MAX_HIGHLIGHT_CHARS) return null;
  const core = await getHighlighter();
  await loadGrammar(core, language);
  const lines = core.codeToTokensBase(code, {
    lang: language,
    theme: CODE_THEME,
    tokenizeMaxLineLength: MAX_LINE_LENGTH,
  });
  return lines.map(line =>
    line.map(token => {
      const style = token.fontStyle ?? 0;
      return {
        content: token.content,
        color: token.color ?? null,
        italic: style > 0 && (style & ITALIC) !== 0,
        bold: style > 0 && (style & BOLD) !== 0,
        underline: style > 0 && (style & UNDERLINE) !== 0,
      };
    }),
  );
}
