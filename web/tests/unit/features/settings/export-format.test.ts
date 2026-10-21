import { describe, expect, it } from 'vitest';

import {
  buildExport,
  countTurns,
  CSV_COLUMNS,
  csvField,
  csvRow,
  escapeHtml,
  escapeMarkdownInline,
  exportFileName,
  type ExportMeta,
  type ExportThread,
  exportTurns,
  formatUtc,
  markdownQuote,
  TRUNCATED_NOTE,
} from '@/features/settings/lib/export-format';
import { displayNameFromModelName, type Thread, type ThreadMessage } from '@/lib/api';

// Slice S12: the export writers. Every format must survive hostile text (quotes, commas, line
// breaks, HTML, Markdown syntax, spreadsheet formulas) and keep unvoted battles blind.

function thread(overrides: Partial<Thread> = {}): Thread {
  return {
    threadId: 't-1',
    userId: 'u-1',
    title: 'Explain recursion to a ten-year-old',
    mode: 'battle',
    visibility: 'private',
    messageCount: 1,
    createdAt: '2026-10-21T10:15:00Z',
    updatedAt: '2026-10-21T10:20:00Z',
    ...overrides,
  };
}

function message(overrides: Partial<ThreadMessage> = {}): ThreadMessage {
  return {
    messageId: 'm-1',
    threadId: 't-1',
    position: 0,
    promptText: 'Explain recursion',
    model1Name: '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    model2Name: 'groq/compound-mini',
    model1Response: 'A function that **calls itself**.',
    model2Response: 'Russian *nesting dolls*.',
    model1TimeMs: 1840,
    model2TimeMs: 2310,
    comparisonId: 'c-1',
    voteChoice: 'right',
    hasVoted: true,
    createdAt: '2026-10-21T10:16:00Z',
    ...overrides,
  };
}

const EXPORTED_AT = new Date('2026-10-21T16:40:00Z');

function metaFor(entries: readonly ExportThread[], truncated = false): ExportMeta {
  return {
    exportedAt: EXPORTED_AT,
    account: { email: 'ada@example.com', name: 'Ada Lovelace' },
    threads: entries.map(entry => entry.thread),
    truncated,
  };
}

const HOSTILE = 'He said "hi", then <script>alert(1)</script> & left\nsecond line';

describe('escaping', () => {
  it('escapes HTML text and attribute characters', () => {
    expect(escapeHtml(`<a href="x" title='y'>Tom & Jerry</a>`)).toBe(
      '&lt;a href=&quot;x&quot; title=&#39;y&#39;&gt;Tom &amp; Jerry&lt;/a&gt;',
    );
    expect(escapeHtml('plain')).toBe('plain');
  });

  it('escapes Markdown syntax inside a line, and block starts only at a line start', () => {
    expect(escapeMarkdownInline('*bold* _it_ `code` [link](x) <b> a|b ~s~ \\')).toBe(
      '\\*bold\\* \\_it\\_ \\`code\\` \\[link\\](x) \\<b\\> a\\|b \\~s\\~ \\\\',
    );
    expect(escapeMarkdownInline('two\n  lines\there')).toBe('two lines here');
    expect(escapeMarkdownInline('# not a heading')).toBe('# not a heading');
    expect(escapeMarkdownInline('# not a heading', { atLineStart: true })).toBe(
      '\\# not a heading',
    );
    expect(escapeMarkdownInline('1. not a list', { atLineStart: true })).toBe('1\\. not a list');
    expect(escapeMarkdownInline('- not a list', { atLineStart: true })).toBe('\\- not a list');
  });

  it('quotes every line of a prompt, keeping blank lines inside the quote', () => {
    expect(markdownQuote('one\r\n\r\ntwo')).toBe('> one\n>\n> two');
  });

  it('writes CSV fields per RFC 4180 and defuses spreadsheet formulas', () => {
    expect(csvField('plain')).toBe('plain');
    expect(csvField('a,b')).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField('line\nbreak')).toBe('"line\nbreak"');
    expect(csvField('cr\rlf')).toBe('"cr\rlf"');
    expect(csvField(' padded')).toBe('" padded"');
    expect(csvField('=SUM(A1:A2)')).toBe("'=SUM(A1:A2)");
    expect(csvField('+1')).toBe("'+1");
    expect(csvField('-cmd')).toBe("'-cmd");
    expect(csvField('@import')).toBe("'@import");
    expect(csvField('=1,2')).toBe(`"'=1,2"`);
    expect(csvField(1840)).toBe('1840');
    expect(csvField(-3)).toBe('-3');
    expect(csvField(Number.NaN)).toBe('');
    expect(csvField(null)).toBe('');
    expect(csvField(undefined)).toBe('');
    expect(csvField(true)).toBe('true');
    expect(csvRow(['a', 'b,c', null])).toBe('a,"b,c",\r\n');
  });

  it('formats dates in UTC whatever the locale, and rejects junk', () => {
    expect(formatUtc('2026-10-21T10:15:42Z')).toBe('2026-10-21 10:15 UTC');
    expect(formatUtc(EXPORTED_AT)).toBe('2026-10-21 16:40 UTC');
    expect(formatUtc('not a date')).toBeNull();
    expect(formatUtc(null)).toBeNull();
    expect(formatUtc(undefined)).toBeNull();
  });

  it('names the file after the format and the export day', () => {
    expect(exportFileName('markdown', EXPORTED_AT)).toBe('dualmind-export-2026-10-21.md');
    expect(exportFileName('json', EXPORTED_AT)).toBe('dualmind-export-2026-10-21.json');
    expect(exportFileName('csv', EXPORTED_AT)).toBe('dualmind-export-2026-10-21.csv');
    expect(exportFileName('html', EXPORTED_AT)).toBe('dualmind-export-2026-10-21.html');
  });
});

