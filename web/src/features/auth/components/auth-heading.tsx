import type { ReactNode } from 'react';

/**
 * Kicker, page heading (one phrase in the human voice, underlined) and a lead line. The kicker is
 * the quiet Geist lead-in with its short rule; the heading is the tight Geist 600 `text-h1`.
 */
export function AuthHeading({
  eyebrow,
  title,
  voice,
  lead,
}: {
  eyebrow: string;
  title: string;
  /** The phrase after the title, underlined in the human colour. */
  voice?: string;
  lead?: ReactNode;
}) {
  return (
    <div className="grid gap-4">
      <p className="kicker text-mind-a">{eyebrow}</p>
      <h1 className="text-h1 text-balance text-fg">
        {title}
        {voice ? (
          <>
            {' '}
            <span className="human-voice text-human">{voice}</span>
          </>
        ) : null}
      </h1>
      {lead ? <p className="text-lead text-fg-soft">{lead}</p> : null}
    </div>
  );
}
