import type { ReactNode } from 'react';

/**
 * A table in a focusable, named scroll region, so it never forces the page to scroll sideways.
 * Lit header row in the label voice, hairline rows, a quiet hover on pointer devices.
 */
export function ScrollTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard
      tabIndex={0}
      className="not-prose overflow-x-auto rounded-lg border border-line bg-surface shadow-raise focus-ring-inset"
    >
      <table
        className={[
          'w-full border-collapse text-left text-ui-sm',
          '[&_th]:border-b [&_th]:border-line [&_th]:bg-surface-2 [&_th]:px-4 [&_th]:py-3 [&_th]:font-mono [&_th]:text-label [&_th]:font-medium [&_th]:tracking-[0.1em] [&_th]:whitespace-nowrap [&_th]:text-muted [&_th]:uppercase',
          '[&_td]:px-4 [&_td]:py-3 [&_td]:align-top [&_td]:text-fg-soft',
          '[&_tbody_tr+tr_td]:border-t [&_tbody_tr+tr_td]:border-line',
          '[&_td_code]:rounded-sm [&_td_code]:bg-surface-2 [&_td_code]:px-1.5 [&_td_code]:py-0.5 [&_td_code]:font-mono [&_td_code]:text-[0.92em] [&_td_code]:text-fg',
          '[&_td:first-child_code]:whitespace-nowrap',
          '[&_td_a]:text-mind-a [&_td_a]:underline [&_td_a]:decoration-mind-a/45 [&_td_a]:underline-offset-4',
        ].join(' ')}
      >
        {children}
      </table>
    </div>
  );
}
