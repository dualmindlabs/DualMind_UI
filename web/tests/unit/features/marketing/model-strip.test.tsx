import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ModelStrip } from '@/features/marketing/components/model-strip';
import { MODEL_SNAPSHOT } from '@/features/marketing/content/model-snapshot';

// The strip starts from a dated list. It must not show models that Groq has shut down, and a name
// that already reads well must not be run through the id prettifier ("Llama 3.1 8b instant").

describe('the model strip snapshot', () => {
  it('leaves out the four Groq models that were retired', () => {
    const names = MODEL_SNAPSHOT.map(model => model.name);
    for (const gone of [
      'Compound Mini',
      'Llama 3.1 8B Instant',
      'Llama 3.3 70B Versatile',
      'Kimi K2 Instruct',
    ]) {
      expect(names).not.toContain(gone);
    }
  });

  it('keeps the casing of names that are already written for people', () => {
    render(<ModelStrip stats={{ status: 'error' }} />);
    const text = document.body.textContent ?? '';
    expect(text).toContain('Gemma 3n E2B IT');
    expect(text).not.toContain('Gemma 3n e2b it');
  });
});
