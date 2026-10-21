// Deprecated alias POST /api/audio/tts -> POST /api/speech/generate (docs/backend/designs/BE-2-tts-route.md).
//
// The legacy app posts { text } to /api/audio/tts, which the API does not have (KNOWN_ISSUES #7).
// The proxy validates the body, forwards exactly { text, voice? } to the real route and makes
// sure a 2xx answer is audio. The typed client calls the real route directly; this exists for the
// legacy app and old cached clients, and is removed after the legacy app is gone (design, section 14).

export const AUDIO_ALIAS = Object.freeze({
  from: '/api/audio/tts',
  to: '/api/speech/generate',
});
/** Merge date of the alias (2026-10-21 00:00 UTC), RFC 9745 `Deprecation: @<unix seconds>`. */
export const DEPRECATION = '@1792540800';
export const MAX_ALIAS_BODY_BYTES = 16 * 1024;
export const MAX_TTS_TEXT_LENGTH = 5000;
export const ALIAS_ACCEPT = 'audio/wav, audio/*;q=0.9, application/json;q=0.5';

const VOICE_RE = /^[A-Za-z0-9._-]{1,64}$/;

/** @param {string} pathname */
export const isAudioAlias = pathname => pathname === AUDIO_ALIAS.from;

/**
 * Reads the request body with a counting reader (Content-Length is not trusted).
 * @returns {Promise<Uint8Array | null>} null when over the limit
 */
async function readLimited(request, limit) {
  if (!request.body) return new Uint8Array(0);
  const reader = request.body.getReader();
  const chunks = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      // Not awaited: on a cloned request the cancel only settles once the other branch is read too.
      reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

/**
 * Validates an alias request. Never throws for bad input.
 * @param {Request} request
 * @returns {Promise<{ ok: true, body: { text: string, voice?: string } } | { ok: false, status: number, error: string, headers?: Record<string, string> }>}
 */
export async function parseAliasBody(request) {
  if (request.method !== 'POST') {
    return { ok: false, status: 405, error: 'method_not_allowed', headers: { Allow: 'POST' } };
  }
  const contentType = (request.headers.get('content-type') || '').split(';')[0].trim().toLowerCase();
  if (contentType !== 'application/json') {
    return { ok: false, status: 415, error: 'unsupported_media_type' };
  }
  const declared = Number(request.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > MAX_ALIAS_BODY_BYTES) {
    return { ok: false, status: 413, error: 'payload_too_large' };
  }
  let bytes;
  try {
    bytes = await readLimited(request, MAX_ALIAS_BODY_BYTES);
  } catch {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  if (bytes === null) return { ok: false, status: 413, error: 'payload_too_large' };

  let parsed;
  try {
    parsed = JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  const text = typeof parsed.text === 'string' ? parsed.text.trim() : '';
  if (text.length < 1 || text.length > MAX_TTS_TEXT_LENGTH) {
    return { ok: false, status: 400, error: 'invalid_request' };
  }
  const body = { text };
  if (parsed.voice !== undefined) {
    if (typeof parsed.voice !== 'string' || !VOICE_RE.test(parsed.voice)) {
      return { ok: false, status: 400, error: 'invalid_request' };
    }
    body.voice = parsed.voice;
  }
  return { ok: true, body };
}

/**
 * Checks a 2xx upstream answer is audio. Returns the body to stream and the content type, or
 * null when it is not audio (the caller answers 502). The first 12 bytes are peeked only when
 * the type is octet-stream or missing, to recognise RIFF/WAVE.
 * @param {Response} upstream
 * @returns {Promise<{ body: ReadableStream | null, contentType: string } | null>}
 */
export async function audioFromUpstream(upstream) {
  const type = (upstream.headers.get('content-type') || '').trim();
  const base = type.split(';')[0].trim().toLowerCase();
  if (base.startsWith('audio/')) return { body: upstream.body, contentType: type };
  if ((base === 'application/octet-stream' || base === '') && upstream.body) {
    const reader = upstream.body.getReader();
    const buffered = [];
    let length = 0;
    while (length < 12) {
      const { done, value } = await reader.read();
      if (done) break;
      buffered.push(value);
      length += value.byteLength;
    }
    const head = new Uint8Array(length);
    let offset = 0;
    for (const chunk of buffered) {
      head.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const ascii = (from, to) => String.fromCharCode(...head.subarray(from, to));
    if (length >= 12 && ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') {
      const body = new ReadableStream({
        start(controller) {
          for (const chunk of buffered) controller.enqueue(chunk);
        },
        async pull(controller) {
          const { done, value } = await reader.read();
          if (done) controller.close();
          else controller.enqueue(value);
        },
        cancel: reason => reader.cancel(reason),
      });
      return { body, contentType: 'audio/wav' };
    }
    reader.cancel().catch(() => {});
  }
  return null;
}
