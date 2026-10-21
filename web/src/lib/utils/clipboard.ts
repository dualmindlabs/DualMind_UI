/** Writes text to the clipboard; false when the browser refuses (permissions, insecure page). */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export interface NativeShareData {
  title?: string;
  text?: string;
  url: string;
}

/** True when the browser has a share sheet (phones, Safari, Edge) that accepts this link. */
export function canShareNatively(data: NativeShareData): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.share !== 'function') return false;
  try {
    return typeof navigator.canShare === 'function' ? navigator.canShare(data) : true;
  } catch {
    return false;
  }
}

/**
 * Opens the system share sheet. Resolves to `shared`, `cancelled` (the person closed the sheet)
 * or `failed` (no share sheet, or the browser refused).
 */
export async function shareNatively(
  data: NativeShareData,
): Promise<'shared' | 'cancelled' | 'failed'> {
  if (!canShareNatively(data)) return 'failed';
  try {
    await navigator.share(data);
    return 'shared';
  } catch (error) {
    return error instanceof DOMException && error.name === 'AbortError' ? 'cancelled' : 'failed';
  }
}
