/**
 * Number and time formatting for the board. One fixed locale (en-US) for numbers, so the
 * prerendered HTML and the browser agree and columns line up; render the results in a
 * `tabular-nums` context. Times use the visitor's locale and clock (they only exist in the
 * browser, after the data loads).
 */

const eloFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0, useGrouping: false });
const countFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 });
const percentFormat = new Intl.NumberFormat('en-US', {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
});
const signedFormat = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 0,
  signDisplay: 'exceptZero',
  useGrouping: false,
});

/** An Elo rating, rounded, without a thousands separator: "1150" (as chess ratings are written). */
export function formatElo(elo: number): string {
  return eloFormat.format(Math.round(elo));
}

/** A rating difference with its sign: "+12", "-3", "0". */
export function formatEloDelta(delta: number): string {
  return signedFormat.format(Math.round(delta));
}

/** A percentage given as 0-100 (the API's win rate), with one decimal: "64.6%". */
export function formatPercent(percent: number): string {
  return percentFormat.format(percent / 100);
}

/** A count with thousands separators: "7,152". */
export function formatCount(count: number): string {
  return countFormat.format(Math.round(count));
}

/** A rank with a leading zero below 10, for the podium: "01". */
export function formatRank(rank: number): string {
  return String(rank).padStart(2, '0');
}

/** "1 battle", "96 battles". */
export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

/** The time of day in the visitor's locale: "12:04" or "12:04 PM". */
export function formatClock(timestamp: number): string {
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(
    new Date(timestamp),
  );
}

const PROVIDER_LABELS: Readonly<Record<string, string>> = {
  cloudflare: 'Cloudflare',
  groq: 'Groq',
  google: 'Google',
  openai: 'OpenAI',
  anthropic: 'Anthropic',
  mistral: 'Mistral',
  openrouter: 'OpenRouter',
};

/** The provider's name for people: "cloudflare" -> "Cloudflare"; unknown keys are capitalised. */
export function providerLabel(provider: string): string {
  const key = provider.trim().toLowerCase();
  const known = PROVIDER_LABELS[key];
  if (known) return known;
  return key === '' ? 'Unknown' : `${key.charAt(0).toUpperCase()}${key.slice(1)}`;
}

const ordinalRules = new Intl.PluralRules('en-US', { type: 'ordinal' });
const ORDINAL_SUFFIXES: Readonly<Record<string, string>> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

/** "1st", "2nd", "3rd", "11th", "22nd". */
export function formatOrdinal(value: number): string {
  return `${formatCount(value)}${ORDINAL_SUFFIXES[ordinalRules.select(value)] ?? 'th'}`;
}
