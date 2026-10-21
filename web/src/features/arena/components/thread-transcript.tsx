import { useMemo } from 'react';

import type { ThreadMessage, ThreadMode } from '@/lib/api';

import { modeFromThread } from '../lib/modes';
import { toTurns } from '../lib/turns';
import { TurnView } from './turn-view';

export interface ThreadTranscriptProps {
  messages: readonly ThreadMessage[];
  /** The thread's stored mode (`battle`, `arena` or `direct`). */
  threadMode: ThreadMode;
  /** Display names by `modelName` (the public leaderboard on a share page). */
  names: ReadonlyMap<string, string>;
}

/**
 * A finished thread, read-only, for people who are not its owner (the share page, slice S11):
 * every turn oldest first, with the same panes and the hardened Markdown renderer as the arena.
 * A battle shows its model names, timing, length and the picked answer only when it was voted
 * on; otherwise both sides stay anonymous.
 */
export function ThreadTranscript({ messages, threadMode, names }: ThreadTranscriptProps) {
  const turns = useMemo(() => toTurns(messages, modeFromThread(threadMode)), [messages, threadMode]);
  return (
    <div className="grid gap-12">
      {turns.map(turn => (
        <TurnView key={turn.id} turn={turn} names={names} audience="public" />
      ))}
    </div>
  );
}
