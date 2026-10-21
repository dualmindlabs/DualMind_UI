import type { ReactNode } from 'react';

/** A table in a focusable, named scroll region, so it never forces the page to scroll sideways. */
export function ScrollTable({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard
      tabIndex={0}
      className="overflow-x-auto"
    >
      <table>{children}</table>
    </div>
  );
}
