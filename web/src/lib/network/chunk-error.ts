/**
 * Recognises the error a failed code-split chunk throws, in every engine:
 * Chrome "Failed to fetch dynamically imported module", Firefox "error loading dynamically
 * imported module", Safari "Importing a module script failed" (and the older webpack-style
 * "Loading chunk 12 failed" / "Unable to preload CSS" messages Vite and bundlers still produce).
 * A chunk fails like this when the network drops, or when a deploy replaced the hashed file the
 * open page still points at; either way a reload (once online) fixes it.
 */
const CHUNK_ERROR_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /loading (css )?chunk [\w-]+ failed/i,
];

export function isChunkLoadError(error: unknown): boolean {
  if (typeof error === 'string') return CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(error));
  if (typeof error !== 'object' || error === null) return false;
  const { message, name } = error as { message?: unknown; name?: unknown };
  if (name === 'ChunkLoadError') return true;
  return typeof message === 'string' && CHUNK_ERROR_PATTERNS.some(pattern => pattern.test(message));
}
