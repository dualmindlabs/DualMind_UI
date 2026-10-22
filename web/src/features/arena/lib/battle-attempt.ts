/**
 * One `Idempotency-Key` per battle attempt (BE-6). The API runs a battle once per key and body, so
 * a repeat of the same request returns the first battle instead of a second one. The key lives
 * from the first send until the battle arrives or the visitor stops it:
 *
 * - Try again after a failure, with the same prompt, models and thread, reuses the key. If the
 *   first call actually finished on the server, the retry gets that battle back.
 * - A new prompt, other models or another thread is a new attempt with a new key (the API
 *   answers 409 when a key is reused with a different body).
 * - After a finished battle the same text sent again is a new battle: the key is gone.
 */

export interface AttemptRequest {
  prompt: string;
  model1?: string | undefined;
  model2?: string | undefined;
  threadId?: string | undefined;
}

export interface AttemptTracker {
  /** The key for this request: the open attempt's key when the request is the same, else a new one. */
  keyFor: (request: AttemptRequest) => string;
  /** Ends the open attempt (the battle arrived, the visitor stopped it, or the key was refused). */
  settle: () => void;
}

/** The request as the API sees it; two requests with the same signature share a key. */
export function attemptSignature(request: AttemptRequest): string {
  return JSON.stringify([
    request.prompt,
    request.model1 ?? null,
    request.model2 ?? null,
    request.threadId ?? null,
  ]);
}

export function createAttemptTracker(
  newKey: () => string = () => crypto.randomUUID(),
): AttemptTracker {
  let open: { signature: string; key: string } | null = null;
  return {
    keyFor: request => {
      const signature = attemptSignature(request);
      if (open?.signature !== signature) open = { signature, key: newKey() };
      return open.key;
    },
    settle: () => {
      open = null;
    },
  };
}
