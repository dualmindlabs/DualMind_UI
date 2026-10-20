import { Timeline } from '@/components/vendor/aceternity/timeline';
import { BlurFade } from '@/components/vendor/magicui/blur-fade';

import { EffectDemoAnimatedBeam } from './effect-demo-animated-beam';
import { EffectDemoComposer } from './effect-demo-composer';
import { EffectDemoLogoLoop } from './effect-demo-logo-loop';
import { EffectDemoMarquee } from './effect-demo-marquee';
import { EffectFrame } from './effect-frame';
import { MindBadge } from './mind-badge';

const steps = [
  {
    title: 'Ask',
    content: (
      <p className="max-w-reading text-ui text-fg-soft">
        One prompt goes to two anonymous models at the same time.
      </p>
    ),
  },
  {
    title: 'Compare',
    content: (
      <p className="max-w-reading text-ui text-fg-soft">
        Both answers arrive side by side, in identical panes. Only the letter tells them apart.
      </p>
    ),
  },
  {
    title: 'Vote',
    content: (
      <p className="max-w-reading text-ui text-fg-soft">
        Pick the better one, or call a tie. Then the names appear and the ratings move.
      </p>
    ),
  },
];

/** Animated Beam, Blur Fade, Marquee, Logo Loop, Timeline and the hero composer. */
export function EffectsFlow() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <EffectDemoAnimatedBeam />

      <EffectFrame effect="blur-fade" replay>
        <div className="grid w-full max-w-xs gap-2">
          {['Faster', 'Clearer', 'Funnier'].map((reason, index) => (
            <BlurFade key={reason} delay={0.12 * index} direction="up">
              <p className="flex items-center gap-2.5 rounded-md border border-line bg-surface-2 px-3 py-2 text-ui-sm text-fg">
                <MindBadge side={index === 1 ? 'b' : 'a'} />
                {reason}
              </p>
            </BlurFade>
          ))}
        </div>
      </EffectFrame>

      <EffectDemoComposer />
      <EffectDemoMarquee />
      <EffectDemoLogoLoop />

      <EffectFrame
        effect="timeline"
        className="sm:col-span-2 xl:col-span-3"
        stageClassName="block p-0 py-6"
      >
        <Timeline data={steps} titleAs="p" />
      </EffectFrame>
    </div>
  );
}
