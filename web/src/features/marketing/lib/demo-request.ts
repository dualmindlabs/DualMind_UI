/**
 * A prompt asked in the hero, handed to the demo below it. The demo section is its own lazy chunk
 * and stays prerendered HTML until it is needed, so the hero cannot call into it: it leaves the
 * request here, wakes the section, and the section plays it as soon as it is live (at once when
 * it already is).
 */
export interface DemoRequest {
  /** A recorded battle; absent when the visitor's own prompt has no recording. */
  index?: number;
  asked: string | null;
}

let pending: DemoRequest | null = null;
const listeners = new Set<() => void>();

export function requestDemo(request: DemoRequest): void {
  pending = request;
  for (const listener of listeners) listener();
}

/** The waiting request, once: the next call returns null until a new request is made. */
export function takeDemoRequest(): DemoRequest | null {
  const request = pending;
  pending = null;
  return request;
}

export function onDemoRequest(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
