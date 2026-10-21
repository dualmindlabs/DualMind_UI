/**
 * "Your data" exports (slice S12): every thread of the signed-in user as Markdown, JSON, CSV or a
 * standalone HTML file, built in the browser from the threads API. PDF is the print view of the
 * same content (components/print-export.tsx), printed with the browser's "Save as PDF".
 *
 * Each format is a writer with three parts, so a large export is written one thread at a time:
 * `start` (the header, once the thread list is known), `thread` (one per thread, in order) and
 * `end`. `buildExport()` joins them for tests and small exports.
 *
 * Blind battles stay blind: a battle turn without a vote has no model names or response times
 * (latency is a fingerprint of a model; ui-audit.md P0-2). Everything else the API stores for a
 * turn is included.
 */
import {
  formatDuration,
  MODE_DETAILS,
  modeFromThread,
  toTurns,
  VOTE_LABELS,
} from '@/features/arena';
import {
  displayNameFromModelName,
  type Thread,
  type ThreadMessage,
  type ThreadMode,
  type VoteChoice,
} from '@/lib/api';
import { colorTokens, type ThemeName } from '@/styles/tokens';

export const EXPORT_FORMATS = ['markdown', 'json', 'csv', 'html', 'pdf'] as const;
export type ExportFormat = (typeof EXPORT_FORMATS)[number];
/** The formats that become a file; PDF goes through the print dialog. */
export type FileFormat = Exclude<ExportFormat, 'pdf'>;

export function isFileFormat(format: ExportFormat): format is FileFormat {
  return format !== 'pdf';
}

export interface ExportAccount {
  email: string | null;
  name: string | null;
}

export interface ExportMeta {
  exportedAt: Date;
  account: ExportAccount;
  /** Every thread in the export, newest first, as the API listed them. */
  threads: readonly Thread[];
  /** The API's list limit was reached, so older threads may be missing. */
  truncated: boolean;
}

export interface ExportThread {
  thread: Thread;
  messages: readonly ThreadMessage[];
}

export interface ExportAnswer {
  /** `A` or `B` in a battle or side by side; null for a Direct chat's one answer. */
  slot: 'A' | 'B' | null;
  /** The model's id (`modelName`), or null when hidden or unknown. */
  model: string | null;
  timeMs: number | null;
  text: string;
}

export interface ExportTurn {
  number: number;
  prompt: string;
  createdAt: string | null;
  answers: ExportAnswer[];
  vote: VoteChoice | null;
  /** The vote in words ("B is better"), or null. */
  verdict: string | null;
  /** A blind battle not voted on yet: model names and times are left out. */
  namesHidden: boolean;
}

/** "Battle", "Side by side" or "Direct" for a stored thread mode. */
export function modeLabel(mode: ThreadMode): string {
  return MODE_DETAILS[modeFromThread(mode)].label;
}

export function visibilityLabel(visibility: Thread['visibility']): string {
  return visibility.charAt(0).toUpperCase() + visibility.slice(1);
}

/** `2026-10-21 10:15 UTC`: one format in every file, whatever the browser's locale. */
export function formatUtc(value: string | Date | null | undefined): string | null {
  if (value === null || value === undefined || value === '') return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.toISOString().slice(0, 16).replace('T', ' ')} UTC`;
}

/** The model as people read it (`llama-3.3-70b-instruct-fp8-fast`), from its id. */
export function modelLabel(model: string | null): string | null {
  return model === null ? null : displayNameFromModelName(model);
}

/** The turns of a thread, oldest first, with the blind-battle rule applied. */
export function exportTurns({ thread, messages }: ExportThread): ExportTurn[] {
  const created = new Map(messages.map(message => [message.messageId, message.createdAt]));
  return toTurns(messages, modeFromThread(thread.mode)).map(turn => {
    const hidden = !turn.revealed;
    const answer = (
      slot: ExportAnswer['slot'],
      pane: { text: string; modelName: string | null; timeMs: number | null },
    ): ExportAnswer => ({
      slot,
      model: hidden ? null : pane.modelName,
      timeMs: hidden ? null : pane.timeMs,
      text: pane.text,
    });
    return {
      number: turn.number,
      prompt: turn.prompt,
      createdAt: created.get(turn.id) ?? null,
      answers: turn.b ? [answer('A', turn.a), answer('B', turn.b)] : [answer(null, turn.a)],
      vote: turn.vote,
      verdict: turn.vote ? VOTE_LABELS[turn.vote] : null,
      namesHidden: hidden,
    };
  });
}

export function countTurns(entries: readonly ExportThread[]): number {
  return entries.reduce((total, entry) => total + entry.messages.length, 0);
}

/** `dualmind-export-2026-10-21.md` */
export function exportFileName(format: FileFormat, exportedAt: Date): string {
  return `dualmind-export-${exportedAt.toISOString().slice(0, 10)}.${WRITERS[format].extension}`;
}

// ----------------------------------------------------------------------------------------------
// Escaping

/**
 * Text that Markdown shows as written: one line, with the characters that would start emphasis,
 * code, links, HTML or a table escaped. With `atLineStart`, a leading character that would start
 * a block (a heading, a list item, an ordered list item) is escaped too.
 */
export function escapeMarkdownInline(text: string, { atLineStart = false } = {}): string {
  const escaped = text
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\\`*_[\]<>|~]/g, '\\$&');
  if (!atLineStart) return escaped;
  return escaped.replace(/^([#+-])/, '\\$1').replace(/^(\d+)([.)])/, '$1\\$2');
}

/** Every line of a text as a Markdown quote (`> `), blank lines kept inside the quote. */
export function markdownQuote(text: string): string {
  const lines = text.replace(/\r\n?/g, '\n').split('\n');
  return lines.map(line => (line.trim() === '' ? '>' : `> ${line}`)).join('\n');
}

const HTML_ESCAPES: Readonly<Record<string, string>> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

/** Text that HTML shows as written, in element content and in quoted attribute values. */
export function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, character => HTML_ESCAPES[character] ?? character);
}

