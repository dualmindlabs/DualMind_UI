/**
 * A tiny tokenizer for the code samples on /developers/ (curl, JavaScript, Python, JSON). It only
 * splits text into runs with a kind, so the text content is exactly the input; the page paints the
 * kinds with theme tokens. No dependency, no script on the client beyond the render.
 */
export type TokenKind = 'plain' | 'string' | 'comment' | 'keyword' | 'number' | 'flag' | 'key';

export interface Token {
  kind: TokenKind;
  text: string;
}

const JS_KEYWORDS =
  'const|let|var|await|async|if|else|throw|new|return|import|from|function|for|of|in|true|false|null';
const PY_KEYWORDS = 'import|from|as|if|else|return|def|for|in|True|False|None|with|print';

interface Rule {
  kind: TokenKind;
  re: string;
}

const RULES: Record<string, Rule[]> = {
  json: [
    { kind: 'key', re: '"(?:[^"\\\\]|\\\\.)*"(?=\\s*:)' },
    { kind: 'string', re: '"(?:[^"\\\\]|\\\\.)*"' },
    { kind: 'number', re: '-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b' },
    { kind: 'keyword', re: '\\b(?:true|false|null)\\b' },
  ],
  bash: [
    { kind: 'comment', re: '#[^\\n]*' },
    { kind: 'string', re: '"(?:[^"\\\\]|\\\\.)*"|\'[^\']*\'' },
    { kind: 'flag', re: '(?<=\\s)--?[A-Za-z][\\w-]*' },
    { kind: 'keyword', re: '^(?:curl|jq)\\b|(?<=\\|\\s)(?:curl|jq)\\b' },
  ],
  javascript: [
    { kind: 'comment', re: '//[^\\n]*' },
    { kind: 'string', re: '\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"|`(?:[^`\\\\]|\\\\.)*`' },
    { kind: 'keyword', re: `\\b(?:${JS_KEYWORDS})\\b` },
    { kind: 'number', re: '\\b\\d+(?:\\.\\d+)?\\b' },
  ],
  python: [
    { kind: 'comment', re: '#[^\\n]*' },
    { kind: 'string', re: '\'(?:[^\'\\\\]|\\\\.)*\'|"(?:[^"\\\\]|\\\\.)*"' },
    { kind: 'keyword', re: `\\b(?:${PY_KEYWORDS})\\b` },
    { kind: 'number', re: '\\b\\d+(?:\\.\\d+)?\\b' },
  ],
};

export function tokenize(code: string, language: string): Token[] {
  const rules = RULES[language];
  if (!rules) return [{ kind: 'plain', text: code }];
  const re = new RegExp(rules.map(rule => `(${rule.re})`).join('|'), 'gm');
  const tokens: Token[] = [];
  let last = 0;
  for (const match of code.matchAll(re)) {
    const start = match.index;
    if (start > last) tokens.push({ kind: 'plain', text: code.slice(last, start) });
    const groupIndex = match.findIndex((value, index) => index > 0 && value !== undefined);
    tokens.push({ kind: rules[groupIndex - 1]?.kind ?? 'plain', text: match[0] });
    last = start + match[0].length;
  }
  if (last < code.length) tokens.push({ kind: 'plain', text: code.slice(last) });
  return tokens;
}
