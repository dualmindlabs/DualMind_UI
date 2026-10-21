import { useSyncExternalStore } from 'react';

import { readPromptDraft } from '@/lib/session/prompt-draft';

// sessionStorage has no same-tab change event, and the draft only changes on another page.
const subscribe = (): (() => void) => () => {};
const getServerSnapshot = (): string | null => null;

/**
 * The prompt typed on the landing page that waits for this sign-in (lib/session/prompt-draft.ts),
 * or null. Null while prerendering and hydrating, so the page renders the same on both sides.
 */
export function usePromptDraft(): string | null {
  return useSyncExternalStore(subscribe, () => readPromptDraft(), getServerSnapshot);
}
