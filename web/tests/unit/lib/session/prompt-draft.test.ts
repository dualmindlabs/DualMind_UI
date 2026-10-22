import { describe, expect, it, vi } from 'vitest';

import {
  clearPromptDraft,
  type DraftStorage,
  PROMPT_DRAFT_KEY,
  PROMPT_DRAFT_MAX_CHARS,
  PROMPT_DRAFT_TTL_MS,
  PROMPT_SIGN_IN_HREF,
  readPromptDraft,
  savePromptDraft,
  sendPromptToSignIn,
} from '@/lib/session/prompt-draft';

// UI audit P1-1: a prompt typed on the landing page survives sign-in in this tab only, capped,
// for an hour at most, and the arena reads it once.

function memory(): DraftStorage & { data: Map<string, string> } {
  const data = new Map<string, string>();
  return {
    data,
    getItem: key => data.get(key) ?? null,
    setItem: (key, value) => void data.set(key, value),
    removeItem: key => void data.delete(key),
  };
}

const broken: DraftStorage = {
  getItem: () => {
    throw new Error('SecurityError');
  },
  setItem: () => {
    throw new Error('QuotaExceededError');
  },
  removeItem: () => {
    throw new Error('SecurityError');
  },
};

const NOW = 1_800_000_000_000;

describe('the landing prompt draft', () => {
  it('keeps a typed prompt and gives it back', () => {
    const storage = memory();
    expect(savePromptDraft('  Write a sonnet about tabs and spaces  ', storage, NOW)).toBe(true);
    expect(readPromptDraft(storage, NOW + 1_000)).toBe('Write a sonnet about tabs and spaces');
    // Reading does not consume it: the arena clears it once the prompt is in the box.
    expect(readPromptDraft(storage, NOW + 2_000)).toBe('Write a sonnet about tabs and spaces');
    clearPromptDraft(storage);
    expect(readPromptDraft(storage, NOW + 3_000)).toBeNull();
    expect(storage.data.size).toBe(0);
  });

  it('keeps nothing for an empty prompt', () => {
    const storage = memory();
    expect(savePromptDraft('   ', storage, NOW)).toBe(false);
    expect(storage.data.size).toBe(0);
  });

  it('caps a long prompt', () => {
    const storage = memory();
    savePromptDraft('x'.repeat(PROMPT_DRAFT_MAX_CHARS + 500), storage, NOW);
    expect(readPromptDraft(storage, NOW)).toHaveLength(PROMPT_DRAFT_MAX_CHARS);
  });

  it('drops a draft older than an hour, and removes it', () => {
    const storage = memory();
    savePromptDraft('Old question', storage, NOW);
    expect(readPromptDraft(storage, NOW + PROMPT_DRAFT_TTL_MS)).toBe('Old question');
    expect(readPromptDraft(storage, NOW + PROMPT_DRAFT_TTL_MS + 1)).toBeNull();
    expect(storage.data.has(PROMPT_DRAFT_KEY)).toBe(false);
  });

  it('drops a draft from the future (a changed clock) and anything malformed', () => {
    const storage = memory();
    savePromptDraft('From tomorrow', storage, NOW + 24 * 60 * 60 * 1000);
    expect(readPromptDraft(storage, NOW)).toBeNull();
    for (const raw of ['not json', '[]', '{"text":42,"savedAt":1}', '{"text":"x"}', 'null']) {
      storage.data.set(PROMPT_DRAFT_KEY, raw);
      expect(readPromptDraft(storage, NOW), raw).toBeNull();
      expect(storage.data.has(PROMPT_DRAFT_KEY), raw).toBe(false);
    }
  });

  it('works without storage: nothing kept, nothing thrown', () => {
    expect(savePromptDraft('Hello', broken, NOW)).toBe(false);
    expect(readPromptDraft(broken, NOW)).toBeNull();
    expect(() => clearPromptDraft(broken)).not.toThrow();
    expect(savePromptDraft('Hello', null, NOW)).toBe(false);
    expect(readPromptDraft(null, NOW)).toBeNull();
  });

  it('stores only the text and the time, under one key', () => {
    const storage = memory();
    savePromptDraft('Explain recursion', storage, NOW);
    expect([...storage.data.keys()]).toEqual([PROMPT_DRAFT_KEY]);
    expect(JSON.parse(storage.data.get(PROMPT_DRAFT_KEY) ?? '{}')).toEqual({
      text: 'Explain recursion',
      savedAt: NOW,
    });
  });

  it('sends the visitor to sign in, back to the arena, with the prompt kept', () => {
    const storage = memory();
    const navigate = vi.fn();
    sendPromptToSignIn('Which is bigger, 9.11 or 9.9?', navigate, storage);
    expect(navigate).toHaveBeenCalledWith('/login/?redirect=%2F');
    expect(PROMPT_SIGN_IN_HREF).toBe('/login/?redirect=%2F');
    expect(readPromptDraft(storage)).toBe('Which is bigger, 9.11 or 9.9?');
  });

  it('still sends the visitor to sign in when storage is blocked', () => {
    const navigate = vi.fn();
    sendPromptToSignIn('Hello', navigate, broken);
    expect(navigate).toHaveBeenCalledWith(PROMPT_SIGN_IN_HREF);
  });
});
