import { useQuery } from '@tanstack/react-query';
import { ArrowRight, Check, Copy, Link2, Share2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { Button, buttonVariants } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { ThreadTranscript } from '@/features/arena';
import { useApiClient } from '@/hooks/use-api-client';
import { useAuth } from '@/hooks/use-auth';
import { leaderboardQuery, type SharedThread } from '@/lib/api';
import { shareIdFromLocation, sharePath, shareUrl } from '@/lib/site/share';
import { canShareNatively, copyText, shareNatively } from '@/lib/utils/clipboard';
import { cn } from '@/lib/utils/cn';

import { useSharedThread } from '../hooks/use-shared-thread';
import { formatShareDate, shareDocumentTitle, shareSummary } from '../lib/summary';
import {
  RUN_YOUR_OWN_HREF,
  ShareError,
  ShareSkeleton,
  ShareUnavailable,
} from './share-states';

function useModelNames(): ReadonlyMap<string, string> {
  const api = useApiClient();
  // The public leaderboard has every model's display name; without it the ids are shortened.
  const board = useQuery({ ...leaderboardQuery(api), retry: false });
  return useMemo(
    () => new Map((board.data ?? []).map(stat => [stat.modelName, stat.displayName])),
    [board.data],
  );
}

function ShareActions({ threadId, title }: { threadId: string; title: string }) {
  const url = shareUrl(threadId);
  const [copied, setCopied] = useState(false);
  const native = { title, text: 'Two AI models answered. See the verdict.', url };
  const [nativeAvailable, setNativeAvailable] = useState(false);

  // After hydration only: the server-rendered fallback must match the first client render.
  useEffect(() => setNativeAvailable(canShareNatively({ url })), [url]);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 2000);
    return () => clearTimeout(timer);
  }, [copied]);

  const copy = async () => {
    if (await copyText(url)) {
      setCopied(true);
      toast.success('Link copied', { description: url });
    } else {
      toast.error('Could not copy the link', {
        description: 'The browser blocked the clipboard. Copy the address bar instead.',
      });
    }
  };

  const CopyIcon = copied ? Check : Copy;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <a
        href={RUN_YOUR_OWN_HREF}
        className={cn(buttonVariants({ variant: 'human', size: 'md' }), 'group/cta')}
      >
        Run your own battle
        <ArrowRight
          aria-hidden="true"
          strokeWidth={1.75}
          className="transition-transform duration-(--dur-fast) ease-out-expo group-hover/cta:translate-x-0.5"
        />
      </a>
      <Button variant="secondary" size="md" onClick={() => void copy()}>
        <CopyIcon aria-hidden="true" strokeWidth={1.75} />
        {copied ? 'Copied' : 'Copy link'}
      </Button>
      {nativeAvailable ? (
        <Button
          variant="ghost"
          size="md"
          onClick={() =>
            void shareNatively(native).then(result => {
              if (result === 'failed') toast.error('Could not open the share sheet');
            })
          }
        >
          <Share2 aria-hidden="true" strokeWidth={1.75} />
          Share…
        </Button>
      ) : null}
    </div>
  );
}

