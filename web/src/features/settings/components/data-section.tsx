import { useQuery } from '@tanstack/react-query';
import {
  Braces,
  CircleAlert,
  CircleCheck,
  CodeXml,
  Download,
  FileText,
  Mail,
  Printer,
  RotateCw,
  Sheet,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { Button, buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api-client';
import { threadsQuery } from '@/lib/api';
import { cn } from '@/lib/utils/cn';

import { type ExportState, useExport } from '../hooks/use-export';
import { EXPORT_THREAD_LIMIT, type ExportAccount, type ExportFormat } from '../lib/export-format';
import { ChoiceCards, type ChoiceOption } from './choice-cards';
import { PrintExport, printExport } from './print-export';
import { SettingsCard, SettingsSection } from './settings-card';

const FORMAT_OPTIONS: ReadonlyArray<ChoiceOption<ExportFormat>> = [
  { value: 'markdown', label: 'Markdown', icon: FileText, description: '.md, readable anywhere' },
  { value: 'json', label: 'JSON', icon: Braces, description: '.json, for scripts' },
  { value: 'csv', label: 'CSV', icon: Sheet, description: '.csv, one row per turn' },
  { value: 'html', label: 'HTML', icon: CodeXml, description: '.html, opens in a browser' },
  { value: 'pdf', label: 'PDF', icon: Printer, description: 'Print, or save as PDF' },
];

const FORMAT_NAMES: Record<ExportFormat, string> = {
  markdown: 'Markdown',
  json: 'JSON',
  csv: 'CSV',
  html: 'HTML',
  pdf: 'PDF',
};

/** One line for screen readers per stage, not per thread (the progress bar has the count). */
function statusLine(state: ExportState): string {
  switch (state.status) {
    case 'running':
      return state.phase === 'listing'
        ? 'Export started. Finding your threads.'
        : `Reading ${state.total} ${state.total === 1 ? 'thread' : 'threads'}.`;
    case 'done':
      return state.fileName
        ? `Export finished. ${state.fileName} was downloaded.`
        : 'Export finished. The print dialog is open.';
    case 'cancelled':
      return 'Export cancelled.';
    default:
      return '';
  }
}

const INCLUDED = [
  'Every battle, side-by-side comparison and chat: its title, mode and dates, each prompt, both answers, the models, response times and your vote.',
  'Battles you have not voted on keep their models and timings hidden, as in the Arena.',
  `Up to your ${EXPORT_THREAD_LIMIT} most recent threads: the API lists no more than that for now.`,
  'Built in your browser and saved straight to your device. Nothing is uploaded.',
  'Not included: your password or sign-in details, and threads you deleted.',
];

function Progress({ done, total, listing }: { done: number; total: number; listing: boolean }) {
  const ratio = total === 0 ? 0 : done / total;
  const label = listing
    ? 'Finding your threads'
    : `Reading thread ${Math.min(done + 1, total)} of ${total}`;
  return (
    <div className="grid gap-2" data-testid="export-progress">
      <div className="flex items-center justify-between gap-3 text-ui-sm">
        <span className="text-fg">{label}</span>
        <span className="font-mono text-caption text-muted tabular-nums" aria-hidden="true">
          {Math.round(ratio * 100)}%
        </span>
      </div>
      <div
        role="progressbar"
        aria-label="Export progress"
        aria-valuemin={0}
        aria-valuemax={Math.max(total, 1)}
        aria-valuenow={done}
        aria-valuetext={listing ? 'Finding your threads' : `${done} of ${total} threads read`}
        className="h-1.5 overflow-hidden rounded-full bg-surface-3"
      >
        <div
          className="h-full origin-left rounded-full bg-mind-a transition-transform duration-(--dur-base) ease-out-expo"
          style={{ transform: `scaleX(${listing ? 0.04 : Math.max(ratio, 0.04)})` }}
        />
      </div>
    </div>
  );
}

function Outcome({
  state,
  onRetry,
  onClosePrint,
  printing,
}: {
  state: ExportState;
  onRetry: () => void;
  onClosePrint: () => void;
  printing: boolean;
}) {
  if (state.status === 'error') {
    return (
      <div
        role="alert"
        data-testid="export-error"
        className="grid gap-3 rounded-md border border-bad/40 bg-bad/10 px-4 py-3.5"
      >
        <p className="flex items-start gap-2 text-ui-sm text-fg">
          <CircleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-bad" />
          <span>
            The export stopped before it finished. {state.message} Nothing was downloaded.
          </span>
        </p>
        {state.requestId ? (
          <p className="font-mono text-caption break-all text-muted">
            Request id {state.requestId}
          </p>
        ) : null}
        <div>
          <Button variant="secondary" size="sm" onClick={onRetry}>
            <RotateCw aria-hidden="true" strokeWidth={1.75} />
            Try again
          </Button>
        </div>
      </div>
    );
  }
  if (state.status === 'done') {
    const counts = `${state.threads} ${state.threads === 1 ? 'thread' : 'threads'}, ${state.turns} ${state.turns === 1 ? 'turn' : 'turns'}`;
    return (
      <div
        data-testid="export-done"
        className="grid gap-3 rounded-md border border-ok/40 bg-ok/10 px-4 py-3.5"
      >
        <p className="flex items-start gap-2 text-ui-sm text-fg">
          <CircleCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-ok" />
          <span>
            {state.fileName
              ? `Downloaded ${state.fileName}: ${counts}.`
              : `The print view is ready: ${counts}. In the print dialog, choose “Save as PDF”.`}
            {state.truncated
              ? ` Only your ${EXPORT_THREAD_LIMIT} most recent threads are in it.`
              : ''}
          </span>
        </p>
        {printing ? (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" onClick={printExport}>
              <Printer aria-hidden="true" strokeWidth={1.75} />
              Print again
            </Button>
            <Button variant="ghost" size="sm" onClick={onClosePrint}>
              <X aria-hidden="true" strokeWidth={1.75} />
              Close the print view
            </Button>
          </div>
        ) : null}
      </div>
    );
  }
  if (state.status === 'cancelled') {
    return <p className="text-ui-sm text-fg-soft">Export cancelled. Nothing was downloaded.</p>;
  }
  return null;
}

function ExportCard({ account }: { account: ExportAccount }) {
  const api = useApiClient();
  const threads = useQuery(threadsQuery(api, EXPORT_THREAD_LIMIT));
  const [format, setFormat] = useState<ExportFormat>('markdown');
  const { state, start, cancel, printJob, closePrint } = useExport(account);
  const running = state.status === 'running';
  const empty = threads.isSuccess && threads.data.length === 0;
  const count = threads.data?.length ?? 0;

  let summary;
  if (threads.isPending) {
    summary = (
      <div className="flex items-center gap-3" aria-busy="true">
        <Skeleton className="h-4 w-40" />
        <span className="sr-only">Counting your threads</span>
      </div>
    );
  } else if (empty) {
    summary = (
      <div className="grid gap-1" data-testid="export-empty">
        <p className="text-ui-sm font-medium text-fg">Nothing to export yet.</p>
        <p className="text-ui-sm text-fg-soft">
          Your battles and chats appear here once you start one.{' '}
          <a
            href="/"
            className="text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
          >
            Start a battle
          </a>
        </p>
      </div>
    );
  } else if (threads.isError) {
    summary = (
      <p className="text-ui-sm text-fg-soft">
        We could not count your threads just now. The export will try again.
      </p>
    );
  } else {
    summary = (
      <p className="text-ui-sm text-fg-soft" data-testid="export-count">
        <span className="font-medium text-fg tabular-nums">
          {count >= EXPORT_THREAD_LIMIT ? `${EXPORT_THREAD_LIMIT}+` : count}
        </span>{' '}
        {count === 1 ? 'thread' : 'threads'} ready to export.
      </p>
    );
  }

  return (
    <SettingsCard
      title="Export your battles and chats"
      description="Download everything you asked and every answer you got, to keep or to move elsewhere."
      testId="export-card"
      footer={
        <>
          <span>Built in your browser. Nothing is uploaded.</span>
          <div className="flex flex-wrap items-center gap-2">
            {running ? (
              <Button variant="ghost" size="sm" onClick={cancel}>
                Cancel
              </Button>
            ) : null}
            <Button size="sm" loading={running} disabled={empty} onClick={() => start(format)}>
              {format === 'pdf' ? (
                <Printer aria-hidden="true" strokeWidth={1.75} />
              ) : (
                <Download aria-hidden="true" strokeWidth={1.75} />
              )}
              {format === 'pdf' ? 'Open the print view' : `Export as ${FORMAT_NAMES[format]}`}
            </Button>
          </div>
        </>
      }
    >
      {({ descriptionId }) => (
        <div className="grid gap-5">
          <ChoiceCards
            legend="File format"
            value={format}
            options={FORMAT_OPTIONS}
            columns={5}
            describedBy={descriptionId}
            onChange={setFormat}
          />
          <p role="status" className="sr-only">
            {statusLine(state)}
          </p>
          <div className="grid gap-3">
            {running ? (
              <Progress done={state.done} total={state.total} listing={state.phase === 'listing'} />
            ) : (
              summary
            )}
            <Outcome
              state={state}
              onRetry={() => start(state.status === 'error' ? state.format : format)}
              onClosePrint={closePrint}
              printing={printJob !== null}
            />
          </div>
          <details className="group/included rounded-md border border-line bg-surface-2 px-4 py-3">
            <summary className="cursor-pointer text-ui-sm font-medium text-fg marker:text-muted pointer-coarse:py-3">
              What is in the export
            </summary>
            <ul className="mt-3 grid list-disc gap-1.5 pl-5 text-ui-sm text-fg-soft marker:text-muted">
              {INCLUDED.map(line => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </details>
          {printJob ? <PrintExport job={printJob} /> : null}
        </div>
      )}
    </SettingsCard>
  );
}

function DeleteAccountCard({ email }: { email: string | null }) {
  const subject = 'Delete my DualMind Arena account';
  const body = [
    `Please delete my DualMind Arena account${email ? ` (${email})` : ''} and the data tied to it.`,
    '',
    'My votes: delete them / keep them as anonymous totals (choose one).',
  ].join('\n');
  const mailto = `mailto:privacy@dualmindlab.tech?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  return (
    <SettingsCard
      title="Delete your account"
      tone="danger"
      testId="delete-account-card"
      description={
        <p>
          There is no delete button yet. Email us from{' '}
          {email ? <span className="font-medium text-fg">{email}</span> : 'your sign-in address'}{' '}
          and we delete your account and your conversations, then confirm by email. Export first if
          you want a copy.
        </p>
      }
      footer={
        <>
          <span>
            How we handle it:{' '}
            <a
              href="/privacy/#your-rights"
              className="text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
            >
              Privacy Policy, your rights
            </a>
          </span>
          <a
            href={mailto}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'text-bad')}
          >
            <Mail aria-hidden="true" strokeWidth={1.75} />
            Email a deletion request
          </a>
        </>
      }
    />
  );
}

/** Your data: the export (Markdown, JSON, CSV, HTML, PDF) and how to delete the account. */
export function DataSection({ account }: { account: ExportAccount }) {
  return (
    <SettingsSection
      id="data"
      title="Your data"
      description="A copy of everything you did in the Arena, and how to leave."
    >
      <ExportCard account={account} />
      <DeleteAccountCard email={account.email} />
    </SettingsSection>
  );
}
