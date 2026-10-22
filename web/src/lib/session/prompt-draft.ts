/**
 * A prompt typed on the signed-out landing page, carried through sign-in into the arena (UI
 * audit P1-1). Signed out, a prompt cannot reach real models, so the landing page keeps it here
 * and sends the visitor to sign in; after any way of signing in (password, email or phone code,
 * Google or GitHub, a new account) the arena opens with the prompt in its box, focused and NOT
 * sent: sending stays the visitor's choice.
 *
 * - **sessionStorage**, this tab only: it survives the sign-in pages and the OAuth round trip
 *   (same tab, same origin) and is gone when the tab closes. Never localStorage, a cookie or the
 *   URL, and never sent anywhere: no analytics, no logs, no request carries it.
 * - **Capped** at PROMPT_DRAFT_MAX_CHARS, and **dropped after an hour** (PROMPT_DRAFT_TTL_MS):
 *   coming back to the arena the next day should not resurrect an old question.
 * - Read once: the arena clears it as soon as the prompt is in the box.
 * - Blocked or full storage: nothing is kept, and the visitor simply signs in.
 */

export const PROMPT_DRAFT_KEY = 'dm.promptDraft.v1';

/** Longer prompts are cut here (the arena's own limit is far above any typed hero prompt). */
export const PROMPT_DRAFT_MAX_CHARS = 4_000;

/** A draft older than this is dropped instead of prefilled. */
export const PROMPT_DRAFT_TTL_MS = 60 * 60 * 1000;

/** Clock skew allowed for a draft "from the future" (another tab's clock, a changed clock). */
const FUTURE_SLACK_MS = 60 * 1000;

export type DraftStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

interface StoredDraft {
  text: string;
  savedAt: number;
}

/** window.sessionStorage, or null where it is missing or blocked (access itself can throw). */
export function draftStorage(): DraftStorage | null {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

/** Keeps a typed prompt for after sign-in. False when there is nothing to keep or no storage. */
export function savePromptDraft(
  text: string,
  storage: DraftStorage | null = draftStorage(),
  now: number = Date.now(),
): boolean {
  const trimmed = text.trim().slice(0, PROMPT_DRAFT_MAX_CHARS).trim();
  if (trimmed === '' || !storage) return false;
  try {
    const draft: StoredDraft = { text: trimmed, savedAt: now };
    storage.setItem(PROMPT_DRAFT_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

/** Forgets the draft (the arena took it, or it expired). */
export function clearPromptDraft(storage: DraftStorage | null = draftStorage()): void {
  try {
    storage?.removeItem(PROMPT_DRAFT_KEY);
  } catch {
    // Blocked storage: there was nothing to read either.
  }
}

function parse(raw: string | null): StoredDraft | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as unknown;
    if (typeof value !== 'object' || value === null) return null;
    const { text, savedAt } = value as Record<string, unknown>;
    if (typeof text !== 'string' || typeof savedAt !== 'number' || !Number.isFinite(savedAt)) {
      return null;
    }
    return { text, savedAt };
  } catch {
    return null;
  }
}

/**
 * The kept prompt, or null: none, unreadable, empty, or older than an hour (an expired or broken
 * draft is removed on the way). Does not remove a good one: the arena does, once it is shown.
 */
export function readPromptDraft(
  storage: DraftStorage | null = draftStorage(),
  now: number = Date.now(),
): string | null {
  let raw: string | null;
  try {
    raw = storage?.getItem(PROMPT_DRAFT_KEY) ?? null;
  } catch {
    return null;
  }
  if (raw === null) return null;
  const draft = parse(raw);
  const text = draft?.text.trim().slice(0, PROMPT_DRAFT_MAX_CHARS) ?? '';
  const fresh =
    draft !== null &&
    now - draft.savedAt <= PROMPT_DRAFT_TTL_MS &&
    draft.savedAt - now <= FUTURE_SLACK_MS;
  if (!fresh || text === '') {
    clearPromptDraft(storage);
    return null;
  }
  return text;
}

/** Where a typed landing prompt goes: sign in, then back to `/`, the arena. */
export const PROMPT_SIGN_IN_HREF = `/login/?redirect=${encodeURIComponent('/')}`;

/**
 * The landing page's send: keeps the prompt (when storage allows) and leaves for sign-in with a
 * full page load. Without storage the visitor still signs in, just without the prompt.
 */
export function sendPromptToSignIn(
  text: string,
  navigate: (href: string) => void = href => window.location.assign(href),
  storage: DraftStorage | null = draftStorage(),
): void {
  savePromptDraft(text, storage);
  navigate(PROMPT_SIGN_IN_HREF);
}
