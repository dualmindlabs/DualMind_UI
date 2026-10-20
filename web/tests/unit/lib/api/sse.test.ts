import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import {
  ApiError,
  type ChatStreamEvent,
  readChatStream,
  readSseStream,
  SseParser,
} from '@/lib/api';

import { byteStream, collect, rejectionOf } from './helpers';

const fixture = readFileSync(
  new URL('../../../fixtures/api/chat-stream.sse.txt', import.meta.url),
  'utf8',
);

const delta = (text: string) =>
  `data: ${JSON.stringify({ object: 'ai.stream.delta', delta: { type: 'text', text } })}\n\n`;
const done = `data: ${JSON.stringify({ object: 'ai.stream.done', finishReason: 'stop' })}\n\n`;

function parseAll(chunks: string[]) {
  const parser = new SseParser();
  const messages = chunks.flatMap(chunk => parser.push(chunk));
  return [...messages, ...parser.end()];
}

const EXPECTED_EVENTS: ChatStreamEvent[] = [
  { type: 'delta', text: 'Hel' },
  { type: 'delta', text: 'lo, ' },
  { type: 'delta', text: 'wörld 👋' },
  {
    type: 'done',
    finishReason: 'stop',
    usage: { promptTokens: 9, completionTokens: 4, totalTokens: 13 },
  },
];

describe('SseParser', () => {
  it('parses data lines into messages and skips comments', () => {
    const messages = parseAll([fixture]);
    expect(messages).toHaveLength(6);
    expect(messages.every(message => message.event === 'message')).toBe(true);
    expect(messages.at(-1)?.data).toBe('[DONE]');
  });

  it('gives the same messages however the text is split', () => {
    const whole = parseAll([fixture]);
    for (let cut = 0; cut <= fixture.length; cut += 1) {
      expect(parseAll([fixture.slice(0, cut), fixture.slice(cut)]), `cut at ${cut}`).toEqual(whole);
    }
    expect(parseAll([...fixture])).toEqual(whole);
  });

  it('accepts LF, CRLF and CR line ends, also when CRLF is split across chunks', () => {
    const lf = 'data: a\n\ndata: b\n\n';
    const expected = parseAll([lf]);
    expect(parseAll([lf.replaceAll('\n', '\r\n')])).toEqual(expected);
    expect(parseAll([lf.replaceAll('\n', '\r')])).toEqual(expected);
    expect(parseAll(['data: a\r', '\n\r', '\ndata: b\r\n\r\n'])).toEqual(expected);
  });

  it('joins multi-line data and reads event and id fields', () => {
    expect(parseAll(['event: update\nid: 7\ndata: line 1\ndata:line 2\ndata\n\n'])).toEqual([
      { event: 'update', data: 'line 1\nline 2\n', id: '7' },
    ]);
  });

  it('strips one leading space only, ignores retry and unknown fields', () => {
    expect(parseAll(['retry: 1000\nfoo: bar\ndata:   spaced\n\n'])).toEqual([
      { event: 'message', data: '  spaced', id: null },
    ]);
  });

  it('dispatches an event left without a trailing blank line at the end', () => {
    expect(parseAll(['data: last'])).toEqual([{ event: 'message', data: 'last', id: null }]);
    expect(parseAll(['data: x\n'])).toEqual([{ event: 'message', data: 'x', id: null }]);
    expect(parseAll([': only a comment\n\n'])).toEqual([]);
  });
});

describe('readSseStream', () => {
  it('decodes multi-byte characters split across byte chunks', async () => {
    const bytes = new TextEncoder().encode(fixture);
    const singleBytes = Array.from(bytes, byte => new Uint8Array([byte]));
    const { stream } = byteStream(singleBytes);
    expect(await collect(readSseStream(stream))).toEqual(parseAll([fixture]));
  });

  it('cancels the stream when the consumer stops early', async () => {
    const { stream, state } = byteStream([delta('a'), delta('b')], { hang: true });
    for await (const message of readSseStream(stream)) {
      expect(message.data).toContain('"a"');
      break;
    }
    expect(state.cancelled).toBe(true);
  });
});

