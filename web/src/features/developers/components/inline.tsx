import { Fragment } from 'react';

/** Text with `code` spans: the backtick-marked parts become <code>. No other markup. */
export function Inline({ text }: { text: string }) {
  const parts = text.split('`');
  return (
    <>
      {parts.map((part, index) =>
        index % 2 === 1 ? (
          <code key={index}>{part}</code>
        ) : (
          <Fragment key={index}>{part}</Fragment>
        ),
      )}
    </>
  );
}
