import { ArrowRight } from 'lucide-react';

import { PageContainer } from '@/components/layout/page-container';
import { SectionTitle } from '@/components/ui/section-title';

import { PROVISIONAL_BATTLES, RATINGS_HELP_HREF } from '../lib/constants';

const ITEMS = [
  {
    term: 'Elo rating',
    text: 'Elo is a rating system where each vote counts as a match between two models, and an upset moves more points than an expected result. The ratings shown here are computed by the leaderboard service, and we are auditing that they follow from the recorded votes.',
  },
  {
    term: 'Win rate',
    text: 'Wins divided by battles. Ties count as non-wins, so a model that ties often shows a lower win rate than its rating suggests.',
  },
  {
    term: 'Not yet rated',
    text: `Fewer than ${PROVISIONAL_BATTLES} battles. A few votes can still move such a rating a long way, so these models are listed apart, without a rank, and stay off the podium until they have enough battles.`,
  },
  {
    term: 'Rating range',
    text: 'The band beside each Elo is an estimate, not an API figure: a 95% range worked out on this page from the model’s own wins, losses and ties. It is wide with few battles and narrows as they add up. The API does not report a confidence interval yet.',
  },
] as const;

/** What changes when the backend serves the crowd board (fitted ratings, measured intervals). */
const CROWD_ITEMS = {
  'Elo rating':
    'Ratings are fitted from all blind votes together with a Bradley-Terry model, not updated vote by vote. A gap of 100 points means the higher model wins about 64% of decisive votes. Models with too few votes keep a seeded starting value and are marked not yet rated.',
  'Not yet rated':
    'Too few votes for a fitted rating. These models show a seeded starting value, are listed apart without a rank, and stay off the podium until enough votes are in.',
  'Rating range':
    'The line on each bar is a 95% interval from the API: the votes are resampled 400 times and the model refitted each time. Next to the rank, a range such as 2–4 means the intervals still allow any of those ranks. A model gets a rank only with enough votes and a narrow enough interval; one without a rank is listed by rating.',
} as const;

/**
 * "How to read the board": the rules behind the numbers, in the prerendered HTML so they read
 * without JavaScript and search engines see them. Says what comes from the API and what is worked
 * out on the page (the rating range, the rank movement).
 */
export function Methodology({ crowd = false }: { crowd?: boolean }) {
  return (
    <section
      id="methodology"
      aria-labelledby="methodology-title"
      className="border-t border-line bg-bg-deep py-16 md:py-24"
    >
      <PageContainer>
        <SectionTitle
          id="methodology-title"
          kicker="Methodology"
          title="How to read"
          accent="the board."
          lead="Numbers come straight from the Arena's public API and refresh every minute while this page is open. The ratings are under audit while we check them against the recorded votes."
          className="mb-10 md:mb-14"
        />
        <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
          {ITEMS.map(base => {
            const crowdText = crowd
              ? CROWD_ITEMS[base.term as keyof typeof CROWD_ITEMS]
              : undefined;
            return { term: base.term, text: crowdText ?? base.text };
          }).map(item => (
            <div
              key={item.term}
              className="grid content-start gap-2 border-t border-line-strong pt-5"
            >
              <dt className="text-h3 font-semibold text-fg">{item.term}</dt>
              <dd className="text-ui text-fg-soft">{item.text}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 max-w-reading text-ui-sm text-muted">
          Wins, losses and ties are reported separately from battles, so for some models they do not
          add up to the same total. Battles in the header count each battle once, although two
          models take part in it. Rank movement compares with the ranks this browser showed at your
          last visit; it is kept on your device only and appears from your second visit.{' '}
          {crowd ? (
            <>
              <a
                href="/methodology/"
                className="inline-flex items-center gap-1 rounded-sm text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
              >
                The full method, from the API
                <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
              </a>
              {' · '}
            </>
          ) : null}
          <a
            href={RATINGS_HELP_HREF}
            className="inline-flex items-center gap-1 rounded-sm text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
          >
            The full rating explanation
            <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
          </a>
        </p>
      </PageContainer>
    </section>
  );
}
