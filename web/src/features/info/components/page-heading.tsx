import type { PageContent } from '../content';
import { RichText } from './rich-text';

/**
 * The page opening: eyebrow, the H1 with its one Playfair phrase (the human voice) and the
 * intro. Both the text and the human part read as one heading.
 */
export function PageHeading({ page, id = 'page-title' }: { page: PageContent; id?: string }) {
  return (
    <>
      <p className="eyebrow text-muted">{page.eyebrow}</p>
      <h1
        id={id}
        className="mt-5 max-w-[18ch] text-h1 font-medium text-balance text-fg sm:max-w-[22ch]"
      >
        {page.heading.text}
        {page.heading.human ? (
          <>
            {' '}
            <span className="human-voice text-human">{page.heading.human}</span>
          </>
        ) : null}
      </h1>
      <p className="mt-6 max-w-reading text-h3 font-normal [text-wrap:pretty] text-fg-soft">
        <RichText text={page.intro} />
      </p>
    </>
  );
}
