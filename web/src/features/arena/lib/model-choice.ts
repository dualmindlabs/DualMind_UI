import type { ModelSummary } from '@/lib/api';

/**
 * The models a visitor picked for Side by side and Direct, remembered per browser in the same
 * localStorage keys the legacy arena uses (components/chat/ChatView.js), so a choice made in one
 * app shows up in the other while both exist. The legacy app stores the model's `modelName`
 * (`@cf/meta/llama-3.3-70b-instruct-fp8-fast`), so we write that too, and read a name or an id.
 * An empty or missing key means "random".
 */
export const MODEL_CHOICE_KEYS = {
  left: 'battle.model.left',
  right: 'battle.model.right',
  direct: 'direct.model',
} as const;

export type ModelSlot = keyof typeof MODEL_CHOICE_KEYS;

export type ModelChoices = Record<ModelSlot, string | null>;

type ReadableStorage = Pick<Storage, 'getItem'>;
type WritableStorage = Pick<Storage, 'setItem' | 'removeItem'>;

/** The stored value of every slot (null: random). Unreadable storage reads as all random. */
export function readModelChoices(storage: ReadableStorage | null): ModelChoices {
  const read = (slot: ModelSlot) => {
    try {
      const value = storage?.getItem(MODEL_CHOICE_KEYS[slot])?.trim() ?? '';
      return value === '' || value === 'auto' ? null : value;
    } catch {
      return null;
    }
  };
  return { left: read('left'), right: read('right'), direct: read('direct') };
}

/** Stores one slot in the legacy format (the model name), or clears it for random. */
export function writeModelChoice(
  storage: WritableStorage | null,
  slot: ModelSlot,
  model: Pick<ModelSummary, 'modelName'> | null,
): void {
  try {
    if (model) storage?.setItem(MODEL_CHOICE_KEYS[slot], model.modelName);
    else storage?.removeItem(MODEL_CHOICE_KEYS[slot]);
  } catch {
    // Blocked or full storage: the choice holds for this page only.
  }
}

/** The model a stored value points at: matched on name, id or display name. */
export function resolveModel<T extends Pick<ModelSummary, 'modelId' | 'modelName' | 'displayName'>>(
  models: readonly T[],
  stored: string | null,
): T | null {
  if (!stored) return null;
  return (
    models.find(model => model.modelName === stored) ??
    models.find(model => model.modelId === stored) ??
    models.find(model => model.displayName === stored) ??
    null
  );
}
