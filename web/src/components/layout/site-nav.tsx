import { LazyMotion, m, MotionConfig } from 'motion/react';
import { type FocusEvent, useId, useState } from 'react';

import { isActivePath, primaryNav } from '@/lib/site/links';
import { cn } from '@/lib/utils/cn';
import { spring } from '@/styles/tokens';

/** Shared layout animations need Motion's domMax features, loaded as their own chunk. */
const loadLayoutFeatures = () =>
  import('@/components/motion/features-dom-max').then(module => module.features);

export interface SiteNavProps {
  /** The current path; the matching link gets aria-current="page" and the underline. */
  activePath: string;
  /** The landmark's name. Give extra copies (style guide previews) their own name. */
  label?: string;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * The header navigation. A soft highlight follows the pointer and keyboard focus from link to
 * link, and the current page carries a Mind A underline; both move with a Motion layoutId spring
 * (design-direction.md section 6) and simply appear under reduced motion.
 */
export function SiteNav({ activePath, label = 'Main', size = 'md', className }: SiteNavProps) {
  const [highlighted, setHighlighted] = useState<string | null>(null);
  // layoutIds are global to the page; scope them so several navs (previews) never share one.
  const scope = useId();

  const clearOnLeave = (event: FocusEvent<HTMLUListElement>) => {
    if (!event.currentTarget.contains(event.relatedTarget)) setHighlighted(null);
  };

  return (
    <LazyMotion features={loadLayoutFeatures} strict>
      <MotionConfig reducedMotion="user" transition={spring}>
        <nav aria-label={label} className={className}>
          <ul
            className="flex items-center gap-0.5"
            onMouseLeave={() => setHighlighted(null)}
            onBlur={clearOnLeave}
          >
            {primaryNav.map(link => {
              const active = isActivePath(link.href, activePath);
              return (
                <li key={link.href}>
                  <a
                    href={link.href}
                    aria-current={active ? 'page' : undefined}
                    onMouseEnter={() => setHighlighted(link.href)}
                    onFocus={() => setHighlighted(link.href)}
                    className={cn(
                      'hit-area relative isolate inline-flex items-center rounded-full font-medium whitespace-nowrap text-fg-soft transition-colors duration-(--dur-fast) ease-out-expo hover:text-fg aria-[current=page]:text-fg',
                      size === 'md' ? 'h-9 px-3.5 text-ui-sm' : 'h-8 px-3 text-ui-sm',
                    )}
                  >
                    {highlighted === link.href ? (
                      <m.span
                        layoutId={`${scope}-highlight`}
                        aria-hidden="true"
                        className="absolute inset-0 -z-10 rounded-full bg-hover"
                      />
                    ) : null}
                    {link.label}
                    {active ? (
                      <m.span
                        layoutId={`${scope}-current`}
                        aria-hidden="true"
                        className="absolute inset-x-3 bottom-1 h-0.5 rounded-full bg-mind-a"
                      />
                    ) : null}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </MotionConfig>
    </LazyMotion>
  );
}