describe('turns', () => {
  it('keeps a voted battle revealed and an unvoted one blind', () => {
    const voted = exportTurns({ thread: thread(), messages: [message()] });
    expect(voted[0]).toMatchObject({
      number: 1,
      vote: 'right',
      verdict: 'B is better',
      namesHidden: false,
      createdAt: '2026-10-21T10:16:00Z',
    });
    expect(voted[0]?.answers.map(answer => [answer.slot, answer.model, answer.timeMs])).toEqual([
      ['A', '@cf/meta/llama-3.3-70b-instruct-fp8-fast', 1840],
      ['B', 'groq/compound-mini', 2310],
    ]);

    const blind = exportTurns({
      thread: thread(),
      messages: [message({ voteChoice: null, hasVoted: false })],
    });
    expect(blind[0]?.namesHidden).toBe(true);
    expect(blind[0]?.answers.every(answer => answer.model === null && answer.timeMs === null)).toBe(
      true,
    );
    expect(blind[0]?.answers.map(answer => answer.text)).toEqual([
      'A function that **calls itself**.',
      'Russian *nesting dolls*.',
    ]);
  });

  it('shows names in Side by side and gives Direct one answer', () => {
    const side = exportTurns({
      thread: thread({ mode: 'arena' }),
      messages: [message({ voteChoice: null, hasVoted: false })],
    });
    expect(side[0]?.namesHidden).toBe(false);
    const direct = exportTurns({
      thread: thread({ mode: 'direct' }),
      messages: [message({ model2Name: null, model2Response: '', voteChoice: null })],
    });
    expect(direct[0]?.answers).toHaveLength(1);
    expect(direct[0]?.answers[0]?.slot).toBeNull();
  });

  it('orders turns by position and counts them', () => {
    const entry: ExportThread = {
      thread: thread(),
      messages: [
        message({ messageId: 'm-2', position: 1, promptText: 'Second' }),
        message({ messageId: 'm-1', position: 0, promptText: 'First' }),
      ],
    };
    expect(exportTurns(entry).map(turn => turn.prompt)).toEqual(['First', 'Second']);
    expect(countTurns([entry, { thread: thread({ threadId: 't-2' }), messages: [] }])).toBe(2);
  });
});

describe('Markdown', () => {
  it('writes a header, each thread, the prompt as a quote and the verdict', () => {
    const entries = [{ thread: thread(), messages: [message()] }];
    const text = buildExport('markdown', metaFor(entries), entries);
    expect(text).toContain('# DualMind Arena export');
    expect(text).toContain('- **Exported:** 2026-10-21 16:40 UTC');
    expect(text).toContain('- **Account:** ada@example.com');
    expect(text).toContain('## 1. Explain recursion to a ten-year-old');
    expect(text).toContain('- **Mode:** Battle');
    expect(text).toContain('### Turn 1\n\n**Prompt**\n\n> Explain recursion');
    const modelA = displayNameFromModelName('@cf/meta/llama-3.3-70b-instruct-fp8-fast');
    expect(text).toContain(`**Answer A** · ${modelA} · 1.8 s`);
    expect(text).toContain('A function that **calls itself**.');
    expect(text).toContain('**Your verdict:** B is better');
  });

  it('escapes titles and keeps unvoted battles blind', () => {
    const entries = [
      {
        thread: thread({ title: '*Not* [a](link) <b>' }),
        messages: [message({ voteChoice: null, hasVoted: false })],
      },
    ];
    const text = buildExport('markdown', metaFor(entries), entries);
    expect(text).toContain('## 1. \\*Not\\* \\[a\\](link) \\<b\\>');
    expect(text).toContain('**Answer A** · name hidden until you vote');
    expect(text.toLowerCase()).not.toContain('llama');
    expect(text).not.toContain('1.8 s');
  });

  it('notes a capped list and empty threads', () => {
    const entries = [{ thread: thread(), messages: [] }];
    const text = buildExport('markdown', metaFor(entries, true), entries);
    expect(text).toContain(`> ${TRUNCATED_NOTE}`);
    expect(text).toContain('_No turns yet._');
  });
});

