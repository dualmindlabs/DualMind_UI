import { useCallback } from 'react';

import { MODEL_CHOICE_KEYS, type ModelSlot, resolveModel } from '../lib/model-choice';
import type { ModelOption } from './use-model-options';
import { useStoredValue } from './use-stored-value';

export interface ModelChoicesState {
  left: ModelOption | null;
  right: ModelOption | null;
  direct: ModelOption | null;
  choose: (slot: ModelSlot, model: ModelOption | null) => void;
  /** Swaps the Side by side pair. */
  swap: () => void;
}

/**
 * The Side by side pair and the Direct model, stored in the legacy keys (`battle.model.left`,
 * `battle.model.right`, `direct.model`, as model names) so both arenas share the choice. Picking
 * the model the other side already has swaps the two, so a pair is never one model twice.
 */
export function useModelChoices(options: readonly ModelOption[] | undefined): ModelChoicesState {
  const [leftStored, setLeft] = useStoredValue(MODEL_CHOICE_KEYS.left);
  const [rightStored, setRight] = useStoredValue(MODEL_CHOICE_KEYS.right);
  const [directStored, setDirect] = useStoredValue(MODEL_CHOICE_KEYS.direct);
  const list = options ?? [];
  const left = resolveModel(list, leftStored);
  const right = resolveModel(list, rightStored);
  const direct = resolveModel(list, directStored);

  const choose = useCallback(
    (slot: ModelSlot, model: ModelOption | null) => {
      const name = model?.modelName ?? null;
      if (slot === 'direct') {
        setDirect(name);
        return;
      }
      const [setThis, setOther, other] =
        slot === 'left' ? [setLeft, setRight, rightStored] : [setRight, setLeft, leftStored];
      if (name !== null && other !== null && (other === name || other === model?.modelId)) {
        setOther(slot === 'left' ? leftStored : rightStored);
      }
      setThis(name);
    },
    [leftStored, rightStored, setLeft, setRight, setDirect],
  );

  const swap = useCallback(() => {
    setLeft(rightStored);
    setRight(leftStored);
  }, [leftStored, rightStored, setLeft, setRight]);

  return { left, right, direct, choose, swap };
}
