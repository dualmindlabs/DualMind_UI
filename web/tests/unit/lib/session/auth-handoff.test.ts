import { beforeEach, describe, expect, it } from 'vitest';

import {
  AUTH_HANDOFF_KEY,
  claimAuthHandoff,
  clearAuthHandoff,
  HANDOFF_TTL_MS,
  resetAuthHandoffClaim,
  saveAuthHandoff,
} from '@/lib/session/auth-handoff';
import { type DraftStorage, PROMPT_DRAFT_KEY, readPromptDraft, savePromptDraft } from '@/lib/session/prompt-draft';

// Cycle 2 audit P1-5: the prompt draft and the wanted page survive a sign-up (the confirmation
// link opens a new tab) and an OAuth round trip, once, for an hour at most.

const ORIGIN = 'https://arena.dualmindlab.tech';
const NOW = 1_800_000_000_000;

function memory(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: key => void data.delete(key),
  };
}

beforeEach(() => {
  resetAuthHandoffClaim();
});

describe('saveAuthHandoff', () => {
  it('copies the draft and the validated redirect to localStorage', () => {
    const local = memory();
    const tab = memory();
    savePromptDraft('Explain recursion', tab, NOW);
    expect(saveAuthHandoff('/settings/', { local, session: tab, now: NOW }, ORIGIN)).toBe(true);
    expect(JSON.parse(local.data.get(AUTH_HANDOFF_KEY) ?? '{}')).toEqual({
      draft: 'Explain recursion',
      redirect: '/settings/',
      savedAt: NOW,
    });
  });

  it('keeps nothing when there is no draft and the default redirect', () => {
    const local = memory();
    expect(saveAuthHandoff('/', { local, session: memory(), now: NOW }, ORIGIN)).toBe(false);
    expect(local.data.size).toBe(0);
  });

  it('keeps a redirect alone, and replaces an unsafe one with the default', () => {
    const local = memory();
    saveAuthHandoff('/compare/', { local, session: memory(), now: NOW }, ORIGIN);
    expect(JSON.parse(local.data.get(AUTH_HANDOFF_KEY) ?? '{}')).toMatchObject({
      draft: null,
      redirect: '/compare/',
    });
    const other = memory();
    savePromptDraft('x', other, NOW);
    saveAuthHandoff('https://evil.test/', { local: other, session: other, now: NOW }, ORIGIN);
    expect(JSON.parse(other.data.get(AUTH_HANDOFF_KEY) ?? '{}').redirect).toBe('/');
  });

  it('survives blocked storage', () => {
    const blocked: DraftStorage = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    expect(saveAuthHandoff('/compare/', { local: blocked, session: memory(), now: NOW }, ORIGIN)).toBe(false);
    expect(saveAuthHandoff('/compare/', { local: null, session: memory(), now: NOW }, ORIGIN)).toBe(false);
  });
});

describe('claimAuthHandoff', () => {
  function saved(redirect = '/compare/', draft: string | null = 'My prompt') {
    const local = memory();
    const source = memory();
    if (draft) savePromptDraft(draft, source, NOW);
    saveAuthHandoff(redirect, { local, session: source, now: NOW }, ORIGIN);
    return local;
  }

  it('puts the draft into this tab, deletes the record and says where to go', () => {
    const local = saved();
    const tab = memory();
    const claimed = claimAuthHandoff(ORIGIN, { local, session: tab, now: NOW + 5000 });
    expect(claimed).toEqual({ redirect: '/compare/', restoredDraft: true });
    expect(readPromptDraft(tab, NOW + 5000)).toBe('My prompt');
    expect(local.data.has(AUTH_HANDOFF_KEY)).toBe(false);
  });

  it('is read once, but answers the same for the rest of the page load', () => {
    const local = saved();
    const first = claimAuthHandoff(ORIGIN, { local, session: memory(), now: NOW });
    local.data.set(AUTH_HANDOFF_KEY, 'another record');
    expect(claimAuthHandoff(ORIGIN, { local, session: memory(), now: NOW })).toBe(first);
  });

  it('does not overwrite a newer draft in this tab', () => {
    const local = saved();
    const tab = memory();
    savePromptDraft('Typed here later', tab, NOW + 1000);
    const claimed = claimAuthHandoff(ORIGIN, { local, session: tab, now: NOW + 2000 });
    expect(claimed?.restoredDraft).toBe(false);
    expect(readPromptDraft(tab, NOW + 2000)).toBe('Typed here later');
  });

  it('drops a record older than an hour, and one from the future', () => {
    const old = saved();
    expect(
      claimAuthHandoff(ORIGIN, { local: old, session: memory(), now: NOW + HANDOFF_TTL_MS + 1 }),
    ).toBeNull();
    expect(old.data.has(AUTH_HANDOFF_KEY)).toBe(false);
    resetAuthHandoffClaim();
    const future = saved();
    expect(claimAuthHandoff(ORIGIN, { local: future, session: memory(), now: NOW - 10 * 60_000 })).toBeNull();
  });

  it('validates the redirect again and ignores a broken record', () => {
    const local = memory();
    local.data.set(
      AUTH_HANDOFF_KEY,
      JSON.stringify({ draft: null, redirect: '//evil.test', savedAt: NOW }),
    );
    expect(claimAuthHandoff(ORIGIN, { local, session: memory(), now: NOW })?.redirect).toBe('/');
    resetAuthHandoffClaim();
    local.data.set(AUTH_HANDOFF_KEY, '{not json');
    expect(claimAuthHandoff(ORIGIN, { local, session: memory(), now: NOW })).toBeNull();
  });

  it('finds nothing when there is no record or no storage', () => {
    expect(claimAuthHandoff(ORIGIN, { local: memory(), session: memory(), now: NOW })).toBeNull();
    resetAuthHandoffClaim();
    expect(claimAuthHandoff(ORIGIN, { local: null, session: memory(), now: NOW })).toBeNull();
  });
});

describe('clearAuthHandoff', () => {
  it('removes the record', () => {
    const local = memory();
    local.data.set(AUTH_HANDOFF_KEY, '{}');
    clearAuthHandoff(local);
    expect(local.data.size).toBe(0);
    expect(PROMPT_DRAFT_KEY).toBe('dm.promptDraft.v1');
  });
});
