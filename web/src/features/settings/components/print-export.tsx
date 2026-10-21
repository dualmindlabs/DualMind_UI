import { useEffect } from 'react';
import { createPortal } from 'react-dom';

import { formatDuration } from '@/features/arena';

import type { PrintJob } from '../hooks/use-export';
import {
  exportTurns,
  formatUtc,
  modeLabel,
  modelLabel,
  TRUNCATED_NOTE,
  visibilityLabel,
} from '../lib/export-format';

/** The attribute on <html> that switches printing to the export (styles/print.css). */
export const PRINTING_ATTRIBUTE = 'data-printing-export';

/** Opens the browser's print dialog for the export ("Save as PDF" makes the PDF). */
export function printExport(): void {
  document.documentElement.setAttribute(PRINTING_ATTRIBUTE, '');
  window.print();
}

/**
 * The PDF export: the same content as the files, laid out for paper and rendered into <body>
 * outside the app, hidden on screen. While <html data-printing-export> is set, printing shows only
 * this (styles/print.css); the attribute goes away after the print dialog closes, so printing the
 * settings page later prints the page again. No PDF library: the browser makes the PDF.
 */
export function PrintExport({ job }: { job: PrintJob }) {
  const { meta, entries } = job;

  useEffect(() => {
    const root = document.documentElement;
    const onAfterPrint = () => root.removeAttribute(PRINTING_ATTRIBUTE);
    window.addEventListener('afterprint', onAfterPrint);
    // Two frames: the portal is in the document and styled before the dialog snapshots it.
    let second = 0;
    const first = window.requestAnimationFrame(() => {
      second = window.requestAnimationFrame(printExport);
    });
    return () => {
      window.cancelAnimationFrame(first);
      window.cancelAnimationFrame(second);
      window.removeEventListener('afterprint', onAfterPrint);
      root.removeAttribute(PRINTING_ATTRIBUTE);
    };
  }, [job]);

  const facts = [
    `Exported ${formatUtc(meta.exportedAt) ?? ''}`,
    meta.account.email ? `for ${meta.account.email}` : null,
    `${meta.threads.length} ${meta.threads.length === 1 ? 'thread' : 'threads'}`,
  ].filter(Boolean);

  return createPortal(
    <div data-print-view="" data-testid="print-export" className="bg-bg text-fg">
      <article className="mx-auto grid max-w-[46rem] gap-8 px-2 py-4 text-ui leading-relaxed">
        <header className="grid gap-2 border-b border-line pb-6">
          <p className="eyebrow text-mind-a">DualMind Arena</p>
          <h1 className="text-h2 font-medium">Your battles and chats</h1>
          <p className="text-ui-sm text-fg-soft">{facts.join(' · ')}</p>
          {meta.truncated ? <p className="text-ui-sm text-fg-soft">{TRUNCATED_NOTE}</p> : null}
        </header>
        {entries.length === 0 ? <p className="text-fg-soft">No battles or chats yet.</p> : null}
        {entries.map((entry, index) => {
          const { thread } = entry;
          const turns = exportTurns(entry);
          const details = [
            modeLabel(thread.mode),
            formatUtc(thread.createdAt),
            visibilityLabel(thread.visibility),
          ].filter(Boolean);
          return (
            <section
              key={thread.threadId}
              className="grid gap-5 border-t border-line pt-6 first-of-type:border-t-0 first-of-type:pt-0"
            >
              <div className="grid break-after-avoid gap-1">
                <h2 className="text-h3 font-medium">
                  {index + 1}. {thread.title}
                </h2>
                <p className="text-caption text-muted">{details.join(' · ')}</p>
              </div>
              {turns.length === 0 ? <p className="text-ui-sm text-fg-soft">No turns yet.</p> : null}
              {turns.map(turn => (
                <div key={turn.number} className="grid gap-3">
                  <p className="break-after-avoid eyebrow text-muted">Turn {turn.number}</p>
                  <div className="break-inside-avoid border-l-2 border-human pl-3">
                    <p className="text-caption font-medium text-human">Prompt</p>
                    <p className="break-words whitespace-pre-wrap">{turn.prompt}</p>
                  </div>
                  {turn.answers.map(answer => {
                    const label = answer.slot ? `Answer ${answer.slot}` : 'Answer';
                    const about = turn.namesHidden
                      ? ['name hidden until you vote']
                      : [modelLabel(answer.model), formatDuration(answer.timeMs)].filter(Boolean);
                    return (
                      <div key={label} className="rounded-lg border border-line p-3">
                        <p className="text-caption font-medium text-fg-soft">
                          {[label, ...about].join(' · ')}
                        </p>
                        <p className="mt-1 text-ui-sm break-words whitespace-pre-wrap">
                          {answer.text.trim() === ''
                            ? 'No answer was stored.'
                            : answer.text.trimEnd()}
                        </p>
                      </div>
                    );
                  })}
                  {turn.verdict ? (
                    <p className="text-ui-sm font-medium text-human">
                      Your verdict: {turn.verdict}
                    </p>
                  ) : null}
                </div>
              ))}
            </section>
          );
        })}
      </article>
    </div>,
    document.body,
  );
}
