import type { SharedThread, ThreadMode } from '@/lib/api';

/** What the share page says about a thread above its transcript. */
export interface ShareSummary {
  /** "Shared battle", "Shared comparison", "Shared chat". */
  eyebrow: string;
  /** One line about the answers and the verdict. */
  lead: string;
  turns: number;
  /** At least one battle turn was voted on, so its names are shown. */
  voted: boolean;
  /** The newest time on the thread, for "Shared from a battle on 21 Oct 2026". */
  date: Date | null;
}

const EYEBROWS: Record<ThreadMode, string> = {
  battle: 'Shared battle',
  arena: 'Shared comparison',
  direct: 'Shared chat',
};

function leadFor(mode: ThreadMode, voted: boolean, allVoted: boolean): string {
  if (mode === 'direct') return 'One AI model answered. Read the conversation as it happened.';
  if (mode === 'arena') return 'Two AI models answered side by side, named from the start.';
  if (!voted) return 'Two anonymous AI models answered. Nobody voted, so their names stay hidden.';
  return allVoted
    ? 'Two anonymous AI models answered, and a verdict was cast. The names are revealed below.'
    : 'Two anonymous AI models answered. Names are revealed on the turns that got a vote.';
}

function parseDate(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The summary of a shared thread. Never reads anything about its owner. */
export function shareSummary({ thread, messages }: SharedThread): ShareSummary {
  const battles = messages.filter(message => message.model2Response !== '');
  const votedCount = battles.filter(message => message.hasVoted).length;
  const voted = votedCount > 0;
  return {
    eyebrow: EYEBROWS[thread.mode],
    lead: leadFor(thread.mode, voted, battles.length > 0 && votedCount === battles.length),
    turns: messages.length,
    voted,
    date: parseDate(thread.updatedAt) ?? parseDate(thread.createdAt),
  };
}

/** "21 Oct 2026", in the page's language. */
export function formatShareDate(date: Date, locale = 'en-GB'): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** The tab title: the thread's title and the site name. */
export function shareDocumentTitle(title: string | undefined): string {
  const clean = title?.replace(/\s+/g, ' ').trim();
  return clean ? `${clean} · DualMind Arena` : 'Shared from DualMind Arena';
}
