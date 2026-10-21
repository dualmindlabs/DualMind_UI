import type { Section } from '../content';

/** A section's h2: the heading, then its Playfair phrase if it has one. */
export function SectionHeading({
  section,
  id,
  className,
}: {
  section: Section;
  id: string;
  className?: string;
}) {
  return (
    <h2 id={id} className={className}>
      {section.heading}
      {section.human ? (
        <>
          {' '}
          <span className="human-voice text-human">{section.human}</span>
        </>
      ) : null}
    </h2>
  );
}