/**
 * One CSV field (RFC 4180): quoted when it holds a comma, a quote, a line break or edge spaces,
 * quotes doubled. Text that a spreadsheet would run as a formula (`=`, `+`, `-`, `@`, a tab or a
 * carriage return first) gets a leading apostrophe, the OWASP advice against CSV injection.
 */
export function csvField(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : '';
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return /[",\r\n]|^\s|\s$/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export function csvRow(values: ReadonlyArray<string | number | boolean | null | undefined>) {
  return `${values.map(csvField).join(',')}\r\n`;
}

// ----------------------------------------------------------------------------------------------
// Writers

export interface ExportWriter {
  /** The file extension, without the dot. */
  extension: string;
  mime: string;
  start: (meta: ExportMeta) => string;
  thread: (entry: ExportThread, index: number, meta: ExportMeta) => string;
  end: (meta: ExportMeta) => string;
}

function plural(count: number, one: string, many = `${one}s`): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The most threads `GET /api/threads` lists (no paging yet: endpoints.md, gap 5). */
export const EXPORT_THREAD_LIMIT = 100;

/** Shown when the export may be missing older threads. */
export const TRUNCATED_NOTE = `Only your ${EXPORT_THREAD_LIMIT} most recent threads are included: the API lists at most ${EXPORT_THREAD_LIMIT} for now.`;

function answerHeading(answer: ExportAnswer, hidden: boolean): string {
  const label = answer.slot ? `Answer ${answer.slot}` : 'Answer';
  if (hidden) return `**${label}** · name hidden until you vote`;
  const details = [
    modelLabel(answer.model),
    formatDuration(answer.timeMs),
  ].filter((part): part is string => part !== null);
  return [`**${label}**`, ...details.map(part => escapeMarkdownInline(part))].join(' · ');
}

const markdownWriter: ExportWriter = {
  extension: 'md',
  mime: 'text/markdown;charset=utf-8',
  start: meta => {
    const lines = [
      '# DualMind Arena export',
      '',
      `- **Exported:** ${formatUtc(meta.exportedAt) ?? ''}`,
    ];
    if (meta.account.email) lines.push(`- **Account:** ${escapeMarkdownInline(meta.account.email)}`);
    lines.push(`- **Threads:** ${meta.threads.length}`);
    if (meta.truncated) lines.push('', `> ${TRUNCATED_NOTE}`);
    return `${lines.join('\n')}\n`;
  },
  thread: (entry, index) => {
    const { thread } = entry;
    const lines = [
      '',
      '---',
      '',
      `## ${index + 1}. ${escapeMarkdownInline(thread.title)}`,
      '',
      `- **Mode:** ${modeLabel(thread.mode)}`,
    ];
    const started = formatUtc(thread.createdAt);
    if (started) lines.push(`- **Started:** ${started}`);
    lines.push(`- **Visibility:** ${visibilityLabel(thread.visibility)}`);
    lines.push(`- **Thread id:** ${escapeMarkdownInline(thread.threadId)}`);
    const turns = exportTurns(entry);
    if (turns.length === 0) lines.push('', '_No turns yet._');
    for (const turn of turns) {
      lines.push('', `### Turn ${turn.number}`, '', '**Prompt**', '', markdownQuote(turn.prompt));
      for (const answer of turn.answers) {
        lines.push('', answerHeading(answer, turn.namesHidden), '');
        lines.push(answer.text.trim() === '' ? '_No answer was stored._' : answer.text.trimEnd());
      }
      if (turn.verdict) lines.push('', `**Your verdict:** ${turn.verdict}`);
    }
    return `${lines.join('\n')}\n`;
  },
  end: () => '',
};

/** A thread as the JSON file stores it. */
function jsonThread(entry: ExportThread) {
  const { thread } = entry;
  return {
    threadId: thread.threadId,
    title: thread.title,
    mode: thread.mode,
    modeLabel: modeLabel(thread.mode),
    visibility: thread.visibility,
    createdAt: thread.createdAt,
    updatedAt: thread.updatedAt,
    turns: exportTurns(entry),
  };
}

function indent(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces);
  return text
    .split('\n')
    .map(line => `${pad}${line}`)
    .join('\n');
}

