/**
 * The compare results this browser created. The API does not say who owns a result it returns, so
 * the page keeps the ids it made here and shows the owner's controls (share, delete) only for
 * them. A guess is harmless: the API answers 404 to anyone else. Storage can be blocked, and then
 * the owner's controls simply show right after a run and not when reopening the link.
 */
const KEY = 'dm.compare.owned';
const MAX = 100;

function read(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(KEY) ?? '[]');
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === 'string') : [];
  } catch {
    return [];
  }
}

export function rememberOwned(shareId: string): void {
  try {
    const next = [shareId, ...read().filter(id => id !== shareId)].slice(0, MAX);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // Blocked storage: nothing to remember.
  }
}

export function forgetOwned(shareId: string): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(read().filter(id => id !== shareId)));
  } catch {
    // Blocked storage: nothing to forget.
  }
}

export function isOwned(shareId: string): boolean {
  return read().includes(shareId);
}
