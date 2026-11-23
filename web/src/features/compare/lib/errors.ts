import { getUserMessage, isApiError } from '@/lib/api';

/**
 * What to tell the person when a compare call fails, by the backend's error code (backend PR 64).
 * Codes the screen does not know fall back to the API layer's message for the error kind.
 */
const BY_CODE: Readonly<Record<string, string>> = {
  RATE_LIMITED: 'You have run a lot of comparisons. Wait a moment, then try again.',
  COMPARE_IN_PROGRESS: 'Two comparisons of yours are still running. Wait for one to finish.',
  COMPARE_BUSY: 'Compare is busy right now. Try again in a few seconds.',
  MODEL_UNAVAILABLE:
    'One of the two models could not answer. Nothing was saved. Try again, or pick another model.',
  MODEL_LIST_UNAVAILABLE: 'The model list could not be loaded. Try again shortly.',
  SAME_MODEL: 'Pick two different models.',
  UNKNOWN_MODEL: 'One of those models is not available any more. Pick another one.',
  PROMPT_TOO_LONG: 'That prompt is too long. Shorten it and try again.',
  SYSTEM_NOT_SUPPORTED: 'Compare does not take a custom system prompt.',
  COMPARE_NOT_FOUND:
    'This result is private, has expired or was deleted. Only its owner can open a private one.',
};

export function compareErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    const known = BY_CODE[error.code];
    if (known !== undefined) return known;
  }
  return getUserMessage(error);
}

/** True when the backend says compare mode is off (404 `FEATURE_DISABLED`). */
export function isCompareOff(error: unknown): boolean {
  return isApiError(error) && error.status === 404 && error.code === 'FEATURE_DISABLED';
}