const jsonWriter: ExportWriter = {
  extension: 'json',
  mime: 'application/json;charset=utf-8',
  start: meta => {
    const head = {
      format: 'dualmind-arena-export',
      version: 1,
      exportedAt: meta.exportedAt.toISOString(),
      account: meta.account,
      threadCount: meta.threads.length,
      truncated: meta.truncated,
    };
    // The header object without its closing brace, then the threads array opens.
    const body = JSON.stringify(head, null, 2).replace(/\n}$/, '');
    return `${body},\n  "threads": [`;
  },
  thread: (entry, index) =>
    `${index === 0 ? '\n' : ',\n'}${indent(JSON.stringify(jsonThread(entry), null, 2), 4)}`,
  end: meta => (meta.threads.length === 0 ? ']\n}\n' : '\n  ]\n}\n'),
};

export const CSV_COLUMNS = [
  'thread_id',
  'thread_title',
  'thread_mode',
  'thread_visibility',
  'thread_created_at',
  'turn',
  'turn_created_at',
  'prompt',
  'model_a',
  'answer_a',
  'time_a_ms',
  'model_b',
  'answer_b',
  'time_b_ms',
  'vote',
  'verdict',
] as const;

const csvWriter: ExportWriter = {
  extension: 'csv',
  mime: 'text/csv;charset=utf-8',
  // The byte order mark lets spreadsheet apps read the file as UTF-8.
  start: () => `﻿${csvRow(CSV_COLUMNS)}`,
  thread: entry => {
    const { thread } = entry;
    const base = [
      thread.threadId,
      thread.title,
      thread.mode,
      thread.visibility,
      thread.createdAt ?? null,
    ];
    const turns = exportTurns(entry);
    if (turns.length === 0) return csvRow([...base, ...Array<null>(CSV_COLUMNS.length - 5).fill(null)]);
    return turns
      .map(turn => {
        const [a, b] = turn.answers;
        return csvRow([
          ...base,
          turn.number,
          turn.createdAt,
          turn.prompt,
          a?.model ?? null,
          a?.text ?? null,
          a?.timeMs ?? null,
          b?.model ?? null,
          b?.text ?? null,
          b?.timeMs ?? null,
          turn.vote,
          turn.verdict,
        ]);
      })
      .join('');
  },
  end: () => '',
};

/** A token's value in one theme, so the exported page matches the site (tokens.ts is tested). */
function token(name: `--${string}`, theme: ThemeName): string {
  const entry = colorTokens.find(item => item.name === name);
  if (!entry) throw new Error(`Unknown colour token ${name}`);
  return entry[theme];
}

function htmlStyles(): string {
  const vars = (theme: ThemeName) =>
    (['--bg', '--surface', '--line-subtle', '--fg', '--fg-soft', '--muted', '--mind-a', '--mind-b-text', '--human'] as const)
      .map(name => `${name}:${token(name, theme)}`)
      .join(';');
  return [
    `:root{color-scheme:light dark;${vars('light')}}`,
    `@media (prefers-color-scheme:dark){:root{${vars('dark')}}}`,
    '*{box-sizing:border-box}',
    'body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.page{max-width:72rem;margin:0 auto;padding:40px 20px 80px}',
    'h1{font-size:2rem;line-height:1.2;margin:0 0 12px}',
    'h2{font-size:1.4rem;line-height:1.3;margin:0 0 6px}',
    'h3{font-size:.8rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:28px 0 10px}',
    'a{color:var(--mind-a)}',
    '.meta{color:var(--fg-soft);margin:0}',
    '.note{border-left:3px solid var(--human);padding:8px 12px;color:var(--fg-soft)}',
    'nav ol{padding-left:1.4em;color:var(--fg-soft)}',
    'article{border-top:1px solid var(--line-subtle);margin-top:40px;padding-top:32px}',
    '.label{font-size:.75rem;letter-spacing:.14em;text-transform:uppercase;color:var(--muted);margin:0 0 6px}',
    '.text{white-space:pre-wrap;overflow-wrap:anywhere;margin:0}',
    '.prompt{border-left:3px solid var(--human);padding:4px 0 4px 14px;margin-bottom:16px}',
    '.answers{display:grid;gap:16px;grid-template-columns:repeat(auto-fit,minmax(18rem,1fr))}',
    '.answer{background:var(--surface);border:1px solid var(--line-subtle);border-radius:14px;padding:16px}',
    '.answer.a .label{color:var(--mind-a)}',
    '.answer.b .label{color:var(--mind-b-text)}',
    '.verdict{margin:12px 0 0;color:var(--human);font-weight:600}',
    '@media print{body{background:#fff;color:#000}.answer{break-inside:avoid}article{break-before:auto}}',
  ].join('\n');
}

