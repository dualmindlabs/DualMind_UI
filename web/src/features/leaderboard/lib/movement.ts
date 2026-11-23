/**
 * Rank movement since the visitor's last visit. The API reports no history, so the board keeps
 * its own: the ranks it showed, in this browser's local storage. Nothing leaves the device.
 * Two snapshots are kept: the one from the last visit to compare with, and the newest, which
 * becomes the comparison after a gap (so a reload does not erase the movement).
 */

const KEY = 'dm.leaderboard.ranks';
/** A new snapshot becomes the comparison after this long. */
export const SNAPSHOT_GAP_MS = 30 * 60 * 1000;

export type RankSnapshot = Readonly<Record<string, number>>;

interface Stored {
  v: 1;
  current: { at: number; ranks: RankSnapshot };
  previous: { at: number; ranks: RankSnapshot } | null;
}

export type Movement =
  | { kind: 'up'; places: number }
  | { kind: 'down'; places: number }
  | { kind: 'same' }
  | { kind: 'new' };

function isRanks(value: unknown): value is RankSnapshot {
  return (
    typeof value === 'object' &&
    value !== null &&
    Object.values(value).every(rank => typeof rank === 'number')
  );
}

function read(): Stored | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const { v, current, previous } = parsed as Record<string, unknown>;
    const valid = (item: unknown): item is { at: number; ranks: RankSnapshot } =>
      typeof item === 'object' &&
      item !== null &&
      typeof (item as { at?: unknown }).at === 'number' &&
      isRanks((item as { ranks?: unknown }).ranks);
    if (v !== 1 || !valid(current)) return null;
    return { v: 1, current, previous: valid(previous) ? previous : null };
  } catch {
    return null;
  }
}

function write(value: Stored) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    // Storage can be blocked or full: movement is a nicety, never an error.
  }
}

/**
 * Records the ranks on screen and returns the snapshot to compare them with (or null on a first
 * visit). Call once per page load, when the board first arrives.
 */
export function takeBaseline(ranks: RankSnapshot, now = Date.now()): RankSnapshot | null {
  const stored = read();
  if (!stored) {
    write({ v: 1, current: { at: now, ranks }, previous: null });
    return null;
  }
  if (now - stored.current.at >= SNAPSHOT_GAP_MS) {
    write({ v: 1, current: { at: now, ranks }, previous: stored.current });
    return stored.current.ranks;
  }
  return stored.previous?.ranks ?? null;
}

/** How a rank moved against the baseline. */
export function movementOf(id: string, rank: number, baseline: RankSnapshot): Movement {
  const before = baseline[id];
  if (before === undefined) return { kind: 'new' };
  if (rank < before) return { kind: 'up', places: before - rank };
  if (rank > before) return { kind: 'down', places: rank - before };
  return { kind: 'same' };
}

/** Words for assistive technology and tooltips. */
export function describeMovement(movement: Movement): string {
  switch (movement.kind) {
    case 'up':
      return `Up ${movement.places} ${movement.places === 1 ? 'place' : 'places'} since your last visit`;
    case 'down':
      return `Down ${movement.places} ${movement.places === 1 ? 'place' : 'places'} since your last visit`;
    case 'same':
      return 'Same rank as your last visit';
    case 'new':
      return 'New on the board since your last visit';
  }
}

// The baseline of this page load: read from storage once, when the board first arrives, then kept
// so that a background refresh compares with the same visit. A tiny external store, so React reads
// it with useSyncExternalStore (nothing here exists on the server).
let pageBaseline: RankSnapshot | null = null;
let pageBaselineTaken = false;
const listeners = new Set<() => void>();

export function subscribeBaseline(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBaseline(): RankSnapshot | null {
  return pageBaseline;
}

/** Takes the page's baseline once; later calls do nothing. */
export function loadPageBaseline(ranks: RankSnapshot): void {
  if (pageBaselineTaken) return;
  pageBaselineTaken = true;
  pageBaseline = takeBaseline(ranks);
  for (const listener of listeners) listener();
}

/** For tests: forget the page's baseline. */
export function resetPageBaseline(): void {
  pageBaseline = null;
  pageBaselineTaken = false;
  for (const listener of listeners) listener();
}
