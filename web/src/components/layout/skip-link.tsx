/**
 * The first focusable element on every page: jumps past the header to <main id="main">. Hidden
 * until it takes focus, then a floating pill with a 44px target and the shared focus ring.
 */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only items-center gap-2 rounded-full border border-line-strong bg-surface-2 px-5 text-ui font-medium text-fg shadow-float focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:inline-flex focus:min-h-11"
    >
      <span aria-hidden="true" className="size-1.5 rounded-full bg-mind-a" />
      Skip to content
    </a>
  );
}
