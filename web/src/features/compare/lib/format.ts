/** "12 Nov 2026"; an unreadable date gives an empty string. */
export function formatDay(iso: string | null): string {
  if (iso === null) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(date);
}

/** "3.2 s" or "840 ms". */
export function formatTime(ms: number | null): string | null {
  if (ms === null || ms < 0) return null;
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}

/** `/compare/<id>` on this origin. */
export function compareUrl(shareId: string): string {
  return `${window.location.origin}/compare/${encodeURIComponent(shareId)}`;
}