function SharedView({ threadId, shared }: { threadId: string; shared: SharedThread }) {
  const names = useModelNames();
  const summary = useMemo(() => shareSummary(shared), [shared]);
  const { thread, messages } = shared;
  const wide = thread.mode !== 'direct';
  const details = [
    `${summary.turns} ${summary.turns === 1 ? 'turn' : 'turns'}`,
    summary.date ? formatShareDate(summary.date) : null,
  ].filter(Boolean);

  return (
    <>
      <section
        aria-labelledby="share-title"
        className="relative isolate overflow-hidden border-b border-line"
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 dot-grid [mask-image:radial-gradient(ellipse_60%_80%_at_20%_0%,black,transparent)] opacity-60"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-40 left-1/2 -z-10 h-80 w-[min(70rem,140%)] -translate-x-1/2 bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--mind-a)_16%,transparent),transparent),radial-gradient(closest-side,color-mix(in_oklab,var(--mind-b)_14%,transparent),transparent)] bg-[length:55%_100%,55%_100%] bg-[position:0_0,100%_0] bg-no-repeat blur-2xl"
        />
        <PageContainer className="grid gap-5 pt-10 pb-10 md:pt-16 md:pb-12">
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 eyebrow text-muted">
            <Link2 aria-hidden="true" className="size-3.5 text-mind-a" strokeWidth={2} />
            <span className="text-fg-soft">{summary.eyebrow}</span>
            {details.map(detail => (
              <span key={detail} className="before:mr-2 before:content-['·']">
                {detail}
              </span>
            ))}
          </p>
          <h1
            id="share-title"
            className="max-w-[30ch] text-h1 font-medium text-balance break-words text-fg"
          >
            {thread.title}
          </h1>
          <p className="max-w-reading text-body text-fg-soft" data-testid="share-lead">
            {summary.lead}
          </p>
          <ShareActions threadId={threadId} title={thread.title} />
        </PageContainer>
      </section>

      <PageContainer className={cn('py-10 md:py-14', wide ? 'max-w-6xl' : 'max-w-3xl')}>
        <h2 className="sr-only">The {summary.turns === 1 ? 'turn' : 'turns'}</h2>
        {messages.length === 0 ? (
          <p className="text-ui text-fg-soft">This thread has no answers yet.</p>
        ) : (
          <ThreadTranscript messages={messages} threadMode={thread.mode} names={names} />
        )}
      </PageContainer>

      <section aria-labelledby="share-cta" className="border-t border-line bg-surface">
        <PageContainer className="grid gap-6 py-14 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:py-20">
          <div className="grid gap-3">
            <h2 id="share-cta" className="text-h2 font-medium text-balance text-fg">
              Your prompt. <span className="human-voice text-human">Your verdict.</span>
            </h2>
            <p className="max-w-reading text-ui text-fg-soft">
              Ask anything. Two anonymous models answer side by side, you pick the better one, and
              only then do you see who they were. Every vote moves the public leaderboard.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <a
              href={RUN_YOUR_OWN_HREF}
              className={buttonVariants({ variant: 'primary', size: 'lg' })}
            >
              Run your own battle
            </a>
            <a
              href="/leaderboard/"
              className={buttonVariants({ variant: 'ghost', size: 'lg' })}
            >
              See the leaderboard
            </a>
          </div>
        </PageContainer>
      </section>
    </>
  );
}

/**
 * `/share/<id>` (slice S11): a shared battle or chat, read-only, as anyone with the link sees it.
 * The reveal is applied where the battle was voted on (names, the picked answer, timing and
 * length), answers use the arena's hardened Markdown renderer, nothing about the owner is shown,
 * and a clear call to run your own battle. Old links (`/share/?id=`, `?thread=`, `?threadId=`)
 * work and move to the canonical address. The Worker writes the link-preview tags
 * (server/share.js); this page only keeps the tab title in step.
 */
export function SharePage() {
  const location = useLocation();
  const navigate = useNavigate();
  const threadId = shareIdFromLocation(location.pathname, location.search);
  const { query, unavailable } = useSharedThread(threadId);
  const auth = useAuth();
  const shared = query.data;

  // Old link forms and stray slashes become /share/<id>, keeping any #hash.
  useEffect(() => {
    if (threadId === null) return;
    const canonical = sharePath(threadId);
    if (location.pathname !== canonical || location.search !== '') {
      void navigate({ pathname: canonical, hash: location.hash }, { replace: true });
    }
  }, [threadId, location.pathname, location.search, location.hash, navigate]);

  useEffect(() => {
    document.title = shared
      ? shareDocumentTitle(shared.thread.title)
      : unavailable
        ? 'Link unavailable · DualMind Arena'
        : shareDocumentTitle(undefined);
  }, [shared, unavailable]);

  const ownerHref =
    auth.status === 'signed-in' && threadId !== null
      ? `/?thread=${encodeURIComponent(threadId)}`
      : null;

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="min-h-[60svh] outline-none" data-testid="share-page">
        {threadId !== null && shared ? (
          <SharedView threadId={threadId} shared={shared} />
        ) : unavailable ? (
          <ShareUnavailable ownerHref={ownerHref} />
        ) : query.isError ? (
          <ShareError
            error={query.error}
            retrying={query.isFetching}
            onRetry={() => void query.refetch()}
          />
        ) : (
          <ShareSkeleton />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
