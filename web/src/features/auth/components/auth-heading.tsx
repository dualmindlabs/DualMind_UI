import type { ReactNode } from 'react';

/** Eyebrow, page heading (one phrase in the human voice) and a lead line. */
export function AuthHeading({
  eyebrow,
  title,
  voice,
  lead,
}: {
  eyebrow: string;
  title: string;
  /** The phrase after the title in Playfair italic, terra. */
  voice?: string;
  lead?: ReactNode;
}) {
  return (
    <div className="grid gap-3">
      <p className="eyebrow text-mind-a">{eyebrow}</p>
      <h1 className="text-h1 font-medium text-balance text-fg">
        {title}
        {voice ? (
          <>
            {' '}
            <span className="human-voice text-human">{voice}</span>
          </>
        ) : null}
      </h1>
      {lead ? <p className="text-body text-fg-soft">{lead}</p> : null}
    </div>
  );
}
