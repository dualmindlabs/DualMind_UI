/** A short slug, such as the `ref=arena` the Arena's redirect adds. Anything else is ignored. */
const REF_PATTERN = /^[a-z0-9][a-z0-9_-]{0,39}$/i;

export function readRef(search: string): string | null {
  const value = new URLSearchParams(search).get('ref');
  return value && REF_PATTERN.test(value) ? value.toLowerCase() : null;
}
