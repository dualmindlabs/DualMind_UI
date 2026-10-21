import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { ModelPicker } from '@/features/arena/components/model-picker';
import type { ModelOption } from '@/features/arena/hooks/use-model-options';
import { groupModelOptions } from '@/features/arena/lib/model-groups';
import {
  DEFAULT_PICKER_PADDING,
  PICKER_EDGE,
  pickerPadding,
} from '@/features/arena/lib/picker-placement';
import { PROVISIONAL_BATTLES } from '@/features/leaderboard';

import { fullBoard } from '../leaderboard/helpers';

// UI audit P1-11: the picker lists every model with its human name and maker, ranked models
// first with rank and Elo, then "Not yet rated" without numbers (the leaderboard's rule), and
// its list never covers the heading above the composer.

/** The picker's options as useModelOptions builds them, from the recorded 53-model board. */
const OPTIONS: ModelOption[] = fullBoard.entries.map(entry => ({
  modelId: entry.id,
  modelName: entry.modelName,
  displayName: entry.name,
  provider: entry.providerLabel,
  elo: entry.elo,
  rank: entry.rank,
}));

describe('groupModelOptions', () => {
  it('splits ranked and not yet rated with the leaderboard rule', () => {
    const { rated, unrated } = groupModelOptions(OPTIONS);
    expect(rated).toHaveLength(fullBoard.rated.length);
    expect(unrated).toHaveLength(fullBoard.unrated.length);
    expect(rated.length + unrated.length).toBe(53);
    const battles = new Map(fullBoard.entries.map(entry => [entry.id, entry.battles]));
    for (const option of rated) {
      expect(battles.get(option.modelId)).toBeGreaterThanOrEqual(PROVISIONAL_BATTLES);
    }
    for (const option of unrated) {
      expect(option.rank).toBeNull();
      expect(battles.get(option.modelId)).toBeLessThan(PROVISIONAL_BATTLES);
    }
  });

  it('orders ranked models by rank and the rest by name', () => {
    const { rated, unrated } = groupModelOptions(OPTIONS);
    const ranks = rated.map(option => option.rank ?? 0);
    expect(ranks).toEqual([...ranks].sort((a, b) => a - b));
    expect(ranks[0]).toBe(1);
    const names = unrated.map(option => option.displayName);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, 'en')));
  });

  it('copes with no options yet', () => {
    expect(groupModelOptions(undefined)).toEqual({ rated: [], unrated: [] });
  });
});

describe('pickerPadding', () => {
  const heading = { top: 300, bottom: 360 };

  it('moves the top edge under the heading when a list fits above or below', () => {
    const padding = pickerPadding(heading, { top: 700, bottom: 740 }, 844);
    expect(padding.top).toBe(360 + PICKER_EDGE);
    expect(padding.bottom).toBe(PICKER_EDGE);
  });

  it('gives way when neither side would leave a usable list (a phone held sideways)', () => {
    expect(pickerPadding(heading, { top: 420, bottom: 460 }, 560)).toEqual(DEFAULT_PICKER_PADDING);
  });

  it('ignores a heading below the trigger, or no heading at all', () => {
    expect(pickerPadding({ top: 800, bottom: 840 }, { top: 500, bottom: 540 }, 900)).toEqual(
      DEFAULT_PICKER_PADDING,
    );
    expect(pickerPadding(null, { top: 500, bottom: 540 }, 900)).toEqual(DEFAULT_PICKER_PADDING);
  });
});

describe('ModelPicker', () => {
  it('lists every model: human names and makers, rank and Elo only for ranked ones', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <ModelPicker
        side="a"
        label="Model for answer A"
        options={OPTIONS}
        value={null}
        onChange={onChange}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Model for answer A: random' }));
    const listbox = await screen.findByRole('listbox');
    // Random plus all 53 models, not a short list.
    expect(within(listbox).getAllByRole('option')).toHaveLength(54);
    expect(within(listbox).getByText('Ranked')).toBeInTheDocument();
    expect(within(listbox).getByText('Not yet rated')).toBeInTheDocument();

    const ranked = within(listbox).getByRole('option', { name: /Llama 3\.1 70B Instruct/ });
    expect(ranked).toHaveTextContent('Meta');
    expect(ranked).toHaveTextContent('#1');
    // The raw id stays one hover away.
    expect(ranked).toHaveAttribute('title', '@cf/meta/llama-3.1-70b-instruct');

    const unrated = within(listbox).getByRole('option', { name: /Gemma 3n E2B IT/ });
    expect(unrated).toHaveTextContent('Google');
    expect(unrated).not.toHaveTextContent('#');

    await user.click(unrated);
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ modelName: 'gemma-3n-e2b-it', rank: null }),
    );
  });
});
