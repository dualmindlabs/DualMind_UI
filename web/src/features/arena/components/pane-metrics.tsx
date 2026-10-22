import type { PaneMetric } from '../lib/turns';

/**
 * The pane's footer: time, length and tokens as small mono readouts on an inset strip, pinned to
 * the bottom of the pane so the two footers of a pair line up. Only shown when the names may be
 * shown (blind integrity, UI audit P0-2: timing and length hint at the model).
 */
export function PaneMetrics({ items }: { items: readonly PaneMetric[] }) {
  if (items.length === 0) return null;
  return (
    <dl
      data-testid="pane-meta"
      className="relative mt-auto flex flex-wrap gap-x-5 gap-y-1 px-5 pt-1 pb-6 font-mono text-caption sm:px-8"
    >
      {items.map(([term, value]) => (
        <div
          key={term}
          className="flex items-baseline gap-1.5"
        >
          <dt className="text-muted">{term}</dt>
          <dd className="font-medium text-fg tabular-nums">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
