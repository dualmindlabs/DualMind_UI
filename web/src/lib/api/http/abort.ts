import { ApiError } from '../errors';

/**
 * Makes `controller` abort when `signal` does. Returns a function that removes the listener;
 * call it when the request settles so long-lived signals do not collect listeners.
 */
export function linkSignal(signal: AbortSignal | undefined, controller: AbortController): () => void {
  if (signal === undefined) return () => undefined;
  if (signal.aborted) {
    controller.abort(signal.reason);
    return () => undefined;
  }
  const onAbort = () => controller.abort(signal.reason);
  signal.addEventListener('abort', onAbort, { once: true });
  return () => signal.removeEventListener('abort', onAbort);
}

export interface ErrorContext {
  requestId?: string | undefined;
  method?: string | undefined;
  path?: string | undefined;
}

export function abortedError(context: ErrorContext = {}): ApiError {
  return new ApiError({ kind: 'aborted', message: 'The request was aborted', ...context });
}

/** Waits `ms`, or rejects with an `aborted` ApiError as soon as `signal` aborts. */
export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(abortedError());
      return;
    }
    const onAbort = () => {
      clearTimeout(timer);
      reject(abortedError());
    };
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, ms);
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}
