import { cn } from '@/lib/utils/cn';
import { depths } from '@/styles/tokens';

import { surfaceLevels } from '../lib/space';
import { Section } from './section';

/** Depth in the Instrument direction: layered surfaces, real shadows, glows, mesh and grain. */
export function DepthSection() {
  return (
    <Section
      id="depth"
      title={
        <>
          Layers, light and <span className="human-voice text-human">a little grain.</span>
        </>
      }
      lead={
        <p>
          Surfaces are lit from the top and stacked: inset, raise, lift, float. Shadows are real and
          layered, never a blur filter; the two corner colours glow only for a winner or a
          selection. The page carries a faint mesh and paper grain, painted once and never animated.
        </p>
      }
    >
      <h3 className="text-h3 font-semibold">Surfaces</h3>
      <ol className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {surfaceLevels.map((level, index) => (
          <li
            key={level.utility}
            className={cn('flex min-h-40 flex-col justify-between p-5', level.className)}
          >
            <span className="eyebrow text-muted">Level {index}</span>
            <span>
              <code className="block text-ui-sm text-fg">{level.utility}</code>
              <span className="mt-1 block text-caption text-muted">{level.use}</span>
              <span className="mt-1 block text-caption text-muted">{level.note}</span>
            </span>
          </li>
        ))}
      </ol>

      <h3 className="mt-14 text-h3 font-semibold">The two corners</h3>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="surface-a flex min-h-48 flex-col justify-between p-6">
          <span className="eyebrow text-mind-a">Model A</span>
          <p className="max-w-[28ch] text-lead text-fg">
            A cyan rule, a cool wash, and a lit top edge.{' '}
            <code className="text-ui-sm">surface-a</code>
          </p>
        </div>
        <div className="surface-b flex min-h-48 flex-col justify-between p-6">
          <span className="eyebrow text-mind-b-text">Model B</span>
          <p className="max-w-[28ch] text-lead text-fg">
            A terracotta rule, a warm wash, the same lift.{' '}
            <code className="text-ui-sm">surface-b</code>
          </p>
        </div>
      </div>

      <h3 className="mt-14 text-h3 font-semibold">Shadows and glows</h3>
      <ul className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-5">
        {depths.map(depth => (
          <li key={depth.name} className="flex flex-col gap-4">
            <span
              aria-hidden="true"
              className={cn(
                'grid h-24 place-items-center rounded-lg border border-line bg-surface-2',
                depth.utility,
              )}
            />
            <span>
              <code className="block text-ui-sm text-fg">{depth.utility}</code>
              <span className="block text-caption text-muted">{depth.use}</span>
            </span>
          </li>
        ))}
      </ul>

      <h3 className="mt-14 text-h3 font-semibold">Mesh and grain</h3>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        <div className="grain flex min-h-48 flex-col justify-end rounded-lg border border-line mesh-duel p-6">
          <code className="text-ui-sm text-fg">mesh-duel grain</code>
          <p className="mt-1 text-caption text-fg-soft">
            For a hero or a closing call to action: both corner colours as pools of light.
          </p>
        </div>
        <div className="flex min-h-48 flex-col justify-end surface-inset p-6">
          <code className="text-ui-sm text-fg">surface-inset</code>
          <p className="mt-1 text-caption text-fg-soft">
            Recessed, for code and wells. The page itself already carries the grain; add{' '}
            <code>grain</code> only to a section with its own background.
          </p>
        </div>
      </div>
    </Section>
  );
}
