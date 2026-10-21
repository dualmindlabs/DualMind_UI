import { describe, expect, it, vi } from 'vitest';

import { onDemoRequest, requestDemo, takeDemoRequest } from '@/features/marketing/lib/demo-request';

describe('demo request', () => {
  it('keeps a request until it is taken, once', () => {
    requestDemo({ asked: 'Why is the sky blue?' });
    expect(takeDemoRequest()).toEqual({ asked: 'Why is the sky blue?' });
    expect(takeDemoRequest()).toBeNull();
  });

  it('tells listeners about a new request until they unsubscribe', () => {
    const listener = vi.fn();
    const off = onDemoRequest(listener);
    requestDemo({ index: 1, asked: null });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(takeDemoRequest()).toEqual({ index: 1, asked: null });
    off();
    requestDemo({ asked: 'again' });
    expect(listener).toHaveBeenCalledTimes(1);
    takeDemoRequest();
  });
});
