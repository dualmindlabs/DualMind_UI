import { cn } from '@/lib/utils/cn';

import { designSections } from '../lib/sections';

export function SectionNav({ className }: { className?: string }) {
  return (
    <nav aria-label="On this page" className={className}>
      <ol className="flex flex-wrap gap-2">
        {designSections.map(section => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              className={cn(
                'inline-flex h-9 items-center gap-2 rounded-full border border-line bg-surface px-3.5 text-ui-sm text-fg-soft',
                'transition-colors duration-(--dur-fast) ease-out-expo hover:border-line-strong hover:text-fg',
              )}
            >
              <span className="font-mono text-caption text-mind-a tabular-nums">{section.index}</span>
              {section.title}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
