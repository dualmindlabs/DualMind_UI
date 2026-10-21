import { Gavel, MessageSquareText } from 'lucide-react';
import { useRef } from 'react';

import { RoleBadge } from '@/components/ui/role-badge';
import { AnimatedBeam } from '@/components/vendor/magicui/animated-beam';
import { cn } from '@/lib/utils/cn';

import type { DemoPhase } from '../lib/demo-machine';
import { BeamNode } from './beam-node';

interface BattleBeamsProps {
  /** Bumped by every demo play: the prompt beams run once per battle. */
  run: number;
  phase: DemoPhase;
  className?: string;
}

/**
 * "How a battle works" in one picture: the prompt travels to Mind A and Mind B at the same time,
 * and both answers meet in your verdict. The beams are tied to the demo below: the first pair runs
 * when a battle starts, the second when you vote. At rest only the paths show. Decorative: the
 * section's text says the same thing.
 */
export function BattleBeams({ run, phase, className }: BattleBeamsProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const promptRef = useRef<HTMLDivElement>(null);
  const aRef = useRef<HTMLDivElement>(null);
  const bRef = useRef<HTMLDivElement>(null);
  const verdictRef = useRef<HTMLDivElement>(null);
  const asking = run > 0;
  const judged = phase === 'revealed';

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className={cn('relative flex w-full items-center justify-between', className)}
    >
      <BeamNode nodeRef={promptRef} label="Prompt" tone="human">
        <MessageSquareText className="size-5 text-human" strokeWidth={1.75} />
      </BeamNode>
      <div className="grid gap-8 sm:gap-10">
        <BeamNode nodeRef={aRef} label="Mind A" tone="a">
          <RoleBadge who="a" letterOnly />
        </BeamNode>
        <BeamNode nodeRef={bRef} label="Mind B" tone="b">
          <RoleBadge who="b" letterOnly />
        </BeamNode>
      </div>
      <BeamNode nodeRef={verdictRef} label="Verdict" tone="human">
        <Gavel className="size-5 text-human" strokeWidth={1.75} />
      </BeamNode>

      <AnimatedBeam
        key={`prompt-a-${run}`}
        containerRef={containerRef}
        fromRef={promptRef}
        toRef={aRef}
        curvature={56}
        gradientStartColor="--human"
        gradientStopColor="--mind-a"
        duration={1.6}
        repeat={1}
        repeatDelay={0.2}
        play={asking}
      />
      <AnimatedBeam
        key={`prompt-b-${run}`}
        containerRef={containerRef}
        fromRef={promptRef}
        toRef={bRef}
        curvature={-56}
        gradientStartColor="--human"
        gradientStopColor="--mind-b"
        duration={1.6}
        repeat={1}
        repeatDelay={0.2}
        play={asking}
      />
      <AnimatedBeam
        key={`a-verdict-${run}`}
        containerRef={containerRef}
        fromRef={aRef}
        toRef={verdictRef}
        curvature={0}
        gradientStartColor="--mind-a"
        gradientStopColor="--human"
        duration={1.4}
        repeat={0}
        play={judged}
      />
      <AnimatedBeam
        key={`b-verdict-${run}`}
        containerRef={containerRef}
        fromRef={bRef}
        toRef={verdictRef}
        curvature={0}
        gradientStartColor="--mind-b"
        gradientStopColor="--human"
        duration={1.4}
        repeat={0}
        play={judged}
      />
    </div>
  );
}
