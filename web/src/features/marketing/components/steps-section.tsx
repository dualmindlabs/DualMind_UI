import { useEffect, useRef, useState } from 'react';

import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils/cn';

import { STEPS } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { exampleModels } from '../lib/example-models';
import { StepStage } from './step-visual';

/** The window that frames a stage: the arena's chrome, with a progress rail underneath. */
function StepWindow({
  active,
  stats,
  solo = false,
  className,
}: {
  active: number;
  stats: LiveStatsState;
  /** Render only the active stage (a phone shows one picture per step). */
  solo?: boolean;
  className?: string;
}) {
  const models = exampleModels(stats);
  return (
    <div aria-hidden="true" className={cn('overflow-hidden surface-float', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-mind-a" />
          <span className="size-2.5 rounded-full bg-mind-b" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="eyebrow text-muted">
          Step {active + 1} of {STEPS.length} · {STEPS[active]?.title}
        </span>
      </div>
      <div className="grid min-h-[25rem] p-4 sm:p-5 [&>*]:col-start-1 [&>*]:row-start-1">
        {STEPS.map((step, index) =>
          solo && index !== active ? null : (
            <div
              key={step.title}
              className={cn(
                'transition-[opacity,transform] duration-(--dur-slow) ease-out-expo',
                index === active
                  ? 'translate-y-0 opacity-100'
                  : 'pointer-events-none translate-y-3 opacity-0',
              )}
            >
              <StepStage step={index} models={models} />
            </div>
          ),
        )}
      </div>
      <div className="grid grid-cols-4 gap-1 px-4 pb-4 sm:px-5 sm:pb-5">
        {STEPS.map((step, index) => (
          <span key={step.title} className="h-0.5 overflow-hidden rounded-full bg-line">
            <span
              className={cn(
                'block h-full origin-left bg-mind-a transition-transform duration-(--dur-slow) ease-out-expo',
                index <= active ? 'scale-x-100' : 'scale-x-0',
              )}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The four steps (Ask, Compare, Vote, Reveal) beside a window that shows each one with the real
 * arena pieces. On a wide screen the window is sticky and follows the step in view; on a phone each
 * step carries its own picture under the text. The step text is the content: the window is
 * decorative.
 */
export function StepsSection({ stats }: { stats: LiveStatsState }) {
  const [active, setActive] = useState(0);
  const items = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(
      entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const index = items.current.indexOf(entry.target as HTMLLIElement);
          if (index >= 0) setActive(index);
        }
      },
      { rootMargin: '-42% 0px -42% 0px' },
    );
    for (const item of items.current) if (item) observer.observe(item);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      id="steps"
      aria-labelledby="steps-title"
      className="relative overflow-x-clip border-t border-line bg-bg-deep py-20 md:py-28"
    >
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <SectionTitle
          id="steps-title"
          kicker="How it works"
          title="Ask. Compare. Vote."
          accent="Reveal."
          lead="A battle takes four steps, and the order matters: the names stay hidden until your vote is in."
        />
        <div className="mt-12 grid gap-10 lg:mt-16 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-16">
          <ol className="grid gap-12 lg:gap-0">
            {STEPS.map((step, index) => (
              <li
                key={step.title}
                ref={element => {
                  items.current[index] = element;
                }}
                className="grid gap-6 lg:min-h-[26rem] lg:content-center lg:border-l lg:border-line lg:pl-10"
              >
                <div className="relative">
                  <span
                    aria-hidden="true"
                    className={cn(
                      'absolute top-1 -left-[2.65rem] hidden h-9 w-0.5 rounded-full transition-colors duration-(--dur-slow) lg:block',
                      index === active ? 'bg-mind-a' : 'bg-transparent',
                    )}
                  />
                  <p
                    aria-hidden="true"
                    className={cn(
                      'numeric text-ui transition-colors duration-(--dur-slow)',
                      index === active ? 'text-mind-a' : 'text-muted',
                    )}
                  >
                    {String(index + 1).padStart(2, '0')}
                  </p>
                  <h3 className="mt-2 text-h2 text-fg">{step.title}</h3>
                  <p className="mt-4 max-w-reading text-lead text-fg-soft">{step.body}</p>
                </div>
                <StepWindow active={index} stats={stats} solo className="lg:hidden" />
              </li>
            ))}
          </ol>
          <div className="hidden lg:block">
            <div className="sticky top-28">
              <StepWindow active={active} stats={stats} />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
