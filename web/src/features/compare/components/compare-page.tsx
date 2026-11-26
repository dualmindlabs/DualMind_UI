import { useMutation, useQuery } from '@tanstack/react-query';
import { CircleAlert } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { useParams } from 'react-router';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { buttonVariants } from '@/components/ui/button';
import { AccountMenu, useModelOptions } from '@/features/arena';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import { useRequireAuth } from '@/hooks/use-require-auth';
import { type CompareInput, type CompareResult, isApiError, isCompareShareId } from '@/lib/api';
import { reportShareHref } from '@/lib/site/links';
import { loginUrl } from '@/lib/supabase';

import { useCompareAvailable } from '../hooks/use-compare-available';
import { compareErrorMessage, isCompareOff } from '../lib/errors';
import { compareUrl, formatDay } from '../lib/format';
import { forgetOwned, isOwned, rememberOwned } from '../lib/owned';
import { CompareAnswers, CompareAnswersLoading } from './compare-answers';
import { CompareForm } from './compare-form';
import { CompareSharing } from './compare-sharing';
import {
  CompareLoadError,
  CompareNotFound,
  CompareSkeleton,
  CompareUnavailable,
} from './compare-states';

function Shell({
  children,
  signedIn,
  title,
  lead,
}: {
  children: ReactNode;
  signedIn: boolean;
  title: string;
  lead: string;
}) {
  return (
    <>
      <SkipLink />
      <SiteHeader variant="app" account={signedIn ? <AccountMenu /> : undefined} />
      <main id="main" tabIndex={-1} className="outline-none" data-testid="compare-page">
        <PageContainer className="grid gap-8 pt-10 pb-20 md:pt-14 md:pb-28">
          <header className="relative isolate overflow-hidden rounded-xl border border-line mesh-duel p-6 shadow-lift sm:p-10">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -z-10 bg-grid opacity-60"
            />
            <p className="kicker text-mind-a">Compare</p>
            <h1 className="mt-4 max-w-[20ch] text-h1 text-balance text-fg">{title}</h1>
            <p className="mt-3 max-w-reading text-lead text-fg-soft">{lead}</p>
          </header>
          {children}
        </PageContainer>
      </main>
      <SiteFooter />
    </>
  );
}

/** What the result says about itself, above the answers: the prompt, and a replay or warning. */
function ResultHeader({ result }: { result: CompareResult }) {
  return (
    <div className="grid gap-3">
      <div className="grid gap-1">
        <h2 className="kicker text-fg-soft">The prompt</h2>
        <p
          data-testid="compare-prompt"
          className="max-w-reading text-body [overflow-wrap:anywhere] whitespace-pre-wrap text-fg"
        >
          {result.prompt}
        </p>
      </div>
      {result.replayed ? (
        <p data-testid="compare-replayed" className="text-ui-sm text-fg-soft">
          You just asked this. This is the answer from that run, so nothing was asked again.
        </p>
      ) : null}
      {result.warnings.map(warning => (
        <p key={warning} className="flex items-start gap-2 text-ui-sm text-warn">
          <CircleAlert aria-hidden="true" strokeWidth={1.75} className="mt-0.5 size-4 shrink-0" />
          {warning}
        </p>
      ))}
    </div>
  );
}

