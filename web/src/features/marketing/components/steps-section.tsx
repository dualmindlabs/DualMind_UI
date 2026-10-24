import { SectionTitle } from '@/components/ui/section-title';
import { cn } from '@/lib/utils/cn';

import { STEPS } from '../content/landing';
import type { LiveStatsState } from '../hooks/use-live-stats';
import { exampleModels } from '../lib/example-models';
import { StepStage } from './step-visual';

/** The window that frames one stage: the arena's chrome, with a progress rail underneath. */
function StepWindow({
  step,
  stats,
  className,
}: {
  step: number;
  stats: LiveStatsState;
  className?: string;
}) {
  const models = exampleModels(stats);
  return (
    <div aria-hidden="true" className={cn('min-w-0 overflow-hidden surface-float', className)}>
      <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
        <span className="flex gap-1.5">
          <span className="size-2.5 rounded-full bg-mind-a" />
          <span className="size-2.5 rounded-full bg-mind-b" />
          <span className="size-2.5 rounded-full bg-line-strong" />
        </span>
        <span className="eyebrow text-muted">
          Step {step + 1} of {STEPS.length} · {STEPS[step]?.title}
        </span>
      </div>
      <div className="min-h-[24rem] min-w-0 p-4 sm:p-5">
        <StepStage step={step} models={models} />
      </div>
      <div className="grid grid-cols-4 gap-1 px-4 pb-4 sm:px-5 sm:pb-5">
        {STEPS.map((item, index) => (
          <span key={item.title} className="h-0.5 overflow-hidden rounded-full bg-line">
            <span
              className={cn('block h-full bg-mind-a', index <= step ? 'opacity-100' : 'opacity-0')}
            />
          </span>
        ))}
      </div>
    </div>
  );
}

/**
 * The four steps (Ask, Compare, Vote, Reveal), one row each: the step on one side and, on the
 * other, a window that shows it with the real arena pieces. Rows alternate sides on a wide screen
 * and stack on a phone. The step text is the content; the window is decorative.
 */
export function StepsSection({ stats }: { stats: LiveStatsState }) {
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
        <ol className="mt-14 grid grid-cols-1 gap-16 lg:mt-20 lg:gap-24">
          {STEPS.map((step, index) => (
            <li
              key={step.title}
              className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-16"
            >
              <div className={cn('min-w-0', index % 2 === 1 && 'lg:order-2')}>
                <p
                  aria-hidden="true"
                  className="font-display text-[length:clamp(3.5rem,2.5rem+4vw,6rem)] leading-none font-semibold tracking-[-0.05em] text-muted"
                >
                  {String(index + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-4 text-h2 text-fg">{step.title}</h3>
                <p className="mt-4 max-w-reading text-lead text-fg-soft">{step.body}</p>
              </div>
              <StepWindow
                step={index}
                stats={stats}
                className={cn(index % 2 === 1 && 'lg:order-1')}
              />
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
