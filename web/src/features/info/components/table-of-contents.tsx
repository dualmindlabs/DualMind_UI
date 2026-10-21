import { ChevronDown } from 'lucide-react';

import { cn } from '@/lib/utils/cn';

import { useActiveSection } from '../hooks/use-active-section';

export interface TocItem {
  id: string;
  label: string;
}

function TocLinks({ items, active }: { items: readonly TocItem[]; active: string | null }) {
  return (
    <ol className="grid gap-0.5 text-ui-sm">
      {items.map((item, index) => {
        const current = item.id === active;
        return (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              aria-current={current ? 'location' : undefined}
              className={cn(
                'flex min-h-8 items-baseline gap-3 rounded-sm border-l-2 py-1.5 pr-2 pl-3 transition-colors duration-(--dur-fast) ease-out-expo',
                current
                  ? 'border-human bg-human-tint font-medium text-fg'
                  : 'border-line text-fg-soft hover:border-line-strong hover:text-fg',
              )}
            >
              <span aria-hidden="true" className="w-5 shrink-0 eyebrow text-muted tabular-nums">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span>{item.label}</span>
            </a>
          </li>
        );
      })}
    </ol>
  );
}

/**
 * Table of contents for a long page. Desktop: a sticky list that marks the section being read
 * (`aria-current="location"`). Phones: a native collapsible block, closed by default. Both are
 * plain links to the section ids, so it works without JavaScript. Hidden when printing.
 */
export function TableOfContents({ items }: { items: readonly TocItem[] }) {
  const active = useActiveSection(items.map(item => item.id));
  return (
    <>
      <nav
        aria-label="On this page"
        className="hidden lg:sticky lg:top-28 lg:block lg:self-start print:hidden"
      >
        <p className="mb-4 eyebrow text-muted">On this page</p>
        <TocLinks items={items} active={active} />
      </nav>
      <nav aria-label="On this page" className="lg:hidden print:hidden">
        <details className="group rounded-lg border border-line bg-surface">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 rounded-lg px-4 text-ui font-medium text-fg [&::-webkit-details-marker]:hidden">
            On this page
            <ChevronDown
              aria-hidden="true"
              strokeWidth={1.75}
              className="size-4 text-muted transition-transform duration-(--dur-base) ease-out-expo group-open:rotate-180"
            />
          </summary>
          <div className="border-t border-line p-2">
            <TocLinks items={items} active={active} />
          </div>
        </details>
      </nav>
    </>
  );
}
