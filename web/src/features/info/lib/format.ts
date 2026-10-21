const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
] as const;

/**
 * An ISO date (`2026-10-20`) as "20 October 2026". Written out by hand instead of Intl, so the
 * prerendered HTML and the browser always agree, whatever the time zone or locale.
 */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  const month = match ? MONTHS[Number(match[2]) - 1] : undefined;
  if (!match || !month) return iso;
  return `${Number(match[3])} ${month} ${match[1]}`;
}

/** The full heading as one string: "Compare AI models, blind." */
export function headingText(heading: { text: string; human?: string | undefined }): string {
  return heading.human ? `${heading.text} ${heading.human}` : heading.text;
}

/** Lower-case kebab-case id from a question: "Do I need an account?" -> "do-i-need-an-account". */
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/['’]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
