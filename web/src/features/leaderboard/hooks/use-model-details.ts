import { type RefObject, useCallback, useRef, useState } from 'react';

export interface ModelDetailsState {
  /** The model shown in the sheet; kept after closing so the closing animation has content. */
  selectedId: string | null;
  open: boolean;
  /** Opens the sheet for a model. `trigger` gets focus back when the sheet closes. */
  openModel: (id: string, trigger?: HTMLElement | null) => void;
  onOpenChange: (open: boolean) => void;
  /** Passed to the sheet as `finalFocus`: the control that opened it. */
  returnFocusRef: RefObject<HTMLElement | null>;
}

/**
 * State for the model details sheet. Rows and cards open it from a click anywhere on them, so
 * the dialog cannot rely on "the previously focused element": the opener passes its button, and
 * focus returns there on Esc or close.
 */
export function useModelDetails(): ModelDetailsState {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  const openModel = useCallback((id: string, trigger?: HTMLElement | null) => {
    returnFocusRef.current =
      trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setSelectedId(id);
    setOpen(true);
  }, []);

  return { selectedId, open, openModel, onOpenChange: setOpen, returnFocusRef };
}
