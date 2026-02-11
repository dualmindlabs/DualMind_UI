"use client"

import { useCallback } from "react"
import type { Turn, VoteChoice } from "@/lib/types"
import { cn } from "@/lib/utils"

interface FloatingVotingProps {
  turnId: string
  turns: Turn[]
  onVote: (turnId: string, choice: VoteChoice) => void
}

const voteOptions: { choice: VoteChoice; label: string; emoji: string }[] = [
  { choice: "left", label: "Left is Better", emoji: "\uD83D\uDC48" },
  { choice: "tie", label: "It's a Tie", emoji: "\uD83E\uDD1D" },
  { choice: "both-bad", label: "Both are Bad", emoji: "\uD83D\uDC4E" },
  { choice: "right", label: "Right is Better", emoji: "\uD83D\uDC49" },
]

export function FloatingVoting({ turnId, turns, onVote }: FloatingVotingProps) {
  const turn = turns.find((t) => t.id === turnId)

  const handleVote = useCallback(
    (choice: VoteChoice) => {
      onVote(turnId, choice)
    },
    [turnId, onVote]
  )

  // Don't show if turn doesn't exist, already voted, or still streaming
  if (
    !turn ||
    turn.voteStatus !== "idle" ||
    turn.left.streaming ||
    turn.right.streaming
  ) {
    return null
  }

  return (
    <div className="shrink-0 border-t border-border/20 bg-background/90 px-4 py-3 backdrop-blur-xl">
      <div className="mx-auto max-w-3xl">
        <div className="flex flex-col items-center gap-3">
          <p className="text-xs font-medium text-muted-foreground">
            Which response was better?
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {voteOptions.map((opt) => (
              <button
                key={opt.choice}
                onClick={() => handleVote(opt.choice)}
                className={cn(
                  "flex items-center gap-2 rounded-xl border border-border/50 bg-card/60 px-4 py-2.5 text-sm font-medium backdrop-blur-sm transition-all",
                  "hover:border-primary/40 hover:bg-primary/10 hover:text-primary",
                  "active:scale-95"
                )}
              >
                <span>{opt.emoji}</span>
                <span>{opt.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
