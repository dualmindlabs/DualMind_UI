import type { ReactNode } from 'react';

import { cn } from '@/lib/utils/cn';

import type { PageContent } from '../content';
import { RichText } from './rich-text';

/**
 * The page opening: kicker, the H1 with its one accent phrase (the human voice, underlined in the
 * human colour) and the intro in the lead size. The text and the accent read as one heading.
 * `size="display"` is the marketing size (About, How it works, FAQ, Credits); `h1` is for
 * the document pages (legal, API reference).
 */
export function PageHeading({
  page,
  id = 'page-title',
  size = 'h1',
  children,
  className,
}: {
  page: Pick<PageContent, 'eyebrow' | 'heading' | 'intro'>;
  id?: string;
  size?: 'display' | 'h1';
  children?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col', className)}>
      <p className="kicker">{page.eyebrow}</p>
      <h1
        id={id}
        className={cn(
          'mt-6 text-fg',
          size === 'display'
            ? 'max-w-[15ch] text-display text-balance'
            : 'max-w-[20ch] text-h1 text-balance',
        )}
      >
        {page.heading.text}
        {page.heading.human ? (
          <>
            {' '}
            <span className="human-voice text-human">{page.heading.human}</span>
          </>
        ) : null}
      </h1>
      <p className="mt-7 max-w-[58ch] text-lead [text-wrap:pretty] text-fg-soft">
        <RichText text={page.intro} />
      </p>
      {children}
    </div>
  );
}
