import { ArrowRight, Trophy } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { BorderBeam } from '@/components/vendor/magicui/border-beam';
import { ShineBorder } from '@/components/vendor/magicui/shine-border';
import { BorderTrail } from '@/components/vendor/motion-primitives/border-trail';
import { Magnet } from '@/components/vendor/reactbits/magnet';
import { ShinyText } from '@/components/vendor/reactbits/shiny-text';
import { StarBorder } from '@/components/vendor/reactbits/star-border';

import { EffectDemoElectricBorder } from './effect-demo-electric-border';
import { EffectFrame } from './effect-frame';
import { MindBadge } from './mind-badge';

/** Border Beam, Border Trail, Shine Border, Electric Border, Star Border and Magnet. */
export function EffectsBorders() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <EffectFrame effect="border-beam">
        <div className="relative w-full max-w-xs rounded-lg border border-line bg-surface-2 p-4 shadow-raise">
          <div className="flex items-center gap-2.5">
            <MindBadge side="a" />
            <span className="text-ui font-semibold text-mind-a">Answer A</span>
          </div>
          <p className="mt-3 text-ui-sm">
            <ShinyText>Generating</ShinyText>
          </p>
          <BorderBeam duration={5} size={80} colorFrom="--mind-a" colorTo="--mind-a" />
        </div>
      </EffectFrame>

      <EffectFrame effect="border-trail">
        <div className="relative w-full max-w-xs rounded-lg border border-line bg-surface-2 p-4 shadow-raise">
          <div className="flex items-center gap-2.5">
            <MindBadge side="b" />
            <span className="text-ui font-semibold text-mind-b-text">Answer B</span>
          </div>
          <p className="mt-3 text-ui-sm text-muted">Waiting for the first token</p>
          <BorderTrail size={70} duration={4} color="--mind-b" />
        </div>
      </EffectFrame>

      <EffectFrame effect="shine-border">
        <div className="relative w-full max-w-xs rounded-lg bg-surface-2 p-4 shadow-raise-strong">
          <ShineBorder borderWidth={1} duration={12} />
          <div className="flex items-center justify-between gap-3">
            <span className="eyebrow text-human">#1 this week</span>
            <Trophy aria-hidden="true" className="size-4 text-human" strokeWidth={1.75} />
          </div>
          <p className="mt-2 text-h3 font-semibold text-fg">Vega 7</p>
          <p className="mt-1 font-mono text-caption text-muted tabular-nums">
            Elo 1342 · 61% win rate
          </p>
        </div>
      </EffectFrame>

      <EffectDemoElectricBorder />

      <EffectFrame effect="star-border">
        <StarBorder radius={10} duration={4.5}>
          <a
            href="#effects"
            className="inline-flex h-11 items-center gap-2 rounded-md bg-surface-2 px-5 text-ui font-medium text-fg"
          >
            Start a battle
            <ArrowRight aria-hidden="true" className="size-4" strokeWidth={2} />
          </a>
        </StarBorder>
      </EffectFrame>

      <EffectFrame effect="magnet">
        <div className="grid justify-items-center gap-3 text-center">
          <Magnet padding={70} strength={3}>
            <Button variant="human">Cast your vote</Button>
          </Magnet>
          <p className="text-caption text-muted">Move the pointer close to the button.</p>
        </div>
      </EffectFrame>
    </div>
  );
}
