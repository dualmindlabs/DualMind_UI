import {
  PRIVATE_ARENA_MAX_PROMPTS,
  PRIVATE_ARENA_NAME_MAX_CHARS,
  PRIVATE_PROMPT_MAX_CHARS,
} from '@/lib/api';

export interface ParsedPrompts {
  /** The non-empty lines, trimmed, in order. */
  prompts: string[];
  /** A problem to show under the field, or null when the set can be created. */
  error: string | null;
}

/**
 * One prompt per line. Empty lines are ignored; a set needs at least one prompt, at most 50, and
 * each prompt at most 2,000 characters (the backend's limits).
 */
export function parsePrompts(text: string): ParsedPrompts {
  const prompts = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(line => line !== '');
  if (prompts.length === 0) return { prompts, error: 'Add at least one prompt, one per line.' };
  if (prompts.length > PRIVATE_ARENA_MAX_PROMPTS) {
    return { prompts, error: `Use at most ${PRIVATE_ARENA_MAX_PROMPTS} prompts.` };
  }
  const long = prompts.findIndex(prompt => prompt.length > PRIVATE_PROMPT_MAX_CHARS);
  if (long !== -1) {
    return {
      prompts,
      error: `Prompt ${long + 1} is longer than ${PRIVATE_PROMPT_MAX_CHARS} characters.`,
    };
  }
  return { prompts, error: null };
}

/** A problem with the arena's name, or null. */
export function validateArenaName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed === '') return 'Give the arena a name.';
  if (trimmed.length > PRIVATE_ARENA_NAME_MAX_CHARS) {
    return `Use ${PRIVATE_ARENA_NAME_MAX_CHARS} characters or fewer.`;
  }
  return null;
}

/** The index of the next prompt to battle, or null when every prompt has had its battle. */
export function nextPromptIndex(battlesDone: number, promptCount: number): number | null {
  return battlesDone < promptCount ? Math.max(0, battlesDone) : null;
}
