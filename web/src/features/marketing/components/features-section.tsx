import { ArrowRight, EyeOff, Gauge, Scale, Sigma } from 'lucide-react';

import { BentoGrid, BentoGridItem } from '@/components/vendor/aceternity/bento-grid';
import { GlowingEffect } from '@/components/vendor/aceternity/glowing-effect';

import { type Feature, FEATURES } from '../content/landing';
import { FeatureArt } from './feature-art';
import { SectionHeading } from './section-heading';

const icons: Record<Feature['id'], typeof EyeOff> = {
  blind: EyeOff,
  pairings: Scale,
  ratings: Gauge,
  method: Sigma,
};

const layout: Record<Feature['id'], string> = {
  blind: 'md:col-span-2',
  pairings: 'md:row-span-2',
  ratings: '',
  method: '',
};

/** 02, why blind battles: four honest reasons, as a bento grid with a pointer-following glow. */
export function FeaturesSection() {
  return (
    <section aria-labelledby="why-title" className="border-t border-line py-20 md:py-28">
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <SectionHeading
          id="why-title"
          index="02"
          eyebrow="Why blind battles"
          title={
            <>
              Fair by design. <span className="human-voice text-human">Judged by people.</span>
            </>
          }
          lead="A model’s name can sway a vote before a word is read. The Arena takes the names away, so the only thing left to judge is the answer."
        />
        <BentoGrid className="mt-12 md:mt-16 md:auto-rows-[16.5rem]">
          {FEATURES.map(feature => {
            const Icon = icons[feature.id];
            return (
              <BentoGridItem
                key={feature.id}
                title={feature.title}
                className={layout[feature.id]}
                icon={<Icon aria-hidden="true" className="size-5 text-mind-a" strokeWidth={1.75} />}
                header={
                  <div className="flex min-h-0 flex-1 flex-col justify-center">
                    <FeatureArt id={feature.id} />
                  </div>
                }
                description={
                  <>
                    {feature.body}
                    {feature.link ? (
                      <a
                        href={feature.link.href}
                        className="mt-2 flex w-fit items-center gap-1 rounded-sm font-medium text-mind-a underline decoration-mind-a/40 underline-offset-4 hover:decoration-current"
                      >
                        {feature.link.label}
                        <ArrowRight aria-hidden="true" className="size-3.5" strokeWidth={2} />
                      </a>
                    ) : null}
                  </>
                }
              >
                <GlowingEffect spread={36} proximity={56} inactiveZone={0.01} borderWidth={1} />
              </BentoGridItem>
            );
          })}
        </BentoGrid>
      </div>
    </section>
  );
}
