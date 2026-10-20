/**
 * Server-Sent Events over `fetch` (a POST with a body and an Authorization header, which
 * `EventSource` cannot send), and the chat stream protocol on top of it:
 *
 *   data: {"object":"ai.stream.delta","delta":{"type":"text","text":"Hel"}}
 *   data: {"object":"ai.stream.done","finishReason":"stop","usage":{...}}
 *   data: {"object":"ai.error","code":"STREAM_ERROR","message":"..."}
 *   data: [DONE]
 *
 * The parser follows the SSE spec (LF, CR or CRLF line ends, even split across chunks; multi-line
 * `data:`; `:` comments; `event:` and `id:` fields) and buffers partial lines and multi-byte
 * characters between chunks, which the legacy client did not.
 */
import { ApiError, kindFromAiErrorCode, toApiError } from './errors';
import { abortedError, type ErrorContext } from './http/abort';
import { type ChatStreamEvent, streamEventSchema } from './schemas/arena';
import { isRecord } from './schemas/common';

export interface SseMessage {
  /** `event:` field, `message` when the event has none. */
  event: string;
  /** The `data:` lines joined with `\n`. */
  data: string;
  /** The last `id:` seen, or null. */
  id: string | null;
}

/** Incremental SSE parser: feed decoded text with `push`, call `end` at the end of the stream. */
export class SseParser {
  private buffer = '';
  private skipLeadingLf = false;
  private dataLines: string[] = [];
  private eventType = '';
  private lastEventId: string | null = null;

  push(text: string): SseMessage[] {
    const messages: SseMessage[] = [];
    let chunk = text;
    // A CR at the end of the previous chunk may be the first half of a CRLF.
    if (this.skipLeadingLf && chunk.startsWith('\n')) chunk = chunk.slice(1);
    this.skipLeadingLf = false;
    this.buffer += chunk;

    let lineStart = 0;
    for (let i = 0; i < this.buffer.length; i += 1) {
      const char = this.buffer[i];
      if (char !== '\n' && char !== '\r') continue;
      const line = this.buffer.slice(lineStart, i);
      if (char === '\r') {
        if (i + 1 < this.buffer.length) {
          if (this.buffer[i + 1] === '\n') i += 1;
        } else {
          this.skipLeadingLf = true;
        }
      }
      lineStart = i + 1;
      this.processLine(line, messages);
    }
    this.buffer = this.buffer.slice(lineStart);
    return messages;
  }

  /**
   * End of stream. The spec drops an event that was not followed by a blank line; this parser
   * dispatches it instead, because some servers close the stream right after the last `data:`.
   */
  end(): SseMessage[] {
    const messages: SseMessage[] = [];
    if (this.buffer !== '') this.processLine(this.buffer, messages);
    this.buffer = '';
    this.dispatch(messages);
    return messages;
  }

  private processLine(line: string, messages: SseMessage[]): void {
    if (line === '') {
      this.dispatch(messages);
      return;
    }
    if (line.startsWith(':')) return; // comment / keep-alive
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'data') this.dataLines.push(value);
    else if (field === 'event') this.eventType = value;
    else if (field === 'id' && !value.includes('\0')) this.lastEventId = value;
    // `retry:` and unknown fields are ignored.
  }

  private dispatch(messages: SseMessage[]): void {
    if (this.dataLines.length > 0) {
      messages.push({
        event: this.eventType === '' ? 'message' : this.eventType,
        data: this.dataLines.join('\n'),
        id: this.lastEventId,
      });
    }
    this.dataLines = [];
    this.eventType = '';
  }
}

export interface ReadSseOptions {
  /** Stops reading: the generator throws an `aborted` ApiError. */
  signal?: AbortSignal | undefined;
  /** Fails with a `timeout` ApiError when no bytes arrive for this long. 0 or undefined = off. */
  idleTimeoutMs?: number | undefined;
  /** Request id, method and path for errors. */
  context?: ErrorContext | undefined;
}

