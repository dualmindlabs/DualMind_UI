/**
 * Number and time formatting for the board. The locale is the page's: `<html lang>` (the root
 * sets "en"), read once per format, so the prerendered HTML and the browser agree and columns
 * line up. Render the results in a `tabular-nums` context. Times use the visitor's clock and
 * time zone (they only exist in the browser, after the data loads).
 */

const FALLBACK_LOCALE = 'en';

/** The document's language (`<html lang>`); "en" on the server and when the attribute is empty. */
export function documentLocale(): string {
  if (typeof document === 'undefined') return FALLBACK_LOCALE;
  return document.documentElement.lang.trim() || FALLBACK_LOCALE;
}

const cache = new Map<string, Intl.NumberFormat>();

/** A cached `Intl.NumberFormat` for the document's locale; an invalid tag falls back to "en". */
function numberFormat(key: string, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const locale = documentLocale();
  const id = `${locale}|${key}`;
  let format = cache.get(id);
  if (!format) {
    try {
      format = new Intl.NumberFormat(locale, options);
    } catch {
      format = new Intl.NumberFormat(FALLBACK_LOCALE, options);
    }
    cache.set(id, format);
  }
  return format;
}

const ELO = { maximumFractionDigits: 0, useGrouping: false } as const;
const COUNT = { maximumFractionDigits: 0 } as const;
const PERCENT = {
  style: 'percent',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
} as const;
const SIGNED = { maximumFractionDigits: 0, signDisplay: 'exceptZero', useGrouping: false } as const;

/** An Elo rating, rounded, without a thousands separator: "1150" (as chess ratings are written). */
export function formatElo(elo: number): string {
  return numberFormat('elo', ELO).format(Math.round(elo));
}

/** A rating difference with its sign: "+12", "-3", "0". */
export function formatEloDelta(delta: number): string {
  return numberFormat('signed', SIGNED).format(Math.round(delta));
}

/** A percentage given as 0-100 (the API's win rate), with one decimal: "64.6%". */
export function formatPercent(percent: number): string {
  return numberFormat('percent', PERCENT).format(percent / 100);
}

/** A count with thousands separators: "7,152". */
export function formatCount(count: number): string {
  return numberFormat('count', COUNT).format(Math.round(count));
}

/** A rank with a leading zero below 10, for the podium: "01". */
export function formatRank(rank: number): string {
  return String(rank).padStart(2, '0');
}

/** "1 battle", "96 battles". */
export function pluralize(count: number, one: string, many = `${one}s`): string {
  return `${formatCount(count)} ${count === 1 ? one : many}`;
}

const CLOCK = { hour: 'numeric', minute: '2-digit' } as const;

function dateTimeFormat(options: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  try {
    return new Intl.DateTimeFormat(documentLocale(), options);
  } catch {
    return new Intl.DateTimeFormat(FALLBACK_LOCALE, options);
  }
}

/** The time of day in the page's locale and the visitor's clock: "12:04" or "12:04 PM". */
export function formatClock(timestamp: number): string {
  return dateTimeFormat(CLOCK).format(new Date(timestamp));
}

/** The visitor's time zone at that moment, short: "UTC", "IST", "GMT+5:30", "PDT". */
export function formatZone(timestamp: number): string {
  const part = dateTimeFormat({ ...CLOCK, timeZoneName: 'short' })
    .formatToParts(new Date(timestamp))
    .find(item => item.type === 'timeZoneName');
  return part?.value ?? '';
}

/** The time with its zone, for sentences: "8:45 AM UTC". */
export function formatClockWithZone(timestamp: number): string {
  return `${formatClock(timestamp)} ${formatZone(timestamp)}`.trim();
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

const ordinalRules = new Intl.PluralRules(FALLBACK_LOCALE, { type: 'ordinal' });
const ORDINAL_SUFFIXES: Readonly<Record<string, string>> = {
  one: 'st',
  two: 'nd',
  few: 'rd',
  other: 'th',
};

/** English ordinals only (the suffixes are English): "1st", "2nd", "3rd", "11th", "22nd". */
export function formatOrdinal(value: number): string {
  return `${formatCount(value)}${ORDINAL_SUFFIXES[ordinalRules.select(value)] ?? 'th'}`;
}
