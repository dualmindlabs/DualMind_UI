import { Fragment } from 'react';

const EMAIL = /([A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+)/g;

/** Plain text from the content files, with email addresses turned into mailto links. */
export function RichText({ text }: { text: string }) {
  const parts = text.split(EMAIL);
  return (
    <>
      {parts.map((part, index) =>
        // split() with one capture group puts the matches at the odd indexes.
        index % 2 === 1 ? (
          <a key={`${part}-${index}`} href={`mailto:${part}`}>
            {part}
          </a>
        ) : (
          <Fragment key={`${index}-${part.length}`}>{part}</Fragment>
        ),
      )}
    </>
  );
}
