import { describe, expect, it } from 'vitest';

import { isPromptRejection } from '@/features/arena/hooks/use-battle';
import { ApiError } from '@/lib/api';

const validation = (status: number, message: string) =>
  new ApiError({ kind: 'validation', status, message });

describe('isPromptRejection', () => {
  it('is true for a prompt that is too long or named in the message', () => {
    expect(isPromptRejection(validation(413, 'Request body too large'))).toBe(true);
    expect(isPromptRejection(validation(400, 'Prompt is required'))).toBe(true);
    expect(
      isPromptRejection(validation(400, 'The prompt is too long (max 8000 characters).')),
    ).toBe(true);
  });

  it('is false for other 4xx errors and for other kinds', () => {
    expect(
      isPromptRejection(
        validation(400, 'Both model1 and model2 are required for side-by-side mode'),
      ),
    ).toBe(false);
    expect(isPromptRejection(validation(409, 'reused'))).toBe(false);
    expect(isPromptRejection(validation(422, 'Unprocessable'))).toBe(false);
    expect(
      isPromptRejection(new ApiError({ kind: 'server', status: 500, message: 'prompt' })),
    ).toBe(false);
    expect(isPromptRejection(new Error('prompt'))).toBe(false);
  });
});
