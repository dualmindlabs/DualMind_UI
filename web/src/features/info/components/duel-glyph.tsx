/**
 * The duel glyph: Mind A and Mind B as two tiles joined by a link, drawn in four states for the
 * screens where something did not arrive. Decorative (aria-hidden); the words next to it carry the
 * meaning. Only transform and opacity move. Our own component.
 */
import { ModelMark } from '@/components/ui/model-mark';
import { cn } from '@/lib/utils/cn';

import './error-stage.css';

export type DuelGlyphState = 'miss' | 'offline' | 'crash' | 'update';

const link = 'h-px flex-1 min-w-10 sm:min-w-16';

export function DuelGlyph({ state, className }: { state: DuelGlyphState; className?: string }) {
  return (
    <div
      aria-hidden="true"
      data-slot="duel-glyph"
      data-state={state}
      className={cn('flex items-center gap-3', className)}
    >
      <ModelMark name="A" who="a" size="lg" className="shadow-lift" />

      {state === 'offline' ? (
        <div className="relative flex flex-1 items-center gap-2">
          <span className={cn(link, 'bg-mind-a/70')} />
          <span className="size-1.5 rotate-45 bg-bad" />
          <span className={cn(link, 'border-t border-dashed border-line-strong bg-transparent')} />
          <span
            className="glyph-dot absolute left-0 size-2 rounded-full bg-mind-a"
            style={{ ['--glyph-reach' as string]: '3.5rem' }}
          />
        </div>
      ) : state === 'crash' ? (
        <div className="flex flex-1 items-center gap-2">
          <span className={cn(link, 'bg-mind-a/70')} />
          <span className="size-1.5 rounded-full bg-bad" />
          <span className={cn(link, 'border-t border-dashed border-bad/60 bg-transparent')} />
        </div>
      ) : state === 'update' ? (
        <div className="flex flex-1 items-center gap-2">
          <span className={cn(link, 'bg-linear-to-r from-mind-a to-mind-b')} />
          <span className="size-1.5 rounded-full bg-human" />
          <span className={cn(link, 'bg-linear-to-r from-mind-a to-mind-b')} />
        </div>
      ) : (
        <div className="flex flex-1 items-center gap-2">
          <span className={cn(link, 'border-t border-dashed border-line-strong bg-transparent')} />
          <span className="font-mono text-caption text-muted">?</span>
          <span className={cn(link, 'border-t border-dashed border-line-strong bg-transparent')} />
        </div>
      )}

      <span className="relative">
        <ModelMark
          name="B"
          who="b"
          size="lg"
          className={cn(
            'shadow-lift',
            state === 'offline' && 'opacity-45',
            state === 'crash' && 'glyph-crash border-bad/70',
          )}
        />
        {state === 'update' ? (
          <span className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-human font-mono text-label font-semibold text-on-accent">
            +
          </span>
        ) : null}
      </span>
    </div>
  );
}
