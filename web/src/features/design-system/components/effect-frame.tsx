import { ArrowUpRight, RotateCcw } from 'lucide-react';
import { Fragment, type ReactNode, useState } from 'react';

import { getCredit } from '@/content/credits';
import { cn } from '@/lib/utils/cn';

import { type EffectId, getEffect } from '../lib/effects';

interface EffectFrameProps {
  effect: EffectId;
  /** The demo; a function gets the replay count (0 on the first run). */
  children: ReactNode | ((run: number) => ReactNode);
  /** Show a Replay button that remounts the demo (one-shot effects). */
  replay?: boolean;
  /** Classes for the stage, the area the demo plays in. */
  stageClassName?: string;
  className?: string;
}

const badge =
  'inline-flex h-6 items-center gap-1 rounded-full border border-line px-2 font-mono text-[0.6875rem] leading-none tracking-wide text-fg-soft';

/**
 * One effect in the gallery: the demo on a stage, then its name, source and licence (linked),
 * whether it is WebGL, what reduced motion shows, and where the redesign uses it.
 */
export function EffectFrame({
  effect: id,
  children,
  replay = false,
  stageClassName,
  className,
}: EffectFrameProps) {
  const effect = getEffect(id);
  const credit = getCredit(effect.source);
  const [run, setRun] = useState(0);
  const titleId = `effect-${id}`;

  return (
    <figure
      aria-labelledby={titleId}
      data-effect={id}
      className={cn(
        'flex min-w-0 flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-raise',
        className,
      )}
    >
      <div
        className={cn(
          'relative isolate flex min-h-52 items-center justify-center overflow-hidden border-b border-line bg-bg-deep p-6',
          stageClassName,
        )}
      >
        <Fragment key={run}>{typeof children === 'function' ? children(run) : children}</Fragment>
        {replay ? (
          <button
            type="button"
            onClick={() => setRun(count => count + 1)}
            aria-label={`Replay ${effect.name}`}
            className="absolute top-2.5 right-2.5 z-20 inline-flex size-8 items-center justify-center rounded-full border border-line bg-surface/80 text-fg-soft backdrop-blur-sm transition-colors duration-(--dur-fast) hover:border-line-strong hover:text-fg"
          >
            <RotateCcw aria-hidden="true" className="size-3.5" strokeWidth={2} />
          </button>
        ) : null}
      </div>
      <figcaption className="grid gap-2.5 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <h4 id={titleId} className="text-ui font-semibold text-fg">
            {effect.name}
          </h4>
          <span className="text-caption text-muted">{effect.use}</span>
        </div>
        <ul aria-label="Source and licence" className="flex flex-wrap gap-1.5">
          <li>
            <a
              href={effect.url}
              className={cn(badge, 'hover:border-line-strong hover:text-fg')}
              target="_blank"
              rel="noreferrer"
            >
              {credit.name}
              <ArrowUpRight aria-hidden="true" className="size-3" strokeWidth={2} />
              <span className="sr-only">(opens in a new tab)</span>
            </a>
          </li>
          <li>
            <a
              href={credit.licenceUrl}
              className={cn(
                badge,
                'hover:border-line-strong hover:text-fg',
                credit.restricted && 'border-human/40 text-human',
              )}
              target="_blank"
              rel="noreferrer"
            >
              {credit.licence}
              <span className="sr-only"> licence (opens in a new tab)</span>
            </a>
          </li>
          {effect.webgl ? <li className={cn(badge, 'border-mind-a/40 text-mind-a')}>WebGL, gated</li> : null}
        </ul>
        <p className="text-caption text-muted">
          <span className="text-fg-soft">Reduced motion:</span> {effect.reduced}
        </p>
      </figcaption>
    </figure>
  );
}
