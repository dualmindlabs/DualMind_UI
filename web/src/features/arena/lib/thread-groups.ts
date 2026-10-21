import type { Thread } from '@/lib/api';

/**
 * The history sidebar's rules (new-features.md F-8): threads grouped by the day they were last
 * used (Today, Yesterday, Last 7 days, Older, in the visitor's time zone), and a client-side
 * search on titles that ignores case and accents. Pure functions, unit-tested.
 */

export type ThreadGroupId = 'today' | 'yesterday' | 'week' | 'older';

export const THREAD_GROUP_LABELS: Record<ThreadGroupId, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  week: 'Last 7 days',
  older: 'Older',
};

const GROUP_ORDER: readonly ThreadGroupId[] = ['today', 'yesterday', 'week', 'older'];

export interface ThreadGroup {
  id: ThreadGroupId;
  label: string;
  threads: Thread[];
}

/** When the thread was last used: `updatedAt`, else `createdAt`; null when neither parses. */
export function threadTime(thread: Pick<Thread, 'updatedAt' | 'createdAt'>): number | null {
  for (const value of [thread.updatedAt, thread.createdAt]) {
    if (!value) continue;
    const time = Date.parse(value);
    if (!Number.isNaN(time)) return time;
  }
  return null;
}

function startOfDay(time: number): number {
  const date = new Date(time);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

/** Which group a time falls in, relative to `now` (local calendar days). */
export function groupFor(time: number | null, now: number): ThreadGroupId {
  if (time === null) return 'older';
  const today = startOfDay(now);
  if (time >= today) return 'today';
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (time >= yesterday.getTime()) return 'yesterday';
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);
  return time >= weekAgo.getTime() ? 'week' : 'older';
}

/** Threads in date groups, newest first inside each; empty groups are left out. */
export function groupThreads(threads: readonly Thread[], now: number): ThreadGroup[] {
  const buckets = new Map<ThreadGroupId, Array<{ thread: Thread; time: number | null }>>();
  for (const thread of threads) {
    const time = threadTime(thread);
    const id = groupFor(time, now);
    const bucket = buckets.get(id) ?? [];
    bucket.push({ thread, time });
    buckets.set(id, bucket);
  }
  return GROUP_ORDER.flatMap(id => {
    const bucket = buckets.get(id);
    if (!bucket) return [];
    bucket.sort((a, b) => (b.time ?? 0) - (a.time ?? 0));
    return [{ id, label: THREAD_GROUP_LABELS[id], threads: bucket.map(entry => entry.thread) }];
  });
}

/** Lower case without accents, for matching ("Café" finds "cafe"). */
export function foldText(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

/** Threads whose title contains every word of the query, in any order. */
export function filterThreads(threads: readonly Thread[], query: string): Thread[] {
  const words = foldText(query).split(' ').filter(Boolean);
  if (words.length === 0) return [...threads];
  return threads.filter(thread => {
    const title = foldText(thread.title);
    return words.every(word => title.includes(word));
  });
}

/** A short time for a row: "14:05" today, "Mon" this week, "3 Oct" before, "3 Oct 2025" older. */
export function formatThreadTime(time: number | null, now: number, locale?: string): string {
  if (time === null) return '';
  const group = groupFor(time, now);
  const date = new Date(time);
  if (group === 'today') {
    return new Intl.DateTimeFormat(locale, { hour: 'numeric', minute: '2-digit' }).format(date);
  }
  if (group === 'yesterday' || group === 'week') {
    return new Intl.DateTimeFormat(locale, { weekday: 'short' }).format(date);
  }
  const sameYear = date.getFullYear() === new Date(now).getFullYear();
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  }).format(date);
}
