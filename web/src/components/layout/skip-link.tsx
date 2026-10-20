/** The first focusable element on every page: jumps past the header to <main id="main">. */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only rounded-md bg-surface-2 px-4 py-2.5 text-ui font-medium text-fg shadow-raise-strong focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50"
    >
      Skip to content
    </a>
  );
}
