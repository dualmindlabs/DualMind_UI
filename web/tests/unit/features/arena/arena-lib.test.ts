import { describe, expect, it } from 'vitest';

import {
  MODEL_CHOICE_KEYS,
  readModelChoices,
  resolveModel,
  writeModelChoice,
} from '@/features/arena/lib/model-choice';
import { isArenaMode, MODE_DETAILS, modeFromThread } from '@/features/arena/lib/modes';
import { isTextEntryTarget, singleKeyAction } from '@/features/arena/lib/shortcuts';
import { ALL_STARTERS, pickSurprise, STARTER_CATEGORIES } from '@/features/arena/lib/starters';
import {
  filterThreads,
  foldText,
  formatThreadTime,
  groupFor,
  groupThreads,
  threadTime,
} from '@/features/arena/lib/thread-groups';
import { countWords, formatDuration, toTurns } from '@/features/arena/lib/turns';
import type { Thread, ThreadMessage } from '@/lib/api';

const NOW = new Date(2026, 9, 21, 15, 30).getTime();
const at = (days: number, hours = 12) => {
  const date = new Date(2026, 9, 21 - days, hours, 0);
  return date.toISOString();
};

function thread(id: string, title: string, updatedAt: string | null, createdAt = at(30)): Thread {
  return {
    threadId: id,
    userId: 'u',
    title,
    mode: 'battle',
    visibility: 'private',
    messageCount: 1,
    createdAt,
    updatedAt,
  };
}

describe('thread groups', () => {
  it('puts threads in Today, Yesterday, Last 7 days and Older, newest first', () => {
    const threads = [
      thread('old', 'Old', at(40)),
      thread('today-early', 'Early', at(0, 8)),
      thread('yesterday', 'Yesterday', at(1)),
      thread('week', 'Week', at(5)),
      thread('today-late', 'Late', at(0, 14)),
    ];
    const groups = groupThreads(threads, NOW);
    expect(groups.map(group => group.label)).toEqual([
      'Today',
      'Yesterday',
      'Last 7 days',
      'Older',
    ]);
    expect(groups[0]?.threads.map(item => item.threadId)).toEqual(['today-late', 'today-early']);
  });

  it('leaves empty groups out and falls back to createdAt, then Older', () => {
    const groups = groupThreads([thread('a', 'A', null, at(0))], NOW);
    expect(groups.map(group => group.id)).toEqual(['today']);
    expect(threadTime({ updatedAt: 'nonsense', createdAt: null })).toBeNull();
    expect(groupFor(null, NOW)).toBe('older');
  });

  it('searches titles by every word, ignoring case and accents', () => {
    const threads = [thread('1', 'Café recursion', at(0)), thread('2', 'Merge conflicts', at(0))];
    expect(filterThreads(threads, 'CAFE').map(item => item.threadId)).toEqual(['1']);
    expect(filterThreads(threads, 'recursion  café').map(item => item.threadId)).toEqual(['1']);
    expect(filterThreads(threads, '  ')).toHaveLength(2);
    expect(filterThreads(threads, 'nothing')).toHaveLength(0);
    expect(foldText('  Élan  Vital ')).toBe('elan vital');
  });

  it('formats row times by group', () => {
    expect(formatThreadTime(Date.parse(at(0, 9)), NOW, 'en-GB')).toBe('09:00');
    expect(formatThreadTime(Date.parse(at(1)), NOW, 'en-GB')).toBe('Tue');
    expect(formatThreadTime(Date.parse(at(30)), NOW, 'en-GB')).toMatch(/^21 Sep/);
    expect(formatThreadTime(null, NOW)).toBe('');
  });
});

describe('model choices (legacy keys)', () => {
  const models = [
    { modelId: 'id-1', modelName: '@cf/meta/llama', displayName: 'llama' },
    { modelId: 'id-2', modelName: 'gemma-3', displayName: 'Gemma 3' },
  ];

  it('uses the legacy keys and treats empty or auto as random', () => {
    expect(MODEL_CHOICE_KEYS).toEqual({
      left: 'battle.model.left',
      right: 'battle.model.right',
      direct: 'direct.model',
    });
    window.localStorage.setItem('battle.model.left', '@cf/meta/llama');
    window.localStorage.setItem('direct.model', 'auto');
    expect(readModelChoices(window.localStorage)).toEqual({
      left: '@cf/meta/llama',
      right: null,
      direct: null,
    });
  });

  it('writes the model name, like the legacy app, and resolves names or ids', () => {
    writeModelChoice(window.localStorage, 'right', models[1] ?? null);
    expect(window.localStorage.getItem('battle.model.right')).toBe('gemma-3');
    writeModelChoice(window.localStorage, 'right', null);
    expect(window.localStorage.getItem('battle.model.right')).toBeNull();
    expect(resolveModel(models, 'gemma-3')?.modelId).toBe('id-2');
    expect(resolveModel(models, 'id-1')?.displayName).toBe('llama');
    expect(resolveModel(models, 'unknown')).toBeNull();
    expect(resolveModel(models, null)).toBeNull();
  });
});

