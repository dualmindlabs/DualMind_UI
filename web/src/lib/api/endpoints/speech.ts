import { TIMEOUTS } from '../http/timeouts';
import type { Transport } from '../http/transport';
import type { CallOptions } from '../http/types';
import { compact, requireText } from './input';

export interface SpeechInput {
  text: string;
  /** A provider voice name; the API picks its default when omitted. */
  voice?: string | undefined;
}

export interface SpeechEndpoints {
  /**
   * `POST /api/speech/generate`: the answer read aloud, as an `audio/*` Blob (WAV today).
   * The legacy client called `/api/audio/tts`, which does not exist (KNOWN_ISSUES #7), so every
   * user heard the browser voice. 30 s timeout; not retried (it costs provider quota). Play it
   * with `URL.createObjectURL(blob)` and revoke the URL when done; on error, the caller may
   * still fall back to `speechSynthesis`.
   */
  textToSpeech: (input: SpeechInput, options?: CallOptions) => Promise<Blob>;
}

export function createSpeechEndpoints(transport: Transport): SpeechEndpoints {
  return {
    textToSpeech: async (input, options) =>
      await transport.blob(
        {
          method: 'POST',
          path: '/api/speech/generate',
          auth: 'required',
          accept: 'audio/*',
          timeoutMs: TIMEOUTS.speech,
          body: compact({ text: requireText(input.text, 'text'), voice: input.voice }),
        },
        options,
      ),
  };
}