function RunView() {
  const api = useApiClient();
  const status = useRequireAuth();
  const { user } = useAuth();
  const signedIn = status === 'signed-in' && user !== null;
  const available = useCompareAvailable(signedIn);
  const models = useModelOptions();
  const [result, setResult] = useState<CompareResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [off, setOff] = useState(false);
  const [announce, setAnnounce] = useState('');
  const resultRef = useRef<HTMLDivElement>(null);

  const run = useMutation({
    mutationFn: (input: CompareInput) => api.runCompare(input),
    onMutate: () => {
      setError(null);
      setResult(null);
      setAnnounce('Asking both models. This can take up to a minute.');
    },
    onSuccess: next => {
      if (next.shareId !== null) rememberOwned(next.shareId);
      setResult(next);
      setAnnounce('Both answers are ready.');
      // The answers land below the form; move there so keyboard and screen reader users follow.
      requestAnimationFrame(() => resultRef.current?.focus({ preventScroll: false }));
    },
    onError: failure => {
      if (isCompareOff(failure)) setOff(true);
      const message = compareErrorMessage(failure);
      setError(message);
      setAnnounce(message);
    },
  });

  let body: ReactNode;
  if (status === 'loading' || (signedIn && available === undefined)) {
    body = <CompareSkeleton label="Loading compare" />;
  } else if (!signedIn) {
    body = (
      <div data-testid="compare-signed-out" className="grid max-w-reading gap-4 surface-float p-6">
        <h2 className="text-h3 text-fg">Sign in to compare</h2>
        <p className="text-ui text-fg-soft">
          Compare runs two models for you and stores the result under your account, private by
          default.
        </p>
        {status === 'unavailable' ? null : (
          <a
            href={loginUrl('/compare/', window.location.origin)}
            className={buttonVariants({ variant: 'primary', size: 'md' })}
          >
            Sign in
          </a>
        )}
      </div>
    );
  } else if (available === false || off) {
    body = <CompareUnavailable />;
  } else {
    body = (
      <>
        <CompareForm
          options={models.options}
          catalogueFailed={models.isError}
          onRetryCatalogue={() => void models.refetch()}
          running={run.isPending}
          onRun={input => run.mutate(input)}
        />
        {error ? (
          <p
            role="alert"
            data-testid="compare-run-error"
            className="flex max-w-reading items-start gap-3 rounded-md border border-bad/45 bg-surface px-4 py-3 text-ui text-fg-soft"
          >
            <CircleAlert
              aria-hidden="true"
              strokeWidth={1.75}
              className="mt-0.5 size-5 shrink-0 text-bad"
            />
            {error}
          </p>
        ) : null}
        {run.isPending ? <CompareAnswersLoading /> : null}
        {result ? (
          <div
            ref={resultRef}
            tabIndex={-1}
            aria-label="Compare result"
            data-testid="compare-result"
            className="grid gap-6 outline-none"
          >
            <ResultHeader result={result} />
            <CompareAnswers result={result} />
            <CompareSharing
              result={result}
              owner
              onDeleted={() => {
                if (result.shareId !== null) forgetOwned(result.shareId);
                setResult(null);
                setAnnounce('The result was deleted.');
              }}
            />
          </div>
        ) : null}
        <p role="status" aria-live="polite" className="sr-only">
          {announce}
        </p>
      </>
    );
  }

  return (
    <Shell
      signedIn={signedIn}
      title="Two models. One question. Names shown."
      lead="Pick the two models yourself and read both answers side by side. Nothing here is blind, and nothing counts toward the leaderboard."
    >
      {body}
    </Shell>
  );
}

function SharedView({ shareId }: { shareId: string }) {
  const api = useApiClient();
  const { status } = useAuth();
  const valid = isCompareShareId(shareId);
  const query = useQuery({
    queryKey: ['dualmind-api', 'compare', 'result', shareId, status === 'signed-in'],
    queryFn: ({ signal }) => api.getCompare(shareId, { signal, retry: false }),
    enabled: valid && status !== 'loading',
    retry: false,
  });
  const [deleted, setDeleted] = useState(false);

  let body: ReactNode;
  if (!valid || deleted) {
    body = <CompareNotFound />;
  } else if (query.isPending) {
    body = <CompareSkeleton label="Loading the result" />;
  } else if (query.isError) {
    const notFound = isApiError(query.error) && query.error.kind === 'not_found';
    body = isCompareOff(query.error) ? (
      <CompareUnavailable />
    ) : notFound ? (
      <CompareNotFound />
    ) : (
      <CompareLoadError
        message={compareErrorMessage(query.error)}
        retrying={query.isFetching}
        onRetry={() => void query.refetch()}
      />
    );
  } else {
    const result = query.data;
    const expires = formatDay(result.expiresAt);
    body = (
      <div data-testid="compare-result" className="grid gap-6">
        <ResultHeader result={result} />
        <CompareAnswers result={result} />
        <CompareSharing
          result={result}
          owner={status === 'signed-in' && isOwned(shareId)}
          onDeleted={() => {
            forgetOwned(shareId);
            setDeleted(true);
          }}
        />
        <p className="text-caption text-muted">
          A compare is two named models answering one prompt. It is not a blind vote and it does not
          change the leaderboard.
          {expires ? ` This result is deleted after ${expires}.` : ''}
        </p>
        <p className="text-ui-sm text-muted print:hidden" data-testid="compare-ai-notice">
          These answers were written by AI models and have not been reviewed.{' '}
          <a
            href={reportShareHref(shareId, compareUrl(shareId))}
            className="text-mind-a underline underline-offset-4"
          >
            Report this page
          </a>
        </p>
      </div>
    );
  }

  return (
    <Shell
      signedIn={status === 'signed-in'}
      title="A compare, side by side."
      lead="Two models were asked the same prompt. Their names are shown."
    >
      {body}
    </Shell>
  );
}

/**
 * `/compare/` (run one, signed in) and `/compare/<shareId>` (read a stored result: the owner's,
 * or any shared one). Client-only and noindex. Compare is behind a backend flag: while it is off
 * the page says so and points at the Arena's Side by side mode; nothing else on the site links
 * here until the flag is on.
 */
export function ComparePage() {
  const { shareId } = useParams();
  return shareId ? <SharedView shareId={shareId} /> : <RunView />;
}