describe('modes, starters and shortcuts', () => {
  it('maps thread modes to arena modes', () => {
    expect(modeFromThread('battle')).toBe('battle');
    expect(modeFromThread('arena')).toBe('side');
    expect(modeFromThread('direct')).toBe('direct');
    expect(MODE_DETAILS.side.threadMode).toBe('arena');
    expect(isArenaMode('side')).toBe(true);
    expect(isArenaMode('arena')).toBe(false);
  });

  it('has five categories of four prompts, and Surprise me always changes the prompt', () => {
    expect(STARTER_CATEGORIES.map(category => category.id)).toEqual([
      'code',
      'reasoning',
      'writing',
      'math',
      'fun',
    ]);
    expect(STARTER_CATEGORIES.every(category => category.prompts.length === 4)).toBe(true);
    const first = ALL_STARTERS[0] ?? '';
    expect(pickSurprise(() => 0, first)).not.toBe(first);
    expect(ALL_STARTERS).toContain(pickSurprise(() => 0.999));
  });

  it('fires single-key shortcuts only outside text fields and without modifiers', () => {
    const base = {
      ctrlKey: false,
      metaKey: false,
      altKey: false,
      repeat: false,
      defaultPrevented: false,
      target: document.body,
    };
    expect(singleKeyAction({ ...base, key: 'n' })).toBe('new-battle');
    expect(singleKeyAction({ ...base, key: '[' })).toBe('toggle-sidebar');
    expect(singleKeyAction({ ...base, key: '/' })).toBe('focus-composer');
    expect(singleKeyAction({ ...base, key: 'n', ctrlKey: true })).toBeNull();
    expect(singleKeyAction({ ...base, key: 'n', repeat: true })).toBeNull();
    const textarea = document.createElement('textarea');
    expect(singleKeyAction({ ...base, key: 'n', target: textarea })).toBeNull();
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    expect(isTextEntryTarget(checkbox)).toBe(false);
    expect(isTextEntryTarget(document.createElement('input'))).toBe(true);
  });
});

describe('turns from thread messages', () => {
  const message = (overrides: Partial<ThreadMessage>): ThreadMessage => ({
    messageId: 'm1',
    threadId: 't',
    position: 0,
    promptText: 'Hi',
    model1Name: '@cf/meta/llama',
    model2Name: 'gemma-3',
    model1Response: 'A',
    model2Response: 'B',
    model1TimeMs: 1840,
    model2TimeMs: 2310,
    comparisonId: 'c1',
    voteChoice: null,
    hasVoted: false,
    createdAt: null,
    ...overrides,
  });

  it('keeps battle names hidden until the visitor voted', () => {
    const [hidden] = toTurns([message({})], 'battle');
    expect(hidden?.revealed).toBe(false);
    const [voted] = toTurns([message({ voteChoice: 'left', hasVoted: true })], 'battle');
    expect(voted?.revealed).toBe(true);
    expect(voted?.vote).toBe('left');
    const [side] = toTurns([message({})], 'side');
    expect(side?.revealed).toBe(true);
  });

  it('orders by position and shows Direct turns as one pane', () => {
    const turns = toTurns(
      [message({ messageId: 'b', position: 1 }), message({ messageId: 'a', position: 0 })],
      'direct',
    );
    expect(turns.map(turn => [turn.id, turn.number])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
    expect(turns[0]?.b).toBeNull();
  });

  it('formats durations and counts words without Markdown', () => {
    expect(formatDuration(640)).toBe('640 ms');
    expect(formatDuration(1840)).toBe('1.8 s');
    expect(formatDuration(12_400)).toBe('12 s');
    expect(formatDuration(null)).toBeNull();
    expect(countWords('## Title\n\n- one **two**\n- three')).toBe(4);
  });
});
