import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { credits } from '@/content/credits';

/**
 * "Built with": every third-party source with what we use from it and its licence. Kept next to
 * the licence inventory in docs/redesign/licences.md, which the licence policy requires.
 */
export function CreditsGrid() {
  return (
    <section
      id="credits"
      aria-labelledby="credits-title"
      className="scroll-mt-24 border-t border-line bg-bg-deep py-16 md:py-24 print:break-before-page"
    >
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <p className="eyebrow text-muted">Credits</p>
        <h2 id="credits-title" className="mt-3 text-h2 font-medium text-fg">
          Credits and <span className="human-voice text-human">licences</span>
        </h2>
        <p className="mt-5 max-w-reading text-body [text-wrap:pretty] text-fg-soft">
          DualMind Arena stands on open-source and free-to-use work. Each source below keeps its own
          licence, and its licence file ships next to the code we copied in.
        </p>
        <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credits.map(credit => (
            <li
              key={credit.id}
              className="flex flex-col gap-4 rounded-lg border border-line bg-surface p-5 shadow-raise"
            >
              <div className="flex items-start justify-between gap-3">
                <h3 className="text-ui font-semibold text-fg">
                  <a
                    href={credit.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-sm underline decoration-line-strong underline-offset-4 hover:decoration-current"
                  >
                    {credit.name}
                    <ExternalLink
                      aria-hidden="true"
                      strokeWidth={1.75}
                      className="size-3.5 shrink-0 text-muted"
                    />
                    <span className="sr-only">(opens in a new tab)</span>
                  </a>
                </h3>
                <Badge variant="outline" className="shrink-0">
                  {credit.kind === 'vendored' ? 'Copied in' : 'Package'}
                </Badge>
              </div>
              <p className="text-ui-sm text-fg-soft">{credit.uses.join(', ')}</p>
              <p className="mt-auto text-caption text-muted">
                Licence:{' '}
                <a
                  href={credit.licenceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-sm text-fg-soft underline decoration-line-strong underline-offset-4 hover:decoration-current"
                >
                  {credit.licence}
                  <span className="sr-only"> (opens in a new tab)</span>
                </a>
                {credit.restricted ? '. Used within this website only, not redistributed.' : ''}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
