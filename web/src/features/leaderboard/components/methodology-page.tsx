import { useQuery } from '@tanstack/react-query';
import { CircleAlert, RotateCw, ScrollText } from 'lucide-react';

import { PageContainer } from '@/components/layout/page-container';
import { SiteFooter } from '@/components/layout/site-footer';
import { SiteHeader } from '@/components/layout/site-header';
import { SkipLink } from '@/components/layout/skip-link';
import { Button } from '@/components/ui/button';
import { PageHero } from '@/components/ui/page-hero';
import { Skeleton } from '@/components/ui/skeleton';
import { useApiClient } from '@/hooks/use-api-client';
import { getUserMessage, leaderboardMethodologyQuery } from '@/lib/api';

import { parseMethodology } from '../lib/methodology-text';
import { Methodology } from './methodology';

function MethodologySkeleton() {
  return (
    <div aria-busy="true" className="grid gap-4">
      <p role="status" className="sr-only">
        Loading the methodology
      </p>
      {[72, 100, 90, 60].map(width => (
        <Skeleton key={width} className="h-5" style={{ width: `${width}%` }} />
      ))}
    </div>
  );
}

/** The API's own text, section by section. Plain text in, headings and paragraphs out. */
function LiveMethodology({ text }: { text: string }) {
  const { methodId, blocks } = parseMethodology(text);
  return (
    <article data-testid="methodology-live" className="grid max-w-reading gap-4">
      {methodId ? (
        <p className="flex items-center gap-2 text-caption text-muted">
          Method
          <span className="rounded-sm border border-line-strong bg-surface-2 px-2 py-0.5 font-mono text-fg-soft">
            {methodId}
          </span>
          <span>as published by the API</span>
        </p>
      ) : null}
      {blocks.map((block, index) =>
        block.kind === 'heading' ? (
          <h3 key={index} className="pt-4 text-h3 font-semibold text-fg">
            {block.text}
          </h3>
        ) : (
          <p key={index} className="text-ui text-fg-soft">
            {block.text}
          </p>
        ),
      )}
    </article>
  );
}

function ReceiptsSection() {
  return (
    <section id="receipts" aria-labelledby="receipts-title" className="grid max-w-reading gap-4">
      <h2 id="receipts-title" className="text-h2 font-semibold text-fg">
        Receipts
      </h2>
      <p className="text-ui text-fg-soft">
        When receipts are on, every vote is appended to a log in which each entry commits to the one
        before it: <span className="font-mono text-fg">hash = sha256(previous hash + entry)</span>.
        The log holds the two models, your choice and the hour of the vote. It holds no prompt, no
        answer text and no account. After you vote you get the hash of your entry as a receipt;
        anyone can download the log, recompute every hash and refit the board.
      </p>
      <p className="text-ui text-fg-soft" data-testid="receipts-off">
        Receipts are off today, so there is no log to download yet. This page will link it when
        receipts are on.
      </p>
    </section>
  );
}

/**
 * /methodology/: how the crowd board is computed, rendered from `GET /api/leaderboard/methodology`.
 * While that route is off (404), the page falls back to the static explanation the leaderboard
 * already carries and says that the live method is not published yet. Nothing breaks either way.
 */
export function MethodologyPage() {
  const api = useApiClient();
  const query = useQuery(leaderboardMethodologyQuery(api));
  const text = query.data;

  return (
    <>
      <SkipLink />
      <SiteHeader />
      <main id="main" tabIndex={-1} className="outline-none">
        <PageHero>
          <div className="grid max-w-3xl gap-6">
            <p className="kicker">Methodology</p>
            <h1 className="max-w-[16ch] text-h1 text-fg">
              How the board is <span className="human-voice text-human">built.</span>
            </h1>
            <p className="max-w-[52ch] text-lead text-fg-soft">
              The ratings, the intervals and the ranks, as the leaderboard service reports them. The computation is under audit.
            </p>
          </div>
        </PageHero>

        <section aria-labelledby="method-title" className="py-14 md:py-20">
          <PageContainer className="grid gap-12">
            <div className="grid gap-6">
              <h2 id="method-title" className="sr-only">
                The leaderboard method
              </h2>
              {query.isPending ? (
                <MethodologySkeleton />
              ) : query.isError ? (
                <div
                  role="alert"
                  className="flex max-w-reading flex-wrap items-center gap-4 rounded-md border border-bad/45 bg-surface px-4 py-3 text-ui text-fg-soft"
                >
                  <CircleAlert aria-hidden="true" strokeWidth={1.75} className="size-5 text-bad" />
                  <span className="min-w-0 flex-1">{getUserMessage(query.error)}</span>
                  <Button variant="ghost" onClick={() => void query.refetch()}>
                    <RotateCw aria-hidden="true" strokeWidth={1.75} />
                    Try again
                  </Button>
                </div>
              ) : text ? (
                <LiveMethodology text={text} />
              ) : (
                <p
                  data-testid="methodology-fallback"
                  className="flex max-w-reading items-start gap-3 rounded-md border border-line bg-surface px-4 py-3 text-ui text-fg-soft"
                >
                  <ScrollText
                    aria-hidden="true"
                    strokeWidth={1.75}
                    className="mt-0.5 size-5 shrink-0 text-muted"
                  />
                  The measured method (confidence intervals and rank ranges) is not published yet.
                  Below is how the classic board reads today.
                </p>
              )}
            </div>
            <ReceiptsSection />
          </PageContainer>
        </section>

        {text ? null : <Methodology />}
      </main>
      <SiteFooter />
    </>
  );
}
