const FOOTER_LINKS = [
  { label: 'Privacy', href: '/privacy/' },
  { label: 'Terms', href: '/terms/' },
  { label: 'Cookies', href: '/cookies/' },
] as const;

/** The legal links at the foot of every sign-in screen, with 44px touch targets. */
export function LegalFooter() {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 text-caption text-muted">
      <p>DualMind Labs</p>
      <nav aria-label="Legal">
        <ul className="flex flex-wrap gap-x-1">
          {FOOTER_LINKS.map(link => (
            <li key={link.href}>
              <a
                href={link.href}
                className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-sm px-2 hover:text-fg"
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>
    </footer>
  );
}
