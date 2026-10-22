import { cn } from '@/lib/utils/cn';

import { containers, radii, spacing } from '../lib/space';
import { Section } from './section';

export function SpaceSection() {
  return (
    <Section
      id="space"
      title={
        <>
          Exact spacing, <span className="human-voice text-human">calm radii.</span>
        </>
      }
      lead={
        <p>
          A 4px grid, five radii and generous gutters: 24 to 32px around the duel, a 72ch measure
          for answers. Depth has its own section below.
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="surface-duel p-5 sm:p-6">
          <h3 className="text-h3 font-semibold">Radius</h3>
          <ul className="mt-6 grid grid-cols-3 gap-x-4 gap-y-6 sm:grid-cols-5">
            {radii.map(radius => (
              <li key={radius.name} className="flex flex-col items-start gap-3">
                <span
                  aria-hidden="true"
                  className={cn(
                    'size-16 border border-line-strong bg-surface-2 shadow-raise',
                    radius.className,
                  )}
                />
                <span>
                  <span className="block font-mono text-ui-sm text-fg">
                    {radius.name} <span className="text-muted">{radius.value}</span>
                  </span>
                  <span className="block text-caption text-muted">{radius.use}</span>
                </span>
              </li>
            ))}
          </ul>
          <h4 className="mt-10 border-t border-line pt-6 text-ui font-semibold text-fg">
            Containers
          </h4>
          <dl className="mt-4 grid gap-x-6 gap-y-4 sm:grid-cols-2">
            {containers.map(container => (
              <div key={container.name}>
                <dt className="font-mono text-ui-sm text-fg">
                  {container.name} <span className="text-muted">{container.value}</span>
                </dt>
                <dd className="text-caption text-muted">{container.use}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="surface-duel p-5 sm:p-6">
          <h3 className="text-h3 font-semibold">Spacing</h3>
          <ul className="mt-6 space-y-2.5">
            {spacing.map(px => (
              <li key={px} className="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-3">
                <span className="text-right font-mono text-caption text-muted tabular-nums">
                  {px}
                </span>
                <span
                  aria-hidden="true"
                  className="h-2 rounded-full bg-mind-a/70"
                  style={{ width: `${px}px` }}
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