function htmlAnswer(answer: ExportAnswer, hidden: boolean): string {
  const label = answer.slot ? `Answer ${answer.slot}` : 'Answer';
  const details = hidden
    ? ['name hidden until you vote']
    : [modelLabel(answer.model), formatDuration(answer.timeMs)].filter(
        (part): part is string => part !== null,
      );
  const heading = [label, ...details].map(escapeHtml).join(' · ');
  const body = answer.text.trim() === '' ? 'No answer was stored.' : answer.text.trimEnd();
  const slot = answer.slot ? ` ${answer.slot.toLowerCase()}` : '';
  return `<div class="answer${slot}"><p class="label">${heading}</p><p class="text">${escapeHtml(body)}</p></div>`;
}

const htmlWriter: ExportWriter = {
  extension: 'html',
  mime: 'text/html;charset=utf-8',
  start: meta => {
    const exported = formatUtc(meta.exportedAt) ?? '';
    const facts = [
      `Exported ${exported}`,
      meta.account.email ? `for ${meta.account.email}` : null,
      plural(meta.threads.length, 'thread'),
    ].filter(Boolean) as string[];
    const contents = meta.threads
      .map((thread, index) => `<li><a href="#thread-${index + 1}">${escapeHtml(thread.title)}</a></li>`)
      .join('');
    return [
      '<!doctype html>',
      '<html lang="en">',
      '<head>',
      '<meta charset="utf-8">',
      '<meta name="viewport" content="width=device-width, initial-scale=1">',
      '<meta name="robots" content="noindex">',
      `<title>DualMind Arena export · ${escapeHtml(exported.slice(0, 10))}</title>`,
      `<style>${htmlStyles()}</style>`,
      '</head>',
      '<body>',
      '<div class="page">',
      '<header>',
      '<h1>DualMind Arena export</h1>',
      `<p class="meta">${escapeHtml(facts.join(' · '))}</p>`,
      meta.truncated ? `<p class="note">${escapeHtml(TRUNCATED_NOTE)}</p>` : '',
      '</header>',
      meta.threads.length > 0 ? `<nav aria-label="Threads"><ol>${contents}</ol></nav>` : '',
      '<main>',
      '',
    ].join('\n');
  },
  thread: (entry, index) => {
    const { thread } = entry;
    const facts = [
      modeLabel(thread.mode),
      formatUtc(thread.createdAt),
      visibilityLabel(thread.visibility),
    ].filter(Boolean) as string[];
    const turns = exportTurns(entry);
    const body =
      turns.length === 0
        ? '<p class="meta">No turns yet.</p>'
        : turns
            .map(turn =>
              [
                `<section class="turn"><h3>Turn ${turn.number}</h3>`,
                `<div class="prompt"><p class="label">Prompt</p><p class="text">${escapeHtml(turn.prompt)}</p></div>`,
                `<div class="answers">${turn.answers.map(answer => htmlAnswer(answer, turn.namesHidden)).join('')}</div>`,
                turn.verdict ? `<p class="verdict">Your verdict: ${escapeHtml(turn.verdict)}</p>` : '',
                '</section>',
              ].join(''),
            )
            .join('\n');
    return [
      `<article id="thread-${index + 1}">`,
      `<h2>${escapeHtml(thread.title)}</h2>`,
      `<p class="meta">${escapeHtml(facts.join(' · '))}</p>`,
      body,
      '</article>',
      '',
    ].join('\n');
  },
  end: meta =>
    `${meta.threads.length === 0 ? '<p class="meta">No battles or chats yet.</p>\n' : ''}</main>\n</div>\n</body>\n</html>\n`,
};

export const WRITERS: Readonly<Record<FileFormat, ExportWriter>> = {
  markdown: markdownWriter,
  json: jsonWriter,
  csv: csvWriter,
  html: htmlWriter,
};

/** The whole file as one string (tests, and the building blocks of the streamed export). */
export function buildExport(
  format: FileFormat,
  meta: ExportMeta,
  entries: readonly ExportThread[],
): string {
  const writer = WRITERS[format];
  return [
    writer.start(meta),
    ...entries.map((entry, index) => writer.thread(entry, index, meta)),
    writer.end(meta),
  ].join('');
}
