import { cn } from '@/lib/utils/cn';

import { containers, radii, spacing, surfaces } from '../lib/space';
import { Section } from './section';

export function SpaceSection() {
  return (
    <Section
      id="space"
      title={
        <>
          Exact spacing, <span className="human-voice text-human">quiet depth.</span>
        </>
      }
      lead={
        <p>
          A 4px grid, five radii and depth from luminance steps plus 1px hairlines, not blur. Dark
          mode lifts surfaces with an inner highlight; light mode uses soft shadows.
        </p>
      }
    >
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6">
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

        <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6">
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

        <div className="rounded-lg border border-line bg-surface p-5 shadow-raise sm:p-6 lg:col-span-2">
          <h3 className="text-h3 font-semibold">Surfaces and depth</h3>
          <ol className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {surfaces.map((surface, index) => (
              <li
                key={surface.token}
                className={cn(
                  'flex min-h-28 flex-col justify-between rounded-lg border border-line p-4',
                  surface.className,
                )}
              >
                <span className="eyebrow text-muted">Level {index}</span>
                <span>
                  <code className="block text-ui-sm text-fg">{surface.token}</code>
                  <span className="block text-caption text-muted">{surface.use}</span>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </Section>
  );
}
