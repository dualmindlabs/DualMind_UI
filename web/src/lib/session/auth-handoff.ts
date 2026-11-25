/**
 * What a sign-up or an OAuth round trip must not lose: the prompt typed on the landing page and
 * the page the visitor was heading for (cycle 2 audit P1-5).
 *
 * The prompt draft lives in sessionStorage, so only the tab that typed it has it. Email
 * confirmation opens a NEW tab, and OAuth always returns to `/`, so both used to drop it. Before
 * leaving (sign-up submit, OAuth button, email code), the sign-in pages call `saveAuthHandoff`,
 * which copies the draft and the validated redirect to localStorage. When the app loads signed in
 * (the arena, or the callback page), `claimAuthHandoff` reads it ONCE, puts the draft back into
 * this tab's sessionStorage for the arena to pick up, and deletes the record.
 *
 * - **localStorage**, so another tab of this browser can claim it; **dropped after an hour**
 *   (HANDOFF_TTL_MS, the same as the prompt draft) and **read once**.
 * - The redirect is validated again when it is claimed (`safeRedirect`).
 * - Never sent anywhere: no analytics, no logs, no request carries it.
 * - Blocked or full storage: nothing is kept, and the visitor simply signs in.
 */
import { safeRedirect } from '@/lib/supabase/redirect';

import {
  type DraftStorage,
  draftStorage,
  PROMPT_DRAFT_MAX_CHARS,
  readPromptDraft,
  savePromptDraft,
} from './prompt-draft';

export const AUTH_HANDOFF_KEY = 'dm.authHandoff.v1';

/** A record older than this is dropped, like the prompt draft. */
export const HANDOFF_TTL_MS = 60 * 60 * 1000;

const FUTURE_SLACK_MS = 60 * 1000;

interface StoredHandoff {
  draft: string | null;
  redirect: string;
  savedAt: number;
}

export interface ClaimedHandoff {
  /** The validated page to continue to; `/` when there was none. */
  redirect: string;
  /** True when a prompt draft was put back into this tab. */
  restoredDraft: boolean;
}

export interface HandoffStorages {
  /** Shared by every tab: where the record lives. */
  local?: DraftStorage | null;
  /** This tab: where the draft is read from and restored to. */
  session?: DraftStorage | null;
  now?: number;
}

function localStore(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage;
  } catch {
    return null;
  }
}

/**
 * Keeps the current prompt draft and `redirect` for the sign-in that is about to leave this page.
 * False when there is nothing worth keeping (no draft and the default redirect) or no storage.
 */
export function saveAuthHandoff(
  redirect: string,
  { local = localStore(), session = draftStorage(), now = Date.now() }: HandoffStorages = {},
  origin: string = typeof window === 'undefined' ? '' : window.location.origin,
): boolean {
  if (!local || origin === '') return false;
  const draft = readPromptDraft(session, now);
  const target = safeRedirect(redirect, origin);
  if (draft === null && target === '/') return false;
  const record: StoredHandoff = {
    draft: draft === null ? null : draft.slice(0, PROMPT_DRAFT_MAX_CHARS),
    redirect: target,
    savedAt: now,
  };
  try {
    local.setItem(AUTH_HANDOFF_KEY, JSON.stringify(record));
    return true;
  } catch {
    return false;
  }
}

function parse(raw: string | null): StoredHandoff | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return null;
    const { draft, redirect, savedAt } = value as Record<string, unknown>;
    if (typeof redirect !== 'string' || typeof savedAt !== 'number' || !Number.isFinite(savedAt)) {
      return null;
    }
    if (draft !== null && typeof draft !== 'string') return null;
    return { draft, redirect, savedAt };
  } catch {
    return null;
  }
}

/** Forgets the record (claimed, expired, or the visitor signed out). */
export function clearAuthHandoff(local: DraftStorage | null = localStore()): void {
  try {
    local?.removeItem(AUTH_HANDOFF_KEY);
  } catch {
    // Blocked storage: there was nothing to read either.
  }
}

let claimed: ClaimedHandoff | null | undefined;

/** For tests: forget this page load's claim. */
export function resetAuthHandoffClaim(): void {
  claimed = undefined;
}

/**
 * Reads the record once: puts its draft into this tab (unless the tab has a newer one), deletes
 * the record, and returns where to continue. Null when there is no fresh record. The answer is
 * kept for the rest of the page load, so React's double render and a second caller see the same
 * result instead of an already-deleted record.
 */
export function claimAuthHandoff(
  origin: string = typeof window === 'undefined' ? '' : window.location.origin,
  { local = localStore(), session = draftStorage(), now = Date.now() }: HandoffStorages = {},
): ClaimedHandoff | null {
  if (claimed !== undefined) return claimed;
  if (!local || origin === '') return null;
  let raw: string | null = null;
  try {
    raw = local.getItem(AUTH_HANDOFF_KEY);
  } catch {
    return null;
  }
  if (raw === null) {
    claimed = null;
    return null;
  }
  clearAuthHandoff(local);
  const record = parse(raw);
  const fresh =
    record !== null &&
    now - record.savedAt <= HANDOFF_TTL_MS &&
    record.savedAt - now <= FUTURE_SLACK_MS;
  if (!record || !fresh) {
    claimed = null;
    return null;
  }
  let restoredDraft = false;
  if (record.draft && readPromptDraft(session, now) === null) {
    restoredDraft = savePromptDraft(record.draft, session, now);
  }
  claimed = { redirect: safeRedirect(record.redirect, origin), restoredDraft };
  return claimed;
}
