import { MessageSquareText, TrendingUp, Vote } from 'lucide-react';
import { type ReactNode, type RefObject, useRef } from 'react';

import { AnimatedBeam } from '@/components/vendor/magicui/animated-beam';

const circle =
  'relative z-10 grid size-12 place-items-center rounded-full border bg-surface-2 shadow-raise sm:size-14';

function Node({
  nodeRef,
  label,
  className,
  children,
}: {
  nodeRef: RefObject<HTMLDivElement | null>;
  label: string;
  className: string;
  children: ReactNode;
}) {
  return (
    <div className="grid justify-items-center gap-2.5">
      <div ref={nodeRef} className={`${circle} ${className}`}>
        {children}
      </div>
      <p className="text-caption font-medium text-fg-soft">{label}</p>
    </div>
  );
}

/**
 * The whole battle in one picture: your prompt goes to Answer A and Answer B, you vote, and the
 * vote moves both ratings. Magic UI's Animated Beam draws the flow (a still line under reduced
 * motion). The labels are real text; the beams are decoration.
 */
export function BattleDiagram() {
  const containerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const voteRef = useRef<HTMLDivElement>(null);
  const ratingRef = useRef<HTMLDivElement>(null);
  const icon = 'size-5 sm:size-6';

  return (
    <figure className="mx-auto max-w-page px-4 pb-4 sm:px-6">
      <div
        ref={containerRef}
        className="relative mx-auto flex w-full max-w-3xl items-center justify-between rounded-xl border border-line bg-surface px-4 py-10 sm:px-10"
      >
        <Node nodeRef={promptRef} label="Your prompt" className="border-human/60">
          <MessageSquareText
            aria-hidden="true"
            strokeWidth={1.75}
            className={`${icon} text-human`}
          />
        </Node>
        <div className="grid gap-8">
          <Node nodeRef={aRef} label="Answer A" className="border-mind-a/60">
            <span aria-hidden="true" className="font-mono text-ui font-medium text-mind-a">
              A
            </span>
          </Node>
          <Node nodeRef={bRef} label="Answer B" className="border-mind-b/70">
            <span aria-hidden="true" className="font-mono text-ui font-medium text-mind-b-text">
              B
            </span>
          </Node>
        </div>
        <Node nodeRef={voteRef} label="Your vote" className="border-human/60">
          <Vote aria-hidden="true" strokeWidth={1.75} className={`${icon} text-human`} />
        </Node>
        <Node nodeRef={ratingRef} label="Rating" className="border-line-strong">
          <TrendingUp aria-hidden="true" strokeWidth={1.75} className={`${icon} text-fg-soft`} />
        </Node>

        <AnimatedBeam
          containerRef={containerRef}
          fromRef={promptRef}
          toRef={aRef}
          curvature={28}
          gradientStartColor="--human"
          gradientStopColor="--mind-a"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={promptRef}
          toRef={bRef}
          curvature={-28}
          delay={0.3}
          gradientStartColor="--human"
          gradientStopColor="--mind-b"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={aRef}
          toRef={voteRef}
          curvature={28}
          delay={1.6}
          gradientStartColor="--mind-a"
          gradientStopColor="--human"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={bRef}
          toRef={voteRef}
          curvature={-28}
          delay={1.9}
          gradientStartColor="--mind-b"
          gradientStopColor="--human"
        />
        <AnimatedBeam
          containerRef={containerRef}
          fromRef={voteRef}
          toRef={ratingRef}
          delay={3.2}
          gradientStartColor="--human"
          gradientStopColor="--mind-a"
        />
      </div>
      <figcaption className="mx-auto mt-4 max-w-3xl text-center text-caption text-muted">
        Your prompt goes to two anonymous models at once. You vote. The vote moves both ratings.
      </figcaption>
    </figure>
  );
}
