import { ArrowRight, EyeOff, Gauge, Scale, Sigma } from 'lucide-react';

import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils/cn';

import { type Feature, FEATURES } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { FeatureArt } from './feature-art';

const icons: Record<Feature['id'], typeof EyeOff> = {
  blind: EyeOff,
  pairings: Scale,
  ratings: Gauge,
  method: Sigma,
};

/** A 12-column bento: two wide cards and two narrow ones, swapping sides on the second row. */
const span: Record<Feature['id'], string> = {
  blind: 'lg:col-span-7',
  pairings: 'lg:col-span-5',
  ratings: 'lg:col-span-5',
  method: 'lg:col-span-7',
};

/** Why blind battles: four honest reasons, each with the product piece that proves it. */
export function FeaturesSection({ stats }: { stats: LiveStatsState }) {
  return (
    <section aria-labelledby="why-title" className="border-t border-line py-20 md:py-28">
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <SectionTitle
          id="why-title"
          kicker="Why blind battles"
          title="Fair by design."
          accent="Judged by people."
          lead="A model’s name can sway a vote before a word is read. The Arena takes the names away, so the only thing left to judge is the answer."
        />
        <div className="mt-12 grid grid-cols-1 gap-4 md:mt-16 lg:grid-cols-12 lg:gap-5">
          {FEATURES.map(feature => {
            const Icon = icons[feature.id];
            return (
              <article
                key={feature.id}
                data-feature={feature.id}
                className={cn(
                  'surface-duel flex hover-rise flex-col gap-6 overflow-hidden p-5 sm:p-7',
                  span[feature.id],
                )}
              >
                <FeatureArt id={feature.id} stats={stats} />
                <div className="mt-auto">
                  <span className="grid size-9 place-items-center rounded-md border border-mind-a-edge bg-mind-a-tint">
                    <Icon aria-hidden="true" className="size-4.5 text-mind-a" strokeWidth={1.75} />
                  </span>
                  <h3 className="mt-4 text-h3 font-semibold text-fg">{feature.title}</h3>
                  <p className="mt-2 max-w-[52ch] text-body text-fg-soft">{feature.body}</p>
                  {feature.link ? (
                    <a
                      href={feature.link.href}
                      className="mt-3 inline-flex w-fit items-center gap-1 rounded-sm font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
                    >
                      {feature.link.label}
                      <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
                    </a>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
