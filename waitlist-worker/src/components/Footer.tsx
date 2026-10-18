import { LINKS } from '@/content/links';
import { ArrowUpRight } from './icons';
import { Wordmark } from './Wordmark';

const COLUMNS = [
  {
    title: 'Product',
    links: [
      { label: 'DualMind Arena', href: LINKS.arena },
      { label: 'Docs', href: LINKS.docs },
      { label: 'Quickstart', href: LINKS.quickstart },
      { label: 'API reference', href: LINKS.apiReference },
    ],
  },
  {
    title: 'Company',
    links: [
      { label: 'dualmindlab.tech', href: LINKS.company },
      { label: 'GitHub', href: LINKS.github },
      { label: 'Contact', href: LINKS.contact },
      { label: 'hello@dualmindlab.tech', href: LINKS.email },
    ],
  },
  {
    title: 'Legal',
    links: [
      { label: 'Privacy', href: LINKS.privacy },
      { label: 'Terms', href: LINKS.terms },
    ],
  },
];

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-line-soft">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-8 gap-y-12 px-4 pt-16 pb-12 sm:px-8 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 lg:col-span-1">
          <span className="text-[19px] text-fg">
            <Wordmark />
          </span>
          <p className="mt-4 max-w-[34ch] text-[14px] leading-relaxed text-fg-soft">
            Blind, side-by-side evaluation of AI models, judged by people. Built by DualMind Labs.
          </p>
        </div>
        {COLUMNS.map(column => (
          <nav key={column.title} aria-label={column.title}>
            <h2 className="eyebrow">{column.title}</h2>
            <ul className="mt-5 space-y-3">
              {column.links.map(link => {
                const external = link.href.startsWith('http');
                return (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="link-sweep inline-flex items-center gap-1 text-[15px] break-all text-fg/90"
                    >
                      {link.label}
                      {external && (
                        <>
                          <ArrowUpRight className="size-3.5 flex-none text-muted" />
                          <span className="sr-only">(opens in a new tab)</span>
                        </>
                      )}
                    </a>
                  </li>
                );
              })}
            </ul>
          </nav>
        ))}
      </div>

      <div className="mx-auto max-w-[1200px] px-4 sm:px-8" aria-hidden="true">
        <p className="footer-wordmark translate-y-[12%] text-center">DUALMIND</p>
      </div>

      <div className="border-t border-line-soft">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-3 px-4 py-6 font-mono text-[11px] uppercase tracking-[0.2em] text-muted sm:px-8">
          <p>© 2026 DualMind Labs</p>
          <p>Human judgment for AI models</p>
        </div>
      </div>
    </footer>
  );
}
