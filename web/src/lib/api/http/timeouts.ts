/**
 * Per-endpoint timeouts in milliseconds (docs/api/endpoints.md, "Timeouts and retries").
 * Any of them can be overridden per call with `CallOptions.timeoutMs`.
 */
export const TIMEOUTS = Object.freeze({
  /** Health check: answers in milliseconds when the API is up. */
  health: 5_000,
  /** Reads and small writes (threads, models, leaderboard, votes). */
  default: 15_000,
  /** One model answering a chat prompt. */
  chat: 60_000,
  /** Two models answering in parallel (dualchat). */
  battle: 60_000,
  /** Streams: no total limit, but fail when nothing arrives for this long. */
  streamIdle: 30_000,
  /** Text to speech: audio generation is slower than a read. */
  speech: 30_000,
});
