import { describe, expect, it } from 'vitest';

import { attemptSignature, createAttemptTracker } from '@/features/arena/lib/battle-attempt';

function tracker() {
  let n = 0;
  return createAttemptTracker(() => `key-${(n += 1)}`);
}

describe('the battle attempt tracker', () => {
  it('gives one key per attempt and reuses it for the same request', () => {
    const attempts = tracker();
    const request = { prompt: 'Hi', threadId: 't-1' };
    expect(attempts.keyFor(request)).toBe('key-1');
    // The automatic or manual retry of the same prompt in the same thread.
    expect(attempts.keyFor({ ...request })).toBe('key-1');
    expect(attempts.keyFor({ ...request })).toBe('key-1');
  });

  it('starts a new attempt when the prompt changed', () => {
    const attempts = tracker();
    expect(attempts.keyFor({ prompt: 'Hi', threadId: 't-1' })).toBe('key-1');
    expect(attempts.keyFor({ prompt: 'Hi there', threadId: 't-1' })).toBe('key-2');
    // Going back to the first text is a new attempt too: the open one is the latest.
    expect(attempts.keyFor({ prompt: 'Hi', threadId: 't-1' })).toBe('key-3');
  });

  it('starts a new attempt for other models or another thread (the API would answer 409)', () => {
    const attempts = tracker();
    const base = { prompt: 'Hi', model1: 'a', model2: 'b', threadId: 't-1' };
    expect(attempts.keyFor(base)).toBe('key-1');
    expect(attempts.keyFor({ ...base, model2: 'c' })).toBe('key-2');
    expect(attempts.keyFor({ ...base, model2: 'c', threadId: 't-2' })).toBe('key-3');
    expect(attempts.keyFor({ prompt: 'Hi' })).toBe('key-4');
  });

  it('settle() ends the attempt: the same text sent again is a new battle', () => {
    const attempts = tracker();
    expect(attempts.keyFor({ prompt: 'Hi' })).toBe('key-1');
    attempts.settle();
    expect(attempts.keyFor({ prompt: 'Hi' })).toBe('key-2');
  });

  it('keys are UUIDs by default', () => {
    const key = createAttemptTracker().keyFor({ prompt: 'Hi' });
    expect(key).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it('the signature tells the same request apart from a different one', () => {
    expect(attemptSignature({ prompt: 'a', model1: 'x' })).toBe(
      attemptSignature({ prompt: 'a', model1: 'x', model2: undefined }),
    );
    expect(attemptSignature({ prompt: 'a b' })).not.toBe(
      attemptSignature({ prompt: 'a', model1: 'b' }),
    );
  });
});
