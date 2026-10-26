import { ExternalLink } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { ModelMark } from '@/components/ui/model-mark';
import { credits } from '@/content/credits';

/**
 * "Built with": every third-party source with what we use from it and its license. Kept next to
 * the license inventory in docs/redesign/licences.md, which the license policy requires. Rendered
 * on /credits/.
 */
export function CreditsGrid() {
  return (
    <section
      id="credits"
      aria-labelledby="credits-title"
      className="scroll-mt-24 pt-4 pb-20 md:pb-28"
    >
      <div className="mx-auto max-w-page px-4 sm:px-6">
        <h2 id="credits-title" className="sr-only">
          Sources and licenses
        </h2>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="max-w-reading text-lead [text-wrap:pretty] text-fg-soft">
            Each source keeps its own license, and its license file ships next to the code we copied
            in.
          </p>
          <p className="numeric text-ui-sm text-muted">{credits.length} sources</p>
        </div>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {credits.map(credit => (
            <li
              key={credit.id}
              className="surface-duel flex flex-col gap-4 p-5 transition-transform duration-(--dur-base) ease-out-expo hover:-translate-y-0.5 motion-reduce:transition-none motion-reduce:hover:translate-y-0"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <ModelMark name={credit.name} />
                  <h3 className="min-w-0 text-ui font-semibold text-fg">
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
                </div>
                <Badge
                  variant={credit.kind === 'vendored' ? 'mind-a' : 'outline'}
                  className="shrink-0"
                >
                  {credit.kind === 'vendored' ? 'Copied in' : 'Package'}
                </Badge>
              </div>
              <p className="text-ui-sm text-fg-soft">{credit.uses.join(', ')}</p>
              <p className="mt-auto border-t border-line pt-4 text-caption text-muted">
                License:{' '}
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
