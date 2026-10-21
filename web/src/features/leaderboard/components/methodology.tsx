import { ArrowRight } from 'lucide-react';

import { PageSection } from '@/components/layout/page-section';

import { PROVISIONAL_BATTLES, RATINGS_HELP_HREF } from '../lib/constants';

const ITEMS = [
  {
    term: 'Elo rating',
    text: 'Each vote is a match between the two models in a battle. The winner takes rating points from the loser, and an upset moves more points than an expected result.',
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
    term: 'Uncertainty',
    text: 'Planned: a confidence range for every rating, once the API reports one. Until then, the number of battles is the best guide to how settled a rating is.',
  },
] as const;

/**
 * "How to read the board": the rules behind the numbers, in the prerendered HTML so they read
 * without JavaScript and search engines see them. Says only what the API does today; confidence
 * intervals are marked as planned.
 */
export function Methodology() {
  return (
    <PageSection
      id="methodology"
      eyebrow="Methodology"
      title={
        <>
          How to read <span className="human-voice text-human">the board.</span>
        </>
      }
      lead="Numbers come straight from the Arena's public model-stats API and refresh every minute while this page is open. Nothing is adjusted or hidden."
      className="border-t border-line"
    >
      <dl className="grid gap-x-10 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
        {ITEMS.map(item => (
          <div key={item.term} className="grid content-start gap-2 border-t border-line pt-5">
            <dt className="text-h3 font-medium text-fg">{item.term}</dt>
            <dd className="text-ui text-fg-soft">{item.text}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-10 max-w-reading text-ui-sm text-muted">
        Wins, losses and ties are reported separately from battles, so for some models they do not
        add up to the same total. Battles in the header count each battle once, although two models
        take part in it.{' '}
        <a
          href={RATINGS_HELP_HREF}
          className="inline-flex items-center gap-1 rounded-sm text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
        >
          The full rating explanation
          <ArrowRight aria-hidden="true" strokeWidth={1.75} className="size-3.5" />
        </a>
      </p>
    </PageSection>
  );
}