function readChunk(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  { signal, idleTimeoutMs, context }: ReadSseOptions,
): Promise<ReadableStreamReadResult<Uint8Array>> {
  if (signal?.aborted) return Promise.reject(abortedError(context));
  return new Promise((resolve, reject) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);
    };
    const onAbort = () => {
      cleanup();
      reject(abortedError(context));
    };
    if (idleTimeoutMs !== undefined && idleTimeoutMs > 0) {
      timer = setTimeout(() => {
        cleanup();
        reject(
          new ApiError({
            kind: 'timeout',
            code: 'STREAM_IDLE_TIMEOUT',
            message: `The stream sent nothing for ${idleTimeoutMs} ms`,
            ...context,
          }),
        );
      }, idleTimeoutMs);
    }
    signal?.addEventListener('abort', onAbort, { once: true });
    reader.read().then(
      result => {
        cleanup();
        resolve(result);
      },
      (error: unknown) => {
        cleanup();
        reject(signal?.aborted ? abortedError(context) : toApiError(error, context));
      },
    );
  });
}

/** Reads a byte stream as SSE messages. Stopping early (break, return, an error) cancels it. */
export async function* readSseStream(
  stream: ReadableStream<Uint8Array>,
  options: ReadSseOptions = {},
): AsyncGenerator<SseMessage, void, undefined> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  const parser = new SseParser();
  try {
    for (;;) {
      const { done, value } = await readChunk(reader, options);
      if (done) {
        yield* parser.push(decoder.decode());
        yield* parser.end();
        return;
      }
      yield* parser.push(decoder.decode(value, { stream: true }));
    }
  } finally {
    reader.cancel().catch(() => undefined);
  }
}

const KNOWN_STREAM_OBJECTS = new Set(['ai.stream.delta', 'ai.stream.done', 'ai.error']);

function invalidEvent(data: string, context: ErrorContext | undefined, cause?: unknown) {
  return new ApiError({
    kind: 'bad_response',
    code: 'INVALID_STREAM_EVENT',
    message: 'The chat stream sent an event that could not be read',
    details: { data: data.slice(0, 200) },
    cause,
    ...context,
  });
}

/**
 * The chat stream as typed events: `delta` (text to append) any number of times, then exactly
 * one `done`. Throws an ApiError for an `ai.error` event (kind from its code), for an unreadable
 * event (`bad_response`), when the stream ends without `done` or `[DONE]` (`network`,
 * `STREAM_INCOMPLETE`), on idle timeout and on abort. Unknown `object` types are skipped, so the
 * API can add events (for example a start event) without breaking the client.
 */
export async function* readChatStream(
  stream: ReadableStream<Uint8Array>,
  options: ReadSseOptions = {},
): AsyncGenerator<ChatStreamEvent, void, undefined> {
  const { context } = options;
  for await (const message of readSseStream(stream, options)) {
    const data = message.data.trim();
    if (data === '') continue;
    if (data === '[DONE]') {
      yield { type: 'done', finishReason: null, usage: null };
      return;
    }
    let json: unknown;
    try {
      json = JSON.parse(data) as unknown;
    } catch (cause) {
      throw invalidEvent(data, context, cause);
    }
    if (isRecord(json) && typeof json.object === 'string' && !KNOWN_STREAM_OBJECTS.has(json.object)) {
      continue;
    }
    const parsed = streamEventSchema.safeParse(json);
    if (!parsed.success) throw invalidEvent(data, context);
    const event = parsed.data;
    if (event.object === 'ai.error') {
      throw new ApiError({
        kind: kindFromAiErrorCode(event.code ?? undefined),
        code: event.code ?? 'STREAM_ERROR',
        message: event.message ?? 'The model stopped with an error',
        details: event.timestamp === null ? undefined : { timestamp: event.timestamp },
        ...context,
      });
    }
    if (event.object === 'ai.stream.delta') {
      if (event.delta !== '') yield { type: 'delta', text: event.delta };
      continue;
    }
    yield { type: 'done', finishReason: event.finishReason, usage: event.usage };
    return;
  }
  throw new ApiError({
    kind: 'network',
    code: 'STREAM_INCOMPLETE',
    message: 'The stream ended before the answer was complete',
    ...context,
  });
}
