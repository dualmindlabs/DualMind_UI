/**
 * A code sample. The scroll container is focusable and named, so keyboard users can scroll a long
 * line (axe: scrollable-region-focusable); the text is plain, with no script and no highlighter.
 */
export function CodeBlock({ code, label }: { code: string; label: string }) {
  return (
    <div
      role="region"
      aria-label={label}
      // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex -- a scrollable region must be reachable by keyboard
      tabIndex={0}
      className="not-prose overflow-x-auto rounded-lg border border-line bg-surface"
    >
      <pre className="m-0 w-max min-w-full p-4 font-mono text-ui-sm leading-relaxed text-fg">
        <code>{code}</code>
      </pre>
    </div>
  );
}
