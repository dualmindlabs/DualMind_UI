import { MessageSquareText } from 'lucide-react';
import { useRef } from 'react';

import { AnimatedBeam } from '@/components/vendor/magicui/animated-beam';

import { EffectFrame } from './effect-frame';
import { MindBadge } from './mind-badge';

/** Animated Beam: "how a battle works", the prompt travelling to Mind A and Mind B. */
export function EffectDemoAnimatedBeam() {
  const containerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const node =
    'relative z-10 flex size-12 items-center justify-center rounded-full border border-line bg-surface-2 shadow-raise';

  return (
    <EffectFrame effect="animated-beam">
      <div ref={containerRef} className="relative flex w-full max-w-xs items-center justify-between">
        <div ref={promptRef} className={node}>
          <MessageSquareText aria-hidden="true" className="size-5 text-human" strokeWidth={1.75} />
        </div>
        <div className="grid gap-10">
          <div ref={aRef} className={node}>
            <MindBadge side="a" />
          </div>
          <div ref={bRef} className={node}>
            <MindBadge side="b" />
          </div>
        </div>
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={promptRef}
          toRef={aRef}
          curvature={40}
          gradientStartColor="--human"
          gradientStopColor="--mind-a"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={promptRef}
          toRef={bRef}
          curvature={-40}
          delay={0.4}
          gradientStartColor="--human"
          gradientStopColor="--mind-b"
        />
        <p className="sr-only">Your prompt goes to Mind A and Mind B at the same time.</p>
      </div>
    </EffectFrame>
  );
}
