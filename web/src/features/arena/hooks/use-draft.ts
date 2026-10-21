import { createContext, useContext } from 'react';

/** The prompt being written: kept apart so typing does not re-render the whole arena. */
export interface DraftState {
  draft: string;
  setDraft: (draft: string) => void;
}

export const DraftContext = createContext<DraftState | null>(null);

export function useDraft(): DraftState {
  const state = useContext(DraftContext);
  if (!state) throw new Error('useDraft() needs <ArenaProvider>.');
  return state;
}