describe('JSON', () => {
  it('is valid JSON with the header and every thread, also when streamed thread by thread', () => {
    const entries = [
      { thread: thread(), messages: [message({ promptText: HOSTILE })] },
      { thread: thread({ threadId: 't-2', title: 'Second', mode: 'direct' }), messages: [] },
    ];
    const parsed = JSON.parse(buildExport('json', metaFor(entries, true), entries)) as {
      format: string;
      version: number;
      exportedAt: string;
      account: { email: string };
      threadCount: number;
      truncated: boolean;
      threads: Array<{ threadId: string; modeLabel: string; turns: Array<{ prompt: string }> }>;
    };
    expect(parsed.format).toBe('dualmind-arena-export');
    expect(parsed.version).toBe(1);
    expect(parsed.exportedAt).toBe('2026-10-21T16:40:00.000Z');
    expect(parsed.account.email).toBe('ada@example.com');
    expect(parsed.threadCount).toBe(2);
    expect(parsed.truncated).toBe(true);
    expect(parsed.threads.map(item => item.threadId)).toEqual(['t-1', 't-2']);
    expect(parsed.threads[0]?.turns[0]?.prompt).toBe(HOSTILE);
    expect(parsed.threads[1]?.modeLabel).toBe('Direct');
  });

  it('is valid JSON with no threads', () => {
    const parsed = JSON.parse(buildExport('json', metaFor([]), [])) as { threads: unknown[] };
    expect(parsed.threads).toEqual([]);
  });
});

describe('CSV', () => {
  it('has a BOM, the header row and one CRLF row per turn, hostile text quoted', () => {
    const entries = [
      {
        thread: thread({ title: 'Commas, "quotes"' }),
        messages: [
          message({ promptText: HOSTILE }),
          message({ messageId: 'm-2', position: 1, promptText: '=HYPERLINK("x")' }),
        ],
      },
      { thread: thread({ threadId: 't-2', title: 'Empty' }), messages: [] },
    ];
    const text = buildExport('csv', metaFor(entries), entries);
    expect(text.startsWith('\uFEFF')).toBe(true);
    const lines = text.slice(1).split('\r\n');
    expect(lines[0]).toBe(CSV_COLUMNS.join(','));
    expect(text).toContain('"Commas, ""quotes"""');
    expect(text).toContain('"He said ""hi"", then <script>alert(1)</script> & left\nsecond line"');
    expect(text).toContain(`"'=HYPERLINK(""x"")"`);
    expect(text).toContain(',right,B is better\r\n');
    // The empty thread still gets a row, with empty turn columns.
    expect(text).toContain(`t-2,Empty,battle,private,2026-10-21T10:15:00Z${','.repeat(11)}\r\n`);
    expect(text.endsWith('\r\n')).toBe(true);
  });
});

describe('HTML', () => {
  it('is a standalone page with every piece of text escaped', () => {
    const entries = [
      {
        thread: thread({ title: '<img src=x onerror=alert(1)>' }),
        messages: [message({ promptText: HOSTILE, model1Response: '<b>bold</b>' })],
      },
    ];
    const text = buildExport('html', metaFor(entries), entries);
    expect(text.startsWith('<!doctype html>')).toBe(true);
    expect(text).toContain('<html lang="en">');
    expect(text).toContain('<meta name="robots" content="noindex">');
    expect(text).not.toContain('<img');
    expect(text).not.toContain('<script>');
    expect(text).not.toContain('<b>bold</b>');
    expect(text).toContain('&lt;img src=x onerror=alert(1)&gt;');
    expect(text).toContain('&lt;b&gt;bold&lt;/b&gt;');
    expect(text).toContain('He said &quot;hi&quot;, then &lt;script&gt;');
    expect(text).toContain('<a href="#thread-1">');
    expect(text).toContain('<article id="thread-1">');
    expect(text).toContain('Your verdict: B is better');
    expect(text.trimEnd().endsWith('</html>')).toBe(true);
  });

  it('says so when there is nothing to export', () => {
    expect(buildExport('html', metaFor([]), [])).toContain('No battles or chats yet.');
  });
});