describe('readChatStream', () => {
  it('yields deltas, then done, and skips unknown event types', async () => {
    const { stream } = byteStream([fixture]);
    expect(await collect(readChatStream(stream))).toEqual(EXPECTED_EVENTS);
  });

  it('stops at done without waiting for the end of the stream', async () => {
    const { stream, state } = byteStream([delta('x'), done], { hang: true });
    expect(await collect(readChatStream(stream))).toEqual([
      { type: 'delta', text: 'x' },
      { type: 'done', finishReason: 'stop', usage: null },
    ]);
    expect(state.cancelled).toBe(true);
  });

  it('treats [DONE] alone as the end', async () => {
    const { stream } = byteStream([delta('x'), 'data: [DONE]\n\n']);
    expect(await collect(readChatStream(stream))).toEqual([
      { type: 'delta', text: 'x' },
      { type: 'done', finishReason: null, usage: null },
    ]);
  });

  it('skips empty deltas and blank data', async () => {
    const { stream } = byteStream([delta(''), 'data: \n\n', delta('y'), done]);
    expect(await collect(readChatStream(stream))).toEqual([
      { type: 'delta', text: 'y' },
      { type: 'done', finishReason: 'stop', usage: null },
    ]);
  });

  it('throws the ai.error event as an ApiError, after the deltas before it', async () => {
    const errorEvent = `data: ${JSON.stringify({
      object: 'ai.error',
      code: 'STREAM_ERROR',
      message: 'Provider closed the stream',
      timestamp: '2026-10-20T20:43:00Z',
    })}\n\n`;
    const { stream } = byteStream([delta('partial'), errorEvent]);
    const seen: ChatStreamEvent[] = [];
    const error = await rejectionOf(
      (async () => {
        for await (const event of readChatStream(stream, { context: { requestId: 'r-1' } })) {
          seen.push(event);
        }
      })(),
    );
    expect(seen).toEqual([{ type: 'delta', text: 'partial' }]);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      kind: 'server',
      code: 'STREAM_ERROR',
      message: 'Provider closed the stream',
      requestId: 'r-1',
      details: { timestamp: '2026-10-20T20:43:00Z' },
    });
  });

  it('maps an INVALID_REQUEST event to a validation error', async () => {
    const { stream } = byteStream([
      `data: {"object":"ai.error","code":"INVALID_REQUEST","message":"Prompt is required"}\n\n`,
    ]);
    await expect(collect(readChatStream(stream))).rejects.toMatchObject({
      kind: 'validation',
      code: 'INVALID_REQUEST',
    });
  });

  it('fails when the stream ends before done', async () => {
    const { stream } = byteStream([delta('cut')]);
    await expect(collect(readChatStream(stream))).rejects.toMatchObject({
      kind: 'network',
      code: 'STREAM_INCOMPLETE',
    });
  });

  it('fails on an event that is not JSON or not a known shape', async () => {
    for (const body of [
      'data: {"object":"ai.stream.delta"\n\n',
      'data: {"object":"ai.stream.delta"}\n\n',
    ]) {
      const { stream } = byteStream([body]);
      await expect(collect(readChatStream(stream)), body).rejects.toMatchObject({
        kind: 'bad_response',
        code: 'INVALID_STREAM_EVENT',
      });
    }
  });

  it('rejects with kind aborted and cancels the stream when the signal aborts', async () => {
    const { stream, state } = byteStream([delta('a')], { hang: true });
    const controller = new AbortController();
    const seen: ChatStreamEvent[] = [];
    const error = await rejectionOf(
      (async () => {
        for await (const event of readChatStream(stream, { signal: controller.signal })) {
          seen.push(event);
          controller.abort();
        }
      })(),
    );
    expect(seen).toEqual([{ type: 'delta', text: 'a' }]);
    expect(error).toMatchObject({ kind: 'aborted' });
    expect(state.cancelled).toBe(true);
  });

  it('rejects at once when the signal is already aborted', async () => {
    const { stream } = byteStream([delta('a'), done]);
    const controller = new AbortController();
    controller.abort();
    await expect(
      collect(readChatStream(stream, { signal: controller.signal })),
    ).rejects.toMatchObject({ kind: 'aborted' });
  });

  it('fails with a timeout when the stream goes quiet', async () => {
    const { stream, state } = byteStream([delta('a')], { hang: true });
    const error = await rejectionOf(collect(readChatStream(stream, { idleTimeoutMs: 20 })));
    expect(error).toMatchObject({ kind: 'timeout', code: 'STREAM_IDLE_TIMEOUT' });
    expect(state.cancelled).toBe(true);
  });

  it('reports a read error of the body as a network error', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.error(new TypeError('network connection lost'));
      },
    });
    await expect(collect(readChatStream(stream))).rejects.toMatchObject({ kind: 'network' });
  });
});
