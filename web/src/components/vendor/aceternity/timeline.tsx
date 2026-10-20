/**
 * Timeline, from Aceternity UI (free tier).
 * Source: https://ui.aceternity.com/registry/timeline.json (copied 2026-10-20)
 * Licence: Aceternity UI licence, https://ui.aceternity.com/licence (see ./LICENSE-NOTES.md).
 * Our changes:
 * - The scroll-linked progress line grows with `scaleY` (transform) instead of animating
 *   `height`, so nothing is measured and no layout runs on scroll.
 * - Removed the hard-coded heading and intro copy; the timeline is an ordered list and each
 *   title a heading whose level the caller sets (one copy shows per breakpoint, as before).
 * - Design tokens: a hairline track, Mind A to Mind B progress, terra dots.
 * - Reduced motion shows the full line, without scroll linking.
 */
import { m, useScroll, useTransform } from 'motion/react';
import { type ReactNode, useRef } from 'react';

import { useShouldReduceMotion } from '@/hooks/use-should-reduce-motion';
import { cn } from '@/lib/utils/cn';

export interface TimelineEntry {
  title: string;
  content: ReactNode;
}

export interface TimelineProps {
  data: TimelineEntry[];
  titleAs?: 'h3' | 'h4' | 'h5' | 'p';
  className?: string;
}

/** Steps or milestones along a line that fills as you scroll: about and how it works. */
export function Timeline({ data, titleAs: Title = 'h3', className }: TimelineProps) {
  const containerRef = useRef<HTMLOListElement>(null);
  const reduce = useShouldReduceMotion();
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start 10%', 'end 50%'],
  });
  const scaleY = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const opacity = useTransform(scrollYProgress, [0, 0.1], [0, 1]);

  return (
    <ol ref={containerRef} className={cn('relative mx-auto max-w-page pb-10', className)}>
      {data.map(item => (
        <li key={item.title} className="flex justify-start pt-10 md:gap-10 md:pt-24">
          <div className="sticky top-24 z-10 flex max-w-xs flex-col items-center self-start md:w-full md:flex-row lg:max-w-sm">
            <div
              aria-hidden="true"
              className="absolute left-3 flex size-10 items-center justify-center rounded-full bg-bg"
            >
              <div className="size-3.5 rounded-full border border-human bg-human-tint" />
            </div>
            <Title className="hidden text-h2 font-medium text-muted md:block md:pl-20">
              {item.title}
            </Title>
          </div>
          <div className="relative w-full pr-4 pl-20 md:pl-4">
            <Title className="mb-4 block text-h3 font-medium text-muted md:hidden">
              {item.title}
            </Title>
            {item.content}
          </div>
        </li>
      ))}
      <li
        aria-hidden="true"
        className="pointer-events-none absolute top-0 left-8 h-full w-0.5 overflow-hidden bg-linear-to-b from-transparent via-line-strong to-transparent [mask-image:linear-gradient(to_bottom,transparent_0%,black_10%,black_90%,transparent_100%)]"
      >
        <m.div
          style={reduce ? {} : { scaleY, opacity }}
          className="absolute inset-0 origin-top rounded-full bg-linear-to-t from-mind-b via-mind-a to-transparent"
        />
      </li>
    </ol>
  );
}
